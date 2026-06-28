"use client";

import { useState } from "react";
import { GolfDataProvider, useGolfData } from "@/components/useGolfData";
import Scorecard from "@/components/Scorecard";
import Standings from "@/components/Standings";
import History from "@/components/History";
import Trends from "@/components/Trends";
import StatsView from "@/components/StatsView";
import SettingsPanel from "@/components/SettingsPanel";
import type { Round } from "@/lib/types";
import { newRound } from "@/lib/golf";

type Tab = "play" | "standings" | "history" | "trends" | "stats" | "settings";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "play", label: "Play", icon: "⛳️" },
  { id: "standings", label: "Standings", icon: "🏆" },
  { id: "history", label: "History", icon: "🗓️" },
  { id: "trends", label: "Trends", icon: "📈" },
  { id: "stats", label: "Stats", icon: "📊" },
  { id: "settings", label: "Settings", icon: "⚙️" },
];

function App() {
  const {
    rounds,
    settings,
    backend,
    loading,
    error,
    saveRound,
    deleteRound,
    saveSettings,
  } = useGolfData();
  const [tab, setTab] = useState<Tab>("play");
  const [editing, setEditing] = useState<Round | null>(null);
  const [draftKey, setDraftKey] = useState(0);

  function openRound(r: Round) {
    setEditing(r);
    setTab("play");
    setDraftKey((k) => k + 1);
  }

  function newCard() {
    setEditing(null);
    setDraftKey((k) => k + 1);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pb-28 pt-6">
      {/* Header */}
      <header className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-fairway-800">
            {settings.seasonName || "Golf Season"}
          </h1>
          <p className="text-sm text-fairway-500">
            {settings.players.p1} vs {settings.players.p2} · {rounds.length}{" "}
            {rounds.length === 1 ? "round" : "rounds"} logged
          </p>
        </div>
        <div className="text-3xl">⛳️</div>
      </header>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Tabs */}
      <nav className="mb-5 flex gap-1 overflow-x-auto rounded-xl border border-fairway-200 bg-white p-1 shadow-sm">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition ${
              tab === t.id
                ? "bg-fairway-600 text-white shadow-sm"
                : "text-fairway-700 hover:bg-fairway-50"
            }`}
          >
            <span aria-hidden>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>

      {loading ? (
        <div className="py-20 text-center text-fairway-500">Loading…</div>
      ) : (
        <main>
          {tab === "play" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-fairway-700">
                  {editing ? "Editing round" : "New round"}
                </h2>
                <button
                  onClick={newCard}
                  className="rounded-lg border border-fairway-300 px-3 py-1.5 text-sm font-semibold text-fairway-700 transition hover:bg-fairway-50"
                >
                  + New round
                </button>
              </div>
              <Scorecard
                key={draftKey}
                initialRound={editing || newRound(18)}
                settings={settings}
                onSave={async (r) => {
                  await saveRound(r);
                  setEditing(r);
                }}
                onDelete={deleteRound}
                onClose={editing ? () => { setEditing(null); setTab("history"); } : undefined}
              />
            </div>
          )}
          {tab === "standings" && <Standings rounds={rounds} settings={settings} />}
          {tab === "history" && (
            <History rounds={rounds} settings={settings} onOpen={openRound} />
          )}
          {tab === "trends" && <Trends rounds={rounds} settings={settings} />}
          {tab === "stats" && <StatsView rounds={rounds} settings={settings} />}
          {tab === "settings" && (
            <SettingsPanel
              settings={settings}
              backend={backend}
              onSave={saveSettings}
            />
          )}
        </main>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <GolfDataProvider>
      <App />
    </GolfDataProvider>
  );
}
