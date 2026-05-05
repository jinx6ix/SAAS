# SafariOps v3 — Setup Guide

## What's new in v3

- **Structured logging** — every request logged with requestId, userId, tenantId, timestamp, log level
- **Owner admin panel** — full control: approve/reject payments, change plans, suspend, extend trial, delete tenants
- **Audit log** — every owner action stored in DB and queryable from /admin → Logs tab
- **No token gate on /admin** — just log in with your OWNER_EMAIL and the panel appears automatically
- **Plan enforcement** — user limits enforced at API level

## Steps

### 1. Run the AuditLog SQL in Supabase
```sql
-- Paste add_auditlog.sql into Supabase SQL Editor and run
```

### 2. Add AuditLog to schema.prisma
Paste the contents of schema_auditlog_addition.prisma at the bottom of your prisma/schema.prisma

### 3. Install uuid package
```bash
pnpm add uuid
pnpm add -D @types/uuid
```

### 4. Regenerate Prisma client
```bash
npx prisma generate
```

### 5. Set env vars
```bash
cp .env.example .env.local
# Fill in: DATABASE_URL, DIRECT_URL, NEXTAUTH_SECRET, NEXTAUTH_URL,
#          OWNER_EMAIL, NEXT_PUBLIC_OWNER_EMAIL, ADMIN_SECRET_TOKEN,
#          RESEND_API_KEY, TWILIO_*, OWNER_WHATSAPP
```

### 6. Run dev
```bash
pnpm run dev
```

## Owner Admin Panel (/admin)

Access automatically when logged in as OWNER_EMAIL.

### Overview tab
- MRR summary
- Pending payment requests with one-click Approve/Reject

### Tenants tab
- Search/filter all tenants
- Per tenant: Change Plan, Activate, Suspend, +7 Day Trial, Delete, View Logs

### Logs tab
- Audit trail of all owner actions
- Filterable by tenant

## Logging

Logs output as structured JSON in production (queryable in Vercel Logs):
```json
{"timestamp":"2026-05-03T10:00:00Z","level":"info","message":"Booking created","service":"safarops","context":{"requestId":"uuid","userId":"xxx","tenantId":"yyy"},"data":{"bookingId":"zzz"}}
```

In development, pretty-printed with color to console.

Log levels:
- debug — low-level details (only in dev by default)
- info  — normal operations (booking created, user logged in)
- warn  — notable issues (payment failed, limit reached)
- error — things that broke (DB error, unexpected exception)

Set LOG_LEVEL=debug in .env.local to see all logs.
