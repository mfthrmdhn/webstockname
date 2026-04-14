# Role-Based Access Control (RBAC) Matrix

## Overview

Three roles with explicit endpoint restrictions:
- **SUPERADMIN**: Full system access (user management, inventory, audit logs)
- **FINANCE**: Read-only reports and analysis (Phase 3+)
- **CASHIER**: POS operations only (Phase 2+)

## Phase 1: Foundation Endpoints

| Endpoint | Method | Superadmin | Finance | Cashier | Public |
|----------|--------|------------|---------|---------|--------|
| /api/auth/login | POST | ✓ | ✓ | ✓ | ✓ |
| /api/auth/refresh | POST | ✓ | ✓ | ✓ | ✓ |
| /api/auth/logout | POST | ✓ | ✓ | ✓ | ✓ |
| /api/users | POST | ✓ | ✗ | ✗ | ✗ |
| /api/users | GET | ✓ | ✗ | ✗ | ✗ |
| /api/users/{id} | GET | ✓ | ✗ | ✗ | ✗ |
| /api/users/{id} | PATCH | ✓ | ✗ | ✗ | ✗ |
| /api/users/{id}/deactivate | POST | ✓ | ✗ | ✗ | ✗ |
| /api/users/{id}/reset-password | POST | ✓ | ✗ | ✗ | ✗ |
| /api/products | POST | ✓ | ✗ | ✗ | ✗ |
| /api/products | GET | ✓ | ✓ | ✓ | ✗ |
| /api/audit | GET | ✓ | ✗ | ✗ | ✗ |

Legend:
- ✓ = Role has access
- ✗ = Role does not have access

## Enforcement

All protected endpoints enforce RBAC at the middleware layer before any business logic executes.

### Authentication Flow

1. Client sends request with `Authorization: Bearer {accessToken}` header
2. `authMiddleware` verifies JWT and attaches `user` object to request
3. If missing/invalid token → **401 Unauthorized**
4. If valid token → Continue to next handler

### Authorization Flow

Protected endpoints chain middleware:
1. `authMiddleware` verifies JWT (returns 401 if missing/invalid)
2. `rbacMiddleware(allowedRoles)` checks `user.role` against allowed roles (returns 403 if unauthorized)
3. If role authorized → Route handler executes

### Example Endpoint Implementation

```typescript
// Superadmin-only endpoint
export async function POST(request: NextRequest) {
  const authResult = await authMiddleware(request as AuthenticatedRequest)
  if (authResult) return authResult

  const rbacResult = await rbacMiddleware(['SUPERADMIN'])(request as AuthenticatedRequest)
  if (rbacResult) return rbacResult

  // Business logic here — guaranteed authenticated AND authorized
  const user = (request as AuthenticatedRequest).user!
  // ...
}
```

### Public Endpoints (No Auth Required)

- `POST /api/auth/login` — All users can attempt login
- `POST /api/auth/refresh` — All authenticated users can refresh
- `POST /api/auth/logout` — All authenticated users can logout
- `GET /api/products` — All authenticated users can list products

### RBAC Failure Responses

**Missing Authorization Header:**
```json
{
  "error": "Missing or invalid authorization header",
  "status": 401
}
```

**Invalid/Expired Token:**
```json
{
  "error": "Invalid or expired token",
  "status": 401
}
```

**Insufficient Permissions (Wrong Role):**
```json
{
  "error": "Insufficient permissions",
  "status": 403
}
```

## Phase Readiness

| Phase | Features | RBAC Scope |
|-------|----------|-----------|
| Phase 1 (Current) | Auth endpoints, user management, inventory basics | SUPERADMIN-only user/product creation |
| Phase 2 | POS operations, stock level management | CASHIER POS endpoints, SUPERADMIN inventory |
| Phase 3 | Financial reporting, analytics | FINANCE read-only reports |

## Implementation Notes

- **No role checks in controllers** — All RBAC enforcement happens in middleware before handler execution
- **Immutable role in JWT** — User role is embedded in access token; role changes require re-login
- **Stateless authorization** — Each request is independently authorized; no server-side session state needed
- **Role additions** — To add new role or endpoint, update RBAC matrix and middleware allowedRoles array

---

*Last updated: 2026-04-14*
*RBAC Framework: Phase 1 Foundation*
