import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  Quiz, 
  ActivityRecord, 
  UserProfile, 
  Question, 
  ParticipantScore, 
  ChallengeRoomState,
  StudyReminderConfig,
  AppNotification,
  ViewMode
} from '../types';
import { INITIAL_USER, INITIAL_QUIZZES, INITIAL_ACTIVITIES } from '../data/mockData';
import { playNotificationSound } from '../utils/sound';

export type ActiveTab = 'home' | 'quizzes' | 'challenge' | 'activity' | 'profile';
export type ActiveScreen = 'main' | 'generate' | 'game' | 'results' | 'review_answers' | 'challenge_waiting';

export interface GameSession {
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
  updateProfile: (updates: Partial<UserProfile>) => void;

  // Navigation & View Mode
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  activeScreen: ActiveScreen;
  setActiveScreen: (screen: ActiveScreen) => void;

  // Quizzes
  quizzes: Quiz[];
  saveQuiz: (quiz: Quiz) => void;
  deleteQuiz: (quizId: string) => void;
  editingQuiz: Quiz | null;
  setEditingQuiz: (quiz: Quiz | null) => void;
  previewQuiz: Quiz | null;
  setPreviewQuiz: (quiz: Quiz | null) => void;

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

  // Activities
  activities: ActivityRecord[];
  clearActivities: () => void;

  // Local Notifications & Daily Study Reminders
  notifications: AppNotification[];
  unreadNotificationsCount: number;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  clearNotifications: () => void;
  updateReminderConfig: (config: Partial<StudyReminderConfig>) => void;
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
  QUIZZES: 'quizian_saved_quizzes',
  ACTIVITIES: 'quizian_user_activities',
  NOTIFICATIONS: 'quizian_notifications',
};

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
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const [authView, setAuthView] = useState<'login' | 'signup' | 'forgot_password'>('login');

  // View Mode: 'phone' (mobile simulator on desktop) vs 'desktop' (standard fullscreen)
  const [viewMode, setViewModeState] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('quizian_view_mode');
    if (saved === 'desktop' || saved === 'phone') {
      return saved;
    }
    return 'phone'; // Default to phone view per user request
  });

  const setViewMode = (mode: ViewMode) => {
    setViewModeState(mode);
    localStorage.setItem('quizian_view_mode', mode);
  };

  // Navigation
  const [activeTab, setActiveTabState] = useState<ActiveTab>('home');
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>('main');

  // Quizzes
  const [quizzes, setQuizzes] = useState<Quiz[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.QUIZZES);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return INITIAL_QUIZZES;
      }
    }
    return INITIAL_QUIZZES;
  });

  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null);
  const [previewQuiz, setPreviewQuiz] = useState<Quiz | null>(null);

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

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  // Sync state to local storage
  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.USER);
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.QUIZZES, JSON.stringify(quizzes));
  }, [quizzes]);

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

    // Default demo account
    if (cleanEmail === 'matteollanora@gmail.com' && pass.length >= 6) {
      setUser(INITIAL_USER);
      setActiveScreen('main');
      showToast('Welcome back, Matteo!');
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
            setUser(match.profile);
            setActiveScreen('main');
            showToast(`Welcome back, ${match.profile.name}!`);
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

    const nameParts = cleanEmail.split('@')[0].replace(/[._-]/g, ' ');
    const formattedName = nameParts.charAt(0).toUpperCase() + nameParts.slice(1);
    const newUser: UserProfile = {
      id: `user-${Date.now()}`,
      name: formattedName || 'Student',
      email: cleanEmail,
      avatar: (formattedName || 'S').charAt(0).toUpperCase(),
      role: 'student',
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
      list.push({ email: cleanEmail, password: pass, profile: newUser });
      localStorage.setItem(STORAGE_KEYS.USERS_LIST, JSON.stringify(list));
    } catch (e) {
      // pass
    }

    setUser(newUser);
    setActiveTabState('home');
    setActiveScreen('main');
    showToast(`Account created successfully! Welcome, ${cleanName}!`);
    return { success: true };
  };

  const logout = () => {
    setUser(null);
    setCurrentGameSession(null);
    setCurrentRoom(null);
    setActiveScreen('main');
    setAuthView('login');
    showToast('You have been logged out.');
  };

  const quickDemoLogin = (email = 'matteollanora@gmail.com') => {
    if (email === 'matteollanora@gmail.com') {
      setUser(INITIAL_USER);
    } else {
      setUser({
        id: 'user-demo-sarah',
        name: 'Sarah Chen',
        email: 'sarah.chen@campus.edu',
        avatar: 'S',
        school: 'University of Science & Tech',
        bio: 'Pre-med & Neuroscience • Quizian enthusiast 🧠',
        role: 'student',
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
      });
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

  const updateProfile = (updates: Partial<UserProfile>) => {
    if (!user) return;
    const updated = { ...user, ...updates };
    setUser(updated);
    showToast('Settings saved.');
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
    setCurrentGameSession({
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
    setLastResult(result);

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
      opponentCount: result.leaderboard.length - 1,
      rank: result.leaderboard.findIndex((p) => p.id === (user?.id || 'player-user') || p.name === (user?.name || 'Matteo Llanora')) + 1 || 1,
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

  const updateReminderConfig = (configUpdates: Partial<StudyReminderConfig>) => {
    if (!user) return;
    const currentConfig = user.settings.reminderConfig || {
      enabled: true,
      time: '19:30',
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      goal: 'Daily Quiz Review & Active Recall',
      browserNotifications: false,
      soundEnabled: true,
    };
    const newConfig = { ...currentConfig, ...configUpdates };
    updateProfile({
      settings: {
        ...user.settings,
        studyReminders: newConfig.enabled,
        reminderConfig: newConfig,
      },
    });
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
          icon: '/favicon.ico',
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
        updateReminderConfig({ lastTriggeredDate: todayDateStr });
        triggerStudyReminder();
      }
    };

    checkReminder();
    const interval = setInterval(checkReminder, 15000);
    return () => clearInterval(interval);
  }, [user?.settings?.reminderConfig?.enabled, user?.settings?.reminderConfig?.time, user?.settings?.reminderConfig?.days]);

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
        viewMode,
        setViewMode,
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
        selectedQuizForChallenge,
        setSelectedQuizForChallenge,
        currentRoom,
        setCurrentRoom,
        currentGameSession,
        startGame,
        exitGame,
        lastResult,
        finishGame,
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
