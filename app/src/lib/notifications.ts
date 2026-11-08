import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { AndroidSettings, IOSSettings, NativeSettings } from 'capacitor-native-settings'
import type { Settings } from '@/core/settings'
import { END_CHANNEL_PREFIX, endChannel } from '@/core/sounds'

/*
 * The phone's side of notifying: permission, Android's channel for the end's
 * sound, and taps that open the timer. The apps only: a web page can't wake
 * itself. What a session shows while it's under way, and its end's alert,
 * are `lib/sessionNotice`'s.
 */

/** There's one session at a time, so one end alert, always this id. */
const END_ID = 1
/** Where a tap on the countdown, or the Live Activity, opens the app. */
const TIMER_URL = 'detonato://timer'

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
export async function readyChannel(settings: Settings): Promise<string> {
  const channel = endChannel(settings.sound, settings.haptics)
  if (Capacitor.getPlatform() !== 'android') {
    return channel.id
  }
  await loaded()
  const { channels } = await LocalNotifications.listChannels()
  for (const c of channels) {
    if (c.id.startsWith(END_CHANNEL_PREFIX) && c.id !== channel.id) {
      await LocalNotifications.deleteChannel({ id: c.id })
    }
  }
  if (!channels.some((c) => c.id === channel.id)) {
    await LocalNotifications.createChannel(channel)
  }
  return channel.id
}

/** The URL the app was started with is looked at once a run: it stays the same however often the listener is made again. */
let launchSeen = false

/**
 * Calls `open` when a session's notification is tapped: the end's alert, the
 * countdown, or the Live Activity — also when the tap is what started the
 * app. Returns a stop function.
 */
export function onNoticeTapped(open: () => void): () => void {
  if (!canNotify()) {
    return () => {}
  }
  const openIfTimer = (url: string | undefined) => {
    if (url?.startsWith(TIMER_URL)) {
      open()
    }
  }
  if (!launchSeen) {
    launchSeen = true
    void App.getLaunchUrl().then((launch) => openIfTimer(launch?.url))
  }
  const listening = [
    LocalNotifications.addListener('localNotificationActionPerformed', (e) => {
      if (e.notification.id === END_ID) {
        open()
      }
    }),
    App.addListener('appUrlOpen', (e) => openIfTimer(e.url)),
  ]
  return () => {
    for (const l of listening) {
      void l.then((handle) => handle.remove())
    }
  }
}
