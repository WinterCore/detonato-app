import { bestStreak, focusBetween, perfectDays, taskRates, yearFrom } from '@/core/history'
import { dayProgress, doneOn, firstDay, levelOf, streak } from '@/core/progress'
import { addDays, longDate, monthName, weekday, weekdayName, weekdayShort, weekOrder, type DayKey } from '@/core/time/calendar'
import type { Glyph, Snapshot, TaskId } from '@/core/types'
import type { CellLevel } from '@/ui'

/** One day on the map. */
export interface HeatCell {
  day: DayKey
  level: CellLevel
  today: boolean
  /** In the record, so tapping it opens the day: on or after the first task, in the 12 months, not after today. */
  open: boolean
  /** What a screen reader says: «Thursday 5 November: 3 of 8 sessions». */
  label: string
}

/** The map's weeks: a year and the week it began in. */
export const MAP_WEEKS = 53

/** The days «Last 30 days by task» covers. */
export const RATE_DAYS = 30

/** The record meter's segments. */
export const METER_SEGMENTS = 20

/** A rate bar's segments: one per 5%. */
export const RATE_SEGMENTS = 20

const pad2 = (n: number) => String(n).padStart(2, '0')

/** «Thursday 5 November». */
const dayName = (day: DayKey) => `${weekdayName(day)} ${longDate(day)}`

/** «day», «days». */
function plural(n: number, word: string): string {
  if (n === 1) {
    return word
  }
  return `${word}s`
}

/** A map cell for `day`: shaded inside the 12 months up to today, from the first task on; blank elsewhere. */
function cellMaker(snap: Snapshot, today: DayKey): (day: DayKey) => HeatCell {
  const from = yearFrom(today)
  const first = firstDay(snap)
  return (day) => {
    const blank: HeatCell = { day, level: 'none', today: day === today, open: false, label: '' }
    if (first === null || day < first || day < from || day > today) {
      return blank
    }
    const p = dayProgress(snap, day)
    if (p.fraction === null) {
      return { ...blank, level: 'rest', open: true, label: `${dayName(day)}: nothing scheduled` }
    }
    return { ...blank, level: levelOf(p.fraction), open: true, label: `${dayName(day)}: ${p.done} of ${p.total} sessions` }
  }
}

/** The map: `weeks` columns of 7 days, ending with this week, each running from Settings' week start. */
export function heatColumns(snap: Snapshot, today: DayKey, weeks: number, weekStart: number): HeatCell[][] {
  const cell = cellMaker(snap, today)
  const back = (weekday(today) - weekStart + 7) % 7
  const start = addDays(today, -back - (weeks - 1) * 7)
  return Array.from({ length: weeks }, (_, w) => Array.from({ length: 7 }, (_, i) => cell(addDays(start, w * 7 + i))))
}

/** Over each column, «Nov» where a month begins in it; blank elsewhere. */
export function monthLabels(columns: HeatCell[][]): string[] {
  return columns.map((col) => {
    const first = col.find((c) => c.day.endsWith('-01'))
    if (!first) {
      return ''
    }
    return monthName(first.day).slice(0, 3)
  })
}

/** Down the map's side, from the week start: every other weekday named, the rest blank, as GitHub does. */
export function weekdayLabels(weekStart: number): string[] {
  return weekOrder(weekStart).map((wd, i) => {
    if (i % 2 === 0) {
      return ''
    }
    return weekdayShort(wd)
  })
}

/** «4 more days to beat your best»: how far the run now is from the best. */
function recordLine(current: number, best: number): string {
  if (best === 0) {
    return 'Clear a day to start a streak.'
  }
  if (current >= best) {
    return 'One more day sets a new best.'
  }
  const n = best - current + 1
  return `${n} more ${plural(n, 'day')} to beat your best.`
}

/** Focus in whole hours, rounded down so it never claims time not spent; under an hour, in minutes. */
function focusFigure(minutes: number): { value: number; unit: string } {
  if (minutes < 60) {
    return { value: minutes, unit: 'min' }
  }
  const hours = Math.floor(minutes / 60)
  return { value: hours, unit: plural(hours, 'hour') }
}

/**
 * The header's figures: the streak now, the best ever, and the 12 months'
 * full days and focus. Numbers, so they can count up; labels, final, for a
 * screen reader.
 */
export function readout(snap: Snapshot, today: DayKey) {
  const from = yearFrom(today)
  const current = streak(snap, today)
  const best = bestStreak(snap, today)
  const perfect = perfectDays(snap, from, today)
  const focus = focusFigure(focusBetween(snap, from, today))
  return {
    current,
    best,
    perfect,
    focus: focus.value,
    currentUnit: plural(current, 'day'),
    bestUnit: plural(best, 'day'),
    perfectUnit: plural(perfect, 'day'),
    focusUnit: focus.unit,
    record: recordLine(current, best),
    labels: {
      current: `${current} day streak`,
      best: `Best streak: ${best} ${plural(best, 'day')}`,
      perfect: `${perfect} perfect ${plural(perfect, 'day')} in 12 months`,
      focus: `${focus.value} ${focus.unit} of focus in 12 months`,
    },
  }
}

