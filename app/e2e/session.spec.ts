import { expect, test } from '@playwright/test'
import { MIN, NINE, progress, seed, sessions, stored, task, TODAY, YESTERDAY } from './support'

/*
 * A task's sessions, on a faked clock: run from Today and logged as they
 * end; the rest waiting meanwhile; the day cleared by the last; one that
 * ended with the app closed logged once.
 */

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: NINE })
})

test('a task’s session runs from Today’s hero, is logged when it ends, and the next starts from the done screen', async ({ page }) => {
  await seed(page, { tasks: [task('deep', 'Deep work', { sessions: 3, length: 50 }), task('read', 'Reading')] })
  await expect(progress(page, 0, 4)).toBeVisible()
  await expect(page.getByText('Up next')).toBeVisible()
  await page.getByRole('button', { name: 'Start session 1 of Deep work' }).click()

  await expect(page).toHaveURL(/\/timer$/)
  await expect(page.getByRole('heading', { name: 'Deep work' })).toBeVisible()
  await expect(page.getByRole('img', { name: 'Session 1 of 3' })).toBeVisible()
  await expect(page.getByText('Ends 9:50 AM')).toBeVisible()

  await page.clock.runFor(50 * MIN)
  await expect(page.getByText('Session 1 of 3 done')).toBeVisible()
  await expect(page.getByText('50 minutes logged. 2 sessions left today.')).toBeVisible()
  // The faked clock also runs in real time between steps, so the end is 9:50 give or take a second.
  const [logged, ...more] = (await stored(page)).sessions
  expect(more).toEqual([])
  expect(logged).toMatchObject({ id: `deep@${logged.endedAt}`, taskId: 'deep', day: TODAY, minutes: 50 })
  expect(Math.abs(logged.endedAt - (NINE.getTime() + 50 * MIN))).toBeLessThan(5000)

  await page.getByRole('button', { name: 'Start session 2' }).click()
  await expect(page.getByRole('img', { name: 'Session 2 of 3' })).toBeVisible()
  await expect(page.getByText('Ends 10:40 AM')).toBeVisible()
})

test('while a session is under way, every other one waits, and its card shows the countdown', async ({ page }) => {
  await seed(page, { tasks: [task('deep', 'Deep work', { sessions: 3 }), task('read', 'Reading')] })
  await page.getByRole('button', { name: 'Start Deep work' }).click()
  await page.clock.runFor(MIN)
  await page.getByRole('button', { name: 'Back' }).click()
  await expect(page).toHaveURL(/\/$/)

  const card = page.getByRole('button', { name: 'Deep work, running. Open the timer' })
  await expect(card).toBeVisible()
  await expect(page.getByText('In progress')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Start Reading' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Start a quick session' })).toBeDisabled()

  await card.click()
  await page.getByRole('button', { name: 'Pause' }).click()
  await page.getByRole('button', { name: 'Back' }).click()
  await expect(page.getByRole('button', { name: 'Deep work, paused. Open the timer' })).toBeVisible()
  await expect(page.getByText('Paused', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Start Reading' })).toBeDisabled()

  await page.getByRole('button', { name: 'Open', exact: true }).click()
  await expect(page).toHaveURL(/\/timer$/)
  await page.getByRole('button', { name: 'Stop' }).click()
  await expect(page.getByRole('button', { name: 'Start Reading' })).toBeEnabled()
  await expect(progress(page, 0, 4)).toBeVisible()
  expect((await stored(page)).sessions).toEqual([])
})

test('the last session clears the day, and the task is done for it', async ({ page }) => {
  await seed(page, {
    tasks: [task('deep', 'Deep work', { sessions: 2 })],
    sessions: [...sessions('deep', YESTERDAY, 2), ...sessions('deep', TODAY, 1)],
  })
  await expect(progress(page, 1, 2)).toBeVisible()
  await page.getByRole('button', { name: 'Start Deep work' }).click()
  await expect(page.getByRole('img', { name: 'Session 2 of 2' })).toBeVisible()
  await page.clock.runFor(25 * MIN)

  await expect(page.getByText('All 2 sessions done')).toBeVisible()
  await expect(page.getByText('25 minutes logged. Done for today.')).toBeVisible()
  await expect(page.getByRole('button', { name: /^Start/ })).toHaveCount(0)
  await page.getByRole('button', { name: 'Back to Today' }).click()

  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByText('Day cleared')).toBeVisible()
  await expect(progress(page, 2, 2)).toBeVisible()
  await expect(page.getByText('50 min of focus')).toBeVisible()
  await expect(page.getByRole('button', { name: '2 day streak. Open History' })).toBeVisible()
  await expect(page.getByRole('img', { name: 'Done', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Start Deep work' })).toHaveCount(0)
})

test('a session that ended with the app closed opens done, ended when it was due, and is logged once', async ({ page }) => {
  const endsAt = NINE.getTime() - 10 * MIN
  await seed(page, {
    tasks: [task('deep', 'Deep work', { sessions: 3 })],
    timer: { phase: 'running', length: 25 * MIN, endsAt, taskId: 'deep', day: TODAY },
  })
  await page.goto('/timer')
  await expect(page.getByText('Session 1 of 3 done')).toBeVisible()
  await expect(page.getByText('Ended 8:50 AM')).toBeVisible()

  // Opened again, it's still done, and still the one record.
  await page.reload()
  await expect(page.getByText('Session 1 of 3 done')).toBeVisible()
  expect((await stored(page)).sessions).toEqual([{ id: `deep@${endsAt}`, taskId: 'deep', day: TODAY, endedAt: endsAt, minutes: 25 }])

  await page.getByRole('button', { name: 'Back to Today' }).click()
  await expect(progress(page, 1, 3)).toBeVisible()
})
