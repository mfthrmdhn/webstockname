# Phase 3: Intelligence - Context

**Gathered:** 2026-04-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Finance team can view daily sales and incentive reports, and superadmin can manage incentives with full audit accountability.

This phase covers:
- Finance reports page with tabbed navigation (Sales / By Staff / Incentives / Reconciliation)
- Shared date range filter across all tabs (preset ranges: Today / Yesterday / This Week / This Month)
- Incentive model: bulk amount per salesperson per period, entered by Superadmin
- Incentive entry from within the Finance reports Incentives tab (Superadmin sees Add button)
- End-of-day reconciliation as a live calculator (system totals vs. Finance-entered physical cash count — not persisted)
- Full audit trail viewer at /admin/audit with date range + user + action type filters
- Finance sidebar nav (Reports link only)

Phase 1 audit trail (AUDIT-05) is completed here for the audit log viewer. REPORT-01 through REPORT-06 and INCENT-01 through INCENT-04 are all in scope.

</domain>

<decisions>
## Implementation Decisions

### Report Navigation
- **D-01:** Single `/finance/reports` page with tab strip: **Sales | By Staff | Incentives | Reconciliation**. No separate pages per report type.
- **D-02:** Margin data (revenue - cost / revenue) lives inside the Sales tab per-row, not a separate tab.
- **D-03:** Sales tab columns per row: Time | Product(s) | Salesperson | Total | Payment method | Margin%. Margin% calculated from `unit_price` / `unit_cost` on SaleItem (snapshot at sale time — D-06 from Phase 2).
- **D-04:** By Staff tab: flat table — Salesperson | # sales | Total revenue | Items sold. One row per salesperson for the selected date range. No drill-down.
- **D-05:** Incentives tab: two-level view — top section shows per-salesperson summary (Salesperson | Total incentives | # entries), below shows chronological detail list for the selected date range.

### Date Filtering
- **D-06:** Shared date range dropdown at the top of the `/finance/reports` page. Applies to ALL tabs simultaneously. Switching tabs does not reset the date range.
- **D-07:** Preset ranges only: **Today / Yesterday / This Week / This Month**. No free-form date picker.
- **D-08:** Default on page load: **Today**.

### Incentive Data Model
- **D-09:** Incentive is a **bulk amount per salesperson per period** — not linked to a specific sale. New `Incentive` model needed in Prisma schema.
- **D-10:** Incentive fields: `salespersonId` (FK → User), `amount` (Decimal), `note` (String, required), `date` (Date — the period this incentive covers, not just createdAt), `enteredById` (FK → User, the Superadmin who created it), `createdAt`.
- **D-11:** Incentives are **immutable after creation** — no edit or delete. Consistent with append-only audit philosophy. Corrections require a new entry.
- **D-12:** Salesperson picker shows only active users with the CASHIER role (same constraint as Phase 2 attribution picker).

### Incentive UX (Entry Form)
- **D-13:** Superadmin sees an **"Add Incentive" button** on the Incentives tab (Finance role does not see this button — read-only). Clicking opens a shadcn/ui Dialog modal.
- **D-14:** Modal form fields: salesperson (required, picker), amount (required, Decimal), date (required, the period date), note/reason (required, textarea). All fields required — no optional fields.
- **D-15:** On submit: POST to API, modal closes, incentive list refreshes. On error: show inline validation inside modal.

### Reconciliation Report
- **D-16:** Reconciliation tab shows system-recorded sales totals broken down by payment method: **Cash total | Card total | Transfer total | Grand total**.
- **D-17:** Finance enters a **physical cash drawer amount** in an input field. System calculates and displays variance (physical - system cash total) in real time.
- **D-18:** Reconciliation result is **not saved** — live calculator only. No DB write, no persistence, no approval workflow.

### Finance Layout
- **D-19:** Finance role gets a **sidebar nav** (consistent with admin panel pattern). Sidebar has one link: **Reports** (pointing to `/finance/reports`).
- **D-20:** After login, Finance redirects to `/finance/reports` (the only Finance destination).
- **D-21:** Finance layout wraps the reports page similar to how `/app/admin/layout.tsx` wraps admin pages.

### Audit Trail Viewer
- **D-22:** Audit log viewer lives at existing `/admin/audit` page — extend the placeholder that already exists.
- **D-23:** Three filters: **date range** (start + end date pickers), **user** (dropdown of all users), **action type** (dropdown of all action type constants: LOGIN, LOGOUT, USER_CREATE, SALE_CREATE, INVENTORY_REPLENISH, INCENTIVE_CREATE, etc.).
- **D-24:** Audit log display: paginated table — Timestamp | User | Action | Entity Type | Entity ID | Details (from metadata JSON).
- **D-25:** Extend `logAction` with new action type: `INCENTIVE_CREATE`. Record: incentive_id, salesperson_id, amount, date, note, entered_by.

### Claude's Discretion
- Exact Margin% display format (e.g., "23.4%" vs "23%")
- Pagination page size for sales list and audit log
- Empty state copy when no data exists for selected date range
- Loading skeleton design for report tabs
- Exact styling of variance indicator in reconciliation (green/red based on positive/negative)
- Whether to show a running total summary row at the bottom of the Sales tab table

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 3 Requirements
- `.planning/ROADMAP.md` (Phase 3 section) — Goal, success criteria (6 items), requirements: REPORT-01 through REPORT-06, INCENT-01 through INCENT-04, AUDIT-04, AUDIT-05
- `.planning/REQUIREMENTS.md` — Full requirement definitions for all REPORT-*, INCENT-*, and AUDIT-04/05

### Foundation (carry forward)
- `.planning/phases/01-foundation/01-CONTEXT.md` — RBAC roles, audit log schema, logAction pattern
- `.planning/phases/02-operations/02-CONTEXT.md` — D-06 (price snapshot on SaleItem), D-09/D-10/D-11 (sales attribution), D-17/D-18/D-19 (audit log action types for sale/inventory events)

### Architecture Decisions
- `.planning/ROADMAP.md` — RBAC: Finance role is read-only for all reports; Superadmin manages incentive entries
- `CLAUDE.md` — Tech stack: Next.js 16, Prisma 7.4+, shadcn/ui, Tailwind, JWT auth

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `app/admin/layout.tsx` — Finance layout should follow the same pattern (sidebar nav wrapper)
- `app/admin/audit/` — Placeholder exists; extend rather than replace
- `app/finance/reports/page.tsx` — Placeholder exists; implement the tabbed reports page here
- `components/ui/` — Dialog (for incentive modal), Table, Select, Input, Button, Tabs all available
- `lib/audit/logger.ts` (`logAction`) — Add `INCENTIVE_CREATE` action type; same call pattern as existing types
- Prisma `AuditLog` model — Already has `userId`, `action`, `entityType`, `entityId`, `metadata` fields; querying is straightforward

### Established Patterns
- API routes use `authMiddleware` + `rbacMiddleware` before business logic (Finance routes: read-only, role=FINANCE; incentive write: role=SUPERADMIN)
- Zod validation on all API inputs
- Prisma `Sale` + `SaleItem` schema already has `unitPrice` and `unitCost` snapshots — use for margin calculations
- `Sale.salespersonId` and `Sale.createdAt` are indexed — efficient for By Staff aggregations and date filtering
- shadcn/ui Dialog already used in codebase (Phase 2 replenishment form)

### Integration Points
- `prisma/schema.prisma` — Add new `Incentive` model (salespersonId, enteredById, amount, date, note, createdAt)
- `/app/api/reports/` — Placeholder route exists; implement sales/staff/reconciliation query endpoints here
- `/app/api/incentives/` — New route needed for POST (create) and GET (list with date range filter)
- `/app/finance/layout.tsx` — Create this to wrap finance pages with sidebar nav
- `/app/admin/audit/page.tsx` — Extend with filter controls and paginated table

</code_context>

<specifics>
## Specific Ideas

- The Incentives tab serves dual purpose: Finance reads the list, Superadmin also sees an "Add Incentive" button on the same page. Role-conditional rendering — same route, different capabilities.
- Reconciliation is purely a calculator: Finance enters physical cash, system shows variance. No API call needed for reconciliation itself — frontend math only.
- Margin% formula: `(unitPrice - unitCost) / unitPrice * 100` aggregated across all SaleItems in a sale, weighted by quantity.

</specifics>

<deferred>
## Deferred Ideas

- Exporting reports to CSV/PDF — not in Phase 3 scope
- Email report delivery — future phase
- Incentive approval workflow (Superadmin enters, another Superadmin approves) — v2 complexity
- Persisted reconciliation records / end-of-day close workflow — out of scope for v1
- Dashboard landing page for Finance (quick-glance KPIs) — possible Phase 4
- Drill-down from By Staff tab into individual sales — not in Phase 3

</deferred>

---

*Phase: 03-intelligence*
*Context gathered: 2026-04-21*
