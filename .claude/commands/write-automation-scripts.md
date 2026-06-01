---
name: playwright
description: Comprehensive Playwright testing best practices, setup, POM structure, API testing, locator strategies, assertions, and debugging. Use this skill when writing, reviewing, or scaffolding any Playwright test code — including new test files, page objects, fixtures, API tests, or CI configuration. Trigger on any mention of Playwright, end-to-end testing, browser automation, or test architecture decisions.
user-invocable: false
---

# Playwright Best Practices

## Project Setup

### Installation & Configuration

```bash
npm init playwright@latest
# Installs: @playwright/test, browsers, playwright.config.ts
```

**`playwright.config.ts` — recommended baseline:**

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html'], ['list']],
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox',  use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit',   use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 5'] } },
  ],
  webServer: {
    command: 'npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

---

## File & Folder Naming Conventions

```
project-root/
├── playwright.config.ts
├── tests/
│   ├── e2e/
│   │   ├── auth.spec.ts          # Feature-scoped spec files
│   │   ├── checkout.spec.ts
│   │   └── dashboard.spec.ts
│   ├── api/
│   │   ├── users.api.spec.ts     # API test files suffixed .api.spec.ts
│   │   └── orders.api.spec.ts
│   └── smoke/
│       └── smoke.spec.ts
├── pages/                        # Page Object Models
│   ├── BasePage.ts
│   ├── LoginPage.ts
│   └── DashboardPage.ts
├── fixtures/
│   └── index.ts                  # Custom fixture extensions
├── helpers/
│   ├── auth.helper.ts
│   └── data.helper.ts
├── test-data/
│   ├── users.json
│   └── products.json
└── .env.test                     # Environment-specific variables
```

**Naming rules:**
- Spec files: `<feature>.spec.ts`
- Page objects: `<PageName>Page.ts` (PascalCase)
- Helpers/utilities: `<name>.helper.ts` or `<name>.util.ts`
- Fixtures: `fixtures/index.ts` (single export point)
- Test IDs in HTML: `data-testid="<kebab-case-name>"`

---

## Locator Strategies & Priorities

Always prefer locators in this order (most to least resilient):

### 1. `data-testid` (most stable)
```ts
page.getByTestId('submit-button')
// Requires: <button data-testid="submit-button">
```

### 2. Role-based (accessibility-first)
```ts
page.getByRole('button', { name: 'Submit' })
page.getByRole('heading', { name: /welcome/i })
page.getByRole('textbox', { name: 'Email' })
page.getByRole('checkbox', { name: 'Remember me' })
```

### 3. Label-associated
```ts
page.getByLabel('Email address')
page.getByLabel('Password')
```

### 4. Placeholder / text
```ts
page.getByPlaceholder('Search products...')
page.getByText('Confirm your order')
```

### 5. CSS / XPath (last resort — avoid if possible)
```ts
page.locator('[data-testid="cart-icon"]')     // acceptable
page.locator('div.checkout > button:nth-child(2)')  // fragile — avoid
page.locator('//button[contains(text(),"Buy")]')    // fragile — avoid
```

---

## Filter Patterns

```ts
// Filter by text within a parent
page.getByRole('listitem').filter({ hasText: 'Product A' })

// Filter by child element
page.getByRole('listitem').filter({ has: page.getByRole('img') })

// Chained locators (narrow scope)
const sidebar = page.locator('[data-testid="sidebar"]');
sidebar.getByRole('link', { name: 'Settings' }).click();

// nth match
page.getByRole('row').nth(2)

// First / last
page.getByRole('option').first()
page.getByRole('option').last()

// Combining filters
page.getByRole('row').filter({ hasText: 'Pending' }).getByRole('button', { name: 'Cancel' })
```

---

## Assertion Strategies

Always use `expect` from `@playwright/test` — never `console.log` + manual checks.

### Visibility & State
```ts
await expect(locator).toBeVisible();
await expect(locator).toBeHidden();
await expect(locator).toBeEnabled();
await expect(locator).toBeDisabled();
await expect(locator).toBeChecked();
await expect(locator).toBeFocused();
```

### Content
```ts
await expect(locator).toHaveText('Order confirmed');
await expect(locator).toContainText('Welcome');
await expect(locator).toHaveValue('john@example.com');
await expect(locator).toHaveAttribute('href', '/dashboard');
await expect(locator).toHaveClass(/active/);
await expect(locator).toHaveCount(5);
```

### Page-level
```ts
await expect(page).toHaveURL('/dashboard');
await expect(page).toHaveURL(/checkout/);
await expect(page).toHaveTitle('My App - Dashboard');
```

### Soft assertions (collect multiple failures)
```ts
await expect.soft(page.getByTestId('price')).toHaveText('$29.99');
await expect.soft(page.getByTestId('stock')).toContainText('In stock');
// Test continues even if soft assertions fail
```

### Custom timeout override
```ts
await expect(locator).toBeVisible({ timeout: 10_000 });
```

---

## Test Structure Patterns

### Basic test anatomy
```ts
import { test, expect } from '@playwright/test';

test.describe('Checkout Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/shop');
  });

  test('user can add item to cart', async ({ page }) => {
    // Arrange
    const product = page.getByTestId('product-card').first();

    // Act
    await product.getByRole('button', { name: 'Add to cart' }).click();

    // Assert
    await expect(page.getByTestId('cart-count')).toHaveText('1');
  });

  test('cart persists on page refresh', async ({ page }) => {
    await page.getByTestId('product-card').first()
               .getByRole('button', { name: 'Add to cart' }).click();
    await page.reload();
    await expect(page.getByTestId('cart-count')).toHaveText('1');
  });
});
```

### Tagging tests for selective runs
```ts
test('quick smoke test @smoke', async ({ page }) => { ... });
test('full regression @regression', async ({ page }) => { ... });
// Run with: npx playwright test --grep @smoke
```

### Parameterised tests
```ts
const browsers = ['chromium', 'firefox'];
for (const browser of browsers) {
  test(`renders correctly on ${browser}`, async ({ page }) => { ... });
}

// Or with test.describe.configure for data-driven:
const testCases = [
  { role: 'admin',   canDelete: true  },
  { role: 'viewer',  canDelete: false },
];
for (const { role, canDelete } of testCases) {
  test(`${role} ${canDelete ? 'can' : 'cannot'} delete`, async ({ page }) => { ... });
}
```

---

## Page Object Model (POM) — For Multi-Page Test Suites

Use POM when the suite involves 3+ pages or shared interactions. It centralises selectors, reduces duplication, and makes tests readable.

### BasePage
```ts
// pages/BasePage.ts
import { Page, Locator } from '@playwright/test';

export class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async navigate(path: string) {
    await this.page.goto(path);
  }

  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle');
  }
}
```

### Feature Page Object
```ts
// pages/LoginPage.ts
import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {
  readonly emailInput:    Locator;
  readonly passwordInput: Locator;
  readonly submitButton:  Locator;
  readonly errorMessage:  Locator;

  constructor(page: Page) {
    super(page);
    this.emailInput    = page.getByLabel('Email');
    this.passwordInput = page.getByLabel('Password');
    this.submitButton  = page.getByRole('button', { name: 'Sign in' });
    this.errorMessage  = page.getByTestId('login-error');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async expectLoginError(message: string) {
    await expect(this.errorMessage).toContainText(message);
  }
}
```

### Using POM in tests
```ts
// tests/e2e/auth.spec.ts
import { test, expect } from '@playwright/test';
import { LoginPage }    from '../../pages/LoginPage';
import { DashboardPage } from '../../pages/DashboardPage';

test('successful login redirects to dashboard', async ({ page }) => {
  const loginPage     = new LoginPage(page);
  const dashboardPage = new DashboardPage(page);

  await loginPage.navigate('/login');
  await loginPage.login('user@example.com', 'SecurePass1!');
  await expect(page).toHaveURL('/dashboard');
  await dashboardPage.expectWelcomeMessage('user@example.com');
});
```

### Custom Fixtures (recommended for POM injection)
```ts
// fixtures/index.ts
import { test as base } from '@playwright/test';
import { LoginPage }     from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';

type Pages = {
  loginPage:     LoginPage;
  dashboardPage: DashboardPage;
};

export const test = base.extend<Pages>({
  loginPage:     async ({ page }, use) => { await use(new LoginPage(page)); },
  dashboardPage: async ({ page }, use) => { await use(new DashboardPage(page)); },
});

export { expect } from '@playwright/test';
```

```ts
// tests/e2e/auth.spec.ts — using fixtures
import { test, expect } from '../../fixtures';

test('login flow', async ({ loginPage, dashboardPage }) => {
  await loginPage.navigate('/login');
  await loginPage.login('user@example.com', 'pass');
  await dashboardPage.expectWelcomeMessage('user@example.com');
});
```

---

## API Testing

```ts
// tests/api/users.api.spec.ts
import { test, expect } from '@playwright/test';

const BASE = process.env.API_BASE_URL ?? 'http://localhost:3000/api';

test.describe('Users API', () => {
  let authToken: string;

  test.beforeAll(async ({ request }) => {
    const res = await request.post(`${BASE}/auth/login`, {
      data: { email: 'admin@example.com', password: 'admin123' },
    });
    const body = await res.json();
    authToken = body.token;
  });

  test('GET /users returns list', async ({ request }) => {
    const res = await request.get(`${BASE}/users`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('users');
    expect(Array.isArray(body.users)).toBeTruthy();
  });

  test('POST /users creates user', async ({ request }) => {
    const res = await request.post(`${BASE}/users`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: { name: 'Test User', email: `test+${Date.now()}@example.com` },
    });
    expect(res.status()).toBe(201);
    const created = await res.json();
    expect(created).toHaveProperty('id');
    expect(created.name).toBe('Test User');
  });

  test('PUT /users/:id updates user', async ({ request }) => {
    // Create first
    const create = await request.post(`${BASE}/users`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: { name: 'Old Name', email: `update+${Date.now()}@example.com` },
    });
    const { id } = await create.json();

    // Then update
    const update = await request.put(`${BASE}/users/${id}`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: { name: 'New Name' },
    });
    expect(update.status()).toBe(200);
    const updated = await update.json();
    expect(updated.name).toBe('New Name');
  });

  test('DELETE /users/:id removes user', async ({ request }) => {
    const create = await request.post(`${BASE}/users`, {
      headers: { Authorization: `Bearer ${authToken}` },
      data: { name: 'Delete Me', email: `delete+${Date.now()}@example.com` },
    });
    const { id } = await create.json();

    const del = await request.delete(`${BASE}/users/${id}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(del.status()).toBe(204);
  });

  test('GET /users/:id returns 404 for unknown id', async ({ request }) => {
    const res = await request.get(`${BASE}/users/nonexistent-id`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(res.status()).toBe(404);
  });
});
```

### Mixing UI + API (seed state via API, validate via UI)
```ts
test('order appears in dashboard after API creation', async ({ page, request }) => {
  // Seed via API (fast)
  const res = await request.post('/api/orders', {
    data: { productId: 'prod_123', quantity: 2 },
    headers: { Authorization: `Bearer ${token}` },
  });
  const { orderId } = await res.json();

  // Validate via UI
  await page.goto('/dashboard/orders');
  await expect(page.getByTestId(`order-${orderId}`)).toBeVisible();
});
```

---

## Wait Strategies

### Always prefer auto-waiting assertions — avoid arbitrary timeouts
```ts
// ✅ Correct — Playwright auto-waits for condition
await expect(locator).toBeVisible();
await locator.click();               // waits for actionability

