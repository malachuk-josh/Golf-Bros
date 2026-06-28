# ⛳️ Golf Season Scorecard

**Live:** https://golf-season.vercel.app

A custom two-player golf scorekeeping app for tracking a whole season. Built
with Next.js (App Router) and backed by Upstash Redis so every scorecard is
saved to the cloud.

> Auto-deploys on every push to `main` via the Vercel ↔ GitHub integration.

## Features

- **9 or 18 holes** — toggle per round; pick the front or back nine for 9-hole rounds.
- **Fully adjustable scorecard** — edit par on every hole to match any course, enter strokes per player, with live color-coded birdie/par/bogey feedback.
- **Handicaps & net scoring** — set a per-player handicap; strokes are allocated by each hole's stroke index (halved for 9-hole rounds) for live net totals and a net winner.
- **Match play** — automatic holes-won tracking with classic results (e.g. `3&2`, `2 up`, `AS`), live during the round and recorded per round.
- **Course templates** — save a course's par/stroke-index layout once and reload it for future rounds.
- **Multiple ways to view scores:**
  - **Play** — the live scorecard with running totals, net, and a live match-play status.
  - **Standings** — Gross / Net / Match-play head-to-head, scoring average vs par, best round, birdie count.
  - **History** — every saved round with winner, match result, and net badges; tap to re-open and edit (with undo on delete).
  - **Trends** — score-vs-par line chart (completed rounds) + a win timeline.
  - **Stats** — per-player gross/net/match records and scoring distribution (eagles → doubles).
- **Consistent stats** — only fully completed rounds count toward season aggregates; in-progress rounds show in History but never skew averages.
- **Editable players, handicaps & season name** in Settings.
- **Cloud history via Upstash Redis**, with a transparent local-file fallback for dev.

## Tech

- Next.js 14 (App Router, Route Handlers)
- React 18 + TypeScript
- Tailwind CSS
- [`@upstash/redis`](https://github.com/upstash/redis-js) for storage

## Local development

```bash
npm install
cp .env.example .env.local   # optional: add Upstash creds for cloud storage
npm run dev
```

Without Upstash credentials the app falls back to a local JSON file under
`.data/` so you can develop offline. Connect Upstash for durable, shared history.

## Storage

Data lives under two keys in Redis:

- `golf:rounds` — array of all saved rounds
- `golf:settings` — player names and season name

The app reads either `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` or the
Vercel KV-style `KV_REST_API_URL` / `KV_REST_API_TOKEN`, so it works no matter how
the Upstash store was attached on Vercel.

## Deploy

Deployed on Vercel. Connect an Upstash Redis store to the project (Vercel →
Storage → Upstash) and redeploy so the env vars are injected.
