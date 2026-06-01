const { test, expect } = require('@playwright/test');

const BASE_URL      = 'https://eventhub.rahulshettyacademy.com';
const USER_EMAIL    = 'nishantat91@gmail.com';
const USER_PASSWORD = 'Angeles@8901';

// ── Helpers ────────────────────────────────────────────────────────────────────

async function login(page) {
  await page.goto(`${BASE_URL}/login`);
  await page.getByPlaceholder('you@email.com').fill(USER_EMAIL);
  await page.getByLabel('Password').fill(USER_PASSWORD);
  await page.locator('#login-btn').click();
  await expect(page.getByRole('link', { name: /Browse Events/i }).first()).toBeVisible();
}

async function bookEvent(page) {
  await page.goto(`${BASE_URL}/events`);
  const firstCard = page.getByTestId('event-card').filter({
    has: page.getByTestId('book-now-btn'),
  }).first();
  await expect(firstCard).toBeVisible();
  const eventTitle = (await firstCard.locator('h3').textContent())?.trim() ?? '';
  await firstCard.getByTestId('book-now-btn').click();
  await expect(page).toHaveURL(/\/events\/\d+/);
  await page.getByLabel('Full Name').fill('Test User');
  await page.locator('#customer-email').fill('testuser@example.com');
  await page.getByPlaceholder('+91 98765 43210').fill('9876543210');
  await page.locator('.confirm-booking-btn').click();
  const refEl = page.locator('.booking-ref').first();
  await expect(refEl).toBeVisible();
  const bookingRef = (await refEl.textContent())?.trim() ?? '';
  return { bookingRef, eventTitle };
}

async function clearBookings(page) {
  await page.goto(`${BASE_URL}/bookings`);
  const alreadyEmpty = await page.getByText('No bookings yet').isVisible().catch(() => false);
  if (alreadyEmpty) return;
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: /clear all bookings/i }).click();
  await expect(page.getByText('No bookings yet')).toBeVisible();
}

// ── Test Suite ─────────────────────────────────────────────────────────────────

test.describe('EventHub — Booking UI Edge Cases @Nishanta', () => {

  // TC-402 ─────────────────────────────────────────────────────────────────────
  test('TC-402: decrement button is disabled when quantity is at minimum (1)', async ({ page }) => {
    // -- Step 1: Login and navigate to the first available event --
    await login(page);
    await page.goto(`${BASE_URL}/events`);
    const firstCard = page.getByTestId('event-card').filter({
      has: page.getByTestId('book-now-btn'),
    }).first();
    await expect(firstCard).toBeVisible();
    await firstCard.getByTestId('book-now-btn').click();
    await expect(page).toHaveURL(/\/events\/\d+/);

    // -- Step 2: Verify quantity starts at 1 --
    const ticketCount  = page.locator('#ticket-count');
    // Decrement button uses Unicode MINUS SIGN (U+2212), confirmed from source
    const decrementBtn = page.getByRole('button', { name: '−' });

    await expect(ticketCount).toHaveText('1');

    // -- Step 3: Assert decrement is disabled at quantity 1 --
    await expect(decrementBtn).toBeDisabled();
  });

  // TC-403 ─────────────────────────────────────────────────────────────────────
  test('TC-403: increment button is disabled when quantity reaches maximum (10)', async ({ page }) => {
    // -- Step 1: Login and navigate to the first available event --
    await login(page);
    await page.goto(`${BASE_URL}/events`);
    const firstCard = page.getByTestId('event-card').filter({
      has: page.getByTestId('book-now-btn'),
    }).first();
    await expect(firstCard).toBeVisible();
    await firstCard.getByTestId('book-now-btn').click();
    await expect(page).toHaveURL(/\/events\/\d+/);

    const ticketCount  = page.locator('#ticket-count');
    const incrementBtn = page.getByRole('button', { name: '+' });
    // Decrement button uses Unicode MINUS SIGN (U+2212), confirmed from source
    const decrementBtn = page.getByRole('button', { name: '−' });

    // -- Step 2: Click increment 9 times to go from 1 → 10 --
    for (let i = 0; i < 9; i++) {
      await incrementBtn.click();
    }

    // -- Step 3: Assert quantity is 10 and increment is now disabled --
    await expect(ticketCount).toHaveText('10');
    await expect(incrementBtn).toBeDisabled();

    // -- Step 4: Decrement should still be enabled at qty 10 --
    await expect(decrementBtn).toBeEnabled();
  });

  // TC-503 ─────────────────────────────────────────────────────────────────────
  test('TC-503: cancel booking button opens a confirmation dialog', async ({ page }) => {
    // -- Step 1: Login, clear state, create a booking --
    await login(page);
    await clearBookings(page);
    const { bookingRef } = await bookEvent(page);

    // -- Step 2: Navigate to booking detail page --
    await page.goto(`${BASE_URL}/bookings`);
    const card = page.getByTestId('booking-card').filter({ hasText: bookingRef });
    await card.getByRole('link', { name: 'View Details' }).click();
    await expect(page).toHaveURL(/\/bookings\/\d+/);

    // -- Step 3: Click "Cancel Booking" button --
    await page.getByRole('button', { name: 'Cancel Booking' }).click();

    // -- Step 4: Assert confirmation dialog appears with correct content --
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(page.getByText('Cancel this booking?')).toBeVisible();
    await expect(page.getByText(new RegExp(`Cancelling ${bookingRef}`))).toBeVisible();
    await expect(page.locator('#confirm-dialog-yes')).toBeVisible();
  });

  // TC-504 ─────────────────────────────────────────────────────────────────────
  test('TC-504: dismissing cancel dialog leaves the booking intact', async ({ page }) => {
    // -- Step 1: Login, clear state, create a booking --
    await login(page);
    await clearBookings(page);
    const { bookingRef } = await bookEvent(page);

    // -- Step 2: Navigate to booking detail page --
    await page.goto(`${BASE_URL}/bookings`);
    const card = page.getByTestId('booking-card').filter({ hasText: bookingRef });
    await card.getByRole('link', { name: 'View Details' }).click();
    await expect(page).toHaveURL(/\/bookings\/\d+/);

    // -- Step 3: Open cancel dialog then dismiss it --
    await page.getByRole('button', { name: 'Cancel Booking' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // exact: true prevents partial match against "Yes, cancel it"
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click();

    // -- Step 4: Dialog closes; we remain on the detail page --
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(page).toHaveURL(/\/bookings\/\d+/);

    // -- Step 5: Booking is still confirmed — "Cancel Booking" button still visible --
    await expect(page.getByRole('button', { name: 'Cancel Booking' })).toBeVisible();
  });

});
