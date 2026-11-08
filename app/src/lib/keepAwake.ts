import { KeepAwake } from '@capacitor-community/keep-awake'

/** Whether the screen is being held on, as last asked. */
let awake = false

/**
 * Hold the screen on, or let it sleep again: the phone's own switch in the
 * apps, the Screen Wake Lock in a browser (taken again each time the page
 * comes back, which drops it). Best effort: where neither exists, the screen
 * sleeps as it would.
 */
export function setAwake(on: boolean): void {
  if (on === awake) return
  awake = on
  const ask = on ? KeepAwake.keepAwake() : KeepAwake.allowSleep()
  ask.catch(() => {})
}
