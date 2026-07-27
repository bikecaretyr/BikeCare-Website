# 📋 BMS — Project Context & Properties Reference

> **Purpose:** This file is a comprehensive, always-up-to-date reference for the Balaji Motors Bike Care ERP (BMS) project. It captures the architecture, file structure, data models, API surface, authentication, security, deployment, and key business logic so any developer (or AI assistant) can quickly re-orient when returning to this codebase.
>
> **Last updated:** 2026-07-26
> **Project version:** 4.0.0 (package.json) / v1.0.0 (README — first production launch, May 2026)
> **Repository:** https://github.com/bikecaretyr/BikeCare-Website.git
> **Latest commit:** `b7f3b8744dc271d7ce2fa1373ae27f4e4f400e90`

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [Application Portals & Routes](#4-application-portals--routes)
5. [Role Hierarchy & Access Control](#5-role-hierarchy--access-control)
6. [Authentication System](#6-authentication-system)
7. [Server-Side Architecture](#7-server-side-architecture)
8. [Database Models](#8-database-models)
9. [API Endpoints](#9-api-endpoints)
10. [Client-Side Architecture](#10-client-side-architecture)
11. [Client Pages & Components](#11-client-pages--components)
12. [Security](#12-security)
13. [Infrastructure & Deployment](#13-infrastructure--deployment)
14. [Environment Variables](#14-environment-variables)
15. [Development Commands](#15-development-commands)
16. [Key Business Logic](#16-key-business-logic)
17. [Known Issues & Notes](#17-known-issues--notes)
18. [Future Roadmap](#18-future-roadmap)

---

## 1. Project Overview

**Balaji Motors Bike Care ERP (BMS)** is a full-stack, multi-branch workshop management system designed for two-wheeler service centers in Tamil Nadu, India. It manages the complete lifecycle of a bike service center: customer bookings, job cards, inventory, vendor purchases, approvals, payments, credit tracking, and analytics.

### Core Capabilities

| Capability | Description |
|---|---|
| Customer bookings | Public booking form, vehicle tracking, branch finder |
| Job card workflow | Create → In Progress → Ready → Delivered / Cancelled |
| Inventory management | Vendor-based batch-level stock tracking |
| Vendor & purchase tracking | Multi-vendor purchases, payment due tracking |
| Approval workflows | Employees request changes; managers/admins approve |
| Revenue analytics | Dashboard, revenue reports, mechanic performance |
| Credit collection | Track credit payments, collection status |
| Branch isolation | Each branch operates independently with scoped data |
| Multi-portal architecture | Public, Employee, Admin, Manager, SuperAdmin portals |
| Audit logging | All actions logged with severity levels |
| Notifications | In-app notifications with 30-day TTL |

---

## 2. Tech Stack

### Backend

| Technology | Version | Purpose |
|---|---|---|
| Node.js | >= 18 (Docker: 20-alpine) | Runtime |
| Express | ^4.18.2 | Web framework |
| MongoDB | 7.0 (Docker) | Database |
| Mongoose | ^8.0.3 | ODM |
| JSON Web Token | ^9.0.2 | Authentication |
| bcryptjs | ^2.4.3 | Password hashing (12 rounds) |
| Helmet | ^7.1.0 | Security headers |
| express-rate-limit | ^7.1.5 | Rate limiting |
| express-validator | ^7.0.1 | Input validation |
| Nodemailer | ^8.0.3 | Email (Gmail SMTP) |
| Winston | ^3.11.0 | Logging |
| Multer | ^1.4.5-lts.1 | File uploads |
| Morgan | ^1.10.0 | HTTP logging |
| Compression | ^1.7.4 | Response compression |
| cookie-parser | ^1.4.6 | Cookie parsing |
| cors | ^2.8.5 | Cross-origin |
| express-mongo-sanitize | ^2.2.0 | NoSQL injection prevention |
| xss-clean | ^0.1.4 | XSS sanitization |
| hpp | ^0.2.3 | HTTP param pollution prevention |
| uuid | ^9.0.1 | ID generation |

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| React | ^18.2.0 | UI library |
| React DOM | ^18.2.0 | DOM rendering |
| React Router DOM | ^6.22.0 | Client-side routing |
| TypeScript | ^5.3.3 | Type safety |
| Vite | ^5.1.0 | Build tool / dev server |
| Tailwind CSS | ^3.4.1 | Styling |

### Infrastructure

| Technology | Purpose |
|---|---|
| Docker | Containerization |
| Docker Compose | Multi-service orchestration |
| Nginx | Reverse proxy (optional profile) |
| Certbot | SSL certificates |
| Vercel | Alternative frontend deployment (vercel.json present) |

---

## 3. Project Structure

```txt
bms/
├── .gitignore
├── Dockerfile                    # Node 20-alpine, non-root user, healthcheck
├── docker-compose.yml            # mongo + app + nginx (optional profile)
├── nginx.conf                    # Reverse proxy config with rate limiting
├── package.json                  # Root manifest (server)
├── package-lock.json
├── README.md                     # Comprehensive project documentation
├── PROJECT_CONTEXT.md            # THIS FILE — project properties reference
│
├── mongo-init/
│   └── init-mongo.js             # Creates bms_app user in balaji_motors_bms DB
│
├── server/
│   ├── index.js                  # Express app entry point
│   ├── config/
│   │   └── db.js                 # MongoDB connection
│   ├── controllers/
│   │   ├── approvalController.js
│   │   ├── authController.js
│   │   ├── bookingController.js
│   │   ├── branchController.js
│   │   ├── jobController.js
│   │   ├── notificationController.js
│   │   ├── partController.js
│   │   ├── reportController.js
│   │   └── userController.js
│   ├── middleware/
│   │   ├── auth.js               # protect, authorize, superAdminOnly, branchScope
│   │   ├── errorHandler.js       # asyncHandler, notFound, errorHandler
│   │   └── rateLimiter.js        # globalLimiter, loginLimiter, publicApiLimiter, bookingLimiter
│   ├── models/
│   │   ├── ApprovalRequest.js
│   │   ├── AuditLog.js
│   │   ├── Booking.js
│   │   ├── Branch.js
│   │   ├── Counter.js
│   │   ├── JobCard.js
│   │   ├── Notification.js
│   │   ├── Part.js
│   │   ├── Purchase.js
│   │   ├── PurchaseEntry.js
│   │   ├── Service.js
│   │   ├── User.js
│   │   └── Vendor.js
│   ├── routes/
│   │   └── index.js              # All API routes
│   └── utils/
│       ├── audit.js              # Audit log writer
│       ├── email.js              # Nodemailer Gmail transport
│       ├── jwt.js                # JWT sign/verify (access + refresh + superadmin)
│       ├── logger.js             # Winston logger
│       ├── migrateInventory.js   # Old → new inventory migration
│       ├── notification.js       # In-app notification creator
│       └── seed.js               # Database seeder
│
├── client/
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   ├── vercel.json               # SPA rewrite for Vercel
│   ├── vite.config.ts            # Dev proxy /api → localhost:5000
│   ├── server-index-updated.js   # Alternative server entry (reference)
│   └── src/
│       ├── App.tsx               # Root component with route guards
│       ├── main.tsx              # React entry point
│       ├── routes.ts             # Route path constants
│       ├── types.ts              # All TypeScript interfaces
│       ├── index.css             # Tailwind imports + global styles
│       ├── css.d.ts              # CSS module type declaration
│       ├── api/
│       │   ├── client.ts         # API client with auto-refresh, all endpoint groups
│       │   └── normalize.ts     # Response normalization (approvals)
│       ├── context/
│       │   └── AuthContext.tsx   # Auth provider, useAuth hook, role helpers
│       ├── hooks/
│       │   ├── useConfirm.tsx    # Confirmation dialog hook
│       │   ├── useData.ts        # Data fetching hooks
│       │   └── useForm.ts        # Form state management hook
│       ├── layouts/
│       │   ├── AdminLayout.tsx
│       │   ├── AppLayout.tsx
│       │   ├── ManagerLayout.tsx
│       │   ├── PortalLayout.tsx
│       │   └── PublicLayout.tsx
│       ├── components/
│       │   ├── JobForm.tsx       # Job card create/edit form
│       │   ├── JobIntakePrint.tsx # Printable job intake sheet
│       │   ├── JobInvoice.tsx    # Printable invoice
│       │   └── ui.tsx            # Shared UI components (PageLoader, Toast, etc.)
│       ├── pages/
│       │   ├── admin/
│       │   │   ├── Audit.tsx
│       │   │   ├── Bookings.tsx
│       │   │   ├── Branches.tsx
│       │   │   ├── Credits.tsx
│       │   │   ├── index.tsx     # Admin page exports
│       │   │   ├── Profile.tsx
│       │   │   ├── Reports.tsx
│       │   │   └── Services.tsx
│       │   ├── auth/
│       │   │   ├── Login.tsx
│       │   │   └── SuperAdminLogin.tsx
│       │   ├── manager/
│       │   │   ├── Bookings.tsx
│       │   │   ├── index.tsx     # Manager page exports
│       │   │   ├── Profile.tsx
│       │   │   └── Reports.tsx
│       │   ├── portal/
│       │   │   ├── Bookings.tsx
│       │   │   ├── Dashboard.tsx
│       │   │   ├── index.tsx    # Portal page exports
│       │   │   ├── Jobs.tsx
│       │   │   ├── NewJob.tsx
│       │   │   ├── Parts.tsx
│       │   │   ├── Profile.tsx
│       │   │   └── Requests.tsx
│       │   ├── public/
│       │   │   └── Home.tsx
│       │   └── shared/
│       │       ├── ApprovalsPage.tsx
│       │       ├── DashboardPage.tsx
│       │       ├── EmployeesPage.tsx
│       │       ├── InventoryPage.tsx
│       │       └── JobsPage.tsx
│       └── types/
│           └── css.d.ts
│
└── logs/                         # Winston log output (gitignored)
```

---

## 4. Application Portals & Routes

The app uses a multi-portal architecture with role-based route guards.

| Portal | Base Route | Layout | Access | Description |
|---|---|---|---|---|
| Public | `/` | `PublicLayout` | Everyone | Customer website: booking, tracking, branch finder |
| Auth | `/login`, `/superadmin` | None | Everyone | Login pages for employees and superadmin |
| Employee Portal | `/portal/*` | `PortalLayout` | `employee` role | Job creation, inventory view, approval requests |
| Admin ERP | `/admin/*` | `AdminLayout` | `admin`, `superadmin` | Full ERP: jobs, inventory, employees, branches, reports, audit |
| Manager Dashboard | `/manager/*` | `ManagerLayout` | `manager` | Branch-scoped ERP: jobs, inventory, approvals, reports |

### Route Guards (in `App.tsx`)

- **`PublicPage`** — wraps in `PublicLayout`, no auth required
- **`PortalGuard`** — requires `employee` role; redirects admin → `/admin/dashboard`
- **`AdminGuard`** — requires `admin` or `superadmin` role; redirects others → `/portal/dashboard`
- **`ManagerGuard`** — requires `manager` role; redirects others → `/portal/dashboard`

### Client Route Constants (`routes.ts`)

```typescript
ROUTES = {
  public: { home: '/' },
  auth: { login: '/login', superAdmin: '/superadmin' },
  portal: { dashboard, newJob, bookings, jobs, parts, requests, profile },
  admin: { dashboard, jobs, approvals, bookings, credits, inventory, employees, branches, services, reports, audit, profile },
  manager: { dashboard, jobs, approvals, bookings, inventory, employees, reports, profile },
}
```

---

## 5. Role Hierarchy & Access Control

```txt
SUPERADMIN  (env-based, not in DB)
    └── ADMIN  (all branches)
            └── MANAGER  (assigned branch only)
                    └── EMPLOYEE  (assigned branch only)
```

### Access Matrix

| Role | Scope | Can Manage | Restrictions |
|---|---|---|---|
| SuperAdmin | Entire system | Everything + audit logs | Env-only credentials, not in MongoDB |
| Admin | All branches | Jobs, inventory, employees, branches, services, reports | Cannot access SuperAdmin panel |
| Manager | Assigned branch | Branch jobs, inventory, approvals, employees, reports | Cannot create services, manage branches, or access other branches |
| Employee | Assigned branch | Create jobs, view inventory, submit approval requests | Cannot modify protected data, deliver jobs, or bypass approvals |

### Middleware (`server/middleware/auth.js`)

| Middleware | Purpose |
|---|---|
| `protect` | Requires valid JWT (Bearer token). Tries access token first, then superadmin token. Checks user exists, is active, and password hasn't changed since token issued. |
| `superAdminOnly` | Blocks non-superadmin users with 403. |
| `authorize(...roles)` | Role-based access. SuperAdmin bypasses all role checks. |
| `branchScope` | Sets `req.branchFilter = req.user.branch` for managers/employees. Admin/superadmin bypass (all branches). |

---

## 6. Authentication System

### Token Strategy

| Token Type | Expiry | Storage | Purpose |
|---|---|---|---|
| Access Token | 15 minutes | In-memory (`_token` in `client.ts`) | API authentication via `Authorization: Bearer` |
| Refresh Token | 7 days | HttpOnly cookie | Silent token rotation |
| SuperAdmin Token | — | In-memory | Separate auth path, env-based credentials |

### Auth Flow

1. **Login** (`POST /api/auth/login`): Email + password → returns `{ accessToken, user }` + sets refresh token cookie
2. **Token refresh** (`POST /api/auth/refresh`): Uses HttpOnly cookie → returns new `{ accessToken, user }`
3. **Auto-refresh** (client): On 401 response, client automatically calls `refreshToken()` and retries the original request
4. **Logout** (`POST /api/auth/logout`): Clears refresh token
5. **Session rehydration** (client): On app load, `AuthContext` calls `refreshToken()` → `auth.getMe()` to restore session

### SuperAdmin Authentication

- Separate login endpoint: `POST /api/auth/superadmin`
- Credentials from environment variables (not stored in MongoDB)
- Separate JWT verification: `verifySuperAdminToken()`
- `req.user = { id: 'superadmin', role: 'superadmin', name: 'Super Admin' }` — no DB lookup

### Account Security Features

- **Account lockout**: After 5 failed login attempts, account locked for 2 hours
- **Password change detection**: If password changed after token issued, token invalidated
- **Password hashing**: bcrypt with 12 salt rounds (configurable via `BCRYPT_SALT_ROUNDS`)
- **Refresh token rotation**: New refresh token on each refresh

### Client Auth Context (`AuthContext.tsx`)

```typescript
// Provider state
{ user, loading, login, superAdminLogin, logout }

// Role helper functions
isAdmin(u)       // admin or superadmin
isManager(u)     // manager only
isSuperAdmin(u)  // superadmin only
isEmployee(u)    // employee only
defaultRoute(u)  // returns default dashboard route for role
```

---

## 7. Server-Side Architecture

### Entry Point (`server/index.js`)

The Express app is configured with:

1. **Helmet** — CSP headers (allows self, unsafe-inline for scripts/styles, Google Fonts)
2. **CORS** — origin from `CLIENT_URL` env (default `http://localhost:5000`), credentials enabled
3. **Compression** — gzip responses
4. **Body parsing** — JSON + URL-encoded (10kb limit)
5. **Cookie parser** — with `COOKIE_SECRET`
6. **Security middleware** — mongoSanitize, xssClean, hpp
7. **Rate limiting** — `globalLimiter` on `/api/`
8. **HTTP logging** — morgan (dev mode: `dev`, prod: `combined` → Winston)
9. **Trust proxy** — set to 1 (for nginx)
10. **API routes** — mounted at `/api`
11. **Health check** — `GET /health`
12. **Static frontend** — serves `client/dist` if it exists (SPA fallback)
13. **Error handler** — global error handler middleware

### Middleware

#### `errorHandler.js`

| Export | Purpose |
|---|---|
| `asyncHandler(fn)` | Wraps async controller functions to catch errors |
| `errorHandler(err, req, res, next)` | Global error handler — formats errors, handles Mongoose/JWT errors |
| `notFound(req, res, next)` | 404 handler for unmatched routes |

#### `rateLimiter.js`

| Export | Purpose | Config |
|---|---|---|
| `globalLimiter` | All `/api/` routes | Standard limits |
| `loginLimiter` | `/auth/login`, `/auth/superadmin` | Stricter for brute force prevention |
| `publicApiLimiter` | `/public/*` routes | Relaxed for public access |
| `bookingLimiter` | `/public/bookings` | Specific for booking creation |

### Utils

#### `jwt.js`

| Function | Purpose |
|---|---|
| `signAccessToken(user)` | Signs 15-min access token |
| `signRefreshToken(user)` | Signs 7-day refresh token |
| `verifyAccessToken(token)` | Verifies access token |
| `verifySuperAdminToken(token)` | Verifies superadmin token (separate secret) |
| `signSuperAdminToken(payload)` | Signs superadmin token |

#### `audit.js`

- `audit({ actor, actorRole, action, targetModel, targetId, meta, req, branch, severity })`
- Writes to `AuditLog` collection
- Captures IP from `x-forwarded-for` or `req.ip`
- Captures user agent
- Fire-and-forget (never throws — logs error on failure)
- Default severity: `low`, default actor: `system`

#### `email.js`

- Nodemailer Gmail transport
- HTML email templates
- Used for booking confirmations, notifications

#### `logger.js`

- Winston logger
- Console + file transports
- Logs to `logs/` directory

#### `notification.js`

- Creates in-app `Notification` documents
- Types: `approval_request`, `approval_approved`, `approval_rejected`, `booking_new`, `booking_confirmed`, `low_stock`, `credit_reminder`, `system`

#### `seed.js`

- Seeds initial admin and employee accounts
- Run via `npm run seed`

#### `migrateInventory.js`

- Migrates old inventory (single stock/price) to new vendor-batch architecture
- Creates legacy vendors
- Converts old stock into vendor batches
- Safe to run multiple times
- Run via `npm run migrate:inventory`

---

## 8. Database Models

All models use Mongoose with `timestamps: true` (createdAt/updatedAt) unless noted.

### `User.js`

| Field | Type | Notes |
|---|---|---|
| `name` | String | Required, max 80 chars |
| `email` | String | Required, unique, lowercase, validated |
| `password` | String | Required, min 8 chars, `select: false` |
| `role` | String | Enum: `superadmin`, `admin`, `manager`, `employee`; default `employee` |
| `branch` | ObjectId → Branch | `null` = all branches (admin) |
| `phone` | String | Indian phone regex: `/^[6-9]\d{9}$/` |
| `isActive` | Boolean | Default `true` |
| `avatar` | String | Default `null` |
| `passwordChangedAt` | Date | Set on password change |
| `passwordResetToken` | String | |
| `passwordResetExpires` | Date | |
| `refreshToken` | String | `select: false` |
| `lastLogin` | Date | |
| `loginAttempts` | Number | Default 0 |
| `lockUntil` | Date | Lock after 5 failed attempts (2 hours) |
| `createdBy` | ObjectId → User | |

**Pre-save hooks:**
- Hashes password with bcrypt (12 rounds) if modified
- Sets `passwordChangedAt` on non-new password changes

**Methods:**
- `comparePassword(candidate)` — bcrypt compare
- `isLocked()` — checks if lockUntil > now
- `incLoginAttempts()` — increments, locks at 5
- `resetLoginAttempts()` — resets to 0
- `changedPasswordAfter(jwtTimestamp)` — checks if password changed after token issued

---

### `JobCard.js`

| Field | Type | Notes |
|---|---|---|
| `jobNo` | String | Unique, auto-generated: `JC-YYYYMMDD-NNNN` |
| `branch` | ObjectId → Branch | Required |
| `vehicleNumber` | String | Required, uppercase |
| `brand` | String | Required |
| `model` | String | |
| `kmReading` | Number | Min 0 |
| `customerName` | String | |
| `customerPhone` | String | |
| `serviceInDate` | Date | Required, default now |
| `expectedDelivery` | Date | |
| `actualDelivery` | Date | |
| `serviceMode` | String | Enum: General Service, Engine Repair, Tyre Change, Electrical Work, Body Work, Full Service, Other |
| `complaint` | String | |
| `mechanic` | String | Required |
| `assignedTo` | ObjectId → User | |
| `engineOil` | String | |
| `sparesUsed` | [SpareItem] | Embedded array (see below) |
| `workDone` | String | |
| `status` | String | Enum: Received, In Progress, Ready, Delivered, Cancelled; default Received |
| `labourCharge` | Number | Default 0 |
| `waterWash` | Number | Default 0 |
| `sparesCost` | Number | Auto-calculated from sparesUsed |
| `discount` | Number | Default 0 |
| `totalAmount` | Number | Auto-calculated |
| `paymentMode` | String | Enum: Cash, UPI, Card, Credit; default Cash |
| `paymentStatus` | String | Enum: Paid, Pending, Partial; auto-calculated |
| `paidAmount` | Number | Auto-calculated from paymentHistory |
| `balanceAmount` | Number | Auto-calculated |
| `paymentHistory` | [Payment] | Embedded array (see below) |
| `creditCollected` | Boolean | Default false |
| `creditCollectedAt` | Date | |
| `creditCollectedMode` | String | |
| `createdBy` | ObjectId → User | Required |
| `lastModifiedBy` | ObjectId → User | |

**SpareItem sub-schema:**
```js
{ partId, partNumber, partName, vendorBatchId, vendorName, sellingPrice, qty }
```

**Payment sub-schema:**
```js
{ amount, mode (Cash/UPI/Card/Credit), paidAt, note, receivedBy }
```

**Pre-save hooks:**
1. **Job number generation** (new docs only): Uses `Counter` model with atomic `$inc` → `JC-YYYYMMDD-NNNN`
2. **Auto-calculation**: `sparesCost` = sum of (sellingPrice × qty), `totalAmount` = labour + waterWash + sparesCost - discount, `paidAmount` = sum of paymentHistory, `balanceAmount` = max(0, totalAmount - paidAmount), `paymentStatus` auto-set based on balance

**Indexes:**
- `{ branch: 1, createdAt: -1 }`
- `{ branch: 1, status: 1 }`
- `{ vehicleNumber: 1 }`
- `{ customerPhone: 1 }`
- `{ branch: 1, serviceInDate: -1 }`
- `{ paymentMode: 1, creditCollected: 1 }`

---

### `Part.js`

| Field | Type | Notes |
|---|---|---|
| `partNumber` | String | Required, uppercase, unique per branch |
| `partName` | String | Required |
| `brand` | String | |
| `branch` | ObjectId → Branch | Required |
| `vendorBatches` | [VendorBatch] | Embedded array (see below) |
| `totalStock` | Number | Auto-calculated from active batches |
| `minStock` | Number | Default 5 |
| `isActive` | Boolean | Default true |
| `lastRestockedAt` | Date | |
| `createdBy` | ObjectId → User | |
| `lastModifiedBy` | ObjectId → User | |

**VendorBatch sub-schema:**
```js
{ vendorId, vendorName, purchasePrice, sellingPrice, stock, purchasedAt, isActive }
```

**Methods:**
- `recalculateStock()` — sums stock from active batches

**Pre-save hook:** Auto-recalculates `totalStock`

**Virtuals:**
- `isLowStock` — `totalStock <= minStock`
- `stockValue` — `totalStock × avg(sellingPrice of active batches)`

**Indexes:**
- `{ branch: 1, partNumber: 1 }` — unique
- `{ branch: 1, isActive: 1 }`
- `{ branch: 1, totalStock: 1 }`
- `{ partNumber: 1 }`

---

### `Branch.js`

| Field | Type | Notes |
|---|---|---|
| `name` | String | Required, unique |
| `code` | String | Required, uppercase, unique, max 10 chars |
| `address` | Object | `{ street, city (default Trichy), state (default Tamil Nadu), pincode }` |
| `phone` | String | Mobile or landline validation |
| `phoneType` | String | Enum: mobile, landline |
| `whatsapp` | String | |
| `email` | String | |
| `googleMapsUrl` | String | |
| `isActive` | Boolean | Default true |
| `workingHours` | Object | `{ open (08:00), close (20:00), days [Mon-Sat] }` |
| `services` | [ObjectId → Service] | |

---

### `Service.js`

| Field | Type | Notes |
|---|---|---|
| `name` | String | Required |
| `description` | String | |
| `price` | Number | Min 0, default 0 |
| `priceType` | String | Enum: fixed, starting_from, on_request |
| `category` | String | Enum: General, Repair, Electrical, Body, Tyres, Full Service, Other |
| `durationMinutes` | Number | Default 60 |
| `isActive` | Boolean | Default true |
| `sortOrder` | Number | Default 0 |

---

### `Booking.js`

| Field | Type | Notes |
|---|---|---|
| `bookingRef` | String | Unique, auto-generated: `BK-YYYYMMDD-NNNN` |
| `branch` | ObjectId → Branch | Required |
| `customerName` | String | Required |
| `customerPhone` | String | Required, Indian phone regex |
| `customerEmail` | String | |
| `vehicleNumber` | String | Uppercase |
| `vehicleBrand` | String | |
| `vehicleModel` | String | |
| `serviceRequested` | [ObjectId → Service] | |
| `serviceNote` | String | |
| `preferredDate` | Date | Required |
| `status` | String | Enum: Pending, Confirmed, Rejected, Completed, Cancelled |
| `adminNote` | String | |
| `confirmedBy` | ObjectId → User | |
| `confirmedAt` | Date | |
| `convertedToJobCard` | ObjectId → JobCard | |
| `ipAddress` | String | |

**Pre-save hook:** Auto-generates `bookingRef` using count-based numbering

---

### `Vendor.js`

| Field | Type | Notes |
|---|---|---|
| `name` | String | Required |
| `phone` | String | |
| `paymentDueDays` | Number | Default 30 |
| `vehicleModels` | [String] | Vehicle specialization |
| `branches` | [ObjectId → Branch] | Multi-branch mapping |
| `isActive` | Boolean | Default true |
| `isLegacy` | Boolean | Default false (migration flag) |
| `createdBy` | ObjectId → User | |

**Indexes:** `{ isActive: 1 }`, `{ branches: 1 }`

---

### `Purchase.js`

| Field | Type | Notes |
|---|---|---|
| `vendor` | ObjectId → Vendor | Required |
| `branch` | ObjectId → Branch | Required |
| `items` | [PurchaseItem] | `{ partId, qty, purchaseCost, sellingPrice }` |
| `miscCost` | Number | Default 0 |
| `totalCost` | Number | Required, min 0 |
| `paymentDueDate` | Date | |
| `paymentPaid` | Boolean | Default false |
| `paymentPaidAt` | Date | |
| `notes` | String | |
| `createdBy` | ObjectId → User | |

**Indexes:** `{ branch: 1, createdAt: -1 }`, `{ vendor: 1, paymentPaid: 1 }`

---

### `PurchaseEntry.js`

| Field | Type | Notes |
|---|---|---|
| `vendor` | ObjectId → Vendor | Required |
| `part` | ObjectId → Part | Required |
| `branch` | ObjectId → Branch | Required |
| `qty` | Number | Required, min 1 |
| `purchasePrice` | Number | Required, min 0 |
| `sellingPrice` | Number | Required, min 0 |
| `batchId` | ObjectId | Reference to embedded batch in Part.vendorBatches |
| `paymentDueDate` | Date | |
| `paymentPaid` | Boolean | Default false |
| `paymentPaidAt` | Date | |
| `notes` | String | |
| `createdBy` | ObjectId → User | |

**Indexes:** `{ branch: 1, createdAt: -1 }`, `{ vendor: 1, paymentPaid: 1 }`, `{ part: 1 }`

---

### `ApprovalRequest.js`

| Field | Type | Notes |
|---|---|---|
| `type` | String | Enum: job_edit, job_delete, part_edit, part_delete, part_add, credit_collect |
| `requestedBy` | ObjectId → User | Required |
| `branch` | ObjectId → Branch | Required |
| `targetModel` | String | Enum: JobCard, Part |
| `targetId` | ObjectId | Required |
| `currentData` | Mixed | Snapshot of current state |
| `requestedData` | Mixed | Snapshot of requested changes |
| `reason` | String | |
| `status` | String | Enum: Pending, Approved, Rejected; default Pending |
| `reviewedBy` | ObjectId → User | |
| `reviewedAt` | Date | |
| `reviewNote` | String | |
| `adminSeen` | Boolean | Default false (for badge tracking) |

---

### `Notification.js`

| Field | Type | Notes |
|---|---|---|
| `recipient` | ObjectId → User | Required |
| `type` | String | Enum: approval_request, approval_approved, approval_rejected, booking_new, booking_confirmed, low_stock, credit_reminder, system |
| `title` | String | Required |
| `message` | String | Required |
| `link` | String | e.g. `/admin/approvals/ID` |
| `isRead` | Boolean | Default false |
| `relatedId` | String | |
| `relatedModel` | String | |

**TTL Index:** `createdAt` — auto-expires after 30 days

---

### `AuditLog.js`

| Field | Type | Notes |
|---|---|---|
| `actor` | String | Required — 'superadmin', userId, or 'system' |
| `actorRole` | String | Enum: superadmin, admin, branch_admin, manager, employee, customer, system |
| `action` | String | Required — e.g. LOGIN, LOGOUT, CREATE_JOB, APPROVE_REQUEST |
| `targetModel` | String | |
| `targetId` | String | |
| `meta` | Mixed | Extra context |
| `ipAddress` | String | |
| `userAgent` | String | |
| `branch` | ObjectId → Branch | |
| `severity` | String | Enum: low, medium, high, critical; default low |

**TTL Index:** `createdAt` — auto-expires after 365 days (1 year)

---

### `Counter.js`

| Field | Type | Notes |
|---|---|---|
| `_id` | String | e.g. `branch_507f1f77bcf86cd799439011` |
| `seq` | Number | Default 0 |

Used for atomic job number generation (race-condition free via `findByIdAndUpdate` with `$inc`).

---

## 9. API Endpoints

All routes are prefixed with `/api`. Response shape: `{ success, ...payload }`.

### Authentication

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| POST | `/auth/login` | loginLimiter | Public | Employee/admin login |
| POST | `/auth/superadmin` | loginLimiter | Public | SuperAdmin login (env credentials) |
| POST | `/auth/refresh` | Cookie | Public | Refresh access token |
| POST | `/auth/logout` | protect | Any | Clear refresh token |
| GET | `/auth/me` | protect | Any | Get current user |
| PATCH | `/auth/password` | protect | Any | Change password |

### Public (no auth)

| Method | Path | Rate Limit | Description |
|---|---|---|---|
| GET | `/public/services` | publicApiLimiter | List active services |
| GET | `/public/branches` | publicApiLimiter | List active branches |
| POST | `/public/bookings` | bookingLimiter | Create a booking |
| GET | `/public/track` | publicApiLimiter | Track vehicle by number/phone |

### Jobs

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| POST | `/jobs` | protect + branchScope | superadmin, admin, manager, employee | Create job card |
| GET | `/jobs` | protect + branchScope | superadmin, admin, manager, employee | List jobs |
| GET | `/jobs/:id` | protect + branchScope | superadmin, admin, manager, employee | Get single job |
| PATCH | `/jobs/:id` | protect + branchScope | superadmin, admin, manager, employee | Update job |
| POST | `/jobs/:id/spares` | protect + branchScope | superadmin, admin, manager, employee | Add spare parts |
| POST | `/jobs/:id/payment` | protect + branchScope | superadmin, admin, manager, employee | Add payment |
| DELETE | `/jobs/:id` | protect + branchScope | superadmin, admin, manager, employee | Delete job |
| GET | `/jobs/vehicle-lookup` | protect | superadmin, admin, manager, employee | Vehicle autofill |

### Parts

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/parts` | protect + branchScope | All staff | List parts |
| POST | `/parts` | protect + branchScope | All staff | Create part |
| GET | `/parts/:id` | protect + branchScope | All staff | Get single part |
| PATCH | `/parts/:id` | protect + branchScope | All staff | Update part |
| DELETE | `/parts/:id` | protect + branchScope | All staff | Delete part |

### Approvals

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/approvals/my` | protect | All staff | My requests |
| GET | `/approvals` | protect + branchScope | superadmin, admin, manager | All requests |
| GET | `/approvals/count` | protect + branchScope | superadmin, admin, manager | Pending count (badge) |
| GET | `/approvals/:id` | protect | superadmin, admin, manager | Single request |
| POST | `/approvals/:id/review` | protect | superadmin, admin, manager | Approve/reject |

### Bookings

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/bookings` | protect + branchScope | All staff | List bookings |
| PATCH | `/bookings/:id` | protect | All staff | Update booking status |
| POST | `/bookings/:id/convert` | protect | All staff | Convert booking → job card |

### Branches

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/branches` | protect | Any auth | List branches |
| POST | `/branches` | protect | superadmin, admin | Create branch |
| GET | `/branches/:id` | protect | Any auth | Get single branch |
| PATCH | `/branches/:id` | protect | superadmin, admin | Update branch |
| PATCH | `/branches/:id/activate` | protect | superadmin, admin | Activate branch |
| PATCH | `/branches/:id/deactivate` | protect | superadmin, admin | Deactivate branch |
| DELETE | `/branches/:id` | protect | superadmin, admin | Delete branch |

### Services

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/services` | protect | superadmin, admin | List services |
| POST | `/services` | protect | superadmin, admin | Create service |
| PATCH | `/services/:id` | protect | superadmin, admin | Update service |
| PATCH | `/services/:id/activate` | protect | superadmin, admin | Activate service |
| PATCH | `/services/:id/deactivate` | protect | superadmin, admin | Deactivate service |
| DELETE | `/services/:id` | protect | superadmin, admin | Delete service |

### Users / Employees

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/users` | protect | superadmin, admin, manager | List employees |
| POST | `/users` | protect | superadmin, admin | Create employee |
| GET | `/users/:id` | protect | superadmin, admin | Get single employee |
| PATCH | `/users/:id` | protect | superadmin, admin | Update employee |
| PATCH | `/users/:id/activate` | protect | superadmin, admin | Activate employee |
| PATCH | `/users/:id/deactivate` | protect | superadmin, admin | Deactivate employee |
| DELETE | `/users/:id` | protect | superadmin, admin | Delete employee |
| POST | `/users/:id/reset-password` | protect | superadmin, admin | Admin reset password |

### Reports

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/reports/dashboard` | protect + branchScope | superadmin, admin, manager | Dashboard stats |
| GET | `/reports/revenue` | protect + branchScope | superadmin, admin, manager | Revenue report |
| GET | `/reports/inventory` | protect + branchScope | superadmin, admin, manager | Inventory report |

### Notifications

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/notifications` | protect | Get my notifications + unread count |
| PATCH | `/notifications/read` | protect | Mark all as read |
| PATCH | `/notifications/:id` | protect | Mark one as read |

### Vendors

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| GET | `/vendors` | protect | All staff | List vendors |
| POST | `/vendors` | protect | superadmin, admin, manager | Create vendor |
| GET | `/vendors/:id` | protect | superadmin, admin, manager | Get single vendor |
| PATCH | `/vendors/:id` | protect | superadmin, admin, manager | Update vendor |
| DELETE | `/vendors/:id` | protect | superadmin, admin | Delete vendor |

### Purchases

| Method | Path | Auth | Roles | Description |
|---|---|---|---|---|
| POST | `/purchases` | protect + branchScope | superadmin, admin, manager | Create bulk purchase |
| GET | `/purchases` | protect + branchScope | superadmin, admin, manager | List purchases |
| PATCH | `/purchases/:id/paid` | protect | superadmin, admin, manager | Mark purchase paid |
| POST | `/parts/:id/purchase` | protect + branchScope | superadmin, admin, manager | Record stock purchase (single part) |
| PATCH | `/parts/:id/batches/:batchId/deactivate` | protect + branchScope | superadmin, admin, manager | Deactivate a vendor batch |

### SuperAdmin

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/superadmin/audit` | protect + superAdminOnly | Get audit logs |
| GET | `/superadmin/users` | protect + superAdminOnly | List all users |
| POST | `/superadmin/users` | protect + superAdminOnly | Create user |
| PATCH | `/superadmin/users/:id` | protect + superAdminOnly | Update user |

### Health Check

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | None | Returns `{ status, env, timestamp }` |

---

## 10. Client-Side Architecture

### Entry Point (`main.tsx`)

- Renders `<App />` inside `<AuthProvider>` and `<BrowserRouter>`
- Imports Tailwind CSS

### API Client (`api/client.ts`)

- **Base URL**: `VITE_API_URL` env or `/api` (default)
- **Token management**: In-memory `_token` variable with `getToken`/`setToken`/`clearToken`
- **Auto-refresh**: On 401, automatically calls `refreshToken()` and retries
- **Cache**: `cache: 'no-store'` to prevent stale 304 responses
- **Credentials**: `credentials: 'include'` for cookies

**API endpoint groups:**

| Export | Endpoints |
|---|---|
| `auth` | login, superAdminLogin, getMe, logout, changePassword |
| `pub` | getServices, getBranches, createBooking, track |
| `jobs` | list, create, update, addSpares, remove, addPayment |
| `parts` | list, create, update, remove |
| `approvals` | list, mine, pendingCount, review (with normalization) |
| `bookings` | list, update, convert |
| `branches` | list, create, update, activate, deactivate, remove |
| `services` | list, create, update, activate, deactivate, remove |
| `users` | list, create, update, activate, deactivate, remove, resetPassword |
| `reports` | dashboard, revenue, inventory |
| `notifications` | list, markAllRead |
| `audit` | list (superadmin only) |
| `vendors` | list, get, create, update, remove |
| `purchases` | list, create, recordStock, markPaid, deactivateBatch |
| `vehicleLookup` | Vehicle autofill |

### Normalization (`api/normalize.ts`)

- `normalizeApprovals()` — Ensures `requestedBy` is always a populated object, never a raw string

### Auth Context (`context/AuthContext.tsx`)

- **State**: `{ user, loading, login, superAdminLogin, logout }`
- **Rehydration**: On mount, calls `refreshToken()` → `auth.getMe()` to restore session
- **Role helpers**: `isAdmin`, `isManager`, `isSuperAdmin`, `isEmployee`, `defaultRoute`

### Hooks

| Hook | Purpose |
|---|---|
| `useData` | Data fetching hooks for jobs, parts, bookings, etc. |
| `useForm` | Form state management with validation |
| `useConfirm` | Confirmation dialog modal |

### Layouts

| Layout | Used By | Features |
|---|---|---|
| `PublicLayout` | Public pages | Customer-facing header, footer, WhatsApp integration |
| `PortalLayout` | Employee portal | Mobile-first nav, notification bell |
| `AdminLayout` | Admin ERP | Full sidebar nav, notification bell, user menu |
| `ManagerLayout` | Manager dashboard | Branch-scoped sidebar nav |
| `AppLayout` | Shared base | Common layout wrapper |

---

## 11. Client Pages & Components

### Admin Pages (`pages/admin/`)

| Page | Component | Purpose |
|---|---|---|
| `index.tsx` | — | Exports all admin pages |
| `Audit.tsx` | `AdminAudit` | View audit logs with severity filter and search |
| `Bookings.tsx` | `AdminBookings` | Manage bookings: confirm, reject, convert to job cards |
| `Branches.tsx` | `AdminBranches` | CRUD branches with working hours, contact info |
| `Credits.tsx` | `AdminCredits` | Track credit payments, mark collected |
| `Profile.tsx` | `AdminProfile` | Admin profile management |
| `Reports.tsx` | `AdminReports` | Revenue, mechanic performance, service/brand analytics |
| `Services.tsx` | `AdminServices` | CRUD services with pricing and categories |

### Auth Pages (`pages/auth/`)

| Page | Component | Purpose |
|---|---|---|
| `Login.tsx` | `Login` | Employee/admin login form |
| `SuperAdminLogin.tsx` | `SuperAdminLogin` | SuperAdmin login (username + password) |

### Manager Pages (`pages/manager/`)

| Page | Component | Purpose |
|---|---|---|
| `index.tsx` | — | Exports all manager pages |
| `Bookings.tsx` | `ManagerBookings` | Branch-scoped booking management |
| `Profile.tsx` | `ManagerProfile` | Manager profile |
| `Reports.tsx` | `ManagerReports` | Branch-scoped reports |

### Portal Pages (`pages/portal/`)

| Page | Component | Purpose |
|---|---|---|
| `index.tsx` | — | Exports all portal pages |
| `Dashboard.tsx` | `PortalDashboard` | Employee dashboard overview |
| `Bookings.tsx` | `PortalBookings` | View/convert bookings to jobs |
| `Jobs.tsx` | `PortalJobs` | View job cards |
| `NewJob.tsx` | `NewJob` | Create new job card with vehicle autofill |
| `Parts.tsx` | `PortalParts` | View inventory (read-only) |
| `Requests.tsx` | `PortalRequests` | Submit and track approval requests |
| `Profile.tsx` | `PortalProfile` | Employee profile |

### Public Pages (`pages/public/`)

| Page | Component | Purpose |
|---|---|---|
| `Home.tsx` | `Home` | Public website: booking form, vehicle tracking, branch finder, service catalog |

### Shared Pages (`pages/shared/`)

| Page | Component | Purpose |
|---|---|---|
| `ApprovalsPage.tsx` | `ApprovalsPage` | Approval management (used by admin + manager) |
| `DashboardPage.tsx` | `DashboardPage` | Dashboard with stats (used by admin + manager) |
| `EmployeesPage.tsx` | `EmployeesPage` | Employee management (used by admin + manager) |
| `InventoryPage.tsx` | `InventoryPage` | Inventory management with vendor batches |
| `JobsPage.tsx` | `JobsPage` | Job card management with status workflow |

### Components (`components/`)

| Component | Purpose |
|---|---|
| `JobForm.tsx` | Job card create/edit form with spare parts assignment |
| `JobIntakePrint.tsx` | Printable job intake sheet |
| `JobInvoice.tsx` | Printable invoice with payment details |
| `ui.tsx` | Shared UI: `PageLoader`, `ToastProvider`, `useToast`, buttons, inputs, modals, badges, tables |

---

## 12. Security

### Server-Side Security

| Layer | Implementation |
|---|---|
| Helmet | CSP headers, configured for self + unsafe-inline + Google Fonts |
| CORS | Origin from `CLIENT_URL`, credentials enabled |
| Rate limiting | Global + login + public + booking limiters |
| NoSQL injection | `express-mongo-sanitize` |
| XSS | `xss-clean` |
| HTTP param pollution | `hpp` |
| Body size limit | 10kb JSON + URL-encoded |
| Password hashing | bcrypt with 12 rounds |
| JWT | Separate access (15min) + refresh (7d) + superadmin secrets |
| Account lockout | 5 failed attempts → 2-hour lock |
| Password change detection | Invalidates tokens after password change |
| Audit logging | All mutations logged with severity |
| Trust proxy | Enabled for nginx forwarding |
| Non-root Docker user | `bms` user in Dockerfile |

### Client-Side Security

| Layer | Implementation |
|---|---|
| Token storage | In-memory (not localStorage — XSS resistant) |
| Refresh token | HttpOnly cookie (not accessible via JS) |
| Auto-refresh | On 401, transparent token rotation |
| Route guards | Role-based guards redirect unauthorized users |
| Cache prevention | `cache: 'no-store'` on all API calls |

---

## 13. Infrastructure & Deployment

### Docker Setup

**Dockerfile:**
- Base: `node:20-alpine`
- Production-only dependencies (`npm ci --only=production`)
- Non-root user `bms`
- Healthcheck: `wget http://localhost:5000/health`
- Exposes port 5000

**docker-compose.yml:**

| Service | Image | Port | Purpose |
|---|---|---|---|
| `mongo` | `mongo:7.0` | `127.0.0.1:27017` | MongoDB with auth, healthcheck, init script |
| `app` | Built from Dockerfile | `5000:5000` | Node.js application |
| `nginx` | `nginx:1.25-alpine` | `80:80`, `443:443` | Reverse proxy (optional profile: `--profile with-nginx`) |

**MongoDB init (`mongo-init/init-mongo.js`):**
- Database: `balaji_motors_bms`
- User: `bms_app` with `readWrite` role

**Nginx (`nginx.conf`):**
- Reverse proxy to `app:5000`
- `client_max_body_size 10m`
- HTTPS block (commented — enable after certbot)

### Vercel Deployment (Alternative)

- `client/vercel.json` — SPA rewrite: all routes → `/index.html`
- Frontend can be deployed independently to Vercel
- Backend deployed separately (Docker/VPS)

### Development Setup

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env

# Seed database
npm run seed

# Start development server
npm run dev  # nodemon server/index.js → http://localhost:5000

# Client development (separate terminal)
cd client && npm install && npm run dev  # vite dev server with /api proxy
```

---

## 14. Environment Variables

```env
# Database
MONGO_URI=                    # MongoDB connection string
MONGO_ROOT_USER=              # Docker mongo root user
MONGO_ROOT_PASS=              # Docker mongo root password
MONGO_APP_USER=               # Docker mongo app user
MONGO_APP_PASS=               # Docker mongo app password
MONGO_DB=                     # Database name (balaji_motors_bms)

# JWT
JWT_SECRET=                   # Access token secret
JWT_REFRESH_SECRET=           # Refresh token secret
JWT_SUPERADMIN_SECRET=        # SuperAdmin token secret (implied)

# Admin
ADMIN_EMAIL=                  # Seeded admin email
ADMIN_PASSWORD=               # Seeded admin password

# SuperAdmin (env-based, not in DB)
SUPERADMIN_USERNAME=          # SuperAdmin username
SUPERADMIN_PASSWORD=          # SuperAdmin password

# Email
GMAIL_USER=                   # Gmail address
GMAIL_APP_PASSWORD=           # Gmail app password (2FA required)

# Security
COOKIE_SECRET=                # Cookie signing secret
BCRYPT_SALT_ROUNDS=           # Default: 12

# Client
CLIENT_URL=                   # CORS origin (default: http://localhost:5000)

# Server
PORT=                         # Default: 5000
NODE_ENV=                     # development | production

# Client (Vite)
VITE_API_URL=                 # API base URL (default: /api)
```

### Generate Secure Secrets

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## 15. Development Commands

| Command | Purpose |
|---|---|
| `npm start` | Start production server (`node server/index.js`) |
| `npm run dev` | Start dev server with nodemon |
| `npm run seed` | Seed database with initial admin + employee |
| `npm run migrate:inventory` | Migrate old inventory to vendor-batch architecture |
| `cd client && npm run dev` | Start Vite dev server (proxies /api → localhost:5000) |
| `cd client && npm run build` | Build client (`tsc && vite build` → `client/dist`) |
| `docker compose up -d` | Start all services (mongo + app) |
| `docker compose --profile with-nginx up -d` | Start with nginx reverse proxy |
| `docker compose exec app npm run seed` | Seed database in Docker |
| `docker compose logs -f` | View logs |
| `docker compose down` | Stop all services |

---

## 16. Key Business Logic

### Job Card Lifecycle

```txt
Received → In Progress → Ready → Delivered
                                    ↓
                               Cancelled
```

### Job Number Generation

- Format: `JC-YYYYMMDD-NNNN`
- Uses `Counter` model with atomic `findByIdAndUpdate` + `$inc` + `upsert`
- Counter ID: `branch_<branchId>`
- Race-condition free

### Booking Number Generation

- Format: `BK-YYYYMMDD-NNNN`
- Uses `countDocuments() + 1` (not atomic — potential race condition under high load)

### Auto-Calculated Fields (JobCard)

```
sparesCost   = Σ (sellingPrice × qty) for each spare
totalAmount  = max(0, labourCharge + waterWash + sparesCost - discount)
paidAmount   = Σ paymentHistory.amount
balanceAmount = max(0, totalAmount - paidAmount)

paymentStatus:
  - Paid    if balanceAmount <= 0
  - Partial if paidAmount > 0
  - Pending otherwise
```

### Inventory Stock Calculation

```
totalStock = Σ vendorBatches[isActive].stock
isLowStock = totalStock <= minStock
stockValue = totalStock × avg(active batches' sellingPrice)
```

### Approval Workflow

1. Employee creates approval request (type: job_edit, job_delete, part_edit, part_delete, part_add, credit_collect)
2. Request stores `currentData` and `requestedData` snapshots
3. Manager/Admin reviews: approve or reject with note
4. On approval, requested changes are applied to the target entity
5. Notification sent to requester

### Branch Isolation

- `branchScope` middleware sets `req.branchFilter = req.user.branch`
- Controllers use `req.branchFilter` in queries to scope data
- Admin/SuperAdmin bypass branch filtering (all branches)
- Manager/Employee only see their assigned branch

### Credit Collection

- Jobs with `paymentMode: 'Credit'` are tracked
- `creditCollected` flag tracks if credit has been collected
- `creditCollectedAt` and `creditCollectedMode` record collection details
- Admin Credits page manages credit collection

---

## 17. Known Issues & Notes

### Route Registration

- In `server/routes/index.js`, the `vendors`, `purchases`, and `vehicle-lookup` routes are registered **after** `module.exports = router` (lines 104-119)
- These routes may not be properly registered — verify they work as expected

### Inventory Migration

- Old inventory system had single `stock` and `unitPrice` fields
- New system uses `vendorBatches` array with per-batch pricing and stock
- Migration script (`migrateInventory.js`) converts old data
- Old fields no longer exist in the schema

### SuperAdmin Authentication

- SuperAdmin is **not stored in MongoDB** — credentials are environment-based
- Separate JWT verification path
- `req.user = { id: 'superadmin', role: 'superadmin', name: 'Super Admin' }` — no DB lookup

### Client Type Fixes

- `types.ts` has several `// fix:` comments indicating past type issues
- `requestedBy` on `ApprovalRequest` is always normalized to an object at the API layer
- `createdAt` fields are always present (non-optional) on server responses

### Vercel Deployment

- `client/vercel.json` has SPA rewrite for frontend-only deployment
- Backend must be deployed separately
- `client/server-index-updated.js` is a reference file for alternative server setup

---

## 18. Future Roadmap

Per README:

- [ ] React Query integration
- [ ] Branch selector tabs
- [ ] PWA support
- [ ] SMS integration
- [ ] Automated backups
- [ ] Advanced analytics
- [ ] Customer billing portal
- [ ] Live notifications

---

## Default Seed Credentials

```txt
Admin:    admin@balajimotor.in
Employee: employee@balajimotor.in / Employee@1234
```

⚠️ **Change immediately after deployment.**

---

## License

Private proprietary software built for **Balaji Motors Bike Care**, Tamil Nadu, India.