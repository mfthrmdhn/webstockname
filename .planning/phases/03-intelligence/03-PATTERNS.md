# Phase 3: Intelligence - Pattern Map

**Mapped:** 2026-04-21
**Files analyzed:** 10 new/modified files
**Analogs found:** 9 / 10

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `app/finance/layout.tsx` | layout | request-response | `app/admin/layout.tsx` | exact |
| `components/FinanceNav.tsx` | component | request-response | `components/AdminNav.tsx` | exact |
| `app/finance/reports/page.tsx` | component (page) | request-response | `app/admin/audit/page.tsx` | role-match |
| `app/api/reports/sales/route.ts` | route (GET) | request-response | `app/api/audit/route.ts` | exact |
| `app/api/reports/staff/route.ts` | route (GET, aggregation) | request-response | `app/api/audit/route.ts` | role-match |
| `app/api/reports/reconciliation/route.ts` | route (GET, aggregation) | request-response | `app/api/audit/route.ts` | role-match |
| `app/api/incentives/route.ts` | route (GET + POST) | request-response | `app/api/admin/inventory/replenish/route.ts` | exact |
| `prisma/schema.prisma` | model | CRUD | existing Sale/AuditLog models in `prisma/schema.prisma` | role-match |
| `app/admin/audit/page.tsx` | component (page) — extend | request-response | itself (extend in place) | exact |
| `app/login/page.tsx` | component (page) — modify | request-response | itself (modify redirect logic) | exact |

---

## Pattern Assignments

### `app/finance/layout.tsx` (layout, request-response)

**Analog:** `app/admin/layout.tsx`

