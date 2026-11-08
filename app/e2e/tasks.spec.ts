import { expect, test } from '@playwright/test'
import { NINE, progress, seed, sessions, stored, task, TODAY, YESTERDAY } from './support'

/*
 * Tasks, made and changed: the first one from an empty Today, the editor's
 * checks, a task's own length, edits that leave the days before alone,
 * deleting, and the back button closing a sheet before the screen.
 */

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: NINE })
})

const editor = (page: import('@playwright/test').Page, title = 'New task') => page.getByRole('dialog', { name: title })

test('a first run offers the first task, and Today lists it once saved', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('No tasks yet')).toBeVisible()
  await page.getByRole('button', { name: 'Add a task' }).click()
  await expect(page).toHaveURL(/\/tasks#task$/)

  const sheet = editor(page)
  await expect(sheet.getByRole('textbox', { name: 'Name' })).toBeFocused()
  await expect(sheet.getByRole('button', { name: 'Save' })).toBeDisabled()
  await page.keyboard.type('Deep work')
  await sheet.getByRole('button', { name: 'More sessions' }).click()
  await sheet.getByRole('button', { name: 'More sessions' }).click()
  await expect(sheet.getByRole('img', { name: '3 sessions' })).toBeVisible()
  await sheet.getByRole('button', { name: 'Save' }).click()
  await expect(sheet).toHaveCount(0)
  await expect(page).toHaveURL(/\/tasks$/)
  await expect(page.getByRole('button', { name: 'Edit Deep work' })).toContainText('3 × 25 min · default')

  await page.getByRole('button', { name: 'Back' }).click()
  await expect(page).toHaveURL(/\/$/)
  await expect(progress(page, 0, 3)).toBeVisible()
  await expect(page.getByText('Up next')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Start session 1' })).toBeEnabled()
  await expect(page.getByRole('button', { name: 'Start Deep work' })).toBeEnabled()
})

test('the editor won’t save a task without a name or a day', async ({ page }) => {
  await page.goto('/tasks')
  await page.getByRole('button', { name: 'New task' }).click()
  const sheet = editor(page)
  const save = sheet.getByRole('button', { name: 'Save' })

  await sheet.getByRole('textbox', { name: 'Name' }).fill('   ')
  await expect(save).toBeDisabled()
  await sheet.getByRole('textbox', { name: 'Name' }).fill('Reading')
  await expect(save).toBeEnabled()

  await sheet.getByRole('radio', { name: 'Pick days' }).click()
  const days = sheet.getByRole('group', { name: 'Days' }).getByRole('button')
  await expect(days).toHaveCount(7)
  for (const day of await days.all()) await day.click()
  await expect(save).toBeDisabled()
  await sheet.getByRole('button', { name: 'Thursday' }).click()
  await sheet.getByRole('button', { name: 'Monday' }).click()
  await expect(save).toBeEnabled()
  await save.click()

  const row = page.getByRole('button', { name: 'Edit Reading' })
  await expect(row).toContainText('1 × 25 min · default')
  await page.getByRole('button', { name: 'Back' }).click()
  await expect(page.getByRole('button', { name: 'Start Reading' })).toBeVisible()
})

test('a task can have its own length, apart from the default', async ({ page }) => {
  await page.goto('/tasks')
  await page.getByRole('button', { name: 'New task' }).click()
  const sheet = editor(page)
  await sheet.getByRole('textbox', { name: 'Name' }).fill('Deep work')
  await expect(sheet.getByText('Uses the default, 25 min')).toBeVisible()
  await sheet.getByRole('switch', { name: /^Custom length/ }).click()
  await sheet.getByRole('button', { name: 'Longer' }).click()
  await expect(sheet.getByRole('img', { name: '30 minutes' })).toBeVisible()
  await sheet.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByRole('button', { name: 'Edit Deep work' })).toContainText('1 × 30 min')
  await expect(page.getByRole('button', { name: 'Edit Deep work' })).not.toContainText('default')

  await page.getByRole('button', { name: 'Back' }).click()
  await page.getByRole('button', { name: 'Start Deep work' }).click()
  await expect(page.getByText('Ends 9:30 AM')).toBeVisible()
})

test('a task on other days rests today, under Not today', async ({ page }) => {
  // Mondays and Wednesdays; the 5th is a Thursday.
  await seed(page, { tasks: [task('read', 'Reading', { days: [1, 3] })] })
  await expect(page.getByText('Rest day')).toBeVisible()
  await expect(page.getByText('Nothing scheduled today')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Start Reading' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Not today · 1' }).click()
  await expect(page.getByText('Reading')).toBeVisible()
})

