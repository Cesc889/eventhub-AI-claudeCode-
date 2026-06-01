# EventHub — Booking Management Test Scenarios

**Feature area:** Booking Management (view list, view detail, cancel booking, clear all, refund eligibility)  
**Generated:** 2026-05-21  
**Total scenarios:** 55

---

## Table of Contents

| Range | Category | Count |
|---|---|---|
| BM-001 → BM-007 | Happy Path | 7 |
| BM-010 → BM-020 | Business Rules | 11 |
| BM-030 → BM-039 | Security | 10 |
| BM-050 → BM-060 | Negative / Error | 11 |
| BM-070 → BM-079 | Edge Cases | 10 |
| BM-090 → BM-102 | UI State | 13 |

---

## Happy Path

---

### BM-001 — View Bookings List

**Category:** Happy Path | **Layer:** E2E

**Preconditions**
- Logged in as `rahulshetty1@gmail.com`
- Account has ≥1 confirmed booking

**Steps**
1. Navigate to `http://localhost:3000/bookings`

**Expected Result**
- "My Bookings" heading renders
- Each `[data-testid="booking-card"]` displays: `.booking-ref`, event title, date, quantity, city, booking date, and total price in USD
- "View Details" button visible on every card
- "Cancel Booking" button visible on confirmed booking cards

**Business Rules:** Flow 5 — View My Bookings

---

### BM-002 — View Single Booking Detail Page

**Category:** Happy Path | **Layer:** E2E

**Preconditions**
- User logged in
- Has ≥1 confirmed booking

**Steps**
1. Navigate to `/bookings`
2. Click "View Details" on any booking card
3. Observe the resulting `/bookings/:id` page

**Expected Result**
- Breadcrumb shows "My Bookings / {bookingRef}"
- Status badge "confirmed" renders in green
- **Event Details** section: title, category, date, venue, city
- **Customer Details** section: name, email, phone
- **Payment Summary** section: quantity, price per ticket, total paid
- "Check eligibility for refund?" link visible
- "Cancel Booking" button visible
- "← Back to My Bookings" button visible at bottom

**Business Rules:** Flow 6 — View Booking Detail

---

### BM-003 — Cancel Booking from Detail Page

**Category:** Happy Path | **Layer:** E2E

**Preconditions**
- User logged in
- A confirmed booking exists; navigated to `/bookings/:id`

**Steps**
1. Click "Cancel Booking"
2. Observe the ConfirmDialog appears with title "Cancel this booking?"
3. Click `[data-testid="confirm-dialog-yes"]` ("Yes, cancel it")

**Expected Result**
- Toast "Booking cancelled successfully" appears
- User redirected to `/bookings`
- Cancelled booking no longer appears in the list
- `DELETE /api/bookings/:id` → HTTP 200 `{ success: true, message: "Booking cancelled" }`

**Business Rules:** Flow 7 — Cancel a Booking; "Cancelling a booking permanently deletes the record"

---

### BM-004 — Cancel Booking from the Bookings List (BookingCard)

**Category:** Happy Path | **Layer:** E2E

**Preconditions**
- User logged in
- A confirmed booking is visible in the list

**Steps**
1. Navigate to `/bookings`
2. Click `[data-testid="cancel-booking-btn"]` on a booking card
3. Click `[data-testid="confirm-dialog-yes"]` in the ConfirmDialog

**Expected Result**
- Toast "Booking cancelled successfully" appears
- Booking card disappears from the list
- React Query cache invalidated; list refetches

**Business Rules:** Flow 7; BookingCard cancel button triggers the same flow as the detail page

---

### BM-005 — Clear All Bookings

**Category:** Happy Path | **Layer:** E2E

**Preconditions**
- User logged in
- Account has ≥2 bookings

**Steps**
1. Navigate to `/bookings`
2. Click "Clear all bookings" link (top-right corner)
3. Click OK in the browser `confirm()` dialog

**Expected Result**
- All bookings are removed
- Page shows EmptyState "No bookings yet" with "Browse Events" button
- `DELETE /api/bookings` → HTTP 200 `{ success: true, message: "N booking(s) cleared" }`

**Business Rules:** Flow 11 — Clear All Bookings; `clearAllBookings` service

---

### BM-006 — Lookup Booking by Reference via API

**Category:** Happy Path | **Layer:** API

**Preconditions**
- User authenticated
- Booking with `bookingRef` "W-A1B2C3" exists and belongs to the user

**Steps**
1. `GET /api/bookings/ref/W-A1B2C3` with `Authorization: Bearer <token>`

**Expected Result**
- HTTP 200
- Response body: `{ success: true, data: { id, bookingRef: "W-A1B2C3", event: { title, ... }, customerName, quantity, totalPrice, status, ... } }`
- Nested `event` object included in response

**Business Rules:** `GET /api/bookings/ref/:ref` endpoint

---

### BM-007 — Navigate Back to Bookings List from Detail Page

**Category:** Happy Path | **Layer:** E2E

**Preconditions**
- User is on `/bookings/:id`

**Steps**
1. Click "← Back to My Bookings" button at the bottom of the page

**Expected Result**
- User navigated to `/bookings`
- Bookings list renders correctly

**Business Rules:** —

---

## Business Rules

---

### BM-010 — FIFO Pruning Deletes Oldest Booking from a Different Event (Preferred Path)

**Category:** Business Rules | **Layer:** API

**Preconditions**
- User has exactly 9 bookings across ≥2 different events
- Oldest booking is for Event A
- New booking will be for Event B

**Steps**
1. Note the oldest booking ID (for Event A)
2. `POST /api/bookings` with:
   ```json
   { "eventId": <eventB_id>, "customerName": "John Smith", "customerEmail": "john@test.com", "customerPhone": "9876543210", "quantity": 1 }
   ```
3. `GET /api/bookings` and check the results

