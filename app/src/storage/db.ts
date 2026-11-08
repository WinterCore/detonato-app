import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { DayKey } from '@/core/time/calendar'
import type { SessionRecord, Task, TaskId } from '@/core/types'

/*
 * IndexedDB for what the user makes and does — tasks, and every session
 * finished: room for years of history, and reads and writes that never block
 * a frame. The settings and the session under way stay in localStorage,
 * read synchronously before the first paint.
 */
export interface DetonatoDB extends DBSchema {
  tasks: { key: TaskId; value: Task }
  sessions: { key: string; value: SessionRecord; indexes: { day: DayKey } }
}

export type DB = IDBPDatabase<DetonatoDB>

/** What the browser tells an open connection; see `connection.ts`. */
export interface ConnectionHooks {
  /** Another connection wants a newer version and waits on this one to close. */
  blocking?: () => void
  /** The browser closed this connection itself. */
  terminated?: () => void
}

export function openDetonatoDB(name = 'detonato', { blocking, terminated }: ConnectionHooks = {}): Promise<DB> {
  return openDB<DetonatoDB>(name, 1, {
    blocking,
    terminated,
    upgrade(db) {
      db.createObjectStore('tasks', { keyPath: 'id' })
      const sessions = db.createObjectStore('sessions', { keyPath: 'id' })
      sessions.createIndex('day', 'day')
    },
  })
}
