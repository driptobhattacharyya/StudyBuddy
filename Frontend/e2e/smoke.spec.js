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
