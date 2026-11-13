import express from 'express';
import { createServer as createHttpServer } from 'http';
import { createServer as createViteServer } from 'vite';
import { WebSocketServer, WebSocket } from 'ws';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Security headers (preserve iframe embed compatibility for preview)
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Initialize Gemini SDK if API key is present
const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

// Challenge room in-memory state (for instant same-server & WebSocket sync)
interface RoomParticipant {
  id: string;
  uid?: string;
  name: string;
  avatar: string;
  isHost: boolean;
  isBot?: boolean;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  accuracy: number;
  completed: boolean;
  joinedAt: number;
}

interface ChallengeRoom {
  code: string;
  title: string;
  quizId: string;
  questions: any[];
  maxPlayers: number;
  timeLimitMinutes: number;
  mode: 'Normal' | 'Hard';
  status: 'waiting' | 'active' | 'completed';
  hostId: string;
  createdAt: number;
  participants: RoomParticipant[];
}

const rooms: Record<string, ChallengeRoom> = {};
const roomSubscribers = new Map<string, Set<WebSocket>>();
const POINTS_PER_CORRECT = 5;
const ROOM_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
const VALID_ROOM_CODE_REGEX = /^[A-Z0-9_-]{4,16}$/;
const VALID_DIFFICULTIES = new Set(['Easy', 'Medium', 'Hard']);

setInterval(() => {
  const cutoff = Date.now() - ROOM_TTL_MS;
  for (const [code, room] of Object.entries(rooms)) {
    if (room.createdAt < cutoff) {
      delete rooms[code];
      roomSubscribers.delete(code);
    }
  }
}, 30 * 60 * 1000).unref();

function subscribeSocketToRoom(ws: WebSocket, code: string) {
  const cleanCode = code.trim().toUpperCase();
  if (!cleanCode) return;
  let subs = roomSubscribers.get(cleanCode);
  if (!subs) {
    subs = new Set<WebSocket>();
    roomSubscribers.set(cleanCode, subs);
  }
  subs.add(ws);
}

function unsubscribeSocketFromAllRooms(ws: WebSocket) {
  for (const [code, subs] of roomSubscribers.entries()) {
    subs.delete(ws);
    if (subs.size === 0) {
      roomSubscribers.delete(code);
    }
  }
}

function broadcastRoomUpdate(code: string, event = 'room_update') {
  const cleanCode = code.trim().toUpperCase();
  const room = rooms[cleanCode];
  if (!room) return;
  const subs = roomSubscribers.get(cleanCode);
  if (!subs || subs.size === 0) return;

  const payload = JSON.stringify({ type: event, room });
  for (const client of subs) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

// Health & AI status endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    aiAvailable: !!ai,
    roomsCount: Object.keys(rooms).length,
    supportedQuestionTypes: Array.from(ALLOWED_TYPES),
  });
});

// STRICTLY 3 supported question types
const ALLOWED_TYPES = new Set([
  'multiple_choice',
  'identification',
  'scrambled_word',
]);