**Expected Result**
- HTTP 201 for the new booking
- Total booking count = 9 (unchanged)
- Oldest booking from Event A is deleted
- New Event B booking is present
- FIFO prefers deleting a booking from a *different* event

**Business Rules:** "Max bookings per user: 9. FIFO pruning prefers deleting from a different event"

---

### BM-011 — FIFO Same-Event Fallback Permanently Burns Seats

**Category:** Business Rules | **Layer:** API

**Preconditions**
- User has exactly 9 bookings, ALL for Event X
- Event X has ≥2 available seats

**Steps**
1. Note Event X's current `availableSeats`
2. `POST /api/bookings` for Event X with `quantity: 1`
3. `GET /api/events/:eventX_id` after booking

**Expected Result**
- HTTP 201 for the new booking
- Total bookings = 9 (oldest deleted)
- `availableSeats` for Event X **decremented by 1** permanently via `eventRepository.decrementSeats`
- This seat burn does NOT restore if the new booking is later cancelled

**Business Rules:** `sameEventFallback` path in `bookingService.createBooking`; `decrementSeats` is called only when the same-event fallback occurs

---

### BM-012 — Booking Ref Prefix Uppercases the Event Title's First Character

**Category:** Business Rules | **Layer:** E2E + API

**Preconditions**
- User logged in
- An event with title "world health summit" (starts with lowercase 'w') exists and is bookable

**Steps**
1. Navigate to the event detail page
2. Fill form: name "John Smith", email "john@test.com", phone "9876543210", qty 1
3. Click "Confirm Booking"
4. Read `.booking-ref` on the confirmation card

**Expected Result**
- `bookingRef` starts with "W-" (lowercase 'w' is uppercased)
- Remaining 6 characters match `[A-Z0-9]`
- Full ref matches regex `/^W-[A-Z0-9]{6}$/`

**Business Rules:** "`bookingRef` format: first char of event title (uppercase) + `-` + 6 alphanumeric chars"

---

### BM-013 — Booking Ref Format and Total Price Validated via API

**Category:** Business Rules | **Layer:** API

**Preconditions**
- User authenticated
- Seeded event "Dilli Diwali Mela" (starts with 'D', price ₹300) is accessible

**Steps**
1. `POST /api/bookings` with eventId of "Dilli Diwali Mela" and `quantity: 2`
2. Inspect `data.bookingRef` and `data.totalPrice` in the response

**Expected Result**
- `bookingRef` matches `/^D-[A-Z0-9]{6}$/`
- `totalPrice = 600` (₹300 × 2)
- `status` is "confirmed"

**Business Rules:** bookingRef prefix rule; `totalPrice = price × quantity`

---

### BM-014 — Total Price Calculated as Price × Quantity

**Category:** Business Rules | **Layer:** E2E + API

**Preconditions**
- User logged in
- Seeded event "World Tech Summit" (price ₹1500) is accessible

**Steps**
1. Navigate to "World Tech Summit" event detail
2. Set quantity to 3
3. Fill form and confirm booking
4. View `/bookings/:id`

**Expected Result**
- `totalPrice = 4500`
- Payment Summary shows:
  - "Tickets: 3"
  - "Price per ticket: $1,500"
  - "Total Paid: $4,500"
- API response `data.totalPrice = 4500`

**Business Rules:** "`totalPrice` is calculated server-side as `price × quantity`"

---

### BM-015 — Refund Eligibility: 1 Ticket → Eligible

**Category:** Business Rules | **Layer:** E2E

**Preconditions**
- User has a confirmed booking with `quantity = 1`
- Navigated to `/bookings/:id`

**Steps**
1. Click `#check-refund-btn` ("Check eligibility for refund?")
2. Observe `[data-testid="refund-spinner"]` immediately after clicking
3. Wait ≥4 seconds
4. Observe `[data-testid="refund-result"]`

**Expected Result**
- Immediately after click: spinner visible, button gone
- After ~4 seconds: green result box appears — "**Eligible for refund.** Single-ticket bookings qualify for a full refund."
- Spinner is gone
- No backend API call is made (logic is client-side only)

**Business Rules:** "1 ticket booked → Eligible for refund; simulated 4-second delay; logic lives entirely in frontend"

---

### BM-016 — Refund Eligibility: Multiple Tickets → Not Eligible

**Category:** Business Rules | **Layer:** E2E

**Preconditions**
- User has a confirmed booking with `quantity = 3`
- Navigated to `/bookings/:id`

**Steps**
1. Click `#check-refund-btn`
2. Wait ≥4 seconds
3. Observe `[data-testid="refund-result"]`

**Expected Result**
- Red result box appears: "**Not eligible for refund.** Group bookings (3 tickets) are non-refundable."
- Quantity number "3" is dynamically rendered from `booking.quantity`
- No backend API call made

**Business Rules:** "More than 1 ticket → Not eligible for refund (group bookings are non-refundable)"

---

### BM-017 — "Cancel Booking" Button Only Renders for Confirmed Status

**Category:** Business Rules | **Layer:** E2E

**Preconditions**
- User on booking detail page
- Booking has `status = "confirmed"`

**Steps**
1. Navigate to `/bookings/:id` for a confirmed booking
2. Observe whether the Cancel Booking button is present

**Expected Result**
- "Cancel Booking" button is rendered and visible
- Conditional in code: `{booking.status === 'confirmed' && <Button variant="danger">Cancel Booking</Button>}`
- Button would not render if status were not "confirmed"

**Business Rules:** Booking cancellation deletes the record so only "confirmed" bookings appear naturally; the conditional guards against edge cases

---

### BM-018 — Available Seats Are Computed Per-User (Static Events)

**Category:** Business Rules | **Layer:** E2E

**Preconditions**
- User has booked 3 tickets for seeded "World Tech Summit" (500 totalSeats)
- Static event DB seats are never decremented

**Steps**
1. Navigate to the "World Tech Summit" event detail page
2. Observe the available seat count

