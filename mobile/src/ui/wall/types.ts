import type { WallRoute } from '@/core/walls';

/** A wall route with the color its line is drawn in, which shows its difficulty. */
export type ShownRoute = WallRoute & { color: string };
