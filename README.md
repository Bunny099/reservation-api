# reservation-api

A backend service for room reservations with fixed capacity and user-based ownership.

The system models a realistic hotel booking flow using temporary reservation holds and explicit confirmation, while preventing overbooking even under concurrent requests.


---

## Features

- Create rooms with a fixed capacity
- Create users
- Temporarily hold a room slot (PENDING reservation)
- Explicitly confirm reservations
- Prevent overbooking with transactional guarantees
- Cancel confirmed reservations safely
- Enforce reservation ownership

---


## Core Invariant

> The number of confirmed reservations for a room must never exceed the room’s capacity.

>This invariant is enforced using transactional checks during reservation confirmation.

---

## Reservation Lifecycle
```
PENDING → CONFIRM
PENDING → EXPIRED
CONFIRM → CANCELLED
```
- `PENDING` represents a temporary hold with an expiry time
- Only `CONFIRM` reservations consume room capacity
- Expired reservations can never be confirmed
- Reservations are never deleted


---
## Ownership Rule

> Every reservation belongs to exactly one user.
> Only the user who created a reservation can confirm or cancel it.

User identity is passed explicitly at the API level.
(Authentication is intentionally out of scope.)

---


## API Routes

### Rooms
* POST `/rooms`
* GET `/rooms/:id/availability`

### Users
* POST `/user`
* GET `/users/:id/reservations`

### Reservations
* POST `/reservation`
* POST `/reservation/:id/confirm`
* POST `/reservation/:id/cancel`

---

## Tech Stack

* **Bun**
* Express
* Prisma
* PostgreSQL

Backend only. No authentication, idempotency keys, UI, or background workers.

---

## Run Locally

```bash
bun install
bunx prisma migrate dev
bunx prisma generate
bun run dev
```

PostgreSQL must be running and configured.

---