**Expected Result**
- UI shows 497 available seats (500 − 3 booked by this user)
- Other users' bookings do **not** reduce this count (static event seats never decrement in DB)

**Business Rules:** "availableSeats shown in UI is the personal available count (seats not consumed by current user's bookings)"; static events' DB seats never decrement

---

### BM-019 — Cancelling a Booking Restores Seat Availability (Dynamic Events)

**Category:** Business Rules | **Layer:** E2E + API

**Preconditions**
- User created a dynamic event with `totalSeats = 10`
- User booked 2 tickets; personal available seats = 8

**Steps**
1. Note the event's current available seats (8)
2. `DELETE /api/bookings/:id` to cancel the 2-ticket booking
3. Navigate to the event detail page

**Expected Result**
- Available seats = 10 after cancellation
- Booking record is deleted; dynamic computation removes the 2 booked quantities, restoring full availability

**Business Rules:** "Cancelling a booking permanently deletes the record"; dynamic event seats computed as `totalSeats − sum(user's booking quantities)`

---

### BM-020 — Bookings API Supports Pagination

**Category:** Business Rules | **Layer:** API

**Preconditions**
- User authenticated
- Has ≥1 booking

**Steps**
1. `GET /api/bookings?page=1&limit=5`

**Expected Result**
- HTTP 200
- Response includes: `pagination: { total, page: 1, limit: 5, totalPages: Math.ceil(total/5) }`
- `data` array has ≤5 items
- Items ordered by `createdAt` descending

**Business Rules:** Pagination in `bookingService.getBookings`; default limit is 10, overridable with `limit` query param

---

## Security

---

### BM-030 — Cross-User GET Booking by ID Returns 403 (Access Denied)

**Category:** Security | **Layer:** E2E + API

**Preconditions**
- User A (`rahulshetty1@gmail.com`) has a booking with ID X
- User B (`rahulshetty1@yahoo.com`) is authenticated with their own valid JWT

**Steps**
1. Log in as User A, note booking ID X
2. Log in as User B
3. `GET /api/bookings/:userA_bookingId` with User B's JWT
4. Navigate to `/bookings/:userA_bookingId` as User B

**Expected Result**
- **API:** HTTP 403 `{ success: false, error: "You are not authorized to view this booking" }`
- **UI:** EmptyState with title "Access Denied", description "You are not authorized to view this booking.", and "View My Bookings" button
- "Booking not found" is NOT shown

**Business Rules:** `getBookingById` uses `findByIdOnly` (no userId filter) then explicit ownership check → ForbiddenError → 403; Regression flow R23

---

### BM-031 — Cross-User DELETE Booking Returns 404, Not 403 (Code Divergence)

**Category:** Security | **Layer:** API

> ⚠️ **Bug / Code Divergence:** `business-rules.md` documents HTTP 403 for this scenario. The actual code returns 404.

**Preconditions**
- User A has a confirmed booking with ID X
- User B is authenticated

**Steps**
1. Obtain User A's booking ID X
2. `DELETE /api/bookings/:userA_bookingId` with User B's JWT
3. Verify booking still exists: `GET /api/bookings/:id` with User A's JWT

**Expected Result**
- HTTP **404** `{ success: false, error: "Booking with id X not found" }`
- Booking is **not deleted**
- User A's booking remains intact when accessed with User A's token

**Root Cause:** `cancelBooking` (line 128, `bookingService.js`) uses `findById(id, userId)` which filters by userId. For another user's booking ID, this returns `null` → `NotFoundError` (404). The `ForbiddenError` check on line 129 is **unreachable dead code**.

**Business Rules:** Code divergence — documented behavior is 403, actual behavior is 404

---

### BM-032 — Cross-User GET Booking by Ref Returns 403

**Category:** Security | **Layer:** API

**Preconditions**
- User A has a booking with `bookingRef` "W-A1B2C3"
- User B is authenticated

**Steps**
1. `GET /api/bookings/ref/W-A1B2C3` with User B's JWT

**Expected Result**
- HTTP 403 `{ success: false, error: "You do not own this booking" }`
- `getBookingByRef` uses `findByRef` (no userId filter) then explicit ownership check → ForbiddenError

**Business Rules:** `bookingService.getBookingByRef`: `booking.userId !== userId` → ForbiddenError

---

### BM-033 — Missing JWT on GET /api/bookings Returns 401

**Category:** Security | **Layer:** API

**Preconditions**
- No JWT

**Steps**
1. `GET /api/bookings` without any `Authorization` header

**Expected Result**
- HTTP 401 `{ success: false, error: "Unauthorized" }`

**Business Rules:** authMiddleware: missing `Bearer` header → 401

---

### BM-034 — Missing JWT on POST /api/bookings Returns 401

**Category:** Security | **Layer:** API

**Preconditions**
- No JWT

**Steps**
1. `POST /api/bookings` with a valid body but no `Authorization` header:
   ```json
   { "eventId": 1, "customerName": "John Smith", "customerEmail": "john@test.com", "customerPhone": "9876543210", "quantity": 1 }
   ```

**Expected Result**
- HTTP 401 `{ success: false, error: "Unauthorized" }`
- No booking is created

**Business Rules:** `router.use(authMiddleware)` applies to all booking routes

---

### BM-035 — Missing JWT on DELETE /api/bookings/:id Returns 401

**Category:** Security | **Layer:** API

**Preconditions**
- No JWT; a booking ID exists

**Steps**
1. `DELETE /api/bookings/:id` without an `Authorization` header

**Expected Result**
- HTTP 401
- Booking is not deleted

**Business Rules:** authMiddleware on all booking routes

---

### BM-036 — Missing JWT on DELETE /api/bookings (Clear All) Returns 401

**Category:** Security | **Layer:** API

**Preconditions**
- No JWT

**Steps**
1. `DELETE /api/bookings` without an `Authorization` header

**Expected Result**
- HTTP 401
- No bookings are deleted

