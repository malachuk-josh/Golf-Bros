import { Redis } from "@upstash/redis";
import type { CourseTemplate, Player, Round, Settings } from "./types";
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
const COURSES_KEY = "golf:courses";
const PLAYERS_KEY = "golf:players";

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
import os from "os";
import path from "path";

// Prefer a project-local folder for dev discoverability, but fall back to the
// OS temp dir on read-only/serverless filesystems (e.g. Vercel).
const DATA_DIR = process.env.VERCEL
  ? path.join(os.tmpdir(), "golf-season-data")
  : path.join(process.cwd(), ".data");
const ROUNDS_FILE = path.join(DATA_DIR, "rounds.json");
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");
const COURSES_FILE = path.join(DATA_DIR, "courses.json");
const PLAYERS_FILE = path.join(DATA_DIR, "players.json");

// Last-resort in-memory cache so the app never crashes when neither Upstash nor
// a writable filesystem is available. This is per-instance and ephemeral — it's
// only here to keep the UI working until an Upstash store is attached.
const mem: {
  rounds: unknown;
  settings: unknown;
  courses: unknown;
  players: unknown;
} = { rounds: undefined, settings: undefined, courses: undefined, players: undefined };

function memKey(file: string): "rounds" | "settings" | "courses" | "players" {
  if (file === ROUNDS_FILE) return "rounds";
  if (file === COURSES_FILE) return "courses";
  if (file === PLAYERS_FILE) return "players";
  return "settings";
}

async function readLocal<T>(file: string, fallback: T): Promise<T> {
  const key = memKey(file);
  if (mem[key] !== undefined) return mem[key] as T;
  try {
    const raw = await fs.readFile(file, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeLocal(file: string, value: unknown): Promise<void> {
  mem[memKey(file)] = value;
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(file, JSON.stringify(value, null, 2), "utf8");
  } catch {
    // Read-only filesystem — the in-memory cache above keeps things working.
  }
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

// ---------------------------------------------------------------------------
// Course templates
// ---------------------------------------------------------------------------

export async function getCourses(): Promise<CourseTemplate[]> {
  const redis = getRedis();
  let courses: CourseTemplate[];
  if (redis) {
    courses = (await redis.get<CourseTemplate[]>(COURSES_KEY)) || [];
  } else {
    courses = await readLocal<CourseTemplate[]>(COURSES_FILE, []);
  }
  return courses.sort((a, b) => a.name.localeCompare(b.name));
}

async function persistCourses(courses: CourseTemplate[]): Promise<void> {
  const redis = getRedis();
  if (redis) {
    await redis.set(COURSES_KEY, courses);
  } else {
    await writeLocal(COURSES_FILE, courses);
  }
}

export async function upsertCourse(course: CourseTemplate): Promise<CourseTemplate> {
  const courses = await getCourses();
  const idx = courses.findIndex((c) => c.id === course.id);
  if (idx >= 0) courses[idx] = course;
  else courses.push(course);
  await persistCourses(courses);
  return course;
}

export async function deleteCourse(id: string): Promise<void> {
  const courses = await getCourses();
  await persistCourses(courses.filter((c) => c.id !== id));
}

// ---------------------------------------------------------------------------
// Players
// ---------------------------------------------------------------------------

export async function getPlayers(): Promise<Player[]> {
  const redis = getRedis();
  let players: Player[];
  if (redis) {
    players = (await redis.get<Player[]>(PLAYERS_KEY)) || [];
  } else {
    players = await readLocal<Player[]>(PLAYERS_FILE, []);
  }
  return players.sort((a, b) => a.createdAt - b.createdAt);
}

async function persistPlayers(players: Player[]): Promise<void> {
  const redis = getRedis();
  if (redis) {
    await redis.set(PLAYERS_KEY, players);
  } else {
    await writeLocal(PLAYERS_FILE, players);
  }
}

export async function upsertPlayer(player: Player): Promise<Player> {
  const players = await getPlayers();
  const idx = players.findIndex((p) => p.id === player.id);
  if (idx >= 0) players[idx] = player;
  else players.push(player);
  await persistPlayers(players);
  return player;
}

export async function deletePlayer(id: string): Promise<void> {
  const players = await getPlayers();
  await persistPlayers(players.filter((p) => p.id !== id));
}
