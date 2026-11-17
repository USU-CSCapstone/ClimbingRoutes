import type { Discipline, Grade, GradeSystem } from './types';

// Fallback order when the preferred system has no grade.
const FALLBACK: GradeSystem[] = ['yds', 'vscale', 'french', 'font', 'uiaa', 'ewbank', 'wi'];

/**
 * Picks the grade to show. v1 covers the USA, so routes use YDS and boulders
 * use the V-scale, falling back to whatever OpenBeta has.
 */
export function pickGrade(
  grades: Partial<Record<GradeSystem, string | null>> | null | undefined,
  disciplines: Discipline[],
): Grade | null {
  if (!grades) return null;
  const preferred: GradeSystem = disciplines.includes('boulder') ? 'vscale' : 'yds';
  for (const system of [preferred, ...FALLBACK]) {
    const text = grades[system];
    if (text) return { system, text };
  }
  return null;
}

/** Typesense returns one grade string with no system, so infer it from the text. */
export function gradeFromText(text: string | null | undefined): Grade | null {
  if (!text) return null;
  if (/^5\./.test(text)) return { system: 'yds', text };
  if (/^V/i.test(text)) return { system: 'vscale', text };
  if (/^WI/i.test(text)) return { system: 'wi', text };
  return { system: 'french', text };
}

/** Difficulty bands, easiest first: 5.7 and under, 5.8–5.9, 5.10, 5.11 and up (V0–2, V3–5, V6–8, V9+ for boulders). */
export type DifficultyBand = 0 | 1 | 2 | 3;

/**
 * Reads a YDS or V grade as its base number (the 10 in 5.10c) and a value
 * for sorting, higher is harder. A dash before a digit is a range (V3-4),
 * not a minus. Null for other systems or text it can't read.
 */
function readGrade(grade: Grade | null): { base: number; value: number } | null {
  if (!grade) return null;
  const text = grade.text.trim();
  if (grade.system === 'yds') {
    const m = /^5\.(\d+)([abcd])?([+-](?!\d))?/i.exec(text);
    if (!m) return null;
    const base = Number(m[1]);
    const sign = m[3] === '+' ? 1 : m[3] === '-' ? -1 : 0;
    if (m[2]) return { base, value: base + 'abcd'.indexOf(m[2].toLowerCase()) * 0.25 + sign * 0.1 };
    // 5.10- is about a/b and 5.10+ about c/d. Below 5.10 the sign is a small nudge.
    return { base, value: base >= 10 ? base + 0.375 + sign * 0.3 : base + sign * 0.2 };
  }
  if (grade.system === 'vscale') {
    const m = /^V(B|\d+)([+-](?!\d))?/i.exec(text);
    if (!m) return null;
    const base = m[1].toUpperCase() === 'B' ? -1 : Number(m[1]);
    return { base, value: base + (m[2] === '+' ? 0.3 : m[2] === '-' ? -0.3 : 0) };
  }
  return null;
}

export function gradeValue(grade: Grade | null): number | null {
  return readGrade(grade)?.value ?? null;
}

export function difficultyBand(grade: Grade | null): DifficultyBand | null {
  const read = readGrade(grade);
  if (!read || !grade) return null;
  const limits = grade.system === 'vscale' ? [3, 6, 9] : [8, 10, 11];
  const band = limits.findIndex((limit) => read.base < limit);
  return (band < 0 ? 3 : band) as DifficultyBand;
}

/**
 * Steps on each scale the grade filter can be set to. YDS steps below 5.10 are
 * whole numbers; from 5.10 each letter is a quarter, so 5.10c is 10.5.
 */
export const YDS_STEPS: { label: string; value: number }[] = [
  ...Array.from({ length: 10 }, (_, n) => ({ label: `5.${n}`, value: n })),
  ...Array.from({ length: 6 }, (_, i) =>
    [...'abcd'].map((letter, j) => ({ label: `5.${10 + i}${letter}`, value: 10 + i + j / 4 })),
  ).flat(),
];

/** VB is -1. */
export const V_STEPS: { label: string; value: number }[] = [
  { label: 'VB', value: -1 },
  ...Array.from({ length: 18 }, (_, n) => ({ label: `V${n}`, value: n })),
];

/**
 * The filter steps a grade covers, low to high. 5.10 covers 5.10a–d, 5.10- is
 * a–b, 5.10+ is c–d, and V3-4 is V3–V4. Null for other systems or text it can't read.
 */
export function gradeSpan(grade: Grade | null): { system: 'yds' | 'vscale'; lo: number; hi: number } | null {
  if (!grade) return null;
  const text = grade.text.trim();
  if (grade.system === 'yds') {
    const m = /^5\.(\d+)([abcd])?([+-](?!\d))?/i.exec(text);
    if (!m) return null;
    const base = Number(m[1]);
    if (base < 10) return { system: 'yds', lo: base, hi: base };
    if (m[2]) {
      const v = base + 'abcd'.indexOf(m[2].toLowerCase()) / 4;
      return { system: 'yds', lo: v, hi: v };
    }
    if (m[3] === '-') return { system: 'yds', lo: base, hi: base + 0.25 };
    if (m[3] === '+') return { system: 'yds', lo: base + 0.5, hi: base + 0.75 };
    return { system: 'yds', lo: base, hi: base + 0.75 };
  }
  if (grade.system === 'vscale') {
    const m = /^V(B|\d+)(?:-(\d+))?/i.exec(text);
    if (!m) return null;
    const lo = m[1].toUpperCase() === 'B' ? -1 : Number(m[1]);
    const hi = m[2] ? Math.max(lo, Number(m[2])) : lo;
    return { system: 'vscale', lo, hi };
  }
  return null;
}
