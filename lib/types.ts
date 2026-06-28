export type PlayerId = "p1" | "p2";

export interface Settings {
  players: Record<PlayerId, string>;
  /** Season-long playing handicaps (strokes given over 18 holes). 0 = scratch. */
  handicaps: Record<PlayerId, number>;
  seasonName: string;
}

export interface HoleScore {
  /** Hole number, 1-based (absolute: 10–18 for a back nine of an 18) */
  hole: number;
  par: number;
  /** Stroke index / handicap rank of the hole (1 = hardest). Used to allocate net strokes. */
  si: number;
  /** strokes keyed by player id; null/undefined means not yet entered */
  strokes: Partial<Record<PlayerId, number | null>>;
}

export interface Round {
  id: string;
  date: string; // ISO date (yyyy-mm-dd)
  course: string;
  /** 9 or 18 */
  holeCount: 9 | 18;
  /** Which nine was played when holeCount === 9 */
  nine?: "front" | "back" | "single";
  holes: HoleScore[];
  /** Snapshot of each player's handicap at the time the round was played. */
  handicaps?: Record<PlayerId, number>;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

/** A reusable course layout (pars + stroke indexes) you can save and reload. */
export interface CourseTemplate {
  id: string;
  name: string;
  /** Town / state label, e.g. "Stamford, VT". */
  town?: string;
  /** Physical holes on the course (9 or 18). */
  holeCount: 9 | 18;
  /** Par per physical hole (length === holeCount). */
  pars: number[];
  /** Stroke index per physical hole (length === holeCount). */
  sis: number[];
  /** A 9-hole course commonly played as two loops of 18 (back nine = front nine). */
  playsTwice?: boolean;
  /** False/undefined = per-hole pars are approximate and worth confirming. */
  parVerified?: boolean;
  /** Approximate driving distance in miles (for the roster list). */
  distanceMi?: number;
  notes?: string;
  createdAt: number;
}

export interface PlayerRoundTotal {
  strokes: number;
  par: number;
  toPar: number;
  holesPlayed: number;
  /** Net strokes after handicap allocation over the holes played. */
  net: number;
  /** Handicap strokes received over the holes played. */
  strokesReceived: number;
}

export interface MatchResult {
  /** Holes won outright by each player (gross). */
  holesWon: Record<PlayerId, number>;
  halved: number;
  /** Final margin in holes (>0). 0 means all square. */
  margin: number;
  /** Leader when decided, or "tie". null if no holes played. */
  leader: PlayerId | "tie" | null;
  /** Classic match-play result string, e.g. "3&2", "2 up", "AS". */
  label: string;
  /** True once the match was mathematically clinched (closed out). */
  closedOut: boolean;
}

export interface RoundTotals {
  byPlayer: Record<PlayerId, PlayerRoundTotal>;
  par: number;
  /** Gross winner: player id, "tie", or null if incomplete. */
  winner: PlayerId | "tie" | null;
  /** Net winner (handicap-adjusted): player id, "tie", or null if incomplete. */
  netWinner: PlayerId | "tie" | null;
  /** True when both players have a score on every hole. */
  complete: boolean;
  match: MatchResult;
}
