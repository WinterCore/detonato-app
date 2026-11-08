import type { DayKey } from '@/core/time/calendar'

/*
 * The data model. Read these comments first.
 */

/** A display design's id, from the sheet: `sports-1`, `classic-bold-1`, `x7-light-3`. */
export type StyleId = string

/** How a design's digits were worked out (`scripts/extract_glyphs.py`): from its geometry, or by hand. */
export type MapMethod = 'seven' | 'six' | 'regions' | 'matrix' | 'hand'

/**
 * One display design: the shapes of one digit, each a segment that lights
 * on its own. Generated from Posy's sheet into `segments/glyphs.json`.
 *
 * A segment's index is its order in the sheet, so `digits[3]` lists the
 * indexes of the segments that light to show a 3.
 */
export interface Glyph {
  id: StyleId
  /** «Sports», «Classic». Several designs can share one. */
  family: string
  /** The design's name within its family: «1», «Bold». */
  variant: string
  /** How many segments it has. */
  count: number
  /** The digit's frame in the sheet: x, y, width, height. Every frame is 240 units tall. */
  box: [number, number, number, number]
  /** Each segment's SVG markup, in sheet coordinates. */
  segments: string[]
  /** Segments lit for 0–9; null for a design whose digits aren't worked out yet (every segment lights). */
  digits: number[][] | null
  how: MapMethod | null
}

export type TaskId = string

/**
 * What a task asks of the days from `from` on: which weekdays, how many
 * sessions, how long each. A task keeps every plan it has had, so a past
 * day is always judged by the plan it had then — an edit never repaints the
 * history.
 */
export interface TaskPlan {
  from: DayKey
  /** The weekdays it's scheduled, as `Date.getDay()` numbers them (0 = Sunday). */
  days: number[]
  /** Sessions to finish it on a day: 1–8. */
  sessions: number
  /** Minutes a session; null for Settings' default. */
  length: number | null
}

/** Something done every day, or on chosen weekdays, a number of sessions at a time. */
export interface Task {
  id: TaskId
  /** One name for its whole history: renaming renames the past too. */
  name: string
  /** Every plan it has had, oldest first; the first's `from` is the day it was made. */
  plans: TaskPlan[]
  /** When it was made: the order tasks are listed in. */
  createdAt: number
  /** The day it was deleted: it's scheduled on no day from then on, and its past stays. */
  deletedOn?: DayKey
}

/**
 * One session finished. Append-only: nothing derived is stored, so a day's
 * progress is always counted from these.
 */
export interface SessionRecord {
  /** `${taskId}@${endedAt}`: the same session logged twice is one record. */
  id: string
  taskId: TaskId
  /** The day it started on: a session begun before midnight counts for that day. */
  day: DayKey
  endedAt: number
  minutes: number
}

/** Everything the user has made and done: the in-memory copy of IndexedDB. */
export interface Snapshot {
  tasks: Task[]
  sessions: SessionRecord[]
}

export const EMPTY_SNAPSHOT: Snapshot = { tasks: [], sessions: [] }
