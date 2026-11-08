import { z } from 'zod/mini'
import { LENGTH_MAX, LENGTH_MIN, parseSettings, type Settings } from '@/core/settings'
import { SESSIONS_MAX, SESSIONS_MIN } from '@/core/tasks'
import { dayKey } from '@/core/time/calendar'
import type { SessionRecord, Snapshot, Task, TaskPlan } from '@/core/types'

/*
 * A backup: one JSON file the user keeps, to bring Detonato back after the
 * phone clears its storage, or onto a new phone. Restoring it replaces what
 * the device holds.
 *
 *   { app: 'detonato', format: 2, exportedAt: '2026-11-05T…', appVersion: '0.1.0',
 *     data: { settings, tasks, sessions } }
 *
 * One schema guards both ends: a file is checked against it as it's made and
 * again before a restore replaces anything. The tasks and sessions are
 * strict, so a field added to `types.ts` but not here fails the export (and
 * its test) instead of quietly writing a file the reader would refuse. The
 * settings are read field by field (`parseSettings`): one bad value takes
 * its default rather than refusing the file.
 */

/**
 * Bump when the file's shape changes; a reader refuses files newer than it
 * knows, and reads every older one.
 *
 * - 1: the settings
 * - 2: the tasks and every session finished
 */
export const BACKUP_FORMAT = 2

export interface BackupFile {
  app: 'detonato'
  format: number
  exportedAt: string
  appVersion: string
  /** `history` is null in a format-1 file, which held only the settings: restoring it leaves tasks and sessions be. */
  data: { settings: Settings; history: Snapshot | null }
}

export const NOT_A_BACKUP = "That file isn't a Detonato backup."
export const NEWER_BACKUP = 'This backup is from a newer Detonato. Update the app, then try again.'

const day = z.string().check(z.regex(/^\d{4}-\d{2}-\d{2}$/))

const plan = z.strictObject({
  from: day,
  days: z.array(z.int().check(z.gte(0), z.lte(6))),
  sessions: z.int().check(z.gte(SESSIONS_MIN), z.lte(SESSIONS_MAX)),
  length: z.nullable(z.int().check(z.gte(LENGTH_MIN), z.lte(LENGTH_MAX))),
}) satisfies z.ZodMiniType<TaskPlan>

const task = z.strictObject({
  id: z.string(),
  name: z.string(),
  plans: z.array(plan).check(z.minLength(1)),
  createdAt: z.number(),
  deletedOn: z.optional(day),
}) satisfies z.ZodMiniType<Task>

const session = z.strictObject({
  id: z.string(),
  taskId: z.string(),
  day,
  endedAt: z.number(),
  minutes: z.number().check(z.gt(0)),
}) satisfies z.ZodMiniType<SessionRecord>

const envelope = z.object({
  app: z.literal('detonato'),
  format: z.int().check(z.gte(1)),
  exportedAt: z.string(),
  appVersion: z.string(),
  data: z.object({ settings: z.unknown(), tasks: z.optional(z.array(task)), sessions: z.optional(z.array(session)) }),
})

export function makeBackup(settings: Settings, snap: Snapshot, now: Date, appVersion: string): BackupFile {
  return { app: 'detonato', format: BACKUP_FORMAT, exportedAt: now.toISOString(), appVersion, data: { settings, history: snap } }
}

/** The file's JSON: the history's tasks and sessions sit beside the settings. */
export function backupJson(file: BackupFile): string {
  const { settings, history } = file.data
  return JSON.stringify({ ...file, data: { settings, ...history } }, null, 2)
}

/** `detonato-backup-2026-11-05.json`: the local day it was saved. */
export function backupName(now: Date): string {
  return `detonato-backup-${dayKey(now)}.json`
}

export type BackupRead = { ok: true; backup: BackupFile } | { ok: false; error: string }

/** A file's text read as a backup, or why it can't be restored. */
export function readBackup(text: string): BackupRead {
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    return { ok: false, error: NOT_A_BACKUP }
  }
  // Newer first: a newer file may not fit this reader's schema, and should say so.
  const format = (json as { format?: unknown } | null)?.format
  if (typeof format === 'number' && format > BACKUP_FORMAT && (json as { app?: unknown }).app === 'detonato') {
    return { ok: false, error: NEWER_BACKUP }
  }
  const read = envelope.safeParse(json)
  if (!read.success) return { ok: false, error: NOT_A_BACKUP }
  const { data, ...rest } = read.data
  if (rest.format >= 2 && (!data.tasks || !data.sessions)) return { ok: false, error: NOT_A_BACKUP }
  const history = rest.format >= 2 ? { tasks: data.tasks ?? [], sessions: data.sessions ?? [] } : null
  return { ok: true, backup: { ...rest, app: 'detonato', data: { settings: parseSettings(data.settings), history } } }
}
