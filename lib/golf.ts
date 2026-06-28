import type {
  MatchResult,
  PlayerId,
  Round,
  RoundTotals,
  Settings,
} from "./types";

export const PLAYER_IDS: PlayerId[] = ["p1", "p2"];

export const DEFAULT_SETTINGS: Settings = {
  players: { p1: "Player 1", p2: "Player 2" },
  handicaps: { p1: 0, p2: 0 },
  seasonName: "Our Golf Season",
};

/** Standard par + stroke-index layout used to seed a fresh scorecard. */
const DEFAULT_PAR_18 = [4, 4, 5, 3, 4, 4, 3, 5, 4, 4, 4, 3, 5, 4, 4, 3, 5, 4];
// Unique 1–18 ranking (odds on the front, evens on the back — a common layout).
const DEFAULT_SI_18 = [7, 3, 15, 5, 11, 1, 17, 9, 13, 8, 4, 16, 6, 12, 2, 18, 10, 14];

function num(v: number | null | undefined): number | null {
  return typeof v === "number" && v > 0 ? v : null;
}

export function defaultHoles(
  holeCount: 9 | 18,
  nine: "front" | "back" | "single" = "front"
) {
  let pars: number[];
  if (holeCount === 18) {
    pars = DEFAULT_PAR_18;
  } else if (nine === "back") {
    pars = DEFAULT_PAR_18.slice(9, 18);
  } else {
    pars = DEFAULT_PAR_18.slice(0, 9);
  }
  return pars.map((par, i) => ({
    hole: i + 1,
    par,
    // 18-hole rounds use the real stroke-index table; a standalone nine ranks 1–9 by hole.
    si: holeCount === 18 ? DEFAULT_SI_18[i] : i + 1,
    strokes: { p1: null as number | null, p2: null as number | null },
  }));
}

