"use client";

import { useMemo, useState } from "react";
import type {
  CourseTemplate,
  HoleScore,
  Player,
  PlayerId,
  Round,
} from "@/lib/types";
import {
  defaultHoles,
  formatToPar,
  normalizeRound,
  roundTotals,
  uid,
} from "@/lib/golf";
import ScrollX from "./ScrollX";

function scoreColor(strokes: number | null | undefined, par: number): string {
  if (typeof strokes !== "number" || strokes <= 0) return "bg-white";
  const d = strokes - par;
  if (d <= -2) return "bg-yellow-200 text-yellow-900";
  if (d === -1) return "bg-fairway-200 text-fairway-900";
  if (d === 0) return "bg-white";
  if (d === 1) return "bg-orange-100 text-orange-900";
  return "bg-red-200 text-red-900";
}

interface Props {
  initialRound: Round;
  players: Player[];
  courses: CourseTemplate[];
  onSave: (round: Round) => Promise<void>;
  onSaveCourse: (course: CourseTemplate) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onClose?: () => void;
}

export default function Scorecard({
  initialRound,
  players,
  courses,
  onSave,
  onSaveCourse,
  onDelete,
  onClose,
}: Props) {
  const [draft, setDraft] = useState<Round>(() => normalizeRound(initialRound));
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [loadedCourseId, setLoadedCourseId] = useState("");
  const [courseSaved, setCourseSaved] = useState(false);

  const totals = useMemo(() => roundTotals(draft), [draft]);
  const isNine = draft.holeCount === 9;

  const playerById = useMemo(() => {
    const m: Record<string, Player> = {};
    for (const p of players) m[p.id] = p;
    return m;
  }, [players]);
  const nameOf = (id: PlayerId) => playerById[id]?.name || "Player";
  const colorOf = (id: PlayerId) => playerById[id]?.color || "#475569";

  const participants = draft.playerIds;
  const anyHandicap = participants.some((id) => (draft.handicaps?.[id] || 0) > 0);

  function update(mut: (d: Round) => void) {
    setDraft((prev) => {
      const next: Round = JSON.parse(JSON.stringify(prev));
      mut(next);
      return next;
    });
    setSavedAt(null);
  }

  function togglePlayer(id: PlayerId) {
    update((d) => {
      const has = d.playerIds.includes(id);
      if (has) {
        if (d.playerIds.length <= 1) return; // keep at least one
        d.playerIds = d.playerIds.filter((p) => p !== id);
        delete d.handicaps[id];
        for (const h of d.holes) delete h.strokes[id];
      } else {
        d.playerIds.push(id);
        d.handicaps[id] = playerById[id]?.handicap ?? 0;
        for (const h of d.holes) h.strokes[id] = null;
      }
    });
  }

  function setHoleCount(count: 9 | 18) {
    update((d) => {
      const nine = count === 9 ? (d.nine === "back" ? "back" : "front") : undefined;
      const fresh = defaultHoles(count, d.playerIds, nine || "front");
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
      d.holes = defaultHoles(9, d.playerIds, nine).map((h, i) => ({
        ...h,
        strokes: { ...h.strokes, ...d.holes[i]?.strokes },
      }));
    });
  }

  function setStroke(holeIdx: number, id: PlayerId, value: string) {
    update((d) => {
      const n = value === "" ? null : Math.max(1, Math.min(20, parseInt(value, 10) || 0));
      d.holes[holeIdx].strokes[id] = n;
    });
  }

  function setPar(holeIdx: number, value: string) {
    update((d) => {
      d.holes[holeIdx].par = Math.max(3, Math.min(6, parseInt(value, 10) || 4));
    });
  }

  function applyCourse(courseId: string) {
    const course = courses.find((c) => c.id === courseId);
    if (!course) return;
    setLoadedCourseId(courseId);
    update((d) => {
      d.holeCount = course.holeCount;
      d.nine = course.holeCount === 9 ? d.nine || "front" : undefined;
      d.course = course.name;
      d.holes = course.pars.map((par, i) => ({
        hole: i + 1,
        par,
        si: course.sis[i] ?? i + 1,
        strokes: Object.fromEntries(
          d.playerIds.map((p) => [p, d.holes[i]?.strokes?.[p] ?? null])
        ),
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
      parVerified: true,
      createdAt: Date.now(),
    };
    await onSaveCourse(course);
    setLoadedCourseId(course.id);
    setCourseSaved(true);
    setTimeout(() => setCourseSaved(false), 2500);
  }

  async function handleSave() {
    setSaving(true);
    try {
      // give blank-course rounds an identifiable fallback name
      const fallback = `${draft.holeCount} holes · ${new Date(draft.date + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
      const toSave = draft.course.trim() ? draft : { ...draft, course: fallback };
      if (toSave !== draft) setDraft(toSave);
      await onSave(toSave);
      setSavedAt(Date.now());
    } finally {
      setSaving(false);
    }
  }

  const splitIndex = draft.holes.length > 9 ? 9 : draft.holes.length;
  const front = draft.holes.slice(0, splitIndex);
  const back = draft.holes.slice(splitIndex);

  function segStrokes(holes: HoleScore[], id: PlayerId) {
    return holes.reduce((acc, h) => {
      const s = h.strokes[id];
      return acc + (typeof s === "number" && s > 0 ? s : 0);
    }, 0);
  }

  function renderNine(holes: HoleScore[], label: string, offset: number) {
    if (holes.length === 0) return null;
    return (
      <ScrollX className="rounded-xl border border-fairway-200 bg-white shadow-sm">
        <table className="w-full border-collapse text-center text-sm">
          <thead>
            <tr className="bg-fairway-700 text-white">
              <th className="sticky left-0 z-10 bg-fairway-700 px-3 py-2 text-left font-semibold">{label}</th>
              {holes.map((h) => (
                <th key={h.hole} className="px-1 py-2 font-semibold">{h.hole}</th>
              ))}
              <th className="px-2 py-2 font-semibold">{label === "Back 9" ? "IN" : isNine ? "TOT" : "OUT"}</th>
            </tr>
            <tr className="bg-fairway-50 text-fairway-700">
              <td className="sticky left-0 z-10 bg-fairway-50 px-3 py-1 text-left text-xs font-medium">Par</td>
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
              <td className="px-2 py-1 text-xs font-semibold">{holes.reduce((a, h) => a + h.par, 0)}</td>
            </tr>
          </thead>
          <tbody>
            {participants.map((id) => (
              <tr key={id} className="border-t border-fairway-100">
                <td className="sticky left-0 z-10 bg-white px-3 py-2 text-left font-semibold">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: colorOf(id) }} />
                    {nameOf(id)}
                  </span>
                </td>
                {holes.map((h, i) => {
                  const val = h.strokes[id];
                  return (
                    <td key={h.hole} className="px-0.5 py-1">
                      <input
                        type="number"
                        inputMode="numeric"
                        value={typeof val === "number" ? val : ""}
                        onChange={(e) => setStroke(offset + i, id, e.target.value)}
                        placeholder="–"
                        className={`w-9 rounded border border-fairway-200 py-1 text-center font-semibold ${scoreColor(val, h.par)}`}
                        aria-label={`${nameOf(id)} strokes on hole ${h.hole}`}
                      />
                    </td>
                  );
                })}
                <td className="px-2 py-1 font-bold">{segStrokes(holes, id) || "–"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollX>
    );
  }

  const m = totals.match;
  let matchText = "";
  if (m) {
    const anyBoth = m.holesWon[m.players[0]] + m.holesWon[m.players[1]] + m.halved > 0;
    if (anyBoth) {
      if (m.leader === "tie" || m.margin === 0) matchText = "All square";
      else if (m.leader) matchText = `${nameOf(m.leader).split(" ")[0]} ${m.label}`;
    }
  }

  const minStrokes = Math.min(
    ...participants.map((id) => totals.byPlayer[id]?.strokes || Infinity)
  );

  return (
    <div className="space-y-4">
      {/* Header controls */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-fairway-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col">
          <label className="text-xs font-medium text-fairway-600">Date</label>
          <input type="date" value={draft.date} onChange={(e) => update((d) => (d.date = e.target.value))} className="rounded-lg border border-fairway-200 px-3 py-2" />
        </div>
        <div className="flex flex-1 flex-col">
          <label className="text-xs font-medium text-fairway-600">Course</label>
          <input type="text" value={draft.course} placeholder="e.g. Pebble Beach" onChange={(e) => update((d) => (d.course = e.target.value))} className={`min-w-[140px] rounded-lg border px-3 py-2 ${draft.course.trim() ? "border-fairway-200" : "border-amber-300"}`} />
          {!draft.course.trim() && (
            <span className="mt-1 text-[11px] text-amber-600">Add a name so this round is easy to find later.</span>
          )}
        </div>
        <div className="flex flex-col">
          <label className="text-xs font-medium text-fairway-600">Holes</label>
          <div className="inline-flex overflow-hidden rounded-lg border border-fairway-300">
            {([9, 18] as const).map((c) => (
              <button key={c} onClick={() => setHoleCount(c)} className={`px-4 py-2 text-sm font-semibold transition ${draft.holeCount === c ? "bg-fairway-600 text-white" : "bg-white text-fairway-700 hover:bg-fairway-50"}`}>{c}</button>
            ))}
          </div>
        </div>
        {isNine && (
          <div className="flex flex-col">
            <label className="text-xs font-medium text-fairway-600">Which nine</label>
            <div className="inline-flex overflow-hidden rounded-lg border border-fairway-300">
              {(["front", "back"] as const).map((n) => (
                <button key={n} onClick={() => setNine(n)} className={`px-3 py-2 text-sm font-semibold capitalize transition ${draft.nine === n ? "bg-fairway-600 text-white" : "bg-white text-fairway-700 hover:bg-fairway-50"}`}>{n}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Players in this round */}
      <div className="rounded-xl border border-fairway-200 bg-white px-4 py-3 shadow-sm">
        <div className="mb-2 text-xs font-medium text-fairway-600">Players in this round</div>
        {players.length === 0 ? (
          <p className="text-sm text-fairway-500">Add players in the <strong>Players</strong> tab first.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {players.map((p) => {
              const on = participants.includes(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => togglePlayer(p.id)}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition ${on ? "border-transparent text-white" : "border-fairway-300 bg-white text-fairway-600 hover:bg-fairway-50"}`}
                  style={on ? { background: p.color } : undefined}
                >
                  <span className="inline-block h-2 w-2 rounded-full" style={{ background: on ? "#fff" : p.color }} />
                  {p.name}
                  {(p.handicap || 0) > 0 ? <span className="opacity-70">· {p.handicap}</span> : null}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Course templates */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-fairway-200 bg-white px-4 py-3 shadow-sm">
        <span className="text-xs font-medium text-fairway-600">Course preset:</span>
        <select value={loadedCourseId} onChange={(e) => e.target.value && applyCourse(e.target.value)} className="rounded-lg border border-fairway-200 px-3 py-1.5 text-sm">
          <option value="">{courses.length ? "Load a saved course…" : "No saved courses yet"}</option>
          {courses.map((c) => (<option key={c.id} value={c.id}>{c.name} ({c.holeCount})</option>))}
        </select>
        <button onClick={saveAsCourse} className="rounded-lg border border-fairway-300 px-3 py-1.5 text-sm font-semibold text-fairway-700 transition hover:bg-fairway-50">Save current as course</button>
        {courseSaved && <span className="text-sm font-medium text-fairway-600">✓ Course saved</span>}
      </div>

      {/* Live totals */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {participants.map((id) => {
          const t = totals.byPlayer[id];
          if (!t) return null;
          const leading =
            t.holesPlayed > 0 &&
            t.strokes === minStrokes &&
            participants.filter((p) => totals.byPlayer[p]?.strokes === minStrokes && (totals.byPlayer[p]?.holesPlayed || 0) > 0).length === 1;
          return (
            <div key={id} className={`rounded-xl border p-4 shadow-sm ${leading ? "border-fairway-400 bg-fairway-50" : "border-fairway-200 bg-white"}`}>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 font-semibold">
                  <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: colorOf(id) }} />
                  {nameOf(id)}
                </span>
                {leading && <span className="rounded-full bg-fairway-600 px-2 py-0.5 text-xs font-semibold text-white">Lead</span>}
              </div>
              {t.holesPlayed > 0 ? (
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-3xl font-bold">{t.strokes}</span>
                  <span className="text-sm text-fairway-600">{formatToPar(t.toPar)} · {t.holesPlayed}/{draft.holes.length}</span>
                </div>
              ) : (
                <div className="mt-2 text-sm font-medium text-fairway-400">Start scoring ↓</div>
              )}
              {anyHandicap && t.holesPlayed > 0 && (
                <div className="mt-1 text-xs text-fairway-500">Net <span className="font-semibold text-fairway-800">{t.net}</span>{t.strokesReceived > 0 && ` (−${t.strokesReceived})`}</div>
              )}
            </div>
          );
        })}
      </div>

      {matchText && (
        <div className="rounded-xl border border-fairway-200 bg-fairway-50 px-4 py-2 text-center text-sm font-semibold text-fairway-700">
          Match play: {matchText}
          {m && <span className="ml-2 font-normal text-fairway-500">({m.holesWon[m.players[0]]}–{m.holesWon[m.players[1]]}, {m.halved} halved)</span>}
        </div>
      )}

      {renderNine(front, isNine ? "Scores" : "Front 9", 0)}
      {renderNine(back, "Back 9", 9)}

      <p className="text-xs text-fairway-500">
        Tip: type strokes directly, or tap a cell and use arrow keys. Par is editable per hole.
        {anyHandicap ? " Net uses each player's handicap, allocated by stroke index." : " Set handicaps on player profiles for net scoring."}
        {participants.length === 2 ? " Match play is tracked automatically." : ""}
      </p>

      <div className="rounded-xl border border-fairway-200 bg-white p-4 shadow-sm">
        <label className="text-xs font-medium text-fairway-600">Notes</label>
        <textarea value={draft.notes || ""} onChange={(e) => update((d) => (d.notes = e.target.value))} placeholder="Weather, bets, memorable shots…" rows={2} className="mt-1 w-full rounded-lg border border-fairway-200 px-3 py-2" />
      </div>

      <div className="sticky bottom-0 flex flex-wrap items-center gap-3 rounded-xl border border-fairway-200 bg-white/95 p-3 shadow-lg backdrop-blur">
        <button onClick={handleSave} disabled={saving} className="rounded-lg bg-fairway-600 px-5 py-2.5 font-semibold text-white shadow-sm transition hover:bg-fairway-700 disabled:opacity-60">{saving ? "Saving…" : "Save round"}</button>
        {savedAt && <span className="text-sm font-medium text-fairway-600">✓ Saved to history</span>}
        {onClose && <button onClick={onClose} className="rounded-lg border border-fairway-300 px-4 py-2.5 font-semibold text-fairway-700 transition hover:bg-fairway-50">← Back to Season</button>}
        {onDelete && (
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
