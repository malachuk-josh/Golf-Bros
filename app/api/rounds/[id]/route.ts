import { NextResponse } from "next/server";
import { getRound, deleteRound } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const round = await getRound(params.id);
  if (!round) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ round });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  await deleteRound(params.id);
  return NextResponse.json({ ok: true });
}
