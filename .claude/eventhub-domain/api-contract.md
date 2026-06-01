
## API Endpoints

All endpoints are prefixed with `/api`. All `/events` and `/bookings` routes require `Authorization: Bearer <token>`.

### Auth Endpoints

#### `POST /api/auth/register`
- **When called**: User submits the registration form
- **Auth required**: No
- **Request body**: `{ email, password }`
- **Success**: HTTP 201, returns `{ success, token, user: { id, email } }`
- **Test data**: `{ "email": "testuser@example.com", "password": "Test@12345" }`
- **Error scenarios**:
  - 400: Invalid email format → `{ error: "Validation failed", details: [{ field: "email", message: "A valid email is required" }] }`
  - 400: Password < 6 chars → `{ error: "Validation failed", details: [{ field: "password", message: "Password must be at least 6 characters" }] }`
  - 400: Email already registered → `{ error: "Email already in use" }` (or similar)

#### `POST /api/auth/login`
- **When called**: User submits the login form
- **Auth required**: No
- **Request body**: `{ email, password }`
- **Success**: HTTP 200, returns `{ success, token, user: { id, email } }`
- **Test data**: `{ "email": "rahulshetty1@gmail.com", "password": "Magiclife1!" }`
- **Error scenarios**:
  - 400: Wrong password → `{ success: false, error: "Invalid credentials" }`
  - 404: Email not found → `{ success: false, error: "User not found" }`
  - 400: Invalid email format → validation error

#### `GET /api/auth/me`
- **When called**: App startup / token validation check
- **Auth required**: Yes (Bearer token)
- **Success**: HTTP 200, returns `{ success, user: { userId, email } }`
- **Error scenarios**:
  - 401: Missing or expired token → `{ success: false, error: "Unauthorized" }`

---

### Event Endpoints

#### `GET /api/events`
- **When called**: Events listing page loads or filters change
- **Auth required**: Yes
- **Query params**: `category`, `city`, `search`, `page` (default 1), `limit` (default 10, max 100)
- **Success**: HTTP 200, returns `{ success, data: Event[], pagination: { total, page, limit, totalPages } }`
- **Test data**: `GET /api/events?category=Conference&city=Hyderabad&page=1&limit=12`
- **Error scenarios**:
  - 401: No/invalid token
  - 500: Server error

#### `GET /api/events/:id`
- **When called**: Event detail page loads
- **Auth required**: Yes
- **Success**: HTTP 200, returns `{ success, data: Event }`
- **Test data**: `GET /api/events/1`
- **Error scenarios**:
  - 404: `{ success: false, error: "Event with id 99 not found" }`
  - 401: Unauthorized

#### `POST /api/events`
- **When called**: User submits the Create Event form
- **Auth required**: Yes
- **Request body**: `{ title, description?, category, venue, city, eventDate (ISO8601, future), price, totalSeats, imageUrl? }`
- **Success**: HTTP 201, returns `{ success, data: Event, message: "Event created successfully" }`
- **Test data**:
  ```json
  {
    "title": "Playwright Workshop",
    "category": "Workshop",
    "venue": "Online",
    "city": "Bangalore",
    "eventDate": "2027-03-01T10:00:00.000Z",
    "price": 500,
    "totalSeats": 50
  }
  ```
- **Error scenarios**:
  - 400: Missing required field → `{ error: "Validation failed", details: [...] }`
  - 400: Past eventDate → `{ details: [{ field: "eventDate", message: "Event date must be in the future" }] }`
  - 400: Non-URL imageUrl → `{ details: [{ field: "imageUrl", message: "Image URL must be a valid URL" }] }`

#### `PUT /api/events/:id`
- **When called**: User submits the Edit Event form
- **Auth required**: Yes
- **Request body**: Same as POST
- **Success**: HTTP 200, returns `{ success, data: Event, message: "Event updated successfully" }`
- **Error scenarios**:
  - 400: Validation failure
  - 403: `Cannot modify a static event`
  - 403: `You do not own this event`
  - 404: Event not found

#### `DELETE /api/events/:id`
- **When called**: User confirms delete dialog on `/admin/events`
- **Auth required**: Yes
- **Success**: HTTP 200, returns `{ success, message: "Event deleted successfully" }`
- **Error scenarios**:
  - 403: `Cannot delete a static event`
  - 403: `You do not own this event`
  - 404: Event not found

---

### Booking Endpoints

#### `GET /api/bookings`
- **When called**: My Bookings page loads or page changes
- **Auth required**: Yes
- **Query params**: `eventId`, `status` (confirmed/cancelled), `page` (default 1), `limit` (default 10, max 100)
- **Success**: HTTP 200, returns `{ success, data: Booking[], pagination }`
- **Test data**: `GET /api/bookings?status=confirmed&page=1&limit=10`
- **Error scenarios**:
  - 401: Unauthorized

#### `GET /api/bookings/ref/:ref`
- **When called**: Looking up a booking by its reference code
- **Auth required**: Yes
- **Success**: HTTP 200, returns `{ success, data: Booking }`
- **Test data**: `GET /api/bookings/ref/W-A1B2C3`
- **Error scenarios**:
  - 404: `{ error: "Booking with reference \"W-XXXXXX\" not found" }`
  - 403: Booking belongs to another user

#### `GET /api/bookings/:id`
- **When called**: Booking detail page loads
- **Auth required**: Yes
- **Success**: HTTP 200, returns `{ success, data: Booking }` (includes nested event)
- **Error scenarios**:
  - 403: `{ error: "You are not authorized to view this booking" }` (cross-user access)
  - 404: Booking not found

#### `POST /api/bookings`
- **When called**: User clicks "Confirm Booking" on the event detail page
- **Auth required**: Yes
- **Request body**: `{ eventId, customerName, customerEmail, customerPhone, quantity }`
- **Success**: HTTP 201, returns `{ success, data: Booking, message: "Booking confirmed!" }`
- **Test data**:
  ```json
  {
    "eventId": 1,
    "customerName": "Jane Doe",
    "customerEmail": "jane.doe@example.com",
    "customerPhone": "+91-9876543210",
    "quantity": 1
  }
  ```
- **Error scenarios**:
  - 400: Missing/invalid fields → `{ error: "Validation failed", details: [...] }`
  - 400: Quantity 0 or > 10 → `{ details: [{ field: "quantity", message: "Quantity must be an integer between 1 and 10" }] }`
  - 400: Insufficient seats → `{ error: "Only N seat(s) available, but M requested" }`
  - 404: Event not found → `{ error: "Event with id X not found" }`
  - 401: Unauthorized

#### `DELETE /api/bookings/:id`
- **When called**: User confirms booking cancellation dialog
- **Auth required**: Yes
- **Success**: HTTP 200, returns `{ success, message: "Booking cancelled" }`
- **Error scenarios**:
  - 403: `You do not own this booking`
  - 404: Booking not found

#### `DELETE /api/bookings`
- **When called**: User confirms "Clear all bookings" on `/bookings`
- **Auth required**: Yes
- **Success**: HTTP 200, returns `{ success, deleted: N }` (count of deleted bookings)
- **Error scenarios**:
  - 401: Unauthorized

---