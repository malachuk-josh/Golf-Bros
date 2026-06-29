"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Minus, Plus } from "lucide-react";
import type {
  CourseTemplate,
  HoleScore,
  Player,
  PlayerId,
  Round,
} from "@/lib/types";
import { defaultHoles, formatToPar, normalizeRound, roundTotals, uid } from "@/lib/golf";
import ScrollX from "./ScrollX";

function scoreClasses(strokes: number | null | undefined, par: number): string {
  if (typeof strokes !== "number" || strokes <= 0) return "bg-panel2 text-ink border-line";
  const d = strokes - par;
  if (d <= -2) return "bg-brass/20 text-brass border-brass2";
  if (d === -1) return "bg-up/15 text-up border-up/40";
  if (d === 0) return "bg-panel2 text-ink border-line";
  if (d === 1) return "bg-down/10 text-down border-down/30";
  return "bg-down/25 text-down border-down/50";
}

interface Props {
  initialRound: Round;
  isExisting: boolean;
  players: Player[];
  courses: CourseTemplate[];
  onSave: (round: Round) => Promise<void>;
  onSaveCourse: (course: CourseTemplate) => Promise<void>;
  onNew: () => void;
  onDelete?: (id: string) => Promise<void>;
  onClose?: () => void;
}

export default function Scorecard({
  initialRound,
  isExisting,
  players,
  courses,
  onSave,
  onSaveCourse,
  onNew,
  onDelete,
  onClose,
}: Props) {
  const [draft, setDraft] = useState<Round>(() => normalizeRound(initialRound));
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [loadedCourseId, setLoadedCourseId] = useState("");
  const [courseSaved, setCourseSaved] = useState(false);
  const [view, setView] = useState<"hole" | "card">("hole");
  const [holeIdx, setHoleIdx] = useState(0);

  const totals = useMemo(() => roundTotals(draft), [draft]);
  const isNine = draft.holeCount === 9;

  const playerById = useMemo(() => {
    const m: Record<string, Player> = {};
    for (const p of players) m[p.id] = p;
    return m;
  }, [players]);
  const nameOf = (id: PlayerId) => playerById[id]?.name || "Player";
  const colorOf = (id: PlayerId) => playerById[id]?.color || "#7E8CA0";

  const participants = draft.playerIds;
  const anyHandicap = participants.some((id) => (draft.handicaps?.[id] || 0) > 0);
  const curIdx = Math.min(holeIdx, draft.holes.length - 1);
  const curHole = draft.holes[curIdx];

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
      if (d.playerIds.includes(id)) {
        if (d.playerIds.length <= 1) return;
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
      d.holes = fresh.map((h, i) => {
        const old = d.holes[i];
        return old ? { ...h, par: old.par ?? h.par, si: old.si ?? h.si, strokes: { ...h.strokes, ...old.strokes } } : h;
      });
      d.holeCount = count;
      d.nine = nine;
    });
    setHoleIdx((i) => Math.min(i, count - 1));
  }

  function setNine(nine: "front" | "back") {
    update((d) => {
      d.nine = nine;
      d.holes = defaultHoles(9, d.playerIds, nine).map((h, i) => ({ ...h, strokes: { ...h.strokes, ...d.holes[i]?.strokes } }));
    });
  }

  function setStroke(idx: number, id: PlayerId, value: string) {
    update((d) => {
      d.holes[idx].strokes[id] = value === "" ? null : Math.max(1, Math.min(20, parseInt(value, 10) || 0));
    });
  }

  function stepStroke(idx: number, id: PlayerId, delta: number) {
    update((d) => {
      const cur = d.holes[idx].strokes[id];
      const base = typeof cur === "number" && cur > 0 ? cur : d.holes[idx].par;
      d.holes[idx].strokes[id] = Math.max(1, Math.min(20, base + delta));
    });
  }

  function setPar(idx: number, value: string | number) {
    update((d) => {
      const n = typeof value === "number" ? value : parseInt(value, 10) || 4;
      d.holes[idx].par = Math.max(3, Math.min(6, n));
    });
  }

  function applyCourse(courseId: string) {
    const course = courses.find((c) => c.id === courseId);
    if (!course) return;
    setLoadedCourseId(courseId);
    setHoleIdx(0);
    update((d) => {
      d.holeCount = course.holeCount;
      d.nine = course.holeCount === 9 ? d.nine || "front" : undefined;
      d.course = course.name;
      d.holes = course.pars.map((par, i) => ({
        hole: i + 1,
        par,
        si: course.sis[i] ?? i + 1,
        strokes: Object.fromEntries(d.playerIds.map((p) => [p, d.holes[i]?.strokes?.[p] ?? null])),
      }));
    });
  }

  async function saveAsCourse() {
    const name = window.prompt("Save this layout as a course. Name:", draft.course || "");
    if (!name) return;
    await onSaveCourse({
      id: uid(),
      name: name.trim(),
      holeCount: draft.holeCount,
      pars: draft.holes.map((h) => h.par),
      sis: draft.holes.map((h) => h.si),
      parVerified: true,
      createdAt: Date.now(),
    });
    setCourseSaved(true);
    setTimeout(() => setCourseSaved(false), 2500);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const fallback = `${draft.holeCount} holes · ${new Date(draft.date + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
      const toSave = draft.course.trim() ? draft : { ...draft, course: fallback };
      if (toSave !== draft) setDraft(toSave);
      await onSave(toSave);
      setSavedAt(Date.now());
    } finally {
      setSaving(false);
    }
  }

  const minStrokes = Math.min(...participants.map((id) => totals.byPlayer[id]?.strokes || Infinity));
  const m = totals.match;
  let matchText = "";
  if (m) {
    const anyBoth = m.holesWon[m.players[0]] + m.holesWon[m.players[1]] + m.halved > 0;
    if (anyBoth) {
      if (m.leader === "tie" || m.margin === 0) matchText = "All square";
      else if (m.leader) matchText = `${nameOf(m.leader).split(" ")[0]} ${m.label}`;
    }
  }

  // segment totals for the grid
  const splitIndex = draft.holes.length > 9 ? 9 : draft.holes.length;
  const front = draft.holes.slice(0, splitIndex);
  const back = draft.holes.slice(splitIndex);
  const seg = (holes: HoleScore[], id: PlayerId) =>
    holes.reduce((a, h) => a + (typeof h.strokes[id] === "number" && (h.strokes[id] as number) > 0 ? (h.strokes[id] as number) : 0), 0);

  function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return <div className={`rounded-xl border glass ${className}`}>{children}</div>;
  }

  const ctrl = "rounded-lg border border-line bg-panel2 px-3 py-2 text-ink";
  const segBtn = (on: boolean) =>
    `px-3 py-2 font-mono text-xs font-medium uppercase tracking-eyebrow transition ${on ? "bg-brass/15 text-brass" : "text-mut hover:text-ink"}`;

  return (
    <div className="space-y-4">
      {/* heading */}
      <div className="flex items-center justify-between">
        <div className="eyebrow">// {isExisting ? "editing round" : "new round"}</div>
        {isExisting && (
          <button onClick={onNew} className="rounded-lg border border-line px-3 py-1.5 font-mono text-xs uppercase tracking-eyebrow text-mut transition hover:text-ink">+ Fresh</button>
        )}
      </div>

      {/* round meta */}
      <Card className="flex flex-wrap items-end gap-3 p-4">
        <div className="flex flex-col">
          <label className="eyebrow mb-1">Date</label>
          <input type="date" value={draft.date} onChange={(e) => update((d) => (d.date = e.target.value))} className={ctrl} />
        </div>
        <div className="flex min-w-[200px] flex-1 flex-col">
          <label className="eyebrow mb-1">Course — type or load a preset</label>
          <input
            type="text"
            value={draft.course}
            placeholder="e.g. Pebble Beach"
            onChange={(e) => update((d) => (d.course = e.target.value))}
            className={`rounded-lg border bg-panel2 px-3 py-2 text-ink ${draft.course.trim() ? "border-line" : "border-down/50"}`}
          />
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <select value={loadedCourseId} onChange={(e) => e.target.value && applyCourse(e.target.value)} className="flex-1 rounded-lg border border-line bg-panel2 px-2.5 py-1.5 text-sm text-ink">
              <option value="">{courses.length ? "Load saved course…" : "No saved courses"}</option>
              {courses.map((c) => (<option key={c.id} value={c.id}>{c.name} ({c.holeCount})</option>))}
            </select>
            <button onClick={saveAsCourse} className="rounded-lg border border-line px-2.5 py-1.5 font-mono text-xs uppercase tracking-eyebrow text-mut transition hover:text-ink">Save course</button>
            {courseSaved && <span className="font-mono text-xs text-up">✓ saved</span>}
          </div>
          {!draft.course.trim() && <span className="mt-1 text-[11px] text-down">Add a name or load a preset so this round is easy to find.</span>}
        </div>
        <div className="flex flex-col">
          <label className="eyebrow mb-1">Holes</label>
          <div className="inline-flex overflow-hidden rounded-lg border border-line">
            {([9, 18] as const).map((c) => (
              <button key={c} onClick={() => setHoleCount(c)} className={segBtn(draft.holeCount === c)}>{c}</button>
            ))}
          </div>
        </div>
        {isNine && (
          <div className="flex flex-col">
            <label className="eyebrow mb-1">Nine</label>
            <div className="inline-flex overflow-hidden rounded-lg border border-line">
              {(["front", "back"] as const).map((n) => (
                <button key={n} onClick={() => setNine(n)} className={segBtn(draft.nine === n)}>{n}</button>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* players */}
      <Card className="px-4 py-3">
        <div className="eyebrow mb-2">// players in round</div>
        <div className="flex flex-wrap gap-2">
          {players.map((p) => {
            const on = participants.includes(p.id);
            return (
              <button
                key={p.id}
                onClick={() => togglePlayer(p.id)}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-sm transition ${on ? "border-transparent text-bg" : "border-line text-mut hover:text-ink"}`}
                style={on ? { background: p.color } : undefined}
              >
                <span className="inline-block h-2 w-2 rounded-full" style={{ background: on ? "rgb(var(--bg))" : p.color }} />
                {p.name}
                {(p.handicap || 0) > 0 ? <span className="opacity-70">· {p.handicap}</span> : null}
              </button>
            );
          })}
        </div>
      </Card>

      {/* totals */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {participants.map((id) => {
          const t = totals.byPlayer[id];
          if (!t) return null;
          const leading = t.holesPlayed > 0 && t.strokes === minStrokes && participants.filter((p) => totals.byPlayer[p]?.strokes === minStrokes && (totals.byPlayer[p]?.holesPlayed || 0) > 0).length === 1;
          return (
            <div key={id} className={`rounded-xl border p-3 ${leading ? "border-brass2 bg-brass/10" : "glass"}`}>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 truncate font-mono text-sm">
                  <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colorOf(id) }} />
                  {nameOf(id)}
                </span>
                {leading && <span className="font-mono text-[10px] uppercase tracking-eyebrow text-brass">lead</span>}
              </div>
              {t.holesPlayed > 0 ? (
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-mono text-2xl font-medium">{t.strokes}</span>
                  <span className="font-mono text-xs text-mut">{formatToPar(t.toPar)} · {t.holesPlayed}/{draft.holes.length}</span>
                </div>
              ) : (
                <div className="mt-2 font-mono text-xs text-mut">Start scoring ↓</div>
              )}
              {anyHandicap && t.holesPlayed > 0 && (
                <div className="mt-0.5 font-mono text-[11px] text-mut">net <span className="text-ink">{t.net}</span>{t.strokesReceived > 0 && ` (−${t.strokesReceived})`}</div>
              )}
            </div>
          );
        })}
      </div>

      {matchText && (
        <div className="flex items-center justify-between rounded-xl border border-line bg-panel2 px-4 py-2">
          <span className="eyebrow">// match {m && `· thru ${m.holesWon[m.players[0]] + m.holesWon[m.players[1]] + m.halved}`}</span>
          <span className="font-mono text-sm text-brass">{matchText}</span>
        </div>
      )}

      {/* scoring view toggle */}
      <div className="flex items-center justify-between">
        <div className="eyebrow">// scorecard</div>
        <div className="inline-flex overflow-hidden rounded-lg border border-line">
          <button onClick={() => setView("hole")} className={segBtn(view === "hole")}>Hole</button>
          <button onClick={() => setView("card")} className={segBtn(view === "card")}>Card</button>
        </div>
      </div>

      {/* SCORING — hole view or grid */}
      {view === "hole" ? (
        <Card className="p-4">
          {/* hole nav */}
          <div className="flex items-center justify-between">
            <button onClick={() => setHoleIdx((i) => Math.max(0, i - 1))} disabled={curIdx === 0} className="flex h-10 w-10 items-center justify-center rounded-lg border border-line text-mut transition enabled:hover:text-ink disabled:opacity-30"><ChevronLeft size={20} /></button>
            <div className="text-center">
              <div className="font-display text-xl font-bold text-ink">Hole {curHole.hole}</div>
              <div className="eyebrow mt-0.5 flex items-center justify-center gap-2">
                <span>par</span>
                <span className="inline-flex overflow-hidden rounded border border-line">
                  <button onClick={() => setPar(curIdx, curHole.par - 1)} className="px-1.5 text-mut hover:text-ink">−</button>
                  <span className="px-1.5 text-ink">{curHole.par}</span>
                  <button onClick={() => setPar(curIdx, curHole.par + 1)} className="px-1.5 text-mut hover:text-ink">+</button>
                </span>
                <span>· si {curHole.si}</span>
              </div>
            </div>
            <button onClick={() => setHoleIdx((i) => Math.min(draft.holes.length - 1, i + 1))} disabled={curIdx >= draft.holes.length - 1} className="flex h-10 w-10 items-center justify-center rounded-lg border border-line text-mut transition enabled:hover:text-ink disabled:opacity-30"><ChevronRight size={20} /></button>
          </div>

          {/* per-player steppers */}
          <div className="mt-4 space-y-3">
            {participants.map((id) => {
              const v = curHole.strokes[id];
              const diff = typeof v === "number" && v > 0 ? v - curHole.par : null;
              return (
                <div key={id} className="rounded-xl border border-line bg-panel2 p-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 font-mono text-sm">
                      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: colorOf(id) }} />
                      {nameOf(id)}
                    </span>
                    {diff !== null && (
                      <span className={`font-mono text-xs ${diff < 0 ? "text-up" : diff > 0 ? "text-down" : "text-mut"}`}>{diff === 0 ? "par" : formatToPar(diff)}</span>
                    )}
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <button onClick={() => stepStroke(curIdx, id, -1)} aria-label="minus" className="flex h-11 w-11 items-center justify-center rounded-lg border border-brass2 text-brass transition hover:bg-brass/10"><Minus size={20} /></button>
                    <div className={`flex h-11 min-w-[3rem] flex-1 items-center justify-center rounded-lg border font-mono text-2xl font-medium ${scoreClasses(v, curHole.par)}`}>{typeof v === "number" ? v : "–"}</div>
                    <button onClick={() => stepStroke(curIdx, id, 1)} aria-label="plus" className="flex h-11 w-11 items-center justify-center rounded-lg border border-brass2 text-brass transition hover:bg-brass/10"><Plus size={20} /></button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* hole dots */}
          <div className="mt-4 flex flex-wrap justify-center gap-1.5">
            {draft.holes.map((h, i) => {
              const done = participants.every((p) => typeof h.strokes[p] === "number" && (h.strokes[p] as number) > 0);
              return (
                <button
                  key={h.hole}
                  onClick={() => setHoleIdx(i)}
                  aria-label={`Hole ${h.hole}`}
                  className={`h-6 w-6 rounded font-mono text-[10px] transition ${i === curIdx ? "bg-brass text-bg" : done ? "bg-up/20 text-up" : "bg-panel2 text-mut hover:text-ink"}`}
                >
                  {h.hole}
                </button>
              );
            })}
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          <GridNine holes={front} label={isNine ? "Scores" : "Front 9"} offset={0} isNine={isNine} participants={participants} nameOf={nameOf} colorOf={colorOf} seg={seg} setPar={setPar} setStroke={setStroke} />
          <GridNine holes={back} label="Back 9" offset={9} isNine={isNine} participants={participants} nameOf={nameOf} colorOf={colorOf} seg={seg} setPar={setPar} setStroke={setStroke} />
        </div>
      )}

      <p className="font-mono text-[11px] text-mut">
        {anyHandicap ? "Net uses each player's handicap, allocated by stroke index. " : "Set handicaps on player profiles for net scoring. "}
        {participants.length === 2 ? "Match play is tracked automatically." : ""}
      </p>

      {/* notes */}
      <Card className="p-4">
        <label className="eyebrow mb-1 block">Notes</label>
        <textarea value={draft.notes || ""} onChange={(e) => update((d) => (d.notes = e.target.value))} placeholder="Weather, bets, memorable shots…" rows={2} className="w-full rounded-lg border border-line bg-panel2 px-3 py-2 text-ink" />
      </Card>

      {/* actions */}
      <div className="glass-2 sticky bottom-[68px] flex flex-wrap items-center gap-3 rounded-xl p-3">
        <button onClick={handleSave} disabled={saving} className="rounded-lg border border-brass2 bg-brass/15 px-5 py-2.5 font-mono text-sm font-medium uppercase tracking-eyebrow text-brass transition hover:bg-brass/25 disabled:opacity-60">{saving ? "Saving…" : "Save round"}</button>
        {savedAt && <span className="font-mono text-xs text-up">✓ saved</span>}
        {onClose && <button onClick={onClose} className="rounded-lg border border-line px-4 py-2.5 font-mono text-xs uppercase tracking-eyebrow text-mut transition hover:text-ink">← Season</button>}
        {onDelete && (
          <button onClick={async () => { if (confirm("Delete this round permanently?")) { await onDelete(draft.id); onClose?.(); } }} className="ml-auto rounded-lg border border-down/40 px-4 py-2.5 font-mono text-xs uppercase tracking-eyebrow text-down transition hover:bg-down/10">Delete</button>
        )}
      </div>
    </div>
  );
}

