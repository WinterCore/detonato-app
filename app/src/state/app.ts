import { settleTimer } from '@/core/timer'
import { dayKey } from '@/core/time/calendar'
import { connect } from '@/storage/connection'
import { createRepo } from '@/storage/repo'
import { readSettings } from '@/storage/settings'
import { readTimer } from '@/storage/timer'
import { set } from './store'
import { logEnded } from './timer'
import { attachRepo } from './writes'

/**
 * Load everything kept on this device before the first render: the settings
 * and the session under way from localStorage, the tasks and their history
 * from IndexedDB. A task session that ended while the app was closed is
 * logged now — once, whatever happened before — and opens done.
 */
export async function boot(): Promise<void> {
  const repo = createRepo(connect())
  attachRepo(repo)
  const [snap, settings] = [await repo.loadSnapshot(), readSettings()]
  const now = Date.now()
  set('app/boot', { snap, settings, today: dayKey(new Date(now)), timer: readTimer() })
  await logEnded(settleTimer(readTimer(), now))
}

/** The day moved on: midnight, or the app coming back on a later day. */
export function setToday(): void {
  set('clock/day', (s) => {
    const today = dayKey(new Date())
    return today === s.today ? {} : { today }
  })
}
