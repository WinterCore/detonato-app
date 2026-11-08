import { expect, test } from '@playwright/test'
import { clock, MIN, NINE, stored } from './support'

/*
 * The session timer, on a faked clock, run as a quick session: it counts
 * down, holds, starts over and ends on time; it outlives a reload; and a
 * quick session logs nothing.
 */

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: NINE })
})

test('with no session under way, the timer goes back to Today', async ({ page }) => {
  await page.goto('/timer')
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('heading', { name: '5 November' })).toBeVisible()
})

test('a quick session counts down, holds while paused, ends on time, and logs nothing', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start a quick session' }).click()
  await expect(page).toHaveURL(/\/timer$/)
  await expect(page.getByRole('heading', { name: 'Quick session' })).toBeVisible()
  await expect(page.getByText('Ends 9:25 AM')).toBeVisible()
  await expect(page.getByText('Awake')).toBeVisible()

  await page.clock.runFor(61_000)
  await expect(clock(page, '23:59')).toBeVisible()

  await page.getByRole('button', { name: 'Pause' }).click()
  await page.clock.runFor(10 * MIN)
  await expect(clock(page, '23:59')).toBeVisible()
  await expect(page.getByText('Awake')).toHaveCount(0)

  await page.getByRole('button', { name: 'Resume' }).click()
  await expect(page.getByText('Ends 9:35 AM')).toBeVisible()
  await page.clock.runFor(23 * MIN + 58_000)
  await expect(clock(page, '00:01')).toBeVisible()
  await page.clock.runFor(1000)
  await expect(page.getByText('Session done')).toBeVisible()
  await expect(page.getByText('25 minutes of focus. Not logged.')).toBeVisible()
  await expect(page.getByText('Ended 9:35 AM')).toBeVisible()

  await page.getByRole('button', { name: 'Back to Today' }).click()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('button', { name: 'Start a quick session' })).toBeEnabled()
  expect((await stored(page)).sessions).toEqual([])
})

test('another quick session starts from the done screen', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start a quick session' }).click()
  await page.clock.runFor(25 * MIN)
  await page.getByRole('button', { name: 'Start another' }).click()
  await expect(page.getByText('Ends 9:50 AM')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible()
})

test('reset starts the session over, held; stop calls it off', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start a quick session' }).click()
  await page.clock.runFor(5 * MIN)
  await expect(clock(page, '20:00')).toBeVisible()

  await page.getByRole('button', { name: 'Reset' }).click()
  await expect(clock(page, '25:00')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible()

  await page.getByRole('button', { name: 'Stop' }).click()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('button', { name: 'Start a quick session' })).toBeEnabled()
  expect(await page.evaluate(() => localStorage.getItem('detonato.timer'))).toBeNull()
})

test('a running session outlives a reload', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start a quick session' }).click()
  await page.clock.runFor(5 * MIN)
  await page.reload()
  // The faked clock still runs in real time between steps, so the reload itself can take a second.
  await expect(clock(page, /^(20:00|19:59) left$/)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible()
})

test('Today shows a quick session under way, and opens the timer on it', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start a quick session' }).click()
  await page.getByRole('button', { name: 'Back' }).click()
  await expect(page).toHaveURL(/\/$/)
  await page.getByRole('button', { name: 'Quick session, running. Open the timer' }).click()
  await expect(page).toHaveURL(/\/timer$/)
})

test('a quick session is as long as Settings’ default', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByRole('button', { name: 'Longer default' }).click()
  await page.getByRole('button', { name: 'Back', exact: true }).click()
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByText('30 min · not logged')).toBeVisible()
  await page.getByRole('button', { name: 'Start a quick session' }).click()
  await expect(page.getByText('Ends 9:30 AM')).toBeVisible()
})
