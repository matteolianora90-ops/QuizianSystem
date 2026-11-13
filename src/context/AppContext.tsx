import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updatePassword,
  updateProfile as updateFirebaseAuthProfile,
} from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import {
  Quiz,
  Question,
  ActivityRecord,
  UserProfile,
  ParticipantScore,
  ChallengeRoomState,
  StudyReminderConfig,
  AppNotification,
  StudyMaterial,
  ChallengeInvitation,
} from '../types';
import { INITIAL_USER, INITIAL_QUIZZES, INITIAL_ACTIVITIES, INITIAL_STUDY_MATERIALS } from '../data/mockData';
import { playNotificationSound } from '../utils/sound';
import { POINTS_PER_CORRECT } from '../utils/questionUtils';
import {
  getAllStudyMaterialsFromDB,
  getQuizzesFromDB,
  getStudyMaterialsFromLocalStorage,
  saveAllStudyMaterialsToDB,
  saveQuizzesToDB,
  saveStudyMaterialToDB,
  deleteStudyMaterialFromDB,
} from '../utils/offlineStorage';
import { auth, db, googleProvider, handleFirestoreError, OperationType, testFirestoreConnection } from '../firebase';
import {
  clearActivitiesInFirestore,
  deleteQuizFromFirestore,
  deleteStudyMaterialFromFirestore,
  fetchOrCreateUserProfileInFirestore,
  fetchQuizzesOnceFromFirestore,
  getChallengeRoomFromFirestore,
  incrementQuizTimesPlayedInFirestore,
  incrementUserRewardsInFirestore,
  joinChallengeRoomInFirestore,
  respondToChallengeInvitationInFirestore,
  saveActivityToFirestore,
  saveQuizToFirestore,
  saveStudyMaterialToFirestore,
  sendChallengeInvitationInFirestore,
  subscribeActivitiesFromFirestore,
  subscribeQuizzesFromFirestore,
  subscribeStudyMaterialsFromFirestore,
  subscribeToIncomingInvitations,
  updateUserProfileInFirestore,
} from '../utils/firestoreSync';

export type ActiveTab = 'home' | 'quizzes' | 'challenge' | 'activity' | 'profile';
export type ActiveScreen = 'main' | 'generate' | 'game' | 'results' | 'review_answers' | 'challenge_waiting';

export interface GameSession {
  sessionId: string;
  quiz: Quiz;
  mode: 'solo' | 'challenge';
  roomCode?: string;
  timeLimitMinutes: number;
  participants: ParticipantScore[];
  userPlayerId: string;
}

export interface GameResult {
  score: number;
  maxScore: number;
  correctAnswers: number;
  totalQuestions: number;
  accuracy: number;
  timeSpentSeconds: number;
  userAnswers: Record<string, string>;
  leaderboard: ParticipantScore[];
  quiz: Quiz;
  mode: 'solo' | 'challenge';
  userPlayerId?: string;
}

interface AuthActionResult {
  success: boolean;
  error?: string;
  message?: string;
}

interface AppContextType {
  // Auth state
  user: UserProfile | null;
  authMode: 'firebase' | 'demo';
  isAuthLoading: boolean;
  isSyncingCloud: boolean;
  authView: 'login' | 'signup' | 'forgot_password';
  setAuthView: (view: 'login' | 'signup' | 'forgot_password') => void;
  login: (email: string, pass: string) => Promise<AuthActionResult>;
  loginWithGoogle: () => Promise<AuthActionResult>;
  signup: (name: string, email: string, pass: string) => Promise<AuthActionResult>;
  logout: () => Promise<void>;
  quickDemoLogin: (email?: string) => void;
  resetPassword: (email: string, newPass?: string) => Promise<{ success: boolean; message: string }>;
  changePassword: (currentPass: string, newPass: string) => Promise<{ success: boolean; message: string }>;
  updateProfile: (updates: Partial<UserProfile>, options?: { silent?: boolean }) => void;

  // Navigation
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  activeScreen: ActiveScreen;
  setActiveScreen: (screen: ActiveScreen) => void;

  // Quizzes & Study Materials
  quizzes: Quiz[];
  saveQuiz: (quiz: Quiz) => void;
  deleteQuiz: (quizId: string) => void;
  editingQuiz: Quiz | null;
  setEditingQuiz: (quiz: Quiz | null) => void;
  previewQuiz: Quiz | null;
  setPreviewQuiz: (quiz: Quiz | null) => void;
  studyMaterials: StudyMaterial[];
  saveStudyMaterial: (material: StudyMaterial) => void;
  deleteStudyMaterial: (materialId: string) => void;
  getStudyMaterialForQuiz: (quiz: Quiz) => StudyMaterial | undefined;
  materialDraftForGeneration: StudyMaterial | null;
  setMaterialDraftForGeneration: (material: StudyMaterial | null) => void;

  // Challenge Flow & Invitations
  selectedQuizForChallenge: Quiz | null;
  setSelectedQuizForChallenge: (quiz: Quiz | null) => void;
  currentRoom: ChallengeRoomState | null;
  setCurrentRoom: (room: ChallengeRoomState | null) => void;
  pendingInvitations: ChallengeInvitation[];
  sendChallengeInvite: (roomCode: string, quizTitle: string, recipientEmail: string) => Promise<{ success: boolean; message: string }>;
  acceptChallengeInvite: (inv: ChallengeInvitation) => Promise<void>;
  declineChallengeInvite: (inv: ChallengeInvitation) => Promise<void>;

  // Active Game & Results
  currentGameSession: GameSession | null;
  startGame: (quiz: Quiz, mode: 'solo' | 'challenge', timeLimitMinutes?: number, room?: ChallengeRoomState) => void;
  exitGame: () => void;
  lastResult: GameResult | null;
  finishGame: (result: GameResult) => void;
  awardQuestionReward: (sessionId: string, questionId: string, roomCode?: string) => { awarded: boolean; pointsAdded: number };

  // Activities
  activities: ActivityRecord[];
  clearActivities: () => void;

