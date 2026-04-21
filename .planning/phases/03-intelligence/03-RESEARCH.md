# Phase 3: Intelligence - Research

**Researched:** 2026-04-21
**Domain:** Financial reporting, incentive management, audit trail viewer
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Single `/finance/reports` page with tab strip: Sales | By Staff | Incentives | Reconciliation. No separate pages per report type.
- **D-02:** Margin data (revenue - cost / revenue) lives inside the Sales tab per-row, not a separate tab.
- **D-03:** Sales tab columns: Time | Product(s) | Salesperson | Total | Payment method | Margin%. Margin% calculated from unitPrice / unitCost on SaleItem (snapshot at sale time).
- **D-04:** By Staff tab: flat table — Salesperson | # sales | Total revenue | Items sold. One row per salesperson, no drill-down.
- **D-05:** Incentives tab: two-level view — per-salesperson summary at top, chronological detail list below.
- **D-06:** Shared date range dropdown at top of `/finance/reports`. Applies to ALL tabs simultaneously.
- **D-07:** Preset ranges only: Today / Yesterday / This Week / This Month. No free-form date picker.
- **D-08:** Default on page load: Today.
- **D-09:** Incentive is a bulk amount per salesperson per period — not linked to a specific sale. New `Incentive` model needed in Prisma schema.
- **D-10:** Incentive fields: salespersonId (FK → User), amount (Decimal), note (String, required), date (Date — the period this incentive covers), enteredById (FK → User), createdAt.
- **D-11:** Incentives are immutable after creation — no edit or delete. Corrections require a new entry.
- **D-12:** Salesperson picker shows only active users with CASHIER role.
- **D-13:** Superadmin sees "Add Incentive" button on Incentives tab; Finance role does not see this button.
- **D-14:** Modal form fields: salesperson (required), amount (required, Decimal), date (required), note/reason (required, textarea). All fields required.
- **D-15:** On submit: POST to API, modal closes, incentive list refreshes. On error: show inline validation inside modal.
- **D-16:** Reconciliation tab shows system-recorded sales totals broken down by payment method: Cash | Card | Transfer | Grand total.
- **D-17:** Finance enters a physical cash drawer amount. System calculates and displays variance (physical - system cash total) in real time.
- **D-18:** Reconciliation result is NOT saved — live calculator only. No DB write, no persistence.
- **D-19:** Finance role gets a sidebar nav. Sidebar has one link: Reports pointing to `/finance/reports`.
- **D-20:** After login, Finance redirects to `/finance/reports`.
- **D-21:** Finance layout wraps the reports page similar to `/app/admin/layout.tsx`.
- **D-22:** Audit log viewer lives at existing `/admin/audit` page — extend the placeholder.
- **D-23:** Three filters: date range (start + end date pickers), user (dropdown of all users), action type (dropdown of action type constants including INCENTIVE_CREATE).
- **D-24:** Audit log display: paginated table — Timestamp | User | Action | Entity Type | Entity ID | Details (from metadata JSON).
- **D-25:** Extend `logAction` with new action type: `INCENTIVE_CREATE`. Record: incentive_id, salesperson_id, amount, date, note, entered_by.

### Claude's Discretion
- Exact Margin% display format (e.g., "23.4%" vs "23%")
- Pagination page size for sales list and audit log
- Empty state copy when no data exists for selected date range
- Loading skeleton design for report tabs
- Exact styling of variance indicator in reconciliation (green/red based on positive/negative)
- Whether to show a running total summary row at the bottom of the Sales tab table