**Business Rules:** authMiddleware; `clearAllBookings` requires an authenticated user

---

### BM-037 — Tampered or Expired JWT Returns 401

**Category:** Security | **Layer:** API

**Preconditions**
- A tampered JWT string

**Steps**
1. `GET /api/bookings` with `Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.tampered.signature`

**Expected Result**
- HTTP 401 `{ success: false, error: "Invalid or expired token" }`

**Business Rules:** authMiddleware: `jwt.verify` throws → catch block returns "Invalid or expired token"

---

### BM-038 — Mass Assignment: userId in Request Body Is Ignored

**Category:** Security | **Layer:** API

**Preconditions**
- User A is authenticated (userId = A)
- User B's userId (= B) is known

**Steps**
1. `POST /api/bookings` with **User A's JWT** but include `userId: B` in the request body:
   ```json
   { "userId": "<userB_id>", "eventId": 1, "customerName": "John Smith", "customerEmail": "john@test.com", "customerPhone": "9876543210", "quantity": 1 }
   ```

**Expected Result**
- HTTP 201
- Created booking has `userId = A` (from `req.user.userId`), not B
- User B's account is unaffected
- `userId` in the request body is silently ignored

**Business Rules:** `bookingController`: `bookingService.createBooking(req.body, req.user.userId)` — userId is always sourced from the verified JWT, never from the request body

---

### BM-039 — Unauthenticated Browser Access to /bookings Redirects to /login

**Category:** Security | **Layer:** E2E

**Preconditions**
- No JWT in localStorage (fresh session)

**Steps**
1. Clear localStorage
2. Navigate to `http://localhost:3000/bookings`

**Expected Result**
- Redirected to `/login`
- `/bookings` page is not rendered
- AuthGuard blocks access

**Business Rules:** "All routes except /login and /register are guarded by AuthGuard — unauthenticated users are redirected to /login"

---

## Negative / Error

---

### BM-050 — Booking a Non-Existent Event Returns 404

**Category:** Negative/Error | **Layer:** API

**Preconditions**
- User authenticated
- eventId 999999 does not exist

**Steps**
1. `POST /api/bookings`:
   ```json
   { "eventId": 999999, "customerName": "John Smith", "customerEmail": "john@test.com", "customerPhone": "9876543210", "quantity": 1 }
   ```

**Expected Result**
- HTTP 404 `{ success: false, error: "Event with id 999999 not found" }`

**Business Rules:** `bookingService.createBooking` — event lookup fails → `NotFoundError`

---

### BM-051 — Booking When Personal Seats Are Exhausted Returns 400

**Category:** Negative/Error | **Layer:** API

**Preconditions**
- User authenticated
- User has booked all personal seats for Event X (personalAvailable = 0)

**Steps**
1. `POST /api/bookings`:
   ```json
   { "eventId": <X>, "customerName": "John Smith", "customerEmail": "john@test.com", "customerPhone": "9876543210", "quantity": 1 }
   ```

**Expected Result**
- HTTP 400 `{ success: false, error: "Only 0 seat(s) available, but 1 requested" }`

**Business Rules:** `InsufficientSeatsError` when `personalAvailable < quantity`; personal availability = `event.availableSeats − sum(user's booked quantities)`

---

### BM-052 — Quantity = 0 Returns 400 Validation Error

**Category:** Negative/Error | **Layer:** API

**Preconditions**
- User authenticated

**Steps**
1. `POST /api/bookings` with `quantity: 0` (all other fields valid)

**Expected Result**
- HTTP 400
  ```json
  { "success": false, "error": "Validation failed", "details": [{ "field": "quantity", "message": "Quantity must be an integer between 1 and 10" }] }
  ```

**Business Rules:** bookingValidator: `isInt({ min: 1, max: 10 })`

---

### BM-053 — Quantity = 11 Returns 400 Validation Error

**Category:** Negative/Error | **Layer:** API

**Preconditions**
- User authenticated

**Steps**
1. `POST /api/bookings` with `quantity: 11` (all other fields valid)

**Expected Result**
- HTTP 400 `{ details: [{ field: "quantity", message: "Quantity must be an integer between 1 and 10" }] }`

**Business Rules:** bookingValidator: `max: 10`

---

### BM-054 — Invalid Customer Email Returns 400

**Category:** Negative/Error | **Layer:** API

**Preconditions**
- User authenticated

**Steps**
1. `POST /api/bookings` with `customerEmail: "not-an-email"` (all other fields valid)

**Expected Result**
- HTTP 400 `{ details: [{ field: "customerEmail", message: "Customer email must be a valid email address" }] }`

**Business Rules:** bookingValidator: `.isEmail()`

---

### BM-055 — Customer Name Too Short Returns 400

**Category:** Negative/Error | **Layer:** API

**Preconditions**
- User authenticated

**Steps**
1. `POST /api/bookings` with `customerName: "J"` (1 character; all other fields valid)

**Expected Result**
- HTTP 400 `{ details: [{ field: "customerName", message: "Customer name must be at least 2 characters" }] }`

**Business Rules:** bookingValidator: `isLength({ min: 2 })`

---

### BM-056 — Invalid Customer Phone Returns 400

**Category:** Negative/Error | **Layer:** API

**Preconditions**
- User authenticated

**Steps**
1. `POST /api/bookings` with `customerPhone: "123"` (fewer than 10 digits)
2. Repeat with `customerPhone: "abcdefghij"` (contains invalid characters)

**Expected Result**
- Case 1 → HTTP 400: "Customer phone must be at least 10 digits"
- Case 2 → HTTP 400: "Customer phone must contain only digits and +, -, spaces, or parentheses"

**Business Rules:** bookingValidator: `isLength({ min: 10 })` and `matches(/^[0-9+\-\s()]+$/)`

---

### BM-057 — Cancelling a Non-Existent Booking Returns 404

**Category:** Negative/Error | **Layer:** API

