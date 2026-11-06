import express from 'express';
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

// AI Quiz Generation Endpoint
app.post('/api/generate-quiz', async (req, res) => {
  try {
    const {
      materialText,
      imageBase64,
      imageMimeType,
      questionTypes = ['multiple_choice'],
      questionCount = 5,
      difficulty = 'Medium',
      title = 'Study Quiz',
    } = req.body;

    const count = Math.min(Math.max(parseInt(questionCount, 10) || 5, 2), 20);

    // If Gemini is available, generate real questions with Gemini 3.8 Flash
    if (ai) {
      try {
        const typesStr = Array.isArray(questionTypes) ? questionTypes.join(', ') : questionTypes;
        const systemInstruction = `You are Quizian's AI Educational Study Assistant. 
Generate a high-quality educational quiz based STRICTLY on the user's provided study notes or media.
Difficulty level: ${difficulty}.
Number of questions: ${count}.
Requested Question Types: ${typesStr} (can include multiple_choice, fill_blank, identification, scrambled_word).

Rules:
1. Every question must have:
   - id: unique string
   - type: one of 'multiple_choice', 'fill_blank', 'identification', 'scrambled_word'
   - question: clear, engaging question text
   - options: array of 4 choices for 'multiple_choice', or empty array for other types
   - correctAnswer: the correct answer string (must match one of the options exactly for multiple_choice)
   - explanation: short 1-2 sentence explanation of why this answer is correct
   - scrambledClue: if type is scrambled_word, include a hint and the scrambled letters
2. For multiple_choice: include 1 correct answer and 3 plausible distractors.
3. For fill_blank: create sentences with a missing term represented as "____".
4. For identification: formulate a clear definition or concept description.
5. Return ONLY a valid JSON object matching the requested schema.`;

        let contents: any;
        if (imageBase64 && imageMimeType) {
          const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');
          contents = {
            parts: [
              {
                inlineData: {
                  mimeType: imageMimeType,
                  data: cleanBase64,
                },
              },
              {
                text: `Create ${count} quiz questions based on this study image. Difficulty: ${difficulty}. Additional notes: ${materialText || 'None'}. Output valid JSON.`,
              },
            ],
          };
        } else {
          contents = `Study material:\n${materialText || 'General Knowledge and Computer Science Concepts'}\n\nPlease generate ${count} quiz questions.`;
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
          return res.json({
            success: true,
            source: 'gemini',
            quizTitle: parsed.quizTitle || title,
            questions: parsed.questions || [],
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
      questionTypes,
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

// Helper for smart local educational question generation
function generateSmartFallbackQuestions(
  text: string,
  count: number,
  types: string[],
  difficulty: string
) {
  // Extract key sentences / concepts from text
  const cleanText = text.trim();
  const sentences = cleanText
    .split(/[.?!]\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20);

  const pool = [
    {
      q: 'Which component is considered the primary identifier for records in a relational database?',
      options: ['Primary Key', 'Foreign Key', 'Composite Index', 'Candidate Key'],
      correct: 'Primary Key',
      explanation: 'A primary key uniquely identifies each record in a database table.',
      type: 'multiple_choice',
    },
    {
      q: 'In software architecture, what does the acronym API stand for?',
      options: ['Application Programming Interface', 'Automated Program Integration', 'Advanced Protocol Interaction', 'Applied Process Instruction'],
      correct: 'Application Programming Interface',
      explanation: 'An API allows different software applications to communicate with each other.',
      type: 'multiple_choice',
    },
    {
      q: 'A ____ is a data structure that follows the Last In, First Out (LIFO) principle.',
      options: ['Stack', 'Queue', 'Array', 'Linked List'],
      correct: 'Stack',
      explanation: 'In a stack, the last element added is the first one to be removed.',
      type: 'fill_blank',
    },
    {
      q: 'Identify the principle in object-oriented programming that bundles data and methods together.',
      options: ['Encapsulation', 'Polymorphism', 'Inheritance', 'Abstraction'],
      correct: 'Encapsulation',
      explanation: 'Encapsulation keeps internal state hidden and bundles behavior with data.',
      type: 'identification',
    },
    {
      q: 'Unscramble the fundamental building block of the World Wide Web: [M H T L]',
      options: ['HTML', 'HTTP', 'HTTPS', 'HLTM'],
      correct: 'HTML',
      explanation: 'HTML stands for HyperText Markup Language, the standard markup language for documents on the web.',
      type: 'scrambled_word',
      scrambledClue: 'Markup language for web pages',
    },
    {
      q: 'What is the time complexity of searching an element in a balanced Binary Search Tree?',
      options: ['O(log n)', 'O(n)', 'O(1)', 'O(n^2)'],
      correct: 'O(log n)',
      explanation: 'Balanced BSTs halve the search space at each step, yielding logarithmic time.',
      type: 'multiple_choice',
    },
    {
      q: '____ is an HTTP status code indicating that the requested resource could not be found.',
      options: ['404 Not Found', '200 OK', '500 Internal Server Error', '403 Forbidden'],
      correct: '404 Not Found',
      explanation: '404 signifies that the origin server did not find a current representation for the target resource.',
      type: 'fill_blank',
    },
    {
      q: 'Identify the process of converting human-readable source code into machine code.',
      options: ['Compilation', 'Interpretation', 'Transpilation', 'Serialization'],
      correct: 'Compilation',
      explanation: 'A compiler translates source code written in a high-level language into machine code.',
      type: 'identification',
    },
  ];

  // If text contains sentences, generate dynamic contextual questions from the sentences!
  const questions: any[] = [];
  let index = 0;

  for (let i = 0; i < count; i++) {
    const chosenType = Array.isArray(types) && types.length > 0 ? types[i % types.length] : 'multiple_choice';
    if (i < sentences.length && sentences[i].length > 25) {
      const sentence = sentences[i];
      const words = sentence.split(/\s+/).filter((w) => w.length > 4);
      const keyWord = words[Math.floor(words.length / 2)]?.replace(/[^a-zA-Z]/g, '') || 'Concept';

      if (chosenType === 'fill_blank') {
        const maskedSentence = sentence.replace(new RegExp(`\\b${keyWord}\\b`, 'i'), '____');
        questions.push({
          id: `q-${Date.now()}-${i}`,
          type: 'fill_blank',
          question: `Fill in the blank: ${maskedSentence}`,
          options: [keyWord, 'Algorithm', 'Parameter', 'Variable'],
          correctAnswer: keyWord,
          explanation: `From study notes: "${sentence}"`,
        });
        continue;
      } else if (chosenType === 'scrambled_word') {
        const scrambled = keyWord.toUpperCase().split('').sort(() => 0.5 - Math.random()).join(' ');
        questions.push({
          id: `q-${Date.now()}-${i}`,
          type: 'scrambled_word',
          question: `Unscramble this term from your notes: [ ${scrambled} ]`,
          options: [keyWord.toUpperCase(), 'SYSTEM', 'PROCESS', 'STRUCTURE'],
          correctAnswer: keyWord.toUpperCase(),
          explanation: `The term '${keyWord}' was referenced in: "${sentence.slice(0, 80)}..."`,
          scrambledClue: `Derived from your notes`,
        });
        continue;
      } else if (chosenType === 'identification') {
        questions.push({
          id: `q-${Date.now()}-${i}`,
          type: 'identification',
          question: `Identify the term described: "${sentence}"`,
          options: [keyWord, 'Analysis', 'Framework', 'Syntax'],
          correctAnswer: keyWord,
          explanation: `This corresponds to: "${sentence}"`,
        });
        continue;
      }
    }

    // Pull from curated knowledge base
    const template = pool[index % pool.length];
    index++;
    questions.push({
      id: `q-${Date.now()}-${i}`,
      type: template.type || chosenType,
      question: template.q,
      options: template.options,
      correctAnswer: template.correct,
      explanation: template.explanation,
      scrambledClue: (template as any).scrambledClue,
    });
  }

  return questions;
}

// Challenge Rooms Endpoints
app.post('/api/rooms', (req, res) => {
  const { title, quizId, questions, maxPlayers, timeLimitMinutes, mode, hostName, hostAvatar } = req.body;

  // Generate 6-char alphanumeric room code
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  const hostId = `player-${Date.now()}`;
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

  if (room.participants.length >= room.maxPlayers) {
    return res.status(400).json({ error: 'Room is already full' });
  }

  const { playerName, avatar } = req.body;
  const playerId = `player-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

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
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Quizian Full-Stack Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
