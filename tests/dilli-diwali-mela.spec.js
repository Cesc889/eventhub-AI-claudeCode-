const { test, expect } = require('@playwright/test');

const BASE_URL       = 'https://eventhub.rahulshettyacademy.com';
const USER_EMAIL     = 'rahulshetty1@gmail.com';
const USER_PASSWORD  = 'Magiclife1!';
const EVENT_TITLE    = 'Dilli Diwali Mela';
const TICKET_COUNT   = 3;
const PRICE_PER_TICKET = '$300';
const EXPECTED_TOTAL   = '$900';

// ── Helpers ────────────────────────────────────────────────────────────────────

async function login(page) {
  await page.goto(`${BASE_URL}/login`);
  await page.getByPlaceholder('you@email.com').fill(USER_EMAIL);
  await page.getByLabel('Password').fill(USER_PASSWORD);
  await page.locator('#login-btn').click();
  await expect(page.getByRole('link', { name: /Browse Events/i }).first()).toBeVisible();
}

async function navigateToDilliEvent(page) {
  await page.goto(`${BASE_URL}/events`);
  const eventCard = page.getByTestId('event-card').filter({ hasText: EVENT_TITLE });
  await expect(eventCard).toBeVisible();
  await eventCard.getByTestId('book-now-btn').click();
  await expect(page).toHaveURL(/\/events\/\d+/);
}

async function setTicketCount(page, count) {
  const incrementBtn = page.getByRole('button', { name: '+' });
  for (let i = 1; i < count; i++) {
    await incrementBtn.click();
  }
  await expect(page.locator('#ticket-count')).toHaveText(String(count));
}

async function fillBookingForm(page) {
  await page.getByLabel('Full Name').fill('Test User');
  await page.locator('#customer-email').fill('testuser@example.com');
  await page.getByPlaceholder('+91 98765 43210').fill('9876543210');
}

// ── Tests ──────────────────────────────────────────────────────────────────────

test.describe(`EventHub — Booking 3 tickets for '${EVENT_TITLE}'`, () => {

  // DDM-001 ────────────────────────────────────────────────────────────────────
  test('DDM-001: booking reference starts with "D-" followed by 6 uppercase alphanumeric characters', async ({ page }) => {
    // Arrange
    await login(page);
    await navigateToDilliEvent(page);
    await setTicketCount(page, TICKET_COUNT);
    await fillBookingForm(page);

    // Act
    await page.locator('.confirm-booking-btn').click();

    // Assert — bookingRef must match D-[A-Z0-9]{6}
    // Rule: prefix = first char of event title uppercased (bookingService.js randomRef())
    const refEl = page.locator('.booking-ref').first();
    await expect(refEl).toBeVisible();
    const bookingRef = (await refEl.textContent())?.trim() ?? '';
    expect(bookingRef).toMatch(/^D-[A-Z0-9]{6}$/);
  });

  // DDM-002 ────────────────────────────────────────────────────────────────────
  test('DDM-002: total amount shows $900 in the price summary and in the booking confirmation', async ({ page }) => {
    // Arrange
    await login(page);
    await navigateToDilliEvent(page);
    await setTicketCount(page, TICKET_COUNT);

    // Assert — pre-submission price summary (bg-indigo-50.rounded-xl scopes to the summary
    // div; the navbar "Events" link also carries bg-indigo-50 but lacks rounded-xl)
    // Rule: totalPrice = parseFloat(event.price) × quantity = 300 × 3 = 900
    const priceSummary = page.locator('.bg-indigo-50.rounded-xl').first();
    await expect(priceSummary).toContainText(`${PRICE_PER_TICKET} × ${TICKET_COUNT} tickets`);
    await expect(priceSummary.locator('.text-indigo-700')).toHaveText(EXPECTED_TOTAL);

    // Act — fill form and submit; capture the POST /api/bookings response in parallel
    // to validate totalPrice at the API level (DDM-002 is E2E + API)
    await fillBookingForm(page);
    const [response] = await Promise.all([
      page.waitForResponse(
        res => res.url().includes('/api/bookings') && res.request().method() === 'POST',
        { timeout: 20_000 },
      ),
      page.locator('.confirm-booking-btn').click(),
    ]);

    // Assert — API response: totalPrice must equal 900 (300 × 3)
    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.data.totalPrice).toBe(900);

    // Assert — UI confirmation card visible with $900 total
    await expect(page.getByText('Booking Confirmed!')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(EXPECTED_TOTAL)).toBeVisible();
  });

});
