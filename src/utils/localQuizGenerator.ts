import { DifficultyLevel, Question, QuestionType } from '../types';
import { createScrambledTiles } from './questionUtils';

export function generateOfflineQuestions(
  materialText: string,
  count: number,
  types: QuestionType[],
  _difficulty: DifficultyLevel
): Question[] {
  const safeCount = Math.min(Math.max(count || 5, 2), 30);
  const allowedSet = new Set<QuestionType>([
    'multiple_choice',
    'identification',
    'scrambled_word',
  ]);
  const filteredTypes = types.filter((t) => allowedSet.has(t));
  const activeTypes: QuestionType[] =
    filteredTypes.length > 0 ? filteredTypes : ['multiple_choice', 'identification', 'scrambled_word'];

  const segments = materialText
    .replace(/\r\n/g, '\n')
    .split(/(?<=[.?!])\s+|\n+|;\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 18);

  const candidateKeywords = Array.from(
    new Set(
      materialText
        .split(/[^a-zA-Z0-9-]+/)
        .map((w) => w.trim())
        .filter((w) => w.length >= 4 && !/^\d+$/.test(w))
    )
  );

  const pickDistractors = (answer: string, offset: number): string[] => {
    const others: string[] = [];
    for (let j = 0; j < candidateKeywords.length && others.length < 3; j++) {
      const cand = candidateKeywords[(offset + j) % candidateKeywords.length];
      if (cand.toLowerCase() !== answer.toLowerCase() && !others.includes(cand)) {
        others.push(cand);
      }
    }
    const defaults = ['Process', 'Framework', 'Architecture', 'Parameter', 'System'];
    for (const def of defaults) {
      if (others.length >= 3) break;
      if (def.toLowerCase() !== answer.toLowerCase() && !others.includes(def)) {
        others.push(def);
      }
    }
    return [answer, ...others.slice(0, 3)].sort((a, b) => a.localeCompare(b));
  };

  const questions: Question[] = [];
  const usedQuestions = new Set<string>();
  const baseTime = Date.now();
  const totalSegments = Math.max(segments.length, 1);

  for (let i = 0; i < safeCount; i++) {
    const chosenType = activeTypes[i % activeTypes.length];
    const segIdx = i % totalSegments;
    const sentence = segments[segIdx] || materialText.trim() || 'Key concepts from your study notes';
    const passNum = Math.floor(i / totalSegments);

    const words = sentence
      .split(/\s+/)
      .map((w) => w.replace(/[^a-zA-Z0-9-]/g, ''))
      .filter((w) => w.length >= 4);

    const wordIdx = words.length > 0 ? (Math.floor(words.length / 2) + passNum) % words.length : 0;
    const keyWord =
      words[wordIdx] ||
      candidateKeywords[i % Math.max(candidateKeywords.length, 1)] ||
      `Concept${i + 1}`;

    let item: Question;

    if (chosenType === 'scrambled_word') {
      const upper = keyWord.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || 'CONCEPT';
      const scrambled = createScrambledTiles(upper, `${baseTime}-${i}`)
        .map((t) => t.char)
        .join(' ');
      item = {
        id: `offline-q-${baseTime}-${i}`,
        type: 'scrambled_word',
        question: `Unscramble the key term from your notes (${i + 1}): [ ${scrambled} ]`,
        options: [],
        correctAnswer: upper,
        explanation: `Referenced in your notes: "${sentence}"`,
        scrambledClue: `Context hint: ${sentence.slice(0, 75)}${sentence.length > 75 ? '...' : ''}`,
      };
    } else if (chosenType === 'identification') {
      item = {
        id: `offline-q-${baseTime}-${i}`,
        type: 'identification',
        question: `Identify the key term or concept described here (${i + 1}): "${sentence.replace(new RegExp(`\\b${keyWord}\\b`, 'gi'), 'this concept')}"`,
        options: [],
        correctAnswer: keyWord,
        explanation: `Direct excerpt from your study notes: "${sentence}"`,
      };
    } else {
      const maskedPrompt = sentence.replace(new RegExp(`\\b${keyWord}\\b`, 'i'), '____');
      item = {
        id: `offline-q-${baseTime}-${i}`,
        type: 'multiple_choice',
        question: maskedPrompt.includes('____')
          ? `Which term accurately completes this statement from your study notes? (${i + 1})\n"${maskedPrompt}"`
          : `Based on your study material, which key concept applies to: "${sentence}"? (${i + 1})`,
        options: pickDistractors(keyWord, i),
        correctAnswer: keyWord,
        explanation: `Source note: "${sentence}"`,
      };
    }

    const key = item.question.toLowerCase();
    if (!usedQuestions.has(key)) {
      usedQuestions.add(key);
      questions.push(item);
    }
  }

  return questions;
}