**Preconditions**
- User authenticated
- Booking ID 999999 does not exist

**Steps**
1. `DELETE /api/bookings/999999` with valid JWT

**Expected Result**
- HTTP 404 `{ success: false, error: "Booking with id 999999 not found" }`

**Business Rules:** `cancelBooking` → `findById(999999, userId)` returns null → `NotFoundError`

---

### BM-058 — Non-Existent Booking ID: 404 from API and "Booking Not Found" in UI

**Category:** Negative/Error | **Layer:** E2E + API

**Preconditions**
- User authenticated
- Booking ID 999999 does not exist

**Steps**
1. (API) `GET /api/bookings/999999` with valid JWT
2. (UI) Navigate to `/bookings/999999`

**Expected Result**
- **API:** HTTP 404 `{ error: "Booking with id 999999 not found" }`
- **UI:** EmptyState with title "Booking not found", description "This booking doesn't exist or may have been cancelled.", and "View My Bookings" button
- "Access Denied" is **not** shown

**Business Rules:** `getBookingById` → `NotFoundError` → 404; frontend non-403 error branch renders "Booking not found"

---

### BM-059 — Non-Existent Booking Ref Returns 404

**Category:** Negative/Error | **Layer:** API

**Preconditions**
- User authenticated
- Ref "X-NOTFOUND" does not exist

**Steps**
1. `GET /api/bookings/ref/X-NOTFOUND` with valid JWT

**Expected Result**
- HTTP 404 `{ success: false, error: "Booking with reference \"X-NOTFOUND\" not found" }`

**Business Rules:** `getBookingByRef` → `findByRef` returns null → `NotFoundError`

---

### BM-060 — Empty Request Body Returns 400 with All Field Errors

**Category:** Negative/Error | **Layer:** API

**Preconditions**
- User authenticated

**Steps**
1. `POST /api/bookings` with an empty body `{}`

**Expected Result**
- HTTP 400 `{ success: false, error: "Validation failed", details: [...] }`
- `details` array lists all 5 required fields: `eventId`, `customerName`, `customerEmail`, `customerPhone`, `quantity`

**Business Rules:** bookingValidator: all fields marked `notEmpty()`

---

## Edge Cases

---

### BM-070 — 9th Booking Is Accepted Without Pruning

**Category:** Edge Case | **Layer:** API

**Preconditions**
- User has exactly 8 bookings

**Steps**
1. Create 1 more booking (9th total) via `POST /api/bookings`
2. `GET /api/bookings`
3. Verify the count

**Expected Result**
- HTTP 201
- Total count = 9
- No pruning occurred — the pruning condition (`count >= 9`) is checked before creating the new record; at 8, the threshold is not met

**Business Rules:** FIFO triggers at `count >= MAX_USER_BOOKINGS (9)`; 8 bookings → 9th is accepted without pruning

---

### BM-071 — 10th Booking Triggers FIFO and Count Stays at 9

**Category:** Edge Case | **Layer:** API

**Preconditions**
- User has exactly 9 bookings across ≥2 different events

**Steps**
1. Record the oldest booking ID and its event
2. Create the 10th booking for a different event via `POST /api/bookings`
3. `GET /api/bookings` and check the total

**Expected Result**
- HTTP 201 for the new booking
- Total count = 9 (one was pruned)
- Oldest booking (different event) is deleted
- New booking is present
- `findOldestUserBookingExcludingEvent` is used first for preferred pruning

**Business Rules:** FIFO triggers at `count >= 9`; preferred pruning uses `findOldestUserBookingExcludingEvent`

---

### BM-072 — Quantity = 1 (Minimum Boundary)

**Category:** Edge Case | **Layer:** E2E

**Preconditions**
- User logged in
- Event has ≥1 seat available

**Steps**
1. Navigate to the event detail page
2. Leave ticket counter at 1 (default minimum)
3. Fill form: name "John Smith", email "john@test.com", phone "9876543210"
4. Click "Confirm Booking"

**Expected Result**
- Booking created with `quantity = 1`
- `totalPrice = event.price × 1`
- Booking ref shown on confirmation card
- `quantity: 1` in API response

**Business Rules:** quantity minimum boundary = 1; `isInt({ min: 1 })`

---

### BM-073 — Quantity = 10 (Maximum Boundary)

**Category:** Edge Case | **Layer:** E2E

**Preconditions**
- User logged in
- Event has ≥10 available seats

**Steps**
1. Navigate to the event detail page
2. Click "+" 9 times to reach quantity 10 in `#ticket-count`
3. Verify the "+" button is disabled at 10
4. Fill form and click "Confirm Booking"

**Expected Result**
- Booking created with `quantity = 10`
- `totalPrice = event.price × 10`
- The "+" increment button is disabled and cannot go above 10

**Business Rules:** quantity maximum boundary = 10; `isInt({ max: 10 })`; UI counter should cap at 10

---

### BM-074 — Refund Eligibility Boundary: Quantity = 2 Is Not Eligible

**Category:** Edge Case | **Layer:** E2E

**Preconditions**
- User has a confirmed booking with `quantity = 2`

**Steps**
1. Navigate to `/bookings/:id`
2. Click `#check-refund-btn`
3. Wait ≥4 seconds
4. Observe `[data-testid="refund-result"]`

**Expected Result**
- Red result box: "**Not eligible for refund.** Group bookings (2 tickets) are non-refundable."
- "2" is rendered from `booking.quantity`
- Quantity = 2 is the first ineligible value (only `quantity === 1` qualifies)

**Business Rules:** Refund threshold: `quantity === 1` → eligible; `quantity === 2` is the first ineligible value

---

### BM-075 — Lowercase Event Title First Char Is Uppercased in Booking Ref

**Category:** Edge Case | **Layer:** API

**Preconditions**
- User created an event with title "annual tech meetup" (all lowercase, starts with 'a')