// AI Quiz Generation Endpoint
app.post('/api/generate-quiz', async (req, res) => {
  try {
    const {
      materialText,
      imageBase64,
      imageMimeType,
      fileBase64,
      fileMimeType,
      questionTypes = ['multiple_choice'],
      questionCount = 5,
      difficulty = 'Medium',
      title = 'Study Quiz',
    } = req.body;

    const rawMaterialText = typeof materialText === 'string' ? materialText.trim() : '';
    const mediaData = fileBase64 || imageBase64;
    const mediaMime = fileMimeType || imageMimeType;

    if (!rawMaterialText && !mediaData) {
      return res.status(400).json({ error: 'Please provide study notes or upload a file.' });
    }

    if (mediaData) {
      const mimeStr = typeof mediaMime === 'string' ? mediaMime.trim().toLowerCase() : '';
      if (!mimeStr.startsWith('image/') && mimeStr !== 'application/pdf') {
        return res.status(400).json({ error: 'Unsupported file MIME type. Upload PDF or image files.' });
      }
    }

    const safeDifficulty = VALID_DIFFICULTIES.has(String(difficulty)) ? String(difficulty) : 'Medium';
    const count = Math.min(Math.max(parseInt(questionCount, 10) || 5, 2), 30);
    const filteredTypes: string[] = Array.isArray(questionTypes)
      ? questionTypes.filter((t): t is string => typeof t === 'string' && ALLOWED_TYPES.has(t))
      : [];
    const requestedTypes: string[] =
      filteredTypes.length > 0 ? filteredTypes : ['multiple_choice'];

    // If Gemini is available, generate real questions with gemini-4-hydrogen
    if (ai) {
      try {
        const typesStr = requestedTypes.join(', ');
        const systemInstruction = `You are Quizian's AI Educational Study Assistant.
Generate a high-quality educational quiz based STRICTLY on the user's provided study material (text, document, PDF, or image).
Difficulty level: ${difficulty} (Easy = direct recall & clear terms; Medium = comprehension & applied concepts; Hard = analytical, multi-concept, nuanced distinctions).
Exact number of questions required: ${count}.
Requested Question Types: ${typesStr}.

Supported Question Types & Exact Structure (ONLY use these 3 types):
1. 'multiple_choice':
   - options: array of 4 plausible choices (1 correct, 3 distinct distractors)
   - correctAnswer: exact string matching one of the 4 options
2. 'identification':
   - question: clear definition, function, or description asking the student to identify the term/concept
   - options: []
   - correctAnswer: the exact term/concept name
3. 'scrambled_word':
   - question: prompt containing the scrambled uppercase letters in brackets, e.g. [ S P C E R O S ]
   - scrambledClue: helpful hint grounded in the material
   - options: []
   - correctAnswer: the unscrambled uppercase term

CRITICAL RULES:
- Generate EXACTLY ${count} questions.
- Use ONLY the requested question types (${typesStr}) and distribute them evenly across all ${count} questions.
- NEVER output any other question type (such as fill_blank, true_false, matching, short_answer, or enumeration).
- Every single question MUST be grounded in the provided study material.
- NEVER generate duplicate or nearly identical questions, repeated answers, or rephrased copies.
- Every question needs a unique id, clear question text, correctAnswer, and a concise 1-2 sentence explanation.
- Return ONLY a valid JSON object matching the schema.`;

        let contents: any;
        if (mediaData && mediaMime) {
          const cleanBase64 = String(mediaData).replace(/^data:[^;]+;base64,/, '');
          contents = {
            parts: [
              {
                inlineData: {
                  mimeType: mediaMime,
                  data: cleanBase64,
                },
              },
              {
                text: `Create EXACTLY ${count} unique, non-duplicate quiz questions strictly from this uploaded study material. Difficulty: ${difficulty}. Allowed types: ${typesStr}. Additional extracted text/notes: ${materialText || 'None'}. Output valid JSON with exactly ${count} items in the questions array.`,
              },
            ],
          };
        } else {
          contents = `Study material:\n${materialText || 'General Knowledge Study Notes'}\n\nGenerate EXACTLY ${count} unique, non-duplicate quiz questions strictly based on the study material above. Difficulty: ${difficulty}. Allowed question types: ${typesStr}.`;
        }

        const response = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                quizTitle: { type: Type.STRING },
                questions: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      type: { type: Type.STRING },
                      question: { type: Type.STRING },
                      options: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                      },
                      correctAnswer: { type: Type.STRING },
                      explanation: { type: Type.STRING },
                      scrambledClue: { type: Type.STRING },
                    },
                    required: ['id', 'type', 'question', 'correctAnswer', 'explanation'],
                  },
                },
              },
              required: ['quizTitle', 'questions'],
            },
          },
        });

        const text = response.text;
        if (text) {
          const parsed = JSON.parse(text);
          const rawQuestions = Array.isArray(parsed.questions) ? parsed.questions : [];
          const normalized = normalizeAndEnsureCount(
            rawQuestions,
            rawMaterialText || 'General Study Material',
            count,
            requestedTypes,
            safeDifficulty
          );

          return res.json({
            success: true,
            source: 'gemini',
            quizTitle: parsed.quizTitle || title,
            questions: normalized,
          });
        }
      } catch (geminiError: any) {
        console.warn('Gemini API call warning, falling back to smart educational parser:', geminiError?.message);
      }
    }

    // Smart Fallback Parser if Gemini is absent or in case of temporary error
    const fallbackQuestions = generateSmartFallbackQuestions(
      rawMaterialText || 'General Knowledge Study Notes',
      count,
      requestedTypes,
      safeDifficulty
    );

    return res.json({
      success: true,
      source: ai ? 'gemini_fallback' : 'local_ai',
      quizTitle: title || 'Generated Study Quiz',
      questions: fallbackQuestions,
    });
  } catch (error: any) {
    console.error('Quiz generation error:', error);
    res.status(500).json({
      error: 'Failed to generate quiz',
      message: error?.message || 'Unknown error',
    });
  }
});

