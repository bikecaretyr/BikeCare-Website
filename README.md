# 🚀 Balaji Motors Bike Care ERP (BMS)

> Full-stack multi-branch workshop management ERP built for Balaji Motors Bike Care, Tamil Nadu.

---

# 📦 Version

## BMS v1.0.0 — First Production Launch

Release Date: May 2026

This is the first stable production release of the Balaji Motors Bike Care ERP platform.

The system combines:

* Multi-branch workshop operations
* Role-based ERP management
* Vendor-based inventory tracking
* Batch-level stock accounting
* Purchase & payment management
* Job lifecycle automation
* Approval workflows
* Secure authentication architecture
* Mobile-first operational workflows
* Docker-ready deployment

---

# 🏍 Overview

Balaji Motors Bike Care ERP (BMS) is a complete full-stack workshop management system designed for two-wheeler service centers.

The platform supports:

* Customer bookings
* Workshop job card workflows
* Inventory management
* Vendor and purchase tracking
* Employee approvals
* Revenue analytics
* Credit collection
* Branch-specific operations
* Admin and manager dashboards

The system is designed to scale across multiple branches while maintaining strict branch isolation and operational security.

---

# 🌐 Application Structure

| Route         | Purpose                    | Access          |
| ------------- | -------------------------- | --------------- |
| `/`           | Public customer website    | Customers       |
| `/portal`     | Employee operations portal | Employees       |
| `/admin`      | ERP dashboard              | Admin / Manager |
| `/superadmin` | System-level access        | Developer only  |

---

# 🏗 Tech Stack

## Backend

* Node.js 20
* Express 4
* MongoDB 7
* Mongoose 8
* JWT Authentication
* Nodemailer
* Winston Logger

## Frontend

* React
* TypeScript
* Tailwind CSS
* Vite

## Security

* Helmet
* Rate Limiting
* bcrypt (12 rounds)
* XSS Sanitization
* NoSQL Injection Protection
* Secure JWT Refresh Flow

## Infrastructure

* Docker
* Docker Compose
* Nginx Reverse Proxy
* Certbot SSL

---

# 👥 Role Hierarchy

```txt
SUPERADMIN
    └── ADMIN
            └── MANAGER
                      └── EMPLOYEE
```

---

# 🔐 Authentication System

## Access Tokens

* JWT Access Token
* Expiry: 15 minutes

## Refresh Tokens

* JWT Refresh Token
* Expiry: 7 days
* Stored in HttpOnly cookies

## Security Features

* Account lockout after repeated failed logins
* Refresh token rotation
* Password hashing with bcrypt
* Environment-based SuperAdmin credentials
* Branch-aware authorization
* Audit logging

---

# 🌿 Branch Isolation Architecture

Every branch operates independently.

Managers and employees only access data belonging to their assigned branch.

## Isolated Resources

* Job Cards
* Inventory
* Purchases
* Bookings
* Employees
* Approval Requests
* Revenue Reports

## Access Matrix

| Role       | Scope                |
| ---------- | -------------------- |
| SuperAdmin | Entire system        |
| Admin      | All branches         |
| Manager    | Assigned branch only |
| Employee   | Assigned branch only |

The `branchFilter` middleware automatically scopes queries.

---

# 🧩 Core Features

# 1. Customer Portal (`/`)

## Features

* Service booking form
* Vehicle status tracking
* Branch finder
* WhatsApp integration
* Service catalog
* Tamil + English language toggle
* Mobile-responsive design

## Vehicle Tracking

Customers can track:

* Current service status
* Assigned mechanic
* Delivery status
* Payment status

Search methods:

* Vehicle number
* Phone number

---

# 2. Employee Portal (`/portal`)

## Features

* Create job cards
* Vehicle autofill
* View inventory
* Convert bookings into jobs
* Submit approval requests
* Assign spare parts
* View own request status
* Mobile-first workflow UI

## Restrictions

Employees:

* Cannot directly modify protected data
* Cannot deliver jobs
* Cannot bypass approval workflows
* Cannot access other branches

---

# 3. Admin ERP Dashboard (`/admin`)

## Features

### Workshop Operations

* Full job card management
* Booking management
* Inventory control
* Service management
* Spare assignment
* Status tracking

### Employee Management

