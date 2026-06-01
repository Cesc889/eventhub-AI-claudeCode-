# My Bookings — Test Scenario: Read & Store Booking Details

**Feature:** My Bookings page  
**Generated:** 2026-06-01  
**Scenarios:** 1 (MB-001)

---

## MB-001 — Navigate to My Bookings and capture all booking details

**Category:** Happy Path  
**Suggested Layer:** E2E  

---

### Preconditions

- Logged in as `rahulshetty1@gmail.com` / `Magiclife1!`
- The account has at least 1 confirmed booking
- If the account is empty: navigate to any event, book 1 ticket, then proceed

---

### Steps

1. Go to `https://eventhub.rahulshettyacademy.com/login`
2. Enter `rahulshetty1@gmail.com` in the Email field
3. Enter `Magiclife1!` in the Password field
4. Click the **Login** button
5. Go to `https://eventhub.rahulshettyacademy.com/bookings`
6. Wait for at least one booking card to appear on the page
7. From the **first booking card**, read and store the following into variables:

| Variable | Where to read it from | Example value |
|---|---|---|
| `bookingId` | `[data-testid="booking-id"]` — strip the leading `#` | `42` |
| `bookingRef` | `.booking-ref` element inside the card | `D-X4R2K9` |
| `status` | The status badge text (confirmed / cancelled) | `confirmed` |
| `eventTitle` | The `<h3>` heading inside the card | `Dilli Diwali Mela` |
| `eventDate` | The `📅` span — strip the emoji | `20 Oct 2025` |
| `quantity` | The `🎫` span — extract the number | `3` |
| `city` | The `📍` span — strip the emoji | `Delhi` |
| `bookedDate` | The `🗓 Booked` span — strip the prefix | `1 Jun 2026` |
| `totalPrice` | The bold price element (top-right of card) | `$900` |

8. Print all nine variables to the console

---

### Expected Results

- The page heading **"My Bookings"** is visible
- At least one booking card is displayed
- `bookingId` — contains only digits, e.g. `"42"`
- `bookingRef` — matches the pattern `X-XXXXXX` (one uppercase letter, a hyphen, 6 uppercase letters or digits), e.g. `D-X4R2K9`
- `status` — is either `confirmed` or `cancelled`, nothing else
- `eventTitle` — is a non-empty string
- `eventDate` — is a readable date, e.g. `"20 Oct 2025"`
- `quantity` — is a whole number greater than zero
- `city` — is a non-empty string
- `bookedDate` — is a readable date
- `totalPrice` — starts with `$` followed by digits, e.g. `"$900"`
- None of the variables are empty, null, or undefined

---

### Business Rules

- Each user can only see their own bookings — the API (`GET /api/bookings`) filters by the user ID in the login token
- The `bookingRef` prefix letter always matches the first letter of the event title (e.g. "Dilli" → `D-...`)

---

### Playwright Code

```js
const firstCard = page.getByTestId('booking-card').first();
await expect(firstCard).toBeVisible();

const bookingId  = ((await firstCard.locator('[data-testid="booking-id"]').textContent()) ?? '').trim().replace(/^#/, '');
const bookingRef = ((await firstCard.locator('.booking-ref').textContent()) ?? '').trim();
const status     = ((await firstCard.getByText(/confirmed|cancelled/i).first().textContent()) ?? '').trim();
const eventTitle = ((await firstCard.locator('h3').textContent()) ?? '').trim();
const eventDate  = ((await firstCard.locator('span').filter({ hasText: '📅' }).textContent()) ?? '').replace('📅', '').trim();
const quantity   = parseInt(((await firstCard.locator('span').filter({ hasText: '🎫' }).textContent()) ?? '').replace(/\D/g, ''), 10);
const city       = ((await firstCard.locator('span').filter({ hasText: '📍' }).textContent()) ?? '').replace('📍', '').trim();
const bookedDate = ((await firstCard.locator('span').filter({ hasText: '🗓' }).textContent()) ?? '').replace(/🗓\s*Booked\s*/i, '').trim();
const totalPrice = ((await firstCard.locator('.text-indigo-700').textContent()) ?? '').trim();

console.log({ bookingId, bookingRef, status, eventTitle, eventDate, quantity, city, bookedDate, totalPrice });
```

---

### Notes & Gotchas

**1. Customer name, email, and phone are not on this page**  
Those three fields only appear on the booking detail page (`/bookings/:id`). Click **View Details** on a card to access them.

**2. Alternative way to get the booking ID**  
You can also pull the ID from the "View Details" link URL instead of the badge:
```js
const href = await firstCard.getByRole('link', { name: 'View Details' }).getAttribute('href');
const bookingId = href.split('/').pop(); // "/bookings/42" → "42"
```

**3. Status badge selector**  
The Badge component renders as a `<span>`. If `getByText(/confirmed|cancelled/i)` matches more than one element on the page, scope it tighter:
```js
firstCard.locator('span').filter({ hasText: /^(confirmed|cancelled)$/ }).first()
```
