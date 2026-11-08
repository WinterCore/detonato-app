import { useCallback, useLayoutEffect } from 'react'
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

/** Each screen opens at its top. */
export function useScrollToTop(): void {
  const { pathname } = useLocation()
  useLayoutEffect(() => {
    // A block, not an arrow's value: Chrome's scrollTo returns a promise, and an effect may return only its cleanup.
    window.scrollTo(0, 0)
  }, [pathname])
}
