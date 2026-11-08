import { registerPlugin, type PluginListenerHandle } from '@capacitor/core'
import type { Notice } from '@/core/notice'
import { LED_HEX, type Settings } from '@/core/settings'
import { SOUND_FILES } from '@/core/sounds'
import { parseCommands, type NoticeCommand, type TimerState } from '@/core/timer'
import { canNotify, readyChannel } from '@/lib/notifications'

/*
 * What a session shows on the phone while it's under way, through the app's
 * own native module, SessionNotice:
 *
 * - Android (android/…/detonato/session/): an ongoing notification whose
 *   countdown the system draws, with Pause or Resume, and Stop;
 * - iOS (ios/App/App/Session*, ios/App/SessionActivity/): a Live Activity
 *   on the lock screen and in the Dynamic Island, with the same buttons from
 *   iOS 17.
 *
 * It holds the end's alert too, so those buttons can take it back and hand
 * it over again with the app closed. Their moves wait natively until the
 * app takes them (`takeCommands`) and replays them (`core/timer › replay`).
 */

type Shown = Extract<TimerState, { phase: 'running' } | { phase: 'paused' }>

interface ShowOptions {
  phase: 'running' | 'paused'
  /** Running: when it ends, in epoch ms; 0 while paused. */
  endsAt: number
  /** Paused: the milliseconds left; 0 while running. */
  left: number
  length: number
  title: string
  body: string
  endTitle: string
  endBody: string
  /** Android's channel for the end, with its sound and buzz. */
  channelId: string
  /** The end's sound file (in the web assets for iOS, res/raw for old Androids); empty for none. */
  sound: string
  /** A buzz with the end: Android's channel holds it, except on phones older than channels. */
  haptics: boolean
  /** The LED colour, #rrggbb. */
  color: string
}

interface SessionNoticePlugin {
  show(options: ShowOptions): Promise<void>
  takeBack(): Promise<void>
  hide(): Promise<void>
  clear(): Promise<void>
  takeCommands(): Promise<{ commands: unknown }>
  addListener(event: 'commands', listener: () => void): Promise<PluginListenerHandle>
}

const SessionNotice = registerPlugin<SessionNoticePlugin>('SessionNotice')

/** Where a session shown stands: when it ends, or what's left of it. */
function when(t: Shown): { endsAt: number; left: number } {
  if (t.phase === 'running') {
    return { endsAt: t.endsAt, left: 0 }
  }
  return { endsAt: 0, left: t.left }
}

/**
 * The countdown for `t`, running or held, saying `countdown`. Running, the
 * end's alert is handed over too, saying `end`; held, it's taken back.
 */
export async function showSession(t: Shown, countdown: Notice, end: Notice, settings: Settings): Promise<void> {
  const channelId = await readyChannel(settings)
  await SessionNotice.show({
    phase: t.phase,
    ...when(t),
    length: t.length,
    title: countdown.title,
    body: countdown.body,
    endTitle: end.title,
    endBody: end.body,
    channelId,
    sound: SOUND_FILES[settings.sound] ?? '',
    haptics: settings.haptics,
    color: LED_HEX[settings.led],
  })
}

/** The end's alert taken back, the countdown left: the app is in front to tell the end itself. */
export const takeBackEnd = (): Promise<void> => SessionNotice.takeBack()

/** The countdown put away, and any alert left as it is: the session is done, and its end may be ringing. */
export const hideSession = (): Promise<void> => SessionNotice.hide()

/** The countdown put away and the end's alert taken back: the session was stopped. */
export const clearSession = (): Promise<void> => SessionNotice.clear()

/** The moves made on the notification since they were last taken, oldest first. None on the web. */
export async function takeCommands(): Promise<NoticeCommand[]> {
  if (!canNotify()) {
    return []
  }
  try {
    const { commands } = await SessionNotice.takeCommands()
    return parseCommands(commands)
  } catch (err) {
    console.error(err)
    return []
  }
}

/** Calls `taken` whenever a move is made on the notification with the app running. Returns a stop function. */
export function onCommands(taken: () => void): () => void {
  if (!canNotify()) {
    return () => {}
  }
  const listening = SessionNotice.addListener('commands', taken)
  return () => void listening.then((l) => l.remove())
}