function normalizeQuestionItem(q: any, idx: number, allowedTypes: string[]): any {
  const safeType = ALLOWED_TYPES.has(q?.type)
    ? q.type
    : allowedTypes[idx % allowedTypes.length] || 'multiple_choice';
  const base: any = {
    id: q?.id ? `${q.id}-${idx}` : `q-${Date.now()}-${idx}`,
    type: safeType,
    question: String(q?.question || '').trim(),
    options: Array.isArray(q?.options) ? q.options.map(String).filter(Boolean) : [],
    correctAnswer: String(q?.correctAnswer || '').trim(),
    explanation: String(q?.explanation || '').trim() || 'Grounded in your uploaded study material.',
  };

  if (safeType === 'scrambled_word' && q?.scrambledClue) {
    base.scrambledClue = String(q.scrambledClue).trim();
  }

  if (safeType === 'multiple_choice') {
    const deduped: string[] = [];
    const seen = new Set<string>();
    for (const opt of base.options) {
      const trimmed = String(opt).trim();
      const key = trimmed.toLowerCase();
      if (trimmed && !seen.has(key)) {
        seen.add(key);
        deduped.push(trimmed);
      }
    }
    base.options = deduped.slice(0, 4);
    if (!base.correctAnswer && base.options.length > 0) {
      base.correctAnswer = base.options[0];
    }
    if (base.correctAnswer && !base.options.some((o: string) => o.toLowerCase() === base.correctAnswer.toLowerCase())) {
      if (base.options.length >= 4) {
        base.options[0] = base.correctAnswer;
      } else {
        base.options.unshift(base.correctAnswer);
      }
    }
    const fillers = ['Option A', 'Option B', 'Option C', 'Option D'];
    for (const filler of fillers) {
      if (base.options.length >= 4) break;
      if (!base.options.some((o: string) => o.toLowerCase() === filler.toLowerCase())) {
        base.options.push(filler);
      }
    }
  } else {
    base.options = [];
  }

  return base;
}

function normalizeAndEnsureCount(
  rawQuestions: any[],
  materialText: string,
  count: number,
  allowedTypes: string[],
  difficulty: string
) {
  const seenPrompts = new Set<string>();
  const result: any[] = [];

  for (let i = 0; i < rawQuestions.length && result.length < count; i++) {
    const normalized = normalizeQuestionItem(rawQuestions[i], i, allowedTypes);
    if (!normalized.question || !normalized.correctAnswer) continue;
    const key = normalized.question.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 90);
    if (seenPrompts.has(key)) continue;
    seenPrompts.add(key);
    result.push(normalized);
  }

  if (result.length < count) {
    const topUp = generateSmartFallbackQuestions(
      materialText,
      count + 10,
      allowedTypes,
      difficulty
    );
    for (const candidate of topUp) {
      if (result.length >= count) break;
      const key = candidate.question.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 90);
      if (!seenPrompts.has(key)) {
        seenPrompts.add(key);
        result.push({ ...candidate, id: `q-${Date.now()}-${result.length}` });
      }
    }
  }

  return result.slice(0, count);
}

