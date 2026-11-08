import { expect, test, type Page } from '@playwright/test'
import { NINE, progress, seed, sessions, stored, task, TODAY } from './support'

/*
 * The settings: each one held across a reload, read back field by field
 * when what's stored is broken, still applied when the device won't save
 * them, and carried out and back in by a backup.
 */

const KEY = 'detonato.settings'

/** What `lib/applyDisplay` put on <html>. */
const display = (page: Page) =>
  page.evaluate(() => {
    const html = document.documentElement
    return { led: html.style.getPropertyValue('--led'), ghost: html.style.getPropertyValue('--ghost'), glow: html.classList.contains('glow') }
  })

const group = (page: Page, name: string) => page.getByRole('radiogroup', { name })

test('Settings opens on the defaults', async ({ page }) => {
  await page.goto('/settings')
  await expect(group(page, 'LED colour').getByRole('radio', { name: 'Amber' })).toBeChecked()
  await expect(group(page, 'Unlit segments').getByRole('radio', { name: 'Low' })).toBeChecked()
  await expect(page.getByRole('switch', { name: 'Glow' })).toBeChecked()
  await expect(page.getByRole('img', { name: '25 minutes' })).toBeVisible()
  await expect(group(page, 'Week starts on').getByRole('radio', { name: 'Sat' })).toBeChecked()
  expect(await display(page)).toEqual({ led: '#ffb000', ghost: '8%', glow: true })
})

test('every setting is kept across a reload', async ({ page }) => {
  await page.goto('/settings')
  await group(page, 'LED colour').getByRole('radio', { name: 'Green' }).click()
  await group(page, 'Unlit segments').getByRole('radio', { name: 'High' }).click()
  await page.getByRole('switch', { name: 'Glow' }).click()
  await page.getByRole('button', { name: 'Longer default' }).click()
  await page.getByRole('switch', { name: /^Keep screen on/ }).click()
  await page.getByRole('button', { name: /^Sound/ }).click()
  await page.getByRole('dialog', { name: 'Sound' }).getByRole('radio', { name: 'Beeps' }).click()
  await page.getByRole('button', { name: 'Done' }).click()
  await page.getByRole('switch', { name: /^Haptics/ }).click()
  await group(page, 'Week starts on').getByRole('radio', { name: 'Mon' }).click()
  await page.getByRole('button', { name: /^Style/ }).click()
  await page.getByRole('radio', { name: 'Classic Bold · 1' }).click()
  await page.getByRole('button', { name: 'Back' }).click()
  await expect(page).toHaveURL(/\/settings$/)

  await page.reload()
  await expect(group(page, 'LED colour').getByRole('radio', { name: 'Green' })).toBeChecked()
  await expect(group(page, 'Unlit segments').getByRole('radio', { name: 'High' })).toBeChecked()
  await expect(page.getByRole('switch', { name: 'Glow' })).not.toBeChecked()
  await expect(page.getByRole('img', { name: '30 minutes' })).toBeVisible()
  await expect(page.getByRole('switch', { name: /^Keep screen on/ })).not.toBeChecked()
  await expect(page.getByRole('button', { name: /^Sound/ })).toContainText('Beeps')
  await expect(page.getByRole('switch', { name: /^Haptics/ })).not.toBeChecked()
  await expect(group(page, 'Week starts on').getByRole('radio', { name: 'Mon' })).toBeChecked()
  await expect(page.getByRole('button', { name: /^Style/ })).toContainText('Classic Bold · 1 · 7 segments')
  expect(await display(page)).toEqual({ led: '#4dff8f', ghost: '16%', glow: false })
  expect(await page.evaluate((k) => JSON.parse(localStorage.getItem(k)!), KEY)).toEqual({
    v: 1,
    styleId: 'classic-bold-1',
    led: 'green',
    ghost: 'high',
    glow: false,
    defaultLength: 30,
    keepAwake: false,
    sound: 'beeps',
    haptics: false,
    notify: true,
    weekStart: 1,
  })
})

test('a broken setting takes its default alone, keeping the rest', async ({ page }) => {
  await page.addInitScript((k) => {
    localStorage.setItem(k, JSON.stringify({ v: 1, led: 'cyan', ghost: 'loud', glow: 'yes', styleId: 'gone-9', weekStart: 0 }))
  }, KEY)
  await page.goto('/settings')
  await expect(group(page, 'LED colour').getByRole('radio', { name: 'Cyan' })).toBeChecked()
  await expect(group(page, 'Unlit segments').getByRole('radio', { name: 'Low' })).toBeChecked()
  await expect(page.getByRole('switch', { name: 'Glow' })).toBeChecked()
  await expect(group(page, 'Week starts on').getByRole('radio', { name: 'Sun' })).toBeChecked()
  await expect(page.getByRole('button', { name: /^Style/ })).toContainText('Sports · 1 · 7 segments')
})

test('settings that are not JSON open on the defaults', async ({ page }) => {
  await page.addInitScript((k) => localStorage.setItem(k, '{led: green'), KEY)
  await page.goto('/settings')
  await expect(group(page, 'LED colour').getByRole('radio', { name: 'Amber' })).toBeChecked()
  expect(await display(page)).toEqual({ led: '#ffb000', ghost: '8%', glow: true })
})

