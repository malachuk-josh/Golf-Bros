"use client";

import { useState } from "react";
import type { Settings } from "@/lib/types";

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

  const segBtn = (on: boolean) => `px-4 py-2 font-mono text-xs uppercase tracking-eyebrow capitalize transition ${on ? "bg-brass/15 text-brass" : "text-mut hover:text-ink"}`;

  return (
    <div className="space-y-5">
      <div className="rounded-xl border glass p-5">
        <div className="eyebrow">// season</div>
        <div className="mt-4">
          <label className="eyebrow">Season name</label>
          <input type="text" value={draft.seasonName} onChange={(e) => setDraft({ ...draft, seasonName: e.target.value })} className="mt-1 w-full rounded-lg border border-line bg-panel2 px-3 py-2 text-ink" />
        </div>

        <div className="mt-4 flex flex-wrap gap-6">
          <div>
            <label className="eyebrow block">Default holes</label>
            <div className="mt-1 inline-flex overflow-hidden rounded-lg border border-line">{([9, 18] as const).map((h) => (<button key={h} onClick={() => setDraft({ ...draft, defaultHoles: h })} className={segBtn(draft.defaultHoles === h)}>{h}</button>))}</div>
          </div>
          <div>
            <label className="eyebrow block">Default board view</label>
            <div className="mt-1 inline-flex overflow-hidden rounded-lg border border-line">{(["gross", "net", "match"] as const).map((m) => (<button key={m} onClick={() => setDraft({ ...draft, defaultMode: m })} className={segBtn(draft.defaultMode === m)}>{m}</button>))}</div>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button onClick={save} disabled={saving} className="rounded-lg border border-brass2 bg-brass/15 px-5 py-2.5 font-mono text-sm uppercase tracking-eyebrow text-brass transition hover:bg-brass/25 disabled:opacity-60">{saving ? "Saving…" : "Save settings"}</button>
          {saved && <span className="font-mono text-xs text-up">✓ saved</span>}
        </div>
        <p className="mt-3 font-mono text-[11px] text-mut">Manage players and handicaps in the Players tab.</p>
      </div>

      <div className="rounded-xl border glass p-5">
        <div className="eyebrow">// storage</div>
        <div className="mt-3 flex items-center gap-3">
          <span className={`inline-block h-2.5 w-2.5 rounded-full ${backend === "upstash" ? "bg-up" : "bg-brass"}`} />
          <span className="text-sm text-ink">{backend === "upstash" ? "Connected to Upstash Redis — your season is saved in the cloud and shared between players." : backend === "local" ? "Local fallback (no Upstash connected). History is not durable until Upstash env vars are set." : "Checking…"}</span>
        </div>
      </div>
    </div>
  );
}
