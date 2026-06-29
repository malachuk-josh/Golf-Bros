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
  const colorOf = (id: string) => players.find((p) => p.id === id)?.color || "#7E8CA0";

  const ranked = useMemo(() => {
    const rows = Object.values(stats.byPlayer).filter((s) => s.rounds > 0);
    const wins = (s: (typeof rows)[number]) => (mode === "gross" ? s.wins : mode === "net" ? s.netWins : s.matchWins);
    return rows.sort((a, b) => wins(b) - wins(a) || a.avgToPar - b.avgToPar);
  }, [stats, mode]);

  if (rounds.length === 0 || ranked.length === 0) {
    return <Empty icon="🏆" title="No completed rounds yet" body="Finish a round to populate the board." />;
  }

  const winsLabel = mode === "match" ? "Matches" : mode === "net" ? "Net W-L" : "Gross W-L";

  return (
    <div className="space-y-5">
      <div className="flex justify-center">
        <div className="inline-flex overflow-hidden rounded-lg border border-line">
          {(["gross", "net", "match"] as const).map((md) => (
            <button key={md} onClick={() => setMode(md)} className={`px-4 py-1.5 font-mono text-xs font-medium uppercase tracking-eyebrow transition ${mode === md ? "bg-brass/15 text-brass" : "text-mut hover:text-ink"}`}>
              {md === "match" ? "Match" : md}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border glass">
        <table className="w-full font-mono text-sm">
          <thead>
            <tr className="bg-panel2 text-left text-[11px] uppercase tracking-eyebrow text-mut">
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Player</th>
              <th className="px-2 py-2 text-center text-brass">{winsLabel}</th>
              <th className="px-2 py-2 text-center">Rds</th>
              <th className="px-2 py-2 text-center">Avg</th>
              <th className="px-2 py-2 text-center">/hole</th>
              <th className="px-2 py-2 text-center">Best</th>
              <th className="px-2 py-2 text-center">Worst</th>
              <th className="px-2 py-2 text-center">Bird+</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((s, i) => {
              const w = mode === "gross" ? `${s.wins}-${s.losses}-${s.ties}` : mode === "net" ? `${s.netWins}-${s.netLosses}-${s.netTies}` : `${s.matchWins}-${s.matchLosses}-${s.matchHalved}`;
              return (
                <tr key={s.playerId} className="border-t border-line">
                  <td className="px-3 py-2.5 font-bold text-mut">{i + 1}</td>
                  <td className="px-3 py-2.5 text-ink">
                    <span className="inline-flex items-center gap-2">
                      <span className="inline-block h-3 w-3 rounded-full" style={{ background: colorOf(s.playerId) }} />{nameOf(s.playerId)}
                    </span>
                  </td>
                  <td className="px-2 py-2.5 text-center font-bold text-brass">{w}</td>
                  <td className="px-2 py-2.5 text-center text-mut">{s.rounds}</td>
                  <td className="px-2 py-2.5 text-center">{formatToPar(Math.round(s.avgToPar))}</td>
                  <td className="px-2 py-2.5 text-center text-mut">{s.avgPerHole.toFixed(2)}</td>
                  <td className="px-2 py-2.5 text-center text-up">{s.bestRoundToPar !== null ? `${formatToPar(s.bestRoundToPar)} (${s.bestRoundStrokes})` : "—"}</td>
                  <td className="px-2 py-2.5 text-center text-down">{s.worstRoundToPar !== null ? `${formatToPar(s.worstRoundToPar)} (${s.worstRoundStrokes})` : "—"}</td>
                  <td className="px-2 py-2.5 text-center text-mut">{s.eagles + s.birdies}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <HeadToHead rounds={rounds} players={players.filter((p) => stats.byPlayer[p.id]?.rounds > 0)} nameOf={nameOf} colorOf={colorOf} />

      <p className="text-center font-mono text-[11px] text-mut">
        Completed rounds only{stats.completedRounds !== stats.rounds ? ` · ${stats.rounds - stats.completedRounds} in progress excluded` : ""}. Match counts two-player rounds.
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
  const sel = "rounded-lg border border-line bg-panel2 px-3 py-2 text-sm text-ink";

  return (
    <div className="rounded-xl border glass p-5">
      <div className="eyebrow mb-3">// head-to-head</div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <select value={a} onChange={(e) => setA(e.target.value)} className={sel}>{players.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}</select>
        <span className="font-mono text-xs text-mut">vs</span>
        <select value={b} onChange={(e) => setB(e.target.value)} className={sel}>{players.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}</select>
      </div>
      {!valid ? (
        <p className="mt-3 text-center text-sm text-mut">Pick two different players.</p>
      ) : h2h!.shared === 0 ? (
        <p className="mt-3 text-center text-sm text-mut">No completed rounds together yet.</p>
      ) : (
        <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="text-right font-mono" style={{ color: colorOf(a) }}>{nameOf(a)}</div>
          <div className="text-center">
            <div className="font-mono text-3xl font-bold text-brass">{h2h!.aWins}<span className="mx-1 text-mut">–</span>{h2h!.bWins}</div>
            {h2h!.ties > 0 && <div className="font-mono text-xs text-mut">{h2h!.ties} tied</div>}
            <div className="eyebrow mt-0.5">{h2h!.shared} together</div>
          </div>
          <div className="text-left font-mono" style={{ color: colorOf(b) }}>{nameOf(b)}</div>
        </div>
      )}
    </div>
  );
}

function Empty({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div className="rounded-xl border border-dashed glass p-10 text-center">
      <div className="text-3xl">{icon}</div>
      <p className="mt-2 font-display text-lg font-medium text-ink">{title}</p>
      <p className="text-sm text-mut">{body}</p>
    </div>
  );
}