  // Local Notifications & Daily Study Reminders
  notifications: AppNotification[];
  unreadNotificationsCount: number;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  clearNotifications: () => void;
  updateReminderConfig: (config: Partial<StudyReminderConfig>, options?: { silent?: boolean }) => void;
  triggerStudyReminder: (customTitle?: string, customMessage?: string, forceTest?: boolean) => void;
  requestBrowserNotificationPermission: () => Promise<NotificationPermission>;
  browserPermission: NotificationPermission | 'unsupported';
  activeReminderAlert: AppNotification | null;
  dismissActiveReminderAlert: () => void;
  snoozeReminder: (minutes?: number) => void;

  // Toasts
  toastMessage: string | null;
  showToast: (msg: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  USER: 'quizian_user_session',
  AUTH_MODE: 'quizian_auth_mode',
  USERS_LIST: 'quizian_registered_users',
  USER_PROFILES: 'quizian_user_profiles',
  CLAIMED_REWARDS: 'quizian_claimed_rewards',
  QUIZZES: 'quizian_saved_quizzes',
  QUIZZES_USE_IDB: 'quizian_quizzes_use_idb',
  ACTIVITIES: 'quizian_user_activities',
  NOTIFICATIONS: 'quizian_notifications',
};

function ensureUserRewards(profile: UserProfile): UserProfile {
  return {
    ...profile,
    totalPoints: typeof profile.totalPoints === 'number' && Number.isFinite(profile.totalPoints) ? profile.totalPoints : 0,
  };
}

function loadUserProfileStore(): Record<string, UserProfile> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER_PROFILES);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveUserProfileToStore(profile: UserProfile): void {
  const normalized = ensureUserRewards(profile);
  const key = normalized.email.trim().toLowerCase();
  if (!key) return;
  try {
    const store = loadUserProfileStore();
    store[key] = normalized;
    localStorage.setItem(STORAGE_KEYS.USER_PROFILES, JSON.stringify(store));

    const rawList = localStorage.getItem(STORAGE_KEYS.USERS_LIST);
    if (rawList) {
      const list = JSON.parse(rawList);
      if (Array.isArray(list)) {
        const updatedList = list.map((entry: any) =>
          entry?.email?.toLowerCase?.() === key ? { ...entry, profile: normalized } : entry
        );
        localStorage.setItem(STORAGE_KEYS.USERS_LIST, JSON.stringify(updatedList));
      }
    }
  } catch {
    // Ignore storage quota errors
  }
}

function sanitizeStoredQuizzes(rawQuizzes: Quiz[]): Quiz[] {
  return rawQuizzes.map((quiz) => ({
    ...quiz,
    questions: (quiz.questions || []).map((q) => {
      const rawType = q.type as string;
      if (rawType === 'multiple_choice') {
        return q;
      }
      if (rawType === 'identification' || rawType === 'scrambled_word') {
        return q.options && q.options.length > 0 ? { ...q, options: [] } : q;
      }
      // Migrate any legacy removed question types (including fill_blank) cleanly to identification
      return {
        id: q.id,
        type: 'identification',
        question: q.question,
        options: [],
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
      };
    }),
  }));
}

function mapFirebaseAuthError(err: any): string {
  const code = String(err?.code || '');
  if (code === 'auth/popup-closed-by-user') {
    return 'Google sign-in popup was closed before completing login.';
  }
  if (code === 'auth/popup-blocked') {
    return 'Popup was blocked by your browser. Please allow popups for Quizian and try again.';
  }
  if (code === 'auth/unauthorized-domain') {
    return 'This domain is not yet authorized in Firebase Authentication settings. Try Demo Student mode or add this domain in Firebase Console.';
  }
  if (code === 'auth/operation-not-allowed') {
    return 'Email/Password sign-in is not enabled yet in Firebase Console. Use "Continue with Google" or Demo Student accounts.';
  }
  if (code === 'auth/email-already-in-use') {
    return 'An account with this email already exists. Please log in instead.';
  }
  if (code === 'auth/weak-password') {
    return 'Password should be at least 6 characters long.';
  }
  if (code === 'auth/invalid-email') {
    return 'Please enter a valid email address.';
  }
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
    return 'Incorrect email or password.';
  }
  if (code === 'auth/requires-recent-login') {
    return 'For security, please log out and log back in before changing your password.';
  }
  return err?.message || 'Authentication error. Please try again.';
}