* Create employees
* Create managers
* Reset passwords
* Deactivate employees
* Branch assignment

### Financial Systems

* Credit tracking
* Payment collection
* Revenue analytics
* Purchase history
* Vendor payment tracking

### Reports

* Revenue reports
* Mechanic performance
* Service analytics
* Brand analytics
* Inventory reports
* Payment mode reports

---

# 4. Manager Dashboard

Managers have branch-scoped ERP access.

## Capabilities

* Manage branch employees
* Approve requests
* Manage branch inventory
* Confirm bookings
* View branch analytics
* Create and manage jobs

## Restrictions

Managers cannot:

* Access other branches
* Create services globally
* Modify system settings
* Manage global branches

---

# 5. SuperAdmin Dashboard (`/superadmin`)

## Features

* Separate authentication system
* Environment-only credentials
* Full audit log access
* System-wide monitoring
* Developer-level controls

The SuperAdmin account is not stored in MongoDB.

---

# 📦 Inventory System

## v1 Inventory Architecture

The inventory system was fully redesigned before launch.

---

## Previous Problems

Old design limitations:

* Single stock field
* Single price field
* No vendor tracking
* No purchase history
* No batch accounting
* Inaccurate stock valuation

---

## New Vendor-Based Inventory System

Each part now supports:

* Multiple vendor batches
* Vendor-specific pricing
* Vendor-specific stock quantities
* Batch-level deductions
* Purchase tracking
* Payment due tracking

---

# 🏪 Vendor System

## Vendor Model

```js
{
  name,
  phone,
  paymentDueDays,
  vehicleModels,
  branches,
  isActive,
  isLegacy
}
```

## Features

* Multi-branch vendor mapping
* Vendor due tracking
* Vehicle specialization mapping
* Vendor purchase history
* Legacy migration support

---

# 📥 Purchase Management

## PurchaseEntry Model

```js
{
  vendor,
  part,
  branch,
  qty,
  purchasePrice,
  sellingPrice,
  batchId,
  paymentDueDate,
  paymentPaid,
  notes,
  createdBy
}
```

## Features

### Bulk Purchases

Admins and managers can:

* Add multiple parts in one purchase
* Add miscellaneous charges
* Set payment due dates
* Track payment status
* Add stock to multiple parts simultaneously

### Payment Tracking

Supports:

* Due date calculation
* Pending payment tracking
* Payment settlement
* Vendor payment history

---

# 🧾 Part Model

## Updated Structure

```js
{
  name,
  branch,
  totalStock,
  vendorBatches: [],
  minStock
}
```

## Vendor Batch Structure

```js
{
  vendorId,
  vendorName,
  purchasePrice,
  sellingPrice,
  stock,
  purchasedAt,
  isActive
}
```

## Important Notes

* `totalStock` is auto-synced
* Stock is deducted batch-wise
* Vendor pricing is preserved historically
* Old `stock` and `unitPrice` fields no longer exist

---

# 🔧 Job Card System

## Features

* Atomic job number generation
* Vehicle autofill lookup
* Spare parts assignment
* Batch-level inventory deduction
* Auto-calculated spare cost
* Credit tracking
* Mechanic assignment
* Status workflow system

---

# 🧱 Spare Item Architecture

```js
{
  partId,
  partName,
  vendorBatchId,
  vendorName,
  sellingPrice,
  qty
}
```

Snapshots ensure historical accuracy even if vendor or pricing changes later.

---

# 🔄 Approval Workflow System

## Employees Can Request

* Inventory modifications
* Job edits
* Part changes
* Data updates
* Deletions

## Managers/Admins Can

* Approve requests
* Reject requests
* Add rejection notes
* Review request history

---

# 📊 Reporting & Analytics

## Included Reports

* Revenue reports
* Mechanic performance reports
* Service analytics
* Brand analytics
* Inventory reports
* Credit reports
* Branch performance reports
* Payment mode analytics

---

# 📡 API Endpoints

# Authentication

```txt
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/logout
GET    /api/auth/me
```

---

# Vendors

```txt
GET    /api/vendors
POST   /api/vendors
GET    /api/vendors/:id
PATCH  /api/vendors/:id
DELETE /api/vendors/:id
```

---

# Purchases

```txt
POST   /api/purchases
GET    /api/purchases
PATCH  /api/purchases/:id/paid
```

