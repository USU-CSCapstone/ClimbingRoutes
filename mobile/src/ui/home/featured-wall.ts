// The wall shown at the top of Home: Date Wall, as two stills captured from the
// 3D view at 1500 × 1000 with their edges faded into the view's backdrop. One
// has the routes drawn on (for its card), one doesn't (Home draws them itself,
// so each can light up or step back). Loading the model here would cost a 36 MB
// download. Retake both stills and re-trace the routes if the lines are redrawn.
import { Difficulty } from '@/constants/theme';

export const FEATURED_WALL = {
  uuid: '8c45d40d-363d-5a9b-9659-3df50c5d3916',
  name: 'Date Wall',
  /** Both stills' width over their height. */
  aspect: 1.5,
  plain: require('@/assets/images/home-wall-plain.jpg'),
  drawn: require('@/assets/images/home-wall.jpg'),
};

export interface FeaturedRoute {
  /** As OpenBeta names it, which is how its page on the 3D wall is found. */
  name: string;
  grade: string;
  /** The color the 3D view draws it in. */
  color: string;
  /** From the ground up, as shares of the still's width and height, traced from the drawn still. */
  points: [number, number][];
}

/** Lowest foot first, which is the order their tags stack in. */
export const FEATURED_ROUTES: FeaturedRoute[] = [
  {
    name: 'Smitten',
    grade: '5.9+',
    color: Difficulty[1].line,
    points: [[0.232,0.889],[0.2311,0.869],[0.232,0.849],[0.2343,0.829],[0.2347,0.809],[0.2357,0.789],[0.2363,0.769],[0.236,0.749],[0.2337,0.729],[0.231,0.709],[0.2287,0.689],[0.226,0.669],[0.223,0.649],[0.2227,0.629],[0.222,0.609],[0.2257,0.589],[0.227,0.569],[0.2287,0.549],[0.232,0.529],[0.2293,0.509],[0.2273,0.489],[0.225,0.469],[0.223,0.449],[0.2213,0.429],[0.219,0.409],[0.2207,0.389],[0.2247,0.369],[0.2273,0.349],[0.2293,0.329],[0.2317,0.309],[0.2367,0.289],[0.234,0.269],[0.2313,0.249],[0.231,0.229],[0.2302,0.215]],
  },
  {
    name: 'Hooked',
    grade: '5.10a',
    color: Difficulty[2].line,
    points: [[0.3447,0.829],[0.3453,0.809],[0.3473,0.789],[0.3487,0.769],[0.351,0.749],[0.35,0.729],[0.3447,0.709],[0.34,0.689],[0.339,0.669],[0.3413,0.649],[0.344,0.629],[0.346,0.609],[0.3487,0.589],[0.351,0.569],[0.354,0.549],[0.356,0.529],[0.355,0.509],[0.355,0.489],[0.3557,0.469],[0.354,0.449],[0.345,0.429],[0.335,0.409],[0.326,0.389],[0.316,0.369],[0.3207,0.349],[0.3297,0.329],[0.3347,0.309],[0.3363,0.289],[0.3287,0.269],[0.3267,0.249],[0.324,0.229],[0.3225,0.2],[0.3212,0.178]],
  },
  {
    name: 'NCMO',
    grade: '5.6',
    color: Difficulty[0].line,
    points: [[0.3793,0.809],[0.3857,0.789],[0.39,0.769],[0.395,0.749],[0.401,0.729],[0.408,0.709],[0.4083,0.689],[0.4247,0.669],[0.4323,0.649],[0.4357,0.629],[0.4423,0.609],[0.4437,0.589],[0.444,0.569],[0.4467,0.549],[0.453,0.529],[0.47,0.509],[0.4927,0.489],[0.4787,0.469],[0.4657,0.449],[0.448,0.429],[0.4363,0.409],[0.43,0.389],[0.4272,0.38]],
  },
];
