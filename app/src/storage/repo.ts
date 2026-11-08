import type { SessionRecord, Snapshot, Task } from '@/core/types'
import type { Connection } from './connection'

/**
 * Thin persistence. All logic lives in `core/` and runs on the in-memory
 * snapshot; this only loads it and writes back whole records. Anything that
 * touches more than one record is one transaction: it lands whole or not at
 * all, and the store updates memory only once it has.
 */
export function createRepo(conn: Connection) {
  return {
    /** Everything: every task, deleted ones too (their past still counts), and every session. */
    loadSnapshot(): Promise<Snapshot> {
      return conn.use(async (db) => {
        const tx = db.transaction(['tasks', 'sessions'])
        const [tasks, sessions] = await Promise.all([tx.objectStore('tasks').getAll(), tx.objectStore('sessions').getAll()])
        tasks.sort((a, b) => a.createdAt - b.createdAt)
        sessions.sort((a, b) => a.endedAt - b.endedAt)
        return { tasks, sessions }
      })
    },

    putTask(task: Task): Promise<void> {
      return conn.use(async (db) => {
        await db.put('tasks', task)
      })
    },

    /** A session finished. Its id is its task and end, so the same session put twice is one record. */
    putSession(session: SessionRecord): Promise<void> {
      return conn.use(async (db) => {
        await db.put('sessions', session)
      })
    },

    /** A restore: every task and session replaced with the backup's, in one transaction — a failure leaves the old whole. */
    replaceAll(snap: Snapshot): Promise<void> {
      return conn.use(async (db) => {
        const tx = db.transaction(['tasks', 'sessions'], 'readwrite')
        const [tasks, sessions] = [tx.objectStore('tasks'), tx.objectStore('sessions')]
        await Promise.all([tasks.clear(), sessions.clear()])
        await Promise.all([...snap.tasks.map((t) => tasks.put(t)), ...snap.sessions.map((s) => sessions.put(s)), tx.done])
      })
    },
  }
}

export type Repo = ReturnType<typeof createRepo>
