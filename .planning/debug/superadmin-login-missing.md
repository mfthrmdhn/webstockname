---
status: root_cause_found
trigger: superadmin login not working in phase 01-foundation
created: 2026-04-18
updated: 2026-04-18
---

## Symptoms

**Expected behavior:** Successfully log in to dashboard

**Actual behavior:** Prisma error, no account created on users table

**Error messages:** prisma error, no account created on users table

**Timeline:** Never worked

**Reproduction:** Open login page, enter credentials, submit

## Current Focus

**Hypothesis:** Superadmin user account is not seeded/created in the database before login attempt. Login handler tries to query non-existent user, triggering Prisma error.

**Test:** Check if users table has any records, especially superadmin role

**Expecting:** Find that users table is empty or missing superadmin seed data

**Next action:** Identify root cause and fix

**Reasoning checkpoint:** Investigation complete

## Evidence

- User notes: "prisma error, no account created on users table"
- Migration file exists: `prisma/migrations/1776166805377_init/migration.sql` creates roles and users tables correctly
- Seed file exists: `prisma/seed.ts` defines superadmin user creation with username 'superadmin' and hashed password
- Schema correct: `prisma/schema.prisma` defines User and Role models properly
- Login handler is correct: `/app/api/auth/login/route.ts` queries user correctly and returns proper errors
- Environment configured: `.env.local` has DATABASE_URL set
- Package.json has seed script: `"prisma:seed": "tsx prisma/seed.ts"` and prisma seedClient configured

**Key finding:** The database migrations have been run, but the seed command has NOT been executed. The users table exists but is empty.

## Eliminated

- Missing migration: Schema migrations are present and correct
- Broken login handler: Handler code is correct and would work if user existed
- Missing environment: DATABASE_URL is configured

## Resolution

**Root cause:** Database migrations exist but seed data has never been run. The superadmin user account must be created by running `npm run prisma:seed` or `prisma db seed`.

**Password mismatch issue:** Login page shows demo credentials "superadmin / Password123" but seed file hashes "TestPass123!" — need to align these.

**Fix required:**
1. Run database migrations (if not already done): `npm run prisma:migrate`
2. Run seed command to create roles and users: `npm run prisma:seed`
3. Update either the login page demo credentials or the seed password to match (currently misaligned)

**Files involved:**
- `prisma/seed.ts` — defines initial superadmin user with password "TestPass123!"
- `app/login/page.tsx` — shows demo credentials as "superadmin / Password123" (mismatch)
- `lib/db.ts` — database client configuration
- `app/api/auth/login/route.ts` — login endpoint (works correctly if user exists)
