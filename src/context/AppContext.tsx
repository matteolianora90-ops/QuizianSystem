import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { 
  Quiz, 
  ActivityRecord, 
  UserProfile, 
  Question, 
  ParticipantScore, 
  ChallengeRoomState,
  StudyReminderConfig,
  AppNotification,
  StudyMaterial
} from '../types';
import { INITIAL_USER, INITIAL_QUIZZES, INITIAL_ACTIVITIES, INITIAL_STUDY_MATERIALS } from '../data/mockData';
import { playNotificationSound } from '../utils/sound';
import { COINS_PER_CORRECT, POINTS_PER_CORRECT } from '../utils/questionUtils';
import {
  getAllStudyMaterialsFromDB,
  getQuizzesFromDB,
  getStudyMaterialsFromLocalStorage,
  saveAllStudyMaterialsToDB,
  saveQuizzesToDB,
  saveStudyMaterialToDB,
  deleteStudyMaterialFromDB,
} from '../utils/offlineStorage';

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
  coinsEarned: number;
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

interface AppContextType {
  // Auth state
  user: UserProfile | null;
  authView: 'login' | 'signup' | 'forgot_password';
  setAuthView: (view: 'login' | 'signup' | 'forgot_password') => void;
  login: (email: string, pass: string) => { success: boolean; error?: string };
  signup: (name: string, email: string, pass: string) => { success: boolean; error?: string };
  logout: () => void;
  quickDemoLogin: (email?: string) => void;
  resetPassword: (email: string, newPass: string) => { success: boolean; message: string };
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

  // Challenge Flow
  selectedQuizForChallenge: Quiz | null;
  setSelectedQuizForChallenge: (quiz: Quiz | null) => void;
  currentRoom: ChallengeRoomState | null;
  setCurrentRoom: (room: ChallengeRoomState | null) => void;

  // Active Game & Results
  currentGameSession: GameSession | null;
  startGame: (quiz: Quiz, mode: 'solo' | 'challenge', timeLimitMinutes?: number, room?: ChallengeRoomState) => void;
  exitGame: () => void;
  lastResult: GameResult | null;
  finishGame: (result: GameResult) => void;
  awardQuestionReward: (sessionId: string, questionId: string) => { awarded: boolean; pointsAdded: number; coinsAdded: number };

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
  USERS_LIST: 'quizian_registered_users',
  USER_PROFILES: 'quizian_user_profiles',
  CLAIMED_REWARDS: 'quizian_claimed_rewards',
  QUIZZES: 'quizian_saved_quizzes',
  ACTIVITIES: 'quizian_user_activities',
  NOTIFICATIONS: 'quizian_notifications',
};

