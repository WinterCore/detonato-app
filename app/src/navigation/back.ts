import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

/**
 * A back arrow: back through the history when the app has some, or to
 * `fallback` when the screen was opened directly (a link, a reload).
 */
export function useBack(fallback: string): () => void {
  const navigate = useNavigate()
  return useCallback(() => {
    // React Router counts its own entries in history.state.idx: 0 is the one the app opened on.
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0
    if (idx > 0) navigate(-1)
    else navigate(fallback, { replace: true })
  }, [navigate, fallback])
}

/**
 * Leave the screen, as `useBack` does, once `gone` is true: what it showed
 * is no more. Going back, not on to a new entry, keeps the history as it
 * was before the screen opened, so one back still leaves the app from the
 * first screen.
 */
export function useLeaveWhen(gone: boolean, fallback: string): void {
  const back = useBack(fallback)
  // Once only: React's strict mode runs a new effect twice, and two steps back would overshoot.
  const left = useRef(false)
  useEffect(() => {
    if (!gone || left.current) {
      return
    }
    left.current = true
    back()
  }, [gone, back])
}

/** Each screen opens at its top. */
export function useScrollToTop(): void {
  const { pathname } = useLocation()
  useLayoutEffect(() => {
    // A block, not an arrow's value: Chrome's scrollTo returns a promise, and an effect may return only its cleanup.
    window.scrollTo(0, 0)
  }, [pathname])
}

/**
 * Android's back button. `@capacitor/app` takes it over: left alone, it goes
 * back through the web view's history and, with none left, does nothing, so
 * back on the first screen was dead. Here it goes back through the history
 * (a screen, an open sheet), and with none left it leaves the app for the
 * home screen, as Android's own back does. Called once, after boot. Returns
 * a stop function.
 */
export function followBackButton(): () => void {
  if (Capacitor.getPlatform() !== 'android') {
    return () => {}
  }
  const listening = App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) {
      window.history.back()
      return
    }
    void App.minimizeApp()
  })
  return () => void listening.then((l) => l.remove())
}
