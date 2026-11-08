import { useLayoutEffect, useRef } from 'react'
import { glyphById } from '@/core/segments/glyphs'
import type { StyleId } from '@/core/types'
import { useApp } from '@/state'
import { cn } from '@/ui'
import { Digit } from './Digit'
import { Mark } from './Mark'
import { isMark } from './marks'
import './segments.css'

export interface DisplayProps {
  /** Digits, `:` `/` `.`, and a space for a dark digit slot. */
  text: string
  /** The digits' height, as a CSS length. */
  size: string
  /** A design other than the chosen one: the picker's tiles, the glyph lab. */
  glyphId?: StyleId
  /** Each new value plays the sweep: every segment off, then on again in order. */
  sweepKey?: string | number
  /** What a screen reader says; the text itself by default. */
  label?: string
  /** Marks in quiet ink rather than the LED. */
  dimMarks?: boolean
  /** `blink` (the marks) or `flash` (everything), for the timer. */
  className?: string
}

/** How long the sweep runs before the display settles: the last digit's last segment, plus its fade. */
const SWEEP_MS = 1400

/**
 * The sweep, played on the element itself (segments.css › .blank, .sweep):
 * an animation of the DOM, not a state of the app, so it never re-renders.
 */
function useSweep(sweepKey: string | number | undefined) {
  const ref = useRef<HTMLSpanElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (sweepKey === undefined || !el) return
    el.classList.remove('sweep')
    el.classList.add('blank')
    const timers = { frame: 0, settle: 0 }
    // Two frames: the blank state must paint before the sweep's transitions start from it.
    timers.frame = requestAnimationFrame(() => {
      timers.frame = requestAnimationFrame(() => {
        el.classList.replace('blank', 'sweep')
        timers.settle = window.setTimeout(() => el.classList.remove('sweep'), SWEEP_MS)
      })
    })
    return () => {
      cancelAnimationFrame(timers.frame)
      clearTimeout(timers.settle)
      el.classList.remove('blank', 'sweep')
    }
  }, [sweepKey])
  return ref
}

/** Text drawn in segments, in the chosen design (Settings › Style) unless `glyphId` names another. */
export function Display({ text, size, glyphId, sweepKey, label, dimMarks, className }: DisplayProps) {
  const styleId = useApp((s) => s.settings.styleId)
  const glyph = glyphById(glyphId ?? styleId)
  const ref = useSweep(sweepKey)

  let digit = 0
  return (
    <span
      ref={ref}
      className={cn('seg-display', className)}
      style={{ fontSize: size }}
      role="img"
      aria-label={label ?? text}
    >
      {[...text].map((ch, i) => {
        if (isMark(ch)) return <Mark key={i} kind={ch} dim={dimMarks} />
        return <Digit key={i} glyph={glyph} char={ch} index={digit++} />
      })}
    </span>
  )
}