test('a change still applies when the device won’t save it, and says so once', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('full', 'QuotaExceededError')
    }
  })
  await page.goto('/settings')
  await group(page, 'LED colour').getByRole('radio', { name: 'Red' }).click()
  await expect(page.getByRole('status')).toContainText("Couldn't save your settings")
  expect((await display(page)).led).toBe('#ff4b33')
  await page.getByRole('status').waitFor({ state: 'detached' })
  await group(page, 'LED colour').getByRole('radio', { name: 'Ice' }).click()
  await expect(group(page, 'LED colour').getByRole('radio', { name: 'Ice' })).toBeChecked()
  await expect(page.getByRole('status')).toHaveCount(0)
})

test('the style picker changes the display everywhere', async ({ page }) => {
  await page.goto('/settings/style')
  await expect(page.getByRole('radio', { name: 'Sports · 1' })).toBeChecked()
  await page.getByRole('radio', { name: 'Classic · 2' }).click()
  await expect(page.getByRole('radio', { name: 'Classic · 2' })).toBeChecked()
  await expect(page.getByRole('radio', { name: 'Sports · 1' })).not.toBeChecked()
  await expect(page.getByText('Classic · 2 · 7 segments')).toBeVisible()
})

test('a backup goes out and comes back in, replacing the settings, tasks and history', async ({ page }) => {
  await page.clock.install({ time: NINE })
  await seed(page, { tasks: [task('deep', 'Deep work', { sessions: 2 })], sessions: sessions('deep', TODAY, 1) })
  await page.goto('/settings')
  await group(page, 'LED colour').getByRole('radio', { name: 'Cyan' }).click()
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export backup' }).click()])
  expect(download.suggestedFilename()).toMatch(/^detonato-backup-\d{4}-\d{2}-\d{2}\.json$/)

  // Afterwards: another colour, and the task deleted.
  await group(page, 'LED colour').getByRole('radio', { name: 'Red' }).click()
  await page.goto('/tasks')
  await page.getByRole('button', { name: 'Edit Deep work' }).click()
  await page.getByRole('dialog', { name: 'Edit task' }).getByRole('button', { name: 'Delete' }).click()
  await page.getByRole('dialog', { name: 'Delete Deep work?' }).getByRole('button', { name: 'Delete' }).click()
  await expect(page.getByRole('button', { name: 'Edit Deep work' })).toHaveCount(0)

  await page.goto('/settings')
  await page.locator('input[type=file]').setInputFiles(await download.path())
  const sheet = page.getByRole('dialog', { name: 'Restore this backup?' })
  await expect(sheet).toContainText('Your tasks, history and settings will be replaced with the ones saved on')
  await sheet.getByRole('button', { name: 'Restore' }).click()
  await expect(sheet).toHaveCount(0)
  await expect(page.getByRole('status')).toHaveText('Backup restored')
  await expect(group(page, 'LED colour').getByRole('radio', { name: 'Cyan' })).toBeChecked()
  expect((await display(page)).led).toBe('#3fd9ff')

  await page.getByRole('button', { name: 'Back', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Start Deep work' })).toBeVisible()
  await expect(progress(page, 1, 2)).toBeVisible()
})

test('a backup from before tasks restores the settings and leaves the history be', async ({ page }) => {
  await seed(page, { tasks: [task('deep', 'Deep work')] })
  await page.goto('/settings')
  const v1 = { app: 'detonato', format: 1, exportedAt: '2026-11-01T10:00:00.000Z', appVersion: '0.1.0', data: { settings: { led: 'green' } } }
  await page.locator('input[type=file]').setInputFiles({ name: 'old.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(v1)) })
  const sheet = page.getByRole('dialog', { name: 'Restore this backup?' })
  await expect(sheet).toContainText('Your settings will be replaced with the ones saved on Nov 1, 2026.')
  await sheet.getByRole('button', { name: 'Restore' }).click()
  await expect(page.getByRole('status')).toHaveText('Settings restored')
  await expect(group(page, 'LED colour').getByRole('radio', { name: 'Green' })).toBeChecked()
  expect((await stored(page)).tasks.map((t) => t.name)).toEqual(['Deep work'])
})

test('a restore can be called off', async ({ page }) => {
  await page.goto('/settings')
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export backup' }).click()])
  await group(page, 'LED colour').getByRole('radio', { name: 'Green' }).click()
  await page.locator('input[type=file]').setInputFiles(await download.path())
  await page.getByRole('dialog', { name: 'Restore this backup?' }).getByRole('button', { name: 'Cancel' }).click()
  await expect(group(page, 'LED colour').getByRole('radio', { name: 'Green' })).toBeChecked()
})

test('a file that is not a backup is refused', async ({ page }) => {
  await page.goto('/settings')
  await page.locator('input[type=file]').setInputFiles({ name: 'notes.json', mimeType: 'application/json', buffer: Buffer.from('{"hello":1}') })
  await expect(page.getByRole('status')).toHaveText("That file isn't a Detonato backup.")
  await expect(page.getByRole('dialog')).toHaveCount(0)
})
