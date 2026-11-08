import type { Page } from '@playwright/test'

/*
 * What a test sets up before it looks: tasks and finished sessions written
 * straight into the app's IndexedDB, as `src/core/types.ts` shapes them.
 * The e2e project doesn't see `src/`, so the shapes are restated here.
 */

export const MIN = 60_000

/** 9:00 AM on Thursday 5 November 2026: the day every test runs on, unless it says otherwise. */
export const NINE = new Date(2026, 10, 5, 9, 0)
export const TODAY = '2026-11-05'
export const YESTERDAY = '2026-11-04'

export interface SeedPlan {
  from: string
  days: number[]
  sessions: number
  length: number | null
}

export interface SeedTask {
  id: string
  name: string
  plans: SeedPlan[]
  createdAt: number
  deletedOn?: string
}

export interface SeedSession {
  id: string
  taskId: string
  day: string
  endedAt: number
  minutes: number
}

export const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6]

/** A task with one plan: every day from a week back, one session of the default length, unless told otherwise. */
export function task(id: string, name: string, plan: Partial<SeedPlan> = {}, createdAt = NINE.getTime() - 7 * 24 * 60 * MIN): SeedTask {
  return { id, name, createdAt, plans: [{ from: '2026-10-29', days: EVERY_DAY, sessions: 1, length: null, ...plan }] }
}

/** Sessions of a task finished on a day: the first ending at 8 AM, the next a minute apart. */
export function sessions(taskId: string, day: string, count: number, minutes = 25): SeedSession[] {
  const [y, m, d] = day.split('-').map(Number)
  const eight = new Date(y, m - 1, d, 8).getTime()
  return Array.from({ length: count }, (_, i) => {
    const endedAt = eight + i * MIN
    return { id: `${taskId}@${endedAt}`, taskId, day, endedAt, minutes }
  })
}

/**
 * Writes the tasks and sessions into the app's database, and a session
 * under way (`detonato.timer`) if given, then reloads so the app reads them.
 */
export async function seed(page: Page, data: { tasks?: SeedTask[]; sessions?: SeedSession[]; timer?: object }): Promise<void> {
  if (page.url() === 'about:blank') await page.goto('/')
  await page.evaluate(
    ({ tasks, sessions, timer }) =>
      new Promise<void>((resolve, reject) => {
        if (timer) localStorage.setItem('detonato.timer', JSON.stringify(timer))
        const open = indexedDB.open('detonato', 1)
        // The same stores as `storage/db.ts`, in case the app hasn't made them yet.
        open.onupgradeneeded = () => {
          open.result.createObjectStore('tasks', { keyPath: 'id' })
          open.result.createObjectStore('sessions', { keyPath: 'id' }).createIndex('day', 'day')
        }
        open.onerror = () => reject(open.error)
        open.onsuccess = () => {
          const db = open.result
          const tx = db.transaction(['tasks', 'sessions'], 'readwrite')
          for (const t of tasks) tx.objectStore('tasks').put(t)
          for (const s of sessions) tx.objectStore('sessions').put(s)
          tx.oncomplete = () => {
            db.close()
            resolve()
          }
          tx.onerror = () => reject(tx.error)
        }
      }),
    { tasks: data.tasks ?? [], sessions: data.sessions ?? [], timer: data.timer },
  )
  await page.reload()
}

/** What the app's database holds now. */
export function stored(page: Page): Promise<{ tasks: SeedTask[]; sessions: SeedSession[] }> {
  return page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const open = indexedDB.open('detonato', 1)
        open.onerror = () => reject(open.error)
        open.onsuccess = () => {
          const db = open.result
          const tx = db.transaction(['tasks', 'sessions'])
          const tasks = tx.objectStore('tasks').getAll()
          const sessions = tx.objectStore('sessions').getAll()
          tx.oncomplete = () => {
            db.close()
            resolve({ tasks: tasks.result, sessions: sessions.result })
          }
          tx.onerror = () => reject(tx.error)
        }
      }),
  )
}

/** The countdown, by what it reads: «24:59 left». */
export const clock = (page: Page, text: string | RegExp) =>
  page.getByRole('img', { name: typeof text === 'string' ? `${text} left` : text })

/** Today's figures: «1 of 3 sessions done today». */
export const progress = (page: Page, done: number, total: number) =>
  page.getByRole('img', { name: `${done} of ${total} sessions done today` })
