import { NextResponse } from "next/server";
import { getPlayers, upsertPlayer, deletePlayer } from "@/lib/store";
import type { Player } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const players = await getPlayers();
  return NextResponse.json({ players });
}

export async function POST(req: Request) {
  const body = (await req.json()) as Player;
  if (!body || !body.id || typeof body.name !== "string") {
    return NextResponse.json({ error: "Invalid player" }, { status: 400 });
  }
  const saved = await upsertPlayer(body);
  return NextResponse.json({ player: saved });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await deletePlayer(id);
  return NextResponse.json({ ok: true });
}
