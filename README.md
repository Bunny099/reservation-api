# reservation-api

A backend service for room reservations with fixed capacity and user-based ownership.

The system models a simple hotel booking flow where reservations are time-bound and **overbooking is never allowed**, even with concurrent requests.

---

## What it does

* Create rooms with a fixed capacity
* Reserve a room slot for a limited time
* Prevent reservations beyond capacity
* Free capacity when reservations expire
* Cancel reservations safely
* Create users
* Enforce reservation ownership (only the creator can cancel)

---

## Core Rule

> ACTIVE and non-expired reservations
> must never exceed room capacity.

All booking logic enforces this rule.

---
## Ownership Rule

> Every reservation belongs to exactly one user.
> Only the user who created a reservation can cancel it.

User identity is passed explicitly at the API level.
(Authentication is intentionally out of scope.)

---
## Tech Stack

* **Bun**
* Express
* Prisma
* PostgreSQL

Backend only. No auth, no UI, no background workers.

---

## API Routes

### Rooms
* POST `/rooms`
* GET `/rooms/:id`

### Users
* POST `/user`
* GET `/users/:id/reservations`

### Reservations
* POST `/reservation`
* DELETE `/reservation/:id`

---

## Reservation States

```
ACTIVE → CANCELLED
ACTIVE → EXPIRED
```

Reservations are never deleted.

---

## Key Backend Concepts Used

* Capacity invariants
* Derived availability
* Serializable transactions
* Concurrency-safe booking
* Idempotent delete with no-op success
* Reservation ownership enforcement

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


