"use client";

import { useMemo, useState } from "react";
import type { Player, Round } from "@/lib/types";
import { PLAYER_COLORS, formatToPar, nextPlayerColor, seasonStats, uid } from "@/lib/golf";

interface Props {
  players: Player[];
  rounds: Round[];
  onSave: (player: Player) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export default function PlayerManager({ players, rounds, onSave, onDelete }: Props) {
  const [editing, setEditing] = useState<Player | null>(null);
  const stats = useMemo(() => seasonStats(rounds), [rounds]);

  function startNew() {
    setEditing({
      id: uid(),
      name: "",
      handicap: 0,
      color: nextPlayerColor(players),
      createdAt: Date.now(),
    });
  }

  if (editing) {
    return (
      <PlayerForm
        initial={editing}
        existing={players}
        onCancel={() => setEditing(null)}
        onSave={async (p) => {
          await onSave(p);
          setEditing(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-fairway-600">
          {players.length} {players.length === 1 ? "player" : "players"} · each keeps
          persistent stats across the season.
        </p>
        <button
          onClick={startNew}
          className="rounded-lg bg-fairway-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-fairway-700"
        >
          + Add player
        </button>
      </div>

      {players.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-fairway-300 bg-white/60 p-10 text-center">
          <div className="text-4xl">🧑‍🤝‍🧑</div>
          <p className="mt-2 font-semibold text-fairway-700">No players yet</p>
          <p className="text-sm text-fairway-500">Add yourself and your friends to start tracking.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {players.map((p) => {
            const s = stats.byPlayer[p.id];
            return (
              <div key={p.id} className="flex items-center gap-3 rounded-xl border border-fairway-200 bg-white p-3 shadow-sm">
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white"
                  style={{ background: p.color }}
                >
                  {p.name.slice(0, 1).toUpperCase() || "?"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-fairway-900">{p.name || "Unnamed"}</div>
                  <div className="text-xs text-fairway-500">
                    Hcp {p.handicap}
                    {s
                      ? ` · ${s.rounds} ${s.rounds === 1 ? "round" : "rounds"} · ${s.wins}W-${s.losses}L-${s.ties}T` +
                        (s.rounds ? ` · avg ${formatToPar(Math.round(s.avgToPar))}` : "")
                      : " · no completed rounds yet"}
                  </div>
                </div>
                <button
                  onClick={() => setEditing(p)}
                  className="rounded-lg border border-fairway-300 px-3 py-1.5 text-xs font-semibold text-fairway-700 transition hover:bg-fairway-50"
                >
                  Edit
                </button>
                <button
                  onClick={() => {
                    const played = s && s.rounds > 0;
                    const msg = played
                      ? `${p.name} has ${s!.rounds} completed round(s). Deleting removes them from the roster (past rounds keep their scores). Continue?`
                      : `Delete ${p.name}?`;
                    if (confirm(msg)) onDelete(p.id);
                  }}
                  className="rounded-lg border border-red-200 px-2 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                  aria-label={`Delete ${p.name}`}
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PlayerForm({
  initial,
  existing,
  onSave,
  onCancel,
}: {
  initial: Player;
  existing: Player[];
  onSave: (p: Player) => Promise<void>;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<Player>({ ...initial });
  const [saving, setSaving] = useState(false);
  const valid = draft.name.trim().length > 0;

  return (
    <div className="rounded-2xl border border-fairway-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-fairway-500">
        {existing.some((p) => p.id === initial.id) ? "Edit player" : "Add player"}
      </h2>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs font-medium text-fairway-600">Name</label>
          <input
            type="text"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="e.g. Josh"
            className="mt-1 w-full rounded-lg border border-fairway-200 px-3 py-2"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-fairway-600">Handicap</label>
          <input
            type="number"
            min={0}
            max={54}
            value={draft.handicap}
            onChange={(e) => setDraft({ ...draft, handicap: Math.max(0, Math.min(54, parseInt(e.target.value, 10) || 0)) })}
            className="mt-1 w-full rounded-lg border border-fairway-200 px-3 py-2"
          />
        </div>
      </div>

      <div className="mt-4">
        <label className="text-xs font-medium text-fairway-600">Color</label>
        <div className="mt-1 flex flex-wrap gap-2">
          {PLAYER_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setDraft({ ...draft, color: c })}
              className={`h-8 w-8 rounded-full border-2 transition ${draft.color === c ? "border-fairway-900 scale-110" : "border-white"}`}
              style={{ background: c }}
              aria-label={`Color ${c}`}
            />
          ))}
        </div>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button
          onClick={async () => {
            if (!valid) return;
            setSaving(true);
            try {
              await onSave({ ...draft, name: draft.name.trim() });
            } finally {
              setSaving(false);
            }
          }}
          disabled={!valid || saving}
          className="rounded-lg bg-fairway-600 px-5 py-2.5 font-semibold text-white transition hover:bg-fairway-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save player"}
        </button>
        <button onClick={onCancel} className="rounded-lg border border-fairway-300 px-4 py-2.5 font-semibold text-fairway-700 transition hover:bg-fairway-50">
          Cancel
        </button>
      </div>
    </div>
  );
}
