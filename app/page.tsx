"use client";

import { useState } from "react";
import { GolfDataProvider, useGolfData } from "@/components/useGolfData";
import Scorecard from "@/components/Scorecard";
import Standings from "@/components/Standings";
import History from "@/components/History";
import Trends from "@/components/Trends";
import StatsView from "@/components/StatsView";
import SettingsPanel from "@/components/SettingsPanel";
import CourseManager from "@/components/CourseManager";
import PlayerManager from "@/components/PlayerManager";
import type { CourseTemplate, Round } from "@/lib/types";
import { newRound, roundFromCourse } from "@/lib/golf";

type Tab =
  | "play"
  | "standings"
  | "history"
  | "stats"
  | "courses"
  | "players"
  | "settings";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "play", label: "Play", icon: "⛳️" },
  { id: "standings", label: "Standings", icon: "🏆" },
  { id: "history", label: "Season", icon: "🗓️" },
  { id: "stats", label: "Stats", icon: "📊" },
  { id: "players", label: "Players", icon: "🧑‍🤝‍🧑" },
  { id: "courses", label: "Courses", icon: "🗺️" },
  { id: "settings", label: "Settings", icon: "⚙️" },
];

function App() {
  const {
    rounds,
    courses,
    players,
    settings,
    backend,
    loading,
    error,
    saveRound,
    deleteRound,
    saveSettings,
    saveCourse,
    deleteCourse,
    savePlayer,
    deletePlayer,
  } = useGolfData();
  const [tab, setTab] = useState<Tab>("play");
  const [editing, setEditing] = useState<Round | null>(null);
  const [draftKey, setDraftKey] = useState(0);
  const [undo, setUndo] = useState<Round | null>(null);

  function openRound(r: Round) {
    setEditing(r);
    setTab("play");
    setDraftKey((k) => k + 1);
  }

  function newCard() {
    setEditing(newRound(settings.defaultHoles, players));
    setTab("play");
    setDraftKey((k) => k + 1);
  }

  function playCourse(course: CourseTemplate, target: 9 | 18, nine: "front" | "back") {
    setEditing(roundFromCourse(course, target, nine, players));
    setTab("play");
    setDraftKey((k) => k + 1);
  }

  async function handleDelete(id: string) {
    const removed = rounds.find((r) => r.id === id) || null;
    await deleteRound(id);
    if (removed) {
      setUndo(removed);
      setTimeout(() => setUndo((cur) => (cur && cur.id === removed.id ? null : cur)), 6000);
    }
  }

  async function restoreUndo() {
    if (!undo) return;
    await saveRound(undo);
    setUndo(null);
  }

  const subtitle =
    players.length > 0
      ? `${players.map((p) => p.name).slice(0, 3).join(", ")}${players.length > 3 ? ` +${players.length - 3}` : ""} · ${rounds.length} ${rounds.length === 1 ? "round" : "rounds"}`
      : "Add players to get started";

  return (
    <div className="mx-auto max-w-3xl px-4 pb-28 pt-6">
      <header className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-fairway-800">
            {settings.seasonName || "Golf Season"}
          </h1>
          <p className="text-sm text-fairway-500">{subtitle}</p>
        </div>
        <div className="text-3xl">⛳️</div>
      </header>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
      )}

      <nav className="mb-5 flex gap-1 overflow-x-auto rounded-xl border border-fairway-200 bg-white p-1 shadow-sm">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            aria-current={tab === t.id ? "page" : undefined}
            className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition ${tab === t.id ? "bg-fairway-100 text-fairway-800 ring-1 ring-inset ring-fairway-200" : "text-fairway-600 hover:bg-fairway-50"}`}
          >
            <span aria-hidden className="inline-block w-[18px] text-center text-[15px] leading-none">{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>

      {loading ? (
        <div className="py-20 text-center text-fairway-500">Loading…</div>
      ) : (
        <main>
          {tab === "play" &&
            (players.length === 0 ? (
              <NeedPlayers onGo={() => setTab("players")} />
            ) : (
              (() => {
                const isExisting = editing ? rounds.some((r) => r.id === editing.id) : false;
                return (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="font-semibold text-fairway-700">{isExisting ? "Editing round" : "New round"}</h2>
                      {isExisting && (
                        <button onClick={newCard} className="rounded-lg border border-fairway-300 px-3 py-1.5 text-sm font-semibold text-fairway-700 transition hover:bg-fairway-50">+ Start fresh round</button>
                      )}
                    </div>
                    <Scorecard
                      key={draftKey}
                      initialRound={editing || newRound(settings.defaultHoles, players)}
                      players={players}
                      courses={courses}
                      onSave={async (r) => {
                        await saveRound(r);
                        setEditing(r);
                      }}
                      onSaveCourse={saveCourse}
                      onDelete={isExisting ? handleDelete : undefined}
                      onClose={isExisting ? () => { setEditing(null); setTab("history"); } : undefined}
                    />
                  </div>
                );
              })()
            ))}
          {tab === "standings" && <Standings rounds={rounds} players={players} defaultMode={settings.defaultMode} />}
          {tab === "history" && <History rounds={rounds} players={players} onOpen={openRound} />}
          {tab === "stats" && (
            <div className="space-y-6">
              <StatsView rounds={rounds} players={players} />
              <Trends rounds={rounds} players={players} />
            </div>
          )}
          {tab === "players" && (
            <PlayerManager players={players} rounds={rounds} onSave={savePlayer} onDelete={deletePlayer} />
          )}
          {tab === "courses" && (
            <CourseManager courses={courses} onSave={saveCourse} onDelete={deleteCourse} onPlay={playCourse} />
          )}
          {tab === "settings" && <SettingsPanel settings={settings} backend={backend} onSave={saveSettings} />}
        </main>
      )}

      {undo && (
        <div className="fixed inset-x-0 bottom-4 z-50 mx-auto flex w-[calc(100%-2rem)] max-w-md items-center justify-between gap-4 rounded-xl border border-fairway-300 bg-fairway-800 px-4 py-3 text-white shadow-xl">
          <span className="text-sm">Deleted {undo.course || "round"} <span className="text-fairway-200">({undo.date})</span></span>
          <button onClick={restoreUndo} className="rounded-lg bg-white/15 px-3 py-1.5 text-sm font-semibold transition hover:bg-white/25">Undo</button>
        </div>
      )}
    </div>
  );
}

function NeedPlayers({ onGo }: { onGo: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-fairway-300 bg-white/60 p-10 text-center">
      <div className="text-4xl">🧑‍🤝‍🧑</div>
      <p className="mt-2 font-semibold text-fairway-700">Add players first</p>
      <p className="text-sm text-fairway-500">You need at least one player before scoring a round.</p>
      <button onClick={onGo} className="mt-4 rounded-lg bg-fairway-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-fairway-700">Go to Players</button>
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
