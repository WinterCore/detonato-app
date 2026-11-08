import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { glyphById } from '@/core/segments/glyphs'
import type { DayKey } from '@/core/time/calendar'
import type { Snapshot } from '@/core/types'
import { useBack } from '@/navigation/back'
import { useSheetEntry } from '@/navigation/sheet'
import { dayDetail, historyView, meterLit, streakSizes } from '@/screens/history/lib/historyView'
import { useApp } from '@/state'
import { useCountUp } from './useCountUp'

/** A figure as the display draws it mid-count: dark slots for the digits it hasn't reached. */
function digits(n: number, target: number): string {
  return String(n).padStart(String(target).length, ' ')
}

/** The open day's sheet; none when no day is open. */
function detailOf(snap: Snapshot, day: DayKey | null) {
  if (day === null) {
    return null
  }
  return dayDetail(snap, day)
}

/** History's data, the figures counting up as it opens, the open day, and what its taps do. */
export function useHistory() {
  const snap = useApp((s) => s.snap)
  const today = useApp((s) => s.today)
  const weekStart = useApp((s) => s.settings.weekStart)
  const styleId = useApp((s) => s.settings.styleId)
  const back = useBack('/')
  const view = useMemo(() => historyView(snap, today, weekStart), [snap, today, weekStart])
  const r = view.readout
  const [current, best, perfect, focus] = useCountUp([r.current, r.best, r.perfect, r.focus])

  const [day, setDay] = useState<DayKey | null>(null)
  const closeDay = useCallback(() => setDay(null), [])
  useSheetEntry('day', day !== null, closeDay)
  const detail = useMemo(() => detailOf(snap, day), [snap, day])

  // The map opens on its last weeks: today at its right end.
  const mapRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const el = mapRef.current
    if (el) {
      el.scrollLeft = el.scrollWidth
    }
  }, [])

  return {
    ...view,
    figures: {
      current: digits(current, r.current),
      best: digits(best, r.best),
      perfect: digits(perfect, r.perfect),
      focus: digits(focus, r.focus),
    },
    /** The streak's size and Best's, to fit the row whatever their digits. */
    sizes: streakSizes(glyphById(styleId), r.current, r.best),
    /** The record meter, filling with the count. */
    meter: meterLit(current, r.best),
    mapRef,
    detail,
    back,
    openDay: setDay,
    closeDay,
  }
}

export type HistoryState = ReturnType<typeof useHistory>
