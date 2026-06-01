## User Flow Journeys

### 1. Registration Flow
1. Navigate to `/register`
2. Enter email, password (must meet strength requirements), confirm password
3. Click "Create Account"
4. On success: JWT stored, redirected to `/events`

### 2. Login Flow
1. Navigate to `/login`
2. Enter email and password
3. Click "Sign In"
4. On success: JWT stored, redirected to `/events`
5. On failure: toast error ("Invalid credentials" / "User not found")

### 3. Browse & Filter Events
1. After login, lands on `/events`
2. View paginated event cards (12 per page)
3. Apply filters: Category dropdown, City dropdown, Search text box
4. Filters update URL query params; results refresh automatically
5. Pagination controls navigate between pages

### 4. Book a Ticket
1. From `/events`, click an event card → navigates to `/events/:id`
2. View event details (date, venue, city, price, available seats)
3. In the "Book Tickets" panel (right side):
   - Adjust quantity using +/− buttons (1 to min(10, availableSeats))
   - Enter customer name, email, phone number
   - Price summary auto-updates as quantity changes
4. Click "Confirm Booking"
5. On success: confirmation card shown inline with bookingRef, quantity, total price
6. Links to "View My Bookings" and "Browse More Events"

### 5. View My Bookings
1. Navigate to `/bookings`
2. Paginated list of all user bookings (10 per page), each showing event name, bookingRef, status badge, date, price
3. Click a booking card → navigates to `/bookings/:id`

### 6. View Booking Detail
1. On `/bookings/:id`, see all booking info: event details, customer details, payment summary
2. Status badge: green "confirmed" or red "cancelled"
3. "Cancel Booking" button visible for confirmed bookings
4. "Check eligibility for refund?" link triggers 4-second check
   - quantity = 1 → shows green "Eligible for refund"
   - quantity > 1 → shows red "Not eligible for refund"

### 7. Cancel a Booking
1. On `/bookings/:id`, click "Cancel Booking"
2. Confirmation dialog appears: "Cancelling [ref] will release N seat(s) back to the event. This cannot be undone."
3. Click "Yes, cancel it"
4. On success: toast "Booking cancelled successfully", redirected to `/bookings`

### 8. Create an Event (Admin)
1. Navigate to `/admin/events`
2. Fill in the "New Event" form: title, description, category, venue, city, date (future), price, totalSeats, optional imageUrl
3. Click submit
4. On success: event appears in the events table below the form
5. If 6-event limit is reached, oldest event is silently replaced

### 9. Edit an Event
1. On `/admin/events`, click "Edit" for a user-owned event
2. Form at the top pre-fills with event data
3. Modify fields and submit
4. On success: event row updates in table

### 10. Delete an Event
1. On `/admin/events`, click "Delete" for a user-owned event
2. Confirmation dialog: "This will permanently delete the event and all associated bookings."
3. Confirm → event is removed from table (optimistic update, rollback on error)

### 11. Clear All Bookings
1. On `/bookings`, click "Clear all bookings" (small red link, top-right)
2. Browser `confirm()` dialog: "Clear all your bookings? This cannot be undone."
3. On confirm: all bookings deleted, list refreshes to empty state

### 12. Cross-User Booking Access Attempt
1. User A creates a booking → gets bookingId X
2. User B (different account) navigates to `/bookings/X`
3. Page shows "Access Denied — You are not authorized to view this booking"

---