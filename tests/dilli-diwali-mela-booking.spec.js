const { test, expect } = require('@playwright/test');

const BASE_URL          = 'https://eventhub.rahulshettyacademy.com';
const USER_EMAIL        = 'rahulshetty1@gmail.com';
const USER_PASSWORD     = 'Magiclife1!';
const EVENT_TITLE       = 'Dilli Diwali Mela';
const PRICE_PER_TICKET  = '$300';
const BOOKING_REF_REGEX = /^D-[A-Z0-9]{6}$/;

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

async function fillBookingForm(page, customerName) {
  await page.getByLabel('Full Name').fill(customerName);
  await page.locator('#customer-email').fill(USER_EMAIL);
  await page.getByPlaceholder('+91 98765 43210').fill('9876543210');
}

// ── Tests ──────────────────────────────────────────────────────────────────────

test.describe(`EventHub — Booking tickets for '${EVENT_TITLE}'`, () => {

  // DDM-BK-001 ─────────────────────────────────────────────────────────────────
  test('DDM-BK-001: book 1 ticket — capture booking ID, verify D- ref and $300 total on detail page', async ({ page }) => {
    // -- Arrange --
    await login(page);
    await navigateToDilliEvent(page);

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
    // Rule R25: booking ref prefix = first char of event title uppercased → D-
    expect(bookingRef).toMatch(BOOKING_REF_REGEX);
    console.log(`[DDM-BK-001] Booking Ref: ${bookingRef}`);

    // After confirmation the form is replaced; the only $300 on screen is the confirmed total
    // Rule R10: totalPrice = price × quantity = $300 × 1 = $300
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

    // Booking ID — rendered as "#51" in the Booking Information section
    const bookingIdEl = page.locator('span.font-medium').filter({ hasText: /^#\d+$/ });
    await expect(bookingIdEl).toBeVisible();
    const bookingIdText = (await bookingIdEl.textContent()).trim();
    expect(bookingIdText).toMatch(/^#\d+$/);
    const bookingId = parseInt(bookingIdText.slice(1), 10);
    expect(bookingId).toBeGreaterThan(0);
    console.log(`[DDM-BK-001] Booking ID: ${bookingIdText}`);

    // Event Details section
    await expect(page.getByText(/Dilli Diwali Mela/).first()).toBeVisible();
    await expect(page.getByText('Festival').first()).toBeVisible();
    await expect(page.getByText('Delhi', { exact: true })).toBeVisible();

    // Customer Details section
    await expect(page.getByText('Jane Smith')).toBeVisible();
    await expect(page.getByText(USER_EMAIL).first()).toBeVisible();

    // Payment Summary: Total Paid = $300 (text-lg text-indigo-700 uniquely targets total)
    await expect(page.locator('span.text-lg.text-indigo-700')).toHaveText(PRICE_PER_TICKET);

    // Status and cancel action
    await expect(page.getByText('confirmed').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel Booking' })).toBeVisible();

    // Refund check button is visible in idle state
    await expect(page.locator('[data-testid="check-refund-btn"]')).toBeVisible();
  });

  // DDM-BK-002 ─────────────────────────────────────────────────────────────────
  test('DDM-BK-002: book 4 tickets — capture booking ID, verify $1,200 total and refund not eligible', async ({ page }) => {
    const TICKET_COUNT   = 4;
    const EXPECTED_TOTAL = '$1,200';

    // -- Arrange --
    await login(page);
    await navigateToDilliEvent(page);

    // Increment to 4 tickets
    const incrementBtn = page.getByRole('button', { name: '+' });
    for (let i = 1; i < TICKET_COUNT; i++) {
      await incrementBtn.click();
    }
    await expect(page.locator('#ticket-count')).toHaveText(String(TICKET_COUNT));

    // Assert pre-submission live price summary
    // Rule R10: $300 × 4 = $1,200
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
    // Rule R25: booking ref prefix = D-
    expect(bookingRef).toMatch(BOOKING_REF_REGEX);

    // Rule R10: confirmed total = $300 × 4 = $1,200
    await expect(page.getByText(EXPECTED_TOTAL).first()).toBeVisible();
    console.log(`[DDM-BK-002] Booking Ref: ${bookingRef}, Total: ${EXPECTED_TOTAL}`);

    // -- Navigate to booking detail via "View My Bookings" --
    await page.getByRole('link', { name: 'View My Bookings' }).click();
    await expect(page).toHaveURL(`${BASE_URL}/bookings`);

    const card = page.getByTestId('booking-card').filter({ hasText: bookingRef });
    await expect(card).toBeVisible();
    // Verify the list card already shows the correct ticket count
    await expect(card).toContainText('4 tickets');
    await card.getByRole('link', { name: 'View Details' }).click();
    await expect(page).toHaveURL(/\/bookings\/\d+/);

    // -- Assert: booking detail page --

    // Booking ID — rendered as "#52" in the Booking Information section
    const bookingIdEl = page.locator('span.font-medium').filter({ hasText: /^#\d+$/ });
    await expect(bookingIdEl).toBeVisible();
    const bookingIdText = (await bookingIdEl.textContent()).trim();
    expect(bookingIdText).toMatch(/^#\d+$/);
    const bookingId = parseInt(bookingIdText.slice(1), 10);
    expect(bookingId).toBeGreaterThan(0);
    console.log(`[DDM-BK-002] Booking ID: ${bookingIdText}`);

    // Payment Summary: Total Paid = $1,200
    await expect(page.locator('span.text-lg.text-indigo-700')).toHaveText(EXPECTED_TOTAL);

    // Payment Summary: Tickets = 4 (Field component renders quantity as plain number)
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
    await expect(page.locator('[data-testid="refund-result"]')).toContainText('4 tickets');
  });

});
