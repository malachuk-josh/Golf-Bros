"use client";

import { useMemo, useState } from "react";
import type { Round, Settings } from "@/lib/types";
import { PLAYER_IDS, formatToPar, seasonStats } from "@/lib/golf";

type Mode = "gross" | "net" | "match";

export default function Standings({
  rounds,
  settings,
}: {
  rounds: Round[];
  settings: Settings;
}) {
  const stats = useMemo(() => seasonStats(rounds), [rounds]);
  const [mode, setMode] = useState<Mode>("gross");

  if (rounds.length === 0) return <EmptyState />;

  const [a, b] = PLAYER_IDS;
  const sa = stats.byPlayer[a];
  const sb = stats.byPlayer[b];

  // headline record depends on mode
  const rec = {
    gross: { a: sa.wins, b: sb.wins, ties: sa.ties, label: "Gross wins" },
    net: { a: sa.netWins, b: sb.netWins, ties: sa.netTies, label: "Net wins" },
    match: { a: sa.matchWins, b: sb.matchWins, ties: sa.matchHalved, label: "Matches won" },
  }[mode];

  const rows: { label: string; a: string; b: string; better?: "a" | "b" | "tie" }[] = [
    {
      label: rec.label,
      a: String(rec.a),
      b: String(rec.b),
      better: rec.a === rec.b ? "tie" : rec.a > rec.b ? "a" : "b",
    },
    {
      label: "Scoring avg vs par",
      a: stats.completedRounds ? formatToPar(Math.round(sa.avgToPar)) : "—",
      b: stats.completedRounds ? formatToPar(Math.round(sb.avgToPar)) : "—",
      better: !stats.completedRounds
        ? undefined
        : sa.avgToPar === sb.avgToPar
        ? "tie"
        : sa.avgToPar < sb.avgToPar
        ? "a"
        : "b",
    },
    {
      label: "Avg strokes / hole",
      a: sa.holesPlayed ? sa.avgPerHole.toFixed(2) : "—",
      b: sb.holesPlayed ? sb.avgPerHole.toFixed(2) : "—",
      better: !sa.holesPlayed || !sb.holesPlayed
        ? undefined
        : sa.avgPerHole === sb.avgPerHole
        ? "tie"
        : sa.avgPerHole < sb.avgPerHole
        ? "a"
        : "b",
    },
    {
      label: "Best round",
      a: sa.bestRoundToPar !== null ? formatToPar(sa.bestRoundToPar) : "—",
      b: sb.bestRoundToPar !== null ? formatToPar(sb.bestRoundToPar) : "—",
      better: sa.bestRoundToPar === null || sb.bestRoundToPar === null
        ? undefined
        : sa.bestRoundToPar === sb.bestRoundToPar
        ? "tie"
        : sa.bestRoundToPar < sb.bestRoundToPar
        ? "a"
        : "b",
    },
    {
      label: "Birdies (or better)",
      a: String(sa.eagles + sa.birdies),
      b: String(sb.eagles + sb.birdies),
      better:
        sa.eagles + sa.birdies === sb.eagles + sb.birdies
          ? "tie"
          : sa.eagles + sa.birdies > sb.eagles + sb.birdies
          ? "a"
          : "b",
    },
  ];

  const totalDecisive = rec.a + rec.b + rec.ties;

  return (
    <div className="space-y-5">
      {/* mode toggle */}
      <div className="flex justify-center">
        <div className="inline-flex overflow-hidden rounded-lg border border-fairway-300">
          {(["gross", "net", "match"] as const).map((md) => (
            <button
              key={md}
              onClick={() => setMode(md)}
              className={`px-4 py-1.5 text-sm font-semibold capitalize transition ${
                mode === md
                  ? "bg-fairway-600 text-white"
                  : "bg-white text-fairway-700 hover:bg-fairway-50"
              }`}
            >
              {md === "match" ? "Match play" : md}
            </button>
          ))}
        </div>
      </div>

      {/* Head-to-head banner */}
      <div className="rounded-2xl border border-fairway-200 bg-white p-5 shadow-sm">
        <h2 className="mb-1 text-center text-sm font-semibold uppercase tracking-wide text-fairway-500">
          {mode === "net" ? "Net" : mode === "match" ? "Match-play" : "Gross"} Head-to-Head
        </h2>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <PlayerCard name={settings.players[a]} wins={rec.a} mode={mode} highlight={rec.a > rec.b} />
          <div className="text-center">
            <div className="text-3xl font-black text-fairway-700">
              {rec.a}<span className="mx-1 text-fairway-300">–</span>{rec.b}
            </div>
            {rec.ties > 0 && (
              <div className="text-xs text-fairway-500">
                {rec.ties} {mode === "match" ? "halved" : "tied"}
              </div>
            )}
            <div className="mt-1 text-xs text-fairway-400">
              {totalDecisive} {totalDecisive === 1 ? "round" : "rounds"}
            </div>
          </div>
          <PlayerCard name={settings.players[b]} wins={rec.b} mode={mode} highlight={rec.b > rec.a} right />
        </div>
      </div>

      {/* Comparison table */}
      <div className="overflow-hidden rounded-2xl border border-fairway-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-fairway-50 text-fairway-700">
              <th className="px-4 py-2 text-right font-semibold">{settings.players[a]}</th>
              <th className="px-4 py-2 text-center font-medium text-fairway-400">Stat</th>
              <th className="px-4 py-2 text-left font-semibold">{settings.players[b]}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-t border-fairway-100">
                <td className={`px-4 py-2.5 text-right text-lg font-bold ${row.better === "a" ? "text-fairway-700" : "text-fairway-900/70"}`}>
                  {row.a}
                  {row.better === "a" && <WinDot />}
                </td>
                <td className="px-4 py-2.5 text-center text-xs font-medium uppercase tracking-wide text-fairway-400">
                  {row.label}
                </td>
                <td className={`px-4 py-2.5 text-left text-lg font-bold ${row.better === "b" ? "text-fairway-700" : "text-fairway-900/70"}`}>
                  {row.better === "b" && <WinDot />}
                  {row.b}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-center text-xs text-fairway-400">
        All season stats count only fully completed rounds
        {stats.completedRounds !== stats.rounds
          ? ` — ${stats.rounds - stats.completedRounds} in-progress round${
              stats.rounds - stats.completedRounds === 1 ? "" : "s"
            } excluded.`
          : "."}
      </p>
    </div>
  );
}

function PlayerCard({
  name,
  wins,
  mode,
  highlight,
  right,
}: {
  name: string;
  wins: number;
  mode: Mode;
  highlight: boolean;
  right?: boolean;
}) {
  const unit = mode === "match" ? "match" : "win";
  return (
    <div className={`flex flex-col ${right ? "items-end text-right" : "items-start"}`}>
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold ${
          highlight ? "bg-fairway-600 text-white" : "bg-fairway-100 text-fairway-700"
        }`}
      >
        {name.slice(0, 1).toUpperCase()}
      </div>
      <span className="mt-1 max-w-[10rem] truncate font-semibold">{name}</span>
      <span className="text-xs text-fairway-500">
        {wins} {wins === 1 ? unit : `${unit}s`}
      </span>
    </div>
  );
}

function WinDot() {
  return <span className="ml-1 inline-block h-2 w-2 rounded-full bg-fairway-500 align-middle" />;
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-fairway-300 bg-white/60 p-10 text-center">
      <div className="text-4xl">⛳️</div>
      <p className="mt-2 font-semibold text-fairway-700">No rounds yet</p>
      <p className="text-sm text-fairway-500">
        Head to the <strong>Play</strong> tab to record your first round.
      </p>
    </div>
  );
}
