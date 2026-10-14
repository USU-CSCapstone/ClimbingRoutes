// Core data types. Everything in src/core is plain TypeScript with no React or
// React Native imports, so it can also run in Node scripts.

export type Uuid = string;

export type Discipline =
  | 'sport'
  | 'trad'
  | 'tr'
  | 'boulder'
  | 'alpine'
  | 'ice'
  | 'mixed'
  | 'aid'
  | 'dws'
  | 'snow';

export type GradeSystem = 'yds' | 'vscale' | 'french' | 'font' | 'uiaa' | 'ewbank' | 'wi';

/** The one grade we show for a climb, picked by region and discipline. */
export interface Grade {
  system: GradeSystem;
  text: string;
}

export interface Crumb {
  uuid: Uuid;
  name: string;
}

export interface LatLng {
  lat: number;
  lng: number;
}

export interface AreaSummary {
  uuid: Uuid;
  name: string;
  totalClimbs: number;
  isLeaf: boolean;
  isBoulder: boolean;
}

export interface Area extends AreaSummary {
  /** Ancestors from the country down to the parent. Excludes this area. */
  path: Crumb[];
  description: string | null;
  location: LatLng | null;
  children: AreaSummary[];
  /** Sorted left to right when OpenBeta has an order, otherwise by name. */
  climbs: ClimbSummary[];
}

export interface ClimbSummary {
  uuid: Uuid;
  name: string;
  grade: Grade | null;
  /** Every grade OpenBeta has for the climb, by system. */
  allGrades: Partial<Record<GradeSystem, string>>;
  disciplines: Discipline[];
  /** First ascent, as OpenBeta records it. */
  fa: string | null;
  leftRightIndex: number | null;
}

export interface Climb extends ClimbSummary {
  /** Ancestors from the country down to the wall the climb is on. */
  path: Crumb[];
  lengthMeters: number | null;
  bolts: number | null;
  description: string | null;
  locationText: string | null;
  protection: string | null;
  location: LatLng | null;
  /** The route's id on Mountain Project, when OpenBeta has one. */
  mpId: string | null;
}

export type SearchResult =
  | {
      kind: 'climb';
      uuid: Uuid;
      name: string;
      grade: Grade | null;
      disciplines: Discipline[];
      /** Area names from the country down to the wall. */
      path: string[];
    }
  | {
      kind: 'area';
      uuid: Uuid;
      name: string;
      totalClimbs: number;
      /** Area names from the country down to the parent. */
      path: string[];
    };

export interface SearchResults {
  areas: Extract<SearchResult, { kind: 'area' }>[];
  climbs: Extract<SearchResult, { kind: 'climb' }>[];
  /** Which list holds the closest match, so it can be shown first. */
  best: 'areas' | 'climbs';
}
