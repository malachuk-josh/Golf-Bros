"use client";

import { useMemo } from "react";
import type { PlayerId, Round, Settings } from "@/lib/types";
import { PLAYER_IDS, seasonStats } from "@/lib/golf";

const DIST: { key: keyof ReturnType<typeof rowKeys>; label: string; color: string }[] = [
  { key: "eagles", label: "Eagle+", color: "#ca8a04" },
  { key: "birdies", label: "Birdie", color: "#349044" },
  { key: "pars", label: "Par", color: "#0ea5e9" },
  { key: "bogeys", label: "Bogey", color: "#f97316" },
  { key: "doublePlus", label: "Double+", color: "#dc2626" },
];

function rowKeys() {
  return { eagles: 0, birdies: 0, pars: 0, bogeys: 0, doublePlus: 0 };
}

export default function StatsView({
  rounds,
  settings,
}: {
  rounds: Round[];
  settings: Settings;
}) {
  const stats = useMemo(() => seasonStats(rounds), [rounds]);

  if (rounds.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-fairway-300 bg-white/60 p-10 text-center">
        <div className="text-4xl">📊</div>
        <p className="mt-2 font-semibold text-fairway-700">No stats yet</p>
        <p className="text-sm text-fairway-500">Record some rounds to unlock stats.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-center text-xs text-fairway-400">
        Based on {stats.completedRounds} completed{" "}
        {stats.completedRounds === 1 ? "round" : "rounds"}
        {stats.completedRounds !== stats.rounds
          ? ` (${stats.rounds - stats.completedRounds} in progress, not counted)`
          : ""}
        .
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {PLAYER_IDS.map((pid) => (
          <PlayerStatCard key={pid} pid={pid} stats={stats} settings={settings} />
        ))}
      </div>
    </div>
  );
}

function PlayerStatCard({
  pid,
  stats,
  settings,
}: {
  pid: PlayerId;
  stats: ReturnType<typeof seasonStats>;
  settings: Settings;
}) {
  const s = stats.byPlayer[pid];
  const totalHoles =
    s.eagles + s.birdies + s.pars + s.bogeys + s.doublePlus || 1;

  return (
    <div className="rounded-2xl border border-fairway-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-fairway-900">{settings.players[pid]}</h3>
        <span className="text-xs text-fairway-500">{s.holesPlayed} holes</span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <Mini label="Gross W-L-T" value={`${s.wins}-${s.losses}-${s.ties}`} />
        <Mini label="Net W-L-T" value={`${s.netWins}-${s.netLosses}-${s.netTies}`} />
        <Mini label="Match W-L-H" value={`${s.matchWins}-${s.matchLosses}-${s.matchHalved}`} />
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2 text-center">
        <Mini label="Avg/hole" value={s.holesPlayed ? s.avgPerHole.toFixed(2) : "—"} />
        <Mini label="Birdies+" value={String(s.eagles + s.birdies)} />
      </div>

      {/* distribution bar */}
      <div className="mt-4">
        <div className="mb-1 flex h-5 w-full overflow-hidden rounded-full border border-fairway-100">
          {DIST.map((d) => {
            const v = (s as any)[d.key] as number;
            const pct = (v / totalHoles) * 100;
            if (pct === 0) return null;
            return (
              <div
                key={d.key}
                style={{ width: `${pct}%`, background: d.color }}
                title={`${d.label}: ${v}`}
              />
            );
          })}
        </div>
        <div className="mt-2 grid grid-cols-5 gap-1 text-center text-xs">
          {DIST.map((d) => (
            <div key={d.key}>
              <div
                className="mx-auto mb-1 h-2.5 w-2.5 rounded-full"
                style={{ background: d.color }}
              />
              <div className="font-bold text-fairway-900">{(s as any)[d.key]}</div>
              <div className="text-[10px] text-fairway-500">{d.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-fairway-50 px-2 py-2">
      <div className="text-lg font-bold text-fairway-800">{value}</div>
      <div className="text-[10px] font-medium uppercase tracking-wide text-fairway-500">
        {label}
      </div>
    </div>
  );
}
