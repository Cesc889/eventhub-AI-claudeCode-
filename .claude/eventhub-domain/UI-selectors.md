## Error Scenarios Reference

| Scenario | HTTP Status | Error Message |
|---|---|---|
| Missing/invalid token | 401 | "Unauthorized" |
| Register with duplicate email | 400 | "Email already in use" |
| Login with wrong password | 400 | "Invalid credentials" |
| Login with unknown email | 404 | "User not found" |
| Event not found | 404 | "Event with id X not found" |
| Booking not found | 404 | "Booking with id X not found" |
| Access another user's booking | 403 | "You are not authorized to view this booking" |
| Edit/delete static event | 403 | "Cannot modify a static event" / "Cannot delete a static event" |
| Edit/delete someone else's event | 403 | "You do not own this event" |
| Insufficient seats | 400 | "Only N seat(s) available, but M requested" |
| Past event date on create | 400 | "Event date must be in the future" |
| Quantity out of range (0 or >10) | 400 | "Quantity must be an integer between 1 and 10" |
| Invalid phone (< 10 digits) | 400 | "Customer phone must be at least 10 digits" |
| Invalid email format | 400 | "A valid email is required" / "Customer email must be a valid email address" |
| Non-URL imageUrl | 400 | "Image URL must be a valid URL" |