### Deferred Ideas (OUT OF SCOPE)
- Exporting reports to CSV/PDF
- Email report delivery
- Incentive approval workflow (two-Superadmin approval flow)
- Persisted reconciliation records / end-of-day close workflow
- Dashboard landing page for Finance (quick-glance KPIs)
- Drill-down from By Staff tab into individual sales
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| REPORT-01 | Finance can view daily sales report with all transactions | Sales tab with paginated table, date range filter, `/api/reports/sales` endpoint |
| REPORT-02 | Daily sales report shows total revenue, transaction count, and items sold | Summary row at bottom of Sales tab; aggregation in API |
| REPORT-03 | Finance can view sales breakdown by staff member (who sold what) | By Staff tab with GROUP BY salespersonId Prisma aggregation |
| REPORT-04 | Finance can see product price and cost for margin calculation | Margin% from SaleItem.unitPrice / unitCost snapshot — already in schema |
| REPORT-05 | Superadmin can view comprehensive dashboard with sales and inventory | Finance reports page is shared; Superadmin also uses `/finance/reports` with same RBAC |
| REPORT-06 | End-of-day reconciliation report compares register count to system | Reconciliation tab — frontend calculator, no API persistence |
| INCENT-01 | Superadmin can manually enter incentive amount for each salesperson | POST `/api/incentives` with Zod validation; Incentive model in schema |
| INCENT-02 | Finance can view all incentives owed to each staff member | GET `/api/incentives` filtered by date range; Incentives tab |
| INCENT-03 | Incentive entry is recorded in audit trail with date and approver | logAction('INCENTIVE_CREATE', ...) called after successful POST |
| INCENT-04 | Sales attribution data is available to finance for incentive verification | By Staff tab surfaces salesperson → sale mappings; same data set |
| AUDIT-04 | Incentive entries are recorded with who entered it and when | enteredById FK on Incentive model + audit log metadata |
| AUDIT-05 | Superadmin can view full audit trail filtered by date range and user | `/admin/audit` page extended with INCENTIVE_CREATE action type |
</phase_requirements>

---

## Summary

Phase 3 is a read-heavy reporting phase with one new write domain (incentive creation). The foundation from Phases 1 and 2 is solid: the `Sale`, `SaleItem`, `AuditLog`, `User` models are all in place with the correct fields for financial reporting. `SaleItem.unitPrice` and `unitCost` snapshots enable accurate margin calculations. `Sale.salespersonId` and `Sale.createdAt` are indexed, making date-filtered staff aggregations efficient.

The primary new work is: (1) `Incentive` Prisma model migration, (2) three new API routes (`/api/reports/sales`, `/api/reports/staff`, `/api/incentives`), (3) Finance layout + reports page replacing the placeholder, and (4) extending the existing audit page with `INCENTIVE_CREATE`. The reconciliation tab is a frontend-only calculator — no new API endpoint needed for that feature.

The UI contract is fully detailed in `03-UI-SPEC.md`. All shadcn/ui components exist in `components/ui/` except `Tabs` (needs `npx shadcn add tabs`) and `Textarea` (needs `npx shadcn add textarea`).

**Primary recommendation:** Build in wave order — schema migration first, API routes second, Finance layout + reports page third, audit extension last. Reconciliation tab is frontend-only (implement alongside reports page, no separate API wave needed).

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Sales report data (daily) | API / Backend | Database | Aggregation with GROUP BY and date filter is SQL-level work; API returns pre-computed totals |
| By Staff aggregation | API / Backend | Database | GROUP BY salespersonId with SUM/COUNT — backend, not client |
| Margin% calculation | API / Backend | — | Server computes `(unitPrice - unitCost) / unitPrice * 100` per sale before response; avoids floating-point inconsistencies in browser |
| Incentive CRUD | API / Backend | Database | Write with audit log — server-side; Finance UI is read-only consumer |
| Reconciliation calculator | Browser / Client | — | Physical cash is a local input; variance = input - system total — pure frontend math, no round-trip |
| Date range preset mapping | Browser / Client | — | Preset labels ("Today") → ISO date range computed client-side, sent as query params |
| Audit log viewer | API / Backend | Database | Existing `/api/audit` route with SUPERADMIN RBAC; extend with new action type constant |
| Finance layout + nav | Frontend Server (SSR) | Browser / Client | Next.js layout file; `FinanceNav` is a client component (uses `usePathname`) |
| RBAC enforcement | API / Backend | — | `authMiddleware` + `rbacMiddleware` pattern already established; Finance gets read-only routes |

---

## Standard Stack

### Core