test('an edit applies from today on, and the days before keep their plan', async ({ page }) => {
  // One session a day; yesterday's and today's are done, so the streak is two.
  await seed(page, { tasks: [task('deep', 'Deep work')], sessions: [...sessions('deep', YESTERDAY, 1), ...sessions('deep', TODAY, 1)] })
  await expect(page.getByText('Day cleared')).toBeVisible()
  await expect(page.getByRole('button', { name: '2 day streak. Open History' })).toBeVisible()

  await page.getByRole('button', { name: 'All tasks' }).click()
  await page.getByRole('button', { name: 'Edit Deep work' }).click()
  const sheet = editor(page, 'Edit task')
  await expect(sheet.getByRole('textbox', { name: 'Name' })).toHaveValue('Deep work')
  await sheet.getByRole('button', { name: 'More sessions' }).click()
  await sheet.getByRole('button', { name: 'Save' }).click()
  await page.getByRole('button', { name: 'Back' }).click()
  await expect(progress(page, 1, 2)).toBeVisible()

  await page.getByRole('button', { name: 'Start Deep work' }).click()
  await page.clock.runFor(25 * 60_000)
  await page.getByRole('button', { name: 'Back to Today' }).click()
  // Yesterday still asked for one session, so it's still full and the streak carries on.
  await expect(page.getByText('Day cleared')).toBeVisible()
  await expect(page.getByRole('button', { name: '2 day streak. Open History' })).toBeVisible()
})

test('a deleted task leaves the schedule from today, and its sessions stay', async ({ page }) => {
  await seed(page, {
    tasks: [task('deep', 'Deep work'), task('read', 'Reading')],
    sessions: sessions('read', YESTERDAY, 1),
  })
  await page.goto('/tasks')
  await page.getByRole('button', { name: 'Edit Reading' }).click()
  await editor(page, 'Edit task').getByRole('button', { name: 'Delete' }).click()
  const confirm = page.getByRole('dialog', { name: 'Delete Reading?' })
  await expect(confirm).toContainText('Days already past keep its sessions.')
  await confirm.getByRole('button', { name: 'Delete' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page).toHaveURL(/\/tasks$/)
  await expect(page.getByRole('button', { name: 'Edit Reading' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Edit Deep work' })).toBeVisible()

  await page.getByRole('button', { name: 'Back' }).click()
  await expect(page.getByRole('button', { name: 'Start Reading' })).toHaveCount(0)
  await expect(progress(page, 0, 1)).toBeVisible()
  const db = await stored(page)
  expect(db.tasks.find((t) => t.id === 'read')?.deletedOn).toBe(TODAY)
  expect(db.sessions).toHaveLength(1)
})

test('a delete can be called off', async ({ page }) => {
  await seed(page, { tasks: [task('read', 'Reading')] })
  await page.goto('/tasks')
  await page.getByRole('button', { name: 'Edit Reading' }).click()
  await editor(page, 'Edit task').getByRole('button', { name: 'Delete' }).click()
  await page.getByRole('dialog', { name: 'Delete Reading?' }).getByRole('button', { name: 'Cancel' }).click()
  await expect(page.getByRole('dialog', { name: 'Delete Reading?' })).toHaveCount(0)
  await expect(editor(page, 'Edit task')).toBeVisible()
})

test('back closes the sheet on top, one at a time, and stays on the screen', async ({ page }) => {
  await seed(page, { tasks: [task('read', 'Reading')] })
  await page.getByRole('button', { name: 'All tasks' }).click()
  await page.getByRole('button', { name: 'Edit Reading' }).click()
  await editor(page, 'Edit task').getByRole('button', { name: 'Delete' }).click()
  await expect(page.getByRole('dialog', { name: 'Delete Reading?' })).toBeVisible()

  await page.goBack()
  await expect(page.getByRole('dialog', { name: 'Delete Reading?' })).toHaveCount(0)
  await expect(editor(page, 'Edit task')).toBeVisible()
  await page.goBack()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page).toHaveURL(/\/tasks$/)
  await page.goBack()
  await expect(page).toHaveURL(/\/$/)
})

test('Escape closes the editor', async ({ page }) => {
  await page.goto('/tasks')
  await page.getByRole('button', { name: 'New task' }).click()
  await expect(editor(page)).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(editor(page)).toHaveCount(0)
  await expect(page).toHaveURL(/\/tasks$/)
})
