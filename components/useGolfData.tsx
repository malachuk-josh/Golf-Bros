"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Round, Settings } from "@/lib/types";
import { DEFAULT_SETTINGS } from "@/lib/golf";

interface GolfData {
  rounds: Round[];
  settings: Settings;
  backend: "upstash" | "local" | "unknown";
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  saveRound: (round: Round) => Promise<void>;
  deleteRound: (id: string) => Promise<void>;
  saveSettings: (settings: Settings) => Promise<void>;
}

const Ctx = createContext<GolfData | null>(null);

export function GolfDataProvider({ children }: { children: React.ReactNode }) {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [backend, setBackend] = useState<GolfData["backend"]>("unknown");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const [r, s] = await Promise.all([
        fetch("/api/rounds", { cache: "no-store" }),
        fetch("/api/settings", { cache: "no-store" }),
      ]);
      if (!r.ok || !s.ok) throw new Error("Failed to load data");
      const rj = await r.json();
      const sj = await s.json();
      setRounds(rj.rounds || []);
      setBackend(rj.backend || "unknown");
      setSettings({ ...DEFAULT_SETTINGS, ...(sj.settings || {}) });
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
          new Date(b.date).getTime() - new Date(a.date).getTime() ||
          b.createdAt - a.createdAt
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

  const value = useMemo<GolfData>(
    () => ({
      rounds,
      settings,
      backend,
      loading,
      error,
      refresh,
      saveRound,
      deleteRound,
      saveSettings,
    }),
    [rounds, settings, backend, loading, error, refresh, saveRound, deleteRound, saveSettings]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useGolfData(): GolfData {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useGolfData must be used within GolfDataProvider");
  return ctx;
}
