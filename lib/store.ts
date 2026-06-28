import { Redis } from "@upstash/redis";
import type { Round, Settings } from "./types";
import { DEFAULT_SETTINGS } from "./golf";

/**
 * Storage layer for the golf season app.
 *
 * Primary backend is Upstash Redis (REST), which is what you get when you
 * connect an Upstash / Vercel KV store to the project. We accept either the
 * Upstash-native env vars or the Vercel KV-style env vars so the app works no
 * matter which way the store was attached.
 *
 * If no Redis credentials are present (e.g. local dev before you've linked a
 * store) we transparently fall back to a file on disk so the app still works.
 */

const ROUNDS_KEY = "golf:rounds";
const SETTINGS_KEY = "golf:settings";

function getRedis(): Redis | null {
  const url =
    process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token =
    process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    return new Redis({ url, token });
  }
  return null;
}

export function storageBackend(): "upstash" | "local" {
  return getRedis() ? "upstash" : "local";
}

// ---------------------------------------------------------------------------
// Local fallback (development only). Vercel's filesystem is ephemeral, so this
// is not a real persistence layer in production — it just keeps local dev usable
// before Upstash is connected.
// ---------------------------------------------------------------------------

import { promises as fs } from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), ".data");
const ROUNDS_FILE = path.join(DATA_DIR, "rounds.json");
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");

async function readLocal<T>(file: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(file, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeLocal(file: string, value: unknown): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(file, JSON.stringify(value, null, 2), "utf8");
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function getSettings(): Promise<Settings> {
  const redis = getRedis();
  if (redis) {
    const s = await redis.get<Settings>(SETTINGS_KEY);
    return { ...DEFAULT_SETTINGS, ...(s || {}) };
  }
  const s = await readLocal<Settings | null>(SETTINGS_FILE, null);
  return { ...DEFAULT_SETTINGS, ...(s || {}) };
}

export async function saveSettings(settings: Settings): Promise<Settings> {
  const redis = getRedis();
  if (redis) {
    await redis.set(SETTINGS_KEY, settings);
  } else {
    await writeLocal(SETTINGS_FILE, settings);
  }
  return settings;
}

export async function getRounds(): Promise<Round[]> {
  const redis = getRedis();
  let rounds: Round[];
  if (redis) {
    rounds = (await redis.get<Round[]>(ROUNDS_KEY)) || [];
  } else {
    rounds = await readLocal<Round[]>(ROUNDS_FILE, []);
  }
  // newest first
  return rounds.sort(
    (a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime() ||
      b.createdAt - a.createdAt
  );
}

async function persistRounds(rounds: Round[]): Promise<void> {
  const redis = getRedis();
  if (redis) {
    await redis.set(ROUNDS_KEY, rounds);
  } else {
    await writeLocal(ROUNDS_FILE, rounds);
  }
}

export async function getRound(id: string): Promise<Round | null> {
  const rounds = await getRounds();
  return rounds.find((r) => r.id === id) || null;
}

export async function upsertRound(round: Round): Promise<Round> {
  const rounds = await getRounds();
  const idx = rounds.findIndex((r) => r.id === round.id);
  round.updatedAt = Date.now();
  if (idx >= 0) {
    rounds[idx] = round;
  } else {
    rounds.push(round);
  }
  await persistRounds(rounds);
  return round;
}

export async function deleteRound(id: string): Promise<void> {
  const rounds = await getRounds();
  await persistRounds(rounds.filter((r) => r.id !== id));
}
