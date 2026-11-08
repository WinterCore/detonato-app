import { backupJson, backupName, makeBackup, readBackup, type BackupFile, type BackupRead } from '@/core/backup'
import { IDLE } from '@/core/timer'
import { writeTimer } from '@/storage/timer'
import { SAVE_FAILED, toast } from './feedback'
import { replaceSettings } from './settings'
import { get, set } from './store'
import { db, serial } from './writes'

/** Everything a backup holds — settings, tasks, every session — as a file to hand to the user. */
export function backupNow(now: Date): File {
  const { settings, snap } = get()
  return new File([backupJson(makeBackup(settings, snap, now, __APP_VERSION__))], backupName(now), { type: 'application/json' })
}

/** A picked file's text, read as a backup to confirm, or why it can't be restored. */
export function checkBackup(text: string): BackupRead {
  return readBackup(text)
}

/**
 * Replace what this device holds with a backup's: its tasks and sessions in
 * one transaction, then its settings. A session under way is called off —
 * its task may not be in the backup. A format-1 file holds settings only,
 * and leaves the history be.
 */
export function restoreBackup(backup: BackupFile): Promise<boolean> {
  return serial(async () => {
    const { history, settings } = backup.data
    if (history) {
      try {
        await db().replaceAll(history)
      } catch (err) {
        console.error(err)
        toast(SAVE_FAILED)
        return false
      }
      writeTimer(IDLE)
      set('backup/restore', { snap: history, timer: IDLE })
    }
    replaceSettings(settings)
    toast(history ? 'Backup restored' : 'Settings restored')
    return true
  })
}