// Helper for smart local educational question generation grounded in the material
function generateSmartFallbackQuestions(
  text: string,
  count: number,
  types: string[],
  _difficulty: string
) {
  const cleanText = text.trim();
  const segments = cleanText
    .replace(/\r\n/g, '\n')
    .split(/(?<=[.?!])\s+|\n+|;\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 18);

  const uniqueKeywords = Array.from(
    new Set(
      cleanText
        .split(/[^a-zA-Z0-9-]+/)
        .map((w) => w.trim())
        .filter((w) => w.length >= 5 && !/^\d+$/.test(w))
    )
  );

  const pickDistractors = (answer: string, offset: number): string[] => {
    const picked: string[] = [];
    for (let j = 0; j < uniqueKeywords.length && picked.length < 3; j++) {
      const candidate = uniqueKeywords[(offset + j) % uniqueKeywords.length];
      if (candidate.toLowerCase() !== answer.toLowerCase() && !picked.includes(candidate)) {
        picked.push(candidate);
      }
    }
    const defaults = ['Process', 'Framework', 'Architecture', 'Component', 'Principle'];
    for (const def of defaults) {
      if (picked.length >= 3) break;
      if (def.toLowerCase() !== answer.toLowerCase() && !picked.includes(def)) {
        picked.push(def);
      }
    }
    return [answer, ...picked.slice(0, 3)].sort((a, b) => a.localeCompare(b));
  };

  const questions: any[] = [];
  const usedQuestions = new Set<string>();
  const filteredFallbackTypes = Array.isArray(types)
    ? types.filter((t) => ALLOWED_TYPES.has(t))
    : [];
  const activeTypes = filteredFallbackTypes.length > 0 ? filteredFallbackTypes : ['multiple_choice'];

  const totalSegments = Math.max(segments.length, 1);

  for (let i = 0; i < count; i++) {
    const chosenType = activeTypes[i % activeTypes.length];
    const segIdx = i % totalSegments;
    const sentence = segments[segIdx] || cleanText || 'Core study concepts and terminology';
    const passNumber = Math.floor(i / totalSegments);

    const words = sentence
      .split(/\s+/)
      .map((w) => w.replace(/[^a-zA-Z0-9-]/g, ''))
      .filter((w) => w.length >= 4);

    const wordIdx = words.length > 0 ? (Math.floor(words.length / 2) + passNumber) % words.length : 0;
    const keyWord =
      words[wordIdx] ||
      uniqueKeywords[i % Math.max(uniqueKeywords.length, 1)] ||
      `Concept${i + 1}`;

    let item: any;

    if (chosenType === 'scrambled_word') {
      const upper = keyWord.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || 'CONCEPT';
      const chars = upper.split('');
      for (let c = chars.length - 1; c > 0; c--) {
        const swap = (c + i * 3 + 1) % (c + 1);
        const tmp = chars[c];
        chars[c] = chars[swap];
        chars[swap] = tmp;
      }
      if (chars.join('') === upper && chars.length > 1) {
        const idxSwap = chars.findIndex((ch) => ch !== chars[0]);
        if (idxSwap > 0) {
          const tmp = chars[0];
          chars[0] = chars[idxSwap];
          chars[idxSwap] = tmp;
        }
      }
      const scrambled = chars.join(' ');
      item = {
        id: `q-${Date.now()}-${i}`,
        type: 'scrambled_word',
        question: `Unscramble this key term from your material (${i + 1}): [ ${scrambled} ]`,
        options: [],
        correctAnswer: upper,
        explanation: `The term "${upper}" appears in: "${sentence}"`,
        scrambledClue: `Context: ${sentence.slice(0, 75)}${sentence.length > 75 ? '...' : ''}`,
      };
    } else if (chosenType === 'identification') {
      item = {
        id: `q-${Date.now()}-${i}`,
        type: 'identification',
        question: `Identify the term described in your study material (${i + 1}): "${sentence.replace(new RegExp(`\\b${keyWord}\\b`, 'gi'), 'this concept')}"`,
        options: [],
        correctAnswer: keyWord,
        explanation: `Refers to "${keyWord}" in: "${sentence}"`,
      };
    } else {
      const maskedPrompt = sentence.replace(new RegExp(`\\b${keyWord}\\b`, 'i'), '____');
      item = {
        id: `q-${Date.now()}-${i}`,
        type: 'multiple_choice',
        question: maskedPrompt.includes('____')
          ? `Which term completes this statement from your study material? (${i + 1})\n"${maskedPrompt}"`
          : `According to your study material, which key term matches: "${sentence}"? (${i + 1})`,
        options: pickDistractors(keyWord, i),
        correctAnswer: keyWord,
        explanation: `From study material: "${sentence}"`,
      };
    }

    const dedupeKey = item.question.toLowerCase();
    if (!usedQuestions.has(dedupeKey)) {
      usedQuestions.add(dedupeKey);
      questions.push(item);
    }
  }

  return questions;
}

