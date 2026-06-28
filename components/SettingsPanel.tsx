"use client";

import { useState } from "react";
import type { Settings } from "@/lib/types";
import { PLAYER_IDS } from "@/lib/golf";

export default function SettingsPanel({
  settings,
  backend,
  onSave,
}: {
  settings: Settings;
  backend: "upstash" | "local" | "unknown";
  onSave: (s: Settings) => Promise<void>;
}) {
  const [draft, setDraft] = useState<Settings>(settings);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await onSave(draft);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-fairway-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-fairway-500">
          Players & Season
        </h2>
        <div className="mt-4 space-y-4">
          <div>
            <label className="text-xs font-medium text-fairway-600">Season name</label>
            <input
              type="text"
              value={draft.seasonName}
              onChange={(e) => setDraft({ ...draft, seasonName: e.target.value })}
              className="mt-1 w-full rounded-lg border border-fairway-200 px-3 py-2"
            />
          </div>
          {PLAYER_IDS.map((pid) => (
            <div key={pid}>
              <label className="text-xs font-medium text-fairway-600">
                Player {pid === "p1" ? "1" : "2"} name
              </label>
              <input
                type="text"
                value={draft.players[pid]}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    players: { ...draft.players, [pid]: e.target.value },
                  })
                }
                className="mt-1 w-full rounded-lg border border-fairway-200 px-3 py-2"
              />
            </div>
          ))}
        </div>
        <div className="mt-5 flex items-center gap-3">
          <button
            onClick={save}
            disabled={saving}
            className="rounded-lg bg-fairway-600 px-5 py-2.5 font-semibold text-white transition hover:bg-fairway-700 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save settings"}
          </button>
          {saved && <span className="text-sm font-medium text-fairway-600">✓ Saved</span>}
        </div>
      </div>

      {/* storage status */}
      <div className="rounded-2xl border border-fairway-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-fairway-500">
          Storage
        </h2>
        <div className="mt-3 flex items-center gap-3">
          <span
            className={`inline-block h-2.5 w-2.5 rounded-full ${
              backend === "upstash" ? "bg-fairway-500" : "bg-amber-400"
            }`}
          />
          <span className="text-sm font-medium text-fairway-800">
            {backend === "upstash"
              ? "Connected to Upstash Redis — your history is saved in the cloud."
              : backend === "local"
              ? "Local fallback (no Upstash connected). History is not durable until Upstash env vars are set."
              : "Checking…"}
          </span>
        </div>
      </div>
    </div>
  );
}
