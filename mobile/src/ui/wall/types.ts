import type { Uuid } from '@/core/types';
import type { WallRoute } from '@/core/walls';

/** A wall route with the color its line is drawn in, which shows its difficulty. */
export type ShownRoute = WallRoute & { color: string };

/** The wall a 3D page is for: its OpenBeta area. */
export interface WallInfo {
  uuid: Uuid;
  name: string;
}
