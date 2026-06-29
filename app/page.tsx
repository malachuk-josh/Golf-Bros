"use client";

import { useEffect, useState } from "react";
import {
  Flag,
  Trophy,
  CalendarDays,
  LineChart,
  Users,
  Map,
  Settings as SettingsIcon,
  Sun,
  Moon,
  Plus,
  MoreHorizontal,
} from "lucide-react";
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
  | "players"
  | "courses"
  | "settings";

const PRIMARY: { id: Tab; label: string; icon: typeof Flag }[] = [
  { id: "play", label: "Play", icon: Flag },
  { id: "standings", label: "Board", icon: Trophy },
  { id: "history", label: "Season", icon: CalendarDays },
  { id: "stats", label: "Stats", icon: LineChart },
];

const SECONDARY: { id: Tab; label: string; icon: typeof Flag }[] = [
  { id: "players", label: "Players", icon: Users },
  { id: "courses", label: "Courses", icon: Map },
  { id: "settings", label: "Settings", icon: SettingsIcon },
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
  const [moreOpen, setMoreOpen] = useState(false);
  const [daylight, setDaylight] = useState(false);

  useEffect(() => {
    setDaylight(document.documentElement.classList.contains("daylight"));
  }, []);

  function toggleTheme() {
    const next = !daylight;
    setDaylight(next);
    document.documentElement.classList.toggle("daylight", next);
    try {
      localStorage.setItem("scratch-theme", next ? "daylight" : "dark");
    } catch {}
  }

  function go(t: Tab) {
    setTab(t);
    setMoreOpen(false);
  }

  function openRound(r: Round) {
    setEditing(r);
    go("play");
    setDraftKey((k) => k + 1);
  }

  function newCard() {
    setEditing(newRound(settings.defaultHoles, players));
    go("play");
    setDraftKey((k) => k + 1);
  }

  function playCourse(course: CourseTemplate, target: 9 | 18, nine: "front" | "back") {
    setEditing(roundFromCourse(course, target, nine, players));
    go("play");
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

  const moreActive = SECONDARY.some((s) => s.id === tab);

  return (
    <div className="min-h-screen">
      {/* Sticky terminal header */}
      <header className="sticky top-0 z-30 border-b border-[var(--glass-bd)] bg-panel2/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div className="min-w-0">
            <div className="font-display text-lg font-bold tracking-tight text-brass">
              SCRATCH<span className="font-normal text-mut"> // {settings.seasonName || "season desk"}</span>
            </div>
            <div className="eyebrow mt-0.5 truncate">
              {players.length ? `${players.length} players` : "no players"} · {rounds.length} {rounds.length === 1 ? "round" : "rounds"}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={toggleTheme}
              aria-label="Toggle daylight mode"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-mut transition hover:text-ink"
            >
              {daylight ? <Moon size={17} /> : <Sun size={17} />}
            </button>
            <button
              onClick={newCard}
              className="flex items-center gap-1.5 rounded-lg border border-brass2 px-3 py-2 font-mono text-xs font-medium uppercase tracking-eyebrow text-brass transition hover:bg-brass/10"
            >
              <Plus size={15} /> Round
            </button>
          </div>
        </div>
      </header>

      {error && (
        <div className="mx-auto max-w-3xl px-4 pt-3">
          <div className="rounded-lg border border-down/40 bg-down/10 px-4 py-2 text-sm text-down">{error}</div>
        </div>
      )}

      <main className="mx-auto max-w-3xl px-4 pb-28 pt-4">
        {loading ? (
          <div className="py-20 text-center font-mono text-sm text-mut">Loading…</div>
        ) : (
          <>
            {tab === "play" &&
              (players.length === 0 ? (
                <NeedPlayers onGo={() => go("players")} />
              ) : (
                (() => {
                  const isExisting = editing ? rounds.some((r) => r.id === editing.id) : false;
                  return (
                    <Scorecard
                      key={draftKey}
                      initialRound={editing || newRound(settings.defaultHoles, players)}
                      isExisting={isExisting}
                      players={players}
                      courses={courses}
                      onSave={async (r) => {
                        await saveRound(r);
                        setEditing(r);
                      }}
                      onSaveCourse={saveCourse}
                      onNew={newCard}
                      onDelete={isExisting ? handleDelete : undefined}
                      onClose={isExisting ? () => { setEditing(null); go("history"); } : undefined}
                    />
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
            {tab === "players" && <PlayerManager players={players} rounds={rounds} onSave={savePlayer} onDelete={deletePlayer} />}
            {tab === "courses" && <CourseManager courses={courses} onSave={saveCourse} onDelete={deleteCourse} onPlay={playCourse} />}
            {tab === "settings" && <SettingsPanel settings={settings} backend={backend} onSave={saveSettings} />}
          </>
        )}
      </main>

      {/* More sheet */}
      {moreOpen && (
        <button
          aria-label="Close menu"
          onClick={() => setMoreOpen(false)}
          className="fixed inset-0 z-30 bg-black/40"
        />
      )}
      {moreOpen && (
        <div className="fixed inset-x-0 bottom-[60px] z-40 mx-auto max-w-3xl px-3 pb-2">
          <div className="glass-2 overflow-hidden rounded-xl shadow-2xl">
            {SECONDARY.map((s) => (
              <button
                key={s.id}
                onClick={() => go(s.id)}
                className={`flex w-full items-center gap-3 border-b border-line px-4 py-3 text-left text-sm font-medium last:border-0 ${tab === s.id ? "text-brass" : "text-ink"}`}
              >
                <s.icon size={18} /> {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bottom tab bar */}
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-[var(--glass-bd)] bg-panel2/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-stretch justify-around">
          {PRIMARY.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => go(t.id)}
                aria-current={active ? "page" : undefined}
                className={`flex flex-1 flex-col items-center gap-1 py-2.5 font-mono text-[10px] uppercase tracking-eyebrow transition ${active ? "text-brass" : "text-mut hover:text-ink"}`}
              >
                <t.icon size={20} strokeWidth={active ? 2.4 : 1.8} />
                {t.label}
              </button>
            );
          })}
          <button
            onClick={() => setMoreOpen((v) => !v)}
            className={`flex flex-1 flex-col items-center gap-1 py-2.5 font-mono text-[10px] uppercase tracking-eyebrow transition ${moreActive || moreOpen ? "text-brass" : "text-mut hover:text-ink"}`}
          >
            <MoreHorizontal size={20} strokeWidth={moreActive || moreOpen ? 2.4 : 1.8} />
            More
          </button>
        </div>
      </nav>

      {undo && (
        <div className="glass-2 fixed inset-x-0 bottom-[72px] z-50 mx-auto flex w-[calc(100%-2rem)] max-w-md items-center justify-between gap-4 rounded-xl px-4 py-3 text-ink shadow-2xl">
          <span className="text-sm">Deleted {undo.course || "round"} <span className="text-mut">({undo.date})</span></span>
          <button onClick={restoreUndo} className="rounded-lg border border-brass2 px-3 py-1.5 font-mono text-xs uppercase tracking-eyebrow text-brass transition hover:bg-brass/10">Undo</button>
        </div>
      )}
    </div>
  );
}

function NeedPlayers({ onGo }: { onGo: () => void }) {
  return (
    <div className="rounded-xl border border-dashed glass p-10 text-center">
      <div className="eyebrow">// roster empty</div>
      <p className="mt-2 font-display text-lg font-medium text-ink">Add players to start</p>
      <p className="text-sm text-mut">You need at least one player before scoring a round.</p>
      <button onClick={onGo} className="mt-4 rounded-lg border border-brass2 px-4 py-2 font-mono text-xs uppercase tracking-eyebrow text-brass transition hover:bg-brass/10">Go to players</button>
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
