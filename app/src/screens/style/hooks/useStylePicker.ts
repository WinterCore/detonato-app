import { useLayoutEffect, useMemo } from 'react'
import { GLYPHS, glyphById } from '@/core/segments/glyphs'
import type { StyleId } from '@/core/types'
import { tick } from '@/lib/haptics'
import { useBack } from '@/navigation/back'
import { previewLine, styleSections } from '@/screens/style/lib/styleView'
import { setStyle, useApp } from '@/state'

/** The tile's element id, for scrolling the chosen one into view. */
export const tileId = (id: StyleId) => `style-${id}`

/** The style picker's data and what its taps do. A pick applies at once, everywhere. */
export function useStylePicker() {
  const back = useBack('/settings')
  const styleId = useApp((s) => s.settings.styleId)
  const sections = useMemo(() => styleSections(GLYPHS, styleId), [styleId])
  const preview = previewLine(glyphById(styleId), GLYPHS)

  // Opened on a design far down the list, the list starts there. Once: picks after that leave it where it is.
  useLayoutEffect(() => {
    document.getElementById(tileId(useApp.getState().settings.styleId))?.scrollIntoView({ block: 'center' })
  }, [])

  return {
    styleId,
    preview,
    sections,
    /** How many designs the sheet holds: «88». */
    count: GLYPHS.length,
    back,
    pick: (id: StyleId) => {
      if (id === styleId) return
      setStyle(id)
      tick()
    },
  }
}
