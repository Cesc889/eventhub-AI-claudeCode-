---
name: eventhub-domain
description: Comprehensive overview of the EventHub project, including architecture, tech stack, database schema, seeded test data, API contracts, user flows, and key UI selectors. This is the primary reference for designing test scenarios.
user-invocable: false
---

# EventHub Domain Knowledge

EventHub is a full-stack event ticket booking platform built as a QA practice environment. It provides real REST APIs, an isolated per-user sandbox, and production-grade flows covering authentication, event management, and ticket booking. It is designed to be tested with tools such as Playwright, Selenium, and RestAssured.

---

## Project Overview

- **Purpose**: QA training platform where each registered user gets a fully isolated sandbox — events and bookings are private to their account.
- **Frontend URL**: http://localhost:3000
- **Backend URL**: http://localhost:3001
- **API Base**: http://localhost:3001/api
- **Swagger Docs**: http://localhost:3001/docs
- **Auth**: JWT tokens, 7-day expiry, sent as `Authorization: Bearer <token>`

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, React Query v5 |
| Backend | Express.js (Node.js), Prisma ORM |
| Database | MySQL 8+ |
| Auth | JWT (jsonwebtoken), bcryptjs |
| Validation | express-validator (backend), inline JS (frontend) |
| Testing | Playwright (Chromium only) |

---

## Frontend Architecture

```
frontend/
├── app/                        # Next.js App Router pages
│   ├── page.tsx                # Root — redirects to /events
│   ├── login/page.tsx          # Login page (id="email", id="password", id="login-btn")
│   ├── register/page.tsx       # Register page (id="register-email", id="register-password", id="register-btn")
│   ├── events/
│   │   ├── page.tsx            # Events listing with filters + pagination
│   │   └── [id]/page.tsx       # Event detail + inline booking form
│   ├── bookings/
│   │   ├── page.tsx            # My Bookings list with "Clear all bookings" link
│   │   └── [id]/page.tsx       # Booking detail with refund eligibility + cancel button
│   └── admin/
│       ├── events/page.tsx     # Create / Edit / Delete events (CRUD table)
│       └── bookings/page.tsx   # Admin bookings view
├── components/
│   ├── auth/AuthGuard.tsx      # Redirects unauthenticated users to /login
│   ├── events/EventCard.tsx    # Card shown in events grid
│   ├── events/EventFilters.tsx # Category / City / Search filters
│   ├── events/EventForm.tsx    # Create/Edit event form
│   ├── bookings/BookingCard.tsx
│   └── ui/                     # Button, Input, Toast, Badge, Spinner, Pagination, ConfirmDialog, EmptyState
├── lib/
│   ├── api/
│   │   ├── client.ts           # Axios instance — attaches JWT from localStorage
│   │   ├── events.ts           # eventsApi (getEvents, getEvent, createEvent, updateEvent, deleteEvent)
│   │   └── bookings.ts         # bookingsApi (getBookings, getBooking, createBooking, cancelBooking, clearAll)
│   └── hooks/
│       ├── useAuth.tsx         # login(), register(), logout(), user state
│       ├── useEvents.ts        # useEvents, useEvent, useCreateEvent, useUpdateEvent, useDeleteEvent
│       └── useBookings.ts      # useBookings, useBooking, useCreateBooking, useCancelBooking
└── types/index.ts              # TypeScript interfaces: User, Event, Booking, PaginationMeta
```

