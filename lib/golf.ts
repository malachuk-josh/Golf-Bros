import type { PlayerId, Round, RoundTotals, Settings } from "./types";

export const PLAYER_IDS: PlayerId[] = ["p1", "p2"];

export const DEFAULT_SETTINGS: Settings = {
  players: { p1: "Player 1", p2: "Player 2" },
  seasonName: "Our Golf Season",
};

/** Standard par layout used to seed a fresh scorecard. */
const DEFAULT_PAR_18 = [4, 4, 5, 3, 4, 4, 3, 5, 4, 4, 4, 3, 5, 4, 4, 3, 5, 4];

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
    strokes: { p1: null as number | null, p2: null as number | null },
  }));
}

export function newRound(holeCount: 9 | 18 = 18): Round {
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
    notes: "",
    createdAt: now,
    updatedAt: now,
  };
}

export function roundTotals(round: Round): RoundTotals {
  const byPlayer = {
    p1: { strokes: 0, par: 0, toPar: 0, holesPlayed: 0 },
    p2: { strokes: 0, par: 0, toPar: 0, holesPlayed: 0 },
  } as RoundTotals["byPlayer"];

  let par = 0;
  for (const h of round.holes) {
    par += h.par;
    for (const pid of PLAYER_IDS) {
      const s = h.strokes[pid];
      if (typeof s === "number" && s > 0) {
        byPlayer[pid].strokes += s;
        byPlayer[pid].par += h.par;
        byPlayer[pid].holesPlayed += 1;
      }
    }
  }

  for (const pid of PLAYER_IDS) {
    byPlayer[pid].toPar = byPlayer[pid].strokes - byPlayer[pid].par;
  }

  const p1Done = byPlayer.p1.holesPlayed === round.holes.length;
  const p2Done = byPlayer.p2.holesPlayed === round.holes.length;
  let winner: RoundTotals["winner"] = null;
  if (p1Done && p2Done) {
    if (byPlayer.p1.strokes < byPlayer.p2.strokes) winner = "p1";
    else if (byPlayer.p2.strokes < byPlayer.p1.strokes) winner = "p2";
    else winner = "tie";
  }

  return { byPlayer, par, winner };
}

export interface SeasonStats {
  rounds: number;
  byPlayer: Record<
    PlayerId,
    {
      wins: number;
      losses: number;
      ties: number;
      totalStrokes: number;
      totalPar: number;
      holesPlayed: number;
      roundsCompleted: number;
      avgToPar: number; // average strokes-to-par per completed round
      avgPerHole: number; // average strokes per hole played
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
    totalStrokes: 0,
    totalPar: 0,
    holesPlayed: 0,
    roundsCompleted: 0,
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

export function seasonStats(rounds: Round[]): SeasonStats {
  const stats: SeasonStats = {
    rounds: rounds.length,
    byPlayer: { p1: emptyPlayerStat(), p2: emptyPlayerStat() },
  };

  for (const round of rounds) {
    const t = roundTotals(round);
    for (const pid of PLAYER_IDS) {
      const ps = stats.byPlayer[pid];
      const pt = t.byPlayer[pid];
      ps.totalStrokes += pt.strokes;
      ps.totalPar += pt.par;
      ps.holesPlayed += pt.holesPlayed;

      // per-hole scoring distribution
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

      const completed = pt.holesPlayed === round.holes.length && round.holes.length > 0;
      if (completed) {
        ps.roundsCompleted += 1;
        if (ps.bestRoundToPar === null || pt.toPar < ps.bestRoundToPar) {
          ps.bestRoundToPar = pt.toPar;
          ps.bestRoundId = round.id;
        }
      }
    }

    if (t.winner === "p1") {
      stats.byPlayer.p1.wins += 1;
      stats.byPlayer.p2.losses += 1;
    } else if (t.winner === "p2") {
      stats.byPlayer.p2.wins += 1;
      stats.byPlayer.p1.losses += 1;
    } else if (t.winner === "tie") {
      stats.byPlayer.p1.ties += 1;
      stats.byPlayer.p2.ties += 1;
    }
  }

  for (const pid of PLAYER_IDS) {
    const ps = stats.byPlayer[pid];
    ps.avgPerHole = ps.holesPlayed > 0 ? ps.totalStrokes / ps.holesPlayed : 0;
    ps.avgToPar =
      ps.roundsCompleted > 0
        ? (ps.totalStrokes - ps.totalPar) / ps.roundsCompleted
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