**Steps**
1. `POST /api/bookings` for the event
2. Inspect `data.bookingRef` in the response

**Expected Result**
- `bookingRef` starts with "A-" (`.toUpperCase()` applied to 'a')
- Remaining 6 chars are alphanumeric
- Matches `/^A-[A-Z0-9]{6}$/`

**Business Rules:** `randomRef`: `prefix = (eventTitle?.[0] ?? 'E').toUpperCase()`

---

### BM-076 — Event Title Starting with a Digit Uses Digit as Ref Prefix

**Category:** Edge Case | **Layer:** API

**Preconditions**
- User created an event with title "100 Days of Code" (starts with digit '1')

**Steps**
1. `POST /api/bookings` for the event
2. Inspect `data.bookingRef` in the response

**Expected Result**
- `bookingRef` starts with "1-XXXXXX" (digit used as-is; `.toUpperCase()` has no effect on digits)
- Matches `/^1-[A-Z0-9]{6}$/`

**Business Rules:** `randomRef`: prefix = first char of title; digits are valid prefix characters

---

### BM-077 — Clear All Bookings When No Bookings Exist Returns 200

**Category:** Edge Case | **Layer:** API

**Preconditions**
- User authenticated
- User has 0 bookings

**Steps**
1. `DELETE /api/bookings` with valid JWT

**Expected Result**
- HTTP 200 `{ success: true, message: "0 booking(s) cleared" }`
- No error thrown
- Prisma `deleteMany` returns `{ count: 0 }` on an empty result set

**Business Rules:** `clearAllBookings` → `bookingRepository.deleteAllForUser` → Prisma `deleteMany` returns `{ count: 0 }` when nothing to delete

---

### BM-078 — Booking Ref Collision Triggers Retry and Timestamp Fallback

**Category:** Edge Case | **Layer:** Unit

**Preconditions**
- Unit test environment
- Mock `bookingRepository.findByRef` to return existing records for the first 9 calls, `null` on the 10th

**Steps**
1. Call `generateUniqueRef("Wonderfest")` in the unit test
2. Assert the result format

**Expected Result**
- Returns a valid ref starting with "W-"
- Exactly 10 `findByRef` calls are made (max retries)
- No infinite loop
- If mock returns an existing record for all 10 calls, falls back to timestamp-based ref: `W-${Date.now().toString(36).toUpperCase().slice(-8)}`

**Business Rules:** `generateUniqueRef` — up to 10 retries, then timestamp fallback

---

### BM-079 — Filter Bookings by Event ID via API

**Category:** Edge Case | **Layer:** API

**Preconditions**
- User authenticated
- Has bookings for ≥2 different events
- One eventId is known

**Steps**
1. `GET /api/bookings?eventId=:knownEventId`

**Expected Result**
- HTTP 200
- `data` contains only bookings for the specified event
- Bookings for other events are excluded
- `pagination.total` reflects the filtered count

**Business Rules:** `bookingRepository.findAll`: `if (eventId) where.eventId = Number(eventId)`

---

## UI State

---

### BM-090 — Bookings List Shows Skeleton Cards While Loading

**Category:** UI State | **Layer:** E2E

**Preconditions**
- User navigates to `/bookings`
- Network throttled to simulate a slow response

**Steps**
1. Navigate to `/bookings` with throttled network
2. Observe the page before the API response arrives

**Expected Result**
- 5 `BookingCardSkeleton` divs rendered with `animate-pulse` class
- No real booking data is visible yet
- Skeleton placeholders disappear once `isLoading` becomes false

**Business Rules:** `isLoading` branch: `Array.from({ length: 5 }).map(... <BookingCardSkeleton />)`

---

### BM-091 — Bookings List Shows Error State When Backend Is Unavailable

**Category:** UI State | **Layer:** E2E

**Preconditions**
- Backend is unavailable (server down or mocked 500)
- User navigates to `/bookings`

**Steps**
1. Navigate to `/bookings` with backend down

**Expected Result**
- EmptyState renders with:
  - Title: "Couldn't load bookings"
  - Description: "Failed to connect to the server. Please try again."
  - "Retry" button
- Clicking "Retry" calls `refetch()`

**Business Rules:** `isError` branch in `BookingsContent`

---

### BM-092 — Bookings List Shows Empty State When User Has No Bookings

**Category:** UI State | **Layer:** E2E

**Preconditions**
- User logged in
- Account has 0 bookings

**Steps**
1. Navigate to `/bookings`

**Expected Result**
- EmptyState renders with:
  - Title: "No bookings yet"
  - Description: "You haven't booked any events yet. Browse upcoming events and grab your tickets!"
  - "Browse Events" button linking to `/events`
- "Clear all bookings" link is still visible in the header

**Business Rules:** `bookings.length === 0` branch; `!isLoading && !isError && bookings.length === 0`

---

### BM-093 — Booking Detail Page Shows Spinner While Loading

**Category:** UI State | **Layer:** E2E

**Preconditions**
- User navigates to `/bookings/:id`
- Network throttled

**Steps**
1. Navigate to `/bookings/:id` with throttled network
2. Observe immediately before the API response

**Expected Result**
- Full-page centered `Spinner size="lg"` is visible inside a `min-h-[60vh]` container
- No booking detail content is shown
- Spinner disappears once the response arrives

**Business Rules:** `isLoading` branch in `BookingDetailPage`

---

### BM-094 — Booking Detail Shows "Access Denied" for 403 Response

**Category:** UI State | **Layer:** E2E

**Preconditions**
- User B logged in
- User A's booking ID is known

**Steps**
1. As User B, navigate to `/bookings/:userA_bookingId`
2. Observe the rendered page

**Expected Result**
- EmptyState with:
  - Title: "Access Denied"
  - Description: "You are not authorized to view this booking."
  - "View My Bookings" button
- "Booking not found" is **not** shown

**Business Rules:** Frontend checks `error.status === 403` to differentiate "Access Denied" from "Booking not found"

