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
  const colorOf = (id: string) => players.find((p) => p.id === id)?.color || "#475569";
  const nameOf = (id: string) => players.find((p) => p.id === id)?.name || "Player";

  const completed = useMemo(
    () =>
      rounds
        .filter(isComplete)
        .sort(
          (a, b) =>
            new Date(a.date).getTime() - new Date(b.date).getTime() || a.createdAt - b.createdAt
        ),
    [rounds]
  );

  // players that appear in at least one completed round, in roster order
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
      <div className="rounded-2xl border border-dashed border-fairway-300 bg-white/60 p-10 text-center">
        <div className="text-4xl">📈</div>
        <p className="mt-2 font-semibold text-fairway-700">No completed rounds to chart yet</p>
        <p className="text-sm text-fairway-500">Finish a round (every hole scored for all players) to see trends.</p>
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
    const pts = data
      .map((d, i) => ({ i, v: d.toPar[id] }))
      .filter((p) => typeof p.v === "number") as { i: number; v: number }[];
    if (pts.length === 0) return "";
    return pts.map((p, idx) => `${idx === 0 ? "M" : "L"} ${x(p.i).toFixed(1)} ${y(p.v).toFixed(1)}`).join(" ");
  }

  const gridLines: number[] = [];
  for (let v = Math.ceil(minV / 2) * 2; v <= maxV; v += 2) gridLines.push(v);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-fairway-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-fairway-500">Score vs Par — by round</h2>
          <div className="flex flex-wrap gap-3 text-xs">
            {activeIds.map((id) => (
              <span key={id} className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: colorOf(id) }} />
                {nameOf(id)}
              </span>
            ))}
          </div>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Score versus par by round">
          {gridLines.map((v) => (
            <g key={v}>
              <line x1={pad.left} x2={W - pad.right} y1={y(v)} y2={y(v)} stroke={v === 0 ? "#9ca3af" : "#e5e7eb"} strokeDasharray={v === 0 ? "0" : "3 3"} />
              <text x={8} y={y(v) + 4} fontSize="11" fill="#6b7280">{formatToPar(v)}</text>
            </g>
          ))}
          {activeIds.map((id) => (
            <path key={id} d={path(id)} fill="none" stroke={colorOf(id)} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
          ))}
          {activeIds.map((id) =>
            data.map((d, i) =>
              typeof d.toPar[id] !== "number" ? null : (
                <circle key={`${id}-${i}`} cx={x(i)} cy={y(d.toPar[id])} r={3.5} fill="#fff" stroke={colorOf(id)} strokeWidth={2}>
                  <title>{nameOf(id)} · {d.course || d.date}: {formatToPar(d.toPar[id])}</title>
                </circle>
              )
            )
          )}
          {data.map((d, i) =>
            n <= 12 || i % Math.ceil(n / 12) === 0 ? (
              <text key={i} x={x(i)} y={H - 14} fontSize="10" fill="#6b7280" textAnchor="middle">R{i + 1}</text>
            ) : null
          )}
        </svg>
        <p className="mt-1 text-center text-xs text-fairway-400">Lower is better. A line dips below the grey line when under par.</p>
      </div>

      <div className="rounded-2xl border border-fairway-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-fairway-500">Win timeline</h2>
        <div className="mb-3 flex flex-wrap gap-3 text-xs">
          {activeIds.map((id) => (
            <span key={id} className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: colorOf(id) }} />
              {nameOf(id)}
            </span>
          ))}
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: "#f59e0b" }} />
            Tie
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {data.map((d, i) => {
            const tie = d.winner === "tie" || d.winner === null;
            const bg = tie ? "#f59e0b" : colorOf(d.winner || "");
            const label = tie ? "Tie" : nameOf(d.winner || "");
            return (
              <span
                key={d.id}
                title={`Round ${i + 1} · ${d.date} · ${d.course || "round"} — ${label}`}
                className="flex h-8 w-8 items-center justify-center rounded text-[10px] font-bold text-white"
                style={{ background: bg }}
              >
                {i + 1}
              </span>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-fairway-400">Oldest → newest, numbered by round and colored by winner.</p>
      </div>
    </div>
  );
}
