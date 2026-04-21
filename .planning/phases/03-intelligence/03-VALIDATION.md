---
phase: 3
slug: intelligence
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-21
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (per CLAUDE.md) |
| **Config file** | Check root for `vitest.config.*` — Wave 0 creates if missing |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 3-01-01 | 01 | 1 | REPORT-01 | — | Finance cannot access sales API without auth | unit | `npx vitest run tests/api/reports-sales.test.ts -t "GET /api/reports/sales"` | ❌ W0 | ⬜ pending |
| 3-01-02 | 01 | 1 | REPORT-02 | — | Revenue/item totals are accurate | unit | `npx vitest run tests/api/reports-sales.test.ts -t "totals"` | ❌ W0 | ⬜ pending |
| 3-01-03 | 01 | 1 | REPORT-03 | — | Staff breakdown aggregation correct | unit | `npx vitest run tests/api/reports-staff.test.ts` | ❌ W0 | ⬜ pending |
| 3-01-04 | 01 | 1 | REPORT-04 | — | Margin% = (price - cost) / price * 100 | unit | `npx vitest run tests/lib/margin.test.ts` | ❌ W0 | ⬜ pending |
| 3-02-01 | 02 | 1 | INCENT-01 | — | Only superadmin can POST /api/incentives | unit | `npx vitest run tests/api/incentives.test.ts -t "POST creates"` | ❌ W0 | ⬜ pending |
| 3-02-02 | 02 | 1 | INCENT-02 | — | Finance GET filtered by date range | unit | `npx vitest run tests/api/incentives.test.ts -t "GET filters"` | ❌ W0 | ⬜ pending |
| 3-02-03 | 02 | 1 | INCENT-03 | — | logAction called with INCENTIVE_CREATE | unit | `npx vitest run tests/api/incentives.test.ts -t "audit log"` | ❌ W0 | ⬜ pending |
| 3-02-04 | 02 | 1 | AUDIT-04 | — | Incentive audit entry is immutable | unit | `npx vitest run tests/api/incentives.test.ts -t "INCENTIVE_CREATE"` | ❌ W0 | ⬜ pending |
| 3-02-05 | 02 | 1 | AUDIT-05 | — | Finance blocked from POST incentives (403) | unit | `npx vitest run tests/api/incentives.test.ts -t "RBAC Finance cannot POST"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/api/reports-sales.test.ts` — stubs for REPORT-01, REPORT-02
- [ ] `tests/api/reports-staff.test.ts` — stubs for REPORT-03
- [ ] `tests/lib/margin.test.ts` — stubs for REPORT-04
- [ ] `tests/api/incentives.test.ts` — stubs for INCENT-01, INCENT-02, INCENT-03, AUDIT-04, AUDIT-05
- [ ] `tests/api/audit.test.ts` — stubs for AUDIT-05 (INCENTIVE_CREATE filter)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Finance dashboard renders correctly with real data | REPORT-01, REPORT-05 | UI rendering requires browser | Log in as finance user, navigate to /finance/reports, verify table shows today's sales |
| End-of-day reconciliation variance detection | REPORT-06 | Requires manual cash count input | Navigate to reconciliation tab, enter cash count, verify variance calculation |
| Superadmin incentive entry approval flow | INCENT-01 | Multi-step UI workflow | Log in as superadmin, navigate to /admin/incentives, create incentive, verify appears in finance view |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
