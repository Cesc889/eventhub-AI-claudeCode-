## Database Models & Schema

### User
| Column | Type | Notes |
|---|---|---|
| id | Int (PK, auto) | |
| email | String (unique) | Used as login identifier |
| password | String | bcrypt-hashed |
| createdAt | DateTime | |
| events | Event[] | User-created events |
| bookings | Booking[] | User's bookings |

### Event
| Column | Type | Notes |
|---|---|---|
| id | Int (PK, auto) | |
| title | String | |
| description | Text | |
| category | String | Conference / Concert / Sports / Workshop / Festival |
| venue | String | |
| city | String | |
| eventDate | DateTime | Must be in the future on create/update |
| price | Decimal(10,2) | Per-ticket price |
| totalSeats | Int | Set once on creation |
| availableSeats | Int | Computed dynamically per user in service layer |
| imageUrl | String? | Optional URL |
| isStatic | Boolean (default false) | true = seeded/featured event, immutable |
| userId | Int? | null for static events; FK → User |
| createdAt | DateTime | |
| updatedAt | DateTime | |

### Booking
| Column | Type | Notes |
|---|---|---|
| id | Int (PK, auto) | |
| eventId | Int (FK → Event, cascade delete) | |
| userId | Int (FK → User, cascade delete) | |
| customerName | String | Min 2 chars |
| customerEmail | String | Valid email, normalised |
| customerPhone | String | Min 10 digits, digits/+/-/spaces/parens only |
| quantity | Int | 1–10 |
| totalPrice | Decimal(10,2) | price × quantity, calculated server-side |
| status | String (default "confirmed") | "confirmed" or "cancelled" |
| bookingRef | String (unique) | Format: `<EventTitleFirstChar>-XXXXXX` (e.g. `W-A1B2C3`) |
| createdAt | DateTime | |
| updatedAt | DateTime | |