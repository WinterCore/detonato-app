import { set } from './store'

/** The shared failure: a write that didn't land. */
export const SAVE_FAILED = 'Couldn’t save. Try again.'

let nextId = 1

/** One short line at the bottom of the screen; a new one replaces it. `components/Toaster` shows and dismisses it. */
export function toast(text: string): void {
  set('toast/show', { toast: { id: nextId++, text } })
}

/** Put away the toast `id`, unless a newer one has taken its place. */
export function dismissToast(id: number): void {
  set('toast/dismiss', (s) => (s.toast?.id === id ? { toast: null } : {}))
}
