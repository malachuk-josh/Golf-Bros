"use client";

import { useMemo } from "react";
import type { PlayerId, Round, Settings } from "@/lib/types";
import { PLAYER_IDS, formatToPar, isComplete, roundTotals } from "@/lib/golf";

const COLORS: Record<PlayerId, string> = { p1: "#247334", p2: "#c2410c" };

export default function Trends({
  rounds,
  settings,
}: {
  rounds: Round[];
  settings: Settings;
}) {
  // chronological (oldest -> newest), completed rounds only so partial rounds
  // don't distort the chart
  const series = useMemo(() => {
    const chrono = rounds.filter(isComplete).sort(
      (a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime() ||
        a.createdAt - b.createdAt
    );
    return chrono.map((r) => {
      const t = roundTotals(r);
      return {
        id: r.id,
        date: r.date,
        course: r.course,
        toPar: {
          p1: t.byPlayer.p1.toPar,
          p2: t.byPlayer.p2.toPar,
        } as { p1: number | null; p2: number | null },
        winner: t.winner,
      };
    });
  }, [rounds]);

  if (series.length < 1) {
    const pending = rounds.length > 0;
    return (
      <div className="rounded-2xl border border-dashed border-fairway-300 bg-white/60 p-10 text-center">
        <div className="text-4xl">📈</div>
        <p className="mt-2 font-semibold text-fairway-700">No data to chart yet</p>
        <p className="text-sm text-fairway-500">
          {pending
            ? "Your saved rounds are still in progress. Finish a round (every hole scored for both players) to see trends."
            : "Save a couple of completed rounds to see trends."}
        </p>
      </div>
    );
  }

  // chart geometry
  const W = 720;
  const H = 320;
  const pad = { top: 24, right: 20, bottom: 40, left: 40 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;

  const allToPar = series.flatMap((s) =>
    [s.toPar.p1, s.toPar.p2].filter((v): v is number => v !== null)
  );
  const maxV = Math.max(5, ...allToPar);
  const minV = Math.min(-2, ...allToPar);
  const n = series.length;

  const x = (i: number) => pad.left + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (v: number) =>
    pad.top + innerH - ((v - minV) / (maxV - minV || 1)) * innerH;

  function path(pid: PlayerId) {
    const pts = series
      .map((s, i) => ({ i, v: s.toPar[pid] }))
      .filter((p) => p.v !== null) as { i: number; v: number }[];
    if (pts.length === 0) return "";
    return pts
      .map((p, idx) => `${idx === 0 ? "M" : "L"} ${x(p.i).toFixed(1)} ${y(p.v).toFixed(1)}`)
      .join(" ");
  }

  // gridlines at even strokes
  const gridLines: number[] = [];
  for (let v = Math.ceil(minV / 2) * 2; v <= maxV; v += 2) gridLines.push(v);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-fairway-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-fairway-500">
            Score vs Par — by round
          </h2>
          <div className="flex gap-3 text-xs">
            {PLAYER_IDS.map((pid) => (
              <span key={pid} className="flex items-center gap-1.5">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ background: COLORS[pid] }}
                />
                {settings.players[pid]}
              </span>
            ))}
          </div>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Score versus par by round">
          {/* gridlines */}
          {gridLines.map((v) => (
            <g key={v}>
              <line
                x1={pad.left}
                x2={W - pad.right}
                y1={y(v)}
                y2={y(v)}
                stroke={v === 0 ? "#9ca3af" : "#e5e7eb"}
                strokeDasharray={v === 0 ? "0" : "3 3"}
              />
              <text x={8} y={y(v) + 4} fontSize="11" fill="#6b7280">
                {formatToPar(v)}
              </text>
            </g>
          ))}
          {/* lines */}
          {PLAYER_IDS.map((pid) => (
            <path
              key={pid}
              d={path(pid)}
              fill="none"
              stroke={COLORS[pid]}
              strokeWidth={2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}
          {/* points */}
          {PLAYER_IDS.map((pid) =>
            series.map((s, i) =>
              s.toPar[pid] === null ? null : (
                <circle
                  key={`${pid}-${i}`}
                  cx={x(i)}
                  cy={y(s.toPar[pid] as number)}
                  r={3.5}
                  fill="#fff"
                  stroke={COLORS[pid]}
                  strokeWidth={2}
                >
                  <title>
                    {settings.players[pid]} · {s.course || s.date}: {formatToPar(s.toPar[pid] as number)}
                  </title>
                </circle>
              )
            )
          )}
          {/* x labels */}
          {series.map((s, i) =>
            n <= 12 || i % Math.ceil(n / 12) === 0 ? (
              <text
                key={i}
                x={x(i)}
                y={H - 14}
                fontSize="10"
                fill="#6b7280"
                textAnchor="middle"
              >
                {s.date.slice(5)}
              </text>
            ) : null
          )}
        </svg>
        <p className="mt-1 text-center text-xs text-fairway-400">
          Lower is better. Line dips below the grey line = under par.
        </p>
      </div>

      {/* Win timeline */}
      <div className="rounded-2xl border border-fairway-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-fairway-500">
          Win timeline
        </h2>
        <div className="flex flex-wrap gap-1.5">
          {series.map((s) => {
            const bg =
              s.winner === "p1"
                ? COLORS.p1
                : s.winner === "p2"
                ? COLORS.p2
                : s.winner === "tie"
                ? "#f59e0b"
                : "#d1d5db";
            const label =
              s.winner === "p1"
                ? settings.players.p1
                : s.winner === "p2"
                ? settings.players.p2
                : s.winner === "tie"
                ? "Tie"
                : "In progress";
            return (
              <span
                key={s.id}
                title={`${s.date} · ${s.course || "round"} — ${label}`}
                className="h-6 w-6 rounded"
                style={{ background: bg }}
              />
            );
          })}
        </div>
        <p className="mt-2 text-xs text-fairway-400">Oldest → newest. Hover a square for details.</p>
      </div>
    </div>
  );
}
