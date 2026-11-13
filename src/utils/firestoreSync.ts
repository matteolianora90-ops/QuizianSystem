import { User as FirebaseUser } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  Unsubscribe,
  updateDoc,
  where,
  arrayUnion,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import {
  ActivityRecord,
  ChallengeInvitation,
  ChallengeRoomState,
  ParticipantScore,
  Question,
  Quiz,
  StudyMaterial,
  StudyReminderConfig,
  UserProfile,
} from '../types';

function clampStr(value: string | undefined | null, maxLen: number, fallback = ''): string {
  const s = typeof value === 'string' ? value.trim() : '';
  if (!s) return fallback.slice(0, maxLen);
  return s.slice(0, maxLen);
}

function clampNum(value: unknown, min: number, max: number, fallback = 0): number {
  const n = typeof value === 'number' && Number.isFinite(value) ? value : fallback;
  return Math.min(Math.max(n, min), max);
}

function stripUndefined<T>(obj: T): T {
  if (Array.isArray(obj)) {
    return obj.map((item) => stripUndefined(item)) as unknown as T;
  }
  if (obj && typeof obj === 'object' && !(obj instanceof Timestamp)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      if (v !== undefined) {
        out[k] = stripUndefined(v);
      }
    }
    return out as T;
  }
  return obj;
}

function buildSafeReminderConfig(cfg?: Partial<StudyReminderConfig>): StudyReminderConfig {
  const cleaned: StudyReminderConfig = {
    enabled: cfg?.enabled ?? true,
    time: clampStr(cfg?.time, 10, '19:30'),
    days:
      Array.isArray(cfg?.days) && cfg.days.length > 0
        ? cfg.days.slice(0, 7).map(String)
        : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    goal: clampStr(cfg?.goal, 180, 'Daily Quiz Review & Active Recall'),
    browserNotifications: Boolean(cfg?.browserNotifications ?? false),
    soundEnabled: Boolean(cfg?.soundEnabled ?? true),
  };
  if (cfg?.lastTriggeredDate) {
    cleaned.lastTriggeredDate = clampStr(cfg.lastTriggeredDate, 20);
  }
  return cleaned;
}

function buildSafeSettings(settings?: Partial<UserProfile['settings']>): UserProfile['settings'] {
  const theme =
    settings?.theme === 'light' || settings?.theme === 'dark' || settings?.theme === 'cream'
      ? settings.theme
      : 'cream';
  return {
    notifications: Boolean(settings?.notifications ?? true),
    challengeAlerts: Boolean(settings?.challengeAlerts ?? true),
    studyReminders: Boolean(settings?.studyReminders ?? true),
    soundEffects: Boolean(settings?.soundEffects ?? true),
    theme,
    reminderConfig: buildSafeReminderConfig(settings?.reminderConfig),
  };
}

function sanitizeQuestionsForFirestore(questions: Question[]): Record<string, unknown>[] {
  const list = (Array.isArray(questions) ? questions : []).slice(0, 35);
  return list.map((q, idx) => {
    const rawType = q.type as string;
    const safeType =
      rawType === 'multiple_choice' || rawType === 'identification' || rawType === 'scrambled_word'
        ? rawType
        : 'identification';
    const item: Record<string, unknown> = {
      id: clampStr(q.id, 128, `q-${Date.now()}-${idx}`),
      type: safeType,
      question: clampStr(q.question, 1000, `Question ${idx + 1}`),
      options:
        safeType === 'multiple_choice'
          ? (Array.isArray(q.options) ? q.options : []).slice(0, 4).map((o) => String(o).slice(0, 300))
          : [],
      correctAnswer: clampStr(q.correctAnswer, 400, 'Answer'),
      explanation: clampStr(q.explanation, 800, 'Grounded in study material.'),
    };
    if (safeType === 'scrambled_word' && q.scrambledClue) {
      item.scrambledClue = clampStr(q.scrambledClue, 400);
    }
    return item;
  });
}

function toMillis(ts: unknown, fallback = Date.now()): number {
  if (ts instanceof Timestamp) return ts.toMillis();
  if (typeof ts === 'number' && Number.isFinite(ts)) return ts;
  if (ts && typeof ts === 'object' && 'toMillis' in ts && typeof (ts as any).toMillis === 'function') {
    return (ts as any).toMillis();
  }
  return fallback;
}

// ---------------------------------------------------------------------------
// 1. User Profile Operations
// ---------------------------------------------------------------------------

