import { NextResponse } from "next/server";
import { getSettings, saveSettings } from "@/lib/store";
import type { Settings } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await getSettings();
  return NextResponse.json({ settings });
}

export async function PUT(req: Request) {
  const body = (await req.json()) as Settings;
  if (!body || typeof body.seasonName !== "string") {
    return NextResponse.json({ error: "Invalid settings" }, { status: 400 });
  }
  const saved = await saveSettings({
    seasonName: body.seasonName,
    defaultHoles: body.defaultHoles === 9 ? 9 : 18,
    defaultMode: (["gross", "net", "match"] as const).includes(body.defaultMode)
      ? body.defaultMode
      : "gross",
  });
  return NextResponse.json({ settings: saved });
}
