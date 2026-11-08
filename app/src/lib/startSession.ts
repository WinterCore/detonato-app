import type { TaskId } from '@/core/types'
import { tick } from '@/lib/haptics'
import { askToNotify, canNotify } from '@/lib/notifications'
import { primeAudio } from '@/lib/sound'
import { get, setNotify, startSession, toast } from '@/state'

const NOTIFY_REFUSED = 'Notifications are off, so a session’s end can’t reach you with the app closed.'

/**
 * Every session starts here — a task's from Today or the done screen, a
 * quick one from Today. Called from the tap: the audio wakes within it, so
 * the end can sound minutes later. The first start asks to notify; a
 * refusal turns the setting off. Resolves once the session runs.
 */
export async function beginSession(taskId: TaskId | null, minutes: number): Promise<void> {
  primeAudio()
  if (canNotify() && get().settings.notify && !(await askToNotify())) {
    setNotify(false)
    toast(NOTIFY_REFUSED)
  }
  await startSession(taskId, minutes)
  tick()
}
