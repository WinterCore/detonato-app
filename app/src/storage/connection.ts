import { openDetonatoDB, type DB } from './db'

/*
 * The app's IndexedDB connection, kept usable for as long as the app runs.
 *
 * A connection can go away under a running app: WebKit drops it after the
 * app has sat in the background («Connection to Indexed Database server
 * lost»), and clearing site data or a storage eviction ends it too. A handle
 * held from boot would then fail every save until a reload. So every use goes
 * through `use`, which reopens a connection that's gone and tries once more —
 * safe, because every write is one transaction: it landed whole or not at all.
 *
 * It also steps aside for an upgrade: when another tab opens the database at
 * a newer version, this connection closes rather than block it.
 */

export interface Connection {
  /** Run `fn` with the database. If it fails because the connection is gone, reconnect and run it once more. */
  use<T>(fn: (db: DB) => Promise<T>): Promise<T>
}

/** Errors that mean the connection is gone, not that the request was bad. */
const GONE = new Set(['InvalidStateError', 'UnknownError'])

function isGone(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'name' in err && GONE.has(String(err.name))
}

export function connect(name?: string): Connection {
  let current: Promise<DB> | null = null

  /** Drop `conn` so the next use opens a fresh one — unless it was already replaced. */
  const forget = (conn: Promise<DB>) => {
    if (current === conn) current = null
  }

  function open(): Promise<DB> {
    let db: DB | undefined
    const opening: Promise<DB> = openDetonatoDB(name, {
      blocking: () => {
        db?.close()
        forget(opening)
      },
      terminated: () => forget(opening),
    }).then((d) => (db = d))
    // A failed open isn't kept: the next use tries again.
    opening.catch(() => forget(opening))
    return opening
  }

  const get = () => (current ??= open())

  return {
    async use(fn) {
      const conn = get()
      const db = await conn
      try {
        return await fn(db)
      } catch (err) {
        if (!isGone(err)) throw err
        forget(conn)
        db.close()
        return fn(await get())
      }
    },
  }
}
