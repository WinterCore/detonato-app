import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'
import { get } from '@/state'

/*
 * What the app feels like, if haptics are on: the phone's own engine in the
 * apps, the Vibration API on the web (Android browsers; iOS's have none, and
 * say nothing). Best effort: a phone that can't just stays still.
 */

/** One light tick: a choice made. */
export function tick(): void {
  if (!get().settings.haptics) return
  if (Capacitor.isNativePlatform()) {
    Haptics.impact({ style: ImpactStyle.Light }).catch(() => {})
    return
  }
  navigator.vibrate?.(12)
}

/** A session's end: a buzz to be felt in a pocket. */
export function buzz(): void {
  if (!get().settings.haptics) return
  if (Capacitor.isNativePlatform()) {
    Haptics.notification({ type: NotificationType.Success }).catch(() => {})
    return
  }
  navigator.vibrate?.([220, 120, 220])
}
