"use client";

import { useMemo, useState } from "react";
import type { CourseTemplate } from "@/lib/types";
import { courseDefaultPar, courseNinePar, courseOptions } from "@/lib/golf";

function uid(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

const STD_PARS = [4, 4, 5, 3, 4, 4, 3, 5, 4, 4, 4, 3, 5, 4, 4, 3, 5, 4];

function blankCourse(holeCount: 9 | 18): CourseTemplate {
  const pars = STD_PARS.slice(0, holeCount);
  return {
    id: uid(),
    name: "",
    town: "",
    holeCount,
    pars,
    sis: pars.map((_, i) => i + 1),
    playsTwice: false,
    parVerified: true,
    notes: "",
    createdAt: Date.now(),
  };
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
    () =>
      [...courses]
        .filter((c) => {
          const q = query.trim().toLowerCase();
          if (!q) return true;
          return (
            c.name.toLowerCase().includes(q) ||
            (c.town || "").toLowerCase().includes(q)
          );
        })
        .sort((a, b) => a.name.localeCompare(b.name)),
    [courses, query]
  );

  if (editing) {
    return (
      <CourseForm
        initial={editing}
        onCancel={() => setEditing(null)}
        onSave={async (c) => {
          await onSave(c);
          setEditing(null);
        }}
      />
    );
  }

  // group alphabetically by first letter
  const groups = sorted.reduce<Record<string, CourseTemplate[]>>((acc, c) => {
    const letter = (c.name[0] || "#").toUpperCase();
    (acc[letter] = acc[letter] || []).push(c);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search courses or towns…"
          className="flex-1 rounded-lg border border-fairway-200 px-3 py-2 text-sm"
        />
        <button
          onClick={() => setEditing(blankCourse(18))}
          className="rounded-lg bg-fairway-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-fairway-700"
        >
          + Add course
        </button>
      </div>

      <p className="text-xs text-fairway-500">
        {courses.length} {courses.length === 1 ? "course" : "courses"} saved.
        Tap a course to start a round, or edit its pars. Courses marked
        <span className="mx-1 rounded bg-amber-100 px-1 py-0.5 text-[10px] font-semibold text-amber-700">approx</span>
        have estimated per-hole pars worth confirming.
      </p>

      {sorted.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-fairway-300 bg-white/60 p-10 text-center">
          <div className="text-4xl">🏌️</div>
          <p className="mt-2 font-semibold text-fairway-700">No courses match</p>
          <p className="text-sm text-fairway-500">
            {courses.length === 0 ? "Add your first course to get started." : "Try a different search."}
          </p>
        </div>
      ) : (
        Object.keys(groups)
          .sort()
          .map((letter) => (
            <div key={letter}>
              <div className="sticky top-0 z-10 bg-gradient-to-b from-white to-transparent py-1 text-xs font-bold uppercase tracking-wide text-fairway-400">
                {letter}
              </div>
              <div className="space-y-2">
                {groups[letter].map((c) => (
                  <CourseRow
                    key={c.id}
                    course={c}
                    onPlay={onPlay}
                    onEdit={() => setEditing(c)}
                    onDelete={() => onDelete(c.id)}
                  />
                ))}
              </div>
            </div>
          ))
      )}
    </div>
  );
}

