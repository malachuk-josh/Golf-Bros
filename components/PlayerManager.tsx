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
    setEditing({ id: uid(), name: "", handicap: 0, color: nextPlayerColor(players), createdAt: Date.now() });
  }

  if (editing) {
    return <PlayerForm initial={editing} existing={players} onCancel={() => setEditing(null)} onSave={async (p) => { await onSave(p); setEditing(null); }} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="eyebrow">// {players.length} {players.length === 1 ? "player" : "players"} · persistent season stats</div>
        <button onClick={startNew} className="rounded-lg border border-brass2 bg-brass/15 px-4 py-2 font-mono text-xs uppercase tracking-eyebrow text-brass transition hover:bg-brass/25">+ Player</button>
      </div>

      {players.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-panel p-10 text-center">
          <div className="eyebrow">// roster empty</div>
          <p className="mt-2 font-display text-lg font-medium text-ink">No players yet</p>
          <p className="text-sm text-mut">Add yourself and your friends to start tracking.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {players.map((p) => {
            const s = stats.byPlayer[p.id];
            return (
              <div key={p.id} className="flex items-center gap-3 rounded-xl border border-line bg-panel p-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-display text-lg font-bold text-bg" style={{ background: p.color }}>{p.name.slice(0, 1).toUpperCase() || "?"}</div>
                <div className="min-w-0 flex-1">
                  <div className="font-display font-medium text-ink">{p.name || "Unnamed"}</div>
                  <div className="font-mono text-xs text-mut">hcp {p.handicap}{s ? ` · ${s.rounds} ${s.rounds === 1 ? "round" : "rounds"} · ${s.wins}-${s.losses}-${s.ties}` + (s.rounds ? ` · avg ${formatToPar(Math.round(s.avgToPar))}` : "") : " · no rounds yet"}</div>
                </div>
                <button onClick={() => setEditing(p)} className="rounded-lg border border-line px-3 py-1.5 font-mono text-xs uppercase tracking-eyebrow text-mut transition hover:text-ink">Edit</button>
                <button onClick={() => { const played = s && s.rounds > 0; const msg = played ? `${p.name} has ${s!.rounds} completed round(s). Past rounds keep their scores. Remove from roster?` : `Delete ${p.name}?`; if (confirm(msg)) onDelete(p.id); }} className="rounded-lg border border-down/40 px-2 py-1.5 font-mono text-xs text-down transition hover:bg-down/10" aria-label={`Delete ${p.name}`}>✕</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PlayerForm({ initial, existing, onSave, onCancel }: { initial: Player; existing: Player[]; onSave: (p: Player) => Promise<void>; onCancel: () => void }) {
  const [draft, setDraft] = useState<Player>({ ...initial });
  const [saving, setSaving] = useState(false);
  const valid = draft.name.trim().length > 0;
  const field = "mt-1 w-full rounded-lg border border-line bg-panel2 px-3 py-2 text-ink";

  return (
    <div className="rounded-xl border border-line bg-panel p-5">
      <div className="eyebrow">// {existing.some((p) => p.id === initial.id) ? "edit player" : "add player"}</div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="eyebrow">Name</label>
          <input type="text" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Josh" className={field} />
        </div>
        <div>
          <label className="eyebrow">Handicap</label>
          <input type="number" min={0} max={54} value={draft.handicap} onChange={(e) => setDraft({ ...draft, handicap: Math.max(0, Math.min(54, parseInt(e.target.value, 10) || 0)) })} className={field} />
        </div>
      </div>
      <div className="mt-4">
        <label className="eyebrow">Color</label>
        <div className="mt-1 flex flex-wrap gap-2">
          {PLAYER_COLORS.map((c) => (
            <button key={c} onClick={() => setDraft({ ...draft, color: c })} className={`h-8 w-8 rounded-full border-2 transition ${draft.color === c ? "scale-110 border-ink" : "border-transparent"}`} style={{ background: c }} aria-label={`Color ${c}`} />
          ))}
        </div>
      </div>
      <div className="mt-5 flex items-center gap-3">
        <button onClick={async () => { if (!valid) return; setSaving(true); try { await onSave({ ...draft, name: draft.name.trim() }); } finally { setSaving(false); } }} disabled={!valid || saving} className="rounded-lg border border-brass2 bg-brass/15 px-5 py-2.5 font-mono text-sm uppercase tracking-eyebrow text-brass transition hover:bg-brass/25 disabled:opacity-50">{saving ? "Saving…" : "Save player"}</button>
        <button onClick={onCancel} className="rounded-lg border border-line px-4 py-2.5 font-mono text-xs uppercase tracking-eyebrow text-mut transition hover:text-ink">Cancel</button>
      </div>
    </div>
  );
}
