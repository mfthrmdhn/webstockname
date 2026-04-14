# Phase 1: Foundation - Context

**Gathered:** 2026-04-14 (assumptions mode)  
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can securely access the system with role-based permissions and all operations are immutably logged.

This phase establishes the security and audit infrastructure for WebStockName. It covers:
- Staff authentication (login, session persistence, logout)
- Three-role RBAC (Superadmin, Finance, Cashier) with endpoint-level enforcement
- User account management (create, edit, deactivate, role assignment) — superadmin only
- Immutable append-only audit logging for all state-changing operations
- Basic product catalog management (superadmin creates products with SKU, name, price, cost)

Downstream phases depend on this foundation for all user-scoped operations and audit trails.

</domain>

<decisions>
## Implementation Decisions

### Authentication & Session Management
- **D-01:** Use stateless JWT authentication with access tokens (15-min expiry) + refresh tokens stored in HttpOnly cookies (7-day expiry)
  - Enables horizontal scaling; no sticky load balancer required
  - Refresh token in HttpOnly prevents XSS access to long-lived credentials
  - Access token TTL forces periodic refresh, limiting exposure window

- **D-02:** Validate JWT on every request (check exp, verify signature); refresh flow: expired access token → POST /auth/refresh with cookie-provided refresh token → issue new access token
  - Stateless validation allows any server instance to serve any request
  - Refresh endpoint validates refresh token signature + expiry before issuing new access token

- **D-03:** Password hashing with bcryptjs (10+ rounds) on backend only, never on frontend; enforce 12-character minimum via Zod validation
  - Frontend hashing provides false security (plaintext exposed in transit or at input)
  - Backend-only hashing ensures all passwords hashed with consistent cost factor
  - 12-char minimum raises brute-force difficulty

### Role-Based Access Control (RBAC)
- **D-04:** Three roles with hardcoded permissions:
  - **Superadmin**: Access to all features and data; user management; incentive entry; audit view
  - **Finance**: Read-only access to sales reports and incentive data
  - **Cashier**: Access only to inventory checking and sales processing (checkout UI only)

- **D-05:** Enforce RBAC at Express middleware level, before controller execution. Each endpoint declares required role(s); middleware checks `req.user.role` and rejects unauthorized requests with 403 Forbidden before any business logic runs
  - Centralized authorization prevents scattered permission checks in service logic
  - Clear audit trail: all 403s logged with user_id, endpoint, and reason
  - Fails secure: if middleware misconfigured, endpoint never executes

- **D-06:** Roles stored as enum in database (SUPERADMIN | FINANCE | CASHIER); no dynamic role creation in Phase 1
  - Enum constraint prevents invalid role values at database level
  - Simplifies RBAC logic (no role → permission lookup; roles are fixed)
  - Matches three-role model in requirements and ROADMAP

### User Account Management
- **D-07:** User deactivation via soft-delete: add `is_active` boolean to User table (default true); deactivation sets `is_active = false` (no hard DELETE)
  - Preserves historical sales, audit records, and transaction links even after deactivation
  - Deactivated users cannot log in (login endpoint checks `is_active`)
  - Enables rehire/reactivation without data loss

- **D-08:** Superadmin-only user CRUD endpoints:
  - POST /users (create): username, password, email, role, initial_name
  - GET /users (list): all users with is_active flag
  - PATCH /users/{id} (edit): name, role, is_active status
  - Deactivation triggers audit log entry with superadmin_id and reason
  - All user changes logged to AuditLog with before/after values

### Immutable Audit Logging
- **D-09:** Single AuditLog table (INSERT-only, no UPDATE/DELETE via triggers/constraints) recording:
  - user_id: who performed the action
  - action: enum (LOGIN, LOGOUT, USER_CREATE, USER_EDIT, USER_DEACTIVATE, PRODUCT_CREATE, ROLE_CHANGE, PASSWORD_CHANGE)
  - resource_type: User, Product, Sale, Incentive, etc.
  - resource_id: ID of affected resource
  - before_values: JSON object with previous values (null if new record)
  - after_values: JSON object with current values
  - timestamp: UTC timezone, immutable
  - ip_address: client IP (optional, for security audit)

- **D-10:** Append-only enforcement via PostgreSQL:
  - AuditLog has no UPDATE or DELETE permissions (only INSERT)
  - Trigger prevents any UPDATE/DELETE attempts on AuditLog
  - Superadmin cannot modify/delete audit records (no exceptions)
  - Retention: minimum 3 years (defer archival strategy to Phase 3+)

- **D-11:** Login/logout audit:
  - Successful login: log to AuditLog with action=LOGIN, user_id, timestamp, ip_address
  - Failed login attempt: log to AuditLog with action=LOGIN_FAILED, reason (user_not_found | password_mismatch | user_inactive), username (not user_id, since user not found), timestamp, ip_address
  - Logout: log action=LOGOUT, user_id, timestamp
  - UI returns generic "Invalid credentials" for login failures (do not expose whether username exists)

