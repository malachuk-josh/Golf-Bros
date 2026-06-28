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
  const colorOf = (id: string) => players.find((p) => p.id === id)?.color || "#475569";

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
      <div className="rounded-2xl border border-dashed border-fairway-300 bg-white/60 p-10 text-center">
        <div className="text-4xl">🗓️</div>
        <p className="mt-2 font-semibold text-fairway-700">No saved rounds</p>
        <p className="text-sm text-fairway-500">Your season's rounds will appear here once you save one.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* filter / sort bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-fairway-200 bg-white px-3 py-2 shadow-sm">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search course…"
          className="min-w-[8rem] flex-1 rounded-lg border border-fairway-200 px-3 py-1.5 text-sm"
        />
        <select value={playerFilter} onChange={(e) => setPlayerFilter(e.target.value)} className="rounded-lg border border-fairway-200 px-2 py-1.5 text-sm">
          <option value="all">All players</option>
          {players.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as "newest" | "oldest")} className="rounded-lg border border-fairway-200 px-2 py-1.5 text-sm">
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
      </div>

      {filtered.length === 0 && (
        <p className="rounded-xl border border-dashed border-fairway-300 bg-white/60 px-4 py-6 text-center text-sm text-fairway-500">
          No rounds match these filters.
        </p>
      )}

      {filtered.map((round) => {
        const t = roundTotals(round);
        const ids = roundPlayers(round);
        const dateStr = new Date(round.date + "T00:00:00").toLocaleDateString(undefined, {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric",
        });
        return (
          <button
            key={round.id}
            onClick={() => onOpen(round)}
            className="block w-full rounded-xl border border-fairway-200 bg-white p-4 text-left shadow-sm transition hover:border-fairway-400 hover:shadow"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="font-semibold text-fairway-900">{round.course || "Untitled course"}</span>
                <div className="text-xs text-fairway-500">
                  {dateStr} · {round.holeCount} holes
                  {round.holeCount === 9 && round.nine && round.nine !== "single" ? ` (${round.nine})` : ""}
                  {" · "}{ids.length} players
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {!t.complete && <Chip className="bg-fairway-100 text-fairway-500">In progress</Chip>}
                {t.complete && t.winner === "tie" && <Chip className="bg-amber-100 text-amber-700">Tie</Chip>}
                {t.complete && t.winner && t.winner !== "tie" && (
                  <Chip className="bg-fairway-600 text-white">{nameOf(t.winner).split(" ")[0]} ✓</Chip>
                )}
                {t.match && t.match.leader && t.match.leader !== "tie" && t.complete && (
                  <Chip className="bg-fairway-100 text-fairway-700">{t.match.label}</Chip>
                )}
              </div>
            </div>

            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
              {ids
                .map((id) => ({ id, pt: t.byPlayer[id] }))
                .sort((a, b) => (a.pt?.strokes || 0) - (b.pt?.strokes || 0))
                .map(({ id, pt }) => {
                  const won = t.winner === id;
                  return (
                    <span key={id} className="inline-flex items-baseline gap-1.5 text-sm">
                      <span className="inline-block h-2 w-2 translate-y-[-1px] rounded-full" style={{ background: colorOf(id) }} />
                      <span className="text-fairway-600">{nameOf(id)}</span>
                      <span className={`font-bold ${won ? "text-fairway-700" : "text-fairway-900/70"}`}>{pt?.strokes || "–"}</span>
                      {pt?.holesPlayed ? <span className="text-xs text-fairway-400">{formatToPar(pt.toPar)}</span> : null}
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
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}>{children}</span>;
}
