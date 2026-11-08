import { Capacitor } from '@capacitor/core'
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { useCallback, useRef, useState, type ChangeEvent } from 'react'
import type { BackupFile } from '@/core/backup'
import { useSheetEntry } from '@/navigation/sheet'
import { restoreLine } from '@/screens/settings/lib/settingsView'
import { backupNow, checkBackup, restoreBackup, toast } from '@/state'

const SAVE_FAILED = "Couldn't save the backup."
const READ_FAILED = "Couldn't read that file."

/** A share that was closed without choosing an app: the user changed their mind, not a failure. */
const wasCanceled = (err: unknown): boolean =>
  (err instanceof Error && /cancel/i.test(err.message)) || (err instanceof DOMException && err.name === 'AbortError')

/**
 * Hand a file to the user: the native share sheet in the apps (their WebView
 * has neither `navigator.share` nor downloads, so the file goes to the app's
 * cache and is handed over from there), the share sheet on a phone's browser
 * (Files, AirDrop, a chat to oneself), a plain download elsewhere. Called
 * within the tap: a share sheet opens only inside one.
 */
async function hand(file: File): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    const { uri } = await Filesystem.writeFile({
      path: file.name,
      data: await file.text(),
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    })
    await Share.share({ files: [uri], dialogTitle: 'Save backup' })
    return
  }
  if (matchMedia('(pointer: coarse)').matches && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] })
      return
    } catch (err) {
      if (wasCanceled(err)) return
      // Refused for another reason: the download below still works.
    }
  }
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

/** A backup going out, and one coming in to confirm before it replaces anything. */
export function useBackup() {
  const picker = useRef<HTMLInputElement>(null)
  const [incoming, setIncoming] = useState<BackupFile | null>(null)
  const cancel = useCallback(() => setIncoming(null), [])
  useSheetEntry('restore', !!incoming, cancel)

  return {
    picker,
    save: () => {
      hand(backupNow(new Date())).catch((err: unknown) => {
        if (wasCanceled(err)) return
        console.error(err)
        toast(SAVE_FAILED)
      })
    },
    pick: () => picker.current?.click(),
    /** The picker's file: read, checked, and held for the sheet — or refused with a toast. */
    async onPicked(e: ChangeEvent<HTMLInputElement>) {
      const file = e.target.files?.[0]
      e.target.value = '' // the same file can be picked again
      if (!file) return
      let text: string
      try {
        text = await file.text()
      } catch {
        return toast(READ_FAILED)
      }
      const read = checkBackup(text)
      if (read.ok) setIncoming(read.backup)
      else toast(read.error)
    },
    restoring: incoming && { line: restoreLine(incoming) },
    restore: () => {
      if (incoming) void restoreBackup(incoming)
      setIncoming(null)
    },
    cancel,
  }
}
