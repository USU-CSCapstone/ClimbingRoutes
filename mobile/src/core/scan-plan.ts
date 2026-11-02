// How many photos a scan should aim for, from the wall's size. The capture
// checklist asks for one photo per step along the wall, starting and ending a
// step past each edge; 16 was enough for a first model and the best one used 47.
// Upload needs at least 16 (#52), so the smallest target stays above that.

export type WallSize = 'small' | 'medium' | 'large';

export interface WallSizeOption {
  size: WallSize;
  label: string;
  detail: string;
  /** The "Aim for about …" photo count. */
  photos: number;
}

export const WALL_SIZES: WallSizeOption[] = [
  { size: 'small', label: 'Small', detail: 'Up to about 10 m wide, a route or two', photos: 20 },
  { size: 'medium', label: 'Medium', detail: 'About 10–20 m wide, a handful of routes', photos: 30 },
  { size: 'large', label: 'Large', detail: 'Wider than about 20 m, or very tall', photos: 50 },
];

export function photoTarget(size: WallSize): number {
  return WALL_SIZES.find((s) => s.size === size)?.photos ?? WALL_SIZES[1].photos;
}
