import type { Repo } from '@/storage/repo'

/*
 * Every write to IndexedDB goes through here, one at a time: each decides
 * from the state the last one left. A write persists first, then updates
 * memory, so nothing on screen claims what failed to save.
 */

let repo: Repo | null = null
let queue: Promise<unknown> = Promise.resolve()

/** Hands the store its database. `boot` calls this before anything else. */
export function attachRepo(r: Repo): void {
  repo = r
}

export function db(): Repo {
  if (!repo) throw new Error('state used before boot()')
  return repo
}

/** Runs `fn` after everything queued before it. A failure doesn't block the next. */
export function serial<T>(fn: () => Promise<T> | T): Promise<T> {
  const run = queue.then(fn)
  queue = run.catch(() => {})
  return run
}
