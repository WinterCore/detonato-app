import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GLYPHS, glyphById } from '@/core/segments/glyphs'
import { stepLength, type SoundId } from '@/core/settings'
import { tick } from '@/lib/haptics'
import { askToNotify, canNotify, notificationsBlocked, openNotificationSettings } from '@/lib/notifications'
import { playSound } from '@/lib/sound'
import { useBack } from '@/navigation/back'
import { useSheetEntry } from '@/navigation/sheet'
import { settingsView, versionLine } from '@/screens/settings/lib/settingsView'
import {
  setDefaultLength,
  setGhost,
  setGlow,
  setHaptics,
  setKeepAwake,
  setLed,
  setNotify,
  setSound,
  setWeekStart,
  toast,
  useApp,
} from '@/state'

const VERSION = versionLine(__APP_VERSION__)
const NOT_ALLOWED = 'The phone hasn’t allowed Detonato to notify.'

/**
 * Whether the phone refuses Detonato's notifications — checked on open, again
 * on coming back (say from the phone's settings), and after a refused ask.
 */
function useBlocked(): { blocked: boolean; recheck: () => void } {
  const [blocked, setBlocked] = useState(false)
  const recheck = useCallback(() => {
    if (canNotify()) void notificationsBlocked().then(setBlocked)
  }, [])
  useEffect(() => {
    const onVisibility = () => document.visibilityState === 'visible' && recheck()
    recheck()
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [recheck])
  return { blocked, recheck }
}

/** The settings screen's data and what its taps do. Every change applies at once. */
export function useSettings() {
  const navigate = useNavigate()
  const back = useBack('/')
  const s = useApp((st) => st.settings)
  const view = useMemo(() => settingsView(s, glyphById(s.styleId), GLYPHS), [s])
  const [soundOpen, setSoundOpen] = useState(false)
  const closeSound = useCallback(() => setSoundOpen(false), [])
  useSheetEntry('sound', soundOpen, closeSound)
  const { blocked, recheck } = useBlocked()

  return {
    ...view,
    version: VERSION,
    soundOpen,
    /** «Notifications» — the countdown and the end — on or off; null on the web, which can't. */
    notify: canNotify() ? s.notify : null,
    /** The phone refuses notifications, so none arrive until it's allowed there — said only while the switch is on. */
    notifyBlocked: blocked && s.notify,

    back,
    openStyle: () => navigate('/settings/style'),
    pickLed: setLed,
    pickGhost: setGhost,
    toggleGlow: () => setGlow(!s.glow),
    shorter: () => setDefaultLength(stepLength(s.defaultLength, -1)),
    longer: () => setDefaultLength(stepLength(s.defaultLength, 1)),
    toggleKeepAwake: () => setKeepAwake(!s.keepAwake),
    openSound: () => setSoundOpen(true),
    closeSound,
    /** Chosen and heard: each tap plays it, so the sheet is also where they're tried. */
    pickSound: (id: SoundId) => {
      setSound(id)
      playSound(id)
    },
    /** Turned on, it ticks once: what it feels like. */
    toggleHaptics: () => {
      setHaptics(!s.haptics)
      tick()
    },
    /** Switching it on asks the phone first; if it says no, the switch stays off. */
    async toggleNotify() {
      if (s.notify) return setNotify(false)
      if (!(await askToNotify())) {
        recheck()
        return toast(NOT_ALLOWED)
      }
      setNotify(true)
    },
    openPhoneSettings: () => void openNotificationSettings(),
    pickWeekStart: setWeekStart,
  }
}
