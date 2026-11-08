import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { AndroidSettings, IOSSettings, NativeSettings } from 'capacitor-native-settings'
import { LED_HEX, type Settings } from '@/core/settings'
import type { EndNotice } from '@/core/notice'
import { END_CHANNEL_PREFIX, endChannel, SOUND_FILES } from '@/core/sounds'

/*
 * The notification a session's end sends, handed to the phone when the
 * session starts so it arrives with the app closed or the phone locked. The
 * apps only: a web page can't wake itself.
 */

/** There's one session at a time, so one notification, always this id. */
const END_ID = 1

/** Whether this device can notify: the native app. */
export const canNotify = (): boolean => Capacitor.isNativePlatform()

let loading: Promise<unknown> | undefined

/** The plugin loaded once, for every call to wait on. */
const loaded = (): Promise<unknown> => (loading ??= LocalNotifications.getPending().catch(() => undefined))

/**
 * Permission to notify: true if the phone allows it, asking first. A phone
 * that has refused for good answers at once, with no dialog; only its
 * settings can turn it back on.
 */
export async function askToNotify(): Promise<boolean> {
  if (!canNotify()) return false
  try {
    await loaded()
    if ((await LocalNotifications.checkPermissions()).display === 'granted') return true
    return (await LocalNotifications.requestPermissions()).display === 'granted'
  } catch (err) {
    console.error(err)
    return false
  }
}

/** The phone refuses Detonato's notifications, so none can arrive until it's allowed there. */
export async function notificationsBlocked(): Promise<boolean> {
  if (!canNotify()) return false
  try {
    await loaded()
    return (await LocalNotifications.checkPermissions()).display === 'denied'
  } catch {
    return false
  }
}

/** The phone's notification settings for Detonato. */
export async function openNotificationSettings(): Promise<void> {
  try {
    await NativeSettings.open({ optionAndroid: AndroidSettings.AppNotification, optionIOS: IOSSettings.AppNotification })
  } catch (err) {
    console.error(err)
  }
}

/**
 * Android's channel for the chosen sound and buzz, made if it isn't there,
 * and the session-end channels for other choices removed: the phone's
 * settings list only the one in use.
 */
async function readyChannel(settings: Settings): Promise<string> {
  const channel = endChannel(settings.sound, settings.haptics)
  if (Capacitor.getPlatform() !== 'android') return channel.id
  const { channels } = await LocalNotifications.listChannels()
  for (const c of channels) {
    if (c.id.startsWith(END_CHANNEL_PREFIX) && c.id !== channel.id) await LocalNotifications.deleteChannel({ id: c.id })
  }
  if (!channels.some((c) => c.id === channel.id)) await LocalNotifications.createChannel(channel)
  return channel.id
}

/** The end's notification at `at`, in the chosen sound. Replaces any end already handed over. */
export async function scheduleEnd(at: number, notice: EndNotice, settings: Settings): Promise<void> {
  await loaded()
  const channelId = await readyChannel(settings)
  await LocalNotifications.schedule({
    notifications: [
      {
        id: END_ID,
        title: notice.title,
        body: notice.body,
        schedule: { at: new Date(at), allowWhileIdle: true },
        channelId,
        // iOS plays a file from the web assets (public/); Android plays its channel's.
        sound: SOUND_FILES[settings.sound] ?? undefined,
        smallIcon: 'ic_stat_detonato',
        iconColor: LED_HEX[settings.led],
      },
    ],
  })
}

/** The end handed over is taken back: the session was paused, reset or stopped — or the app is there to tell it. */
export async function cancelEnd(): Promise<void> {
  await loaded()
  await LocalNotifications.cancel({ notifications: [{ id: END_ID }] })
}

/** Calls `open` when the end's notification is tapped. Returns a stop function. */
export function onEndTapped(open: () => void): () => void {
  if (!canNotify()) return () => {}
  const listening = LocalNotifications.addListener('localNotificationActionPerformed', (e) => {
    if (e.notification.id === END_ID) open()
  })
  return () => void listening.then((l) => l.remove())
}
