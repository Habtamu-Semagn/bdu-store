# BDU Store — Campus Device Storage Management

A small, responsive web application for **Bahir Dar University** that lets campus
residents hand personal devices (desktops, laptops, mobile phones, tablets) into
the campus store for safekeeping, and request them back later.

Two roles, two applications:

| Application | Stack | Port | Purpose |
| --- | --- | --- | --- |
| `backend/` | NestJS 11 + Prisma 6 + PostgreSQL | 4000 | REST API, all business rules, Swagger docs |
| `frontend/` | Next.js 15 + TypeScript + Tailwind + shadcn/ui | 3000 | User dashboard and administrator console |

Authentication is by **university ID and password**. There is no email anywhere in the system: no email field, no email login, no email verification, no email notifications. Any non-empty university ID is accepted — the administrator can use whatever ID the university issues.

---

## Table of contents

1. [Scope](#scope)
2. [How it works](#how-it-works)
3. [Requirements](#requirements)
4. [Quick start](#quick-start)
5. [Default accounts](#default-accounts)
6. [Storage lifecycle](#storage-lifecycle)
7. [University-ID rules](#university-id-rules)
8. [Storage tokens](#storage-tokens)
9. [API reference](#api-reference)
10. [Data model](#data-model)
11. [Testing](#testing)
12. [Project structure](#project-structure)
13. [Configuration](#configuration)
14. [Security notes](#security-notes)
15. [Troubleshooting](#troubleshooting)

---

## Scope

Implemented:

- University-ID registration and login with two roles (`USER`, `ADMIN`).
- Device storage requests with a full status history.
- Administrator approval/rejection of storage, with unique storage tokens.
- Release requests with administrator approval/rejection.
- Ownership and role enforcement on the server for every operation.
- PostgreSQL persistence via Prisma, with migrations.

Deliberately **not** included: email of any kind, email verification, OTP/SMS,
payments, inventory management, e-commerce, file uploads, and public
administrator registration.

---

## How it works

1. A campus resident registers with their full name, university ID and a
   password, then logs in.
2. They submit a **storage request** for a device. The device starts as
   `PENDING` — submitting a request does **not** mean the store has received it.
3. They take the device to the store office. A clerk verifies it and approves the
   request in the administrator console. The device becomes `STORED` and receives
   a unique **storage token**.
4. When the resident wants the device back, they click **Request release**. This
   creates a release request in `PENDING`.
5. A clerk approves the release (device becomes `RELEASED`) or rejects it with a
   reason (device stays `STORED`, and the resident may ask again later).

---

## Requirements

- **Node.js 20+** and npm
- **PostgreSQL 16** (a Docker container is the quickest route)
- Docker (optional, for the database)

The repository was developed and verified with Node 20.20, PostgreSQL 16, Prisma
6.9 and NestJS 11.

---

## Quick start

### 1. Start PostgreSQL

```bash
docker run -d --name bdu-store-postgres \
  -e POSTGRES_USER=bdu \
  -e POSTGRES_PASSWORD=bdu_store_dev_pw \
  -e POSTGRES_DB=bdu_store \
  -p 127.0.0.1:5542:5432 \
  -v bdu-store-pgdata:/var/lib/postgresql/data \
  postgres:16-alpine
```

If you already have PostgreSQL running, just create a database and point
`DATABASE_URL` at it instead.

### 2. Configure and start the backend

```bash
cd backend
cp .env.example .env          # then edit if your database differs
npm install
npm run prisma:deploy         # apply migrations
npm run prisma:generate       # generate the Prisma client
npm run prisma:seed           # create the administrator account
npm run build
npm start                     # http://localhost:4000/api
```

- API base URL: <http://localhost:4000/api>
- Swagger documentation: <http://localhost:4000/api/docs>

For development with TypeScript on the fly, use `npm run start:dev` instead of
`npm run build && npm start`.

### 3. Configure and start the frontend

In a second terminal:

```bash
cd frontend
cp .env.example .env.local    # NEXT_PUBLIC_API_URL=http://localhost:4000/api
npm install
npm run dev                   # http://localhost:3000
```

Open <http://localhost:3000>, log in as the administrator (see below), and the
store console is at `/admin`.

### 4. Load demo data (optional)

```bash
cd backend
SEED_DEMO_DATA=true npm run prisma:seed
```

This adds two campus users, one device awaiting review and one device already in
storage, so the whole workflow can be exercised immediately.

---

## Default accounts

The administrator is created only by the seed script — there is no public
administrator registration.

| Role | University ID | Password | Notes |
| --- | --- | --- | --- |
| Administrator | `bdu0000001` | `Admin12345` | Development default. Override with `ADMIN_UNIVERSITY_ID` / `ADMIN_PASSWORD`. |
| Campus user (demo) | `bdu9110001` | `Demo12345` | Only with `SEED_DEMO_DATA=true` |
| Campus user (demo) | `bdu9110002` | `Demo12345` | Only with `SEED_DEMO_DATA=true` |

Creating a production administrator:

```bash
cd backend
ADMIN_FULL_NAME="Store Manager" \
ADMIN_UNIVERSITY_ID="bdu1234567" \
ADMIN_PASSWORD="a-long-strong-password" \
NODE_ENV=production \
npm run prisma:seed
```

In production the seed refuses to run without `ADMIN_UNIVERSITY_ID` and
`ADMIN_PASSWORD`, and rejects passwords shorter than 8 characters.

---

## Storage lifecycle

**Device storage status** (`Device.storageStatus`)

```
PENDING ──approve──▶ STORED ──release approved──▶ RELEASED
   │                    ▲
   └──reject──▶ REJECTED │
                         │  (release rejected: device stays STORED)
```

| Status | Meaning |
| --- | --- |
| `PENDING` | Request submitted, not yet reviewed. No token. |
| `STORED` | Received by the store and approved. Has a storage token. |
| `REJECTED` | Refused, with a reason shown to the owner. No token. |
| `RELEASED` | Release approved; the store has released the device. |

**Release request status** (`ReleaseRequest.status`)

| Status | Meaning |
| --- | --- |
| `PENDING` | Waiting for an administrator decision. |
| `APPROVED` | Approved; the device moved to `RELEASED`. |
| `REJECTED` | Refused with a reason; the device stays `STORED`. |

Rules enforced by the backend:

- A release can only be requested for a device in `STORED`.
- Only the owner can request a release for their own device.
- At most one `PENDING` release request may exist per device — enforced by a
  partial unique index in PostgreSQL, not just application logic.
- Storage approval and release approval are single transactions with
  compare-and-swap updates, so two administrators cannot both approve the same
  request.

> **Handover note.** Approving a release records the *store's* decision. It does
> not by itself prove the owner has collected the device; the physical handover
> still happens at the counter.

---

## University-ID rules

Registration and login use a Bahir Dar University ID. **No format is enforced:**
any non-empty string is accepted, so the administrator can use whatever ID the
university issues (e.g. `bdu1504757`, `bduadmin01`, or a student-number form).
The ID is stored exactly as entered, so `bdu1504757` and `BDU1504757` are two
different accounts.

The only requirement is that the ID is not empty. Both endpoints trim the
input and pass it through unchanged.

---

## Storage tokens

- Generated **only** when an administrator approves storage.
- Format: `BDU-XXXX-XXXX-XXXX-XXXX-XXXX`, using a Crockford-style base32
  alphabet (no `I`, `L`, `O`, `U`), 20 random characters = **100 bits of entropy**
  from `crypto.randomBytes`.
- Unique: enforced by a unique index on `Device.storageToken` in PostgreSQL. If
  the (astronomically unlikely) collision occurs, approval retries with a new
  token inside the same transaction.
- Users cannot choose, edit or transfer a token, and the token is never returned
  at registration time.
- A token identifies a device at the counter. **Possession of a token is not
  authorisation** to access or release a device — every action is authorised
  against the authenticated session and ownership.

---

## API reference

Base URL: `http://localhost:4000/api`. Interactive docs at `/api/docs`.

All responses use one of two envelopes:

```jsonc
// success (2xx)
{ "success": true, "data": { /* payload */ } }

// failure (4xx/5xx)
{
  "success": false,
  "statusCode": 422,
  "error": "Unprocessable Entity",
  "message": "Validation failed.",
  "errors": [{ "field": "universityId", "messages": ["…"] }],
  "path": "/api/auth/register",
  "timestamp": "2026-10-18T03:27:51.713Z"
}
```

### Authentication

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | public | Create a campus user. Body: `fullName`, `universityId`, `password`, `confirmPassword`. |
| `POST` | `/api/auth/login` | public | Log in. Body: `universityId`, `password`. Sets an HttpOnly `token` cookie and returns the token. |
| `POST` | `/api/auth/logout` | public | Clears the auth cookie. |
| `GET` | `/api/auth/me` | session | The authenticated user. |

### Devices (campus user)

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/api/devices` | session | Submit a storage request. Starts as `PENDING`. |
| `GET` | `/api/devices/my` | session | The caller's own devices with their release state. |
| `GET` | `/api/devices/:id` | session | One device (owner, or any administrator). |
| `POST` | `/api/devices/:id/release-requests` | session | Request release of a `STORED` device. |

### Administration

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/api/admin/stats` | admin | Aggregate counts per product type and storage status, plus the queues awaiting a decision. |
| `GET` | `/api/admin/storage-requests?status=PENDING` | admin | Storage requests by status. |
| `GET` | `/api/admin/devices/stored` | admin | Every device currently held. |
| `PATCH` | `/api/admin/devices/:id/approve-storage` | admin | Approve storage; issues the token. |
| `PATCH` | `/api/admin/devices/:id/reject-storage` | admin | Reject storage. Body: `rejectionReason` (required). |
| `GET` | `/api/admin/release-requests?status=PENDING` | admin | Release requests by status. |
| `PATCH` | `/api/admin/release-requests/:id/approve` | admin | Approve release; device becomes `RELEASED`. |
| `PATCH` | `/api/admin/release-requests/:id/reject` | admin | Reject release. Body: `rejectionReason` (required). Device stays `STORED`. |

### Health

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/health` | Liveness probe. |

Status codes: `200`/`201` success, `401` not authenticated, `403` wrong role or
not the owner, `404` unknown record, `409` conflicting state transition (already
decided, duplicate request), `422` validation failure.

### Administrator dashboard

`/admin` is the overview: how many devices are waiting for a review, how many the
store is holding, how many releases are awaiting a decision, and a per-category
cross-tab of every product type across the four storage statuses.

Every figure comes from `GET /api/admin/stats`, which computes them in PostgreSQL
with Prisma `groupBy` rather than counting a page of results in the browser — so
the numbers stay correct as the table grows, and they change as soon as a
decision is recorded.

---

## Data model

Three models — `User`, `Device`, `ReleaseRequest` — defined in
`backend/prisma/schema.prisma`.

**User** — `id` (UUID), `fullName`, `universityId` (unique),
`passwordHash` (argon2), `role` (`USER` | `ADMIN`), `createdAt`, `updatedAt`.
There is no email field.

**Device** — `id` (UUID), `userId` → `User`, `productType`, `productName`,
`brand?`, `model?`, `serialNumber?`, `description?`, `storageStatus`,
`storageToken?` (unique), `storageSubmittedAt`, `storageApprovedAt?`,
`storageApprovedBy?` → `User`, `storageRejectedAt?`, `storageRejectedBy?` →
`User`, `storageRejectionReason?`, `createdAt`, `updatedAt`.

**ReleaseRequest** — `id` (UUID), `deviceId` → `Device`, `requestedAt`, `status`
(`PENDING` | `APPROVED` | `REJECTED`), `reviewedAt?`, `reviewedBy?` → `User`,
`rejectionReason?`.

Product types: `DESKTOP_COMPUTER`, `LAPTOP`, `MOBILE_PHONE`, `TABLET`, `OTHER`.
A serial number is mandatory for everything except `OTHER`.

Migrations live in `backend/prisma/migrations/`:

| Migration | What it does |
| --- | --- |
| `…_init` | Creates the three tables and their unique indexes. |
| `…_add_admin_relations` | Adds the approver/reviewer foreign keys and status indexes. |
| `…_one_pending_release_per_device` | Partial unique index guaranteeing at most one `PENDING` release request per device. |

```bash
npm run prisma:migrate    # create + apply a new migration during development
npm run prisma:deploy     # apply existing migrations (CI, production)
npm run prisma:studio     # browse the data
```

---

## Testing

```bash
cd backend

npm test          # 27 unit tests
npm run test:e2e  # 45 end-to-end tests over HTTP
npm run test:cov  # unit tests with coverage
```

**Unit tests** cover university-ID normalisation and validation,
storage-token format/entropy/uniqueness, and duration parsing.

**End-to-end tests** boot the real Nest application and drive it over HTTP with
cookies, against a dedicated test database:

- registration and login with university IDs, and rejection of an `email` field
- university-ID normalisation and malformed-ID rejection
- duplicate university-ID rejection
- protected routes, role authorisation, and rejection of a forged token payload
- device ownership enforcement (another user gets `403`, an admin gets `200`)
- serial-number rules per product type
- storage approval, token generation and token uniqueness
- storage rejection with a mandatory reason, surfaced to the owner
- release eligibility, duplicate prevention, and concurrent request handling
- release approval and rejection, including the device staying `STORED`
- **prevention of duplicate and concurrent approvals** (two simultaneous
  requests: exactly one succeeds, one gets `409`)
- persistence of the full storage-to-release workflow

The e2e suite creates and migrates `bdu_store_test` automatically
(`TEST_DATABASE_URL`). It refuses to run if it is not connected to a database
whose name ends in `_test`, so it cannot wipe development data.

Frontend quality gates:

```bash
cd frontend
npm run lint       # ESLint 9 (flat config, Next core-web-vitals + TypeScript rules)
npm run typecheck  # tsc --noEmit
npm run build      # production build
```

A curl-based smoke test of the same workflow ships with the repository and is
useful against a running server:

```bash
cd backend
bash scripts/smoke-test.sh            # defaults to http://127.0.0.1:4000/api
API=http://localhost:4000/api bash scripts/smoke-test.sh
```

It exercises 47 checks across registration, login, ownership, role enforcement,
storage approval, storage rejection, release requests and release decisions. The
Jest suite remains the authoritative test set.

---

## Project structure

```
bdu-store/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma           # User, Device, ReleaseRequest
│   │   ├── migrations/             # committed SQL migrations
│   │   └── seed.ts                 # administrator + optional demo data
│   ├── src/
│   │   ├── admin/                  # approvals, rejections, storage tokens
│   │   ├── auth/                   # university-ID registration, login, JWT strategy
│   │   ├── common/                 # guards, filters, Prisma
│   │   ├── devices/                # storage requests and device views
│   │   ├── release-requests/       # release workflow
│   │   ├── users/                  # user persistence
│   │   ├── health/
│   │   ├── app.setup.ts            # shared bootstrap configuration
│   │   └── main.ts
│   └── test/                       # e2e suite + test database setup
├── frontend/
│   ├── public/
│   │   └── logo.jpeg               # Bahir Dar University seal (branding + favicon)
│   └── src/
│       ├── app/
│       │   ├── page.tsx            # landing page
│       │   ├── login/, register/   # university-ID auth pages
│       │   ├── (app)/              # campus-user shell: dashboard, device form
│       │   └── (admin)/admin/      # console: /admin, /admin/requests, /admin/devices, /admin/releases
│       ├── components/
│       │   ├── admin/              # overview dashboard, section sidebar, shell, sections
│       │   └── ui/                 # shadcn/ui primitives
│       ├── context/                # auth context
│       ├── lib/                    # API client, formatting, Zod schemas
│       └── middleware.ts           # cookie-presence gate for private routes
└── README.md
```

The frontend talks to the API directly from the browser with
`credentials: 'include'`, so the HttpOnly session cookie is sent without any
server-side proxy.

---

## Configuration

### `backend/.env`

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | — | PostgreSQL connection string (required). |
| `TEST_DATABASE_URL` | — | Database used by `npm run test:e2e`. |
| `JWT_SECRET` | — | Signing secret. Generate with `openssl rand -hex 48`. |
| `JWT_EXPIRATION` | `7d` | Token lifetime (`7d`, `12h`, `30m`, `45s`). |
| `APP_PORT` | `4000` | API port. |
| `CLIENT_URL` | `http://localhost:3000` | Allowed CORS origin(s), comma-separated. |
| `NODE_ENV` | `development` | `production` enables secure cookies and strict seeding. |
| `ADMIN_FULL_NAME` | `BDU Store Administrator` | Seed: administrator name. |
| `ADMIN_UNIVERSITY_ID` | `BDU-ADMIN-001` | Seed: administrator university ID. |
| `ADMIN_UNIVERSITY_ID` | `bdu0000001` | Seed: administrator login. |
| `ADMIN_PASSWORD` | `Admin12345` | Seed: administrator password. |
| `SEED_DEMO_DATA` | unset | `true` to also seed demo users and devices. |

### `frontend/.env.local`

| Variable | Default | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000/api` | API base URL including `/api`. |

---

## Security notes

- Passwords are hashed with **argon2**; the hash is stripped from every response.
- Sessions use a signed JWT delivered as an **HttpOnly**, `SameSite=Lax` cookie
  (`Secure` in production). A `Bearer` header is also accepted for API clients.
- The user record is re-read from the database on every request, so a role change
  or deleted account takes effect immediately rather than at token expiry.
- Role is never trusted from the client or from the token payload alone.
- Ownership is checked server-side for every device and release operation.
- Login uses a constant-time-ish path (a dummy hash is verified for unknown university IDs
  numbers) and returns the same message for an unknown number and a wrong
  password, so the endpoint does not reveal which numbers are registered.
- Storage approval and release decisions run inside transactions with
  compare-and-swap updates, and duplicate pending release requests are blocked by
  a database constraint rather than by application logic alone.
- Validation is enforced by a global `ValidationPipe` with `whitelist` and
  `forbidNonWhitelisted`, so unexpected fields (including any `email`) are
  rejected with `422`.

---

## Troubleshooting

**`Can't reach database server`** — PostgreSQL is not running or `DATABASE_URL`
is wrong. Check with `docker ps` and `docker exec bdu-store-postgres pg_isready -U bdu`.

**`Port 4000 already in use`** — another process holds the port; change
`APP_PORT`, or stop the other process.

**Login fails with the seeded administrator** — re-run `npm run prisma:seed`; the
seed is idempotent and will report whether the administrator already exists. If
the account exists with a different password, set `ADMIN_PASSWORD` and re-seed
after deleting the account, or update the password hash directly.

**`npm run test:e2e` fails immediately** — the test database could not be created
or migrated. Confirm PostgreSQL is reachable and that the `TEST_DATABASE_URL`
credentials can create databases.

**Frontend shows "Could not reach the BDU Store server"** — the API is not
running, or `NEXT_PUBLIC_API_URL` does not match its address. Restart
`npm run dev` after changing `.env.local`.

**Cookie not being sent** — the API and the frontend must be reachable on the
same host (`localhost`) for the `SameSite=Lax` cookie to be attached. If you host
them on different domains, set `NODE_ENV=production` with HTTPS and update the
cookie/CORS settings.