All already installed in the project. No new runtime dependencies needed.

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.x (project) | API routes + pages | Established in project |
| Prisma ORM | 7.4+ (project) | Database queries + migration | Type-safe aggregation via `groupBy`, `_sum`, `_count` |
| PostgreSQL | 16 (project) | Persistent storage | All sale/user data lives here |
| TypeScript | 5.x (project) | Type safety | Enforced across project |
| Zod | 3.x (project) | API input validation | Pattern for all POST routes |
| shadcn/ui | Latest (project) | UI components | All report tables, filters, modal |

### Missing Components (must add before implementation)

| Component | Install Command | Used For |
|-----------|----------------|---------|
| Tabs | `npx shadcn add tabs` | Report tab strip (Sales/By Staff/Incentives/Reconciliation) |
| Textarea | `npx shadcn add textarea` | Incentive modal Note field |

[VERIFIED: 03-UI-SPEC.md — UI contract explicitly lists these as missing]

### No New npm Packages Required

The reconciliation calculator is pure frontend math. Reports use the existing Prisma client. No chart library, no CSV library, no date library beyond native JS `Date`. [VERIFIED: codebase inspection — no date lib installed; native Date is sufficient for preset ranges]

---

## Architecture Patterns

### System Architecture Diagram

```
Browser (Finance/Superadmin)
        │
        │ Bearer JWT (access_token from localStorage)
        ▼
Next.js API Routes
        │
        ├── authMiddleware (verify JWT)
        ├── rbacMiddleware(['FINANCE', 'SUPERADMIN']) — read routes
        ├── rbacMiddleware(['SUPERADMIN']) — write routes (incentives)
        │
        ├── GET /api/reports/sales?range=today&page=1
        │       └── Prisma: Sale.findMany + SaleItem include → margin calc
        │
        ├── GET /api/reports/staff?range=today
        │       └── Prisma: Sale.groupBy(salespersonId) + _sum(total) + _count
        │
        ├── GET /api/reports/reconciliation?range=today
        │       └── Prisma: Sale.groupBy(paymentMethod) + _sum(total)
        │
        ├── GET /api/incentives?range=today&page=1
        │       └── Prisma: Incentive.findMany with salesperson/enteredBy include
        │
        └── POST /api/incentives
                ├── Zod validate body
                ├── Prisma: Incentive.create
                └── logAction('INCENTIVE_CREATE', 'INCENTIVE', id, metadata)
                        └── AuditLog.create (append-only)

Frontend Components (client-side):
  /app/finance/layout.tsx        — FinanceNav sidebar
  /app/finance/reports/page.tsx  — Date range state + Tabs
    ├── SalesTab                 — fetch /api/reports/sales
    ├── ByStaffTab               — fetch /api/reports/staff
    ├── IncentivesTab            — fetch /api/incentives + Add Incentive (Superadmin only)
    └── ReconciliationTab        — fetch /api/reports/reconciliation + local cash input

  /app/admin/audit/page.tsx      — Extended (add INCENTIVE_CREATE to ACTIONS array, add Details column)
```

### Recommended Project Structure

```
app/
├── finance/
│   ├── layout.tsx               — FinanceNav wrapper (mirrors admin/layout.tsx)
│   └── reports/
│       └── page.tsx             — Tabbed reports page (REPLACE placeholder)
├── api/
│   ├── reports/
│   │   ├── sales/route.ts       — GET sales list with margin
│   │   ├── staff/route.ts       — GET by-staff aggregation
│   │   └── reconciliation/route.ts  — GET payment method totals
│   └── incentives/
│       └── route.ts             — GET list + POST create
components/
└── FinanceNav.tsx               — Sidebar nav (CASHIER of AdminNav pattern)
prisma/
└── schema.prisma                — Add Incentive model
```

### Pattern 1: Date Range Preset → ISO Date Range Conversion

**What:** Client maps preset labels to start/end UTC boundaries, passes as query params.
**When to use:** All report API calls that need date filtering.

