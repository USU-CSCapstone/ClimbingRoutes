// Walls with a 3D model, and their routes joined with the lines drawn on it.
// A stand-in until the crag index lists walls.
import { gradeFromText } from './grades';
import type { SavedRoute } from './routes-file';
import type { ClimbSummary, Discipline, Grade, GradeSystem, Uuid } from './types';

export interface Wall {
  /** Used in the page URL, /walls/<id>. */
  id: string;
  name: string;
  /** The OpenBeta area the routes come from. */
  areaUuid: Uuid;
  /** File in data/models/. */
  model: string;
  /** File in data/routes/ with the lines drawn on that model. */
  routes: string;
}

export const WALLS: Wall[] = [
  {
    id: 'date-wall',
    name: 'Date Wall',
    areaUuid: '8c45d40d-363d-5a9b-9659-3df50c5d3916',
    model: 'wall47.glb',
    routes: 'wall47.json',
  },
];

export function findWall(id: string): Wall | null {
  return WALLS.find((w) => w.id === id) ?? null;
}

export function wallForArea(uuid: Uuid): Wall | null {
  return WALLS.find((w) => w.areaUuid === uuid) ?? null;
}

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
  line: Pick<SavedRoute, 'points' | 'normals'> | null;
}

/**
 * The wall's routes in OpenBeta's left-to-right order, each with its drawn
 * line. Lines for routes OpenBeta no longer lists go at the end.
 */
export function wallRoutes(climbs: ClimbSummary[], saved: SavedRoute[]): WallRoute[] {
  const lines = new Map(saved.map((s) => [s.openbeta_uuid, s]));
  const listed = new Set(climbs.map((c) => c.uuid));
  const routes = [
    ...climbs.map((c) => ({ ...c, line: lines.get(c.uuid) ?? null })),
    ...saved
      .filter((s) => !listed.has(s.openbeta_uuid))
      .map((s) => {
        const grade = gradeFromText(s.grade);
        return {
          uuid: s.openbeta_uuid,
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