// ❌ Wrong — brittle, race-prone
await page.waitForTimeout(3000);
```

### Network-aware waits
```ts
// Wait for a specific network response
const [response] = await Promise.all([
  page.waitForResponse(res => res.url().includes('/api/cart') && res.status() === 200),
  page.getByRole('button', { name: 'Add to cart' }).click(),
]);

// Wait for navigation
await Promise.all([
  page.waitForURL('/checkout'),
  page.getByRole('button', { name: 'Proceed' }).click(),
]);

// Wait for load state
await page.waitForLoadState('networkidle');   // all network quiet
await page.waitForLoadState('domcontentloaded');
```

### Element state waits
```ts
await locator.waitFor({ state: 'visible' });
await locator.waitFor({ state: 'attached' });
await locator.waitFor({ state: 'hidden' });
await locator.waitFor({ state: 'detached' });
```

### Polling / custom conditions
```ts
await expect(async () => {
  const count = await page.getByRole('row').count();
  expect(count).toBeGreaterThan(0);
}).toPass({ timeout: 10_000, intervals: [500, 1000, 2000] });
```

---

## Sample Test Data

```ts
// test-data/users.ts
export const testUsers = {
  admin: {
    email:    'admin@example.com',
    password: 'AdminPass1!',
    role:     'admin',
    name:     'Admin User',
  },
  standard: {
    email:    'user@example.com',
    password: 'UserPass1!',
    role:     'viewer',
    name:     'Standard User',
  },
  locked: {
    email:    'locked@example.com',
    password: 'LockedPass1!',
    role:     'viewer',
    name:     'Locked User',
  },
} as const;

