"use client";

import { useMemo } from "react";
import type { Player, PlayerId, Round } from "@/lib/types";
import { formatToPar, isComplete, roundPlayers, roundTotals } from "@/lib/golf";

export default function Trends({
  rounds,
  players,
}: {
  rounds: Round[];
  players: Player[];
}) {
  const colorOf = (id: string) => players.find((p) => p.id === id)?.color || "#7E8CA0";
  const nameOf = (id: string) => players.find((p) => p.id === id)?.name || "Player";

  const completed = useMemo(
    () => rounds.filter(isComplete).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.createdAt - b.createdAt),
    [rounds]
  );

  const activeIds = useMemo(() => {
    const set = new Set<PlayerId>();
    completed.forEach((r) => roundPlayers(r).forEach((id) => set.add(id)));
    return players.filter((p) => set.has(p.id)).map((p) => p.id);
  }, [completed, players]);

  const data = useMemo(
    () =>
      completed.map((r) => {
        const t = roundTotals(r);
        const toPar: Record<string, number> = {};
        for (const id of t.players) toPar[id] = t.byPlayer[id].toPar;
        return { id: r.id, date: r.date, course: r.course, toPar, winner: t.winner };
      }),
    [completed]
  );

  if (completed.length < 1) {
    return (
      <div className="rounded-xl border border-dashed border-line bg-panel p-10 text-center">
        <div className="eyebrow">// no chart data</div>
        <p className="mt-2 font-display text-lg font-medium text-ink">Nothing to chart yet</p>
        <p className="text-sm text-mut">Finish a round (every hole scored for all players) to see trends.</p>
      </div>
    );
  }

  const W = 720;
  const H = 320;
  const pad = { top: 24, right: 20, bottom: 40, left: 40 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;
  const allToPar = data.flatMap((d) => Object.values(d.toPar));
  const maxV = Math.max(5, ...allToPar);
  const minV = Math.min(-2, ...allToPar);
  const n = data.length;
  const x = (i: number) => pad.left + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (v: number) => pad.top + innerH - ((v - minV) / (maxV - minV || 1)) * innerH;

  function path(id: PlayerId) {
    const pts = data.map((d, i) => ({ i, v: d.toPar[id] })).filter((p) => typeof p.v === "number") as { i: number; v: number }[];
    if (pts.length === 0) return "";
    return pts.map((p, idx) => `${idx === 0 ? "M" : "L"} ${x(p.i).toFixed(1)} ${y(p.v).toFixed(1)}`).join(" ");
  }

  const gridLines: number[] = [];
  for (let v = Math.ceil(minV / 2) * 2; v <= maxV; v += 2) gridLines.push(v);
  const mut = "rgb(var(--mut))";
  const line = "rgb(var(--line))";

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-line bg-panel p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="eyebrow">// score vs par by round</div>
          <div className="flex flex-wrap gap-3 font-mono text-xs text-mut">
            {activeIds.map((id) => (
              <span key={id} className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: colorOf(id) }} />{nameOf(id)}</span>
            ))}
          </div>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Score versus par by round">
          {gridLines.map((v) => (
            <g key={v}>
              <line x1={pad.left} x2={W - pad.right} y1={y(v)} y2={y(v)} style={{ stroke: v === 0 ? mut : line }} strokeDasharray={v === 0 ? "0" : "3 3"} />
              <text x={8} y={y(v) + 4} fontSize="11" style={{ fill: mut }} className="font-mono">{formatToPar(v)}</text>
            </g>
          ))}
          {activeIds.map((id) => (<path key={id} d={path(id)} fill="none" stroke={colorOf(id)} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />))}
          {activeIds.map((id) => data.map((d, i) => (typeof d.toPar[id] !== "number" ? null : (
            <circle key={`${id}-${i}`} cx={x(i)} cy={y(d.toPar[id])} r={3.5} style={{ fill: "rgb(var(--panel))" }} stroke={colorOf(id)} strokeWidth={2}>
              <title>{nameOf(id)} · {d.course || d.date}: {formatToPar(d.toPar[id])}</title>
            </circle>
          )))) }
          {data.map((d, i) => (n <= 12 || i % Math.ceil(n / 12) === 0 ? (<text key={i} x={x(i)} y={H - 14} fontSize="10" style={{ fill: mut }} textAnchor="middle" className="font-mono">R{i + 1}</text>) : null))}
        </svg>
        <p className="mt-1 text-center font-mono text-[11px] text-mut">Lower is better. Below the bright line = under par.</p>
      </div>

      <div className="rounded-xl border border-line bg-panel p-4">
        <div className="eyebrow mb-3">// win timeline</div>
        <div className="mb-3 flex flex-wrap gap-3 font-mono text-xs text-mut">
          {activeIds.map((id) => (<span key={id} className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: colorOf(id) }} />{nameOf(id)}</span>))}
          <span className="flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-full bg-brass" />Tie</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {data.map((d, i) => {
            const tie = d.winner === "tie" || d.winner === null;
            const bg = tie ? "#E8B45A" : colorOf(d.winner || "");
            const label = tie ? "Tie" : nameOf(d.winner || "");
            return (
              <span key={d.id} title={`Round ${i + 1} · ${d.date} · ${d.course || "round"} — ${label}`} className="flex h-8 w-8 items-center justify-center rounded font-mono text-[10px] font-bold text-bg" style={{ background: bg }}>{i + 1}</span>
            );
          })}
        </div>
        <p className="mt-2 font-mono text-[11px] text-mut">Oldest → newest, numbered by round, colored by winner.</p>
      </div>
    </div>
  );
}
