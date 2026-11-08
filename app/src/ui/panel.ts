const tones = {
  /** On the ground: a hairline edge. */
  plain: 'border-line bg-panel',
  /** What's under way or next: the LED's ring. */
  lit: 'border-led-ring bg-panel',
  /** Done: filled with the LED's shade. */
  filled: 'border-transparent bg-led-fill',
  /** Set aside: a dashed edge, no fill. */
  dashed: 'border-dashed border-line',
} as const

export type PanelTone = keyof typeof tones

/** A panel's classes, for a card, a tile or a button that looks like one: rounded, edged, and filled by its tone. */
export function panel(tone: PanelTone = 'plain'): string {
  return `rounded-2xl border ${tones[tone]}`
}
