/**
 * Player ids are arbitrary strings. The two original players keep the legacy
 * ids "p1"/"p2" so rounds saved before the multi-player roster still resolve;
 * players added later get uuids.
 */
export type PlayerId = string;

export interface Player {
  id: PlayerId;
  name: string;
  handicap: number;
  /** Hex color used for avatars and trend lines. */
  color: string;
  createdAt: number;
  archived?: boolean;
}

export interface Settings {
  seasonName: string;
  /** Hole count pre-selected when starting a new round. */
  defaultHoles: 9 | 18;
  /** Scoring view shown first on Standings. */
  defaultMode: "gross" | "net" | "match";
}

export interface HoleScore {
  /** Hole number, 1-based (absolute: 10–18 for a back nine of an 18) */
  hole: number;
  par: number;
  /** Stroke index / handicap rank of the hole (1 = hardest). */
  si: number;
  /** strokes keyed by player id; null/undefined means not yet entered */
  strokes: Record<PlayerId, number | null>;
}

export interface Round {
  id: string;
  date: string; // ISO date (yyyy-mm-dd)
  course: string;
  holeCount: 9 | 18;
  nine?: "front" | "back" | "single";
  /** Players participating in this round. */
  playerIds: PlayerId[];
  holes: HoleScore[];
  /** Snapshot of each participant's handicap at the time the round was played. */
  handicaps: Record<PlayerId, number>;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

/** A reusable course layout (pars + stroke indexes) you can save and reload. */
export interface CourseTemplate {
  id: string;
  name: string;
  town?: string;
  holeCount: 9 | 18;
  pars: number[];
  sis: number[];
  playsTwice?: boolean;
  parVerified?: boolean;
  distanceMi?: number;
  notes?: string;
  createdAt: number;
}

export interface PlayerRoundTotal {
  strokes: number;
  par: number;
  toPar: number;
  holesPlayed: number;
  net: number;
  strokesReceived: number;
}

export interface MatchResult {
  /** The two player ids the match is between. */
  players: [PlayerId, PlayerId];
  holesWon: Record<PlayerId, number>;
  halved: number;
  margin: number;
  leader: PlayerId | "tie" | null;
  label: string;
  closedOut: boolean;
}

export interface RoundTotals {
  byPlayer: Record<PlayerId, PlayerRoundTotal>;
  players: PlayerId[];
  par: number;
  /** Gross winner: player id, "tie", or null if incomplete. */
  winner: PlayerId | "tie" | null;
  /** Net winner (handicap-adjusted). */
  netWinner: PlayerId | "tie" | null;
  complete: boolean;
  /** Match-play result — only computed for two-player rounds, else null. */
  match: MatchResult | null;
}
