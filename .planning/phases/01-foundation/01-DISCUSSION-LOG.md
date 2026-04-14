# Phase 1: Foundation - Discussion Log (Assumptions Mode)

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions captured in CONTEXT.md — this log preserves the analysis.

**Date:** 2026-04-14  
**Phase:** 01-foundation  
**Mode:** assumptions  
**Areas analyzed:** Authentication & Session Management, RBAC Enforcement, User Account Management, Audit Logging, Prisma Schema, UI Structure

---

## Assumptions Presented

### Authentication & Session Strategy
| Assumption | Confidence | Evidence |
|------------|-----------|----------|
| JWT access tokens (15-min) + HttpOnly refresh cookies (7-day) for stateless session management | Confident | CLAUDE.md lines 39, 151-153 explicitly specify this approach for scalability |
| Validate JWT on every request; refresh endpoint issues new access token from cookie-provided refresh token | Confident | CLAUDE.md refresh token strategy; ROADMAP.md stateless auth requirement |
| Password hashing with bcryptjs on backend only; 12-char minimum via Zod validation | Confident | CLAUDE.md lines 130, 155-156; forbids frontend hashing as "false security" |

### RBAC Enforcement
| Assumption | Confidence | Evidence |
|------------|-----------|----------|
| Enforce RBAC at Express middleware level before controller execution | Confident | ARCHITECTURE.md Pattern 2 (middleware-based RBAC for three-role systems); ROADMAP.md success criteria #5 |
| Three hardcoded roles (Superadmin, Finance, Cashier); no dynamic role creation | Confident | REQUIREMENTS.md RBAC-01 through RBAC-04; ROADMAP.md non-negotiable decisions |
| Roles stored as enum in database; 403 Forbidden returned for unauthorized access | Confident | Type-safe approach aligns with CLAUDE.md TypeScript emphasis |

### User Account Management
| Assumption | Confidence | Evidence |
|------------|-----------|----------|
| Soft-delete user deactivation (is_active boolean, no hard DELETE) | Confident | REQUIREMENTS.md USER-04, USER-05; ROADMAP.md preservation of history for audit integrity |
| Superadmin-only user CRUD endpoints; all changes logged with before/after values | Confident | REQUIREMENTS.md USER-01 through USER-05; ROADMAP.md audit trail requirement |

### Audit Logging
| Assumption | Confidence | Evidence |
|------------|-----------|----------|
| Single AuditLog table (INSERT-only, no UPDATE/DELETE via constraints) with: user_id, action (enum), resource_type, resource_id, before_values, after_values, timestamp, ip_address | Confident | ROADMAP.md lines 95-100 (immutable audit non-negotiable); REQUIREMENTS.md AUDIT-01, AUDIT-03, AUDIT-06 |
| Log both successful and failed login attempts with failure reason; return generic "Invalid credentials" to UI | Confident | REQUIREMENTS.md AUDIT-03; ROADMAP.md fraud detection requirement; prevents username enumeration |

### Prisma Schema & Migrations
| Assumption | Confidence | Evidence |
|------------|-----------|----------|
| Prisma 7.4+ with TypeScript schema.prisma, auto-generated client, version-controlled migrations | Likely | CLAUDE.md lines 38, 64-65 specify Prisma 7.4+ for type safety and query caching |
| Phase 1 schema: User, AuditLog, Product tables with indices on email, timestamp, user_id, sku | Likely | REQUIREMENTS.md scope (AUTH, RBAC, USER, PROD-01, AUDIT); query pattern analysis suggests these indices |

### UI Structure
| Assumption | Confidence | Evidence |
|------------|-----------|----------|
| Superadmin dashboard with login page, user management page, product management page, audit log viewer (read-only) | Confident | REQUIREMENTS.md USER-01-05, PROD-01, AUDIT-05; ROADMAP.md UI hint: yes |
| Role-specific access control: unauthorized roles see 403 error page | Confident | REQUIREMENTS.md RBAC-04; ROADMAP.md endpoint-level enforcement |

---

## Corrections Made

**No corrections** — all assumptions confirmed as-is. User selected "Yes, proceed" after reviewing all assumptions.

---

## Auto-Resolved

Not applicable (no --auto mode; user reviewed and approved).

---

## External Research Flags (for Phase 1 planning/research phase)

Identified during analysis but not blocking (can be researched during /gsd-research-phase or /gsd-plan-phase):

1. **Bcryptjs cost parameter optimization**: CLAUDE.md specifies "10+" but needs clarification on 10 vs 12-13 for current timing-attack resistance (affects password hash generation latency)
2. **Prisma query caching configuration**: How to explicitly enable caching for frequent RBAC role lookups
3. **HttpOnly cookie Express setup**: Local dev (http://) vs production (https://) configuration for cookie security flags
4. **Audit log archival strategy**: 3-year retention approach—keep in PostgreSQL vs archive to cold storage (defer to Phase 3+)

---

*Discussion log created: 2026-04-14*  
*Mode: assumptions — no corrections needed*