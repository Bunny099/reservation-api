# reservation-api

A backend service for **room reservations with fixed capacity**.

The system models a simple hotel booking flow where reservations are time-bound and **overbooking is never allowed**, even with concurrent requests.

---

## What it does

* Create rooms with a fixed capacity
* Reserve a room slot for a limited time
* Prevent reservations beyond capacity
* Free capacity when reservations expire
* Cancel reservations safely

---

## Core Rule

> ACTIVE and non-expired reservations
> must never exceed room capacity.

All booking logic enforces this rule.

---

## Tech Stack

* **Bun**
* Express
* Prisma
* PostgreSQL

Backend only. No auth, no UI, no background workers.

---

## API Routes

* **POST `/rooms`** – create a room
* **GET `/rooms/:id`** – get room availability
* **POST `/reservation`** – create a reservation (concurrency-safe)
* **DELETE `/reservation/:id`** – cancel a reservation (idempotent)

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