function CourseRow({
  course,
  onPlay,
  onEdit,
  onDelete,
}: {
  course: CourseTemplate;
  onPlay: (c: CourseTemplate, t: 9 | 18, nine: "front" | "back") => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const opts = courseOptions(course);
  const holesLabel =
    course.holeCount === 9 && course.playsTwice
      ? "9 (plays ×2)"
      : `${course.holeCount} holes`;
  const parLabel =
    course.holeCount === 9 && course.playsTwice
      ? `Par ${courseNinePar(course)} / ${courseDefaultPar(course)}`
      : `Par ${courseDefaultPar(course)}`;

  return (
    <div className="rounded-xl border border-fairway-200 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-fairway-900">{course.name}</span>
            {!course.parVerified && (
              <span
                title="Per-hole pars are estimated to match this course's known total — open Edit to confirm or correct them."
                className="cursor-help rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700"
              >
                approx
              </span>
            )}
          </div>
          <div className="text-xs text-fairway-500">
            {course.town ? `${course.town} · ` : ""}
            {holesLabel} · {parLabel}
            {typeof course.distanceMi === "number" ? ` · ~${course.distanceMi} mi` : ""}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {opts.map((t) => (
            <button
              key={t}
              onClick={() => onPlay(course, t, "front")}
              className="rounded-lg bg-fairway-600 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-fairway-700"
            >
              Play {t}
            </button>
          ))}
          <button
            onClick={onEdit}
            className="rounded-lg border border-fairway-300 px-2.5 py-1.5 text-xs font-semibold text-fairway-700 transition hover:bg-fairway-50"
          >
            Edit
          </button>
          <button
            onClick={() => {
              if (confirm(`Delete ${course.name}?`)) onDelete();
            }}
            className="rounded-lg border border-red-200 px-2 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50"
            aria-label={`Delete ${course.name}`}
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

function CourseForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: CourseTemplate;
  onSave: (c: CourseTemplate) => Promise<void>;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<CourseTemplate>({ ...initial });
  const [saving, setSaving] = useState(false);

  function setHoleCount(hc: 9 | 18) {
    setDraft((d) => {
      const pars = STD_PARS.slice(0, hc);
      // preserve existing pars where possible
      const merged = pars.map((p, i) => d.pars[i] ?? p);
      return {
        ...d,
        holeCount: hc,
        pars: merged,
        sis: merged.map((_, i) => d.sis[i] ?? i + 1),
        playsTwice: hc === 9 ? d.playsTwice : false,
      };
    });
  }

  function setPar(i: number, v: string) {
    setDraft((d) => {
      const pars = [...d.pars];
      pars[i] = Math.max(3, Math.min(6, parseInt(v, 10) || 4));
      return { ...d, pars, parVerified: true };
    });
  }

  function setSi(i: number, v: string) {
    setDraft((d) => {
      const sis = [...d.sis];
      sis[i] = Math.max(1, Math.min(d.holeCount, parseInt(v, 10) || 1));
      return { ...d, sis };
    });
  }

  const total = draft.pars.reduce((a, b) => a + b, 0);
  const valid = draft.name.trim().length > 0;

  function renderParRow(start: number, count: number, label: string) {
    return (
      <div className="overflow-x-auto">
        <table className="border-collapse text-center text-sm">
          <thead>
            <tr className="text-fairway-500">
              <th className="px-2 py-1 text-left text-xs">{label}</th>
              {Array.from({ length: count }, (_, i) => (
                <th key={i} className="px-1 py-1 text-xs">{start + i + 1}</th>
              ))}
              <th className="px-2 py-1 text-xs">Σ</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="px-2 py-1 text-left text-xs font-medium text-fairway-600">Par</td>
              {Array.from({ length: count }, (_, i) => (
                <td key={i} className="px-0.5 py-1">
                  <input
                    type="number"
                    value={draft.pars[start + i]}
                    onChange={(e) => setPar(start + i, e.target.value)}
                    className="w-9 rounded border border-fairway-200 py-1 text-center"
                    aria-label={`Par for hole ${start + i + 1}`}
                  />
                </td>
              ))}
              <td className="px-2 py-1 font-semibold">
                {draft.pars.slice(start, start + count).reduce((a, b) => a + b, 0)}
              </td>
            </tr>
            <tr>
              <td className="px-2 py-1 text-left text-xs font-semibold text-fairway-600">Stroke idx</td>
              {Array.from({ length: count }, (_, i) => (
                <td key={i} className="px-0.5 py-1">
                  <input
                    type="number"
                    min={1}
                    max={draft.holeCount}
                    value={draft.sis[start + i]}
                    onChange={(e) => setSi(start + i, e.target.value)}
                    className="w-9 rounded border border-fairway-200 py-1 text-center text-xs text-fairway-700"
                    aria-label={`Stroke index for hole ${start + i + 1}`}
                  />
                </td>
              ))}
              <td />
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-fairway-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-fairway-500">
          {initial.name ? "Edit course" : "Add course"}
        </h2>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-fairway-600">Course name</label>
            <input
              type="text"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="e.g. Stamford Valley Golf Course"
              className="mt-1 w-full rounded-lg border border-fairway-200 px-3 py-2"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-fairway-600">Town / state</label>
            <input
              type="text"
              value={draft.town || ""}
              onChange={(e) => setDraft({ ...draft, town: e.target.value })}
              placeholder="e.g. Stamford, VT"
              className="mt-1 w-full rounded-lg border border-fairway-200 px-3 py-2"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-xs font-medium text-fairway-600">Holes</label>
            <div className="mt-1 inline-flex overflow-hidden rounded-lg border border-fairway-300">
              {([9, 18] as const).map((hc) => (
                <button
                  key={hc}
                  onClick={() => setHoleCount(hc)}
                  className={`px-4 py-2 text-sm font-semibold transition ${
                    draft.holeCount === hc
                      ? "bg-fairway-600 text-white"
                      : "bg-white text-fairway-700 hover:bg-fairway-50"
                  }`}
                >
                  {hc}
                </button>
              ))}
            </div>
          </div>
          {draft.holeCount === 9 && (
            <label className="flex items-center gap-2 text-sm text-fairway-700">
              <input
                type="checkbox"
                checked={!!draft.playsTwice}
                onChange={(e) => setDraft({ ...draft, playsTwice: e.target.checked })}
                className="h-4 w-4"
              />
              We often play this twice (18 holes, back nine = front nine)
            </label>
          )}
          <div className="ml-auto text-sm text-fairway-600">
            Total par <span className="font-bold text-fairway-800">{total}</span>
            {draft.holeCount === 9 && draft.playsTwice ? ` (×2 = ${total * 2})` : ""}
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wide text-fairway-500">Par &amp; stroke index per hole</div>
          {renderParRow(0, Math.min(9, draft.holeCount), draft.holeCount > 9 ? "Front" : "Holes")}
          {draft.holeCount === 18 && renderParRow(9, 9, "Back")}
          <p className="text-[11px] text-fairway-500">
            Stroke index ranks hole difficulty (1 = hardest) and decides which holes
            a player&apos;s handicap strokes fall on for net scoring.
          </p>
        </div>

        <div className="mt-4">
          <label className="text-xs font-medium text-fairway-600">Notes</label>
          <input
            type="text"
            value={draft.notes || ""}
            onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
            placeholder="Tees, quirks, anything to remember"
            className="mt-1 w-full rounded-lg border border-fairway-200 px-3 py-2"
          />
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button
            onClick={async () => {
              if (!valid) return;
              setSaving(true);
              try {
                await onSave(draft);
              } finally {
                setSaving(false);
              }
            }}
            disabled={!valid || saving}
            className="rounded-lg bg-fairway-600 px-5 py-2.5 font-semibold text-white transition hover:bg-fairway-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save course"}
          </button>
          <button
            onClick={onCancel}
            className="rounded-lg border border-fairway-300 px-4 py-2.5 font-semibold text-fairway-700 transition hover:bg-fairway-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
