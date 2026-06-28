import type {
  CourseTemplate,
  MatchResult,
  Player,
  PlayerId,
  Round,
  RoundTotals,
  Settings,
} from "./types";

export const DEFAULT_SETTINGS: Settings = {
  seasonName: "Our Golf Season",
};

/** Palette assigned to new players (for avatars + trend lines). */
export const PLAYER_COLORS = [
  "#247334",
  "#c2410c",
  "#1d4ed8",
  "#7c3aed",
  "#db2777",
  "#0891b2",
  "#ca8a04",
  "#475569",
];

export function nextPlayerColor(existing: Player[]): string {
  const used = new Set(existing.map((p) => p.color));
  return PLAYER_COLORS.find((c) => !used.has(c)) || PLAYER_COLORS[existing.length % PLAYER_COLORS.length];
}

export function uid(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

const DEFAULT_PAR_18 = [4, 4, 5, 3, 4, 4, 3, 5, 4, 4, 4, 3, 5, 4, 4, 3, 5, 4];
const DEFAULT_SI_18 = [7, 3, 15, 5, 11, 1, 17, 9, 13, 8, 4, 16, 6, 12, 2, 18, 10, 14];

function num(v: number | null | undefined): number | null {
  return typeof v === "number" && v > 0 ? v : null;
}

/** Participants in a round, tolerant of legacy rounds without `playerIds`. */
export function roundPlayers(round: Round): PlayerId[] {
  if (round.playerIds && round.playerIds.length) return round.playerIds;
  if (round.handicaps && Object.keys(round.handicaps).length)
    return Object.keys(round.handicaps);
  const first = round.holes?.[0]?.strokes;
  if (first) return Object.keys(first);
  return ["p1", "p2"];
}

/**
 * Backfill a round to the current shape so it can be edited safely. Rounds saved
 * before the multi-player migration have no `playerIds` and may be missing
 * handicaps, stroke indexes, or per-player stroke keys — this fills those in.
 */
export function normalizeRound(round: Round): Round {
  const ids = roundPlayers(round);
  const handicaps: Record<PlayerId, number> = { ...(round.handicaps || {}) };
  for (const id of ids) if (handicaps[id] == null) handicaps[id] = 0;
  const holes = (round.holes || []).map((h, i) => {
    const strokes: Record<PlayerId, number | null> = { ...(h.strokes || {}) };
    for (const id of ids) if (!(id in strokes)) strokes[id] = null;
    return { ...h, si: h.si ?? i + 1, strokes };
  });
  return { ...round, playerIds: ids, handicaps, holes };
}

export function defaultHoles(
  holeCount: 9 | 18,
  players: PlayerId[],
  nine: "front" | "back" | "single" = "front"
) {
  let pars: number[];
  if (holeCount === 18) pars = DEFAULT_PAR_18;
  else if (nine === "back") pars = DEFAULT_PAR_18.slice(9, 18);
  else pars = DEFAULT_PAR_18.slice(0, 9);

  const blankStrokes = () =>
    Object.fromEntries(players.map((p) => [p, null])) as Record<PlayerId, number | null>;

  return pars.map((par, i) => ({
    hole: i + 1,
    par,
    si: holeCount === 18 ? DEFAULT_SI_18[i] : i + 1,
    strokes: blankStrokes(),
  }));
}

export function newRound(
  holeCount: 9 | 18,
  players: Player[]
): Round {
  const now = Date.now();
  const ids = players.map((p) => p.id);
  return {
    id: uid(),
    date: new Date().toISOString().slice(0, 10),
    course: "",
    holeCount,
    nine: holeCount === 9 ? "front" : undefined,
    playerIds: ids,
    holes: defaultHoles(holeCount, ids),
    handicaps: Object.fromEntries(players.map((p) => [p.id, p.handicap])),
    notes: "",
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Allocate a player's handicap strokes across the holes of a round using stroke
 * index (hardest holes first; wraps for handicaps > hole count; halved for 9s).
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
  for (let k = 0; k < total; k++) received[order[k % n].i] += 1;
  return received;
}

export function matchResult(round: Round, a: PlayerId, b: PlayerId): MatchResult {
  const holesWon = { [a]: 0, [b]: 0 } as Record<PlayerId, number>;
  let halved = 0;
  let diff = 0; // positive = a ahead

  const bothCount = round.holes.filter(
    (h) => num(h.strokes[a]) !== null && num(h.strokes[b]) !== null
  ).length;
  let remaining = bothCount;
  let decided = false;
  let closeMargin = 0;
  let closeRemaining = 0;
  let closeLeader: PlayerId | null = null;

  for (const h of round.holes) {
    const sa = num(h.strokes[a]);
    const sb = num(h.strokes[b]);
    if (sa === null || sb === null) continue;
    remaining--;
    if (sa < sb) {
      holesWon[a]++;
      diff++;
    } else if (sb < sa) {
      holesWon[b]++;
      diff--;
    } else halved++;
    if (!decided && Math.abs(diff) > remaining) {
      decided = true;
      closeMargin = Math.abs(diff);
      closeRemaining = remaining;
      closeLeader = diff > 0 ? a : b;
    }
  }

  if (bothCount === 0)
    return { players: [a, b], holesWon, halved, margin: 0, leader: null, label: "—", closedOut: false };

  if (decided && closeRemaining > 0)
    return {
      players: [a, b],
      holesWon,
      halved,
      margin: closeMargin,
      leader: closeLeader,
      label: `${closeMargin}&${closeRemaining}`,
      closedOut: true,
    };

  const margin = Math.abs(diff);
  const leader: PlayerId | "tie" = margin === 0 ? "tie" : diff > 0 ? a : b;
  return {
    players: [a, b],
    holesWon,
    halved,
    margin,
    leader,
    label: margin === 0 ? "AS" : `${margin} up`,
    closedOut: false,
  };
}

export function roundTotals(round: Round): RoundTotals {
  const players = roundPlayers(round);
  const hcp = round.handicaps || {};
  const received: Record<PlayerId, number[]> = {};
  for (const pid of players) received[pid] = allocateStrokes(round, hcp[pid] ?? 0);

  const byPlayer: RoundTotals["byPlayer"] = {};
  for (const pid of players)
    byPlayer[pid] = { strokes: 0, par: 0, toPar: 0, holesPlayed: 0, net: 0, strokesReceived: 0 };

  let par = 0;
  round.holes.forEach((h, idx) => {
    par += h.par;
    for (const pid of players) {
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
  for (const pid of players) byPlayer[pid].toPar = byPlayer[pid].strokes - byPlayer[pid].par;

  const complete =
    round.holes.length > 0 &&
    players.length > 0 &&
    players.every((pid) => byPlayer[pid].holesPlayed === round.holes.length);

  function bestBy(metric: (pid: PlayerId) => number): PlayerId | "tie" | null {
    if (!complete) return null;
    let min = Infinity;
    let count = 0;
    let who: PlayerId = players[0];
    for (const pid of players) {
      const v = metric(pid);
      if (v < min) {
        min = v;
        who = pid;
        count = 1;
      } else if (v === min) count++;
    }
    return count > 1 ? "tie" : who;
  }

  return {
    byPlayer,
    players,
    par,
    winner: bestBy((pid) => byPlayer[pid].strokes),
    netWinner: bestBy((pid) => byPlayer[pid].net),
    complete,
    match:
      players.length === 2 ? matchResult(round, players[0], players[1]) : null,
  };
}

export function isComplete(round: Round): boolean {
  const players = roundPlayers(round);
  if (round.holes.length === 0 || players.length === 0) return false;
  return round.holes.every((h) =>
    players.every((pid) => num(h.strokes[pid]) !== null)
  );
}

// ---------------------------------------------------------------------------
// Season aggregates (per player, completed rounds only)
// ---------------------------------------------------------------------------

export interface PlayerSeasonStat {
  playerId: PlayerId;
  rounds: number;
  wins: number;
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
  bestRoundStrokes: number | null;
  bestRoundId: string | null;
  worstRoundToPar: number | null;
  worstRoundStrokes: number | null;
  worstRoundId: string | null;
  eagles: number;
  birdies: number;
  pars: number;
  bogeys: number;
  doublePlus: number;
}

function emptyStat(playerId: PlayerId): PlayerSeasonStat {
  return {
    playerId,
    rounds: 0,
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
    bestRoundToPar: null,
    bestRoundStrokes: null,
    bestRoundId: null,
    worstRoundToPar: null,
    worstRoundStrokes: null,
    worstRoundId: null,
    eagles: 0,
    birdies: 0,
    pars: 0,
    bogeys: 0,
    doublePlus: 0,
  };
}

export interface SeasonStats {
  rounds: number;
  completedRounds: number;
  byPlayer: Record<PlayerId, PlayerSeasonStat>;
}

/**
 * Per-player season aggregates over fully completed rounds only. In-progress
 * rounds appear in the Season list but never skew stats.
 */
export function seasonStats(rounds: Round[]): SeasonStats {
  const completed = rounds.filter(isComplete);
  const byPlayer: Record<PlayerId, PlayerSeasonStat> = {};
  const get = (pid: PlayerId) => (byPlayer[pid] ||= emptyStat(pid));

  for (const round of completed) {
    const t = roundTotals(round);
    for (const pid of t.players) {
      const ps = get(pid);
      const pt = t.byPlayer[pid];
      ps.rounds += 1;
      ps.totalStrokes += pt.strokes;
      ps.totalPar += pt.par;
      ps.holesPlayed += pt.holesPlayed;
      for (const h of round.holes) {
        const s = num(h.strokes[pid]);
        if (s !== null) {
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
        ps.bestRoundStrokes = pt.strokes;
        ps.bestRoundId = round.id;
      }
      if (ps.worstRoundToPar === null || pt.toPar > ps.worstRoundToPar) {
        ps.worstRoundToPar = pt.toPar;
        ps.worstRoundStrokes = pt.strokes;
        ps.worstRoundId = round.id;
      }
    }

    // gross / net win-loss per round outcome
    for (const pid of t.players) {
      const ps = get(pid);
      if (t.winner === "tie") ps.ties += 1;
      else if (t.winner === pid) ps.wins += 1;
      else ps.losses += 1;
      if (t.netWinner === "tie") ps.netTies += 1;
      else if (t.netWinner === pid) ps.netWins += 1;
      else ps.netLosses += 1;
    }

    // match play (two-player rounds only)
    if (t.match) {
      const [a, b] = t.match.players;
      if (t.match.leader === "tie") {
        get(a).matchHalved += 1;
        get(b).matchHalved += 1;
      } else if (t.match.leader === a) {
        get(a).matchWins += 1;
        get(b).matchLosses += 1;
      } else if (t.match.leader === b) {
        get(b).matchWins += 1;
        get(a).matchLosses += 1;
      }
    }
  }

  for (const pid of Object.keys(byPlayer)) {
    const ps = byPlayer[pid];
    ps.avgPerHole = ps.holesPlayed > 0 ? ps.totalStrokes / ps.holesPlayed : 0;
    ps.avgToPar = ps.rounds > 0 ? (ps.totalStrokes - ps.totalPar) / ps.rounds : 0;
  }

  return { rounds: rounds.length, completedRounds: completed.length, byPlayer };
}

/** Pairwise gross record between two players over completed rounds they shared. */
export function headToHead(rounds: Round[], a: PlayerId, b: PlayerId) {
  let aWins = 0,
    bWins = 0,
    ties = 0,
    shared = 0;
  for (const round of rounds) {
    if (!isComplete(round)) continue;
    const players = roundPlayers(round);
    if (!players.includes(a) || !players.includes(b)) continue;
    shared++;
    const t = roundTotals(round);
    const sa = t.byPlayer[a].strokes;
    const sb = t.byPlayer[b].strokes;
    if (sa < sb) aWins++;
    else if (sb < sa) bWins++;
    else ties++;
  }
  return { aWins, bWins, ties, shared };
}

// ---------------------------------------------------------------------------
// Course templates → rounds
// ---------------------------------------------------------------------------

export function courseNinePar(course: CourseTemplate): number {
  return course.pars.slice(0, 9).reduce((a, b) => a + b, 0);
}

export function courseDefaultPar(course: CourseTemplate): number {
  if (course.holeCount === 18) return course.pars.reduce((a, b) => a + b, 0);
  return course.playsTwice ? courseNinePar(course) * 2 : courseNinePar(course);
}

export function courseOptions(course: CourseTemplate): (9 | 18)[] {
  if (course.holeCount === 18) return [18, 9];
  return course.playsTwice ? [9, 18] : [9];
}

export function roundFromCourse(
  course: CourseTemplate,
  target: 9 | 18,
  nine: "front" | "back",
  players: Player[]
): Round {
  const base = newRound(target, players);
  base.course = course.name;
  const ids = players.map((p) => p.id);
  const blank = () => Object.fromEntries(ids.map((p) => [p, null])) as Record<PlayerId, number | null>;

  type H = { hole: number; par: number; si: number };
  let holes: H[] = [];

  if (course.holeCount === 18) {
    if (target === 18) {
      holes = course.pars.map((par, i) => ({ hole: i + 1, par, si: course.sis[i] ?? i + 1 }));
    } else {
      const start = nine === "back" ? 9 : 0;
      holes = course.pars.slice(start, start + 9).map((par, i) => ({
        hole: start + i + 1,
        par,
        si: course.sis[start + i] ?? i + 1,
      }));
      base.nine = nine;
    }
  } else {
    if (target === 9) {
      holes = course.pars.map((par, i) => ({ hole: i + 1, par, si: course.sis[i] ?? i + 1 }));
      base.nine = "single";
    } else {
      holes = Array.from({ length: 18 }, (_, i) => ({
        hole: i + 1,
        par: course.pars[i % 9],
        si: course.sis[i % 9] ?? (i % 9) + 1,
      }));
    }
  }

  base.holeCount = target;
  base.holes = holes.map((h) => ({ ...h, strokes: blank() }));
  return base;
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
