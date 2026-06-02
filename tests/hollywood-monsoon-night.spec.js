const { test, expect } = require('@playwright/test');

const BASE_URL          = 'https://eventhub.rahulshettyacademy.com';
const USER_EMAIL        = 'rahulshetty1@gmail.com';
const USER_PASSWORD     = 'Magiclife1!';
const EVENT_TITLE       = 'Hollywood Monsoon Night';
const PRICE_PER_TICKET  = '$2,500';
const BOOKING_REF_REGEX = /^H-[A-Z0-9]{6}$/;

// ── Helpers ────────────────────────────────────────────────────────────────────

async function login(page) {
  await page.goto(`${BASE_URL}/login`);
  await page.getByPlaceholder('you@email.com').fill(USER_EMAIL);
  await page.getByLabel('Password').fill(USER_PASSWORD);
  await page.locator('#login-btn').click();
  await expect(page.getByRole('link', { name: /Browse Events/i }).first()).toBeVisible();
}

async function navigateToHollywoodEvent(page) {
  await page.goto(`${BASE_URL}/events`);
  const eventCard = page.getByTestId('event-card').filter({ hasText: EVENT_TITLE });
  await expect(eventCard).toBeVisible();
  await eventCard.getByTestId('book-now-btn').click();
  await expect(page).toHaveURL(/\/events\/\d+/);
}

async function fillBookingForm(page, customerName) {
  await page.getByLabel('Full Name').fill(customerName);
  await page.locator('#customer-email').fill(USER_EMAIL);
  await page.getByPlaceholder('+91 98765 43210').fill('9876543210');
}

// ── Tests ──────────────────────────────────────────────────────────────────────