const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-welcome',
    title: '⏰ Daily Study Reminders Active',
    message: 'Your reminder is scheduled for 07:30 PM (Mon-Fri). You can customize the time in Profile Settings.',
    timestamp: Date.now() - 3600000,
    read: false,
    type: 'study_reminder',
  },
  {
    id: 'notif-streak',
    title: '🔥 5-Day Study Streak Active',
    message: 'Great consistency! Complete today’s active recall session to maintain your score streak.',
    timestamp: Date.now() - 7200000,
    read: true,
    type: 'streak_milestone',
  },
];

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Auth state
  const [authMode, setAuthMode] = useState<'firebase' | 'demo'>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.AUTH_MODE);
    return saved === 'firebase' ? 'firebase' : 'demo';
  });
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [isSyncingCloud, setIsSyncingCloud] = useState<boolean>(false);

  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.USER);
    if (saved) {
      try {
        const parsed = ensureUserRewards(JSON.parse(saved));
        const store = loadUserProfileStore();
        const storedForEmail = store[parsed.email.trim().toLowerCase()];
        return storedForEmail ? ensureUserRewards({ ...parsed, ...storedForEmail }) : parsed;
      } catch {
        return null;
      }
    }
    return null;
  });

  const claimedRewardsRef = useRef<Set<string>>((() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CLAIMED_REWARDS);
      if (!raw) return new Set<string>();
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? new Set<string>(parsed.map(String)) : new Set<string>();
    } catch {
      return new Set<string>();
    }
  })());

  const pendingSignupNameRef = useRef<string | undefined>(undefined);
  const seededUidsRef = useRef<Set<string>>(new Set());
  const seenInvitationIdsRef = useRef<Set<string>>(new Set());
  const authModeRef = useRef(authMode);
  authModeRef.current = authMode;

  const [authView, setAuthView] = useState<'login' | 'signup' | 'forgot_password'>('login');

  // Navigation
  const [activeTab, setActiveTabState] = useState<ActiveTab>('home');
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>('main');

  // Quizzes
  const [quizzes, setQuizzes] = useState<Quiz[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.QUIZZES);
    if (saved) {
      try {
        return sanitizeStoredQuizzes(JSON.parse(saved));
      } catch {
        return INITIAL_QUIZZES;
      }
    }
    return INITIAL_QUIZZES;
  });

  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [previewQuiz, setPreviewQuiz] = useState<Quiz | null>(null);

  // Study Materials (persisted in localStorage + IndexedDB for large offline files + Firestore metadata)
  const [studyMaterials, setStudyMaterials] = useState<StudyMaterial[]>(() => {
    const saved = getStudyMaterialsFromLocalStorage();
    return saved && saved.length > 0 ? saved : INITIAL_STUDY_MATERIALS;
  });
  const [materialDraftForGeneration, setMaterialDraftForGeneration] = useState<StudyMaterial | null>(null);

  // Challenge state & invitations
  const [selectedQuizForChallenge, setSelectedQuizForChallenge] = useState<Quiz | null>(null);
  const [currentRoom, setCurrentRoom] = useState<ChallengeRoomState | null>(null);
  const [pendingInvitations, setPendingInvitations] = useState<ChallengeInvitation[]>([]);

  // Game Session
  const [currentGameSession, setCurrentGameSession] = useState<GameSession | null>(null);
  const [lastResult, setLastResult] = useState<GameResult | null>(null);

  // Activities
  const [activities, setActivities] = useState<ActivityRecord[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ACTIVITIES);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return INITIAL_ACTIVITIES;
      }
    }
    return INITIAL_ACTIVITIES;
  });

  // Local Notifications & Daily Reminders
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return INITIAL_NOTIFICATIONS;
      }
    }
    return INITIAL_NOTIFICATIONS;
  });

  const [activeReminderAlert, setActiveReminderAlert] = useState<AppNotification | null>(null);

  const [browserPermission, setBrowserPermission] = useState<NotificationPermission | 'unsupported'>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'unsupported';
  });

  // Toast & Snooze timers
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const snoozeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      if (snoozeTimeoutRef.current) clearTimeout(snoozeTimeoutRef.current);
    };
  }, []);

  const showToast = (msg: string) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Boot Firestore connection verification once
  useEffect(() => {
    void testFirestoreConnection();
  }, []);

  // Firebase Auth listener + Firestore real-time synchronization
  useEffect(() => {
    let unsubUserDoc: (() => void) | null = null;
    let unsubQuizzes: (() => void) | null = null;
    let unsubMaterials: (() => void) | null = null;
    let unsubActivities: (() => void) | null = null;
    let unsubInvitations: (() => void) | null = null;

    const cleanupCloudListeners = () => {
      unsubUserDoc?.();
      unsubQuizzes?.();
      unsubMaterials?.();
      unsubActivities?.();
      unsubInvitations?.();
      unsubUserDoc = null;
      unsubQuizzes = null;
      unsubMaterials = null;
      unsubActivities = null;
      unsubInvitations = null;
    };

    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      cleanupCloudListeners();

      if (!firebaseUser) {
        if (authModeRef.current === 'firebase') {
          setUser(null);
          setAuthMode('demo');
          localStorage.setItem(STORAGE_KEYS.AUTH_MODE, 'demo');
          setPendingInvitations([]);
        }
        setIsAuthLoading(false);
        return;
      }

      setAuthMode('firebase');
      localStorage.setItem(STORAGE_KEYS.AUTH_MODE, 'firebase');
      setIsSyncingCloud(true);

      try {
        const seedName = pendingSignupNameRef.current;
        pendingSignupNameRef.current = undefined;

        const profile = await fetchOrCreateUserProfileInFirestore(firebaseUser, seedName);
        setUser(profile);
        setIsAuthLoading(false);

        // Seed starter quizzes & study materials once if cloud collection is empty
        if (!seededUidsRef.current.has(firebaseUser.uid)) {
          seededUidsRef.current.add(firebaseUser.uid);
          const existingCloudQuizzes = await fetchQuizzesOnceFromFirestore(firebaseUser.uid);
          if (existingCloudQuizzes.length === 0) {
            await Promise.all([
              ...INITIAL_QUIZZES.map((q) => saveQuizToFirestore(firebaseUser.uid, q)),
              ...INITIAL_STUDY_MATERIALS.map((m) => saveStudyMaterialToFirestore(firebaseUser.uid, m)),
            ]);
          }
        }

        // Real-time User Profile listener
        const userDocPath = `users/${firebaseUser.uid}`;
        unsubUserDoc = onSnapshot(
          doc(db, 'users', firebaseUser.uid),
          (snap) => {
            if (!snap.exists()) return;
            const data = snap.data();
            setUser((prev) =>
              ensureUserRewards({
                ...(prev || profile),
                id: firebaseUser.uid,
                name: String(data.name || profile.name),
                email: String(data.email || profile.email),
                avatar: String(data.avatar || profile.avatar),
                school: typeof data.school === 'string' ? data.school : prev?.school,
                bio: typeof data.bio === 'string' ? data.bio : prev?.bio,
                role: data.role === 'educator' ? 'educator' : 'student',
                totalPoints: typeof data.totalPoints === 'number' ? data.totalPoints : 0,
                settings: data.settings ? { ...profile.settings, ...data.settings } : profile.settings,
              })
            );
          },
          (error) => {
            handleFirestoreError(error, OperationType.GET, userDocPath);
          }
        );

        // Real-time Quizzes listener
        unsubQuizzes = subscribeQuizzesFromFirestore(firebaseUser.uid, (cloudQuizzes) => {
          if (cloudQuizzes.length > 0) {
            setQuizzes(sanitizeStoredQuizzes(cloudQuizzes));
          }
          setIsSyncingCloud(false);
        });

        // Real-time Study Materials listener (preserving IndexedDB binary fileDataUrl)
        unsubMaterials = subscribeStudyMaterialsFromFirestore(firebaseUser.uid, (cloudMaterials) => {
          setStudyMaterials((prev) => {
            const blobMap = new Map<string, string>();
            for (const m of prev) {
              if (m.fileDataUrl) blobMap.set(m.id, m.fileDataUrl);
            }
            if (cloudMaterials.length === 0 && prev.length > 0) return prev;
            return cloudMaterials.map((cm) => ({
              ...cm,
              ...(blobMap.has(cm.id) ? { fileDataUrl: blobMap.get(cm.id) } : {}),
            }));
          });
        });

        // Real-time Activities listener (preserving local review snapshots)
        unsubActivities = subscribeActivitiesFromFirestore(firebaseUser.uid, (cloudActs) => {
          setActivities((prev) => {
            const snapMap = new Map<string, { questionsSnapshot?: Question[]; userAnswers?: Record<string, string> }>();
            for (const a of prev) {
              if (a.questionsSnapshot || a.userAnswers) {
                snapMap.set(a.id, {
                  questionsSnapshot: a.questionsSnapshot,
                  userAnswers: a.userAnswers,
                });
              }
            }
            return cloudActs.map((ca) => ({
              ...ca,
              ...(snapMap.get(ca.id) || {}),
            }));
          });
        });

        // Real-time Challenge Invitations listener (only when emailVerified)
        unsubInvitations = subscribeToIncomingInvitations(
          firebaseUser.email || profile.email,
          Boolean(firebaseUser.emailVerified),
          (invites) => {
            setPendingInvitations(invites);
            for (const inv of invites) {
              if (!seenInvitationIdsRef.current.has(inv.id)) {
                seenInvitationIdsRef.current.add(inv.id);
                const newNotif: AppNotification = {
                  id: `notif-inv-${inv.id}`,
                  title: `⚔️ Challenge Invite from ${inv.senderName}`,
                  message: `${inv.senderName} invited you to "${inv.quizTitle}" (Room ${inv.roomCode}).`,
                  timestamp: inv.createdAt || Date.now(),
                  read: false,
                  type: 'challenge_alert',
                  roomCode: inv.roomCode,
                };
                setNotifications((prev) =>
                  prev.some((n) => n.id === newNotif.id) ? prev : [newNotif, ...prev]
                );
              }
            }
          }
        );
      } catch (err) {
        console.error('Firebase hydration failed, keeping local state:', err);
        setIsAuthLoading(false);
        setIsSyncingCloud(false);
      }
    });

    return () => {
      cleanupCloudListeners();
      unsubAuth();
    };
  }, []);

  // Sync theme to document root
  useEffect(() => {
    const activeTheme = user?.settings?.theme || 'cream';
    document.documentElement.setAttribute('data-theme', activeTheme);
  }, [user?.settings?.theme]);

  // Sync state to local storage & persistent per-account profile store
  useEffect(() => {
    if (user) {
      const normalized = ensureUserRewards(user);
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(normalized));
      saveUserProfileToStore(normalized);
    } else {
      localStorage.removeItem(STORAGE_KEYS.USER);
    }
  }, [user]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.QUIZZES, JSON.stringify(quizzes));
      localStorage.removeItem(STORAGE_KEYS.QUIZZES_USE_IDB);
    } catch {
      try {
        localStorage.setItem(STORAGE_KEYS.QUIZZES_USE_IDB, '1');
      } catch {
        // Ignore storage quota overflow; IndexedDB still stores full quizzes
      }
    }
    void saveQuizzesToDB(quizzes);
  }, [quizzes]);

  useEffect(() => {
    void saveAllStudyMaterialsToDB(studyMaterials);
  }, [studyMaterials]);

  // Hydrate full quizzes & study materials (including PDF/image blobs) from IndexedDB on mount
  useEffect(() => {
    let active = true;
    (async () => {
      const [dbQuizzes, dbMaterials] = await Promise.all([
        getQuizzesFromDB(),
        getAllStudyMaterialsFromDB(),
      ]);
      if (!active) return;

      if (
        dbQuizzes &&
        dbQuizzes.length > 0 &&
        (!localStorage.getItem(STORAGE_KEYS.QUIZZES) ||
          localStorage.getItem(STORAGE_KEYS.QUIZZES_USE_IDB) === '1')
      ) {
        setQuizzes(sanitizeStoredQuizzes(dbQuizzes));
      }

      if (dbMaterials && dbMaterials.length > 0) {
        setStudyMaterials((prev) => {
          const map = new Map<string, StudyMaterial>();
          for (const m of prev) map.set(m.id, m);
          for (const m of dbMaterials) {
            const existing = map.get(m.id);
            map.set(m.id, { ...existing, ...m });
          }
          return Array.from(map.values()).sort((a, b) =>
            (b.updatedAt || '').localeCompare(a.updatedAt || '')
          );
        });
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(activities));
    } catch {
      // Ignore storage quota overflow
    }
  }, [activities]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
    } catch {
      // Ignore storage quota overflow
    }
  }, [notifications]);

  const setActiveTab = (tab: ActiveTab) => {
    setActiveTabState(tab);
    setActiveScreen('main');
  };

  // Auth operations
  const loginWithGoogle = async (): Promise<AuthActionResult> => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      setActiveTabState('home');
      setActiveScreen('main');
      showToast(`Welcome, ${result.user.displayName || 'Student'}!`);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: mapFirebaseAuthError(err) };
    }
  };

  const login = async (email: string, pass: string): Promise<AuthActionResult> => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !pass) {
      return { success: false, error: 'Please enter both email and password.' };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return { success: false, error: 'Please enter a valid email address.' };
    }
    if (pass.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters.' };
    }

    // Preserve built-in demo student instant login when using prototype demo credentials
    if (
      (cleanEmail === 'matteollanora@gmail.com' || cleanEmail === 'sarah.chen@campus.edu') &&
      pass === 'password123'
    ) {
      quickDemoLogin(cleanEmail);
      return { success: true };
    }

    // Attempt real Firebase Email/Password authentication
    try {
      await signInWithEmailAndPassword(auth, cleanEmail, pass);
      setActiveTabState('home');
      setActiveScreen('main');
      showToast('Signed in with Quizian Cloud!');
      return { success: true };
    } catch (err: any) {
      const code = String(err?.code || '');
      // Check locally saved demo accounts if Email/Password isn't enabled yet in Firebase Console
      if (code === 'auth/operation-not-allowed' || code === 'auth/network-request-failed') {
        const profileStore = loadUserProfileStore();
        const registered = localStorage.getItem(STORAGE_KEYS.USERS_LIST);
        if (registered) {
          try {
            const users = JSON.parse(registered);
            const match = users.find((u: any) => u.email?.toLowerCase?.() === cleanEmail);
            if (match && match.password === pass) {
              const storedProfile = profileStore[cleanEmail];
              const restored = ensureUserRewards(
                storedProfile ? { ...match.profile, ...storedProfile } : match.profile
              );
              setAuthMode('demo');
              localStorage.setItem(STORAGE_KEYS.AUTH_MODE, 'demo');
              saveUserProfileToStore(restored);
              setUser(restored);
              setActiveScreen('main');
              showToast(`Welcome back, ${restored.name}! (Local Mode)`);
              return { success: true };
            }
          } catch {
            // ignore
          }
        }
      }
      return { success: false, error: mapFirebaseAuthError(err) };
    }
  };

  const signup = async (name: string, email: string, pass: string): Promise<AuthActionResult> => {
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName) {
      return { success: false, error: 'Please enter your full name.' };
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return { success: false, error: 'Please enter a valid email address.' };
    }
    if (pass.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long.' };
    }

    try {
      pendingSignupNameRef.current = cleanName;
      const cred = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
      await updateFirebaseAuthProfile(cred.user, { displayName: cleanName }).catch(() => {});
      await sendEmailVerification(cred.user).catch(() => {});
      setActiveTabState('home');
      setActiveScreen('main');
      showToast(`Account created! Welcome, ${cleanName}!`);
      return { success: true };
    } catch (err: any) {
      pendingSignupNameRef.current = undefined;
      return { success: false, error: mapFirebaseAuthError(err) };
    }
  };

  const logout = async (): Promise<void> => {
    if (user) {
      saveUserProfileToStore(user);
    }
    if (snoozeTimeoutRef.current) {
      clearTimeout(snoozeTimeoutRef.current);
      snoozeTimeoutRef.current = null;
    }
    if (auth.currentUser) {
      await signOut(auth).catch(() => {});
    }
    setAuthMode('demo');
    localStorage.setItem(STORAGE_KEYS.AUTH_MODE, 'demo');
    setUser(null);
    setCurrentGameSession(null);
    setLastResult(null);
    setCurrentRoom(null);
    setPreviewQuiz(null);
    setEditingQuiz(null);
    setSelectedQuizForChallenge(null);
    setActiveReminderAlert(null);
    setPendingInvitations([]);
    setActiveScreen('main');
    setAuthView('login');
    showToast('You have been logged out.');
  };

  const quickDemoLogin = (email = 'matteollanora@gmail.com') => {
    const cleanEmail = email.trim().toLowerCase();
    const profileStore = loadUserProfileStore();

    if (auth.currentUser) {
      void signOut(auth).catch(() => {});
    }
    setAuthMode('demo');
    localStorage.setItem(STORAGE_KEYS.AUTH_MODE, 'demo');

    if (profileStore[cleanEmail]) {
      const restored = ensureUserRewards(profileStore[cleanEmail]);
      setUser(restored);
    } else if (cleanEmail === 'matteollanora@gmail.com') {
      saveUserProfileToStore(INITIAL_USER);
      setUser(INITIAL_USER);
    } else {
      const sarahProfile: UserProfile = {
        id: 'user-demo-sarah',
        name: 'Sarah Chen',
        email: 'sarah.chen@campus.edu',
        avatar: 'S',
        school: 'University of Science & Tech',
        bio: 'Pre-med & Neuroscience • Quizian enthusiast 🧠',
        role: 'student',
        totalPoints: 75,
        settings: {
          notifications: true,
          challengeAlerts: true,
          studyReminders: true,
          soundEffects: true,
          theme: 'cream',
          reminderConfig: {
            enabled: true,
            time: '18:00',
            days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
            goal: 'Neuroscience Flashcards & Review',
            browserNotifications: false,
            soundEnabled: true,
          },
        },
      };
      saveUserProfileToStore(sarahProfile);
      setUser(sarahProfile);
    }
    setActiveTabState('home');
    setActiveScreen('main');
    showToast('Logged in as demo student.');
  };

  const resetPassword = async (email: string, _newPass?: string) => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      return { success: false, message: 'Please enter your registered email address.' };
    }
    try {
      await sendPasswordResetEmail(auth, cleanEmail);
      showToast('Password reset email sent!');
      return {
        success: true,
        message: 'A password reset link has been sent to your email address. Check your inbox and return to log in.',
      };
    } catch (err: any) {
      return { success: false, message: mapFirebaseAuthError(err) };
    }
  };

  const changePassword = async (currentPass: string, newPass: string) => {
    if (!newPass || newPass.length < 6) {
      return { success: false, message: 'New password must be at least 6 characters.' };
    }
    if (auth.currentUser && authMode === 'firebase') {
      const hasPasswordProvider = auth.currentUser.providerData.some(
        (p) => p.providerId === 'password'
      );
      if (!hasPasswordProvider) {
        return {
          success: false,
          message:
            'Your account uses Google Sign-In. Manage your password directly through your Google Account settings.',
        };
      }
      if (!auth.currentUser.email) {
        return { success: false, message: 'No email found on active account.' };
      }
      try {
        const cred = EmailAuthProvider.credential(auth.currentUser.email, currentPass);
        await reauthenticateWithCredential(auth.currentUser, cred);
        await updatePassword(auth.currentUser, newPass);
        showToast('Password updated in Firebase.');
        return { success: true, message: 'Password updated successfully.' };
      } catch (err: any) {
        return { success: false, message: mapFirebaseAuthError(err) };
      }
    }

    // Demo student local password update
    showToast('Demo password preference updated.');
    return { success: true, message: 'Password changed successfully.' };
  };

  const updateProfile = (updates: Partial<UserProfile>, options?: { silent?: boolean }) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = ensureUserRewards({ ...prev, ...updates });
      saveUserProfileToStore(updated);
      return updated;
    });
    if (auth.currentUser && authMode === 'firebase') {
      void updateUserProfileInFirestore(auth.currentUser.uid, updates).catch((err) =>
        console.error('Failed to update profile in Firestore:', err)
      );
    }
    if (!options?.silent) {
      showToast('Settings saved.');
    }
  };

  const awardQuestionReward = (sessionId: string, questionId: string, roomCode?: string) => {
    const activeUserId = user?.id || 'guest';
    const scopeKey = roomCode ? `room-${roomCode}` : sessionId;
    const rewardKey = `${activeUserId}:${scopeKey}:${questionId}`;
    if (claimedRewardsRef.current.has(rewardKey)) {
      return { awarded: false, pointsAdded: 0 };
    }

    claimedRewardsRef.current.add(rewardKey);
    try {
      const keys = Array.from(claimedRewardsRef.current).slice(-500);
      localStorage.setItem(STORAGE_KEYS.CLAIMED_REWARDS, JSON.stringify(keys));
    } catch {
      // Ignore storage quota errors
    }

    setUser((prev) => {
      if (!prev) return prev;
      const base = ensureUserRewards(prev);
      const updated: UserProfile = {
        ...base,
        totalPoints: base.totalPoints + POINTS_PER_CORRECT,
      };
      saveUserProfileToStore(updated);
      return updated;
    });

    if (auth.currentUser && authMode === 'firebase') {
      void incrementUserRewardsInFirestore(
        auth.currentUser.uid,
        POINTS_PER_CORRECT
      ).catch((err) => console.error('Failed to sync points to Firestore:', err));
    }

    return {
      awarded: true,
      pointsAdded: POINTS_PER_CORRECT,
    };
  };

  // Quizzes management
  const saveQuiz = (quiz: Quiz) => {
    const today = new Date().toISOString().split('T')[0];
    let savedCopy: Quiz = quiz;

    setQuizzes((prev) => {
      const exists = prev.some((q) => q.id === quiz.id);
      if (exists) {
        savedCopy = { ...quiz, updatedAt: today };
        return prev.map((q) => (q.id === quiz.id ? savedCopy : q));
      }
      savedCopy = { ...quiz, createdAt: quiz.createdAt || today, updatedAt: today };
      return [savedCopy, ...prev];
    });

    if (auth.currentUser && authMode === 'firebase') {
      void saveQuizToFirestore(auth.currentUser.uid, savedCopy).catch((err) =>
        console.error('Failed to sync quiz to Firestore:', err)
      );
    }

    showToast(`Saved "${quiz.title}"!`);
  };

  const deleteQuiz = (quizId: string) => {
    setQuizzes((prev) => prev.filter((q) => q.id !== quizId));
    if (auth.currentUser && authMode === 'firebase') {
      void deleteQuizFromFirestore(auth.currentUser.uid, quizId).catch((err) =>
        console.error('Failed to delete quiz from Firestore:', err)
      );
    }
    showToast('Quiz deleted.');
  };

  const saveStudyMaterial = (material: StudyMaterial) => {
    setStudyMaterials((prev) => {
      const exists = prev.some((m) => m.id === material.id);
      if (exists) {
        return prev.map((m) => (m.id === material.id ? material : m));
      }
      return [material, ...prev];
    });
    void saveStudyMaterialToDB(material);
    if (auth.currentUser && authMode === 'firebase') {
      void saveStudyMaterialToFirestore(auth.currentUser.uid, material).catch((err) =>
        console.error('Failed to sync study material to Firestore:', err)
      );
    }
  };

  const deleteStudyMaterial = (materialId: string) => {
    setStudyMaterials((prev) => prev.filter((m) => m.id !== materialId));
    void deleteStudyMaterialFromDB(materialId);
    if (auth.currentUser && authMode === 'firebase') {
      void deleteStudyMaterialFromFirestore(auth.currentUser.uid, materialId).catch((err) =>
        console.error('Failed to delete study material from Firestore:', err)
      );
    }
    showToast('Study material removed from storage.');
  };

  const getStudyMaterialForQuiz = (quiz: Quiz): StudyMaterial | undefined => {
    if (quiz.studyMaterialId) {
      const byId = studyMaterials.find((m) => m.id === quiz.studyMaterialId);
      if (byId) return byId;
    }
    return studyMaterials.find((m) => m.quizId === quiz.id);
  };

  // Challenge Invitations
  const sendChallengeInvite = async (
    roomCode: string,
    quizTitle: string,
    recipientEmail: string
  ) => {
    const cleanEmail = recipientEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return { success: false, message: 'Please enter a valid classmate email address.' };
    }

    if (!auth.currentUser || authMode !== 'firebase') {
      return {
        success: false,
        message:
          'Direct cloud invitations require signing in with Google or a Firebase account. Share the 6-character room code or invite link instead!',
      };
    }

    try {
      await sendChallengeInvitationInFirestore({
        roomCode,
        quizTitle,
        senderName: user?.name || auth.currentUser.displayName || 'Classmate',
        recipientEmail: cleanEmail,
      });
      showToast(`Invitation sent to ${cleanEmail}!`);
      return { success: true, message: `Challenge invitation sent to ${cleanEmail}.` };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Failed to send invitation.' };
    }
  };

  const acceptChallengeInvite = async (inv: ChallengeInvitation) => {
    try {
      await respondToChallengeInvitationInFirestore(inv.id, 'accepted');
      setPendingInvitations((prev) => prev.filter((item) => item.id !== inv.id));

      if (auth.currentUser && user) {
        const room = await joinChallengeRoomInFirestore(inv.roomCode, user);
        setCurrentRoom(room);
        setActiveTab('challenge');
        showToast(`Joined ${inv.senderName}'s challenge (${inv.roomCode})!`);
        return;
      }

      const fallbackRoom = await getChallengeRoomFromFirestore(inv.roomCode);
      if (fallbackRoom) {
        setCurrentRoom(fallbackRoom);
        setActiveTab('challenge');
      }
    } catch (err: any) {
      showToast(err?.message || 'Could not join challenge room from invitation.');
    }
  };

  const declineChallengeInvite = async (inv: ChallengeInvitation) => {
    try {
      await respondToChallengeInvitationInFirestore(inv.id, 'declined');
      setPendingInvitations((prev) => prev.filter((item) => item.id !== inv.id));
      showToast('Invitation declined.');
    } catch {
      showToast('Could not update invitation.');
    }
  };

  // Game flow
  const startGame = (
    quiz: Quiz,
    mode: 'solo' | 'challenge',
    timeLimitMinutes = 10,
    room?: ChallengeRoomState
  ) => {
    const userPlayerId = user ? user.id : 'player-user';
    const userName = user ? user.name : 'Matteo Llanora';
    const userAvatar = user ? user.avatar : 'M';

    let participants: ParticipantScore[] = [];

    if (room && room.participants && room.participants.length > 0) {
      participants = room.participants.map((p) => ({
        ...p,
        score: 0,
        correctAnswers: 0,
        totalQuestions: quiz.questions.length,
        accuracy: 0,
        completed: false,
      }));
    } else if (mode === 'challenge') {
      participants = [
        {
          id: userPlayerId,
          uid: userPlayerId,
          name: userName,
          avatar: userAvatar,
          score: 0,
          correctAnswers: 0,
          totalQuestions: quiz.questions.length,
          accuracy: 0,
          completed: false,
          isHost: true,
          isBot: false,
        },
        {
          id: 'bot-sarah',
          name: 'Sarah K. (Bot)',
          avatar: 'S',
          score: 0,
          correctAnswers: 0,
          totalQuestions: quiz.questions.length,
          accuracy: 0,
          completed: false,
          isBot: true,
        },
        {
          id: 'bot-liam',
          name: 'Liam M. (Bot)',
          avatar: 'L',
          score: 0,
          correctAnswers: 0,
          totalQuestions: quiz.questions.length,
          accuracy: 0,
          completed: false,
          isBot: true,
        },
      ];
    } else {
      participants = [
        {
          id: userPlayerId,
          uid: userPlayerId,
          name: userName,
          avatar: userAvatar,
          score: 0,
          correctAnswers: 0,
          totalQuestions: quiz.questions.length,
          accuracy: 0,
          completed: false,
          isHost: true,
          isBot: false,
        },
      ];
    }

    setLastResult(null);
    const sessionId = `sess-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setCurrentGameSession({
      sessionId,
      quiz,
      mode,
      roomCode: room?.code,
      timeLimitMinutes,
      participants,
      userPlayerId,
    });
    setActiveScreen('game');
  };

  const exitGame = () => {
    setCurrentGameSession(null);
    setLastResult(null);
    setActiveScreen('main');
  };

  const finishGame = (result: GameResult) => {
    const playerId = result.userPlayerId || currentGameSession?.userPlayerId || user?.id || 'player-user';
    const enrichedResult: GameResult = {
      ...result,
      userPlayerId: playerId,
    };
    setLastResult(enrichedResult);
    setCurrentGameSession(null);
    if (result.mode === 'challenge') {
      setCurrentRoom(null);
    }

    const foundRank = result.leaderboard.findIndex(
      (p) => p.id === playerId || p.name === (user?.name || 'Matteo Llanora')
    );

    const newActivity: ActivityRecord = {
      id: `act-${Date.now()}`,
      quizId: result.quiz.id,
      quizTitle: result.quiz.title,
      date: new Date().toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
      timestamp: Date.now(),
      score: result.score,
      maxScore: result.maxScore,
      correctCount: result.correctAnswers,
      totalQuestions: result.totalQuestions,
      accuracy: result.accuracy,
      type: result.mode,
      opponentCount: Math.max(0, result.leaderboard.length - 1),
      rank: foundRank >= 0 ? foundRank + 1 : 1,
      leaderboard: result.leaderboard,
      questionsSnapshot: result.quiz.questions,
      userAnswers: result.userAnswers,
    };

    setActivities((prev) => [newActivity, ...prev]);

    setQuizzes((prev) =>
      prev.map((q) => (q.id === result.quiz.id ? { ...q, timesPlayed: (q.timesPlayed || 0) + 1 } : q))
    );

    if (auth.currentUser && authMode === 'firebase') {
      void saveActivityToFirestore(auth.currentUser.uid, newActivity).catch((err) =>
        console.error('Failed to sync activity to Firestore:', err)
      );
      void incrementQuizTimesPlayedInFirestore(auth.currentUser.uid, result.quiz.id).catch(() => {});
    }

    setActiveScreen('results');
  };

  const clearActivities = () => {
    setActivities([]);
    if (auth.currentUser && authMode === 'firebase') {
      void clearActivitiesInFirestore(auth.currentUser.uid).catch((err) =>
        console.error('Failed to clear activities in Firestore:', err)
      );
    }
    showToast('Activity history cleared.');
  };

  // Local Notification System Implementation
  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;

  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    showToast('All notifications marked as read.');
  };

  const clearNotifications = () => {
    setNotifications([]);
    showToast('Notifications cleared.');
  };

  const updateReminderConfig = (configUpdates: Partial<StudyReminderConfig>, options?: { silent?: boolean }) => {
    setUser((prev) => {
      if (!prev) return prev;
      const currentConfig = prev.settings.reminderConfig || {
        enabled: true,
        time: '19:30',
        days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        goal: 'Daily Quiz Review & Active Recall',
        browserNotifications: false,
        soundEnabled: true,
      };
      const newConfig = { ...currentConfig, ...configUpdates };
      const nextSettings = {
        ...prev.settings,
        studyReminders: newConfig.enabled,
        reminderConfig: newConfig,
      };
      if (auth.currentUser && authMode === 'firebase') {
        void updateUserProfileInFirestore(auth.currentUser.uid, { settings: nextSettings }).catch(() => {});
      }
      return {
        ...prev,
        settings: nextSettings,
      };
    });
    if (!options?.silent) {
      showToast('Settings saved.');
    }
  };

  const triggerStudyReminder = (customTitle?: string, customMessage?: string, forceTest = false) => {
    const title = customTitle || '⏰ Daily Study Reminder!';
    const message =
      customMessage ||
      (user?.settings?.reminderConfig?.goal
        ? `Time for your daily review: "${user.settings.reminderConfig.goal}"!`
        : 'Keep your streak alive—review a quick quiz to cement your memory!');

    const newNotif: AppNotification = {
      id: `notif-${Date.now()}`,
      title,
      message,
      timestamp: Date.now(),
      read: false,
      type: 'study_reminder',
      quizId: quizzes[0]?.id,
    };

    setNotifications((prev) => [newNotif, ...prev]);
    setActiveReminderAlert(newNotif);

    if (user?.settings?.soundEffects || user?.settings?.reminderConfig?.soundEnabled) {
      playNotificationSound();
    }

    if (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'granted'
    ) {
      try {
        new Notification(title, {
          body: message,
          icon: `${import.meta.env.BASE_URL}assets/aistudio/download__3__de814aad.jfif`,
        });
      } catch {
        // pass
      }
    }

    if (forceTest) {
      showToast('🔔 Daily study reminder triggered!');
    }
  };

  const requestBrowserNotificationPermission = async (): Promise<NotificationPermission> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setBrowserPermission('unsupported');
      showToast('Browser notifications are not supported in this environment.');
      return 'denied';
    }

    try {
      const perm = await Notification.requestPermission();
      setBrowserPermission(perm);
      if (perm === 'granted') {
        updateReminderConfig({ browserNotifications: true });
        showToast('Browser notifications enabled! You will receive system alerts.');
      } else {
        updateReminderConfig({ browserNotifications: false });
        showToast('Browser notifications not allowed. In-app alerts remain active.');
      }
      return perm;
    } catch {
      return 'denied';
    }
  };

  const dismissActiveReminderAlert = () => {
    setActiveReminderAlert(null);
  };

  const snoozeReminder = (minutes = 10) => {
    setActiveReminderAlert(null);
    if (snoozeTimeoutRef.current) {
      clearTimeout(snoozeTimeoutRef.current);
    }
    showToast(`Reminder snoozed for ${minutes} minutes.`);
    snoozeTimeoutRef.current = setTimeout(() => {
      snoozeTimeoutRef.current = null;
      triggerStudyReminder('⏰ Snoozed Study Reminder', 'Your break is up! Ready for your quick quiz review?');
    }, minutes * 60 * 1000);
  };

  // Background reminder scheduler checking every 15 seconds
  useEffect(() => {
    if (!user?.settings?.reminderConfig?.enabled) return;

    const checkReminder = () => {
      const config = user?.settings?.reminderConfig;
      if (!config || !config.enabled) return;

      const now = new Date();
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const currentDay = dayNames[now.getDay()];

      if (!config.days || !config.days.includes(currentDay)) return;

      const currentHours = now.getHours().toString().padStart(2, '0');
      const currentMinutes = now.getMinutes().toString().padStart(2, '0');
      const currentTimeStr = `${currentHours}:${currentMinutes}`;
      const todayDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

      if (currentTimeStr === config.time && config.lastTriggeredDate !== todayDateStr) {
        updateReminderConfig({ lastTriggeredDate: todayDateStr }, { silent: true });
        triggerStudyReminder();
      }
    };

    checkReminder();
    const interval = setInterval(checkReminder, 15000);
    return () => clearInterval(interval);
  }, [
    user?.settings?.reminderConfig?.enabled,
    user?.settings?.reminderConfig?.time,
    user?.settings?.reminderConfig?.days,
    user?.settings?.reminderConfig?.lastTriggeredDate,
  ]);

  return (
    <AppContext.Provider
      value={{
        user,
        authMode,
        isAuthLoading,
        isSyncingCloud,
        authView,
        setAuthView,
        login,
        loginWithGoogle,
        signup,
        logout,
        quickDemoLogin,
        resetPassword,
        changePassword,
        updateProfile,
        activeTab,
        setActiveTab,
        activeScreen,
        setActiveScreen,
        quizzes,
        saveQuiz,
        deleteQuiz,
        editingQuiz,
        setEditingQuiz,
        previewQuiz,
        setPreviewQuiz,
        studyMaterials,
        saveStudyMaterial,
        deleteStudyMaterial,
        getStudyMaterialForQuiz,
        materialDraftForGeneration,
        setMaterialDraftForGeneration,
        selectedQuizForChallenge,
        setSelectedQuizForChallenge,
        currentRoom,
        setCurrentRoom,
        pendingInvitations,
        sendChallengeInvite,
        acceptChallengeInvite,
        declineChallengeInvite,
        currentGameSession,
        startGame,
        exitGame,
        lastResult,
        finishGame,
        awardQuestionReward,
        activities,
        clearActivities,
        notifications,
        unreadNotificationsCount,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        clearNotifications,
        updateReminderConfig,
        triggerStudyReminder,
        requestBrowserNotificationPermission,
        browserPermission,
        activeReminderAlert,
        dismissActiveReminderAlert,
        snoozeReminder,
        toastMessage,
        showToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
