"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { CourseTemplate, Player, Round, Settings } from "@/lib/types";
import { DEFAULT_SETTINGS } from "@/lib/golf";

interface GolfData {
  rounds: Round[];
  courses: CourseTemplate[];
  players: Player[];
  settings: Settings;
  backend: "upstash" | "local" | "unknown";
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  saveRound: (round: Round) => Promise<void>;
  deleteRound: (id: string) => Promise<void>;
  saveSettings: (settings: Settings) => Promise<void>;
  saveCourse: (course: CourseTemplate) => Promise<void>;
  deleteCourse: (id: string) => Promise<void>;
  savePlayer: (player: Player) => Promise<void>;
  deletePlayer: (id: string) => Promise<void>;
}

const Ctx = createContext<GolfData | null>(null);

export function GolfDataProvider({ children }: { children: React.ReactNode }) {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [courses, setCourses] = useState<CourseTemplate[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [backend, setBackend] = useState<GolfData["backend"]>("unknown");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const [r, s, c, p] = await Promise.all([
        fetch("/api/rounds", { cache: "no-store" }),
        fetch("/api/settings", { cache: "no-store" }),
        fetch("/api/courses", { cache: "no-store" }),
        fetch("/api/players", { cache: "no-store" }),
      ]);
      if (!r.ok || !s.ok || !c.ok || !p.ok) throw new Error("Failed to load data");
      const rj = await r.json();
      const sj = await s.json();
      const cj = await c.json();
      const pj = await p.json();
      setRounds(rj.rounds || []);
      setBackend(rj.backend || "unknown");
      setSettings({
        ...DEFAULT_SETTINGS,
        seasonName: sj.settings?.seasonName ?? DEFAULT_SETTINGS.seasonName,
        defaultHoles: sj.settings?.defaultHoles ?? DEFAULT_SETTINGS.defaultHoles,
        defaultMode: sj.settings?.defaultMode ?? DEFAULT_SETTINGS.defaultMode,
      });
      setCourses(cj.courses || []);
      setPlayers(pj.players || []);
    } catch (e: any) {
      setError(e?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const saveRound = useCallback(async (round: Round) => {
    const res = await fetch("/api/rounds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(round),
    });
    if (!res.ok) throw new Error("Failed to save round");
    setRounds((prev) => {
      const idx = prev.findIndex((r) => r.id === round.id);
      const next = idx >= 0 ? prev.map((r) => (r.id === round.id ? round : r)) : [round, ...prev];
      return next.sort(
        (a, b) =>
          new Date(b.date).getTime() - new Date(a.date).getTime() || b.createdAt - a.createdAt
      );
    });
  }, []);

  const deleteRound = useCallback(async (id: string) => {
    const res = await fetch(`/api/rounds/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete round");
    setRounds((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const saveSettings = useCallback(async (next: Settings) => {
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
    if (!res.ok) throw new Error("Failed to save settings");
    setSettings(next);
  }, []);

  const saveCourse = useCallback(async (course: CourseTemplate) => {
    const res = await fetch("/api/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(course),
    });
    if (!res.ok) throw new Error("Failed to save course");
    setCourses((prev) => {
      const idx = prev.findIndex((c) => c.id === course.id);
      const next = idx >= 0 ? prev.map((c) => (c.id === course.id ? course : c)) : [...prev, course];
      return next.sort((a, b) => a.name.localeCompare(b.name));
    });
  }, []);

  const deleteCourse = useCallback(async (id: string) => {
    const res = await fetch(`/api/courses?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete course");
    setCourses((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const savePlayer = useCallback(async (player: Player) => {
    const res = await fetch("/api/players", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(player),
    });
    if (!res.ok) throw new Error("Failed to save player");
    setPlayers((prev) => {
      const idx = prev.findIndex((p) => p.id === player.id);
      const next = idx >= 0 ? prev.map((p) => (p.id === player.id ? player : p)) : [...prev, player];
      return next.sort((a, b) => a.createdAt - b.createdAt);
    });
  }, []);

  const deletePlayer = useCallback(async (id: string) => {
    const res = await fetch(`/api/players?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete player");
    setPlayers((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const value = useMemo<GolfData>(
    () => ({
      rounds,
      courses,
      players,
      settings,
      backend,
      loading,
      error,
      refresh,
      saveRound,
      deleteRound,
      saveSettings,
      saveCourse,
      deleteCourse,
      savePlayer,
      deletePlayer,
    }),
    [rounds, courses, players, settings, backend, loading, error, refresh, saveRound, deleteRound, saveSettings, saveCourse, deleteCourse, savePlayer, deletePlayer]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useGolfData(): GolfData {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useGolfData must be used within GolfDataProvider");
  return ctx;
}