test.describe(`EventHub — Booking tickets for '${EVENT_TITLE}'`, () => {

  // HMN-001 ───────────────────────────────────────────────────────────────────
  test('HMN-001: book 1 ticket — verify H- ref, $2,500 total, and all booking detail fields', async ({ page }) => {
    // -- Arrange --
    await login(page);
    await navigateToHollywoodEvent(page);

    // Default ticket count must be 1
    await expect(page.locator('#ticket-count')).toHaveText('1');

    // -- Act --
    await fillBookingForm(page, 'Jane Smith');
    await page.locator('.confirm-booking-btn').click();

    // -- Assert: confirmation card --
    await expect(page.getByText('Booking Confirmed!')).toBeVisible();

    const refEl = page.locator('.booking-ref').first();
    await expect(refEl).toBeVisible();
    const bookingRef = (await refEl.textContent()).trim();
    // Rule R25: booking ref prefix = first char of event title uppercased → H-
    expect(bookingRef).toMatch(BOOKING_REF_REGEX);
    console.log(`[HMN-001] Booking Ref: ${bookingRef}`);

    // After confirmation the booking form is replaced; the only $2,500 is the confirmed total
    // Rule R10: totalPrice = price × quantity = $2,500 × 1 = $2,500
    await expect(page.getByText(PRICE_PER_TICKET).first()).toBeVisible();

    // -- Navigate to booking detail via "View My Bookings" --
    await page.getByRole('link', { name: 'View My Bookings' }).click();
    await expect(page).toHaveURL(`${BASE_URL}/bookings`);

    const card = page.getByTestId('booking-card').filter({ hasText: bookingRef });
    await expect(card).toBeVisible();
    await card.getByRole('link', { name: 'View Details' }).click();
    await expect(page).toHaveURL(/\/bookings\/\d+/);

    // -- Assert: booking detail page --

    // Booking ref in page header
    await expect(page.locator('span.font-mono').first()).toContainText(bookingRef);

    // Booking ID is a positive integer rendered as "#14" in the Booking Information section
    const bookingIdEl = page.locator('span.font-medium').filter({ hasText: /^#\d+$/ });
    await expect(bookingIdEl).toBeVisible();
    const bookingIdText = (await bookingIdEl.textContent()).trim();
    expect(bookingIdText).toMatch(/^#\d+$/);
    const bookingId = parseInt(bookingIdText.slice(1), 10);
    expect(bookingId).toBeGreaterThan(0);
    console.log(`[HMN-001] Booking ID: ${bookingIdText}`);

    // Event Details section
    await expect(page.getByText(/Hollywood Monsoon Night/).first()).toBeVisible();
    await expect(page.getByText('Concert').first()).toBeVisible();
    await expect(page.getByText('Los Angeles', { exact: true })).toBeVisible();

    // Customer Details section
    await expect(page.getByText('Jane Smith')).toBeVisible();
    await expect(page.getByText(USER_EMAIL).first()).toBeVisible();

    // Payment Summary: Total Paid = $2,500 (text-lg text-indigo-700 uniquely targets total)
    await expect(page.locator('span.text-lg.text-indigo-700')).toHaveText(PRICE_PER_TICKET);

    // Status and cancel action
    await expect(page.getByText('confirmed').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel Booking' })).toBeVisible();
  });

  // HMN-002 ───────────────────────────────────────────────────────────────────
  test('HMN-002: book 3 tickets — verify $7,500 total, booking ID, and refund not eligible', async ({ page }) => {
    const TICKET_COUNT   = 3;
    const EXPECTED_TOTAL = '$7,500';

    // -- Arrange --
    await login(page);
    await navigateToHollywoodEvent(page);

    // Increment to 3 tickets
    const incrementBtn = page.getByRole('button', { name: '+' });
    for (let i = 1; i < TICKET_COUNT; i++) {
      await incrementBtn.click();
    }
    await expect(page.locator('#ticket-count')).toHaveText(String(TICKET_COUNT));

    // Assert pre-submission live price summary
    // Rule R10: $2,500 × 3 = $7,500
    const priceSummary = page.locator('.bg-indigo-50.rounded-xl').first();
    await expect(priceSummary).toContainText(`${PRICE_PER_TICKET} × ${TICKET_COUNT} tickets`);
    await expect(priceSummary.locator('.text-indigo-700')).toHaveText(EXPECTED_TOTAL);

    // -- Act --
    await fillBookingForm(page, 'Alex Kumar');
    await page.locator('.confirm-booking-btn').click();

    // -- Assert: confirmation card --
    await expect(page.getByText('Booking Confirmed!')).toBeVisible();

    const refEl = page.locator('.booking-ref').first();
    await expect(refEl).toBeVisible();
    const bookingRef = (await refEl.textContent()).trim();
    // Rule R25: booking ref prefix = H-
    expect(bookingRef).toMatch(BOOKING_REF_REGEX);

    // Rule R10: confirmed total = $2,500 × 3 = $7,500
    await expect(page.getByText(EXPECTED_TOTAL).first()).toBeVisible();
    console.log(`[HMN-002] Booking Ref: ${bookingRef}, Total: ${EXPECTED_TOTAL}`);

    // -- Navigate to booking detail via "View My Bookings" --
    await page.getByRole('link', { name: 'View My Bookings' }).click();
    await expect(page).toHaveURL(`${BASE_URL}/bookings`);

    const card = page.getByTestId('booking-card').filter({ hasText: bookingRef });
    await expect(card).toBeVisible();
    // Verify the list card already shows the correct ticket count
    await expect(card).toContainText('3 tickets');
    await card.getByRole('link', { name: 'View Details' }).click();
    await expect(page).toHaveURL(/\/bookings\/\d+/);

    // -- Assert: booking detail page --

    // Booking ID is a positive integer rendered as "#17" in the Booking Information section
    const bookingIdEl = page.locator('span.font-medium').filter({ hasText: /^#\d+$/ });
    await expect(bookingIdEl).toBeVisible();
    const bookingIdText = (await bookingIdEl.textContent()).trim();
    expect(bookingIdText).toMatch(/^#\d+$/);
    const bookingId = parseInt(bookingIdText.slice(1), 10);
    expect(bookingId).toBeGreaterThan(0);
    console.log(`[HMN-002] Booking ID: ${bookingIdText}`);

    // Payment Summary: Total Paid = $7,500
    await expect(page.locator('span.text-lg.text-indigo-700')).toHaveText(EXPECTED_TOTAL);

    // Payment Summary: Tickets = 3 (Field component renders quantity as plain number)
    const ticketsRow = page.locator('div.flex.justify-between').filter({
      has: page.locator('span').filter({ hasText: /^Tickets$/ }),
    });
    await expect(ticketsRow.locator('span').last()).toHaveText(String(TICKET_COUNT));

    // Refund check: quantity > 1 → NOT eligible (client-side rule, ~4 s delay)
    // Rule R15: refund eligibility: 1 ticket = eligible, >1 ticket = not eligible
    await page.locator('[data-testid="check-refund-btn"]').click();
    await expect(page.locator('[data-testid="refund-spinner"]')).toBeVisible();
    await expect(page.locator('[data-testid="refund-result"]')).toBeVisible({ timeout: 8_000 });
    await expect(page.locator('[data-testid="refund-result"]')).toContainText('Not eligible for refund');
    await expect(page.locator('[data-testid="refund-result"]')).toContainText('3 tickets');
  });

});