---

### BM-095 — Booking Detail Shows "Booking Not Found" for 404 Response

**Category:** UI State | **Layer:** E2E

**Preconditions**
- User logged in
- Booking ID 999999 does not exist

**Steps**
1. Navigate to `/bookings/999999`

**Expected Result**
- EmptyState with:
  - Title: "Booking not found"
  - Description: "This booking doesn't exist or may have been cancelled."
  - "View My Bookings" button
- "Access Denied" is **not** shown

**Business Rules:** Non-403 error branch in `BookingDetailPage` renders "Booking not found"

---

### BM-096 — Refund Eligibility Cycles Through Three Distinct States

**Category:** UI State | **Layer:** E2E

**Preconditions**
- User on `/bookings/:id`
- Refund section is in the initial idle state

**Steps**
1. Confirm `#check-refund-btn` ("Check eligibility for refund?") is visible
2. Click it
3. Observe **immediately**: `[data-testid="refund-spinner"]` visible, button gone
4. Wait ≥4 seconds
5. Observe `[data-testid="refund-result"]` visible, spinner gone

**Expected Result**
Three sequential, distinct states:
1. **Idle** — button visible, no spinner, no result
2. **Checking** — spinner visible, button gone, no result
3. **Result** — result card visible, spinner gone, button gone

State machine is one-directional; there is no way to reset to idle once triggered.

**Business Rules:** `RefundEligibility` component `status` state: idle → checking → eligible/ineligible; `setTimeout(..., 4000)`

---

### BM-097 — Cancel Booking from List Page Shows ConfirmDialog

**Category:** UI State | **Layer:** E2E

**Preconditions**
- User on `/bookings`
- ≥1 confirmed booking card is visible

**Steps**
1. Click `[data-testid="cancel-booking-btn"]` on a booking card

**Expected Result**
- `ConfirmDialog` modal opens with:
  - Title: "Cancel this booking?"
  - Description: "This will cancel {bookingRef} and release {quantity} seat(s) back to the event. This action cannot be undone."
  - `[data-testid="confirm-dialog-yes"]` button with label "Yes, cancel it"
  - "Cancel" dismiss button
- No API call is made at this point

**Business Rules:** Two-step confirmation prevents accidental deletion; BookingCard `ConfirmDialog`

---

### BM-098 — Dismissing ConfirmDialog Does Not Cancel the Booking

**Category:** UI State | **Layer:** E2E

**Preconditions**
- ConfirmDialog is open from the list page

**Steps**
1. Click `[data-testid="cancel-booking-btn"]` to open the dialog
2. Click the "Cancel" (dismiss) button in the dialog

**Expected Result**
- Dialog closes
- No API call is made
- Booking card remains in the list
- "Cancel Booking" button is still present
- `onClose` sets `confirm = false`; `handleCancel` only runs via `onConfirm`

**Business Rules:** `onClose` handler; `handleCancel` only runs via the `onConfirm` callback

---

### BM-099 — ConfirmDialog Shows Loading State While Cancellation Is In Progress

**Category:** UI State | **Layer:** E2E

**Preconditions**
- Cancellation ConfirmDialog is open
- Network throttled

**Steps**
1. Click `[data-testid="confirm-dialog-yes"]`
2. Observe the dialog immediately before the API response arrives

**Expected Result**
- `[data-testid="confirm-dialog-yes"]` shows a loading spinner (`Button loading={isLoading}`)
- "Cancel" dismiss button is disabled (`disabled={isLoading}`)
- Clicking outside the modal or pressing Esc has no effect (`onClose={!isLoading ? onClose : undefined}`)

**Business Rules:** `isLoading={isPending}` from `useCancelBooking`; Modal blocks dismissal while loading

---

### BM-100 — "Clear All Bookings" Button Shows "Clearing…" While In Progress

**Category:** UI State | **Layer:** E2E

**Preconditions**
- User on `/bookings` with bookings
- Network throttled

**Steps**
1. Click "Clear all bookings"
2. Click OK in the browser `confirm()` dialog
3. Observe the button state while the API call is in flight

**Expected Result**
- Button text changes to "Clearing…"
- Button is disabled (`disabled={clearing}`)
- `opacity-50` styling applied
- Once the request completes (`finally` block), `clearing = false` and the list refetches

**Business Rules:** `clearing` state: set `true` before `bookingsApi.clearAll()`, reset to `false` in `finally`

---

### BM-101 — Pagination Renders When Total Bookings Exceed Page Size

**Category:** UI State | **Layer:** API + E2E

**Preconditions**
- API returns `pagination.totalPages > 1` (achievable by querying with a small `limit`)

**Steps**
1. `GET /api/bookings?limit=3` when user has >3 bookings
2. Observe the UI pagination controls

**Expected Result**
- **API:** `pagination.totalPages > 1`
- **UI:** `Pagination` component renders with correct `currentPage` and `totalPages`
- Clicking page 2 updates URL to `?page=2`
- React Query refetches with the new page param

**Business Rules:** Pagination component in `BookingsContent`; `changePage` updates URL search params

---

### BM-102 — Status Badge Renders Green for Confirmed, Red for Cancelled

**Category:** UI State | **Layer:** E2E

**Preconditions**
- User on `/bookings` with a confirmed booking visible

**Steps**
1. Observe the Badge on a confirmed booking card
2. Observe the Badge on the booking detail page

**Expected Result**
- `Badge variant="success"` renders green "confirmed" text on both card and detail page
- The conditional `variant={booking.status === 'confirmed' ? 'success' : 'danger'}` drives the color
- The "cancelled" (red) badge variant exists in code but is only observable via direct DB manipulation — `cancelBooking` deletes the record rather than setting `status = 'cancelled'`

**Business Rules:** BookingCard and `BookingDetailPage`: `Badge variant={booking.status === 'confirmed' ? 'success' : 'danger'}`

---

