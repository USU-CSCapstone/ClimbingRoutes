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
