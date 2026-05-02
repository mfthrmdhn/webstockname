# WebStockName Roadmap

**Current:** v1.0 MVP (SHIPPED 2026-05-02)  
**Next:** v1.1 (Planning)

---

## Milestones

- ✅ **v1.0 MVP** — Phases 1-4 (shipped 2026-05-02) → [See v1.0-ROADMAP.md](./milestones/v1.0-ROADMAP.md)
- 📋 **v1.1** — Planning phase (planned features below)

---

## Shipped (v1.0 — May 2026)

<details>
<summary>✅ v1.0 MVP (Phases 1-4) — SHIPPED 2026-05-02</summary>

- [x] Phase 1: Foundation (9/9 plans) — completed 2026-04-14
  - Secure authentication, role-based access, audit infrastructure
- [x] Phase 2: Operations (11/11 plans) — completed 2026-04-22
  - Inventory management, sales processing, atomic transactions
- [x] Phase 3: Intelligence (4/4 plans) — completed 2026-04-21
  - Financial reporting, incentive tracking, reconciliation
- [x] Phase 4: Product Management CRUD (2/2 plans) — completed 2026-04-23
  - Product edit and delete with full audit trail

**See:** `.planning/milestones/v1.0-ROADMAP.md` for details

</details>

---

## Progress Table

| Phase | Milestone | Plans | Status | Completed |
|-------|-----------|-------|--------|-----------|
| 1. Foundation | v1.0 | 9/9 | COMPLETE | 2026-04-14 |
| 2. Operations | v1.0 | 11/11 | COMPLETE | 2026-04-22 |
| 3. Intelligence | v1.0 | 4/4 | COMPLETE | 2026-04-21 |
| 4. Product CRUD | v1.0 | 2/2 | COMPLETE | 2026-04-23 |

---

## Next Steps (v1.1+)

### v1.1 Potential Focus Areas

(To be defined during v1.1 planning via `/gsd-new-milestone`)

Candidate features based on v1.0 scope:
- Multi-location inventory sync (warehouse transfers)
- Real-time inventory caching with Redis
- Email/SMS low-stock alerts
- Advanced reporting (margins by category, staff performance trends)
- POS improvements (barcode scanning refinement, receipt printing)
- Security enhancements (2FA, audit log archival)

---

## Architecture Notes

**v1.0 Design Principles:**
- **Atomicity:** Sales and inventory updates in single transaction
- **Audit First:** Every state change logged immutably
- **Role-Based:** Access control enforced at API layer
- **Immutability:** Audit logs, sales attribution, incentives cannot be edited retroactively
- **Location-Aware:** Store and warehouse tracked separately

**Tech Stack:**
- Frontend: Next.js 16 + React 19 + Tailwind + shadcn/ui
- Backend: Node.js 22 + Express (API routes via Next.js)
- Database: PostgreSQL 16 + Prisma 7.4 ORM
- Auth: JWT + HttpOnly cookies
- Testing: Vitest 4.1 (146 tests, 100% pass)

**Constraints (v1.0):**
- Single store only (no multi-location)
- Manual incentive entry (no auto-calculation)
- No Redis caching (added in v1.1 if needed)
- No mobile app (web-first)

---

*Roadmap created: 2026-04-14*
*v1.0 shipped: 2026-05-02*
