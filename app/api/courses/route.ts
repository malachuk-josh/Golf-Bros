import { NextResponse } from "next/server";
import { getCourses, upsertCourse, deleteCourse } from "@/lib/store";
import type { CourseTemplate } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const courses = await getCourses();
  return NextResponse.json({ courses });
}

export async function POST(req: Request) {
  const body = (await req.json()) as CourseTemplate;
  if (!body || !body.id || !Array.isArray(body.pars)) {
    return NextResponse.json({ error: "Invalid course" }, { status: 400 });
  }
  const saved = await upsertCourse(body);
  return NextResponse.json({ course: saved });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await deleteCourse(id);
  return NextResponse.json({ ok: true });
}
