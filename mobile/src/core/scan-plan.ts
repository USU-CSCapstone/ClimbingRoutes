// How many photos a scan should aim for, and the fewest it can upload with,
// from the wall's size. The capture checklist asks for one photo per step along
// the wall, starting and ending a step past each edge; 16 was enough for a first
// model and the best one used 47. Each target stays well above its minimum. Only
// the in-app camera lane asks the wall's size; uploads go straight to picking
// photos, so they're held to the medium wall's minimum.

export type WallSize = 'small' | 'medium' | 'large';

export interface WallSizeOption {
  size: WallSize;
  label: string;
  detail: string;
  /** The "Aim for about …" photo count. */
  photos: number;
  /** The fewest photos a scan of this wall can upload with (#52). */
  minimum: number;
}

export const WALL_SIZES: WallSizeOption[] = [
  { size: 'small', label: 'Small', detail: 'Up to about 10 m wide, a route or two', photos: 20, minimum: 7 },
  { size: 'medium', label: 'Medium', detail: 'About 10–20 m wide, a handful of routes', photos: 30, minimum: 10 },
  { size: 'large', label: 'Large', detail: 'Wider than about 20 m, or very tall', photos: 50, minimum: 16 },
];

/** The minimum for a scan whose wall size wasn't asked, like an upload: the medium wall's. */
export const UNKNOWN_SIZE_MINIMUM = 10;

export function photoTarget(size: WallSize): number {
  return WALL_SIZES.find((s) => s.size === size)?.photos ?? WALL_SIZES[1].photos;
}

/** The fewest photos a scan can upload with, from its wall's size if it was asked. */
export function minimumPhotos(size: WallSize | null | undefined): number {
  return WALL_SIZES.find((s) => s.size === size)?.minimum ?? UNKNOWN_SIZE_MINIMUM;
}