**Full pattern** (lines 1-20 — copy verbatim, swap `AdminNav` for `FinanceNav`):
```typescript
import React from 'react'
import { FinanceNav } from '@/components/FinanceNav'
import { ToastProvider } from '@/components/toast'

export default function FinanceLayout({
  children,
}: {
  children: React.ReactNode
}) {
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

---

### `components/FinanceNav.tsx` (component, request-response)

**Analog:** `components/AdminNav.tsx` (lines 1-78)

**Imports pattern** (lines 1-10):
```typescript
'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/toast'
import { BarChart3, LogOut } from 'lucide-react'
import { logout } from '@/lib/auth/client'
```

**Core nav structure** (lines 11-78 — adapt for single Finance nav item):
```typescript
export function FinanceNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { addToast } = useToast()

  const handleLogout = async () => {
    try {
      await logout()
      addToast('Logged out successfully', 'success')
      router.push('/login')
    } catch (error) {
      console.error('Logout error:', error)
      addToast('Logout error', 'error')
    }
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  const navItems = [
    { href: '/finance/reports', label: 'Reports', icon: BarChart3 },
  ]

  return (
    <nav className="w-64 bg-white border-r border-gray-200 h-screen sticky top-0 flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-xl font-semibold text-gray-900">WebStockName</h1>
        <p className="text-sm text-gray-500">Finance</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="space-y-2 p-4">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            return (
              <Link key={item.href} href={item.href}>
                <button
                  className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              </Link>
            )
          })}
        </div>
      </div>

      <div className="border-t border-gray-200 p-4">
        <Button onClick={handleLogout} variant="outline" className="w-full">
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>
    </nav>
  )
}
```

---

### `app/finance/reports/page.tsx` (component/page, request-response)

**Analog:** `app/admin/audit/page.tsx` (full file)

**Imports pattern** (lines 1-24 of audit page — adapt for reports):
```typescript
'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/components/toast'
import { ChevronLeft, ChevronRight } from 'lucide-react'
// Additional imports needed for reports page:
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
```

**Data fetch pattern** (from audit page lines 97-135 — replicate for each tab's data):
```typescript
useEffect(() => {
  const token = localStorage.getItem('access_token')
  if (!token) return

  const fetchData = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.append('start', dateRange.start)
      params.append('end', dateRange.end)
      params.append('page', page.toString())

      const response = await fetch(`/api/reports/sales?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) throw new Error('Failed to fetch sales')

      const data = await response.json()
      setSales(data.data)
      setPagination(data.pagination)
    } catch (error) {
      console.error('Error fetching sales:', error)
      addToast('Failed to load sales report', 'error')
    } finally {
      setLoading(false)
    }
  }

  fetchData()
}, [dateRange, page, addToast])
```

**Loading state pattern** (audit page line 240):
```typescript
{loading ? (
  <div className="p-8 text-center text-gray-500">Loading...</div>
) : (
  // table content
)}
```

**Empty state pattern** (audit page lines 254-259):
```typescript
{items.length === 0 ? (
  <TableRow>
    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
      No sales found for the selected date range.
    </TableCell>
  </TableRow>
) : (
  items.map(...)
)}
```

**Pagination pattern** (audit page lines 285-313):
```typescript
{pagination.pages > 1 && (
  <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
    <div className="text-sm text-gray-500">
      Page {pagination.page} of {pagination.pages} ({pagination.total} total)
    </div>
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setPage(Math.max(1, page - 1))}
        disabled={page === 1}
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setPage(Math.min(pagination.pages, page + 1))}
        disabled={page === pagination.pages}
        aria-label="Next page"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  </div>
)}
```

**Modal POST + inline error pattern** (from `app/admin/users/page.tsx` lines 122-166):
```typescript
const handleSubmit = async () => {
  try {
    setModalError('')
    const validation = incentiveSchema.safeParse(form)
    if (!validation.success) {
      const errors: Record<string, string> = {}
      validation.error.errors.forEach((err) => {
        errors[err.path[0] as string] = err.message
      })
      setFieldErrors(errors)
      return
    }

    const token = localStorage.getItem('access_token')
    const response = await fetch('/api/incentives', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(validation.data),
    })

    if (!response.ok) {
      const error = await response.json()
      setModalError(error.error || 'Failed to save incentive. Please check all fields and try again.')
      return
    }

    setOpen(false)
    // re-trigger fetch by bumping a refresh counter
    setRefreshKey(k => k + 1)
    addToast('Incentive saved', 'success')
  } catch (error) {
    setModalError('Failed to save incentive. Please check all fields and try again.')
  }
}
```

**Role-conditional render** — read role from JWT stored in localStorage:
```typescript
// Decode JWT to get role (no library needed — payload is base64)
const token = localStorage.getItem('access_token')
const role = token ? JSON.parse(atob(token.split('.')[1])).role : null
const isSuperadmin = role === 'SUPERADMIN'

// Conditional render
{isSuperadmin && (
  <Button onClick={() => setIncentiveModalOpen(true)}>Add Incentive</Button>
)}
```

**Date range preset utility** (client-side, no library):
```typescript
type DatePreset = 'today' | 'yesterday' | 'this_week' | 'this_month'

function getDateRange(range: DatePreset): { start: string; end: string } {
  const now = new Date()
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)

  switch (range) {
    case 'today':
      return { start: startOfDay(now).toISOString(), end: endOfDay(now).toISOString() }
    case 'yesterday': {
      const d = new Date(now); d.setDate(now.getDate() - 1)
      return { start: startOfDay(d).toISOString(), end: endOfDay(d).toISOString() }
    }
    case 'this_week': {
      const mon = new Date(now); mon.setDate(now.getDate() - now.getDay() + 1)
      return { start: startOfDay(mon).toISOString(), end: endOfDay(now).toISOString() }
    }
    case 'this_month': {
      const first = new Date(now.getFullYear(), now.getMonth(), 1)
      return { start: startOfDay(first).toISOString(), end: endOfDay(now).toISOString() }
    }
  }
}
```

---

### `app/api/reports/sales/route.ts` (route/GET, request-response)

**Analog:** `app/api/audit/route.ts` (full file, lines 1-125)

**Auth + RBAC guard** (lines 15-22 — copy, change roles to FINANCE + SUPERADMIN):
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware, AuthenticatedRequest } from '@/middleware/auth'
import { rbacMiddleware } from '@/middleware/rbac'

export async function GET(request: NextRequest) {
  const authResult = await authMiddleware(request as AuthenticatedRequest)
  if (authResult) return authResult

  const rbacResult = await rbacMiddleware(['FINANCE', 'SUPERADMIN'])(
    request as AuthenticatedRequest
  )
  if (rbacResult) return rbacResult

  try {
    const prisma = (await import('@/lib/db')).default
    // ...
  }
}
```

**Query param parsing** (audit route lines 26-34 — adapt for start/end/page):
```typescript
const { searchParams } = new URL(request.url)
const startStr = searchParams.get('start')
const endStr = searchParams.get('end')
const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
const limit = 50  // fixed per UI-SPEC

const where: any = {}
if (startStr && endStr) {
  where.createdAt = {
    gte: new Date(startStr),
    lte: new Date(endStr),
  }
}
```

**Prisma findMany with include** (adapt from audit route lines 78-92):
```typescript
const total = await prisma.sale.count({ where })

const sales = await prisma.sale.findMany({
  where,
  include: {
    salesperson: { select: { username: true } },
    items: {
      select: {
        quantity: true,
        unitPrice: true,
        unitCost: true,
        product: { select: { name: true } },
      },
    },
  },
  orderBy: { createdAt: 'desc' },
  skip: (page - 1) * limit,
  take: limit,
})
```

**Decimal conversion** (from sales route line ~128 — CRITICAL, always apply):
```typescript
// Convert Prisma Decimal to number before JSON response
const withMargin = sales.map((sale) => {
  const revenue = sale.items.reduce((s, i) => s + Number(i.unitPrice) * i.quantity, 0)
  const cost    = sale.items.reduce((s, i) => s + Number(i.unitCost)  * i.quantity, 0)
  const margin  = revenue > 0 ? ((revenue - cost) / revenue * 100) : null
  return {
    id: sale.id,
    createdAt: sale.createdAt.toISOString(),
    salesperson: sale.salesperson.username,
    products: sale.items.map(i => i.product.name).join(', '),
    total: Number(sale.total),        // Decimal → number
    paymentMethod: sale.paymentMethod,
    marginPercent: margin !== null ? parseFloat(margin.toFixed(1)) : null,
  }
})
```

**Pagination response shape** (audit route lines 106-117 — copy verbatim):
```typescript
return NextResponse.json(
  {
    data: withMargin,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  },
  { status: 200 }
)
```

**Error handling** (audit route lines 118-124):
```typescript
  } catch (error) {
    console.error('Sales report error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
```

---

### `app/api/reports/staff/route.ts` (route/GET aggregation, request-response)

**Analog:** `app/api/audit/route.ts` (auth/RBAC/error pattern) + Prisma groupBy

**Auth + RBAC guard:** Same as sales route — copy auth block, use `['FINANCE', 'SUPERADMIN']`.

**Core aggregation pattern** (no direct analog in codebase; use RESEARCH.md Pattern 3):
```typescript
// groupBy does NOT support include — two-query pattern required
const staffStats = await prisma.sale.groupBy({
  by: ['salespersonId'],
  where: { createdAt: { gte: new Date(start), lte: new Date(end) } },
  _sum: { total: true, itemCount: true },
  _count: { id: true },
})

const userIds = staffStats.map((s) => s.salespersonId)
const users = await prisma.user.findMany({
  where: { id: { in: userIds } },
  select: { id: true, username: true },
})

const result = staffStats.map((s) => {
  const user = users.find((u) => u.id === s.salespersonId)
  return {
    salespersonId: s.salespersonId,
    salesperson: user?.username ?? 'Unknown',
    salesCount: s._count.id,
    totalRevenue: Number(s._sum.total ?? 0),  // Decimal → number
    itemsSold: s._sum.itemCount ?? 0,
  }
})
```

---

### `app/api/reports/reconciliation/route.ts` (route/GET aggregation, request-response)

**Analog:** `app/api/audit/route.ts` (auth/RBAC pattern)

**Auth + RBAC guard:** Same pattern — `['FINANCE', 'SUPERADMIN']`.

**Core pattern** (payment method groupBy):
```typescript
const stats = await prisma.sale.groupBy({
  by: ['paymentMethod'],
  where: { createdAt: { gte: new Date(start), lte: new Date(end) } },
  _sum: { total: true },
})

const totals = { cash: 0, card: 0, transfer: 0 }
for (const s of stats) {
  const amount = Number(s._sum.total ?? 0)
  if (s.paymentMethod === 'CASH') totals.cash = amount
  if (s.paymentMethod === 'CARD') totals.card = amount
  if (s.paymentMethod === 'TRANSFER') totals.transfer = amount
}

return NextResponse.json({
  cash: totals.cash,
  card: totals.card,
  transfer: totals.transfer,
  grandTotal: totals.cash + totals.card + totals.transfer,
})
```

---

### `app/api/incentives/route.ts` (route/GET+POST, request-response)

**Analog:** `app/api/admin/inventory/replenish/route.ts` (POST pattern) + `app/api/audit/route.ts` (GET pattern)

**Imports pattern**:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { authMiddleware, AuthenticatedRequest } from '@/middleware/auth'
import { rbacMiddleware } from '@/middleware/rbac'
import { logAction } from '@/lib/audit/logger'
import { z } from 'zod'
```

**Zod schema** (matches D-10; mirrors replenish schema lines 6-10):
```typescript
const incentiveSchema = z.object({
  salespersonId: z.string().cuid(),
  amount: z.number().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  note: z.string().min(1, 'Note is required'),
})
```

**GET handler** (FINANCE + SUPERADMIN; filter by `date` field, not `createdAt`):
```typescript
export async function GET(request: NextRequest) {
  const authResult = await authMiddleware(request as AuthenticatedRequest)
  if (authResult) return authResult

  const rbacResult = await rbacMiddleware(['FINANCE', 'SUPERADMIN'])(
    request as AuthenticatedRequest
  )
  if (rbacResult) return rbacResult

  try {
    const prisma = (await import('@/lib/db')).default
    const { searchParams } = new URL(request.url)
    const startStr = searchParams.get('start')
    const endStr = searchParams.get('end')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = 25

    const where: any = {}
    if (startStr && endStr) {
      // IMPORTANT: filter on `date` (period), NOT `createdAt` (entry timestamp)
      where.date = { gte: new Date(startStr), lte: new Date(endStr) }
    }

    const total = await prisma.incentive.count({ where })
    const incentives = await prisma.incentive.findMany({
      where,
      include: {
        salesperson: { select: { username: true } },
        enteredBy: { select: { username: true } },
      },
      orderBy: { date: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    })

    return NextResponse.json({
      data: incentives.map(i => ({
        id: i.id,
        salesperson: i.salesperson.username,
        enteredBy: i.enteredBy.username,
        amount: Number(i.amount),   // Decimal → number
        date: i.date.toISOString().split('T')[0],
        note: i.note,
        createdAt: i.createdAt.toISOString(),
      })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error('Incentives GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

**POST handler** (SUPERADMIN only; mirrors replenish route lines 12-99):
```typescript
export async function POST(request: NextRequest) {
  const authResult = await authMiddleware(request as AuthenticatedRequest)
  if (authResult) return authResult

  const rbacResult = await rbacMiddleware(['SUPERADMIN'])(
    request as AuthenticatedRequest
  )
  if (rbacResult) return rbacResult

  try {
    const prisma = (await import('@/lib/db')).default
    const body = await request.json()

    const validation = incentiveSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { salespersonId, amount, date, note } = validation.data
    const req = request as AuthenticatedRequest
    const enteredById = req.user!.userId

    const incentive = await prisma.incentive.create({
      data: { salespersonId, enteredById, amount, date: new Date(date), note },
    })

    // Audit log (INCENT-03, AUDIT-04)
    await logAction(enteredById, 'INCENTIVE_CREATE', 'INCENTIVE', incentive.id, {
      salesperson_id: salespersonId,
      amount,
      date,
      note,
      entered_by: enteredById,
    })

    return NextResponse.json(
      { id: incentive.id, amount: Number(incentive.amount) },
      { status: 201 }
    )
  } catch (error) {
    console.error('Incentives POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

---

### `prisma/schema.prisma` — Add Incentive model

**Analog:** Existing `Sale` model (lines 98-115) and `AuditLog` model (lines 49-63) for field conventions.

**Field naming convention** from codebase — camelCase Prisma field + `@map("snake_case")` + `@@map("table_name")`:
```prisma
model Sale {
  id            String     @id @default(cuid())
  cashierId     String     @map("cashier_id")
  total         Decimal    @db.Decimal(10, 2)
  createdAt     DateTime   @default(now()) @map("created_at")
  @@map("sales")
}
```

**New Incentive model to add** (follows same conventions):
```prisma
model Incentive {
  id            String   @id @default(cuid())
  salespersonId String   @map("salesperson_id")
  salesperson   User     @relation("SalespersonIncentives", fields: [salespersonId], references: [id])
  enteredById   String   @map("entered_by_id")
  enteredBy     User     @relation("EnteredByIncentives", fields: [enteredById], references: [id])
  amount        Decimal  @db.Decimal(10, 2)
  date          DateTime @db.Date
  note          String
  createdAt     DateTime @default(now()) @map("created_at")

  @@index([salespersonId])
  @@index([date])
  @@map("incentives")
}
```

**User model additions required** (add two new relation fields to `model User`):
```prisma
// Add inside model User:
salespersonIncentives Incentive[] @relation("SalespersonIncentives")
enteredIncentives     Incentive[] @relation("EnteredByIncentives")
```

---

### `app/admin/audit/page.tsx` — Extend in place

**Analog:** Itself. Extend only two things:

**1. Extend ACTIONS constant** (line 43-50 — add three missing entries):
```typescript
const ACTIONS = [
  'LOGIN',
  'LOGOUT',
  'USER_CREATE',
  'USER_EDIT',
  'USER_DEACTIVATE',
  'PRODUCT_CREATE',
  'SALE_CREATE',           // added — Phase 2 backfill
  'INVENTORY_REPLENISH',   // added — Phase 2 backfill
  'INCENTIVE_CREATE',      // added — Phase 3
]
```

**2. Add Details column** — add `TableHead` after Entity ID and `TableCell` showing first 60 chars of metadata:
```typescript
// In TableHeader — add after Entity ID head:
<TableHead>Details</TableHead>

// In TableRow map — add after entityId cell:
<TableCell
  className="text-sm text-gray-500 font-mono max-w-xs truncate"
  title={log.metadata ? JSON.stringify(log.metadata) : ''}
>
  {log.metadata ? JSON.stringify(log.metadata).slice(0, 60) : '—'}
</TableCell>
```

**Note:** The AuditLog interface and API response must also include `metadata`. Update:
```typescript
interface AuditLog {
  // existing fields...
  metadata?: Record<string, unknown> | null
}
```

And update the API route `/api/audit/route.ts` to include `metadata` in the formatted response:
```typescript
const formattedLogs = auditLogs.map((log) => ({
  // existing fields...
  metadata: log.metadata,  // add this line
}))
```

---

### `app/login/page.tsx` — Modify redirect logic

**Analog:** Itself. Currently redirects all users to `/dashboard` (lines 34-36 and 20-24).

**Current pattern** (line 34-36):
```typescript
await login(username, password)
router.push('/dashboard')
```

**Required change** — decode role from JWT returned by `login()` and branch:
```typescript
const result = await login(username, password)  // assuming login() returns token or role
// OR decode from localStorage after login sets the token:
const token = localStorage.getItem('access_token')
const role = token ? JSON.parse(atob(token.split('.')[1])).role : null

if (role === 'FINANCE') {
  router.push('/finance/reports')
} else if (role === 'CASHIER') {
  router.push('/cashier/pos')
} else {
  router.push('/admin/users')
}
```

**Note:** Check `lib/auth/client.ts` for the `login()` return value signature before implementing — it may already return the decoded role.

---

## Shared Patterns

### Authentication + RBAC Guard
**Source:** `app/api/audit/route.ts` lines 1-22
**Apply to:** All new API routes in `/api/reports/*` and `/api/incentives/route.ts`
```typescript
import { authMiddleware, AuthenticatedRequest } from '@/middleware/auth'
import { rbacMiddleware } from '@/middleware/rbac'

// In every GET/POST handler — first two lines of try block:
const authResult = await authMiddleware(request as AuthenticatedRequest)
if (authResult) return authResult

const rbacResult = await rbacMiddleware(['FINANCE', 'SUPERADMIN'])(  // adjust roles per route
  request as AuthenticatedRequest
)
if (rbacResult) return rbacResult
```

### Prisma Client Import
**Source:** `app/api/audit/route.ts` line 25
**Apply to:** All new API routes
```typescript
const prisma = (await import('@/lib/db')).default
```

### Decimal → Number Conversion
**Source:** `app/api/cashier/sales/route.ts` line 127 — `total: Number(sale.total)`
**Apply to:** Every field of type `Decimal` in API responses (`sale.total`, `saleItem.unitPrice`, `saleItem.unitCost`, `incentive.amount`)
```typescript
// Always call Number() or .toNumber() on Prisma Decimal fields before returning JSON
total: Number(sale.total),
amount: Number(incentive.amount),
```

### Zod Validation in POST Routes
**Source:** `app/api/admin/inventory/replenish/route.ts` lines 6-10, 24-32
**Apply to:** `POST /api/incentives`
```typescript
const validation = schema.safeParse(body)
if (!validation.success) {
  return NextResponse.json(
    { error: 'Invalid input', details: validation.error.errors },
    { status: 400 }
  )
}
```

### logAction Audit Call
**Source:** `app/api/cashier/sales/route.ts` lines 124-130
**Apply to:** `POST /api/incentives` after successful create
```typescript
await logAction(userId, 'INCENTIVE_CREATE', 'INCENTIVE', incentive.id, { ...metadata })
```

### Error Handler (catch block)
**Source:** `app/api/audit/route.ts` lines 118-124
**Apply to:** All new API routes
```typescript
} catch (error) {
  console.error('[route name] error:', error)
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
}
```

### Date Filter on Prisma where clause
**Source:** `app/api/audit/route.ts` lines 48-72
**Apply to:** All `/api/reports/*` routes and `/api/incentives` GET
```typescript
// Client sends ISO strings; server applies directly to Prisma where
where.createdAt = {
  gte: new Date(startStr),
  lte: new Date(endStr),
}
// For incentives: use `where.date` instead of `where.createdAt`
```

### shadcn Table + Empty State
**Source:** `app/admin/audit/page.tsx` lines 243-282
**Apply to:** All report tab tables in `app/finance/reports/page.tsx`
- Container: `<div className="bg-white rounded-lg border border-gray-200">`
- Empty state: `<TableCell colSpan={N} className="text-center py-8 text-gray-500">`

### shadcn Pagination
**Source:** `app/admin/audit/page.tsx` lines 285-313
**Apply to:** Sales tab (50/page) and Incentives detail list (25/page)
- Copy pattern verbatim; adjust `limit` constant per tab

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| None | — | — | All files have usable analogs in the codebase |

---

## Metadata

**Analog search scope:** `app/api/`, `app/admin/`, `app/cashier/`, `app/finance/`, `components/`, `prisma/`
**Files scanned:** 15 source files
**Pattern extraction date:** 2026-04-21
