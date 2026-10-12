// Area and climb lookups by uuid, mapped from OpenBeta's GraphQL shape to core types.
import { pickGrade } from '../grades';
import type {
  Area,
  AreaSummary,
  Climb,
  ClimbSummary,
  Crumb,
  Discipline,
  GradeSystem,
  LatLng,
  Uuid,
} from '../types';
import { gql } from './graphql';

type ObGrades = Partial<Record<GradeSystem, string | null>> | null;

interface ObType {
  sport?: boolean;
  trad?: boolean;
  tr?: boolean;
  bouldering?: boolean;
  alpine?: boolean;
  ice?: boolean;
  mixed?: boolean;
  aid?: boolean;
  snow?: boolean;
  deepwatersolo?: boolean;
}

interface ObClimbSummary {
  uuid: string;
  name: string;
  grades: ObGrades;
  type: ObType | null;
  metadata: { leftRightIndex: number | null } | null;
}

interface ObClimb extends ObClimbSummary {
  fa: string | null;
  length: number | null;
  boltsCount: number | null;
  ancestors: string[];
  pathTokens: string[];
  content: { description: string | null; location: string | null; protection: string | null } | null;
  metadata: { leftRightIndex: number | null; lat: number | null; lng: number | null } | null;
}

interface ObAreaSummary {
  uuid: string;
  area_name: string;
  totalClimbs: number | null;
  metadata: { leaf: boolean | null; isBoulder: boolean | null } | null;
}

interface ObArea extends ObAreaSummary {
  ancestors: string[];
  pathTokens: string[];
  content: { description: string | null } | null;
  metadata: {
    leaf: boolean | null;
    isBoulder: boolean | null;
    lat: number | null;
    lng: number | null;
  } | null;
  children: ObAreaSummary[];
  climbs: ObClimbSummary[];
}

const GRADES = 'grades { yds vscale french font uiaa ewbank wi }';
const TYPE = 'type { sport trad tr bouldering alpine ice mixed aid snow deepwatersolo }';

const AREA_QUERY = `
query Area($uuid: ID) {
  area(uuid: $uuid) {
    uuid area_name totalClimbs ancestors pathTokens
    content { description }
    metadata { leaf isBoulder lat lng }
    children { uuid area_name totalClimbs metadata { leaf isBoulder } }
    climbs { uuid name ${GRADES} ${TYPE} metadata { leftRightIndex } }
  }
}`;

const CLIMB_QUERY = `
query Climb($uuid: ID) {
  climb(uuid: $uuid) {
    uuid name fa length boltsCount ancestors pathTokens
    ${GRADES} ${TYPE}
    content { description location protection }
    metadata { leftRightIndex lat lng }
  }
}`;

export async function fetchArea(uuid: Uuid, signal?: AbortSignal): Promise<Area | null> {
  const { area } = await gql<{ area: ObArea | null }>(AREA_QUERY, { uuid }, signal);
  if (!area) return null;
  const path = toCrumbs(area.ancestors, area.pathTokens);
  return {
    ...toAreaSummary(area),
    path: path.slice(0, -1), // ancestors include the area itself
    description: text(area.content?.description),
    location: toLatLng(area.metadata?.lat, area.metadata?.lng),
    children: area.children.map(toAreaSummary).sort((a, b) => a.name.localeCompare(b.name)),
    climbs: area.climbs.map(toClimbSummary).sort(byLeftRight),
  };
}

export async function fetchClimb(uuid: Uuid, signal?: AbortSignal): Promise<Climb | null> {
  const { climb } = await gql<{ climb: ObClimb | null }>(CLIMB_QUERY, { uuid }, signal);
  if (!climb) return null;
  const allGrades: Climb['allGrades'] = {};
  for (const [system, value] of Object.entries(climb.grades ?? {})) {
    if (value) allGrades[system as GradeSystem] = value;
  }
  return {
    ...toClimbSummary(climb),
    path: toCrumbs(climb.ancestors, climb.pathTokens),
    allGrades,
    lengthMeters: positive(climb.length),
    bolts: positive(climb.boltsCount),
    fa: text(climb.fa),
    description: text(climb.content?.description),
    locationText: text(climb.content?.location),
    protection: text(climb.content?.protection),
    location: toLatLng(climb.metadata?.lat, climb.metadata?.lng),
  };
}

function toAreaSummary(a: ObAreaSummary): AreaSummary {
  return {
    uuid: a.uuid,
    name: a.area_name,
    totalClimbs: a.totalClimbs ?? 0,
    isLeaf: a.metadata?.leaf ?? false,
    isBoulder: a.metadata?.isBoulder ?? false,
  };
}

function toClimbSummary(c: ObClimbSummary): ClimbSummary {
  const disciplines = toDisciplines(c.type);
  const lr = c.metadata?.leftRightIndex;
  return {
    uuid: c.uuid,
    name: c.name,
    grade: pickGrade(c.grades, disciplines),
    disciplines,
    leftRightIndex: lr != null && lr >= 0 ? lr : null,
  };
}

const DISCIPLINE_FLAGS: [keyof ObType, Discipline][] = [
  ['sport', 'sport'],
  ['trad', 'trad'],
  ['tr', 'tr'],
  ['bouldering', 'boulder'],
  ['alpine', 'alpine'],
  ['ice', 'ice'],
  ['mixed', 'mixed'],
  ['aid', 'aid'],
  ['deepwatersolo', 'dws'],
  ['snow', 'snow'],
];

function toDisciplines(type: ObType | null): Discipline[] {
  if (!type) return [];
  return DISCIPLINE_FLAGS.filter(([flag]) => type[flag]).map(([, d]) => d);
}

/** OpenBeta keeps ancestor uuids and names in two parallel arrays. */
function toCrumbs(uuids: string[], names: string[]): Crumb[] {
  return uuids.map((uuid, i) => ({ uuid, name: names[i] ?? '' }));
}

/** Climbs with a left-to-right index come first in that order, the rest by name. */
function byLeftRight(a: ClimbSummary, b: ClimbSummary): number {
  if (a.leftRightIndex != null && b.leftRightIndex != null) {
    return a.leftRightIndex - b.leftRightIndex;
  }
  if (a.leftRightIndex != null) return -1;
  if (b.leftRightIndex != null) return 1;
  return a.name.localeCompare(b.name);
}

function toLatLng(lat: number | null | undefined, lng: number | null | undefined): LatLng | null {
  return lat != null && lng != null ? { lat, lng } : null;
}

/** OpenBeta uses -1 or 0 for unknown lengths and bolt counts. */
function positive(n: number | null | undefined): number | null {
  return n != null && n > 0 ? n : null;
}

function text(s: string | null | undefined): string | null {
  const t = s?.trim();
  return t ? t : null;
}
