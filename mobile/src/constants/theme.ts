// High-contrast palette for reading outdoors in sunlight.

export const Colors = {
  light: {
    text: '#000000',
    textSecondary: '#3A3D42',
    background: '#FFFFFF',
    backgroundElement: '#EEEFF2',
    border: '#C9CCD1',
    accent: '#0B57D0',
    accentText: '#FFFFFF',
    danger: '#B3261E',
  },
  dark: {
    text: '#FFFFFF',
    textSecondary: '#C8CBD0',
    background: '#000000',
    backgroundElement: '#1C1D20',
    border: '#3A3D42',
    accent: '#8AB4F8',
    accentText: '#000000',
    danger: '#F2B8B5',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
} as const;

/** Minimum height for anything tappable, for use with gloves or one hand. */
export const TapTarget = 56;
export const MaxContentWidth = 800;