```typescript
// Client-side utility — no external library needed
// Source: [ASSUMED] — native Date, standard pattern
type DateRange = 'today' | 'yesterday' | 'this_week' | 'this_month'

function getDateRange(range: DateRange): { start: string; end: string } {
  const now = new Date()
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)

  switch (range) {
    case 'today': {
      return { start: startOfDay(now).toISOString(), end: endOfDay(now).toISOString() }
    }
    case 'yesterday': {
      const yesterday = new Date(now)
      yesterday.setDate(now.getDate() - 1)
      return { start: startOfDay(yesterday).toISOString(), end: endOfDay(yesterday).toISOString() }
    }
    case 'this_week': {
      const monday = new Date(now)
      monday.setDate(now.getDate() - now.getDay() + 1)
      return { start: startOfDay(monday).toISOString(), end: endOfDay(now).toISOString() }
    }
    case 'this_month': {
      const first = new Date(now.getFullYear(), now.getMonth(), 1)
      return { start: startOfDay(first).toISOString(), end: endOfDay(now).toISOString() }
    }
  }
}
```

### Pattern 2: Prisma Sales Report with Margin Calculation

**What:** Fetch sales with their items, compute per-sale margin server-side.
**When to use:** `/api/reports/sales` endpoint.

```typescript
// Source: [VERIFIED: prisma/schema.prisma — Sale/SaleItem fields confirmed]
// [ASSUMED: Prisma findMany include pattern — standard, training knowledge]
const sales = await prisma.sale.findMany({
  where: {
    createdAt: { gte: new Date(start), lte: new Date(end) },
  },
  include: {
    salesperson: { select: { username: true } },
    items: {
      select: { quantity: true, unitPrice: true, unitCost: true, product: { select: { name: true } } }
    }
  },
  orderBy: { createdAt: 'desc' },
  skip: (page - 1) * limit,
  take: limit,
})

// Margin calculation per sale (D-03, UI-SPEC interaction rule 5)
// Formula: sum((unitPrice - unitCost) * quantity) / sum(unitPrice * quantity) * 100
// If unitCost is 0 for all items → return null (display "—")
const withMargin = sales.map(sale => {
  const revenue = sale.items.reduce((s, i) => s + Number(i.unitPrice) * i.quantity, 0)
  const cost    = sale.items.reduce((s, i) => s + Number(i.unitCost)  * i.quantity, 0)
  const margin  = revenue > 0 ? ((revenue - cost) / revenue * 100) : null
  return { ...sale, marginPercent: margin !== null ? margin.toFixed(1) : null }
})
```

### Pattern 3: Prisma By-Staff Aggregation

**What:** GROUP BY salespersonId with sum of total and count of sales.
**When to use:** `/api/reports/staff` endpoint.

```typescript
// Source: [ASSUMED: Prisma groupBy pattern — verify against Prisma docs if needed]
// Prisma groupBy with _sum and _count
const staffStats = await prisma.sale.groupBy({
  by: ['salespersonId'],
  where: { createdAt: { gte: new Date(start), lte: new Date(end) } },
  _sum: { total: true, itemCount: true },
  _count: { id: true },
})

// Join username — groupBy doesn't support include, so fetch users separately
const userIds = staffStats.map(s => s.salespersonId)
const users = await prisma.user.findMany({
  where: { id: { in: userIds } },
  select: { id: true, username: true }
})
```

**NOTE:** Prisma `groupBy` does NOT support `include` — must join users with a separate query. [ASSUMED: Prisma groupBy limitation — well-known constraint, verify in Prisma docs if this causes issues]

### Pattern 4: Incentive Model and POST Route

**What:** Create immutable Incentive record and log to audit trail.
**When to use:** `POST /api/incentives` — SUPERADMIN only.

```typescript
// Zod schema (matches D-10)
const incentiveSchema = z.object({
  salespersonId: z.string().cuid(),
  amount: z.number().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  note: z.string().min(1, 'Note is required'),
})

// Prisma create
const incentive = await prisma.incentive.create({
  data: {
    salespersonId: data.salespersonId,
    enteredById: req.user!.userId,
    amount: data.amount,
    date: new Date(data.date),
    note: data.note,
  }
})

// Audit log (INCENT-03, AUDIT-04)
await logAction(req.user!.userId, 'INCENTIVE_CREATE', 'INCENTIVE', incentive.id, {
  salesperson_id: data.salespersonId,
  amount: data.amount,
  date: data.date,
  note: data.note,
  entered_by: req.user!.userId,
})
```