function clampParticipantProgress(
  room: ChallengeRoom,
  participant: RoomParticipant,
  rawScore: unknown,
  rawCorrect: unknown,
  rawTotal: unknown,
  completed: boolean
) {
  const safeTotal =
    room.questions.length > 0
      ? room.questions.length
      : Math.min(Math.max(Math.trunc(Number(rawTotal)) || participant.totalQuestions || 1, 1), 200);
  const safeCorrect = Math.min(Math.max(Math.trunc(Number(rawCorrect)) || 0, 0), safeTotal);
  const maxPossibleScore = safeCorrect * POINTS_PER_CORRECT;
  const safeScore = Math.min(Math.max(Math.trunc(Number(rawScore)) || 0, 0), maxPossibleScore);

  participant.score = safeScore;
  participant.correctAnswers = safeCorrect;
  participant.totalQuestions = safeTotal;
  participant.accuracy = safeTotal > 0 ? Math.round((safeCorrect / safeTotal) * 100) : 0;
  participant.completed = Boolean(completed);
}

// Challenge Rooms Endpoints
app.post('/api/rooms', (req, res) => {
  const {
    code: preferredCode,
    title,
    quizId,
    questions,
    maxPlayers,
    timeLimitMinutes,
    mode,
    hostId: reqHostId,
    hostName,
    hostAvatar,
  } = req.body;

  if (!Array.isArray(questions) || questions.length === 0 || questions.length > 35) {
    return res.status(400).json({ error: 'Challenge room requires between 1 and 35 questions.' });
  }

  const sanitizedQuestions = questions.map((q: any, idx: number) =>
    normalizeQuestionItem(q, idx, ['multiple_choice', 'identification', 'scrambled_word'])
  );

  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  if (typeof preferredCode === 'string' && preferredCode.trim()) {
    const candidate = preferredCode.trim().toUpperCase();
    if (!VALID_ROOM_CODE_REGEX.test(candidate)) {
      return res.status(400).json({ error: 'Invalid room code format (4-16 alphanumeric characters).' });
    }
    if (rooms[candidate]) {
      return res.status(409).json({ error: 'A challenge room with this code already exists.' });
    }
    code = candidate;
  } else {
    for (let attempt = 0; attempt < 15; attempt++) {
      let generated = '';
      for (let i = 0; i < 6; i++) {
        generated += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      if (!rooms[generated]) {
        code = generated;
        break;
      }
    }
    if (!code) {
      return res.status(503).json({ error: 'Unable to allocate unique room code. Please try again.' });
    }
  }

  const safeMaxPlayers = Math.min(Math.max(Math.trunc(Number(maxPlayers)) || 4, 2), 6);
  const safeTimeLimit = Math.min(Math.max(Math.trunc(Number(timeLimitMinutes)) || 10, 1), 60);
  const safeMode: 'Normal' | 'Hard' = mode === 'Hard' ? 'Hard' : 'Normal';
  const safeTitle = String(title || 'Challenge Room').trim().slice(0, 200) || 'Challenge Room';
  const safeQuizId = String(quizId || 'quiz-1').trim().slice(0, 128) || 'quiz-1';
  const safeHostId = String(reqHostId || `player-${Date.now()}`).trim().slice(0, 128) || `player-${Date.now()}`;
  const safeHostName = String(hostName || 'Host').trim().slice(0, 120) || 'Host';
  const safeHostAvatar = String(hostAvatar || safeHostName.charAt(0) || 'H').trim().slice(0, 8) || 'H';

  const host: RoomParticipant = {
    id: safeHostId,
    uid: safeHostId,
    name: safeHostName,
    avatar: safeHostAvatar,
    isHost: true,
    isBot: false,
    score: 0,
    correctAnswers: 0,
    totalQuestions: sanitizedQuestions.length,
    accuracy: 0,
    completed: false,
    joinedAt: Date.now(),
  };

  const room: ChallengeRoom = {
    code,
    title: safeTitle,
    quizId: safeQuizId,
    questions: sanitizedQuestions,
    maxPlayers: safeMaxPlayers,
    timeLimitMinutes: safeTimeLimit,
    mode: safeMode,
    status: 'waiting',
    hostId: safeHostId,
    createdAt: Date.now(),
    participants: [host],
  };

  rooms[code] = room;
  broadcastRoomUpdate(code);
  res.json({ success: true, room, hostId: safeHostId });
});

app.get('/api/rooms/:code', (req, res) => {
  const code = String(req.params.code || '').trim().toUpperCase();
  const room = rooms[code];
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  res.json({ success: true, room });
});

app.post('/api/rooms/:code/join', (req, res) => {
  const code = String(req.params.code || '').trim().toUpperCase();
  const room = rooms[code];
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  const { playerId: reqPlayerId, playerName, avatar } = req.body;
  const cleanReqPlayerId = typeof reqPlayerId === 'string' ? reqPlayerId.trim().slice(0, 128) : '';
  const existingPlayer = cleanReqPlayerId ? room.participants.find((p) => p.id === cleanReqPlayerId) : null;
  if (existingPlayer) {
    return res.json({ success: true, room, playerId: existingPlayer.id });
  }

  if (room.status !== 'waiting') {
    return res.status(400).json({ error: 'Challenge has already started' });
  }

  if (room.participants.length >= room.maxPlayers) {
    return res.status(400).json({ error: 'Room is already full' });
  }

  const playerId = cleanReqPlayerId || `player-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const safeName =
    String(playerName || `Player ${room.participants.length + 1}`).trim().slice(0, 120) ||
    `Player ${room.participants.length + 1}`;
  const safeAvatar =
    String(avatar || safeName.charAt(0).toUpperCase() || 'P').trim().slice(0, 8) || 'P';

  const newPlayer: RoomParticipant = {
    id: playerId,
    uid: playerId,
    name: safeName,
    avatar: safeAvatar,
    isHost: false,
    isBot: false,
    score: 0,
    correctAnswers: 0,
    totalQuestions: room.questions.length,
    accuracy: 0,
    completed: false,
    joinedAt: Date.now(),
  };

  room.participants.push(newPlayer);
  broadcastRoomUpdate(code);
  res.json({ success: true, room, playerId });
});

app.post('/api/rooms/:code/add-bot', (req, res) => {
  const code = String(req.params.code || '').trim().toUpperCase();
  const room = rooms[code];
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  if (room.status !== 'waiting') {
    return res.status(400).json({ error: 'Bots can only be added while waiting in the lobby.' });
  }
  if (req.body?.hostId && String(req.body.hostId).trim() !== room.hostId) {
    return res.status(403).json({ error: 'Only the room host can add practice bots.' });
  }
  if (room.participants.length >= room.maxPlayers) {
    return res.status(400).json({ error: 'Room has reached max players limit.' });
  }

  const botNames = [
    { name: 'Sarah K. (Bot)', avatar: 'S' },
    { name: 'Liam M. (Bot)', avatar: 'L' },
    { name: 'David P. (Bot)', avatar: 'D' },
    { name: 'Emma W. (Bot)', avatar: 'E' },
    { name: 'Noah T. (Bot)', avatar: 'N' },
  ];
  const currentCount = room.participants.length;
  const bot = botNames[(currentCount - 1) % botNames.length];
  const safeBotName = String(req.body?.botName || bot.name).trim().slice(0, 120) || bot.name;
  const safeBotAvatar = String(req.body?.avatar || bot.avatar).trim().slice(0, 8) || bot.avatar;
  const botPlayer: RoomParticipant = {
    id: `bot-${Date.now()}-${currentCount}`,
    name: safeBotName,
    avatar: safeBotAvatar,
    isHost: false,
    isBot: true,
    score: 0,
    correctAnswers: 0,
    totalQuestions: room.questions.length,
    accuracy: 0,
    completed: false,
    joinedAt: Date.now(),
  };

  room.participants.push(botPlayer);
  broadcastRoomUpdate(code);
  res.json({ success: true, room, addedBot: botPlayer, bot: botPlayer });
});

app.post('/api/rooms/:code/start', (req, res) => {
  const code = String(req.params.code || '').trim().toUpperCase();
  const room = rooms[code];
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  if (room.status === 'completed') {
    return res.status(400).json({ error: 'Challenge has already completed.' });
  }
  if (req.body?.hostId && String(req.body.hostId).trim() !== room.hostId) {
    return res.status(403).json({ error: 'Only the room host can start this challenge.' });
  }
  if (room.status === 'active') {
    return res.json({ success: true, room });
  }

  room.status = 'active';
  broadcastRoomUpdate(code);
  res.json({ success: true, room });
});

app.post('/api/rooms/:code/progress', (req, res) => {
  const code = String(req.params.code || '').trim().toUpperCase();
  const room = rooms[code];
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  if (room.status === 'completed') {
    return res.status(409).json({ error: 'Challenge room is already completed.' });
  }

  const { playerId, score, correctAnswers, totalQuestions, completed = false } = req.body;
  const participant = room.participants.find((p) => p.id === playerId);
  if (participant) {
    clampParticipantProgress(room, participant, score, correctAnswers, totalQuestions, Boolean(completed));
  }

  room.participants.sort((a, b) => b.score - a.score);
  broadcastRoomUpdate(code);
  res.json({ success: true, room });
});

app.post('/api/rooms/:code/score', (req, res) => {
  const code = String(req.params.code || '').trim().toUpperCase();
  const room = rooms[code];
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  if (room.status === 'completed') {
    return res.status(409).json({ error: 'Challenge room is already completed.' });
  }

  const { playerId, score, correctAnswers, totalQuestions } = req.body;
  const participant = room.participants.find((p) => p.id === playerId);
  if (participant) {
    clampParticipantProgress(room, participant, score, correctAnswers, totalQuestions, true);
  }

  // Only auto-complete room when all human participants have completed
  const allHumansDone = room.participants
    .filter((p) => !p.isBot && !p.id.startsWith('bot-'))
    .every((p) => p.completed);
  if (allHumansDone) {
    room.status = 'completed';
  }

  room.participants.sort((a, b) => b.score - a.score);
  broadcastRoomUpdate(code);
  res.json({ success: true, room });
});

// Vite middleware in dev or static files in production
async function startServer() {
  const httpServer = createHttpServer(app);

  // Real-time WebSocket server mounted exclusively on /ws/challenges
  const wss = new WebSocketServer({ noServer: true });

  wss.on('connection', (ws) => {
    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg?.type === 'ping') {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'pong' }));
          }
          return;
        }
        if (msg?.type === 'subscribe' && typeof msg.roomCode === 'string') {
          const code = msg.roomCode.trim().toUpperCase();
          subscribeSocketToRoom(ws, code);
          const room = rooms[code];
          if (room && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'room_update', room }));
          }
          return;
        }
        if (msg?.type === 'score_progress' && typeof msg.roomCode === 'string') {
          const code = msg.roomCode.trim().toUpperCase();
          const room = rooms[code];
          if (!room || room.status === 'completed') return;
          const p = room.participants.find((item) => item.id === msg.playerId);
          if (p) {
            clampParticipantProgress(
              room,
              p,
              msg.score,
              msg.correctAnswers,
              msg.totalQuestions,
              Boolean(msg.completed)
            );
            room.participants.sort((a, b) => b.score - a.score);
            broadcastRoomUpdate(code);
          }
        }
      } catch {
        // Ignore malformed messages
      }
    });

    ws.on('close', () => {
      unsubscribeSocketFromAllRooms(ws);
    });
  });

  httpServer.on('upgrade', (request, socket, head) => {
    const reqUrl = request.url || '';
    if (reqUrl.startsWith('/ws/challenges')) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Quizian Full-Stack Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