## Gaps and Ambiguities

### 1. Critical Code Divergence — Cross-User DELETE Returns 404, Not 403 (BM-031)

`business-rules.md` states cross-user booking cancellation returns HTTP 403. However, `bookingService.cancelBooking` (line 128) uses `bookingRepository.findById(id, userId)` which filters by BOTH `id` AND `userId`. For another user's booking, this returns `null` → `NotFoundError` (404). The `ForbiddenError` check on line 129 is **dead code that can never be reached**.

This differs from `getBookingById` (correctly returns 403) and `getBookingByRef` (also 403). The practical consequence: DELETE leaks less information than GET (404 doesn't reveal whether a booking exists), which is arguably more secure — but it is undocumented and inconsistent.

### 2. Refund Eligibility Is Entirely Client-Side

The 4-second delay and eligibility logic live in `RefundEligibility` component via `setTimeout`. No backend refund API exists. Refund scenarios cannot be tested at the API layer. If the eligibility rule ever changes, only the frontend needs updating.

### 3. `clearAllBookings` Bypasses Per-Booking Cancellation Logic

`DELETE /api/bookings` calls `bookingRepository.deleteAllForUser` (bulk `deleteMany`) directly, bypassing `cancelBooking`. If seat restoration or other side-effects are added to `cancelBooking` in future, `clearAll` would silently skip them.

### 4. Cancelled Bookings Are Deleted, Not Flagged

The `Booking` model has a `status` field (`confirmed`/`cancelled`) and both badge variants are rendered in the UI. However, `cancelBooking` **deletes** the record rather than setting `status = 'cancelled'`. The red "cancelled" badge (BM-102) can only be reached via direct DB manipulation, not through the application.

### 5. FIFO Same-Event Fallback Permanently Burns Static Event Seats

When all 9 bookings are for the same *static* event and a 10th is created, the `sameEventFallback` path calls `eventRepository.decrementSeats` on the static event. Static event DB seats normally never decrement, so this creates an anomalous permanent reduction. This nested edge case (FIFO + same-event + static event) has no existing test coverage.

### 6. `#ticket-count` Selector Not Verified

The domain docs reference `#ticket-count` for the quantity counter on the event detail page. This selector was not verified against `frontend/app/events/[id]/page.tsx` during this analysis. Confirm the actual selector exists before writing E2E tests for BM-073.

---

## Booking Creation — Dilli Diwali Mela (3-Ticket Flow)

**Feature area:** Booking Creation — validate booking reference ID and total amount for a 3-ticket purchase  
**Generated:** 2026-06-01  
**Total scenarios:** 2

| TC No | Category | Preconditions | Steps | Expected Result | Business Rules | Suggested Layer |
|---|---|---|---|---|---|---|
| DDM-001 | Business Rules | Logged in as `rahulshetty1@gmail.com`. The static event "Dilli Diwali Mela" exists (seeded). No prior bookings for this event in this session (so `personalAvailable` ≥ 3). | 1. Navigate to `http://localhost:3000/events`. 2. Locate the "Dilli Diwali Mela" event card and click it to open the event detail page. 3. On the booking panel, click the `+` button twice to set the ticket counter (`#ticket-count`) to `3`. 4. Enter `Test User` in the Full Name field (`#customerName`). 5. Enter `rahulshetty1@gmail.com` in the Email field (`#customer-email`). 6. Enter `+91-9876543210` in the Phone Number field (`#phone`). 7. Click the "Confirm Booking" button (`#confirm-booking`). 8. Wait for the confirmation card to appear. 9. Read the value of `.booking-ref`. | - Booking confirmation card is displayed with heading "Booking Confirmed! 🎉". - The `.booking-ref` element is visible and its text matches the regex `/^D-[A-Z0-9]{6}$/` (exactly 1 uppercase letter D, a hyphen, then 6 uppercase alphanumeric characters). - The prefix `D` corresponds to the first character of "Dilli Diwali Mela" uppercased. - No other prefix character (e.g. `W-`, `H-`) is acceptable. | "Booking ref first character = event title first character (uppercase)" — `bookingService.js` `randomRef()` sets `prefix = eventTitle[0].toUpperCase()`, producing `D-` for "Dilli Diwali Mela". Cited as R25 in regression test flows. | E2E |
| DDM-002 | Happy Path | Logged in as `rahulshetty1@gmail.com`. The static event "Dilli Diwali Mela" exists (seeded, price = $300). No prior bookings that would exhaust `personalAvailable` for this event. | 1. Navigate to `http://localhost:3000/events`. 2. Locate the "Dilli Diwali Mela" event card and click it to open the event detail page. 3. On the booking panel, click the `+` button twice to set the ticket counter (`#ticket-count`) to `3`. 4. Verify the price summary box shows `$300 × 3 tickets` on the left and `$300` repeated as line total, then a **Total** row showing `$900`. 5. Enter `Test User` in the Full Name field (`#customerName`). 6. Enter `rahulshetty1@gmail.com` in the Email field (`#customer-email`). 7. Enter `+91-9876543210` in the Phone Number field (`#phone`). 8. Click the "Confirm Booking" button (`#confirm-booking`). 9. Wait for the confirmation card to appear. 10. Read the "Total" row value inside the `.bg-indigo-50` confirmation summary. | - **Pre-submission (step 4):** Price summary box shows `$300 × 3 tickets` and the bold Total row shows `$900` (formatted via `Intl.NumberFormat` `currency: USD`). - **Post-confirmation (step 10):** The "Total" row in the confirmation card displays `$900`. - The `totalPrice` field returned by `POST /api/bookings` equals `900` (numeric, `parseFloat(300) × 3`). - No mismatch between the pre-booking preview and the confirmed total. | "Total price = price × quantity" — `bookingService.js:99` computes `totalPrice = parseFloat(event.price) * data.quantity`; 3 × 300 = 900. Cited as R10 in regression test flows. | E2E + API |
