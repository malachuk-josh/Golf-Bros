"use client";

import type { Round, Settings } from "@/lib/types";
import { PLAYER_IDS, formatToPar, roundTotals } from "@/lib/golf";

export default function History({
  rounds,
  settings,
  onOpen,
}: {
  rounds: Round[];
  settings: Settings;
  onOpen: (round: Round) => void;
}) {
  if (rounds.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-fairway-300 bg-white/60 p-10 text-center">
        <div className="text-4xl">🗓️</div>
        <p className="mt-2 font-semibold text-fairway-700">No saved rounds</p>
        <p className="text-sm text-fairway-500">
          Your scorecard history will appear here once you save a round.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {rounds.map((round) => {
        const t = roundTotals(round);
        const dateStr = new Date(round.date + "T00:00:00").toLocaleDateString(
          undefined,
          { weekday: "short", month: "short", day: "numeric", year: "numeric" }
        );
        return (
          <button
            key={round.id}
            onClick={() => onOpen(round)}
            className="flex w-full items-center gap-4 rounded-xl border border-fairway-200 bg-white p-4 text-left shadow-sm transition hover:border-fairway-400 hover:shadow"
          >
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="font-semibold text-fairway-900">
                {round.course || "Untitled course"}
              </span>
              <span className="text-xs text-fairway-500">
                {dateStr} · {round.holeCount} holes
                {round.holeCount === 9 && round.nine ? ` (${round.nine})` : ""}
              </span>
            </div>
            <div className="flex items-center gap-4">
              {PLAYER_IDS.map((pid) => {
                const pt = t.byPlayer[pid];
                const won = t.winner === pid;
                return (
                  <div key={pid} className="text-right">
                    <div className="text-[11px] font-medium text-fairway-500">
                      {settings.players[pid]}
                    </div>
                    <div
                      className={`text-lg font-bold ${
                        won ? "text-fairway-700" : "text-fairway-900/70"
                      }`}
                    >
                      {pt.strokes || "–"}
                      {pt.holesPlayed > 0 && (
                        <span className="ml-1 text-xs font-medium text-fairway-400">
                          {formatToPar(pt.toPar)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              <Badge winner={t.winner} a={settings.players.p1} b={settings.players.p2} />
            </div>
          </button>
        );
      })}
    </div>
  );
}

function Badge({
  winner,
  a,
  b,
}: {
  winner: "p1" | "p2" | "tie" | null;
  a: string;
  b: string;
}) {
  if (winner === null)
    return (
      <span className="rounded-full bg-fairway-100 px-2.5 py-1 text-xs font-medium text-fairway-500">
        In progress
      </span>
    );
  if (winner === "tie")
    return (
      <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
        Tie
      </span>
    );
  return (
    <span className="rounded-full bg-fairway-600 px-2.5 py-1 text-xs font-semibold text-white">
      {(winner === "p1" ? a : b).split(" ")[0]} ✓
    </span>
  );
}
