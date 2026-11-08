import { useEffect, useRef } from 'react'

/*
 * Sheets live in the browser's history. Opening
 * one pushes an entry for it — the same page, the sheet's name in the hash —
 * so back, the browser's or Android's (Capacitor's back goes back through the
 * WebView's history), closes the sheet instead of leaving the screen.
 * Closing it from the sheet itself takes its entry back off, so the next
 * back goes where it would have. Escape closes it too.
 */

/** Give a sheet an entry in the history while `open`; back, or Escape, calls `close`. */
export function useSheetEntry(name: string, open: boolean, close: () => void): void {
  const latest = useRef(close)
  useEffect(() => {
    latest.current = close
  })

  useEffect(() => {
    if (!open) return
    const hash = `#${name}`
    const path = window.location.pathname
    // React Router's own state rides along, so it still knows where it is.
    window.history.pushState(window.history.state, '', `${path}${window.location.search}${hash}`)
    const closedBy = { back: false }
    const onPop = () => {
      if (window.location.hash === hash) return
      closedBy.back = true
      latest.current()
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && latest.current()
    window.addEventListener('popstate', onPop)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('popstate', onPop)
      window.removeEventListener('keydown', onKey)
      // Closed from the sheet (not by back): take its entry back off — one step each, so two sheets
      // closing together (a delete confirmed over its editor) take both — unless a screen has replaced it.
      if (!closedBy.back && window.location.pathname === path) window.history.back()
    }
  }, [name, open])
}
