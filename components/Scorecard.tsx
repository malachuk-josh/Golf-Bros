"use client";

import { useMemo, useState } from "react";
import type {
  CourseTemplate,
  HoleScore,
  PlayerId,
  Round,
  Settings,
} from "@/lib/types";
import {
  PLAYER_IDS,
  defaultHoles,
  formatToPar,
  newRound,
  roundTotals,
} from "@/lib/golf";

function scoreColor(strokes: number | null | undefined, par: number): string {
  if (typeof strokes !== "number" || strokes <= 0) return "bg-white";
  const d = strokes - par;
  if (d <= -2) return "bg-yellow-200 text-yellow-900"; // eagle+
  if (d === -1) return "bg-fairway-200 text-fairway-900"; // birdie
  if (d === 0) return "bg-white"; // par
  if (d === 1) return "bg-orange-100 text-orange-900"; // bogey
  return "bg-red-200 text-red-900"; // double+
}

function uid(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

interface Props {
  initialRound?: Round | null;
  settings: Settings;
  courses: CourseTemplate[];
  onSave: (round: Round) => Promise<void>;
  onSaveCourse: (course: CourseTemplate) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onClose?: () => void;
}

export default function Scorecard({
  initialRound,
  settings,
  courses,
  onSave,
  onSaveCourse,
  onDelete,
  onClose,
}: Props) {
  const [draft, setDraft] = useState<Round>(() => {
    const base = initialRound || newRound(18, settings.handicaps);
    if (!base.handicaps) base.handicaps = { ...settings.handicaps };
    return base;
  });
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const totals = useMemo(() => roundTotals(draft), [draft]);
  const isNine = draft.holeCount === 9;
  const anyHandicap =
    (draft.handicaps?.p1 || 0) > 0 || (draft.handicaps?.p2 || 0) > 0;

  function update(mut: (d: Round) => void) {
    setDraft((prev) => {
      const next: Round = JSON.parse(JSON.stringify(prev));
      mut(next);
      return next;
    });
    setSavedAt(null);
  }

  function setHoleCount(count: 9 | 18) {
    update((d) => {
      const nine = count === 9 ? (d.nine === "back" ? "back" : "front") : undefined;
      const fresh = defaultHoles(count, nine || "front");
      const merged = fresh.map((h, i) => {
        const old = d.holes[i];
        return old
          ? { ...h, par: old.par ?? h.par, si: old.si ?? h.si, strokes: { ...h.strokes, ...old.strokes } }
          : h;
      });
      d.holeCount = count;
      d.nine = nine;
      d.holes = merged;
    });
  }

  function setNine(nine: "front" | "back") {
    update((d) => {
      d.nine = nine;
      d.holes = defaultHoles(9, nine).map((h, i) => ({
        ...h,
        strokes: { ...h.strokes, ...d.holes[i]?.strokes },
      }));
    });
  }

  function setStroke(holeIdx: number, pid: PlayerId, value: string) {
    update((d) => {
      const n = value === "" ? null : Math.max(1, Math.min(20, parseInt(value, 10) || 0));
      d.holes[holeIdx].strokes[pid] = n;
    });
  }

  function setPar(holeIdx: number, value: string) {
    update((d) => {
      const n = Math.max(3, Math.min(6, parseInt(value, 10) || 4));
      d.holes[holeIdx].par = n;
    });
  }

  function applyCourse(courseId: string) {
    const course = courses.find((c) => c.id === courseId);
    if (!course) return;
    update((d) => {
      d.holeCount = course.holeCount;
      d.nine = course.holeCount === 9 ? d.nine || "front" : undefined;
      d.course = course.name;
      d.holes = course.pars.map((par, i) => ({
        hole: i + 1,
        par,
        si: course.sis[i] ?? i + 1,
        strokes: { ...(d.holes[i]?.strokes || { p1: null, p2: null }) },
      }));
    });
  }

  async function saveAsCourse() {
    const name = window.prompt("Save this layout as a course. Name:", draft.course || "");
    if (!name) return;
    const course: CourseTemplate = {
      id: uid(),
      name: name.trim(),
      holeCount: draft.holeCount,
      pars: draft.holes.map((h) => h.par),
      sis: draft.holes.map((h) => h.si),
      createdAt: Date.now(),
    };
    await onSaveCourse(course);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(draft);
      setSavedAt(Date.now());
    } finally {
      setSaving(false);
    }
  }

  const splitIndex = draft.holes.length > 9 ? 9 : draft.holes.length;
  const front = draft.holes.slice(0, splitIndex);
  const back = draft.holes.slice(splitIndex);

  function segTotals(holes: HoleScore[], pid: PlayerId) {
    return holes.reduce(
      (acc, h) => {
        const s = h.strokes[pid];
        return {
          par: acc.par + h.par,
          strokes: acc.strokes + (typeof s === "number" && s > 0 ? s : 0),
        };
      },
      { par: 0, strokes: 0 }
    );
  }

  function renderNine(holes: HoleScore[], label: string, offset: number) {
    if (holes.length === 0) return null;
    return (
      <div className="overflow-x-auto rounded-xl border border-fairway-200 bg-white shadow-sm">
        <table className="w-full border-collapse text-center text-sm">
          <thead>
            <tr className="bg-fairway-700 text-white">
              <th className="sticky left-0 z-10 bg-fairway-700 px-3 py-2 text-left font-semibold">
                {label}
              </th>
              {holes.map((h) => (
                <th key={h.hole} className="px-1 py-2 font-semibold">
                  {h.hole}
                </th>
              ))}
              <th className="px-2 py-2 font-semibold">{label === "Back 9" ? "IN" : isNine ? "TOT" : "OUT"}</th>
            </tr>
            <tr className="bg-fairway-50 text-fairway-700">
              <td className="sticky left-0 z-10 bg-fairway-50 px-3 py-1 text-left text-xs font-medium">
                Par
              </td>
              {holes.map((h, i) => (
                <td key={h.hole} className="px-0.5 py-1">
                  <input
                    type="number"
                    value={h.par}
                    onChange={(e) => setPar(offset + i, e.target.value)}
                    className="w-9 rounded border border-fairway-200 bg-white py-0.5 text-center text-xs"
                    aria-label={`Par for hole ${h.hole}`}
                  />
                </td>
              ))}
              <td className="px-2 py-1 text-xs font-semibold">
                {holes.reduce((a, h) => a + h.par, 0)}
              </td>
            </tr>
          </thead>
          <tbody>
            {PLAYER_IDS.map((pid) => {
              const seg = segTotals(holes, pid);
              return (
                <tr key={pid} className="border-t border-fairway-100">
                  <td className="sticky left-0 z-10 bg-white px-3 py-2 text-left font-semibold">
                    {settings.players[pid]}
                  </td>
                  {holes.map((h, i) => {
                    const val = h.strokes[pid];
                    return (
                      <td key={h.hole} className="px-0.5 py-1">
                        <input
                          type="number"
                          inputMode="numeric"
                          value={typeof val === "number" ? val : ""}
                          onChange={(e) =>
                            setStroke(offset + i, pid, e.target.value)
                          }
                          placeholder="–"
                          className={`w-9 rounded border border-fairway-200 py-1 text-center font-semibold ${scoreColor(
                            val,
                            h.par
                          )}`}
                          aria-label={`${settings.players[pid]} strokes on hole ${h.hole}`}
                        />
                      </td>
                    );
                  })}
                  <td className="px-2 py-1 font-bold">{seg.strokes || "–"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  // live match status text
  const m = totals.match;
  const anyBoth = m.holesWon.p1 + m.holesWon.p2 + m.halved > 0;
  let matchText = "";
  if (anyBoth) {
    if (m.leader === "tie" || m.margin === 0) matchText = "All square";
    else if (m.leader) matchText = `${settings.players[m.leader].split(" ")[0]} ${m.label}`;
  }

  return (
    <div className="space-y-4">
      {/* Header controls */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-fairway-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col">
          <label className="text-xs font-medium text-fairway-600">Date</label>
          <input
            type="date"
            value={draft.date}
            onChange={(e) => update((d) => (d.date = e.target.value))}
            className="rounded-lg border border-fairway-200 px-3 py-2"
          />
        </div>
        <div className="flex flex-1 flex-col">
          <label className="text-xs font-medium text-fairway-600">Course</label>
          <input
            type="text"
            value={draft.course}
            placeholder="e.g. Pebble Beach"
            onChange={(e) => update((d) => (d.course = e.target.value))}
            className="min-w-[140px] rounded-lg border border-fairway-200 px-3 py-2"
          />
        </div>

        {/* 9 / 18 toggle */}
        <div className="flex flex-col">
          <label className="text-xs font-medium text-fairway-600">Holes</label>
          <div className="inline-flex overflow-hidden rounded-lg border border-fairway-300">
            {([9, 18] as const).map((c) => (
              <button
                key={c}
                onClick={() => setHoleCount(c)}
                className={`px-4 py-2 text-sm font-semibold transition ${
                  draft.holeCount === c
                    ? "bg-fairway-600 text-white"
                    : "bg-white text-fairway-700 hover:bg-fairway-50"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* front / back when 9 */}
        {isNine && (
          <div className="flex flex-col">
            <label className="text-xs font-medium text-fairway-600">Which nine</label>
            <div className="inline-flex overflow-hidden rounded-lg border border-fairway-300">
              {(["front", "back"] as const).map((n) => (
                <button
                  key={n}
                  onClick={() => setNine(n)}
                  className={`px-3 py-2 text-sm font-semibold capitalize transition ${
                    draft.nine === n
                      ? "bg-fairway-600 text-white"
                      : "bg-white text-fairway-700 hover:bg-fairway-50"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Course templates */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-fairway-200 bg-white px-4 py-3 shadow-sm">
        <span className="text-xs font-medium text-fairway-600">Course preset:</span>
        <select
          value=""
          onChange={(e) => e.target.value && applyCourse(e.target.value)}
          className="rounded-lg border border-fairway-200 px-3 py-1.5 text-sm"
        >
          <option value="">{courses.length ? "Load a saved course…" : "No saved courses yet"}</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.holeCount})
            </option>
          ))}
        </select>
        <button
          onClick={saveAsCourse}
          className="rounded-lg border border-fairway-300 px-3 py-1.5 text-sm font-semibold text-fairway-700 transition hover:bg-fairway-50"
        >
          Save current as course
        </button>
      </div>

      {/* Live totals */}
      <div className="grid grid-cols-2 gap-3">
        {PLAYER_IDS.map((pid) => {
          const t = totals.byPlayer[pid];
          const leadingGross =
            totals.byPlayer.p1.holesPlayed > 0 &&
            totals.byPlayer.p2.holesPlayed > 0 &&
            t.strokes > 0 &&
            t.strokes === Math.min(totals.byPlayer.p1.strokes, totals.byPlayer.p2.strokes) &&
            totals.byPlayer.p1.strokes !== totals.byPlayer.p2.strokes;
          return (
            <div
              key={pid}
              className={`rounded-xl border p-4 shadow-sm ${
                leadingGross
                  ? "border-fairway-400 bg-fairway-50"
                  : "border-fairway-200 bg-white"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold">{settings.players[pid]}</span>
                {leadingGross && (
                  <span className="rounded-full bg-fairway-600 px-2 py-0.5 text-xs font-semibold text-white">
                    Leading
                  </span>
                )}
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-3xl font-bold">{t.strokes || "–"}</span>
                <span className="text-sm text-fairway-600">
                  {t.holesPlayed > 0 ? formatToPar(t.toPar) : ""} · {t.holesPlayed}/
                  {draft.holes.length}
                </span>
              </div>
              {anyHandicap && t.holesPlayed > 0 && (
                <div className="mt-1 text-xs text-fairway-500">
                  Net <span className="font-semibold text-fairway-800">{t.net}</span>
                  {t.strokesReceived > 0 && ` (−${t.strokesReceived} hcp)`}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Match status */}
      {matchText && (
        <div className="rounded-xl border border-fairway-200 bg-fairway-50 px-4 py-2 text-center text-sm font-semibold text-fairway-700">
          Match play: {matchText}
          <span className="ml-2 font-normal text-fairway-500">
            ({m.holesWon.p1}–{m.holesWon.p2}, {m.halved} halved)
          </span>
        </div>
      )}

      {/* Scorecards */}
      {renderNine(front, isNine ? "Scores" : "Front 9", 0)}
      {renderNine(back, "Back 9", 9)}

      <p className="text-xs text-fairway-500">
        Tip: type strokes directly, or tap a cell and use arrow keys. Par is
        editable per hole. {anyHandicap ? "Net scores use each player's handicap from Settings, allocated by stroke index." : "Set handicaps in Settings to enable net scoring."}
      </p>

      {/* Notes */}
      <div className="rounded-xl border border-fairway-200 bg-white p-4 shadow-sm">
        <label className="text-xs font-medium text-fairway-600">Notes</label>
        <textarea
          value={draft.notes || ""}
          onChange={(e) => update((d) => (d.notes = e.target.value))}
          placeholder="Weather, bets, memorable shots…"
          rows={2}
          className="mt-1 w-full rounded-lg border border-fairway-200 px-3 py-2"
        />
      </div>

      {/* Actions */}
      <div className="sticky bottom-0 flex flex-wrap items-center gap-3 rounded-xl border border-fairway-200 bg-white/95 p-3 shadow-lg backdrop-blur">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-fairway-600 px-5 py-2.5 font-semibold text-white shadow-sm transition hover:bg-fairway-700 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save round"}
        </button>
        {savedAt && (
          <span className="text-sm font-medium text-fairway-600">
            ✓ Saved to history
          </span>
        )}
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-lg border border-fairway-300 px-4 py-2.5 font-semibold text-fairway-700 transition hover:bg-fairway-50"
          >
            Done
          </button>
        )}
        {onDelete && initialRound && (
          <button
            onClick={async () => {
              if (confirm("Delete this round permanently?")) {
                await onDelete(draft.id);
                onClose?.();
              }
            }}
            className="ml-auto rounded-lg border border-red-200 px-4 py-2.5 font-semibold text-red-600 transition hover:bg-red-50"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
