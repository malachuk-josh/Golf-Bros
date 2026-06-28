"use client";

import { useMemo, useState } from "react";
import type { Player, Round } from "@/lib/types";
import { formatToPar, headToHead, seasonStats } from "@/lib/golf";

type Mode = "gross" | "net" | "match";

export default function Standings({
  rounds,
  players,
  defaultMode = "gross",
}: {
  rounds: Round[];
  players: Player[];
  defaultMode?: Mode;
}) {
  const stats = useMemo(() => seasonStats(rounds), [rounds]);
  const [mode, setMode] = useState<Mode>(defaultMode);

  const nameOf = (id: string) => players.find((p) => p.id === id)?.name || "Player";
  const colorOf = (id: string) => players.find((p) => p.id === id)?.color || "#475569";

  // roster players that have at least one completed round
  const ranked = useMemo(() => {
    const rows = Object.values(stats.byPlayer).filter((s) => s.rounds > 0);
    const wins = (s: (typeof rows)[number]) =>
      mode === "gross" ? s.wins : mode === "net" ? s.netWins : s.matchWins;
    return rows.sort((a, b) => {
      const dw = wins(b) - wins(a);
      if (dw !== 0) return dw;
      return a.avgToPar - b.avgToPar; // tiebreak: better scoring average
    });
  }, [stats, mode]);

  if (rounds.length === 0 || ranked.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-fairway-300 bg-white/60 p-10 text-center">
        <div className="text-4xl">🏆</div>
        <p className="mt-2 font-semibold text-fairway-700">No completed rounds yet</p>
        <p className="text-sm text-fairway-500">Finish a round to populate the leaderboard.</p>
      </div>
    );
  }

  const winsLabel = mode === "match" ? "Matches" : mode === "net" ? "Net W-L" : "Gross W-L";

  return (
    <div className="space-y-5">
      <div className="flex justify-center">
        <div className="inline-flex overflow-hidden rounded-lg border border-fairway-300">
          {(["gross", "net", "match"] as const).map((md) => (
            <button
              key={md}
              onClick={() => setMode(md)}
              className={`px-4 py-1.5 text-sm font-semibold capitalize transition ${mode === md ? "bg-fairway-600 text-white" : "bg-white text-fairway-700 hover:bg-fairway-50"}`}
            >
              {md === "match" ? "Match play" : md}
            </button>
          ))}
        </div>
      </div>

      {/* Leaderboard */}
      <div className="overflow-x-auto rounded-2xl border border-fairway-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-fairway-50 text-left text-fairway-600">
              <th className="px-3 py-2 font-semibold">#</th>
              <th className="px-3 py-2 font-semibold">Player</th>
              <th className="px-2 py-2 text-center font-semibold">{winsLabel}</th>
              <th className="px-2 py-2 text-center font-semibold">Rounds</th>
              <th className="px-2 py-2 text-center font-semibold">Avg vs par</th>
              <th className="px-2 py-2 text-center font-semibold">Avg/hole</th>
              <th className="px-2 py-2 text-center font-semibold">Best</th>
              <th className="px-2 py-2 text-center font-semibold">Worst</th>
              <th className="px-2 py-2 text-center font-semibold">Birdies+</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((s, i) => {
              const w =
                mode === "gross"
                  ? `${s.wins}-${s.losses}-${s.ties}`
                  : mode === "net"
                  ? `${s.netWins}-${s.netLosses}-${s.netTies}`
                  : `${s.matchWins}-${s.matchLosses}-${s.matchHalved}`;
              return (
                <tr key={s.playerId} className="border-t border-fairway-100">
                  <td className="px-3 py-2.5 font-bold text-fairway-400">{i + 1}</td>
                  <td className="px-3 py-2.5 font-semibold text-fairway-900">
                    <span className="inline-flex items-center gap-2">
                      <span className="inline-block h-3 w-3 rounded-full" style={{ background: colorOf(s.playerId) }} />
                      {nameOf(s.playerId)}
                    </span>
                  </td>
                  <td className="px-2 py-2.5 text-center font-bold">{w}</td>
                  <td className="px-2 py-2.5 text-center">{s.rounds}</td>
                  <td className="px-2 py-2.5 text-center">{formatToPar(Math.round(s.avgToPar))}</td>
                  <td className="px-2 py-2.5 text-center">{s.avgPerHole.toFixed(2)}</td>
                  <td className="px-2 py-2.5 text-center">{s.bestRoundToPar !== null ? `${formatToPar(s.bestRoundToPar)} (${s.bestRoundStrokes})` : "—"}</td>
                  <td className="px-2 py-2.5 text-center text-fairway-500">{s.worstRoundToPar !== null ? `${formatToPar(s.worstRoundToPar)} (${s.worstRoundStrokes})` : "—"}</td>
                  <td className="px-2 py-2.5 text-center">{s.eagles + s.birdies}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <HeadToHead rounds={rounds} players={players.filter((p) => stats.byPlayer[p.id]?.rounds > 0)} nameOf={nameOf} colorOf={colorOf} />

      <p className="text-center text-xs text-fairway-400">
        Leaderboard counts completed rounds only{stats.completedRounds !== stats.rounds ? ` (${stats.rounds - stats.completedRounds} in progress excluded)` : ""}. “Match” counts two-player rounds.
      </p>
    </div>
  );
}

function HeadToHead({
  rounds,
  players,
  nameOf,
  colorOf,
}: {
  rounds: Round[];
  players: Player[];
  nameOf: (id: string) => string;
  colorOf: (id: string) => string;
}) {
  const [a, setA] = useState(players[0]?.id || "");
  const [b, setB] = useState(players[1]?.id || "");

  if (players.length < 2) return null;
  const valid = a && b && a !== b;
  const h2h = valid ? headToHead(rounds, a, b) : null;

  return (
    <div className="rounded-2xl border border-fairway-200 bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-fairway-500">Head-to-head</h2>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <select value={a} onChange={(e) => setA(e.target.value)} className="rounded-lg border border-fairway-200 px-3 py-2 text-sm">
          {players.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
        </select>
        <span className="text-sm font-semibold text-fairway-400">vs</span>
        <select value={b} onChange={(e) => setB(e.target.value)} className="rounded-lg border border-fairway-200 px-3 py-2 text-sm">
          {players.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
        </select>
      </div>
      {!valid ? (
        <p className="mt-3 text-center text-sm text-fairway-500">Pick two different players.</p>
      ) : h2h!.shared === 0 ? (
        <p className="mt-3 text-center text-sm text-fairway-500">No completed rounds together yet.</p>
      ) : (
        <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="text-right">
            <div className="font-semibold" style={{ color: colorOf(a) }}>{nameOf(a)}</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-black text-fairway-700">{h2h!.aWins}<span className="mx-1 text-fairway-300">–</span>{h2h!.bWins}</div>
            {h2h!.ties > 0 && <div className="text-xs text-fairway-500">{h2h!.ties} tied</div>}
            <div className="text-xs text-fairway-400">{h2h!.shared} rounds together</div>
          </div>
          <div className="text-left">
            <div className="font-semibold" style={{ color: colorOf(b) }}>{nameOf(b)}</div>
          </div>
        </div>
      )}
    </div>
  );
}
