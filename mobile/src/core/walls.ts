// A wall's routes joined with the lines drawn on its published model.
import { gradeFromText } from './grades';
import type { DrawnLine } from './models';
import type { ClimbSummary, Discipline, Grade, GradeSystem, Uuid } from './types';

export interface WallRoute {
  uuid: Uuid;
  name: string;
  grade: Grade | null;
  allGrades: Partial<Record<GradeSystem, string>>;
  disciplines: Discipline[];
  fa: string | null;
  /** Place on the wall from the left, starting at 1. */
  number: number;
  /** The line drawn on the model, or null if the route hasn't been drawn. */
  line: Pick<DrawnLine, 'points' | 'normals'> | null;
}

/**
 * The wall's routes in OpenBeta's left-to-right order, each with its drawn
 * line. Lines for routes OpenBeta no longer lists go at the end.
 */
export function wallRoutes(climbs: ClimbSummary[], saved: DrawnLine[]): WallRoute[] {
  const lines = new Map(saved.map((s) => [s.climbUuid, s]));
  const listed = new Set(climbs.map((c) => c.uuid));
  const routes = [
    ...climbs.map((c) => ({ ...c, line: lines.get(c.uuid) ?? null })),
    ...saved
      .filter((s) => !listed.has(s.climbUuid))
      .map((s) => {
        const grade = gradeFromText(s.grade);
        return {
          uuid: s.climbUuid,
          name: s.name,
          grade,
          allGrades: grade ? { [grade.system]: grade.text } : {},
          disciplines: [],
          fa: null,
          line: s,
        };
      }),
  ];
  return routes.map((r, i) => ({
    uuid: r.uuid,
    name: r.name,
    grade: r.grade,
    allGrades: r.allGrades,
    disciplines: r.disciplines,
    fa: r.fa,
    number: i + 1,
    line: r.line && { points: r.line.points, normals: r.line.normals },
  }));
}
