import { Difficulty, UngradedLine } from '@/constants/theme';
import { difficultyBand } from '@/core/grades';
import type { Grade, Uuid } from '@/core/types';
import { wallRoutes } from '@/core/walls';
import { useRouteLines } from '@/data/models';
import { useArea } from '@/data/queries';
import { placeName, wallFacts } from '@/ui/wall/parts';
import type { ShownRoute } from '@/ui/wall/types';

/**
 * A wall's routes in OpenBeta's left-to-right order, with the lines drawn on
 * one model version, and the facts and place shown above them. With no model,
 * no route is said to be drawn or not.
 */
export function useWallRoutes(wallUuid: Uuid, modelId: string | undefined) {
  const area = useArea(wallUuid);
  const saved = useRouteLines(modelId);
  // A copy saved on the device counts, so a wall that has loaded once works offline.
  const linesKnown = saved.data !== undefined;
  // Wait for OpenBeta's order so each route keeps its number.
  const routes: ShownRoute[] = area.data
    ? wallRoutes(area.data.climbs, saved.data ?? []).map((r) => ({ ...r, color: lineColor(r.grade) }))
    : [];
  const message = area.isPending
    ? 'Loading routes…'
    : area.error
      ? `Couldn't load the routes: ${area.error.message}`
      : routes.length === 0
        ? 'OpenBeta lists no routes on this wall'
        : null;
  return {
    routes,
    linesKnown,
    facts: wallFacts(routes, linesKnown),
    place: placeName(area.data),
    /** Why there are no routes to list, or null once there are. */
    message,
    refetchLines: saved.refetch,
  };
}

/** Lines are drawn in their difficulty's color, or white when the grade has no band. */
function lineColor(grade: Grade | null): string {
  const band = difficultyBand(grade);
  return band == null ? UngradedLine : Difficulty[band].line;
}
