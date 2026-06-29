"use client";

import { useMemo, useState } from "react";
import type { CourseTemplate } from "@/lib/types";
import { courseDefaultPar, courseNinePar, courseOptions, uid } from "@/lib/golf";

const STD_PARS = [4, 4, 5, 3, 4, 4, 3, 5, 4, 4, 4, 3, 5, 4, 4, 3, 5, 4];

function blankCourse(holeCount: 9 | 18): CourseTemplate {
  const pars = STD_PARS.slice(0, holeCount);
  return { id: uid(), name: "", town: "", holeCount, pars, sis: pars.map((_, i) => i + 1), playsTwice: false, parVerified: true, notes: "", createdAt: Date.now() };
}

interface Props {
  courses: CourseTemplate[];
  onSave: (course: CourseTemplate) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onPlay: (course: CourseTemplate, target: 9 | 18, nine: "front" | "back") => void;
}

export default function CourseManager({ courses, onSave, onDelete, onPlay }: Props) {
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<CourseTemplate | null>(null);

  const sorted = useMemo(
    () => [...courses].filter((c) => { const q = query.trim().toLowerCase(); if (!q) return true; return c.name.toLowerCase().includes(q) || (c.town || "").toLowerCase().includes(q); }).sort((a, b) => a.name.localeCompare(b.name)),
    [courses, query]
  );

  if (editing) {
    return <CourseForm initial={editing} onCancel={() => setEditing(null)} onSave={async (c) => { await onSave(c); setEditing(null); }} />;
  }

  const groups = sorted.reduce<Record<string, CourseTemplate[]>>((acc, c) => { const l = (c.name[0] || "#").toUpperCase(); (acc[l] = acc[l] || []).push(c); return acc; }, {});

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search courses or towns…" className="flex-1 rounded-lg border border-line bg-panel2 px-3 py-2 text-sm text-ink" />
        <button onClick={() => setEditing(blankCourse(18))} className="rounded-lg border border-brass2 bg-brass/15 px-4 py-2 font-mono text-xs uppercase tracking-eyebrow text-brass transition hover:bg-brass/25">+ Course</button>
      </div>

      <p className="font-mono text-[11px] text-mut">{courses.length} {courses.length === 1 ? "course" : "courses"} · tap a course to start a round, or edit pars. <span className="rounded border border-brass2 px-1 text-brass">approx</span> = estimated pars.</p>

      {sorted.length === 0 ? (
        <div className="rounded-xl border border-dashed glass p-10 text-center">
          <div className="eyebrow">// no matches</div>
          <p className="mt-2 font-display text-lg font-medium text-ink">No courses match</p>
          <p className="text-sm text-mut">{courses.length === 0 ? "Add your first course to get started." : "Try a different search."}</p>
        </div>
      ) : (
        Object.keys(groups).sort().map((letter) => (
          <div key={letter}>
            <div className="eyebrow sticky top-14 z-10 bg-bg/90 py-1 text-brass backdrop-blur">{letter}</div>
            <div className="space-y-2">
              {groups[letter].map((c) => (<CourseRow key={c.id} course={c} onPlay={onPlay} onEdit={() => setEditing(c)} onDelete={() => onDelete(c.id)} />))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function CourseRow({ course, onPlay, onEdit, onDelete }: { course: CourseTemplate; onPlay: (c: CourseTemplate, t: 9 | 18, nine: "front" | "back") => void; onEdit: () => void; onDelete: () => void }) {
  const opts = courseOptions(course);
  const holesLabel = course.holeCount === 9 && course.playsTwice ? "9 ×2" : `${course.holeCount} holes`;
  const parLabel = course.holeCount === 9 && course.playsTwice ? `par ${courseNinePar(course)}/${courseDefaultPar(course)}` : `par ${courseDefaultPar(course)}`;

  return (
    <div className="rounded-xl border glass p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-display font-medium text-ink">{course.name}</span>
            {!course.parVerified && <span title="Per-hole pars are estimated to match this course's known total — open Edit to confirm." className="cursor-help rounded border border-brass2 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-eyebrow text-brass">approx</span>}
          </div>
          <div className="font-mono text-xs text-mut">{course.town ? `${course.town} · ` : ""}{holesLabel} · {parLabel}{typeof course.distanceMi === "number" ? ` · ~${course.distanceMi}mi` : ""}</div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {opts.map((t) => (<button key={t} onClick={() => onPlay(course, t, "front")} className="rounded-lg border border-brass2 bg-brass/15 px-2.5 py-1.5 font-mono text-xs uppercase tracking-eyebrow text-brass transition hover:bg-brass/25">Play {t}</button>))}
          <button onClick={onEdit} className="rounded-lg border border-line px-2.5 py-1.5 font-mono text-xs uppercase tracking-eyebrow text-mut transition hover:text-ink">Edit</button>
          <button onClick={() => { if (confirm(`Delete ${course.name}?`)) onDelete(); }} className="rounded-lg border border-down/40 px-2 py-1.5 font-mono text-xs text-down transition hover:bg-down/10" aria-label={`Delete ${course.name}`}>✕</button>
        </div>
      </div>
    </div>
  );
}

function CourseForm({ initial, onSave, onCancel }: { initial: CourseTemplate; onSave: (c: CourseTemplate) => Promise<void>; onCancel: () => void }) {
  const [draft, setDraft] = useState<CourseTemplate>({ ...initial });
  const [saving, setSaving] = useState(false);

  function setHoleCount(hc: 9 | 18) {
    setDraft((d) => { const pars = STD_PARS.slice(0, hc); const merged = pars.map((p, i) => d.pars[i] ?? p); return { ...d, holeCount: hc, pars: merged, sis: merged.map((_, i) => d.sis[i] ?? i + 1), playsTwice: hc === 9 ? d.playsTwice : false }; });
  }
  function setPar(i: number, v: string) { setDraft((d) => { const pars = [...d.pars]; pars[i] = Math.max(3, Math.min(6, parseInt(v, 10) || 4)); return { ...d, pars, parVerified: true }; }); }
  function setSi(i: number, v: string) { setDraft((d) => { const sis = [...d.sis]; sis[i] = Math.max(1, Math.min(d.holeCount, parseInt(v, 10) || 1)); return { ...d, sis }; }); }

  const total = draft.pars.reduce((a, b) => a + b, 0);
  const valid = draft.name.trim().length > 0;
  const field = "mt-1 w-full rounded-lg border border-line bg-panel2 px-3 py-2 text-ink";
  const segBtn = (on: boolean) => `px-4 py-2 font-mono text-xs uppercase tracking-eyebrow transition ${on ? "bg-brass/15 text-brass" : "text-mut hover:text-ink"}`;

  function renderParRow(start: number, count: number, label: string) {
    return (
      <div className="overflow-x-auto">
        <table className="border-collapse text-center font-mono text-sm">
          <thead>
            <tr className="text-mut">
              <th className="px-2 py-1 text-left text-[11px] uppercase tracking-eyebrow">{label}</th>
              {Array.from({ length: count }, (_, i) => (<th key={i} className="px-1 py-1 text-xs">{start + i + 1}</th>))}
              <th className="px-2 py-1 text-xs text-brass">Σ</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="px-2 py-1 text-left text-[11px] uppercase tracking-eyebrow text-mut">Par</td>
              {Array.from({ length: count }, (_, i) => (<td key={i} className="px-0.5 py-1"><input type="number" value={draft.pars[start + i]} onChange={(e) => setPar(start + i, e.target.value)} className="w-9 rounded border border-line bg-panel2 py-1 text-center text-ink" aria-label={`Par hole ${start + i + 1}`} /></td>))}
              <td className="px-2 py-1 font-medium text-ink">{draft.pars.slice(start, start + count).reduce((a, b) => a + b, 0)}</td>
            </tr>
            <tr>
              <td className="px-2 py-1 text-left text-[11px] uppercase tracking-eyebrow text-mut">SI</td>
              {Array.from({ length: count }, (_, i) => (<td key={i} className="px-0.5 py-1"><input type="number" min={1} max={draft.holeCount} value={draft.sis[start + i]} onChange={(e) => setSi(start + i, e.target.value)} className="w-9 rounded border border-line bg-panel2 py-1 text-center text-xs text-mut" aria-label={`Stroke index hole ${start + i + 1}`} /></td>))}
              <td />
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="rounded-xl border glass p-5">
      <div className="eyebrow">// {initial.name ? "edit course" : "add course"}</div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div><label className="eyebrow">Course name</label><input type="text" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Stamford Valley" className={field} /></div>
        <div><label className="eyebrow">Town / state</label><input type="text" value={draft.town || ""} onChange={(e) => setDraft({ ...draft, town: e.target.value })} placeholder="e.g. Stamford, VT" className={field} /></div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <div>
          <label className="eyebrow block">Holes</label>
          <div className="mt-1 inline-flex overflow-hidden rounded-lg border border-line">{([9, 18] as const).map((hc) => (<button key={hc} onClick={() => setHoleCount(hc)} className={segBtn(draft.holeCount === hc)}>{hc}</button>))}</div>
        </div>
        {draft.holeCount === 9 && (
          <label className="flex items-center gap-2 text-sm text-ink"><input type="checkbox" checked={!!draft.playsTwice} onChange={(e) => setDraft({ ...draft, playsTwice: e.target.checked })} className="h-4 w-4 accent-[rgb(var(--brass))]" />Often played twice (18, back = front)</label>
        )}
        <div className="ml-auto font-mono text-sm text-mut">total par <span className="font-medium text-ink">{total}</span>{draft.holeCount === 9 && draft.playsTwice ? ` (×2 = ${total * 2})` : ""}</div>
      </div>

      <div className="mt-4 space-y-2">
        <div className="eyebrow">par &amp; stroke index per hole</div>
        {renderParRow(0, Math.min(9, draft.holeCount), draft.holeCount > 9 ? "Front" : "Holes")}
        {draft.holeCount === 18 && renderParRow(9, 9, "Back")}
        <p className="font-mono text-[11px] text-mut">Stroke index ranks hole difficulty (1 = hardest); it decides which holes a player's handicap strokes fall on.</p>
      </div>

      <div className="mt-4"><label className="eyebrow">Notes</label><input type="text" value={draft.notes || ""} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Tees, quirks, anything to remember" className={field} /></div>

      <div className="mt-5 flex items-center gap-3">
        <button onClick={async () => { if (!valid) return; setSaving(true); try { await onSave(draft); } finally { setSaving(false); } }} disabled={!valid || saving} className="rounded-lg border border-brass2 bg-brass/15 px-5 py-2.5 font-mono text-sm uppercase tracking-eyebrow text-brass transition hover:bg-brass/25 disabled:opacity-50">{saving ? "Saving…" : "Save course"}</button>
        <button onClick={onCancel} className="rounded-lg border border-line px-4 py-2.5 font-mono text-xs uppercase tracking-eyebrow text-mut transition hover:text-ink">Cancel</button>
      </div>
    </div>
  );
}
