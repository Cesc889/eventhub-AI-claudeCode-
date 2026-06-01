---
name: generate-tests
description: Generates and validates Playwright test cases for the EventHub application (https://eventhub.rahulshettyacademy.com). Only activate this skill when the user explicitly asks to generate, write, or create tests for EventHub. Writes spec files following the playwright SKILL.md conventions, then uses Playwright MCP to run and validate every test in a real browser. Does not stop until all tests pass in the browser. Do NOT invoke this skill automatically — only when the user explicitly requests test generation.
disable-model-invocation: true
---

# EventHub — Generate & Validate Playwright Tests

## Ground Rules

- **Never declare a test done until it passes in a real browser via Playwright MCP.**
- Write tests following all conventions in the `playwright` SKILL.md (locator priorities, assertion strategies, POM structure, wait strategies, anti-patterns).
- The target application lives at: **`https://eventhub.rahulshettyacademy.com/login`**
- All spec files go in the `generate-tests/` folder unless the user specifies otherwise.
- Use `.spec.js` (JavaScript) by default unless the user asks for TypeScript.

---

## Knowledge Sources

1. 'playwight-best-practises' - your coding standards, follow every rule
2. 'eventhub-domain' - sill overview and data models
3. 'eventhub-domain' - sub-files - Read './UI-selectors.md' for selectors, './business-rules.md' for assertions, './User-flow-journeys.md'
for test steps
4. './tests/*spec.js'- existing tests to match patterns
5. 'frontend/app/', 'frontend/components/' - verify selectors exist in actual source code
## Phase 1 — Understand the Feature Under Test

Before writing a single line of code, do the following:

1. **Navigate to the app** using Playwright MCP:
   ```
   navigate → https://eventhub.rahulshettyacademy.com/login
   ```
2. **Take a snapshot** of the current page to inspect the DOM structure.
3. **Identify all visible interactive elements** — inputs, buttons, links, headings, nav items.
4. **Note the exact locators** — check for `data-testid`, `name`, `placeholder`, `aria-label`, `role`, or `class` attributes. Do not guess locators; read them from the live DOM.
5. **Map the user flow** for the feature you are about to test before writing code.

Only proceed to Phase 2 once you have live DOM evidence for every locator you plan to use.

---

## Phase 2 — Write the Playwright Spec File

Follow the playwright SKILL.md conventions strictly. Below is the canonical structure for this app.

### Config reference (`playwright.config.js`)
```js
// playwright.config.js — place in project root if not already present
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './generate-tests',
  fullyParallel: false,
  retries: 1,
  reporter: [['html'], ['list']],
  use: {
    baseURL: 'https://eventhub.rahulshettyacademy.com',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    headless: false,          // Always headed so MCP can observe
  },
});
```

### Spec file skeleton
```js
// generate-tests/<feature>.spec.js
const { test, expect } = require('@playwright/test');

const BASE_URL  = 'https://eventhub.rahulshettyacademy.com';
const LOGIN_URL = `${BASE_URL}/login`;

// ── Test Data ─────────────────────────────────────────────────────────────────
const VALID_USER = {
  email:    'rahulshetty@gmail.com',   // replace with real credentials if provided
  password: 'Iamking@000',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
async function loginAs(page, user = VALID_USER) {
  await page.goto(LOGIN_URL);
  await page.getByPlaceholder('Email').fill(user.email);
  await page.getByPlaceholder('Password').fill(user.password);
  await page.getByRole('button', { name: /login/i }).click();
  await expect(page).toHaveURL(/dashboard|home/i, { timeout: 10_000 });
}

// ── Tests ─────────────────────────────────────────────────────────────────────
test.describe('EventHub — <Feature Name>', () => {

  test.beforeEach(async ({ page }) => {
    // If the feature requires authentication, call loginAs here.
    // Otherwise navigate directly.
  });

  test('<descriptive test name>', async ({ page }) => {
    // Arrange

    // Act

    // Assert
  });

});
```

### Login page tests (always included as the baseline spec)
```js
// generate-tests/login.spec.js
const { test, expect } = require('@playwright/test');

const LOGIN_URL = 'https://eventhub.rahulshettyacademy.com/login';

test.describe('Login Page @smoke', () => {

  test('page loads with required fields visible', async ({ page }) => {
    await page.goto(LOGIN_URL);
    await expect(page).toHaveTitle(/.+/);
    await expect(page.getByPlaceholder('Email')).toBeVisible();
    await expect(page.getByPlaceholder('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: /login/i })).toBeVisible();
  });

  test('successful login with valid credentials', async ({ page }) => {
    await page.goto(LOGIN_URL);
    await page.getByPlaceholder('Email').fill('rahulshetty@gmail.com');
    await page.getByPlaceholder('Password').fill('Iamking@000');
    await page.getByRole('button', { name: /login/i }).click();
    await expect(page).toHaveURL(/dashboard|home/i, { timeout: 10_000 });
  });

  test('shows error with invalid credentials', async ({ page }) => {
    await page.goto(LOGIN_URL);
    await page.getByPlaceholder('Email').fill('wrong@email.com');
    await page.getByPlaceholder('Password').fill('wrongpassword');
    await page.getByRole('button', { name: /login/i }).click();
    // Error message should appear — locator confirmed from live DOM in Phase 1
    await expect(
      page.locator('.error, [class*="error"], [class*="alert"]').first()
    ).toBeVisible({ timeout: 5_000 });
  });

  test('login button is disabled when fields are empty', async ({ page }) => {
    await page.goto(LOGIN_URL);
    // Adjust assertion if the app uses a different empty-state pattern
    const btn = page.getByRole('button', { name: /login/i });
    await expect(btn).toBeVisible();
    // Either disabled attribute OR no navigation occurs — verify from DOM
  });

});
```

---

## Phase 3 — Run Tests via Playwright MCP

After writing the spec file, execute it immediately using Playwright MCP. Do not ask the user to run it manually.

### Step-by-step MCP execution loop

```
1. playwright_navigate   → https://eventhub.rahulshettyacademy.com/login
2. playwright_snapshot   → capture DOM to verify page loaded
3. [For each test in the spec file, simulate the flow using MCP actions]
   playwright_fill      → selector, value
   playwright_click     → selector
   playwright_snapshot  → verify DOM after action
   playwright_expect_*  → assert conditions
```

### MCP action mapping
| Playwright Code                          | Playwright MCP Tool           |
|------------------------------------------|-------------------------------|
| `page.goto(url)`                         | `playwright_navigate`         |
| `locator.fill(value)`                    | `playwright_fill`             |
| `locator.click()`                        | `playwright_click`            |
| `page.screenshot()`                      | `playwright_screenshot`       |
| `page` DOM inspection                    | `playwright_snapshot`         |
| `expect(locator).toBeVisible()`          | `playwright_expect_visible`   |
| `expect(page).toHaveURL(pattern)`        | `playwright_expect_url`       |
| `locator.selectOption(value)`            | `playwright_select_option`    |
| `page.keyboard.press(key)`               | `playwright_press`            |

---

## Phase 4 — Failure Recovery Loop

**A test is NOT complete until it executes without errors in the real browser. This loop is mandatory.**

```
┌─────────────────────────────────────────────────────────┐
│              TEST EXECUTION LOOP                        │
│                                                         │
│  1. Run test via Playwright MCP                         │
│  2. Did it pass?                                        │
│     YES → ✅ Mark test complete, move to next test      │
│     NO  → Enter recovery steps below                   │
└─────────────────────────────────────────────────────────┘
```

### Recovery Step A — Read the error message
```
- Read the full error output carefully.
- Identify the failure category:
    [LOCATOR_NOT_FOUND]   → element could not be found
    [TIMEOUT]             → element existed but was not actionable in time
    [ASSERTION_FAILED]    → element found but value/state was wrong
    [NAVIGATION_FAILED]   → page did not reach expected URL
    [UNEXPECTED_ELEMENT]  → wrong element matched
```

### Recovery Step B — Go to the real browser
```
playwright_navigate → to the page where the failure occurred
playwright_snapshot → capture a fresh DOM snapshot
```
Read the snapshot carefully. Look for:
- Has the element's `placeholder`, `name`, `aria-label`, or `role` changed?
- Is there a new wrapper element causing the locator to be off?
- Is the element inside a shadow DOM, iframe, or modal?
- Has a class name or `data-testid` been renamed?
- Is the element conditionally hidden and needs a prior action to reveal it?

### Recovery Step C — Check the frontend source (if DOM snapshot is unclear)
```
playwright_navigate → view-source:https://eventhub.rahulshettyacademy.com/<path>
                   OR
playwright_snapshot → on the specific page, zooming into the component in question
```
Read the raw HTML for the failing component:
- Find the closest reliable attribute: `data-testid`, `id`, `name`, `placeholder`, `aria-*`.
- Re-check the locator priority ladder from playwright SKILL.md.
- If CSS selectors must be used (last resort), pick the most stable attribute available.

### Recovery Step D — Correct the spec file
- Open the `.spec.js` file.
- Replace the broken locator with the correct one found in Step B/C.
- Add a comment above the changed locator explaining what was corrected and why:
  ```js
  // FIXED: placeholder changed from 'Username' to 'Email' — confirmed from live DOM 2024-01
  await page.getByPlaceholder('Email').fill(user.email);
  ```

### Recovery Step E — Re-run the test
```
→ Return to Phase 3 and re-execute the corrected test via Playwright MCP.
→ Repeat Phase 4 A–E until the test passes.
→ Never give up mid-test. The loop ends only on a green pass.
```

---

## Phase 5 — Post-Pass Checklist

Only after ALL tests in the current spec pass in the real browser:

- [ ] Confirm all locators in the spec match what is currently in the live DOM.
- [ ] Confirm no `page.waitForTimeout()` calls were left in the spec.
- [ ] Confirm every assertion uses `await expect(...)`.
- [ ] Confirm the spec file follows the `<feature>.spec.js` naming convention.
- [ ] Confirm `test.describe` groups are logically named.
- [ ] Report back to the user: which tests were written, which locators were corrected, final pass/fail count.

---

## Common EventHub Locator Reference

> These are starting-point guesses based on typical Angular/React app patterns.
> **Always verify against live DOM in Phase 1 before using.** Replace any that are wrong.

| Element              | Suggested Locator (verify first)                          |
|----------------------|-----------------------------------------------------------|
| Email input          | `page.getByPlaceholder('Email')`                          |
| Password input       | `page.getByPlaceholder('Password')`                       |
| Login button         | `page.getByRole('button', { name: /login/i })`            |
| Error/alert toast    | `page.locator('.error, [class*="error"]').first()`        |
| Nav bar              | `page.locator('nav, [class*="navbar"]')`                  |
| Page heading         | `page.getByRole('heading').first()`                       |
| Event cards/list     | `page.locator('[class*="card"], [class*="event"]')`       |
| Submit / Save button | `page.getByRole('button', { name: /submit|save/i })`      |
| Logout               | `page.getByRole('button', { name: /logout/i })`           |
| Modal dialog         | `page.getByRole('dialog')`                                |
| Form fields (generic)| `page.getByRole('textbox').nth(n)`                        |

---

## Locator Correction Cheat-Sheet

When a locator fails, work through this list in order:

```
1. playwright_snapshot → read the fresh DOM
2. Look for data-testid     → page.getByTestId('...')
3. Look for aria-label      → page.getByLabel('...')
4. Look for placeholder     → page.getByPlaceholder('...')
5. Look for role + name     → page.getByRole('...', { name: '...' })
6. Look for visible text    → page.getByText('...', { exact: false })
7. Look for stable class    → page.locator('.[stable-class-name]')
8. Last resort: full CSS    → page.locator('form > div:nth-child(2) input')
   (add a comment explaining why a stable selector was unavailable)
```

---

## Absolute Rules — Never Break These

1. **Never mark a test as done without a real-browser green pass.**
2. **Never use `page.waitForTimeout()`.** Use `await expect(...).toBeVisible()` or `waitForResponse`.
3. **Never commit `test.only` to the spec file.**
4. **Never guess a locator.** If unsure, snapshot the browser and read the DOM first.
5. **Never stop the recovery loop because a fix "looks right".** Re-run via MCP to confirm.
6. **If a page requires login, always use the `loginAs` helper** rather than copy-pasting login steps in every test.