### Pattern 5: Finance Layout (mirrors Admin)

**What:** Finance sidebar layout wrapping all `/finance/*` pages.
**When to use:** `/app/finance/layout.tsx`.

```typescript
// Source: [VERIFIED: app/admin/layout.tsx — exact pattern to mirror]
import { FinanceNav } from '@/components/FinanceNav'
import { ToastProvider } from '@/components/toast'

export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <div className="flex h-screen bg-gray-50">
        <FinanceNav />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </ToastProvider>
  )
}
```

### Pattern 6: Reconciliation Tab (Client-only)

**What:** Frontend calculator — no API call, derive from data already fetched.
**When to use:** Reconciliation tab in reports page.

```typescript
// Source: [VERIFIED: D-18 — no DB write; D-16 — payment method breakdown from API]
// The /api/reports/reconciliation endpoint returns:
// { cash: number, card: number, transfer: number, grandTotal: number }

// Client state
const [physicalCash, setPhysicalCash] = useState<number>(0)
const variance = physicalCash - (reconciliationData?.cash ?? 0)

// Color class (from UI-SPEC)
const varianceClass = variance > 0 ? 'text-green-600 font-semibold'
                    : variance < 0 ? 'text-red-600 font-semibold'
                    : 'text-gray-600 font-semibold'
const varianceLabel = variance > 0 ? '(surplus)' : variance < 0 ? '(shortage)' : '(balanced)'
```

### Anti-Patterns to Avoid

- **Client-side margin calculation:** Do not calculate Margin% in the browser from raw sale data — compute on the server to ensure consistent precision across all views.
- **Passing date preset labels to API:** The API should receive ISO date strings, not "today" strings. Client resolves preset → ISO boundaries before calling the API.
- **`include` inside `groupBy`:** Prisma does not allow `include` in `groupBy` queries — always do a separate user lookup after aggregation.
- **Fetching all sales then filtering in JS:** Use Prisma `where: { createdAt: { gte, lte } }` — never pull all rows and filter in memory.
- **Incentive edit/delete routes:** Incentives are append-only (D-11). Do not implement PUT or DELETE on `/api/incentives`.
- **Using `_avg` for Margin%:** Average of per-item margins is mathematically wrong; use weighted formula: `sum(revenue - cost) / sum(revenue)`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Input validation | Custom type-checking in route handler | Zod (already installed) | Established pattern in all Phase 2 routes |
| RBAC enforcement | Manual role check in route body | `rbacMiddleware(['FINANCE', 'SUPERADMIN'])` | Established pattern in `middleware/rbac.ts` |
| Audit logging | Custom DB write | `logAction` from `lib/audit/logger.ts` | Ensures consistent schema; already handles null entityId |
| UI components | Custom table/dialog/select | `components/ui/` (Table, Dialog, Select, Input, Button) | Already installed, accessible, consistent design |
| Pagination | Custom offset logic | Consistent `page` + `limit` pattern from audit route | Established in `/api/audit/route.ts` |

**Key insight:** This phase is almost entirely composition of existing patterns. The audit route, authMiddleware, rbacMiddleware, logAction, and Prisma query style are all established — replicate them, don't reinvent.

---

## Common Pitfalls

### Pitfall 1: Prisma Decimal Type in JSON Response

**What goes wrong:** `sale.total`, `saleItem.unitPrice`, `saleItem.unitCost`, and `incentive.amount` are Prisma `Decimal` objects — they do NOT serialize to plain numbers in JSON automatically. `JSON.stringify(new Decimal('150000'))` gives `"150000"` as a string but the type in code is `Prisma.Decimal`, not `number`. Arithmetic on Decimal without `.toNumber()` throws silent errors.

**Why it happens:** Prisma uses its own `Decimal` class (backed by `decimal.js`) for `@db.Decimal(10,2)` fields. [VERIFIED: prisma/schema.prisma — all money fields use `@db.Decimal(10, 2)`]

**How to avoid:** Always call `Number(field)` or `field.toNumber()` when doing arithmetic or including in JSON response. Example from existing code: `total: Number(sale.total)` in checkout route. [VERIFIED: app/api/cashier/sales/route.ts line ~115]