function GridNine({
  holes,
  label,
  offset,
  isNine,
  participants,
  nameOf,
  colorOf,
  seg,
  setPar,
  setStroke,
}: {
  holes: HoleScore[];
  label: string;
  offset: number;
  isNine: boolean;
  participants: PlayerId[];
  nameOf: (id: PlayerId) => string;
  colorOf: (id: PlayerId) => string;
  seg: (holes: HoleScore[], id: PlayerId) => number;
  setPar: (idx: number, v: string) => void;
  setStroke: (idx: number, id: PlayerId, v: string) => void;
}) {
  if (holes.length === 0) return null;
  return (
    <ScrollX className="rounded-xl border glass">
      <table className="w-full border-collapse text-center font-mono text-sm">
        <thead>
          <tr className="bg-panel2 text-brass">
            <th className="sticky left-0 z-10 bg-panel2 px-3 py-2 text-left font-medium uppercase tracking-eyebrow">{label}</th>
            {holes.map((h) => (<th key={h.hole} className="px-1 py-2">{h.hole}</th>))}
            <th className="px-2 py-2 uppercase">{label === "Back 9" ? "IN" : isNine ? "TOT" : "OUT"}</th>
          </tr>
          <tr className="text-mut">
            <td className="sticky left-0 z-10 bg-panel px-3 py-1 text-left text-[11px] uppercase tracking-eyebrow">Par</td>
            {holes.map((h, i) => (
              <td key={h.hole} className="px-0.5 py-1">
                <input type="number" value={h.par} onChange={(e) => setPar(offset + i, e.target.value)} className="w-9 rounded border border-line bg-panel2 py-0.5 text-center text-xs text-ink" aria-label={`Par hole ${h.hole}`} />
              </td>
            ))}
            <td className="px-2 py-1 text-xs text-ink">{holes.reduce((a, h) => a + h.par, 0)}</td>
          </tr>
        </thead>
        <tbody>
          {participants.map((id) => (
            <tr key={id} className="border-t border-line">
              <td className="sticky left-0 z-10 bg-panel px-3 py-2 text-left">
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded-full" style={{ background: colorOf(id) }} />{nameOf(id)}
                </span>
              </td>
              {holes.map((h, i) => {
                const v = h.strokes[id];
                return (
                  <td key={h.hole} className="px-0.5 py-1">
                    <input type="number" inputMode="numeric" value={typeof v === "number" ? v : ""} onChange={(e) => setStroke(offset + i, id, e.target.value)} placeholder="–" className={`w-9 rounded border py-1 text-center font-medium ${scoreClasses(v, h.par)}`} aria-label={`${nameOf(id)} hole ${h.hole}`} />
                  </td>
                );
              })}
              <td className="px-2 py-1 font-medium text-ink">{seg(holes, id) || "–"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </ScrollX>
  );
}
