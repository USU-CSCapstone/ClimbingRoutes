import { Platform } from 'react-native';

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

/** Guidebook-style serif, used for wall names. */
export const SerifFont = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia, "Times New Roman", serif' });

/**
 * One color per difficulty band, easiest first. `line` is bright enough to read on rock, `bar` is for
 * charts, and the light and dark tints are for grade pills.
 */
export const Difficulty = [
  { name: 'easy', line: '#7dff5a', bar: '#639922', light: { bg: '#EAF3DE', text: '#27500A' }, dark: { bg: '#27500A', text: '#C0DD97' } },
  { name: 'moderate', line: '#3fd0ff', bar: '#378ADD', light: { bg: '#E6F1FB', text: '#0C447C' }, dark: { bg: '#0C447C', text: '#B5D4F4' } },
  { name: 'hard', line: '#ffb02e', bar: '#BA7517', light: { bg: '#FAEEDA', text: '#633806' }, dark: { bg: '#633806', text: '#FAC775' } },
  { name: 'harder', line: '#ff5a5a', bar: '#E24B4A', light: { bg: '#FCEBEB', text: '#791F1F' }, dark: { bg: '#791F1F', text: '#F7C1C1' } },
] as const;

/** Line color for a route whose grade has no band. */
export const UngradedLine = '#ffffff';
