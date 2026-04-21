# Phase 3: Intelligence - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-21
**Phase:** 03-intelligence
**Areas discussed:** Report navigation, Date filtering, Incentive data model, Reconciliation report, Audit trail UI, Finance layout, Incentive form UX

---

## Report Navigation

| Option | Description | Selected |
|--------|-------------|----------|
| Tabs on one page | Single /finance/reports page with tab strip | ✓ |
| Separate pages | /finance/reports/sales, /finance/reports/margin, etc. | |
| Sidebar sections | Finance gets a sidebar nav with links to each section | |

**Tabs selected:** Sales | By Staff | Incentives | Reconciliation (margin lives inside Sales tab per-row)

| Option | Description | Selected |
|--------|-------------|----------|
| Time/Products/Salesperson/Total/Payment/Margin% | Full columns including margin | ✓ |
| Time/Products/Salesperson/Total/Payment only | No margin in sales list | |
| Time/Salesperson/Total/Payment | Minimal, expand for items | |

| Option | Description | Selected |
|--------|-------------|----------|
| Salesperson / # sales / Total revenue / Items sold | Flat summary table | ✓ |
| Salesperson / # sales / Revenue / Items / Incentives | Adds incentive totals | |
| Expandable rows | Drill-down pattern | |

---

## Date Filtering

| Option | Description | Selected |
|--------|-------------|----------|
| Preset ranges only | Today / Yesterday / This Week / This Month | ✓ |
| Date picker (single day) | Calendar picker for one date | |
| Date range picker | Start + end date, most flexible | |

**Default on load:** Today

**Scope:** Shared filter applies to all tabs simultaneously.

---

## Incentive Data Model

| Option | Description | Selected |
|--------|-------------|----------|
| Bulk amount per salesperson per period | No link to specific sale | ✓ |
| Linked to a specific sale | Picker selects a sale then adds incentive | |
| Both: bulk or per-sale | Flexible but doubles complexity | |

**Fields:** salesperson + amount + note (required) + date (period date)

**Immutability:** Immutable after creation — no edit or delete. Corrections = new entry.

**Incentives tab display:** Two-level — per-salesperson summary at top, detail list below.

---

## Reconciliation Report

| Option | Description | Selected |
|--------|-------------|----------|
| System summary + Finance enters physical count | Live calculator | ✓ |
| System data only | No manual input | |
| Full form: cash + card + transfer + inventory | More thorough | |

**System data shown:** Cash total | Card total | Transfer total | Grand total (by payment method)

**Persistence:** Live calculator only — not saved to DB.

---

## Audit Trail UI

| Option | Description | Selected |
|--------|-------------|----------|
| Existing /admin/audit page (extend) | Add filters to existing placeholder | ✓ |
| New dedicated audit section | Redesign from scratch | |
| Modal from relevant pages | No central log | |

**Filters:** Date range + User dropdown + Action type dropdown

---

## Finance Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Finance sidebar nav | Sidebar with Reports link | ✓ |
| Direct redirect, no sidebar | Land directly on reports | |
| Dashboard landing then navigate | Summary page first | |

**Sidebar links:** Reports only (one link).

---

## Incentive Form UX

| Option | Description | Selected |
|--------|-------------|----------|
| "Add Incentive" button opens modal | shadcn/ui Dialog, role-conditional | ✓ |
| Inline form above the list | Always visible above table | |
| Dedicated /admin/incentives/new page | Separate page navigation | |

**Placement:** Add button visible only to SUPERADMIN role on the Incentives tab. Finance sees list only.

---

## Claude's Discretion

- Exact margin% display format
- Pagination page size
- Empty state copy for no-data date ranges
- Loading skeleton design
- Variance indicator color (green/red for positive/negative reconciliation difference)
- Running total summary row in Sales tab
