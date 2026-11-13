import express from 'express';
import { createServer as createHttpServer } from 'http';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

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

// Challenge room in-memory state
interface RoomParticipant {
  id: string;
  name: string;
  avatar: string;
  isHost: boolean;
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

// Health & AI status endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    aiAvailable: !!ai,
    roomsCount: Object.keys(rooms).length,
  });
});

const ALLOWED_TYPES = new Set([
  'multiple_choice',
  'fill_blank',
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

    const count = Math.min(Math.max(parseInt(questionCount, 10) || 5, 2), 30);
    const filteredTypes: string[] = Array.isArray(questionTypes)
      ? questionTypes.filter((t): t is string => typeof t === 'string' && ALLOWED_TYPES.has(t))
      : [];
    const requestedTypes: string[] =
      filteredTypes.length > 0 ? filteredTypes : ['multiple_choice'];
    const mediaData = fileBase64 || imageBase64;
    const mediaMime = fileMimeType || imageMimeType;

    // If Gemini is available, generate real questions with Gemini 3.8 Flash
    if (ai) {
      try {
        const typesStr = requestedTypes.join(', ');
        const systemInstruction = `You are Quizian's AI Educational Study Assistant.
Generate a high-quality educational quiz based STRICTLY on the user's provided study material (text, document, PDF, or image).
Difficulty level: ${difficulty} (Easy = direct recall & clear terms; Medium = comprehension & applied concepts; Hard = analytical, multi-concept, nuanced distinctions).
Exact number of questions required: ${count}.
Requested Question Types: ${typesStr}.

Supported Question Types & Exact Structure:
1. 'multiple_choice':
   - options: array of 4 plausible choices (1 correct, 3 distinct distractors)
   - correctAnswer: exact string matching one of the 4 options
2. 'fill_blank':
   - question: sentence with missing keyword replaced by "____"
   - options: []
   - correctAnswer: the missing keyword/phrase
3. 'identification':
   - question: clear definition, function, or description asking the student to identify the term/concept
   - options: []
   - correctAnswer: the exact term/concept name
4. 'scrambled_word':
   - question: prompt containing the scrambled uppercase letters in brackets, e.g. [ S P C E R O S ]
   - scrambledClue: helpful hint grounded in the material
   - options: []
   - correctAnswer: the unscrambled uppercase term

CRITICAL RULES:
- Generate EXACTLY ${count} questions.
- Use ONLY the requested question types (${typesStr}) and distribute them evenly across all ${count} questions.
- Every single question MUST be grounded in the provided study material.
- NEVER generate duplicate or nearly identical questions, repeated answers, or rephrased copies.
- Every question needs a unique id, clear question text, correctAnswer, and a concise 1-2 sentence explanation.
- Return ONLY a valid JSON object matching the schema.`;

        let contents: any;
        if (mediaData && mediaMime) {
          const cleanBase64 = mediaData.replace(/^data:[^;]+;base64,/, '');
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
          model: 'gemini-3.8-flash',
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
            materialText || 'General Study Material',
            count,
            requestedTypes,
            difficulty
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
      materialText || 'General Knowledge Study Notes',
      count,
      requestedTypes,
      difficulty
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
  const safeType = ALLOWED_TYPES.has(q?.type) ? q.type : allowedTypes[idx % allowedTypes.length] || 'multiple_choice';
  const base: any = {
    id: q?.id ? `${q.id}-${idx}` : `q-${Date.now()}-${idx}`,
    type: safeType,
    question: String(q?.question || '').trim(),
    options: Array.isArray(q?.options) ? q.options.map(String).filter(Boolean) : [],
    correctAnswer: String(q?.correctAnswer || '').trim(),
    explanation: String(q?.explanation || '').trim() || 'Grounded in your uploaded study material.',
  };

  if (q?.scrambledClue) {
    base.scrambledClue = String(q.scrambledClue).trim();
  }

  if (safeType === 'multiple_choice') {
    if (base.options.length < 2) {
      base.options = [base.correctAnswer || 'Option A', 'Option B', 'Option C', 'Option D'];
    }
    if (base.correctAnswer && !base.options.includes(base.correctAnswer)) {
      base.options[0] = base.correctAnswer;
    }
    if (!base.correctAnswer && base.options.length > 0) {
      base.correctAnswer = base.options[0];
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
  difficulty: string
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

    if (chosenType === 'fill_blank') {
      const masked = sentence.replace(new RegExp(`\\b${keyWord}\\b`, 'i'), '____');
      item = {
        id: `q-${Date.now()}-${i}`,
        type: 'fill_blank',
        question: masked.includes('____')
          ? `Fill in the blank (${i + 1}): ${masked}`
          : `Complete the key term (${i + 1}): ____ relates to "${sentence}"`,
        options: [],
        correctAnswer: keyWord,
        explanation: `From study material: "${sentence}"`,
      };
    } else if (chosenType === 'scrambled_word') {
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

// Challenge Rooms Endpoints
app.post('/api/rooms', (req, res) => {
  const { title, quizId, questions, maxPlayers, timeLimitMinutes, mode, hostId: reqHostId, hostName, hostAvatar } = req.body;

  // Generate 6-char alphanumeric room code
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  const hostId = reqHostId || `player-${Date.now()}`;
  const host: RoomParticipant = {
    id: hostId,
    name: hostName || 'Host',
    avatar: hostAvatar || 'M',
    isHost: true,
    score: 0,
    correctAnswers: 0,
    totalQuestions: Array.isArray(questions) ? questions.length : 10,
    accuracy: 0,
    completed: false,
    joinedAt: Date.now(),
  };

  const room: ChallengeRoom = {
    code,
    title: title || 'Challenge Room',
    quizId: quizId || 'quiz-1',
    questions: questions || [],
    maxPlayers: maxPlayers || 4,
    timeLimitMinutes: timeLimitMinutes || 10,
    mode: mode || 'Normal',
    status: 'waiting',
    hostId,
    createdAt: Date.now(),
    participants: [host],
  };

  rooms[code] = room;
  res.json({ success: true, room, hostId });
});

app.get('/api/rooms/:code', (req, res) => {
  const room = rooms[req.params.code.toUpperCase()];
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  res.json({ success: true, room });
});

app.post('/api/rooms/:code/join', (req, res) => {
  const code = req.params.code.toUpperCase();
  const room = rooms[code];
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  if (room.status !== 'waiting') {
    return res.status(400).json({ error: 'Challenge has already started' });
  }

  const { playerId: reqPlayerId, playerName, avatar } = req.body;
  const existingPlayer = reqPlayerId ? room.participants.find((p) => p.id === reqPlayerId) : null;
  if (existingPlayer) {
    return res.json({ success: true, room, playerId: existingPlayer.id });
  }

  if (room.participants.length >= room.maxPlayers) {
    return res.status(400).json({ error: 'Room is already full' });
  }

  const playerId = reqPlayerId || `player-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const newPlayer: RoomParticipant = {
    id: playerId,
    name: playerName || `Player ${room.participants.length + 1}`,
    avatar: avatar || (playerName ? playerName.charAt(0).toUpperCase() : 'P'),
    isHost: false,
    score: 0,
    correctAnswers: 0,
    totalQuestions: room.questions.length,
    accuracy: 0,
    completed: false,
    joinedAt: Date.now(),
  };

  room.participants.push(newPlayer);
  res.json({ success: true, room, playerId });
});

app.post('/api/rooms/:code/add-bot', (req, res) => {
  const code = req.params.code.toUpperCase();
  const room = rooms[code];
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  if (room.participants.length >= room.maxPlayers) {
    return res.status(400).json({ error: 'Room has reached max players limit.' });
  }

  const botNames = [
    { name: 'Sarah K.', avatar: 'S' },
    { name: 'Liam M.', avatar: 'L' },
    { name: 'David P.', avatar: 'D' },
    { name: 'Emma W.', avatar: 'E' },
    { name: 'Noah T.', avatar: 'N' },
  ];
  const currentCount = room.participants.length;
  const bot = botNames[(currentCount - 1) % botNames.length];
  const botPlayer: RoomParticipant = {
    id: `bot-${Date.now()}-${currentCount}`,
    name: bot.name,
    avatar: bot.avatar,
    isHost: false,
    score: 0,
    correctAnswers: 0,
    totalQuestions: room.questions.length,
    accuracy: 0,
    completed: false,
    joinedAt: Date.now(),
  };

  room.participants.push(botPlayer);
  res.json({ success: true, room, bot: botPlayer });
});

app.post('/api/rooms/:code/start', (req, res) => {
  const code = req.params.code.toUpperCase();
  const room = rooms[code];
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  room.status = 'active';
  res.json({ success: true, room });
});

app.post('/api/rooms/:code/score', (req, res) => {
  const code = req.params.code.toUpperCase();
  const room = rooms[code];
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  const { playerId, score, correctAnswers, totalQuestions } = req.body;
  const participant = room.participants.find((p) => p.id === playerId);
  if (participant) {
    participant.score = score;
    participant.correctAnswers = correctAnswers;
    participant.totalQuestions = totalQuestions;
    participant.accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
    participant.completed = true;
  }

  // Check if all players completed
  const allDone = room.participants.every((p) => p.completed);
  if (allDone) {
    room.status = 'completed';
  }

  // Sort participants by score descending
  room.participants.sort((a, b) => b.score - a.score);

  res.json({ success: true, room });
});

// Vite middleware in dev or static files in production
async function startServer() {
  const httpServer = createHttpServer(app);

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        ws: { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Quizian Full-Stack Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