export async function fetchOrCreateUserProfileInFirestore(
  firebaseUser: FirebaseUser,
  seedName?: string
): Promise<UserProfile> {
  const uid = firebaseUser.uid;
  const path = `users/${uid}`;
  const ref = doc(db, 'users', uid);

  try {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data();
      if ('coins' in data) {
        await updateDoc(ref, { coins: deleteField(), updatedAt: serverTimestamp() }).catch(() => {});
      }
      return {
        id: uid,
        name: clampStr(data.name, 120, seedName || firebaseUser.displayName || 'Student'),
        email: clampStr(data.email, 160, firebaseUser.email || ''),
        avatar: clampStr(data.avatar, 8, 'S'),
        school: typeof data.school === 'string' ? data.school : '',
        bio: typeof data.bio === 'string' ? data.bio : '',
        role: data.role === 'educator' ? 'educator' : 'student',
        totalPoints: clampNum(data.totalPoints, 0, 10000000, 0),
        settings: buildSafeSettings(data.settings),
      };
    }

    const fallbackName =
      seedName?.trim() ||
      firebaseUser.displayName?.trim() ||
      firebaseUser.email?.split('@')[0]?.replace(/[._-]/g, ' ') ||
      'Student';
    const cleanName = clampStr(fallbackName, 120, 'Student');
    const cleanEmail = clampStr((firebaseUser.email || '').toLowerCase(), 160, 'student@quizian.app');
    const cleanAvatar = clampStr(cleanName.charAt(0).toUpperCase(), 8, 'S');

    const profileObj: UserProfile = {
      id: uid,
      name: cleanName,
      email: cleanEmail,
      avatar: cleanAvatar,
      school: 'University Student',
      bio: 'Studying smart on Quizian',
      role: 'student',
      totalPoints: 0,
      settings: buildSafeSettings(),
    };

    const payload = stripUndefined({
      ...profileObj,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await setDoc(ref, payload);
    return profileObj;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateUserProfileInFirestore(
  uid: string,
  updates: Partial<UserProfile>
): Promise<void> {
  const path = `users/${uid}`;
  const ref = doc(db, 'users', uid);

  const safeUpdates: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };

  if (typeof updates.name === 'string' && updates.name.trim()) {
    safeUpdates.name = clampStr(updates.name, 120, 'Student');
  }
  if (typeof updates.email === 'string' && updates.email.trim().length >= 3) {
    safeUpdates.email = clampStr(updates.email.toLowerCase(), 160);
  }
  if (typeof updates.avatar === 'string' && updates.avatar.trim()) {
    safeUpdates.avatar = clampStr(updates.avatar, 8, 'S');
  }
  if (typeof updates.school === 'string') {
    safeUpdates.school = clampStr(updates.school, 160);
  }
  if (typeof updates.bio === 'string') {
    safeUpdates.bio = clampStr(updates.bio, 300);
  }
  if (updates.settings) {
    safeUpdates.settings = buildSafeSettings(updates.settings);
  }

  try {
    await updateDoc(ref, stripUndefined(safeUpdates));
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function incrementUserRewardsInFirestore(
  uid: string,
  deltaPoints: number
): Promise<void> {
  if (deltaPoints <= 0) return;
  const path = `users/${uid}`;
  const ref = doc(db, 'users', uid);

  try {
    await updateDoc(ref, {
      totalPoints: increment(clampNum(deltaPoints, 0, 200, 0)),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// ---------------------------------------------------------------------------
// 2. Quizzes Operations
// ---------------------------------------------------------------------------

function mapDocToQuiz(id: string, data: Record<string, any>): Quiz {
  const today = new Date().toISOString().split('T')[0];
  const rawQuestions = Array.isArray(data.questions) ? data.questions : [];
  const questions: Question[] = rawQuestions.map((q: any, idx: number) => {
    const rawType = String(q?.type || '');
    const type: Question['type'] =
      rawType === 'multiple_choice' || rawType === 'scrambled_word'
        ? rawType
        : 'identification';
    return {
      id: String(q?.id || `q-${id}-${idx}`),
      type,
      question: String(q?.question || ''),
      options: type === 'multiple_choice' && Array.isArray(q?.options) ? q.options.map(String) : [],
      correctAnswer: String(q?.correctAnswer || ''),
      explanation: String(q?.explanation || ''),
      ...(type === 'scrambled_word' && q?.scrambledClue
        ? { scrambledClue: String(q.scrambledClue) }
        : {}),
    };
  });

  return {
    id,
    title: String(data.title || 'Untitled Quiz'),
    description: String(data.description || ''),
    category: String(data.category || 'Study Review'),
    difficulty:
      data.difficulty === 'Easy' || data.difficulty === 'Hard' ? data.difficulty : 'Medium',
    questions,
    createdAt: typeof data.createdDate === 'string' ? data.createdDate : today,
    updatedAt: typeof data.updatedDate === 'string' ? data.updatedDate : today,
    timesPlayed: clampNum(data.timesPlayed, 0, 1000000, 0),
    ...(typeof data.studyMaterialId === 'string' ? { studyMaterialId: data.studyMaterialId } : {}),
    ...(typeof data.studyMaterialSummary === 'string'
      ? { studyMaterialSummary: data.studyMaterialSummary }
      : {}),
  };
}

export function subscribeQuizzesFromFirestore(
  uid: string,
  onData: (quizzes: Quiz[]) => void
): Unsubscribe {
  const path = `users/${uid}/quizzes`;
  const colRef = collection(db, 'users', uid, 'quizzes');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list = snapshot.docs
        .map((d) => mapDocToQuiz(d.id, d.data()))
        .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function fetchQuizzesOnceFromFirestore(uid: string): Promise<Quiz[]> {
  const path = `users/${uid}/quizzes`;
  try {
    const snap = await getDocs(collection(db, 'users', uid, 'quizzes'));
    return snap.docs.map((d) => mapDocToQuiz(d.id, d.data()));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveQuizToFirestore(uid: string, quiz: Quiz): Promise<void> {
  const quizId = clampStr(quiz.id, 128, `quiz-${Date.now()}`);
  const path = `users/${uid}/quizzes/${quizId}`;
  const ref = doc(db, 'users', uid, 'quizzes', quizId);
  const today = new Date().toISOString().split('T')[0];

  const safeQuestions = sanitizeQuestionsForFirestore(quiz.questions);
  if (safeQuestions.length === 0) return;

  try {
    const existingSnap = await getDoc(ref);
    if (existingSnap.exists()) {
      const updatePayload: Record<string, unknown> = {
        title: clampStr(quiz.title, 200, 'Study Quiz'),
        description: clampStr(quiz.description, 600),
        category: clampStr(quiz.category, 80, 'Study Review'),
        difficulty:
          quiz.difficulty === 'Easy' || quiz.difficulty === 'Hard' ? quiz.difficulty : 'Medium',
        questions: safeQuestions,
        updatedDate: clampStr(quiz.updatedAt, 32, today),
        updatedAt: serverTimestamp(),
      };
      if (quiz.studyMaterialId) {
        updatePayload.studyMaterialId = clampStr(quiz.studyMaterialId, 128);
      }
      if (quiz.studyMaterialSummary) {
        updatePayload.studyMaterialSummary = clampStr(quiz.studyMaterialSummary, 500);
      }
      await updateDoc(ref, stripUndefined(updatePayload));
    } else {
      const createPayload: Record<string, unknown> = {
        id: quizId,
        ownerId: uid,
        title: clampStr(quiz.title, 200, 'Study Quiz'),
        description: clampStr(quiz.description, 600),
        category: clampStr(quiz.category, 80, 'Study Review'),
        difficulty:
          quiz.difficulty === 'Easy' || quiz.difficulty === 'Hard' ? quiz.difficulty : 'Medium',
        questions: safeQuestions,
        timesPlayed: clampNum(quiz.timesPlayed, 0, 1000000, 0),
        createdDate: clampStr(quiz.createdAt, 32, today),
        updatedDate: clampStr(quiz.updatedAt, 32, today),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (quiz.studyMaterialId) {
        createPayload.studyMaterialId = clampStr(quiz.studyMaterialId, 128);
      }
      if (quiz.studyMaterialSummary) {
        createPayload.studyMaterialSummary = clampStr(quiz.studyMaterialSummary, 500);
      }
      await setDoc(ref, stripUndefined(createPayload));
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function incrementQuizTimesPlayedInFirestore(
  uid: string,
  quizId: string
): Promise<void> {
  const path = `users/${uid}/quizzes/${quizId}`;
  const ref = doc(db, 'users', uid, 'quizzes', quizId);
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    await updateDoc(ref, {
      timesPlayed: increment(1),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteQuizFromFirestore(uid: string, quizId: string): Promise<void> {
  const path = `users/${uid}/quizzes/${quizId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'quizzes', quizId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ---------------------------------------------------------------------------
// 3. Study Materials Operations (text + metadata; blobs stay in IndexedDB)
// ---------------------------------------------------------------------------

function mapDocToStudyMaterial(id: string, data: Record<string, any>): StudyMaterial {
  const today = new Date().toISOString().split('T')[0];
  const validSources = ['notes', 'txt', 'pdf', 'docx', 'image'] as const;
  const sourceType = validSources.includes(data.sourceType) ? data.sourceType : 'notes';

  return {
    id,
    ...(typeof data.quizId === 'string' ? { quizId: data.quizId } : {}),
    title: String(data.title || 'Study Material'),
    sourceType,
    ...(typeof data.fileName === 'string' ? { fileName: data.fileName } : {}),
    ...(typeof data.fileSize === 'string' ? { fileSize: data.fileSize } : {}),
    ...(typeof data.mimeType === 'string' ? { mimeType: data.mimeType } : {}),
    ...(typeof data.textContent === 'string' ? { textContent: data.textContent } : {}),
    createdAt: typeof data.createdDate === 'string' ? data.createdDate : today,
    updatedAt: typeof data.updatedDate === 'string' ? data.updatedDate : today,
  };
}

export function subscribeStudyMaterialsFromFirestore(
  uid: string,
  onData: (materials: StudyMaterial[]) => void
): Unsubscribe {
  const path = `users/${uid}/studyMaterials`;
  const colRef = collection(db, 'users', uid, 'studyMaterials');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list = snapshot.docs
        .map((d) => mapDocToStudyMaterial(d.id, d.data()))
        .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function saveStudyMaterialToFirestore(
  uid: string,
  material: StudyMaterial
): Promise<void> {
  const materialId = clampStr(material.id, 128, `mat-${Date.now()}`);
  const path = `users/${uid}/studyMaterials/${materialId}`;
  const ref = doc(db, 'users', uid, 'studyMaterials', materialId);
  const today = new Date().toISOString().split('T')[0];

  try {
    const existingSnap = await getDoc(ref);
    if (existingSnap.exists()) {
      const updatePayload: Record<string, unknown> = {
        title: clampStr(material.title, 200, 'Study Notes'),
        sourceType: material.sourceType,
        updatedDate: clampStr(material.updatedAt, 32, today),
        updatedAt: serverTimestamp(),
      };
      if (material.quizId) updatePayload.quizId = clampStr(material.quizId, 128);
      if (material.fileName) updatePayload.fileName = clampStr(material.fileName, 200);
      if (material.fileSize) updatePayload.fileSize = clampStr(material.fileSize, 40);
      if (material.mimeType) updatePayload.mimeType = clampStr(material.mimeType, 100);
      if (material.textContent) updatePayload.textContent = clampStr(material.textContent, 120000);
      await updateDoc(ref, stripUndefined(updatePayload));
    } else {
      const createPayload: Record<string, unknown> = {
        id: materialId,
        ownerId: uid,
        title: clampStr(material.title, 200, 'Study Notes'),
        sourceType: material.sourceType,
        createdDate: clampStr(material.createdAt, 32, today),
        updatedDate: clampStr(material.updatedAt, 32, today),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (material.quizId) createPayload.quizId = clampStr(material.quizId, 128);
      if (material.fileName) createPayload.fileName = clampStr(material.fileName, 200);
      if (material.fileSize) createPayload.fileSize = clampStr(material.fileSize, 40);
      if (material.mimeType) createPayload.mimeType = clampStr(material.mimeType, 100);
      if (material.textContent) createPayload.textContent = clampStr(material.textContent, 120000);
      await setDoc(ref, stripUndefined(createPayload));
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteStudyMaterialFromFirestore(
  uid: string,
  materialId: string
): Promise<void> {
  const path = `users/${uid}/studyMaterials/${materialId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'studyMaterials', materialId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ---------------------------------------------------------------------------
// 4. Activity History Operations
// ---------------------------------------------------------------------------

function mapDocToActivity(id: string, data: Record<string, any>): ActivityRecord {
  return {
    id,
    quizId: String(data.quizId || ''),
    quizTitle: String(data.quizTitle || 'Study Quiz'),
    date: String(data.date || ''),
    timestamp: clampNum(data.timestamp, 0, Number.MAX_SAFE_INTEGER, Date.now()),
    score: clampNum(data.score, 0, 10000, 0),
    maxScore: clampNum(data.maxScore, 0, 10000, 0),
    correctCount: clampNum(data.correctCount, 0, 200, 0),
    totalQuestions: clampNum(data.totalQuestions, 1, 200, 1),
    accuracy: clampNum(data.accuracy, 0, 100, 0),
    type: data.type === 'challenge' ? 'challenge' : 'solo',
    ...(typeof data.opponentCount === 'number' ? { opponentCount: data.opponentCount } : {}),
    ...(typeof data.rank === 'number' ? { rank: data.rank } : {}),
    ...(Array.isArray(data.leaderboard) ? { leaderboard: data.leaderboard } : {}),
  };
}

export function subscribeActivitiesFromFirestore(
  uid: string,
  onData: (activities: ActivityRecord[]) => void
): Unsubscribe {
  const path = `users/${uid}/activities`;
  const colRef = collection(db, 'users', uid, 'activities');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list = snapshot.docs
        .map((d) => mapDocToActivity(d.id, d.data()))
        .sort((a, b) => b.timestamp - a.timestamp);
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function saveActivityToFirestore(
  uid: string,
  activity: ActivityRecord
): Promise<void> {
  const actId = clampStr(activity.id, 128, `act-${Date.now()}`);
  const path = `users/${uid}/activities/${actId}`;
  const ref = doc(db, 'users', uid, 'activities', actId);

  const cleanLeaderboard = Array.isArray(activity.leaderboard)
    ? activity.leaderboard.slice(0, 10).map((p) =>
        stripUndefined({
          id: clampStr(p.id, 128, 'p'),
          name: clampStr(p.name, 120, 'Player'),
          avatar: clampStr(p.avatar, 8, 'P'),
          score: clampNum(p.score, 0, 10000, 0),
          correctAnswers: clampNum(p.correctAnswers, 0, 200, 0),
          totalQuestions: clampNum(p.totalQuestions, 1, 200, 1),
          accuracy: clampNum(p.accuracy, 0, 100, 0),
          completed: Boolean(p.completed),
          isHost: Boolean(p.isHost),
          isBot: Boolean(p.isBot),
        })
      )
    : undefined;

  const payload: Record<string, unknown> = {
    id: actId,
    ownerId: uid,
    quizId: clampStr(activity.quizId, 128, 'quiz'),
    quizTitle: clampStr(activity.quizTitle, 200, 'Quiz'),
    date: clampStr(activity.date, 80, new Date().toLocaleDateString()),
    timestamp: clampNum(activity.timestamp, 0, Number.MAX_SAFE_INTEGER, Date.now()),
    score: clampNum(activity.score, 0, 10000, 0),
    maxScore: clampNum(activity.maxScore, 0, 10000, 0),
    correctCount: clampNum(activity.correctCount, 0, 200, 0),
    totalQuestions: clampNum(activity.totalQuestions, 1, 200, 1),
    accuracy: clampNum(activity.accuracy, 0, 100, 0),
    type: activity.type === 'challenge' ? 'challenge' : 'solo',
    createdAt: serverTimestamp(),
  };

  if (typeof activity.opponentCount === 'number') {
    payload.opponentCount = clampNum(activity.opponentCount, 0, 10, 0);
  }
  if (typeof activity.rank === 'number') {
    payload.rank = clampNum(activity.rank, 1, 10, 1);
  }
  if (cleanLeaderboard && cleanLeaderboard.length > 0) {
    payload.leaderboard = cleanLeaderboard;
  }

  try {
    await setDoc(ref, stripUndefined(payload));
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function clearActivitiesInFirestore(uid: string): Promise<void> {
  const path = `users/${uid}/activities`;
  try {
    const snap = await getDocs(collection(db, 'users', uid, 'activities'));
    await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ---------------------------------------------------------------------------
// 5. Challenge Rooms & Real-Time Participants
// ---------------------------------------------------------------------------

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function mapParticipantDoc(data: Record<string, any>): ParticipantScore {
  return {
    id: String(data.id || ''),
    uid: typeof data.uid === 'string' ? data.uid : undefined,
    name: String(data.name || 'Player'),
    avatar: String(data.avatar || 'P'),
    isHost: Boolean(data.isHost),
    isBot: Boolean(data.isBot),
    score: clampNum(data.score, 0, 10000, 0),
    correctAnswers: clampNum(data.correctAnswers, 0, 200, 0),
    totalQuestions: clampNum(data.totalQuestions, 1, 200, 1),
    accuracy: clampNum(data.accuracy, 0, 100, 0),
    completed: Boolean(data.completed),
  };
}

function mapRoomDoc(
  data: Record<string, any>,
  participants: ParticipantScore[]
): ChallengeRoomState {
  const sortedParticipants = [...participants].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return (a.isHost ? -1 : 0) - (b.isHost ? -1 : 0);
  });

  return {
    code: String(data.code || ''),
    title: String(data.title || 'Challenge Room'),
    quizId: String(data.quizId || 'quiz-1'),
    questions: (Array.isArray(data.questions) ? data.questions : []).map((q: any, idx: number) => ({
      id: String(q?.id || `q-${idx}`),
      type:
        q?.type === 'multiple_choice' || q?.type === 'scrambled_word'
          ? q.type
          : 'identification',
      question: String(q?.question || ''),
      options: Array.isArray(q?.options) ? q.options.map(String) : [],
      correctAnswer: String(q?.correctAnswer || ''),
      explanation: String(q?.explanation || ''),
      ...(q?.scrambledClue ? { scrambledClue: String(q.scrambledClue) } : {}),
    })),
    maxPlayers: clampNum(data.maxPlayers, 2, 6, 4),
    timeLimitMinutes: clampNum(data.timeLimitMinutes, 1, 60, 10),
    mode: data.mode === 'Hard' ? 'Hard' : 'Normal',
    status:
      data.status === 'active' || data.status === 'completed' ? data.status : 'waiting',
    hostId: String(data.hostId || ''),
    hostName: typeof data.hostName === 'string' ? data.hostName : undefined,
    hostAvatar: typeof data.hostAvatar === 'string' ? data.hostAvatar : undefined,
    participantIds: Array.isArray(data.participantIds) ? data.participantIds.map(String) : [],
    createdAt: toMillis(data.createdAt),
    participants: sortedParticipants,
  };
}

export async function createChallengeRoomInFirestore(params: {
  quiz: Quiz;
  maxPlayers: number;
  timeLimitMinutes: number;
  mode: 'Normal' | 'Hard';
  hostProfile: UserProfile;
  preferredCode?: string;
}): Promise<ChallengeRoomState> {
  const currentUid = auth.currentUser?.uid;
  if (!currentUid) {
    throw new Error('Firebase authentication required to create cloud challenge room.');
  }

  const code = clampStr((params.preferredCode || generateRoomCode()).toUpperCase(), 16);
  const roomPath = `challengeRooms/${code}`;
  const roomRef = doc(db, 'challengeRooms', code);
  const safeQuestions = sanitizeQuestionsForFirestore(params.quiz.questions);
  if (safeQuestions.length === 0) {
    throw new Error('Cannot create challenge room with an empty quiz.');
  }

  const hostName = clampStr(params.hostProfile.name, 120, 'Host');
  const hostAvatar = clampStr(params.hostProfile.avatar || hostName.charAt(0).toUpperCase(), 8, 'H');

  try {
    await setDoc(roomRef, {
      code,
      title: clampStr(`${params.quiz.title} Challenge`, 200, 'Study Challenge'),
      quizId: clampStr(params.quiz.id, 128, 'quiz-1'),
      questions: safeQuestions,
      maxPlayers: clampNum(params.maxPlayers, 2, 6, 4),
      timeLimitMinutes: clampNum(params.timeLimitMinutes, 1, 60, 10),
      mode: params.mode === 'Hard' ? 'Hard' : 'Normal',
      status: 'waiting',
      hostId: currentUid,
      hostName,
      hostAvatar,
      participantIds: [currentUid],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Create host participant doc strictly AFTER room doc exists so rules exists() passes
    const hostParticipantPath = `challengeRooms/${code}/participants/${currentUid}`;
    const hostParticipantRef = doc(db, 'challengeRooms', code, 'participants', currentUid);
    try {
      await setDoc(hostParticipantRef, {
        id: currentUid,
        roomCode: code,
        uid: currentUid,
        name: hostName,
        avatar: hostAvatar,
        isHost: true,
        isBot: false,
        score: 0,
        correctAnswers: 0,
        totalQuestions: safeQuestions.length,
        accuracy: 0,
        completed: false,
        joinedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, hostParticipantPath);
    }

    const hostParticipant: ParticipantScore = {
      id: currentUid,
      uid: currentUid,
      name: hostName,
      avatar: hostAvatar,
      isHost: true,
      isBot: false,
      score: 0,
      correctAnswers: 0,
      totalQuestions: safeQuestions.length,
      accuracy: 0,
      completed: false,
    };

    return mapRoomDoc(
      {
        code,
        title: `${params.quiz.title} Challenge`,
        quizId: params.quiz.id,
        questions: safeQuestions,
        maxPlayers: params.maxPlayers,
        timeLimitMinutes: params.timeLimitMinutes,
        mode: params.mode,
        status: 'waiting',
        hostId: currentUid,
        hostName,
        hostAvatar,
        participantIds: [currentUid],
        createdAt: Date.now(),
      },
      [hostParticipant]
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, roomPath);
  }
}

export async function getChallengeRoomFromFirestore(
  codeInput: string
): Promise<ChallengeRoomState | null> {
  const code = codeInput.trim().toUpperCase();
  if (!code) return null;
  const roomPath = `challengeRooms/${code}`;
  try {
    const roomSnap = await getDoc(doc(db, 'challengeRooms', code));
    if (!roomSnap.exists()) return null;
    const partSnap = await getDocs(collection(db, 'challengeRooms', code, 'participants'));
    const participants = partSnap.docs.map((d) => mapParticipantDoc(d.data()));
    return mapRoomDoc(roomSnap.data(), participants);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, roomPath);
  }
}

export async function joinChallengeRoomInFirestore(
  codeInput: string,
  playerProfile: UserProfile
): Promise<ChallengeRoomState> {
  const currentUid = auth.currentUser?.uid;
  if (!currentUid) {
    throw new Error('Firebase authentication required to join cloud challenge room.');
  }

  const code = codeInput.trim().toUpperCase();
  const roomPath = `challengeRooms/${code}`;
  const roomRef = doc(db, 'challengeRooms', code);

  try {
    const roomSnap = await getDoc(roomRef);
    if (!roomSnap.exists()) {
      throw new Error('Challenge room not found. Check the 6-character code.');
    }

    const roomData = roomSnap.data();
    const existingIds: string[] = Array.isArray(roomData.participantIds)
      ? roomData.participantIds.map(String)
      : [];

    if (roomData.status !== 'waiting' && !existingIds.includes(currentUid)) {
      throw new Error('This challenge has already started.');
    }

    if (!existingIds.includes(currentUid)) {
      if (existingIds.length >= (roomData.maxPlayers || 6)) {
        throw new Error('This challenge room is already full.');
      }
      await updateDoc(roomRef, {
        participantIds: arrayUnion(currentUid),
        updatedAt: serverTimestamp(),
      });
    }

    const partRef = doc(db, 'challengeRooms', code, 'participants', currentUid);
    const partSnap = await getDoc(partRef);
    if (!partSnap.exists() && roomData.status === 'waiting') {
      const pName = clampStr(playerProfile.name, 120, 'Student');
      const pAvatar = clampStr(playerProfile.avatar || pName.charAt(0).toUpperCase(), 8, 'S');
      await setDoc(partRef, {
        id: currentUid,
        roomCode: code,
        uid: currentUid,
        name: pName,
        avatar: pAvatar,
        isHost: roomData.hostId === currentUid,
        isBot: false,
        score: 0,
        correctAnswers: 0,
        totalQuestions: Array.isArray(roomData.questions) ? roomData.questions.length : 1,
        accuracy: 0,
        completed: false,
        joinedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    const allPartsSnap = await getDocs(collection(db, 'challengeRooms', code, 'participants'));
    const updatedRoomSnap = await getDoc(roomRef);
    const participants = allPartsSnap.docs.map((d) => mapParticipantDoc(d.data()));
    return mapRoomDoc(updatedRoomSnap.data() || roomData, participants);
  } catch (error) {
    if (error instanceof Error && (error.message.includes('room') || error.message.includes('started') || error.message.includes('full'))) {
      throw error;
    }
    handleFirestoreError(error, OperationType.WRITE, roomPath);
  }
}

export async function addBotParticipantToFirestore(
  codeInput: string,
  botName: string,
  botAvatar: string,
  totalQuestions: number
): Promise<ParticipantScore> {
  const currentUid = auth.currentUser?.uid;
  if (!currentUid) {
    throw new Error('Firebase authentication required.');
  }

  const code = codeInput.trim().toUpperCase();
  const botId = `bot-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const path = `challengeRooms/${code}/participants/${botId}`;

  try {
    await setDoc(doc(db, 'challengeRooms', code, 'participants', botId), {
      id: botId,
      roomCode: code,
      uid: currentUid,
      name: clampStr(botName, 120, 'Classmate Bot'),
      avatar: clampStr(botAvatar, 8, 'B'),
      isHost: false,
      isBot: true,
      score: 0,
      correctAnswers: 0,
      totalQuestions: clampNum(totalQuestions, 1, 200, 1),
      accuracy: 0,
      completed: false,
      joinedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return {
      id: botId,
      uid: currentUid,
      name: botName,
      avatar: botAvatar,
      isHost: false,
      isBot: true,
      score: 0,
      correctAnswers: 0,
      totalQuestions,
      accuracy: 0,
      completed: false,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function startChallengeRoomInFirestore(codeInput: string): Promise<void> {
  const code = codeInput.trim().toUpperCase();
  const path = `challengeRooms/${code}`;
  try {
    await updateDoc(doc(db, 'challengeRooms', code), {
      status: 'active',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateChallengeParticipantScoreInFirestore(params: {
  code: string;
  participantId: string;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  completed: boolean;
}): Promise<void> {
  const code = params.code.trim().toUpperCase();
  const path = `challengeRooms/${code}/participants/${params.participantId}`;
  const accuracy =
    params.totalQuestions > 0
      ? Math.round((params.correctAnswers / params.totalQuestions) * 100)
      : 0;

  try {
    const ref = doc(db, 'challengeRooms', code, 'participants', params.participantId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    await updateDoc(ref, {
      score: clampNum(params.score, 0, 10000, 0),
      correctAnswers: clampNum(params.correctAnswers, 0, 200, 0),
      accuracy: clampNum(accuracy, 0, 100, 0),
      completed: Boolean(params.completed),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function completeChallengeRoomInFirestore(codeInput: string): Promise<void> {
  const code = codeInput.trim().toUpperCase();
  const path = `challengeRooms/${code}`;
  try {
    const ref = doc(db, 'challengeRooms', code);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    if (snap.data()?.status === 'active') {
      await updateDoc(ref, {
        status: 'completed',
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export function subscribeToChallengeRoom(
  codeInput: string,
  onRoomUpdate: (room: ChallengeRoomState | null) => void
): Unsubscribe {
  const code = codeInput.trim().toUpperCase();
  const roomPath = `challengeRooms/${code}`;
  const partsPath = `challengeRooms/${code}/participants`;

  let latestRoomData: Record<string, any> | null = null;
  let latestParticipants: ParticipantScore[] = [];

  const emit = () => {
    if (!latestRoomData) {
      onRoomUpdate(null);
      return;
    }
    onRoomUpdate(mapRoomDoc(latestRoomData, latestParticipants));
  };

  const unsubRoom = onSnapshot(
    doc(db, 'challengeRooms', code),
    (snap) => {
      latestRoomData = snap.exists() ? snap.data() : null;
      emit();
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, roomPath);
    }
  );

  const unsubParticipants = onSnapshot(
    query(collection(db, 'challengeRooms', code, 'participants'), where('roomCode', '==', code)),
    (snap) => {
      latestParticipants = snap.docs.map((d) => mapParticipantDoc(d.data()));
      emit();
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, partsPath);
    }
  );

  return () => {
    unsubRoom();
    unsubParticipants();
  };
}

// ---------------------------------------------------------------------------
// 6. Challenge Invitations
// ---------------------------------------------------------------------------

export async function sendChallengeInvitationInFirestore(params: {
  roomCode: string;
  quizTitle: string;
  senderName: string;
  recipientEmail: string;
}): Promise<ChallengeInvitation> {
  const currentUid = auth.currentUser?.uid;
  if (!currentUid) {
    throw new Error('Firebase authentication required to send invitations.');
  }

  const invitationId = `inv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const path = `challengeInvitations/${invitationId}`;
  const cleanRecipient = clampStr(params.recipientEmail.toLowerCase(), 160);
  const cleanRoomCode = clampStr(params.roomCode.toUpperCase(), 16);

  try {
    await setDoc(doc(db, 'challengeInvitations', invitationId), {
      id: invitationId,
      roomCode: cleanRoomCode,
      quizTitle: clampStr(params.quizTitle, 200, 'Quizian Challenge'),
      senderUid: currentUid,
      senderName: clampStr(params.senderName, 120, 'Classmate'),
      recipientEmail: cleanRecipient,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return {
      id: invitationId,
      roomCode: cleanRoomCode,
      quizTitle: params.quizTitle,
      senderUid: currentUid,
      senderName: params.senderName,
      recipientEmail: cleanRecipient,
      status: 'pending',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export function subscribeToIncomingInvitations(
  email: string,
  emailVerified: boolean,
  onData: (invitations: ChallengeInvitation[]) => void
): Unsubscribe {
  if (!emailVerified || !email.trim()) {
    onData([]);
    return () => {};
  }

  const cleanEmail = email.trim().toLowerCase();
  const path = 'challengeInvitations';
  const q = query(
    collection(db, 'challengeInvitations'),
    where('recipientEmail', '==', cleanEmail)
  );

  return onSnapshot(
    q,
    (snap) => {
      const list: ChallengeInvitation[] = snap.docs
        .map((d) => {
          const data = d.data();
          return {
            id: d.id,
            roomCode: String(data.roomCode || ''),
            quizTitle: String(data.quizTitle || 'Study Challenge'),
            senderUid: String(data.senderUid || ''),
            senderName: String(data.senderName || 'Classmate'),
            recipientEmail: String(data.recipientEmail || ''),
            status: (data.status || 'pending') as ChallengeInvitation['status'],
            createdAt: toMillis(data.createdAt),
            updatedAt: toMillis(data.updatedAt),
          };
        })
        .filter((inv) => inv.status === 'pending')
        .sort((a, b) => b.createdAt - a.createdAt);
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function respondToChallengeInvitationInFirestore(
  invitationId: string,
  status: 'accepted' | 'declined' | 'cancelled'
): Promise<void> {
  const path = `challengeInvitations/${invitationId}`;
  try {
    await updateDoc(doc(db, 'challengeInvitations', invitationId), {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}
