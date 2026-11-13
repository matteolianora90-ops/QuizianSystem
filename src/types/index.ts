export type QuestionType =
  | 'multiple_choice'
  | 'identification'
  | 'scrambled_word';

export type DifficultyLevel = 'Easy' | 'Medium' | 'Hard';

export interface Question {
  id: string;
  type: QuestionType;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  scrambledClue?: string;
  userAnswer?: string;
}

export type StudyMaterialSourceType = 'notes' | 'txt' | 'pdf' | 'docx' | 'image';

export interface StudyMaterial {
  id: string;
  quizId?: string;
  title: string;
  sourceType: StudyMaterialSourceType;
  fileName?: string;
  fileSize?: string;
  mimeType?: string;
  textContent?: string;
  fileDataUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Quiz {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: DifficultyLevel;
  questions: Question[];
  createdAt: string;
  updatedAt: string;
  timesPlayed: number;
  tags?: string[];
  studyMaterialId?: string;
  studyMaterialSummary?: string;
}

export interface StudyReminderConfig {
  enabled: boolean;
  time: string; // e.g. "19:30" (24h)
  days: string[]; // ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
  goal: string;
  browserNotifications: boolean;
  soundEnabled: boolean;
  lastTriggeredDate?: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  type: 'study_reminder' | 'challenge_alert' | 'streak_milestone';
  quizId?: string;
  roomCode?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar: string;
  school?: string;
  bio?: string;
  role: 'student' | 'educator';
  totalPoints: number;
  settings: {
    notifications: boolean;
    challengeAlerts: boolean;
    studyReminders: boolean;
    soundEffects: boolean;
    theme: 'cream' | 'light' | 'dark';
    reminderConfig: StudyReminderConfig;
  };
}

export interface ParticipantScore {
  id: string;
  uid?: string;
  name: string;
  avatar: string;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  accuracy: number;
  completed: boolean;
  isHost?: boolean;
  isBot?: boolean;
}

export interface ActivityRecord {
  id: string;
  quizId: string;
  quizTitle: string;
  date: string;
  timestamp: number;
  score: number;
  maxScore: number;
  correctCount: number;
  totalQuestions: number;
  accuracy: number;
  type: 'challenge' | 'solo';
  opponentCount?: number;
  rank?: number;
  leaderboard?: ParticipantScore[];
  questionsSnapshot?: Question[];
  userAnswers?: Record<string, string>;
}

export interface ChallengeRoomState {
  code: string;
  title: string;
  quizId: string;
  questions: Question[];
  maxPlayers: number;
  timeLimitMinutes: number;
  mode: 'Normal' | 'Hard';
  status: 'waiting' | 'active' | 'completed';
  hostId: string;
  hostName?: string;
  hostAvatar?: string;
  participantIds?: string[];
  createdAt: number;
  participants: ParticipantScore[];
}

export interface ChallengeInvitation {
  id: string;
  roomCode: string;
  quizTitle: string;
  senderUid: string;
  senderName: string;
  recipientEmail: string;
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  createdAt: number;
  updatedAt: number;
}
