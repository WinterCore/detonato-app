import { expect, test } from '@playwright/test'
import { MIN, progress, seed, stored, task, TODAY } from './support'

/*
 * Days turn at local midnight: Today moves on with the app open, and a
 * session begun before midnight counts for the day it began.
 */

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date(2026, 10, 5, 23, 50) })
})

test('Today turns to the new day', async ({ page }) => {
  // Reading is on Thursdays only; the 6th is a Friday.
  await seed(page, { tasks: [task('deep', 'Deep work'), task('read', 'Reading', { days: [4] })] })
  await expect(page.getByRole('heading', { name: '5 November' })).toBeVisible()
  await expect(page.getByText('Thursday', { exact: true })).toBeVisible()
  await expect(progress(page, 0, 2)).toBeVisible()

  await page.clock.runFor(11 * MIN)
  await expect(page.getByRole('heading', { name: '6 November' })).toBeVisible()
  await expect(page.getByText('Friday', { exact: true })).toBeVisible()
  await expect(progress(page, 0, 1)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Not today · 1' })).toBeVisible()
})

test('a session begun before midnight counts for the day it began', async ({ page }) => {
  await seed(page, { tasks: [task('deep', 'Deep work')] })
  await page.getByRole('button', { name: 'Start Deep work' }).click()
  await page.clock.runFor(25 * MIN)
  await expect(page.getByText('Deep work done')).toBeVisible()
  await page.getByRole('button', { name: 'Back to Today' }).click()

  await expect(page.getByRole('heading', { name: '6 November' })).toBeVisible()
  await expect(progress(page, 0, 1)).toBeVisible()
  expect((await stored(page)).sessions.map((s) => s.day)).toEqual([TODAY])
})