export function newRound(
  holeCount: 9 | 18 = 18,
  handicaps?: Record<PlayerId, number>
): Round {
  const now = Date.now();
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `r_${now}_${Math.random().toString(36).slice(2, 8)}`,
    date: new Date().toISOString().slice(0, 10),
    course: "",
    holeCount,
    nine: holeCount === 9 ? "front" : undefined,
    holes: defaultHoles(holeCount),
    handicaps: handicaps ? { ...handicaps } : { p1: 0, p2: 0 },
    notes: "",
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Allocate a player's handicap strokes across the holes of a round using stroke
 * index (hardest holes get strokes first; wraps for handicaps > hole count).
 * Handicap is halved for a 9-hole round. Returns strokes received per hole,
 * indexed to `round.holes`.
 */
export function allocateStrokes(round: Round, handicap: number): number[] {
  const n = round.holes.length;
  const received = new Array(n).fill(0);
  const hcp = Math.round(handicap);
  if (!hcp || hcp <= 0 || n === 0) return received;
  const total = n <= 9 ? Math.round(hcp / 2) : hcp;
  const order = round.holes
    .map((h, i) => ({ i, si: h.si ?? i + 1 }))
    .sort((a, b) => a.si - b.si);
  for (let k = 0; k < total; k++) {
    received[order[k % n].i] += 1;
  }
  return received;
}

function handicapsOf(round: Round): Record<PlayerId, number> {
  return round.handicaps ?? { p1: 0, p2: 0 };
}

export function matchResult(round: Round): MatchResult {
  const holesWon = { p1: 0, p2: 0 } as Record<PlayerId, number>;
  let halved = 0;
  let diff = 0; // positive = p1 ahead

  const bothCount = round.holes.filter(
    (h) => num(h.strokes.p1) !== null && num(h.strokes.p2) !== null
  ).length;
  let remaining = bothCount;

  let decided = false;
  let closeMargin = 0;
  let closeRemaining = 0;
  let closeLeader: PlayerId | null = null;

  for (const h of round.holes) {
    const a = num(h.strokes.p1);
    const b = num(h.strokes.p2);
    if (a === null || b === null) continue;
    remaining--;
    if (a < b) {
      holesWon.p1++;
      diff++;
    } else if (b < a) {
      holesWon.p2++;
      diff--;
    } else {
      halved++;
    }
    if (!decided && Math.abs(diff) > remaining) {
      decided = true;
      closeMargin = Math.abs(diff);
      closeRemaining = remaining;
      closeLeader = diff > 0 ? "p1" : "p2";
    }
  }

  if (bothCount === 0) {
    return { holesWon, halved, margin: 0, leader: null, label: "—", closedOut: false };
  }

  if (decided && closeRemaining > 0) {
    return {
      holesWon,
      halved,
      margin: closeMargin,
      leader: closeLeader,
      label: `${closeMargin}&${closeRemaining}`,
      closedOut: true,
    };
  }

  const margin = Math.abs(diff);
  const leader: PlayerId | "tie" = margin === 0 ? "tie" : diff > 0 ? "p1" : "p2";
  return {
    holesWon,
    halved,
    margin,
    leader,
    label: margin === 0 ? "AS" : `${margin} up`,
    closedOut: false,
  };
}

export function roundTotals(round: Round): RoundTotals {
  const hcp = handicapsOf(round);
  const received: Record<PlayerId, number[]> = {
    p1: allocateStrokes(round, hcp.p1),
    p2: allocateStrokes(round, hcp.p2),
  };

  const byPlayer = {
    p1: { strokes: 0, par: 0, toPar: 0, holesPlayed: 0, net: 0, strokesReceived: 0 },
    p2: { strokes: 0, par: 0, toPar: 0, holesPlayed: 0, net: 0, strokesReceived: 0 },
  } as RoundTotals["byPlayer"];

  let par = 0;
  round.holes.forEach((h, idx) => {
    par += h.par;
    for (const pid of PLAYER_IDS) {
      const s = num(h.strokes[pid]);
      if (s !== null) {
        byPlayer[pid].strokes += s;
        byPlayer[pid].par += h.par;
        byPlayer[pid].holesPlayed += 1;
        byPlayer[pid].strokesReceived += received[pid][idx];
        byPlayer[pid].net += s - received[pid][idx];
      }
    }
  });

  for (const pid of PLAYER_IDS) {
    byPlayer[pid].toPar = byPlayer[pid].strokes - byPlayer[pid].par;
  }

  const complete =
    round.holes.length > 0 &&
    byPlayer.p1.holesPlayed === round.holes.length &&
    byPlayer.p2.holesPlayed === round.holes.length;

  function decide(a: number, b: number): PlayerId | "tie" | null {
    if (!complete) return null;
    if (a < b) return "p1";
    if (b < a) return "p2";
    return "tie";
  }

  return {
    byPlayer,
    par,
    winner: decide(byPlayer.p1.strokes, byPlayer.p2.strokes),
    netWinner: decide(byPlayer.p1.net, byPlayer.p2.net),
    complete,
    match: matchResult(round),
  };
}

export function isComplete(round: Round): boolean {
  if (round.holes.length === 0) return false;
  return round.holes.every(
    (h) => num(h.strokes.p1) !== null && num(h.strokes.p2) !== null
  );
}

export interface SeasonStats {
  rounds: number;
  completedRounds: number;
  byPlayer: Record<
    PlayerId,
    {
      wins: number; // gross
      losses: number;
      ties: number;
      netWins: number;
      netLosses: number;
      netTies: number;
      matchWins: number;
      matchLosses: number;
      matchHalved: number;
      totalStrokes: number;
      totalPar: number;
      holesPlayed: number;
      avgToPar: number;
      avgPerHole: number;
      bestRoundToPar: number | null;
      bestRoundId: string | null;
      eagles: number;
      birdies: number;
      pars: number;
      bogeys: number;
      doublePlus: number;
    }
  >;
}

export function emptyPlayerStat() {
  return {
    wins: 0,
    losses: 0,
    ties: 0,
    netWins: 0,
    netLosses: 0,
    netTies: 0,
    matchWins: 0,
    matchLosses: 0,
    matchHalved: 0,
    totalStrokes: 0,
    totalPar: 0,
    holesPlayed: 0,
    avgToPar: 0,
    avgPerHole: 0,
    bestRoundToPar: null as number | null,
    bestRoundId: null as string | null,
    eagles: 0,
    birdies: 0,
    pars: 0,
    bogeys: 0,
    doublePlus: 0,
  };
}

/**
 * Season aggregates. Only fully completed rounds count toward every stat here —
 * in-progress rounds show up in History but never skew averages, records, or
 * the distribution. This keeps Standings, Stats, and Trends consistent.
 */
export function seasonStats(rounds: Round[]): SeasonStats {
  const completed = rounds.filter(isComplete);
  const stats: SeasonStats = {
    rounds: rounds.length,
    completedRounds: completed.length,
    byPlayer: { p1: emptyPlayerStat(), p2: emptyPlayerStat() },
  };

  for (const round of completed) {
    const t = roundTotals(round);
    for (const pid of PLAYER_IDS) {
      const ps = stats.byPlayer[pid];
      const pt = t.byPlayer[pid];
      ps.totalStrokes += pt.strokes;
      ps.totalPar += pt.par;
      ps.holesPlayed += pt.holesPlayed;

      for (const h of round.holes) {
        const s = h.strokes[pid];
        if (typeof s === "number" && s > 0) {
          const diff = s - h.par;
          if (diff <= -2) ps.eagles += 1;
          else if (diff === -1) ps.birdies += 1;
          else if (diff === 0) ps.pars += 1;
          else if (diff === 1) ps.bogeys += 1;
          else ps.doublePlus += 1;
        }
      }

      if (ps.bestRoundToPar === null || pt.toPar < ps.bestRoundToPar) {
        ps.bestRoundToPar = pt.toPar;
        ps.bestRoundId = round.id;
      }
    }

    // gross record
    if (t.winner === "p1") {
      stats.byPlayer.p1.wins++;
      stats.byPlayer.p2.losses++;
    } else if (t.winner === "p2") {
      stats.byPlayer.p2.wins++;
      stats.byPlayer.p1.losses++;
    } else if (t.winner === "tie") {
      stats.byPlayer.p1.ties++;
      stats.byPlayer.p2.ties++;
    }

    // net record
    if (t.netWinner === "p1") {
      stats.byPlayer.p1.netWins++;
      stats.byPlayer.p2.netLosses++;
    } else if (t.netWinner === "p2") {
      stats.byPlayer.p2.netWins++;
      stats.byPlayer.p1.netLosses++;
    } else if (t.netWinner === "tie") {
      stats.byPlayer.p1.netTies++;
      stats.byPlayer.p2.netTies++;
    }

    // match-play record
    if (t.match.leader === "p1") {
      stats.byPlayer.p1.matchWins++;
      stats.byPlayer.p2.matchLosses++;
    } else if (t.match.leader === "p2") {
      stats.byPlayer.p2.matchWins++;
      stats.byPlayer.p1.matchLosses++;
    } else if (t.match.leader === "tie") {
      stats.byPlayer.p1.matchHalved++;
      stats.byPlayer.p2.matchHalved++;
    }
  }

  for (const pid of PLAYER_IDS) {
    const ps = stats.byPlayer[pid];
    ps.avgPerHole = ps.holesPlayed > 0 ? ps.totalStrokes / ps.holesPlayed : 0;
    ps.avgToPar =
      stats.completedRounds > 0
        ? (ps.totalStrokes - ps.totalPar) / stats.completedRounds
        : 0;
  }

  return stats;
}

export function scoreLabel(diff: number): string {
  if (diff <= -3) return "Albatross";
  if (diff === -2) return "Eagle";
  if (diff === -1) return "Birdie";
  if (diff === 0) return "Par";
  if (diff === 1) return "Bogey";
  if (diff === 2) return "Double";
  return `+${diff}`;
}

export function formatToPar(toPar: number): string {
  if (toPar === 0) return "E";
  return toPar > 0 ? `+${toPar}` : `${toPar}`;
}