function ensureUserRewards(profile: UserProfile): UserProfile {
  return {
    ...profile,
    totalPoints: typeof profile.totalPoints === 'number' && Number.isFinite(profile.totalPoints) ? profile.totalPoints : 0,
    coins: typeof profile.coins === 'number' && Number.isFinite(profile.coins) ? profile.coins : 0,
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
      if (rawType === 'fill_blank' || rawType === 'identification' || rawType === 'scrambled_word') {
        return q.options && q.options.length > 0 ? { ...q, options: [] } : q;
      }
      // Migrate any legacy removed question types cleanly
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
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.USER);
    if (saved) {
      try {
        const parsed = ensureUserRewards(JSON.parse(saved));
        const store = loadUserProfileStore();
        const storedForEmail = store[parsed.email.trim().toLowerCase()];
        return storedForEmail ? ensureUserRewards({ ...parsed, ...storedForEmail }) : parsed;
      } catch (e) {
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
      } catch (e) {
        return INITIAL_QUIZZES;
      }
    }
    return INITIAL_QUIZZES;
  });

  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [previewQuiz, setPreviewQuiz] = useState<Quiz | null>(null);

  // Study Materials (persisted in localStorage + IndexedDB for large offline files)
  const [studyMaterials, setStudyMaterials] = useState<StudyMaterial[]>(() => {
    const saved = getStudyMaterialsFromLocalStorage();
    return saved && saved.length > 0 ? saved : INITIAL_STUDY_MATERIALS;
  });
  const [materialDraftForGeneration, setMaterialDraftForGeneration] = useState<StudyMaterial | null>(null);

  // Challenge state
  const [selectedQuizForChallenge, setSelectedQuizForChallenge] = useState<Quiz | null>(null);
  const [currentRoom, setCurrentRoom] = useState<ChallengeRoomState | null>(null);

  // Game Session
  const [currentGameSession, setCurrentGameSession] = useState<GameSession | null>(null);
  const [lastResult, setLastResult] = useState<GameResult | null>(null);

  // Activities
  const [activities, setActivities] = useState<ActivityRecord[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ACTIVITIES);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
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
      } catch (e) {
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

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

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
    } catch {
      // Ignore storage quota overflow; IndexedDB still stores full quizzes
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

      if (dbQuizzes && dbQuizzes.length > 0 && !localStorage.getItem(STORAGE_KEYS.QUIZZES)) {
        setQuizzes(dbQuizzes);
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
    localStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(activities));
  }, [activities]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
  }, [notifications]);

  const setActiveTab = (tab: ActiveTab) => {
    setActiveTabState(tab);
    setActiveScreen('main');
  };

  // Auth operations
  const login = (email: string, pass: string) => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !pass) {
      return { success: false, error: 'Please enter both email and password.' };
    }

    const profileStore = loadUserProfileStore();

    // Default demo account
    if (cleanEmail === 'matteollanora@gmail.com' && pass.length >= 6) {
      const restored = profileStore[cleanEmail] ? ensureUserRewards(profileStore[cleanEmail]) : INITIAL_USER;
      saveUserProfileToStore(restored);
      setUser(restored);
      setActiveScreen('main');
      showToast(`Welcome back, ${restored.name.split(' ')[0]}!`);
      return { success: true };
    }

    // Check stored registered accounts
    const registered = localStorage.getItem(STORAGE_KEYS.USERS_LIST);
    if (registered) {
      try {
        const users = JSON.parse(registered);
        const match = users.find((u: any) => u.email.toLowerCase() === cleanEmail);
        if (match) {
          if (match.password === pass) {
            const storedProfile = profileStore[cleanEmail];
            const restored = ensureUserRewards(storedProfile ? { ...match.profile, ...storedProfile } : match.profile);
            saveUserProfileToStore(restored);
            setUser(restored);
            setActiveScreen('main');
            showToast(`Welcome back, ${restored.name}!`);
            return { success: true };
          }
          return { success: false, error: 'Incorrect email or password.' };
        }
      } catch (e) {
        // pass
      }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return { success: false, error: 'Please enter a valid email address.' };
    }

    if (pass.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters.' };
    }

    if (profileStore[cleanEmail]) {
      const restored = ensureUserRewards(profileStore[cleanEmail]);
      setUser(restored);
      setActiveScreen('main');
      showToast(`Welcome back, ${restored.name}!`);
      return { success: true };
    }

    const nameParts = cleanEmail.split('@')[0].replace(/[._-]/g, ' ');
    const formattedName = nameParts.charAt(0).toUpperCase() + nameParts.slice(1);
    const newUser: UserProfile = {
      id: `user-${Date.now()}`,
      name: formattedName || 'Student',
      email: cleanEmail,
      avatar: (formattedName || 'S').charAt(0).toUpperCase(),
      role: 'student',
      totalPoints: 0,
      coins: 0,
      school: 'University Student',
      bio: 'Studying smart on Quizian 🚀',
      settings: {
        notifications: true,
        challengeAlerts: true,
        studyReminders: true,
        soundEffects: true,
        theme: 'cream',
        reminderConfig: {
          enabled: true,
          time: '19:30',
          days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
          goal: 'Daily Quiz Review & Active Recall',
          browserNotifications: false,
          soundEnabled: true,
        },
      },
    };

    saveUserProfileToStore(newUser);
    setUser(newUser);
    setActiveScreen('main');
    showToast(`Welcome to Quizian, ${newUser.name}!`);
    return { success: true };
  };

  const signup = (name: string, email: string, pass: string) => {
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

    const newUser: UserProfile = {
      id: `user-${Date.now()}`,
      name: cleanName,
      email: cleanEmail,
      avatar: cleanName.charAt(0).toUpperCase(),
      role: 'student',
      totalPoints: 0,
      coins: 0,
      school: 'Student Member',
      bio: 'Ready to turn study notes into mastery ✨',
      settings: {
        notifications: true,
        challengeAlerts: true,
        studyReminders: true,
        soundEffects: true,
        theme: 'cream',
        reminderConfig: {
          enabled: true,
          time: '19:30',
          days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
          goal: 'Daily Quiz Review & Active Recall',
          browserNotifications: false,
          soundEnabled: true,
        },
      },
    };

    try {
      const raw = localStorage.getItem(STORAGE_KEYS.USERS_LIST);
      const list = raw ? JSON.parse(raw) : [];
      const filtered = Array.isArray(list)
        ? list.filter((u: any) => u?.email?.toLowerCase?.() !== cleanEmail)
        : [];
      filtered.push({ email: cleanEmail, password: pass, profile: newUser });
      localStorage.setItem(STORAGE_KEYS.USERS_LIST, JSON.stringify(filtered));
    } catch (e) {
      // pass
    }

    saveUserProfileToStore(newUser);
    setUser(newUser);
    setActiveTabState('home');
    setActiveScreen('main');
    showToast(`Account created successfully! Welcome, ${cleanName}!`);
    return { success: true };
  };

  const logout = () => {
    if (user) {
      saveUserProfileToStore(user);
    }
    setUser(null);
    setCurrentGameSession(null);
    setCurrentRoom(null);
    setActiveScreen('main');
    setAuthView('login');
    showToast('You have been logged out.');
  };

  const quickDemoLogin = (email = 'matteollanora@gmail.com') => {
    const cleanEmail = email.trim().toLowerCase();
    const profileStore = loadUserProfileStore();

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
        coins: 75,
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

  const resetPassword = (email: string, newPass: string) => {
    if (!email.trim()) {
      return { success: false, message: 'Please enter your registered email address.' };
    }
    if (newPass.length < 6) {
      return { success: false, message: 'New password must be at least 6 characters.' };
    }
    showToast('Password reset link sent! Password updated.');
    return { success: true, message: 'Your password has been reset successfully. You can now log in.' };
  };

  const updateProfile = (updates: Partial<UserProfile>, options?: { silent?: boolean }) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = ensureUserRewards({ ...prev, ...updates });
      saveUserProfileToStore(updated);
      return updated;
    });
    if (!options?.silent) {
      showToast('Settings saved.');
    }
  };

  const awardQuestionReward = (sessionId: string, questionId: string) => {
    const activeUserId = user?.id || 'guest';
    const rewardKey = `${activeUserId}:${sessionId}:${questionId}`;
    if (claimedRewardsRef.current.has(rewardKey)) {
      return { awarded: false, pointsAdded: 0, coinsAdded: 0 };
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
        coins: base.coins + COINS_PER_CORRECT,
      };
      saveUserProfileToStore(updated);
      return updated;
    });

    return {
      awarded: true,
      pointsAdded: POINTS_PER_CORRECT,
      coinsAdded: COINS_PER_CORRECT,
    };
  };

  // Quizzes management
  const saveQuiz = (quiz: Quiz) => {
    setQuizzes((prev) => {
      const exists = prev.some((q) => q.id === quiz.id);
      if (exists) {
        return prev.map((q) => (q.id === quiz.id ? { ...quiz, updatedAt: new Date().toISOString().split('T')[0] } : q));
      }
      return [{ ...quiz, createdAt: new Date().toISOString().split('T')[0], updatedAt: new Date().toISOString().split('T')[0] }, ...prev];
    });
    showToast(`Saved "${quiz.title}"!`);
  };

  const deleteQuiz = (quizId: string) => {
    setQuizzes((prev) => prev.filter((q) => q.id !== quizId));
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
  };

  const deleteStudyMaterial = (materialId: string) => {
    setStudyMaterials((prev) => prev.filter((m) => m.id !== materialId));
    void deleteStudyMaterialFromDB(materialId);
    showToast('Study material removed from offline storage.');
  };

  const getStudyMaterialForQuiz = (quiz: Quiz): StudyMaterial | undefined => {
    if (quiz.studyMaterialId) {
      const byId = studyMaterials.find((m) => m.id === quiz.studyMaterialId);
      if (byId) return byId;
    }
    return studyMaterials.find((m) => m.quizId === quiz.id);
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

    // Strictly reset all participant scores to 0 for every fresh game session
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
          name: userName,
          avatar: userAvatar,
          score: 0,
          correctAnswers: 0,
          totalQuestions: quiz.questions.length,
          accuracy: 0,
          completed: false,
          isHost: true,
        },
        {
          id: 'bot-sarah',
          name: 'Sarah K.',
          avatar: 'S',
          score: 0,
          correctAnswers: 0,
          totalQuestions: quiz.questions.length,
          accuracy: 0,
          completed: false,
        },
        {
          id: 'bot-liam',
          name: 'Liam M.',
          avatar: 'L',
          score: 0,
          correctAnswers: 0,
          totalQuestions: quiz.questions.length,
          accuracy: 0,
          completed: false,
        },
      ];
    } else {
      // Solo mode: start with user at 0 points
      participants = [
        {
          id: userPlayerId,
          name: userName,
          avatar: userAvatar,
          score: 0,
          correctAnswers: 0,
          totalQuestions: quiz.questions.length,
          accuracy: 0,
          completed: false,
          isHost: true,
        },
      ];
    }

    setLastResult(null); // Reset previous match result
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
      coinsEarned: result.coinsEarned,
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

    setActiveScreen('results');
  };

  const clearActivities = () => {
    setActivities([]);
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
      return {
        ...prev,
        settings: {
          ...prev.settings,
          studyReminders: newConfig.enabled,
          reminderConfig: newConfig,
        },
      };
    });
    if (!options?.silent) {
      showToast('Settings saved.');
    }
  };

  const triggerStudyReminder = (customTitle?: string, customMessage?: string, forceTest = false) => {
    const title = customTitle || '⏰ Daily Study Reminder!';
    const message = customMessage || (user?.settings?.reminderConfig?.goal 
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

    // Audio chime
    if (user?.settings?.soundEffects || user?.settings?.reminderConfig?.soundEnabled) {
      playNotificationSound();
    }

    // HTML5 Web Notifications
    if (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'granted'
    ) {
      try {
        new Notification(title, {
          body: message,
          icon: '/assets/aistudio/download__3__de814aad.jfif',
        });
      } catch (e) {
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
    } catch (e) {
      return 'denied';
    }
  };

  const dismissActiveReminderAlert = () => {
    setActiveReminderAlert(null);
  };

  const snoozeReminder = (minutes = 10) => {
    setActiveReminderAlert(null);
    showToast(`Reminder snoozed for ${minutes} minutes.`);
    setTimeout(() => {
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
      const todayDateStr = now.toISOString().split('T')[0];

      if (currentTimeStr === config.time && config.lastTriggeredDate !== todayDateStr) {
        updateReminderConfig({ lastTriggeredDate: todayDateStr }, { silent: true });
        triggerStudyReminder();
      }
    };

    checkReminder();
    const interval = setInterval(checkReminder, 15000);
    return () => clearInterval(interval);
  }, [user?.settings?.reminderConfig?.enabled, user?.settings?.reminderConfig?.time, user?.settings?.reminderConfig?.days, user?.settings?.reminderConfig?.lastTriggeredDate]);

  return (
    <AppContext.Provider
      value={{
        user,
        authView,
        setAuthView,
        login,
        signup,
        logout,
        quickDemoLogin,
        resetPassword,
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
