const { test, expect } = require('@playwright/test');

const BASE_URL      = 'https://eventhub.rahulshettyacademy.com';
const USER_EMAIL    = 'rahulshetty1@gmail.com';
const USER_PASSWORD = 'Magiclife1!';

// ── Helpers ────────────────────────────────────────────────────────────────────

async function login(page) {
  await page.goto(`${BASE_URL}/login`);
  await page.getByPlaceholder('you@email.com').fill(USER_EMAIL);
  await page.getByLabel('Password').fill(USER_PASSWORD);
  await page.locator('#login-btn').click();
  await expect(page.getByRole('link', { name: /Browse Events/i }).first()).toBeVisible();
}

// ── Tests ──────────────────────────────────────────────────────────────────────

test.describe('EventHub — My Bookings: Read & Store Booking Details', () => {

  // MB-001 ─────────────────────────────────────────────────────────────────────
  test('MB-001: navigate to My Bookings and capture all details from the first booking card', async ({ page }) => {

    // -- Arrange: login and go to bookings page --
    await login(page);
    await page.goto(`${BASE_URL}/bookings`);

    // -- Wait for the page heading and at least one card --
    await expect(page.getByRole('heading', { name: 'My Bookings' })).toBeVisible();
    const firstCard = page.getByTestId('booking-card').first();
    await expect(firstCard).toBeVisible();

    // -- Act: read every field from the first booking card into variables --

    // Booking ID — rendered as "#42"; strip the leading "#"
    const bookingId = (
      (await firstCard.locator('[data-testid="booking-id"]').textContent()) ?? ''
    ).trim().replace(/^#/, '');

    // Booking reference — .booking-ref span, e.g. "D-X4R2K9"
    const bookingRef = (
      (await firstCard.locator('.booking-ref').textContent()) ?? ''
    ).trim();

    // Status — Badge renders "confirmed" or "cancelled" as its full text
    const status = (
      (await firstCard.getByText(/^(confirmed|cancelled)$/i).textContent()) ?? ''
    ).trim();

    // Event title — <h3> inside the card
    const eventTitle = (
      (await firstCard.locator('h3').textContent()) ?? ''
    ).trim();

    // Event date — the "📅 ..." span; strip the emoji prefix
    const eventDate = (
      (await firstCard.locator('span').filter({ hasText: '📅' }).textContent()) ?? ''
    ).replace('📅', '').trim();

    // Quantity — the "🎫 N ticket(s)" span; extract the number
    const quantityRaw = (
      (await firstCard.locator('span').filter({ hasText: '🎫' }).textContent()) ?? ''
    ).replace(/\D/g, '');
    const quantity = parseInt(quantityRaw, 10);

    // City — the "📍 ..." span; strip the emoji prefix
    const city = (
      (await firstCard.locator('span').filter({ hasText: '📍' }).textContent()) ?? ''
    ).replace('📍', '').trim();

    // Booked date — the "🗓 Booked ..." span; strip the prefix
    const bookedDate = (
      (await firstCard.locator('span').filter({ hasText: '🗓' }).textContent()) ?? ''
    ).replace(/🗓\s*Booked\s*/i, '').trim();

    // Total price — bold indigo price top-right of card, e.g. "$900"
    const totalPrice = (
      (await firstCard.locator('.text-indigo-700').textContent()) ?? ''
    ).trim();

    // -- Log all captured variables --
    console.log('\n--- MB-001: Captured booking details ---');
    console.log(`  Booking ID   : ${bookingId}`);
    console.log(`  Booking Ref  : ${bookingRef}`);
    console.log(`  Status       : ${status}`);
    console.log(`  Event Title  : ${eventTitle}`);
    console.log(`  Event Date   : ${eventDate}`);
    console.log(`  Quantity     : ${quantity}`);
    console.log(`  City         : ${city}`);
    console.log(`  Booked Date  : ${bookedDate}`);
    console.log(`  Total Price  : ${totalPrice}`);
    console.log('----------------------------------------\n');

    // -- Assert: bookingId contains only digits --
    expect(bookingId).toMatch(/^\d+$/);

    // -- Assert: bookingRef matches X-XXXXXX (letter, hyphen, 6 alphanumerics) --
    expect(bookingRef).toMatch(/^[A-Z]-[A-Z0-9]{6}$/);

    // -- Assert: status is exactly "confirmed" or "cancelled" --
    expect(['confirmed', 'cancelled']).toContain(status);

    // -- Assert: eventTitle is a non-empty string --
    expect(eventTitle.length).toBeGreaterThan(0);

    // -- Assert: eventDate is a non-empty string --
    expect(eventDate.length).toBeGreaterThan(0);

    // -- Assert: quantity is a whole number ≥ 1 --
    expect(Number.isInteger(quantity)).toBe(true);
    expect(quantity).toBeGreaterThanOrEqual(1);

    // -- Assert: city is a non-empty string --
    expect(city.length).toBeGreaterThan(0);

    // -- Assert: bookedDate is a non-empty string --
    expect(bookedDate.length).toBeGreaterThan(0);

    // -- Assert: totalPrice starts with "$" followed by digits (commas allowed for thousands) --
    expect(totalPrice).toMatch(/^\$[\d,]+$/);
  });

});
