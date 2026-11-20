import type { Uuid } from '@/core/types';
import type { WallRoute } from '@/core/walls';

/**
 * A wall route with the color its line is drawn in, which shows its
 * difficulty, and whether it's dimmed for not matching the filters.
 */
export type ShownRoute = WallRoute & { color: string; dimmed?: boolean };

/** The wall a 3D page is for: its OpenBeta area. */
export interface WallInfo {
  uuid: Uuid;
  name: string;
}
