"use client";

import { useMemo } from "react";
import type { Player, Round } from "@/lib/types";
import { seasonStats } from "@/lib/golf";
import type { PlayerSeasonStat } from "@/lib/golf";

const DIST: { key: keyof PlayerSeasonStat; label: string; color: string }[] = [
  { key: "eagles", label: "Eagle+", color: "#E8B45A" },
  { key: "birdies", label: "Birdie", color: "#3DD68C" },
  { key: "pars", label: "Par", color: "#5AA7E8" },
  { key: "bogeys", label: "Bogey", color: "#D49A3E" },
  { key: "doublePlus", label: "Dbl+", color: "#F2555A" },
];

export default function StatsView({
  rounds,
  players,
}: {
  rounds: Round[];
  players: Player[];
}) {
  const stats = useMemo(() => seasonStats(rounds), [rounds]);
  const withRounds = players.filter((p) => (stats.byPlayer[p.id]?.rounds || 0) > 0);

  if (rounds.length === 0 || withRounds.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-panel p-10 text-center">
        <div className="eyebrow">// no stats</div>
        <p className="mt-2 font-display text-lg font-medium text-ink">Nothing to show yet</p>
        <p className="text-sm text-mut">Record some completed rounds to unlock stats.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-center font-mono text-[11px] text-mut">
        {stats.completedRounds} completed {stats.completedRounds === 1 ? "round" : "rounds"}
        {stats.completedRounds !== stats.rounds ? ` · ${stats.rounds - stats.completedRounds} in progress not counted` : ""}
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {withRounds.map((p) => (<PlayerStatCard key={p.id} player={p} s={stats.byPlayer[p.id]} />))}
      </div>
    </div>
  );
}

function PlayerStatCard({ player, s }: { player: Player; s: PlayerSeasonStat }) {
  const totalHoles = s.eagles + s.birdies + s.pars + s.bogeys + s.doublePlus || 1;
  return (
    <div className="rounded-xl border border-line bg-panel p-5">
      <div className="flex items-center justify-between">
        <h3 className="inline-flex items-center gap-2 font-display text-lg font-medium text-ink">
          <span className="inline-block h-3 w-3 rounded-full" style={{ background: player.color }} />{player.name}
        </h3>
        <span className="eyebrow">{s.rounds} rds · {s.holesPlayed} holes</span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <Mini label="Gross" value={`${s.wins}-${s.losses}-${s.ties}`} />
        <Mini label="Net" value={`${s.netWins}-${s.netLosses}-${s.netTies}`} />
        <Mini label="Match" value={`${s.matchWins}-${s.matchLosses}-${s.matchHalved}`} />
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-center">
        <Mini label="Avg/hole" value={s.holesPlayed ? s.avgPerHole.toFixed(2) : "—"} />
        <Mini label="Birdies+" value={String(s.eagles + s.birdies)} />
      </div>

      <div className="mt-4">
        <div className="mb-1 flex h-5 w-full overflow-hidden rounded-full border border-line">
          {DIST.map((d) => {
            const v = s[d.key] as number;
            const pct = (v / totalHoles) * 100;
            if (pct === 0) return null;
            return <div key={d.key} style={{ width: `${pct}%`, background: d.color }} title={`${d.label}: ${v}`} />;
          })}
        </div>
        <div className="mt-2 grid grid-cols-5 gap-1 text-center">
          {DIST.map((d) => (
            <div key={d.key}>
              <div className="mx-auto mb-1 h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
              <div className="font-mono text-sm font-medium text-ink">{s[d.key] as number}</div>
              <div className="font-mono text-[10px] uppercase tracking-eyebrow text-mut">{d.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-panel2 px-2 py-2">
      <div className="font-mono text-base font-medium text-ink">{value}</div>
      <div className="font-mono text-[10px] uppercase tracking-eyebrow text-mut">{label}</div>
    </div>
  );
}