export const testProducts = [
  { id: 'prod_001', name: 'Basic Plan',    price: 9.99,  inStock: true  },
  { id: 'prod_002', name: 'Pro Plan',      price: 29.99, inStock: true  },
  { id: 'prod_003', name: 'Enterprise',    price: 99.99, inStock: false },
] as const;

// Dynamic data factory
export function createUniqueUser(overrides = {}) {
  const ts = Date.now();
  return {
    name:     `Test User ${ts}`,
    email:    `test+${ts}@example.com`,
    password: 'TestPass1!',
    ...overrides,
  };
}
```

### Storing auth state (avoid repeated login)
```ts
// global-setup.ts
import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  const browser = await chromium.launch();
  const page    = await browser.newPage();

  await page.goto('http://localhost:3000/login');
  await page.getByLabel('Email').fill('admin@example.com');
  await page.getByLabel('Password').fill('AdminPass1!');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('/dashboard');
  await page.context().storageState({ path: 'playwright/.auth/admin.json' });
  await browser.close();
}

export default globalSetup;
```

```ts
// playwright.config.ts — reference auth state
projects: [
  {
    name: 'setup', testMatch: /global-setup\.ts/,
  },
  {
    name: 'authenticated',
    use: { storageState: 'playwright/.auth/admin.json' },
    dependencies: ['setup'],
  },
],
```

---

## Debugging Tips

### Run a single test in headed mode
```bash
npx playwright test auth.spec.ts --headed
npx playwright test --grep "login flow" --headed
```

### Pause execution at a breakpoint
```ts
await page.pause();   // Opens Playwright Inspector — step through actions
```

### Debug mode (step through from CLI)
```bash
PWDEBUG=1 npx playwright test auth.spec.ts
```

### Slow motion for visibility
```ts
// playwright.config.ts
use: { launchOptions: { slowMo: 500 } }
```

### Trace viewer (post-run analysis)
```bash
npx playwright show-trace trace.zip
```

### Screenshot on demand within test
```ts
await page.screenshot({ path: 'debug-state.png', fullPage: true });
await locator.screenshot({ path: 'element-state.png' });
```

### Console log interception
```ts
page.on('console', msg => console.log(`[Browser] ${msg.type()}: ${msg.text()}`));
page.on('pageerror', err => console.error(`[Page Error] ${err.message}`));
```

### Network inspection
```ts
page.on('request',  req  => console.log(`>> ${req.method()} ${req.url()}`));
page.on('response', res  => console.log(`<< ${res.status()} ${res.url()}`));
```

### Codegen — auto-generate locators from interactions
```bash
npx playwright codegen http://localhost:3000
```

---

## Anti-Patterns to Avoid

| Anti-pattern | Why it's bad | Better alternative |
|---|---|---|
| `page.waitForTimeout(3000)` | Arbitrary sleep — flaky & slow | `await expect(locator).toBeVisible()` |
| `page.locator('div > span:nth-child(3)')` | Structural CSS — breaks on DOM changes | `getByRole` / `getByTestId` |
| Hardcoding absolute URLs | Breaks across environments | Use `baseURL` from config |
| XPath for everything | Verbose, fragile, brittle | Role/label/testid locators |
| No `test.describe` grouping | Flat files are hard to navigate | Group by feature/flow |
| Shared mutable state between tests | Race conditions in parallel runs | Use `test.beforeEach` or isolate state |
| Assertions without await | Assertion never actually runs | Always `await expect(...)` |
| Using `page.$('selector')` | Old API — no auto-wait | Use `page.locator()` |
| Giant monolithic test files | Hard to maintain, slow feedback | Split by feature/page |
| `test.only` committed to repo | Silently skips all other tests | Never commit `.only` — use `--grep` |
| Ignoring flaky tests | Erodes trust in the suite | Fix or quarantine with `test.fixme` |
| No `storageState` for auth | Repeated login = slow suite | Use global setup + `storageState` |
| Missing `baseURL` in config | URL duplication everywhere | Always set `baseURL` in config |

---

## Quick Reference — Key CLI Commands

```bash
npx playwright test                          # Run all tests
npx playwright test auth.spec.ts             # Run specific file
npx playwright test --grep "@smoke"          # Run tagged tests
npx playwright test --project=chromium       # Single browser
npx playwright test --headed                 # Show browser
npx playwright test --debug                  # Debug mode
npx playwright test --reporter=html          # HTML report
npx playwright show-report                   # Open last HTML report
npx playwright codegen http://localhost:3000 # Record test
```
