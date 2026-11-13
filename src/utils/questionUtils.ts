import { Question, QuestionType } from '../types';

export const QUESTION_TYPE_OPTIONS: Array<{
  id: QuestionType;
  label: string;
  desc: string;
}> = [
  { id: 'multiple_choice', label: 'Multiple Choice', desc: '4 choices (A-D) with 1 correct' },
  { id: 'identification', label: 'Identification', desc: 'Type exact term or concept' },
  { id: 'scrambled_word', label: 'Scrambled Words', desc: 'Interactive letter tiles puzzle' },
];

export function formatQuestionTypeLabel(type: QuestionType): string {
  const found = QUESTION_TYPE_OPTIONS.find((item) => item.id === type);
  return found ? found.label : type.replace(/_/g, ' ');
}

export const POINTS_PER_CORRECT = 5;

export interface ScrambledTile {
  id: number;
  char: string;
}

/**
 * Generates deterministic scrambled letter tiles from the target answer,
 * preserving exact character multiplicity and ensuring the scrambled order
 * differs from the target word whenever >= 2 distinct characters exist.
 */
export function createScrambledTiles(answer: string, seed = ''): ScrambledTile[] {
  const letters = answer.replace(/\s+/g, '').toUpperCase().split('').filter(Boolean);
  if (letters.length === 0) return [];
  if (letters.length === 1) return [{ id: 0, char: letters[0] }];

  const tiles: ScrambledTile[] = letters.map((char, idx) => ({ id: idx, char }));
  const uniqueChars = new Set(letters);
  if (uniqueChars.size <= 1) return tiles;

  // Deterministic PRNG seeded by question id + answer
  let hash = 2166136261;
  const seedStr = `${seed}:${letters.join('')}`;
  for (let i = 0; i < seedStr.length; i++) {
    hash ^= seedStr.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  const nextRand = () => {
    hash += 0x6d2b79f5;
    let t = hash;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  for (let i = tiles.length - 1; i > 0; i--) {
    const j = Math.floor(nextRand() * (i + 1));
    const tmp = tiles[i];
    tiles[i] = tiles[j];
    tiles[j] = tmp;
  }

  // Guarantee scrambled order != original word
  const original = letters.join('');
  if (tiles.map((t) => t.char).join('') === original) {
    const swapIdx = tiles.findIndex((t) => t.char !== tiles[0].char);
    if (swapIdx > 0) {
      const tmp = tiles[0];
      tiles[0] = tiles[swapIdx];
      tiles[swapIdx] = tmp;
    }
  }

  return tiles;
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/s['’]s\b/g, 's')
    .replace(/['’]s\b/g, 's')
    .replace(/['’]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getAcceptableShortVariants(correctAnswer: string): string[] {
  const variants = new Set<string>();
  const fullNorm = normalizeText(correctAnswer);
  if (fullNorm) variants.add(fullNorm);

  // Support "ERP (Enterprise Resource Planning)" or "Third Normal Form (3NF)"
  const parenMatch = correctAnswer.match(/^(.*?)\(([^)]+)\)\s*$/);
  if (parenMatch) {
    const outside = normalizeText(parenMatch[1]);
    const inside = normalizeText(parenMatch[2]);
    if (outside) variants.add(outside);
    if (inside) variants.add(inside);
  }

  return Array.from(variants);
}

export function evaluateQuestionAnswer(question: Question, userAnswer?: string): boolean {
  if (!userAnswer || !userAnswer.trim()) return false;
  const rawUser = userAnswer.trim();

  if (question.type === 'scrambled_word') {
    const compactUser = rawUser.replace(/\s+/g, '').toUpperCase();
    const compactCorrect = question.correctAnswer.replace(/\s+/g, '').toUpperCase();
    return Boolean(compactUser) && compactUser === compactCorrect;
  }

  if (question.type === 'identification') {
    const normUser = normalizeText(rawUser);
    if (!normUser) return false;
    const variants = getAcceptableShortVariants(question.correctAnswer);
    if (variants.includes(normUser)) return true;

    // Also allow apostrophe-base match (e.g. "Fitts" for "Fitts's")
    const baseUser = normUser.replace(/s$/, '');
    return variants.some((v) => v === baseUser || v.replace(/s$/, '') === normUser);
  }

  return normalizeText(rawUser) === normalizeText(question.correctAnswer);
}

export function formatUserAnswerForDisplay(_question: Question, userAnswer?: string): string {
  if (!userAnswer || !userAnswer.trim()) return '(No answer provided)';
  return userAnswer;
}

export function formatCorrectAnswerForDisplay(question: Question): string {
  return question.correctAnswer;
}