**Warning signs:** NaN in frontend, `[object Object]` in responses, TypeScript type errors on arithmetic.

### Pitfall 2: Timezone-naive Date Filtering

**What goes wrong:** If the server runs in UTC and the store is in a different timezone (e.g., WIB = UTC+7), "today" from the server's perspective is not the same as "today" from the user's perspective. A sale at 00:30 WIB (17:30 UTC previous day) would be excluded from today's report.

**Why it happens:** `new Date()` in Node.js uses server timezone; no timezone handling is currently in the codebase.

**How to avoid:** Client computes date boundaries using `new Date()` in the browser (user's local time) and sends ISO strings as query params. Server uses the received ISO strings directly in Prisma `where.createdAt`. This way, the user's timezone drives the range definition. [ASSUMED: No timezone library currently in project — verify if this is acceptable for Indonesian store context (WIB = UTC+7)]

**Warning signs:** Reports showing different totals depending on when the page is accessed vs. expected business-day boundaries.

### Pitfall 3: Tabs Component Not Installed

**What goes wrong:** `Tabs` is NOT in `components/ui/` — it only has: alert, button, dialog, input, label, select, table. [VERIFIED: codebase inspection of components/ui/ directory]

**How to avoid:** Run `npx shadcn add tabs` as the first step in the Finance reports page task. Same for `textarea` (needed in incentive modal).

### Pitfall 4: Finance Login Redirect

**What goes wrong:** If Finance user logs in and there is no redirect to `/finance/reports`, they will be stuck at whatever default redirect exists. Current login page may redirect all users to `/dashboard` or similar.

**How to avoid:** Check `app/login/page.tsx` redirect logic — ensure it routes Finance role to `/finance/reports`. [ASSUMED: current redirect may not handle Finance role correctly; must verify during implementation]

### Pitfall 5: `groupBy` + Missing `include` on Prisma

**What goes wrong:** Developer tries to `include: { salesperson: true }` inside a `groupBy` call and gets a Prisma error at runtime (TypeScript may not catch this).

**How to avoid:** Always resolve usernames in a second query after `groupBy`. See Pattern 3 above.

### Pitfall 6: Incentive `date` Field vs `createdAt`

**What goes wrong:** Using `createdAt` to filter incentives instead of `date` (the period the incentive covers). A Superadmin entering an incentive for last month's performance on the 1st of this month would not appear in last month's report if filtered by `createdAt`.

**How to avoid:** `/api/incentives` date range filter must use the `date` field (D-10), not `createdAt`. Both fields exist on the model — use them for different purposes.

---

## Code Examples

### Existing Route Pattern to Replicate (authMiddleware + rbacMiddleware)

```typescript
// Source: [VERIFIED: app/api/audit/route.ts — established project pattern]
export async function GET(request: NextRequest) {
  const authResult = await authMiddleware(request as AuthenticatedRequest)
  if (authResult) return authResult

  const rbacResult = await rbacMiddleware(['SUPERADMIN'])(request as AuthenticatedRequest)
  if (rbacResult) return rbacResult

  // ... business logic
}
```

For Finance read routes, allowedRoles should be `['FINANCE', 'SUPERADMIN']`. For incentive writes, `['SUPERADMIN']` only.

### logAction Call Pattern

```typescript
// Source: [VERIFIED: lib/audit/logger.ts — exact signature]
await logAction(
  userId,          // string — from req.user!.userId
  'INCENTIVE_CREATE',  // action string
  'INCENTIVE',     // entityType
  incentive.id,    // entityId
  {                // metadata (JSON)
    salesperson_id: data.salespersonId,
    amount: data.amount,
    date: data.date,
    note: data.note,
    entered_by: userId,
  }
)
```

### Adding INCENTIVE_CREATE to Audit Page

```typescript
// Source: [VERIFIED: app/admin/audit/page.tsx line 43-50 — current ACTIONS array]
// Extend by adding 'SALE_CREATE', 'INVENTORY_REPLENISH', 'INCENTIVE_CREATE'
const ACTIONS = [
  'LOGIN', 'LOGOUT',
  'USER_CREATE', 'USER_EDIT', 'USER_DEACTIVATE',
  'PRODUCT_CREATE',
  'SALE_CREATE',
  'INVENTORY_REPLENISH',
  'INCENTIVE_CREATE',  // NEW in Phase 3
]
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Client-side report aggregation | Server-side Prisma aggregation with `groupBy` | Prisma 2+ | Eliminates N+1 and client memory pressure |
| Separate date library (moment.js) | Native `Date` API | 2020+ | No dependency needed for simple preset ranges |
| TanStack Query for server state | Direct `fetch` + `useEffect` (project pattern) | — | Codebase uses direct fetch (audit page, etc.) — match existing pattern |

**Existing pattern note:** The audit page uses `useEffect` + direct `fetch`, not TanStack Query. Although CLAUDE.md mentions TanStack Query as a supporting library, it is NOT installed in this project. All report pages should follow the existing `useEffect` + `fetch` pattern for consistency. [VERIFIED: codebase inspection — no `@tanstack/react-query` in package.json area; audit and cashier pages use direct fetch]

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Prisma `groupBy` does not allow `include` — must join users separately | Architecture Patterns / Pattern 3 | If wrong, can simplify Pattern 3 to a single query |
| A2 | Client-side ISO date range sent to server avoids timezone issues | Common Pitfalls / Pitfall 2 | If server timezone enforcement required, need to add server-side timezone handling |
| A3 | Login redirect for Finance role may not be implemented yet | Common Pitfalls / Pitfall 4 | If already implemented correctly, no extra task needed — verify in app/login/page.tsx |
| A4 | `@tanstack/react-query` not installed; project uses useEffect + fetch | State of the Art | If installed, could use `useQuery` for cleaner caching — check package.json to confirm |

---

## Open Questions

1. **Login redirect for Finance role**
   - What we know: Auth is implemented; Finance users can log in
   - What's unclear: Where the post-login redirect logic lives and whether it already handles the FINANCE role → `/finance/reports` redirect
   - Recommendation: Read `app/login/page.tsx` during planning; if redirect is role-agnostic (e.g., always goes to `/dashboard`), add Finance redirect as a task

2. **SALE_CREATE + INVENTORY_REPLENISH in ACTIONS array**
   - What we know: Phase 2 added these action types; audit route already handles them in WHERE clause
   - What's unclear: Whether the `ACTIONS` constant array in audit/page.tsx was updated in Phase 2 or still only has the Phase 1 actions
   - Recommendation: Planner should add a task to backfill SALE_CREATE + INVENTORY_REPLENISH into the ACTIONS constant (audit page line 43-50) alongside INCENTIVE_CREATE

---

## Environment Availability

Step 2.6: SKIPPED — this phase is purely code/config changes (new Prisma model, API routes, UI pages). No new external tools or services. PostgreSQL is already running (established in Phase 1). No Redis, no external APIs, no CLI tools beyond what's already in use.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (per CLAUDE.md) |
| Config file | Not yet confirmed — check for `vitest.config.*` in root |
| Quick run command | `npx vitest run --reporter=verbose` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REPORT-01 | GET /api/reports/sales returns sale list with correct fields | unit | `npx vitest run tests/api/reports-sales.test.ts -t "GET /api/reports/sales"` | ❌ Wave 0 |
| REPORT-02 | Sales API returns correct revenue total and item count | unit | `npx vitest run tests/api/reports-sales.test.ts -t "totals"` | ❌ Wave 0 |
| REPORT-03 | GET /api/reports/staff returns per-salesperson aggregation | unit | `npx vitest run tests/api/reports-staff.test.ts` | ❌ Wave 0 |
| REPORT-04 | Margin% formula: (unitPrice - unitCost) / unitPrice * 100 | unit | `npx vitest run tests/lib/margin.test.ts` | ❌ Wave 0 |
| INCENT-01 | POST /api/incentives creates incentive record | unit | `npx vitest run tests/api/incentives.test.ts -t "POST creates"` | ❌ Wave 0 |
| INCENT-02 | GET /api/incentives returns date-range-filtered list | unit | `npx vitest run tests/api/incentives.test.ts -t "GET filters"` | ❌ Wave 0 |
| INCENT-03 | logAction called with INCENTIVE_CREATE after create | unit | `npx vitest run tests/api/incentives.test.ts -t "audit log"` | ❌ Wave 0 |
| AUDIT-05 | INCENTIVE_CREATE appears in /api/audit filter | unit | `npx vitest run tests/api/audit.test.ts -t "INCENTIVE_CREATE"` | ❌ Wave 0 |
| RBAC-02 | Finance role blocked from POST /api/incentives (403) | unit | `npx vitest run tests/api/incentives.test.ts -t "RBAC Finance cannot POST"` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run --reporter=verbose` (full suite — fast with Vitest)
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/api/reports-sales.test.ts` — covers REPORT-01, REPORT-02
- [ ] `tests/api/reports-staff.test.ts` — covers REPORT-03
- [ ] `tests/lib/margin.test.ts` — covers REPORT-04 (pure function, easy to unit test)
- [ ] `tests/api/incentives.test.ts` — covers INCENT-01, INCENT-02, INCENT-03, RBAC-02
- [ ] `tests/api/audit.test.ts` — covers AUDIT-05 (INCENTIVE_CREATE filter)
- [ ] Vitest config if not present: `npx vitest init` or add `vitest.config.ts`

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Existing JWT + `authMiddleware` — no change |
| V3 Session Management | yes | Existing HttpOnly cookie refresh tokens — no change |
| V4 Access Control | yes | `rbacMiddleware(['FINANCE', 'SUPERADMIN'])` for reads; `rbacMiddleware(['SUPERADMIN'])` for incentive write |
| V5 Input Validation | yes | Zod schema on all POST /api/incentives inputs |
| V6 Cryptography | no | No new crypto in this phase |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Finance user creating incentives | Elevation of Privilege | `rbacMiddleware(['SUPERADMIN'])` on POST /api/incentives; Finance role returns 403 |
| Tampering with margin display | Tampering | Margin computed server-side; client cannot inject arbitrary margin values |
| Accessing other users' incentive data | Information Disclosure | No per-user scoping needed (Finance sees all) — but ensure route requires auth |
| Incentive record deletion | Tampering | No DELETE route on /api/incentives; immutable per D-11 |
| XSS via note field in incentive | Tampering | React auto-escapes `{incentive.note}` in JSX; no dangerouslySetInnerHTML |

---

## Sources

### Primary (HIGH confidence)
- `prisma/schema.prisma` — [VERIFIED] Sale, SaleItem, User, AuditLog models with exact field names
- `app/api/audit/route.ts` — [VERIFIED] Pagination pattern, filter pattern, auth+RBAC composition
- `app/admin/audit/page.tsx` — [VERIFIED] ACTIONS array, table structure, loading/empty state patterns
- `app/admin/layout.tsx` — [VERIFIED] Layout wrapper pattern for Finance layout
- `lib/audit/logger.ts` — [VERIFIED] `logAction` signature
- `middleware/auth.ts` + `middleware/rbac.ts` — [VERIFIED] Middleware composition pattern
- `app/api/cashier/sales/route.ts` — [VERIFIED] Decimal → Number conversion pattern, logAction call, Zod validation pattern
- `components/ui/` directory — [VERIFIED] Available components (alert, button, dialog, input, label, select, table); Tabs and Textarea NOT present

### Secondary (MEDIUM confidence)
- `03-CONTEXT.md` — All D-xx decisions, deferred ideas, integration points
- `03-UI-SPEC.md` — Complete UI contract with component inventory, layout contracts, copy

### Tertiary (LOW confidence)
- [ASSUMED] Prisma `groupBy` does not support `include` — standard Prisma constraint, not verified against current docs in this session

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified by codebase inspection; no new dependencies
- Architecture: HIGH — all patterns verified against existing code
- Prisma query patterns: MEDIUM — schema verified; groupBy + separate user join is assumed Prisma constraint
- Pitfalls: HIGH — most verified against actual code; timezone pitfall is contextual
- UI patterns: HIGH — verified against UI-SPEC and existing component directory

**Research date:** 2026-04-21
**Valid until:** 2026-05-21 (stable stack, no fast-moving dependencies)
