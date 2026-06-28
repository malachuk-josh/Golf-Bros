import { NextResponse } from "next/server";
import { getRounds, upsertRound, storageBackend } from "@/lib/store";
import type { Round } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const rounds = await getRounds();
  return NextResponse.json({ rounds, backend: storageBackend() });
}

export async function POST(req: Request) {
  const body = (await req.json()) as Round;
  if (!body || !body.id || !Array.isArray(body.holes)) {
    return NextResponse.json({ error: "Invalid round" }, { status: 400 });
  }
  const saved = await upsertRound(body);
  return NextResponse.json({ round: saved });
}