### Key Frontend Behaviours
- All routes except `/login` and `/register` are guarded by `AuthGuard` — unauthenticated users are redirected to `/login`.
- JWT is stored in `localStorage` and attached by the Axios client on every request.
- React Query is used for all data fetching; cache is invalidated on mutation success.
- Toast notifications appear on success/error for bookings, event mutations, and login errors.
- The `availableSeats` shown in the UI is the **personal available count** (seats not yet consumed by the current user's own bookings), not the raw DB value.
- Static (featured) events display a green "Featured" badge and show "Read-only" in the admin table — they cannot be edited or deleted.

---

## Backend Architecture

```
backend/
├── server.js                   # Entry: starts Express on port 3001
├── app.js                      # Mounts middleware + routes under /api
├── prisma/
│   ├── schema.prisma           # DB schema (User, Event, Booking)
│   └── seed.js                 # Seeds 2 test users + 3 static events
└── src/
    ├── config/
    │   ├── database.js         # Prisma client singleton
    │   └── env.js              # Environment variable loader
    ├── routes/
    │   ├── authRoutes.js       # POST /auth/register, POST /auth/login, GET /auth/me
    │   ├── eventRoutes.js      # GET|POST /events, GET|PUT|DELETE /events/:id
    │   └── bookingRoutes.js    # GET|POST /bookings, GET /bookings/ref/:ref, GET|DELETE /bookings/:id, DELETE /bookings
    ├── controllers/            # Thin request/response handlers — delegate to services
    ├── services/
    │   ├── authService.js      # register, login (bcrypt + JWT)
    │   ├── eventService.js     # CRUD + FIFO pruning + per-user seat calculation
    │   └── bookingService.js   # Create/cancel/list bookings + FIFO pruning
    ├── repositories/           # All Prisma queries (findAll, findById, create, update, delete)
    ├── validators/
    │   ├── eventValidator.js   # express-validator rules for event fields
    │   └── bookingValidator.js # express-validator rules for booking fields
    ├── middleware/
    │   ├── authMiddleware.js   # Verifies JWT, attaches req.userId
    │   └── errorHandler.js     # Centralised error → JSON response mapper
    └── utils/errors.js         # Custom error classes: NotFoundError, ForbiddenError, ValidationError, InsufficientSeatsError
```

### Request Flow
```
HTTP Request
  → authMiddleware (all /events and /bookings routes)
  → Route
  → Controller (parse req, call service, send res)
  → Service (business logic, throw custom errors)
  → Repository (Prisma query)
  → Database (MySQL)
```

---



### Relationships
- `User → Events`: one-to-many (cascade delete)
- `User → Bookings`: one-to-many (cascade delete)
- `Event → Bookings`: one-to-many (cascade delete)

---

## Seeded Test Data

### Test Users (seeded by `npm run seed`)
| Email | Password |
|---|---|
| rahulshetty1@gmail.com | Magiclife1! |
| rahulshetty1@yahoo.com | Magiclife1! |

> Note: These are demo/sample credentials. The login page will show a warning if these accounts don't exist and a login fails — users are encouraged to register their own accounts.

### Static (Featured) Events
| Title | Category | City | Price | Seats |
|---|---|---|---|---|
| World Tech Summit | Conference | Hyderabad | ₹1500 | 500 |
| Hollywood Monsoon Night — Los Angeles | Concert | Los Angeles | ₹2500 | 3000 |
| Dilli Diwali Mela | Festival | Delhi | ₹300 | 10000 |

Static events are always visible to all users, cannot be edited or deleted, and their seats never actually decrement in the database (availability is computed per user in the service layer).

---





## Regression Test Flows

These are the critical flows that must pass on every release:

| # | Flow | What to Verify |
|---|---|---|
| R1 | Register new user | Account created, JWT stored, redirect to /events |
| R2 | Login with valid credentials | JWT stored, redirect to /events |
| R3 | Login with wrong password | Error toast "Invalid credentials" |
| R4 | Login with non-existent email | Error toast "User not found" |
| R5 | Browse events (no filter) | Event grid loads, pagination works |
| R6 | Filter events by category | Only matching events shown |
| R7 | Filter events by city | Only matching events shown |
| R8 | Search events by keyword | Matches title/description/venue |
| R9 | Book 1 ticket (happy path) | Confirmation shown, bookingRef starts with event title first char |
| R10 | Book multiple tickets | Total price = price × quantity |
| R11 | Book when sold out | "Sold Out" button, cannot submit |
| R12 | Book with invalid phone | Field error: "Enter a valid 10-digit phone" |
| R13 | View booking detail | All fields shown correctly |
| R14 | Refund check — 1 ticket | Shows "Eligible for refund" after ~4s |
| R15 | Refund check — 2+ tickets | Shows "Not eligible for refund" after ~4s |
| R16 | Cancel a booking | Booking removed, redirect to /bookings |
| R17 | Create event | Event appears in table and /events |
| R18 | Edit event | Updated values reflected |
| R19 | Delete event | Event gone from table, associated bookings deleted |
| R20 | Static event is read-only | No edit/delete buttons, shows "Read-only" |
| R21 | FIFO — 7th event auto-deletes oldest | Only 6 user events in table after 7th create |
| R22 | FIFO — 10th booking auto-deletes oldest | Only 9 bookings after 10th create |
| R23 | Cross-user booking access | HTTP 403 → "Access Denied" page |
| R24 | Unauthenticated access to /events | Redirect to /login |
| R25 | bookingRef prefix matches event title | First char of ref matches first char of event title |

---

## Test Data

### User Accounts
| Purpose | Email | Password |
|---|---|---|
| Primary test user | rahulshetty1@gmail.com | Magiclife1! |
| Secondary test user (cross-user tests) | rahulshetty1@yahoo.com | Magiclife1! |
| Register test | newuser+{timestamp}@test.com | Test@12345 |

### Event Test Data (for Create/Edit)
| Field | Valid Example | Invalid Example |
|---|---|---|
| title | "Playwright Workshop 2026" | "" (empty) |
| category | "Workshop" | "Hackathon" (not in enum) |
| venue | "Online / Zoom" | "" (empty) |
| city | "Bangalore" | "" (empty) |
| eventDate | "2027-01-15T10:00:00.000Z" | "2020-01-01T00:00:00.000Z" (past date) |
| price | 999 | -100 (negative) |
| totalSeats | 100 | 0 (must be ≥ 1) |
| imageUrl | "https://example.com/img.jpg" | "not-a-url" |

### Booking Test Data
| Field | Valid Example | Invalid Example |
|---|---|---|
| customerName | "John Smith" | "J" (too short, < 2 chars) |
| customerEmail | "john.smith@example.com" | "notanemail" |
| customerPhone | "+91-9876543210" | "123" (too short) |
| quantity | 2 | 0 or 11 (out of range) |

### Booking Ref Prefix Examples
| Event Title | Expected Ref Prefix |
|---|---|
| World Tech Summit | W-XXXXXX |
| Hollywood Monsoon Night | H-XXXXXX |
| Dilli Diwali Mela | D-XXXXXX |
| Any user-created event titled "My Event" | M-XXXXXX |

---




---

## Key UI Selectors (for Playwright/Selenium)

| Element | Selector |
|---|---|
| Login email input | `#email` |
| Login password input | `#password` |
| Login submit button | `#login-btn` |
| Register email input | `#register-email` or `[data-testid="register-email"]` |
| Register password input | `#register-password` or `[data-testid="register-password"]` |
| Register submit button | `#register-btn` or `[data-testid="register-btn"]` |
| Ticket quantity counter | `#ticket-count` |
| Customer email field (booking form) | `[data-testid="customer-email"]` or `#customer-email` |
| Confirm booking button | `#confirm-booking` |
| Booking reference (confirmation) | `.booking-ref` |
| Check refund button | `[data-testid="check-refund-btn"]` or `#check-refund-btn` |
| Refund spinner | `[data-testid="refund-spinner"]` |
| Refund result | `[data-testid="refund-result"]` |
| Event table row (admin) | `[data-testid="event-table-row"]` |
| Edit event button (admin) | `[data-testid="edit-event-btn"]` |
| Delete event button (admin) | `[data-testid="delete-event-btn"]` |

Look at these based on what current task needs:

- **Business rules and validation logic** -> read through `business-rules.md` to understand all the explicit rules that must be enforced by the system. Each rule should have at least one test scenario that verifies it is correctly implemented.
- **User flows** -> read through `user-flow-journeys.md` to understand the critical user journeys that must work end-to-end. Each flow should have happy path scenarios and relevant edge cases.
- **API contract** -> read through `api-contract.md` to understand the expected request/response formats, status codes, and error messages for each endpoint. This is crucial for designing API-level test scenarios and for verifying that the frontend correctly handles different backend responses.
- **Database schema and relationships** -> read through the 'database-schemas.md' file to understand the underlying data model, how entities relate to each other, and what constraints exist at the database level. This can help in designing scenarios that test data integrity and consistency, as well as in understanding the impact of certain operations (e.g., deleting an event should cascade delete its bookings).
- ** UI states and selectors** -> read through `UI-selectors.md` to understand the different visual states of the application (loading, empty, error, success) and the key DOM selectors that can be used in automated tests to interact with the UI elements.
