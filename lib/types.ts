export type PlayerId = "p1" | "p2";

export interface Settings {
  players: Record<PlayerId, string>;
  seasonName: string;
}

export interface HoleScore {
  /** Hole number, 1-based */
  hole: number;
  par: number;
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
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface RoundTotals {
  byPlayer: Record<PlayerId, { strokes: number; par: number; toPar: number; holesPlayed: number }>;
  par: number;
  /** winner player id, or "tie", or null if incomplete */
  winner: PlayerId | "tie" | null;
}