export type Readout = ReturnType<typeof readout>

/** The streak's largest size, and Best's size as a share of it. */
const STREAK_MAX_PX = 96
const BEST_SHARE = 40 / 96

/**
 * The rest of the streak's row, in px: the screen's and the header's side
 * padding (40), «days» and its gap (50), and the gap before Best (16).
 */
const STREAK_ROW_PX = 106

/** A figure's width in em: its digits in the design's width, and the 0.1em gaps between them. */
function figureEm(glyph: Glyph, n: number): number {
  const [, , w, h] = glyph.box
  const digits = String(n).length
  return digits * (w / h) + (digits - 1) * 0.1
}

/**
 * The streak's size and Best's, as CSS lengths: as large as the streak can
 * be, shrunk so both stay on one row at any phone width, however many digits
 * they have and however wide the design draws them. Best keeps its share.
 */
export function streakSizes(glyph: Glyph, current: number, best: number): { current: string; best: string } {
  const em = figureEm(glyph, current) + BEST_SHARE * figureEm(glyph, best)
  const size = `min(${STREAK_MAX_PX}px, calc((min(100vw, 30rem) - ${STREAK_ROW_PX}px) / ${em.toFixed(3)}))`
  return { current: size, best: `calc(${size} * ${BEST_SHARE.toFixed(4)})` }
}

/** The record meter's lit segments: the run now against the best. */
export function meterLit(current: number, best: number): number {
  if (best === 0) {
    return 0
  }
  return Math.floor((Math.min(current, best) / best) * METER_SEGMENTS)
}

/** A count up to `target`, `progress` of the way (0 to 1): quick at first, settling onto it. */
export function countAt(target: number, progress: number): number {
  const p = Math.min(1, Math.max(0, progress))
  return Math.round(target * (1 - (1 - p) ** 3))
}

/** A task's last 30 days: «87%», rounded down so it reads 100% only when every session got done. */
export interface Rate {
  id: TaskId
  name: string
  text: string
  /** Of `RATE_SEGMENTS`. */
  lit: number
}

export function rates(snap: Snapshot, today: DayKey): Rate[] {
  return taskRates(snap, today, RATE_DAYS).map(({ task, done, total }) => {
    const percent = Math.floor((done / total) * 100)
    return { id: task.id, name: task.name, text: `${percent}%`, lit: Math.floor((percent / 100) * RATE_SEGMENTS) }
  })
}

/** Everything History shows but a day's sheet. */
export function historyView(snap: Snapshot, today: DayKey, weekStart: number) {
  const columns = heatColumns(snap, today, MAP_WEEKS, weekStart)
  return {
    /** No task ever: nothing to show yet. */
    empty: firstDay(snap) === null,
    readout: readout(snap, today),
    columns,
    months: monthLabels(columns),
    weekdays: weekdayLabels(weekStart),
    rates: rates(snap, today),
  }
}

export type HistoryView = ReturnType<typeof historyView>

/** Minutes logged by `taskId` on `day`: what was spent, extra sessions and all. */
function minutesOn(snap: Snapshot, taskId: TaskId, day: DayKey): number {
  let m = 0
  for (const s of snap.sessions) {
    if (s.taskId === taskId && s.day === day) {
      m += s.minutes
    }
  }
  return m
}

/** «2/3 · 50 min»; with sessions past the plan, «3/3 +1 · 100 min». */
function rowLine(done: number, total: number, minutes: number): string {
  if (done > total) {
    return `${total}/${total} +${done - total} · ${minutes} min`
  }
  return `${done}/${total} · ${minutes} min`
}

/** One day, opened from the map: how much of it got done, and each task's part, by the plan it had then. */
export function dayDetail(snap: Snapshot, day: DayKey) {
  const p = dayProgress(snap, day)
  const rows = p.rows.map(({ task, plan, done }) => ({
    id: task.id,
    name: task.name,
    done: Math.min(done, plan.sessions),
    total: plan.sessions,
    line: rowLine(done, plan.sessions, minutesOn(snap, task.id, day)),
  }))
  // Sessions logged for a task not scheduled that day: listed, but kept out of the day's fill.
  const scheduled = new Set(rows.map((r) => r.id))
  const others = snap.tasks
    .filter((t) => !scheduled.has(t.id) && doneOn(snap, t.id, day) > 0)
    .map((t) => {
      const n = doneOn(snap, t.id, day)
      return { id: t.id, name: t.name, line: `${n} ${plural(n, 'session')} · ${minutesOn(snap, t.id, day)} min · not scheduled` }
    })
  return {
    day,
    weekday: weekdayName(day),
    date: longDate(day),
    /** Nothing was scheduled. */
    rest: p.fraction === null,
    text: `${pad2(p.done)}/${pad2(p.total)}`,
    label: `${p.done} of ${p.total} sessions done`,
    percent: `${Math.floor((p.fraction ?? 0) * 100)}%`,
    rows,
    others,
  }
}

export type DayDetail = ReturnType<typeof dayDetail>
