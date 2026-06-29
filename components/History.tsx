"use client";

import { useMemo, useState } from "react";
import type { Player, Round } from "@/lib/types";
import { formatToPar, roundPlayers, roundTotals } from "@/lib/golf";

export default function History({
  rounds,
  players,
  onOpen,
}: {
  rounds: Round[];
  players: Player[];
  onOpen: (round: Round) => void;
}) {
  const nameOf = (id: string) => players.find((p) => p.id === id)?.name || "Player";
  const colorOf = (id: string) => players.find((p) => p.id === id)?.color || "#7E8CA0";

  const [playerFilter, setPlayerFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = rounds.filter((r) => {
      if (playerFilter !== "all" && !roundPlayers(r).includes(playerFilter)) return false;
      if (q && !(r.course || "").toLowerCase().includes(q)) return false;
      return true;
    });
    list.sort((a, b) => {
      const d = new Date(a.date).getTime() - new Date(b.date).getTime() || a.createdAt - b.createdAt;
      return sort === "newest" ? -d : d;
    });
    return list;
  }, [rounds, playerFilter, query, sort]);

  if (rounds.length === 0) {
    return (
      <div className="rounded-xl border border-dashed glass p-10 text-center">
        <div className="eyebrow">// season empty</div>
        <p className="mt-2 font-display text-lg font-medium text-ink">No saved rounds</p>
        <p className="text-sm text-mut">Your season's rounds will appear here once you save one.</p>
      </div>
    );
  }

  const sel = "rounded-lg border border-line bg-panel2 px-2 py-1.5 text-sm text-ink";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border glass px-3 py-2">
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search course…" className="min-w-[8rem] flex-1 rounded-lg border border-line bg-panel2 px-3 py-1.5 text-sm text-ink" />
        <select value={playerFilter} onChange={(e) => setPlayerFilter(e.target.value)} className={sel}>
          <option value="all">All players</option>
          {players.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as "newest" | "oldest")} className={sel}>
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
        </select>
      </div>

      {filtered.length === 0 && (
        <p className="rounded-xl border border-dashed glass px-4 py-6 text-center text-sm text-mut">No rounds match these filters.</p>
      )}

      {filtered.map((round) => {
        const t = roundTotals(round);
        const ids = roundPlayers(round);
        const dateStr = new Date(round.date + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
        return (
          <button key={round.id} onClick={() => onOpen(round)} className="block w-full rounded-xl border glass p-4 text-left transition hover:border-brass2">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="font-display font-medium text-ink">{round.course || "Untitled course"}</span>
                <div className="eyebrow mt-0.5 normal-case">{dateStr} · {round.holeCount} holes{round.holeCount === 9 && round.nine && round.nine !== "single" ? ` (${round.nine})` : ""} · {ids.length}p</div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {!t.complete && <Chip className="border-line text-mut">live</Chip>}
                {t.complete && t.winner === "tie" && <Chip className="border-brass2 text-brass">tie</Chip>}
                {t.complete && t.winner && t.winner !== "tie" && <Chip className="border-brass2 bg-brass/15 text-brass">{nameOf(t.winner).split(" ")[0]} ✓</Chip>}
                {t.match && t.match.leader && t.match.leader !== "tie" && t.complete && <Chip className="border-line text-ink">{t.match.label}</Chip>}
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-sm">
              {ids.map((id) => ({ id, pt: t.byPlayer[id] })).sort((a, b) => (a.pt?.strokes || 0) - (b.pt?.strokes || 0)).map(({ id, pt }) => {
                const won = t.winner === id;
                return (
                  <span key={id} className="inline-flex items-baseline gap-1.5">
                    <span className="inline-block h-2 w-2 translate-y-[-1px] rounded-full" style={{ background: colorOf(id) }} />
                    <span className="text-mut">{nameOf(id)}</span>
                    <span className={`font-medium ${won ? "text-brass" : "text-ink"}`}>{pt?.strokes || "–"}</span>
                    {pt?.holesPlayed ? <span className="text-xs text-mut">{formatToPar(pt.toPar)}</span> : null}
                  </span>
                );
              })}
            </div>
          </button>
        );
      })}
    </div>
  );
}

function Chip({ children, className }: { children: React.ReactNode; className: string }) {
  return <span className={`rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-eyebrow ${className}`}>{children}</span>;
}