### Prisma Schema & Migrations
- **D-12:** Use Prisma 7.4+ with TypeScript schema.prisma, auto-generated Prisma Client, and SQL migrations checked into version control
  - Type-safe queries prevent SQL injection and schema mismatches
  - Migrations are idempotent and trackable in git
  - Prisma query caching (v7.4+) prevents N+1 on frequent RBAC lookups (e.g., checking user.role)

- **D-13:** Phase 1 schema includes:
  - User: id, email (unique), password_hash, role (enum), is_active (bool, default true), created_at, updated_at
  - AuditLog: id, user_id (nullable for system actions), action (enum), resource_type, resource_id, before_values (JSON, nullable), after_values (JSON), timestamp, ip_address (nullable), created_at
  - Product: id, sku (unique), name, selling_price, cost, created_at, updated_at
  - Indices: User.email, AuditLog.timestamp, AuditLog.user_id, Product.sku

### UI Structure
- **D-14:** Superadmin dashboard includes:
  - Login page (email/password form)
  - User management page (list users, create, edit, deactivate)
  - Product management page (create products, view list) — basic CRUD, no bulk import in Phase 1
  - Audit log viewer (filter by date range, user, action) — read-only, no export in Phase 1

- **D-15:** Role-specific access:
  - Superadmin sees all pages
  - Finance and Cashier roles are prepared (auth/RBAC working) but have no pages in Phase 1 (their dashboards come in Phase 2+)
  - Unauthorized role accessing superadmin pages: redirect to 403 error page with message

### Claude's Discretion
- Exact progress bar implementation for admin UI
- Specific styling/layout for login form and user management tables (follows shadcn/ui conventions)
- Error message copy and validation feedback phrasing
- IP address capture logic for audit log (could be optional if complexity too high)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Technology Stack & Architecture
- `CLAUDE.md` (lines 18-45) — Locked tech stack: Next.js 16, Express.js, PostgreSQL, Prisma 7.4+, JWT + HttpOnly cookies, bcryptjs
- `CLAUDE.md` (lines 151-156) — Security defaults: JWT access 15min, refresh 7d, bcryptjs cost 10+, HS256 algorithm, HttpOnly + Secure + SameSite cookies
- `CLAUDE.md` (lines 106-126) — Password requirements: minimum 12 characters, enforce via Zod validation

### Requirements & Phase Scope
- `.planning/REQUIREMENTS.md` (lines 10-75) — v1 requirements for Auth, RBAC, User Management, Product Management, Audit Logging
- `.planning/ROADMAP.md` (lines 19-36) — Phase 1 goal, success criteria (5 items), non-negotiable architectural decisions
- `.planning/ROADMAP.md` (lines 95-100) — Immutable audit logging non-negotiable; append-only table, 3-year retention, no superadmin override

### Data Integrity & Compliance
- `.planning/ROADMAP.md` (lines 122-129) — Pitfall prevention: RBAC misconfiguration, audit trail gaps, immutable attribution (relevant for Phase 2, but log design affects future)
- `.planning/PROJECT.md` (lines 53-57) — Constraints: single store, manual everything (no automation)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
No existing source code yet. Phase 1 establishes foundational patterns:
- Express middleware for RBAC (will be reused in Phase 2 for sales endpoint authorization)
- AuditLog schema and insert patterns (will be extended in Phase 2 for inventory changes, sales transactions)
- Prisma User/Role queries (will be referenced in Phase 2 when checking salesperson role)

### Established Patterns
- JWT validation middleware pattern established here will be applied to all endpoints in Phase 2+
- RBAC enum-based approach (no role objects) keeps permission logic simple and type-safe across phases
- Soft-delete pattern (is_active) will be reused for Products, Staff, and potentially Inventory in Phase 2+

### Integration Points
- Authentication middleware must wrap all endpoints in Phase 2 (inventory, sales, reports)
- AuditLog inserts must wrap every state-changing operation in Phase 2 (inventory changes, sales completion)
- User/Role lookups will be needed in Phase 2 for sales attribution (which staff member can process which types of transactions)

</code_context>

<specifics>
## Specific Ideas

- Superadmin login should feel instant and secure (no delays, clear error messages)
- User management page should display active/inactive status clearly (inactive users grayed out or marked)
- Product creation form should accept SKU, name, selling_price, cost; cost is required (for margin calculation in Phase 3)
- Audit log viewer is read-only and filterable; superadmin can see all actions including their own (transparency)

</specifics>

<deferred>
## Deferred Ideas

None — analysis stayed within phase scope.

Scope clarifications that came up and were intentionally excluded:
- Multi-role scenarios (e.g., staff member with both Cashier and Finance roles) — Phase 1 uses single role per user
- Dynamic role creation/permission management — Phase 1 uses three hardcoded roles; revisit in Phase 3+ if expansion needed
- Password reset/forgot password workflow — defer to Phase 2 (not in v1 requirements)
- Two-factor authentication — out of scope for v1 (no requirement)
- Email notifications for user creation/deactivation — out of scope (internal admin tool only)

</deferred>

---

*Phase: 01-foundation*  
*Context gathered: 2026-04-14*  
*Mode: assumptions*