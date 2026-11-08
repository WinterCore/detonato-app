import { expect, test } from '@playwright/test'
import { EVERY_DAY, NINE, seed, sessions, task } from './support'

/*
 * History: opened from Today's streak or its icon; the record, each past day
 * judged by the plan it had then; a day's sheet; back closing the sheet
 * before the screen.
 */

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: NINE })
})

test('History shows the record by each day’s own plan, and opens a day', async ({ page }) => {
  // One session a day from Thu 29 Oct, two from Tue 3 Nov. Done: 29 Oct–1 Nov, a miss on 2 Nov,
  // both on 3 Nov, one of two on 4 Nov. Today, Thu 5 Nov, nothing yet.
  const reading = {
    ...task('read', 'Reading'),
    plans: [
      { from: '2026-10-29', days: EVERY_DAY, sessions: 1, length: null },
      { from: '2026-11-03', days: EVERY_DAY, sessions: 2, length: null },
    ],
  }
  await seed(page, {
    tasks: [reading],
    sessions: [...['2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01'].flatMap((d) => sessions('read', d, 1)), ...sessions('read', '2026-11-03', 2), ...sessions('read', '2026-11-04', 1)],
  })

  await page.getByRole('button', { name: '0 day streak. Open History' }).click()
  await expect(page).toHaveURL(/\/history$/)
  await page.goBack()
  await page.getByRole('button', { name: 'History', exact: true }).click()
  await expect(page).toHaveURL(/\/history$/)

  // The four days before the edit are a best of four; 3 Nov is full under the new plan, 4 Nov short.
  await expect(page.getByRole('img', { name: '0 day streak' })).toBeVisible()
  await expect(page.getByRole('img', { name: 'Best streak: 4 days' })).toBeVisible()
  await expect(page.getByText('5 more days to beat your best.')).toBeVisible()
  await expect(page.getByRole('img', { name: '5 perfect days in 12 months' })).toBeVisible()
  // Seven sessions of 25 minutes: 2 h 55 min, which is two whole hours.
  await expect(page.getByRole('img', { name: '2 hours of focus in 12 months' })).toBeVisible()
  // 29 Oct–2 Nov asked for 5 and got 4; 3–4 Nov asked for 4 and got 3: 7 of 9.
  await expect(page.getByRole('region', { name: 'Last 30 days by task' })).toContainText('77%')

  await expect(page.getByRole('button', { name: 'Sunday 1 November: 1 of 1 sessions' })).toBeVisible()
  await page.getByRole('button', { name: 'Wednesday 4 November: 1 of 2 sessions' }).click()
  const sheet = page.getByRole('dialog', { name: '4 November' })
  await expect(sheet).toContainText('Reading')
  await expect(sheet).toContainText('1/2 · 25 min')
  await expect(sheet.getByRole('img', { name: '1 of 2 sessions done' })).toBeVisible()

  await page.goBack()
  await expect(sheet).toHaveCount(0)
  await expect(page).toHaveURL(/\/history$/)
  await page.goBack()
  await expect(page).toHaveURL(/\/$/)
})
