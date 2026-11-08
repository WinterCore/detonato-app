import { describe, expect, it } from 'vitest'
import { backupJson, backupName, BACKUP_FORMAT, makeBackup, NEWER_BACKUP, NOT_A_BACKUP, readBackup } from './backup'
import { DEFAULT_SETTINGS } from './settings'
import { deleteTask, editTask } from './tasks'
import { EVERY, plan, sessions, snap, task } from './testkit'

const NOW = new Date(2026, 10, 5, 9, 30)
const SETTINGS = { ...DEFAULT_SETTINGS, led: 'cyan' as const, styleId: 'classic-bold-1' }
const HISTORY = snap([task('deep', plan('2026-11-01', 3, [1, 2, 3], 50))], sessions('deep', '2026-11-04', 2))
const file = () => makeBackup(SETTINGS, HISTORY, NOW, '0.1.0')

describe('makeBackup / readBackup', () => {
  it('reads back what it makes', () => {
    expect(readBackup(backupJson(file()))).toEqual({ ok: true, backup: file() })
  })

  it('stamps the app, the format, the time and the version', () => {
    expect(file()).toMatchObject({ app: 'detonato', format: BACKUP_FORMAT, exportedAt: NOW.toISOString(), appVersion: '0.1.0' })
  })

  it('carries every plan and a deletion through, so the past reads the same after a restore', () => {
    const edited = editTask(task('deep', plan('2026-10-26', 1, EVERY, 1)), { name: 'deep', days: [1, 3], sessions: 2, length: 50 }, '2026-11-02')
    const history = snap([deleteTask(edited, '2026-11-05')], [...sessions('deep', '2026-10-30'), ...sessions('deep', '2026-11-04', 2)])
    const read = readBackup(backupJson(makeBackup(SETTINGS, history, NOW, '0.1.0')))
    expect(read.ok && read.backup.data.history).toEqual(history)
  })

  it('writes the tasks and sessions beside the settings', () => {
    expect(Object.keys(JSON.parse(backupJson(file())).data)).toEqual(['settings', 'tasks', 'sessions'])
  })

  it('reads a format-1 file: settings only, the history left alone', () => {
    const v1 = { app: 'detonato', format: 1, exportedAt: NOW.toISOString(), appVersion: '0.1.0', data: { settings: SETTINGS } }
    const read = readBackup(JSON.stringify(v1))
    expect(read.ok && read.backup.data).toEqual({ settings: SETTINGS, history: null })
  })

  it('refuses a file that is not JSON, or another app’s', () => {
    expect(readBackup('not json')).toEqual({ ok: false, error: NOT_A_BACKUP })
    expect(readBackup(backupJson({ ...file(), app: 'another-app' as 'detonato' }))).toEqual({ ok: false, error: NOT_A_BACKUP })
  })

  it('refuses a format-2 file missing its history', () => {
    const json = JSON.parse(backupJson(file()))
    delete json.data.sessions
    expect(readBackup(JSON.stringify(json))).toEqual({ ok: false, error: NOT_A_BACKUP })
  })

  it('refuses a task that doesn’t fit the schema', () => {
    const json = JSON.parse(backupJson(file()))
    json.data.tasks[0].plans[0].sessions = 20
    expect(readBackup(JSON.stringify(json))).toEqual({ ok: false, error: NOT_A_BACKUP })
  })

  it('refuses a file from a newer format, even one this reader can’t parse', () => {
    expect(readBackup(JSON.stringify({ app: 'detonato', format: BACKUP_FORMAT + 1, whatever: true }))).toEqual({ ok: false, error: NEWER_BACKUP })
  })

  it('fixes a bad setting alone instead of refusing the file', () => {
    const json = JSON.parse(backupJson(file()))
    json.data.settings.ghost = 'loud'
    const read = readBackup(JSON.stringify(json))
    expect(read.ok && read.backup.data.settings).toEqual({ ...SETTINGS, ghost: DEFAULT_SETTINGS.ghost })
  })
})

describe('backupName', () => {
  it('names the file by the local day', () => {
    expect(backupName(NOW)).toBe('detonato-backup-2026-11-05.json')
  })
})