---

# Inventory

```txt
POST   /api/parts/:id/purchase
PATCH  /api/parts/:id/batches/:batchId/deactivate
```

---

# Jobs

```txt
GET    /api/jobs
POST   /api/jobs
PATCH  /api/jobs/:id
DELETE /api/jobs/:id
GET    /api/jobs/vehicle-lookup
```

---

# 🚀 Local Development Setup

# Prerequisites

* Node.js >= 18
* MongoDB 7
* npm

---

# Installation

```bash
# Clone repository
cd bms

# Install dependencies
npm install

# Configure environment
cp .env.example .env

# Seed database
npm run seed

# Start development server
npm run dev
```

Application runs at:

```txt
http://localhost:5000
```

---

# ⚙️ Environment Variables

```env
MONGO_URI=
JWT_SECRET=
JWT_REFRESH_SECRET=
ADMIN_EMAIL=
ADMIN_PASSWORD=
GMAIL_USER=
GMAIL_APP_PASSWORD=
CLIENT_URL=
```

---

# 🔑 Generate Secure Secrets

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

# 🐳 Docker Deployment

## Start Services

```bash
docker compose up -d
```

## Seed Database

```bash
docker compose exec app npm run seed
```

## View Logs

```bash
docker compose logs -f
```

## Stop Services

```bash
docker compose down
```

---

# 🌐 Production Deployment

# Recommended Stack

* Ubuntu 22.04 VPS
* Docker
* Docker Compose
* Nginx
* Certbot SSL

---

# Install Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

---

# Deploy Application

```bash
scp -r ./bms user@server-ip:/home/user/bms

ssh user@server-ip
cd bms

cp .env.example .env
nano .env

docker compose up -d
```

---

# SSL Setup

```bash
sudo apt install certbot -y

sudo certbot certonly --standalone \
-d yourdomain.com \
-d www.yourdomain.com
```

Certificates:

```txt
/etc/letsencrypt/live/yourdomain.com/fullchain.pem
/etc/letsencrypt/live/yourdomain.com/privkey.pem
```

---

# 📧 Gmail SMTP Setup

1. Enable Google 2FA
2. Create Gmail App Password
3. Use App Password in `.env`

```env
GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
```

---

# 🧠 Database Indexes

## JobCard Indexes

```js
{ branch: 1, createdAt: -1 }
{ branch: 1, status: 1 }
{ vehicleNumber: 1 }
{ customerPhone: 1 }
```

## Part Indexes

```js
{ branch: 1, isActive: 1 }
{ branch: 1, totalStock: 1 }
```

## Vendor Indexes

```js
{ isActive: 1 }
{ branches: 1 }
```

---

# 🔄 Inventory Migration Script

Used to migrate old inventory architecture.

## Run Migration

```bash
node server/utils/migrateInventory.js
```

## What It Does

* Creates legacy vendors
* Converts old stock into vendor batches
* Migrates pricing
* Preserves historical values
* Updates total stock

Safe to run multiple times.

---

# 📂 Project Structure

```txt
bms/
├── server/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── utils/
│   └── index.js
│
├── client/
│   ├── components/
│   ├── layouts/
│   ├── pages/
│   ├── api/
│   ├── context/
│   └── main.tsx
│
├── logs/
├── Dockerfile
├── docker-compose.yml
├── nginx.conf
└── README.md
```

---

# 🛡 Security Notes

* Never commit `.env`
* Change seeded passwords immediately
* Use strong JWT secrets
* Use HTTPS in production
* Restrict server ports
* Use firewall rules
* Backup MongoDB regularly
* Rotate credentials periodically

---

# 📈 Future Roadmap

## Planned Features

* Socket.IO realtime updates
* React Query integration
* Branch selector tabs
* PWA support
* SMS integration
* Automated backups
* Full invoice printing
* Advanced analytics
* Customer billing portal
* Live notifications

---

# 📋 Default Seed Credentials

```txt
Admin:
admin@balajimotor.in

Employee:
employee@balajimotor.in
Employee@1234
```

Change immediately after deployment.

---

# 📜 License

Private proprietary software built for Balaji Motors Bike Care.

---

# ❤️ Built For

Balaji Motors Bike Care
Tamil Nadu, India
