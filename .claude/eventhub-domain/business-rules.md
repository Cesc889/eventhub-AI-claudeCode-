## Business Rules

### Authentication
- Password must be at least 6 characters (backend validation).
- Registration UI enforces a stronger policy: min 8 chars, 1 uppercase, 1 number, 1 special character.
- Duplicate email registration returns HTTP 400.
- JWT tokens expire after 7 days.
- All `/api/events` and `/api/bookings` routes require a valid Bearer token.

### Events
- **Max user-created events: 6.** When a 7th event is created, the oldest user-created event (and its bookings) is automatically deleted (FIFO pruning).
- Static events (`isStatic: true`) cannot be edited or deleted — attempts return HTTP 403 `Cannot modify/delete a static event`.
- A user can only edit/delete their own events — attempting another user's event returns HTTP 403 `You do not own this event`.
- `availableSeats` is automatically set equal to `totalSeats` on creation.
- `eventDate` must be a future date; past dates return HTTP 400 `Event date must be in the future`.
- Required fields: title, category, venue, city, eventDate, price, totalSeats.

### Bookings
- **Max bookings per user: 9.** When a 10th booking is created, the oldest booking is automatically deleted (FIFO pruning). The system prefers deleting a booking from a *different* event; if all bookings are for the same event, it falls back to deleting the oldest one.
- `quantity` must be between 1 and 10.
- `totalPrice` is calculated server-side as `price × quantity`.
- `bookingRef` format: first character of the event title (uppercase) + `-` + 6 alphanumeric chars (e.g. event "World Tech Summit" → `W-A1B2C3`).
- Booking a cancelled or non-existent event returns HTTP 404.
- If requested quantity exceeds personal available seats: HTTP 400 `Only N seat(s) available, but M requested`.
- Cancelling a booking permanently deletes the record (`DELETE /api/bookings/:id`).
- A user cannot view or cancel another user's booking — HTTP 403 `Access Denied` / `You are not authorized to view this booking`.

### Refund Eligibility (client-side only)
- 1 ticket booked → **Eligible for refund** (full refund).
- More than 1 ticket → **Not eligible for refund** (group bookings are non-refundable).
- The check has a simulated 4-second delay (spinner shown during check).
- This logic lives entirely in the frontend — there is no backend refund API.

---