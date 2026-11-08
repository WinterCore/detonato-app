import { createTask, deleteTask, editTask, type TaskDraft } from '@/core/tasks'
import { dayKey } from '@/core/time/calendar'
import { IDLE } from '@/core/timer'
import type { Task, TaskId } from '@/core/types'
import { writeTimer } from '@/storage/timer'
import { SAVE_FAILED, toast } from './feedback'
import { get, set } from './store'
import { db, serial } from './writes'

/** Save `task`, then put it in memory. False when it didn't save (a toast says so). */
async function put(action: string, task: Task, alongside: () => void = () => {}): Promise<boolean> {
  try {
    await db().putTask(task)
  } catch (err) {
    console.error(err)
    toast(SAVE_FAILED)
    return false
  }
  set(action, (s) => {
    const known = s.snap.tasks.some((t) => t.id === task.id)
    const tasks = known ? s.snap.tasks.map((t) => (t.id === task.id ? task : t)) : [...s.snap.tasks, task]
    return { snap: { ...s.snap, tasks } }
  })
  alongside()
  return true
}

/**
 * The editor's Save: a new task, scheduled from today — or an edit, which
 * plans from today and leaves past days their own.
 */
export function saveTask(draft: TaskDraft, id?: TaskId): Promise<boolean> {
  return serial(() => {
    const now = Date.now()
    const today = dayKey(new Date(now))
    const existing = id === undefined ? undefined : get().snap.tasks.find((t) => t.id === id)
    if (existing) return put('tasks/edit', editTask(existing, draft, today))
    return put('tasks/create', createTask(draft, crypto.randomUUID(), today, now))
  })
}

/**
 * Off the schedule from today; its past stays in the history. A session of
 * it under way is called off: there's no task left to log it to.
 */
export function removeTask(id: TaskId): Promise<boolean> {
  return serial(() => {
    const task = get().snap.tasks.find((t) => t.id === id)
    if (!task) return false
    return put('tasks/delete', deleteTask(task, dayKey(new Date())), () => {
      const { timer } = get()
      if (timer.phase !== 'idle' && timer.phase !== 'done' && timer.taskId === id) {
        writeTimer(IDLE)
        set('timer/stop', { timer: IDLE })
      }
    })
  })
}
