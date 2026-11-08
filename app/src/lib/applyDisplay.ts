import { GHOST_MIX, LED_HEX, type Settings } from '@/core/settings'
import { useApp } from '@/state'

/**
 * The display settings on <html>, where every segment, pip and shade reads
 * them: the LED colour (`--led`), how strongly unlit segments show
 * (`--ghost`), and `.glow` for the glow. tokens.css mixes the rest from them.
 */
export function applyDisplay(s: Settings): void {
  const html = document.documentElement
  html.style.setProperty('--led', LED_HEX[s.led])
  html.style.setProperty('--ghost', GHOST_MIX[s.ghost])
  html.classList.toggle('glow', s.glow)
}

/** Applies the settings now, and again each time they change. Returns a stop function. */
export function followDisplay(): () => void {
  applyDisplay(useApp.getState().settings)
  return useApp.subscribe((s, prev) => {
    if (s.settings !== prev.settings) applyDisplay(s.settings)
  })
}
