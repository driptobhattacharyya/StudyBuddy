import { test, expect } from '@playwright/test'

/** Fail a test on any uncaught page error or console error (React warnings included). */
function guard(page) {
  const problems = []
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error') problems.push(`console.error: ${m.text()}`)
  })
  return problems
}

async function loginFromLanding(page, role) {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.getByRole('button', { name: `Try as ${role}` }).first().click()
}

/** Keep lecture tests hermetic: serve a blank page instead of the real YouTube embed and thumbnails. */
async function stubYouTube(page) {
  await page.route(/youtube(-nocookie)?\.com|ytimg\.com/, (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>video</title>' }),
  )
}

test.describe('student', () => {
  test('landing -> dashboard -> notes -> summarise', async ({ page }) => {
    const problems = guard(page)
    await loginFromLanding(page, 'student')
    await expect(page).toHaveURL(/\/app$/)
    await expect(page.getByRole('heading', { name: /Welcome back/ })).toBeVisible()
    await expect(page.getByText('Upcoming deadlines')).toBeVisible()
    await expect(page.getByText('AI: mock responses')).toBeVisible()

    await page.getByRole('link', { name: 'Notes' }).first().click()
    await expect(page).toHaveURL(/\/courses\/PY101\/notes/)
    await page.getByRole('button', { name: 'Summarise' }).click()
    const dialog = page.getByRole('dialog', { name: 'AI summary' })
    await expect(dialog.getByText('Key points')).toBeVisible()
    await dialog.getByRole('button', { name: /Under the hood/ }).click()
    await expect(page.getByText('Prompt sent to the model')).toBeVisible()
    expect(problems).toEqual([])
  })

  test('lectures: week tabs, watch, next, then jump to the week questions', async ({ page }) => {
    const problems = guard(page)
    await stubYouTube(page)
    await loginFromLanding(page, 'student')
    await page.getByRole('link', { name: 'Lectures' }).first().click()
    await expect(page).toHaveURL(/\/courses\/PY101\/lectures/)
    await expect(page.locator('iframe[title="Functions and variables"]')).toBeVisible()
    await page.getByRole('button', { name: 'Mark as watched' }).click()
    await expect(page.getByRole('button', { name: 'Watched' })).toBeVisible()
    await expect(page.getByText(/1 of 3 lectures watched/)).toBeVisible()
    await page.getByRole('button', { name: /Done, on to week 4/ }).click()
    await expect(page.getByRole('heading', { name: 'Exceptions' })).toBeVisible()
    await expect(page.getByRole('tab', { name: /Week 4/ })).toHaveAttribute('data-state', 'active')
    await page.getByRole('link', { name: /Try the questions/ }).click()
    await expect(page).toHaveURL(/\/assignments\?week=4/)
    await expect(page.getByLabel('Filter by week')).toHaveValue('4')
    expect(problems).toEqual([])
  })

  test('assignments: answer and submit', async ({ page }) => {
    const problems = guard(page)
    await loginFromLanding(page, 'student')
    await page.goto('/app/courses/PY101/assignments')
    const radio = page.locator('input[type=radio]:not([disabled])').first()
    await radio.check()
    await page.locator('button:not([disabled])', { hasText: 'Submit answers' }).first().click()
    await page.getByRole('dialog').getByRole('button', { name: 'Submit', exact: true }).click()
    await expect(page.getByText(/^(Correct|Incorrect|Partial)/).first()).toBeVisible()
    await page.getByRole('button', { name: 'Hint' }).first().click()
    await expect(page.getByText('Hint', { exact: true }).first()).toBeVisible()
    expect(problems).toEqual([])
  })

  test('code editor: Run (public only) then Submit (hidden tests, graded)', async ({ page }) => {
    const problems = guard(page)
    await loginFromLanding(page, 'student')
    await page.goto('/app/courses/PY101/code')
    await page.getByRole('link', { name: /FizzBuzz/ }).first().click()
    await expect(page).toHaveURL(/\/code\/[0-9a-f]{24}$/)
    const id = page.url().split('/').pop()
    // Monaco (bundled locally) must render, not the textarea fallback.
    await expect(page.locator('.monaco-editor').first()).toBeVisible({ timeout: 20_000 })
    await expect(page.locator('textarea[aria-label="Code editor"]')).toHaveCount(0)

    const solution = 'n = int(input())\nfor i in range(1, n + 1):\n    print("FizzBuzz" if i % 15 == 0 else "Fizz" if i % 3 == 0 else "Buzz" if i % 5 == 0 else i)\n'
    await page.evaluate(([key, code]) => localStorage.setItem(key, JSON.stringify({ python: code })), [`sb:code:${id}`, solution])
    await page.reload()
    await expect(page.locator('.monaco-editor').first()).toBeVisible({ timeout: 20_000 })

    await page.getByRole('button', { name: 'Run', exact: true }).click()
    await expect(page.getByText('1/1 passed')).toBeVisible()
    await expect(page.getByText('Hidden tests')).toHaveCount(0)

    await page.getByRole('button', { name: 'Submit', exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Submit', exact: true }).click()
    await expect(page.getByText('100%', { exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Hidden tests' })).toBeVisible()
    expect(problems).toEqual([])
  })

  test('flashcards: create a card and study it', async ({ page }) => {
    const problems = guard(page)
    await loginFromLanding(page, 'student')
    await page.goto('/app/courses/PY101/flashcards')
    await page.getByRole('button', { name: 'New card' }).click()
    await page.getByLabel(/Front/).fill('What is a list comprehension?')
    await page.getByLabel(/Back/).fill('A compact way to build a list from an iterable.')
    await page.getByRole('button', { name: 'Create card' }).click()
    await expect(page.getByText('What is a list comprehension?')).toBeVisible()
    await page.getByRole('button', { name: /^Study/ }).click()
    await expect(page.getByRole('progressbar', { name: 'Study progress' })).toBeVisible()
    expect(problems).toEqual([])
  })

  test('flashcards: generate a deck from a topic with AI, deselect one and save', async ({ page }) => {
    const problems = guard(page)
    await loginFromLanding(page, 'student')
    await page.goto('/app/courses/PY101/flashcards')
    await page.getByRole('button', { name: 'Generate with AI' }).first().click()
    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Topic').fill('lists and dictionaries')
    await dialog.getByLabel('Number of cards').selectOption('6')
    await dialog.getByRole('button', { name: 'Generate' }).click()
    const boxes = dialog.getByRole('checkbox')
    await expect(boxes.first()).toBeVisible({ timeout: 20_000 })
    expect(await boxes.count()).toBeGreaterThanOrEqual(4)
    const fronts = (await dialog.locator('[data-face=front]').allTextContents()).map((t) => t.replace('Click to flip', '').trim())
    expect(new Set(fronts).size).toBe(fronts.length)
    await expect(dialog.getByRole('button', { name: /Under the hood/ })).toBeVisible()
    const first = dialog.getByRole('button', { name: /^Show (answer|question)/ }).first()
    await first.click()
    await expect(dialog.getByRole('button', { name: /^Show question/ })).toHaveCount(1)
    await expect(dialog.locator('[data-face=back]:visible')).toHaveCount(1)
    await first.press('Enter')
    await expect(dialog.locator('[data-face=back]:visible')).toHaveCount(0)
    await boxes.first().uncheck()
    const kept = fronts.length - 1
    await dialog.getByRole('button', { name: `Save ${kept} cards` }).click()
    await expect(page.getByRole('dialog')).toBeHidden()
    await expect(page.getByText(fronts[1], { exact: false }).first()).toBeVisible()
    const deckCard = page.getByRole('button', { name: new RegExp(`^Show answer: ${fronts[1].slice(0, 20).replace(/[^\w ]/g, '.')}`) }).first()
    await deckCard.click()
    await expect(page.locator('[data-face=back]:visible')).toHaveCount(1)
    await page.getByRole('button', { name: 'Flip all' }).click()
    await expect(page.getByRole('button', { name: 'Reset' })).toBeVisible()
    await page.getByRole('button', { name: 'Reset' }).click()
    await expect(page.locator('[data-face=back]:visible')).toHaveCount(0)
    expect(problems).toEqual([])
  })

  test('course chat streams an answer and opens "Under the hood"', async ({ page }) => {
    const problems = guard(page)
    await loginFromLanding(page, 'student')
    await page.goto('/app/courses/PY101/chat')
    await page.getByRole('textbox', { name: 'Message' }).fill('How do for loops work in Python?')
    await page.getByRole('button', { name: 'Send message' }).click()
    await expect(page.getByText('Based on your course material')).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText('Sources', { exact: false }).first()).toBeVisible()
    await page.getByRole('button', { name: /Under the hood/ }).first().click()
    await expect(page.getByText('Retrieved passages')).toBeVisible()
    expect(problems).toEqual([])
  })
})

test('instructor creates a question', async ({ page }) => {
  const problems = guard(page)
  await loginFromLanding(page, 'instructor')
  await expect(page).toHaveURL(/\/instructor$/)
  await page.goto('/instructor/courses/PY101/assignments')
  await page.getByRole('button', { name: 'New question' }).first().click()
  await page.getByPlaceholder('What is the time complexity of binary search?').fill('E2E: which keyword defines a function in Python?')
  await page.getByLabel('Option 1', { exact: true }).fill('def')
  await page.getByLabel('Option 2', { exact: true }).fill('func')
  await page.getByLabel('Option 1 is correct').check()
  await page.getByRole('button', { name: 'Create question' }).click()
  await expect(page.getByText('E2E: which keyword defines a function in Python?')).toBeVisible()
  expect(problems).toEqual([])
})

test('instructor adds a lecture from a YouTube link', async ({ page }) => {
  const problems = guard(page)
  await stubYouTube(page)
  await loginFromLanding(page, 'instructor')
  await expect(page).toHaveURL(/\/instructor$/) // let the demo login finish before navigating away
  await page.goto('/instructor/courses/ML301/lectures')
  // Do not depend on which lectures a persistent database happens to hold: wait for the page, not a seeded title.
  await expect(page.getByRole('heading', { name: 'Lectures', level: 1 })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Add lecture' }).first()).toBeVisible()
  await page.getByRole('button', { name: 'Add lecture' }).first().click()
  const dialog = page.getByRole('dialog', { name: 'Add a lecture' })
  await dialog.getByLabel(/YouTube link/).fill('not a link')
  await dialog.getByLabel(/^Title/).fill('E2E: Neural networks')
  await dialog.getByRole('button', { name: 'Add lecture' }).click()
  await expect(dialog.getByText("That isn't a YouTube link we recognise.")).toBeVisible()
  await dialog.getByLabel(/YouTube link/).fill('https://youtu.be/aircAruvnKk')
  await expect(dialog.locator('iframe[title="Video preview"]')).toBeVisible()
  await dialog.getByRole('button', { name: 'Add lecture' }).click()
  await expect(page.getByText('E2E: Neural networks')).toBeVisible()
  // clean up so repeated runs against a persistent database do not accumulate lectures
  await page.getByRole('button', { name: /^Delete .*E2E: Neural networks/ }).click()
  await page.getByRole('dialog', { name: 'Remove this lecture?' }).getByRole('button', { name: 'Remove' }).click()
  await expect(page.getByText('E2E: Neural networks')).toHaveCount(0)
  expect(problems).toEqual([])
})

test('admin sees users and AI usage', async ({ page }) => {
  const problems = guard(page)
  await loginFromLanding(page, 'admin')
  await expect(page).toHaveURL(/\/admin$/)
  await page.goto('/admin/users')
  await expect(page.getByText('demo.student@studybuddy.dev').first()).toBeVisible()
  // an admin cannot change their own role
  await expect(page.getByLabel('Role for Demo Admin').first()).toBeDisabled()
  await page.goto('/admin/ai')
  await expect(page.getByRole('heading', { name: 'AI usage' })).toBeVisible()
  await expect(page.getByText('Requests', { exact: true }).first()).toBeVisible()
  expect(problems).toEqual([])
})

test('cold start: landing shows a "waking up" state, then the demo buttons enable themselves', async ({ page }) => {
  let calls = 0
  await page.route('**/auth/config', async (route) => {
    calls += 1
    if (calls === 1) return route.abort('connectionrefused') // the sleeping host refuses / resets the first request
    await new Promise((r) => setTimeout(r, 3500)) // ...and the next one is slow to answer
    return route.continue()
  })
  await page.goto('/')
  await expect(page.getByText('Waking up the demo server…').first()).toBeVisible()
  const student = page.getByRole('button', { name: 'Try as student' }).first()
  await expect(student).toBeVisible()
  await expect(student).toBeDisabled()
  // Automatic retry: no reload, no click.
  await expect(page.getByText('Waking up the demo server…').first()).toBeHidden({ timeout: 30_000 })
  await expect(student).toBeEnabled()
  expect(calls).toBeGreaterThanOrEqual(2)
  await student.click()
  await expect(page).toHaveURL(/\/app$/)
})
