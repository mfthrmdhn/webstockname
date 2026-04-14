# Architecture Research

**Domain:** Single-store retail inventory and POS system with multi-role access and incentive tracking

**Researched:** 2026-04-14

**Confidence:** MEDIUM (WebSearch + official docs; single-store scope simplifies recommendations vs. enterprise patterns)

## Standard Architecture

### System Overview

A single-store inventory + POS + finance system typically consists of these layers:

```
┌──────────────────────────────────────────────────────────┐
│                    Client Layer                          │
├──────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │
│  │  Cashier    │  │  Finance    │  │  Superadmin │       │
│  │   UI (POS)  │  │  Dashboard  │  │  Console    │       │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘       │
│         │                │               │               │
├─────────┴────────────────┴───────────────┴───────────────┤
│                   API Layer                              │
├────────┬───────────────┬──────────────┬──────────────────┤
│ Auth   │  Inventory    │  Sales       │  Admin/Reporting │
│ Service│  Service      │  Service     │  Service         │
├────────┴───────────────┴──────────────┴──────────────────┤
│                  Domain Logic Layer                      │
├──────────────────────────────────────────────────────────┤
│  ┌─────────┐ ┌───────────┐ ┌──────────┐ ┌────────────┐  │
│  │Inventory│ │ Sales     │ │ User     │ │ Incentive  │  │
│  │Manager  │ │ Processor │ │ Manager  │ │ Tracker    │  │
│  └────┬────┘ └─────┬─────┘ └────┬─────┘ └──────┬─────┘  │
│       │            │            │             │         │
├───────┴────────────┴────────────┴─────────────┴─────────┤
│                  Data Layer                             │
├──────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────┐   │
│  │            PostgreSQL / MySQL                    │   │
│  │   (Inventory, Sales, Users, Incentives)         │   │
│  └──────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │         Redis Cache (optional, not MVP)         │   │
│  │   (Real-time inventory, session cache)          │   │
│  └──────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| **Inventory Service** | Stock level tracking, availability checks, automatic decrements on sale | Query inventory data, enforce constraints (never sell beyond 0), handle store/warehouse separation |
| **Sales Service** | Transaction processing, payment handling, salesperson attribution, receipt generation | Create sales records, link to inventory, record payment method, trigger inventory updates |
| **User Management Service** | Authentication, authorization, role enforcement (Superadmin, Finance, Cashier) | Validate credentials, enforce RBAC rules, manage sessions |
| **Incentive Tracker** | Record manual incentive entries, calculate totals per salesperson | Store incentive records linked to users and dates, support read/query by finance |
| **Reporting Service** | Generate daily sales reports, margin analysis, salesperson performance, incentive summaries | Query transactional data, aggregate by date/product/salesperson, format for finance review |
| **API Gateway** | Route requests, enforce authentication, apply rate limiting (single store = low throughput) | Simple routing layer, minimal caching needed for MVP |

## Recommended Project Structure

```
src/
├── api/                         # HTTP endpoints (REST or GraphQL)
│   ├── routes/
│   │   ├── auth.ts             # Login/logout endpoints
│   │   ├── inventory.ts        # Stock checks, replenishment
│   │   ├── sales.ts            # Create sale, process transaction
│   │   ├── incentives.ts       # Manual incentive entry
│   │   └── reports.ts          # Finance dashboards & exports
│   ├── middleware/
│   │   ├── auth.ts             # JWT/session validation
│   │   └── rbac.ts             # Role-based access control
│   └── controllers/
│       ├── inventory.ts        # Business logic for stock operations
│       ├── sales.ts            # Business logic for transactions
│       └── finance.ts          # Reporting aggregations
│
├── domain/                      # Business logic (no framework dependencies)
│   ├── inventory/
│   │   ├── InventoryManager.ts # Stock tracking, availability logic
│   │   ├── StockMovement.ts    # Individual transaction records
│   │   └── Warehouse.ts        # Store vs warehouse concept
│   ├── sales/
│   │   ├── SalesTransaction.ts # Individual sale record
│   │   ├── SalesProcessor.ts   # Transaction validation & processing
│   │   └── PaymentHandler.ts   # Payment methods (optional MVP)
│   ├── users/
│   │   ├── User.ts             # User entity (email, name, role)
│   │   ├── Role.ts             # Superadmin, Finance, Cashier
│   │   └── AuthService.ts      # Credential validation
│   ├── incentives/
│   │   ├── Incentive.ts        # Individual incentive record
│   │   └── IncentiveTracker.ts # Aggregate incentives by user
│   └── common/
│       ├── Money.ts            # Price/margin value objects
│       └── DateTime.ts         # Consistent date handling
│
├── infrastructure/              # Database & external service adapters
│   ├── database/
│   │   ├── connection.ts       # Pool, setup
│   │   ├── migrations/         # Version controlled schema changes
│   │   └── seeds/              # Test data
│   ├── repositories/           # Query/update operations
│   │   ├── InventoryRepository.ts
│   │   ├── SalesRepository.ts
│   │   ├── UserRepository.ts
│   │   └── IncentiveRepository.ts
│   └── cache/                  # Redis (if needed)
│       └── CacheService.ts
│
├── shared/                      # Utilities, helpers, types
│   ├── types/
│   │   ├── errors.ts           # Custom error classes
│   │   └── events.ts           # Event types (optional async)
│   ├── utils/
│   │   └── validation.ts       # Input validation helpers
│   └── constants.ts            # Role names, config
│
├── app.ts                       # Application bootstrap
├── config.ts                    # Environment variables
└── index.ts                     # Entry point
```

### Structure Rationale

- **`api/`**: HTTP routes separate from domain logic, making business rules testable and framework-agnostic. Controllers mediate between HTTP and domain.

- **`domain/`**: Core business logic (inventory decrements, transaction validation, role checks) lives here, independent of database technology or web framework. Easy to unit test.

- **`infrastructure/`**: Database queries abstracted into repositories. Easy to swap databases or add caching without changing domain logic.

- **`shared/`**: Common utilities (validation, error types, constants) used across layers.

This follows **layered architecture** with clear separation of concerns: HTTP handling → Business rules → Data access.

For a single-store MVP, avoid microservices. Keep as monolith. All data fits in one database. Scale complexity only when needed.

## Architectural Patterns

### Pattern 1: Inventory Soft Reservation

**What:** When processing a sale, decrement `available_quantity` immediately (preventing overselling during concurrent requests), but mark items as `reserved_quantity` until payment clears. On payment failure, items are released back to available.

**When to use:** Any retail system that processes transactions concurrently and must never oversell. This is especially important for single-store where inventory is the source of truth.

**Trade-offs:** 
- **Pro**: Prevents race conditions (two cashiers can't both sell the same item), simple to understand
- **Con**: Requires careful timeout handling for abandoned reservations

**Example:**
```typescript
// Pessimistic: lock during transaction
async function reserveInventory(productId, quantity, saleId) {
  // START TRANSACTION (acquires lock)
  const inventory = await db.query(
    "SELECT available_quantity FROM inventory WHERE product_id = $1 FOR UPDATE",
    [productId]
  );
  
  if (inventory.available_quantity < quantity) {
    throw new OutOfStockError();
  }
  
  // Decrement available, increment reserved
  await db.query(
    `UPDATE inventory 
     SET available_quantity = available_quantity - $1,
         reserved_quantity = reserved_quantity + $1
     WHERE product_id = $2`,
    [quantity, productId]
  );
  
  // Record reservation for later settlement
  await db.query(
    `INSERT INTO inventory_reservations (sale_id, product_id, quantity, created_at)
     VALUES ($1, $2, $3, NOW())`,
    [saleId, productId, quantity]
  );
  // COMMIT TRANSACTION (releases lock)
}

// On successful payment:
async function commitSale(saleId) {
  // reserved_quantity → permanently consumed (no update needed, already decremented)
  await db.query("DELETE FROM inventory_reservations WHERE sale_id = $1", [saleId]);
}

// On payment failure (timeout 15 minutes):
async function releaseExpiredReservations() {
  await db.query(
    `UPDATE inventory 
     SET reserved_quantity = reserved_quantity - r.quantity,
         available_quantity = available_quantity + r.quantity
     FROM inventory_reservations r
     WHERE r.created_at < NOW() - INTERVAL '15 minutes'
       AND r.product_id = inventory.product_id`
  );
  // Clean up expired reservations
  await db.query("DELETE FROM inventory_reservations WHERE created_at < NOW() - INTERVAL '15 minutes'");
}
```

### Pattern 2: Role-Based Access Control (RBAC) via Middleware

**What:** Check user role on every protected endpoint. Three roles: Superadmin (all access), Finance (read-only sales/incentives), Cashier (stock check + sales only).

**When to use:** Any system with multiple user types. Simple to implement with middleware, scales fine for small teams.

**Trade-offs:**
- **Pro**: Simple to reason about, easy to audit ("this endpoint requires Finance role")
- **Con**: Not attribute-based (can't do "Finance can see sales from their region" — but that's not needed in v1)

**Example:**
```typescript
// Middleware that enforces role
const requireRole = (allowedRoles: Role[]) => (req, res, next) => {
  const user = req.user; // From JWT/session
  if (!allowedRoles.includes(user.role)) {
    return res.status(403).json({ error: "Insufficient permissions" });
  }
  next();
};

// Usage in routes
app.post('/sales', 
  authenticate,
  requireRole([Role.Cashier, Role.Superadmin]),
  createSaleController
);

app.get('/reports/sales',
  authenticate,
  requireRole([Role.Finance, Role.Superadmin]),
  getSalesReportController
);

app.post('/incentives',
  authenticate,
  requireRole([Role.Superadmin]),
  recordIncentiveController
);
```

### Pattern 3: Event-Driven Inventory Sync (Optional for future, not MVP)

**What:** When a sale is processed (payment confirmed), emit an event. The Inventory service listens and decrements stock. Decouples Sales from Inventory.

**When to use:** When you want to scale independently or add features (notifications, analytics) that depend on sales. For MVP with single database, skip this.

**Trade-offs:**
- **Pro**: Loose coupling, easy to add new features (alerts when stock < threshold)
- **Con**: Adds complexity (need message queue, error handling for async operations)

**Example (future reference):**
```typescript
// After sale is recorded in database
async function processSale(sale: Sale) {
  // Store transaction
  const saleId = await salesRepo.create(sale);
  
  // Emit event (via Redis Pub/Sub or Kafka)
  eventBus.emit('sale.completed', {
    saleId,
    items: sale.items,
    timestamp: now()
  });
  
  return saleId;
}

// Separate service listens
eventBus.on('sale.completed', async (event) => {
  for (const item of event.items) {
    await inventoryRepo.decrementAvailable(item.productId, item.quantity);
  }
});
```

## Data Flow

### Request Flow (Cashier Processing Sale)

```
Cashier UI
  ↓ (product barcode scanned)
Check Stock Endpoint
  ↓ (async call)
API Layer → Route: GET /inventory/available/:productId
  ↓
Auth Middleware (verify JWT, check Cashier role)
  ↓
Inventory Controller
  ↓
Inventory Service (business logic: check available_quantity > 0)
  ↓
Inventory Repository (query database)
  ↓
PostgreSQL (SELECT available_quantity FROM inventory WHERE ...)
  ↓ (returns { available: 5, reserved: 0 })
Response: { inStock: true, quantity: 5 }
  ↓
Cashier UI displays "5 available"
```

### Transaction Flow (Sale Completion)

```
Cashier clicks "Complete Sale"
  ↓
Request: POST /sales with { items: [{productId, qty}], salespersonId, paymentMethod }
  ↓
API Layer → Route: POST /sales
  ↓
Auth Middleware (verify Cashier role)
  ↓
Sales Controller
  ↓
Sales Processor (business logic)
  ├─ Validate: inventory available for all items?
  ├─ Validate: salesperson exists and is active?
  └─ Validate: price/cost values reasonable?
  ↓
Inventory Service (reserve stock)
  ├─ UPDATE inventory SET available = available - qty WHERE product_id IN (...)
  ├─ INSERT into reservations (temporary hold)
  └─ If any reservation fails, ROLLBACK entire transaction
  ↓
Sales Repository (create sale record)
  ├─ INSERT into sales (amount, payment_method, timestamp)
  ├─ INSERT into sales_items (sale_id, product_id, qty, unit_price, cost)
  └─ INSERT into sales_attribution (sale_id, salesperson_id)
  ↓
Payment Handler (if payment processing needed in future)
  ├─ Call external gateway
  └─ On success: DELETE from reservations (finalize)
  ↓
Response: { saleId, receiptUrl, newInventoryCount }
  ↓
Cashier UI prints receipt, shows updated stock
```

### Finance Report Generation Flow

```
Finance Role visits Dashboard
  ↓
Request: GET /reports/daily-sales?date=2026-04-14
  ↓
Auth Middleware (verify Finance role)
  ↓
Reports Controller
  ↓
Finance Service (aggregation logic)
  ├─ SUM(sales_items.quantity) GROUP BY product_id
  ├─ SUM(sales_items.unit_price * qty) as revenue GROUP BY date
  ├─ SUM(sales_items.cost * qty) as cost GROUP BY date
  ├─ Margin = (revenue - cost) / revenue
  └─ JOIN with sales_attribution for salesperson metrics
  ↓
Query PostgreSQL (complex multi-join, single read-heavy query)
  ↓
Response: {
    totalSales: $4500,
    totalCost: $2800,
    margin: 37.8%,
    itemsSold: 127,
    topProductByRevenue: "Widget A: $1200",
    topSalesperson: "Alice (18 sales, $2100)"
  }
  ↓
Finance UI displays dashboard with charts
```

### Incentive Tracking Flow

```
Superadmin visits Incentive Console
  ↓
Request: POST /incentives with { salespersonId, amount, reason, date }
  ↓
Auth Middleware (verify Superadmin role)
  ↓
Incentive Controller
  ↓
Incentive Tracker (validation)
  ├─ Verify salesperson exists
  ├─ Verify amount is positive
  └─ Record entry with created_by = superadmin
  ↓
Incentive Repository
  ├─ INSERT into incentives (user_id, amount, reason, entry_date, created_by)
  └─ Record audit trail (who entered, when, amount)
  ↓
Response: { incentiveId, recorded }

Finance queries incentives:
  ↓
Request: GET /incentives?salesperson=alice
  ↓
Auth Middleware (verify Finance role)
  ↓
Reports Service
  ├─ SUM(amount) WHERE user_id = alice's_id
  ├─ GROUP BY month for trend analysis
  └─ JOIN with sales_count for "incentive per sale" metric
  ↓
Response: {
    totalIncentives: $850,
    entriesByMonth: { "2026-01": $200, "2026-02": $300, "2026-03": $350 },
    saleMeasure: $850 / 47_sales = $18.09 per sale
  }
```

### Key Data Flows

1. **Inventory Update on Sale**: Sales completion → Inventory Service decrements available_quantity → Updates stored. This is synchronous and in same transaction (never separate).

2. **Salesperson Attribution**: Cashier selects themselves or another staff member → Sale linked to user_id → Finance queries sales by salesperson. Must ensure user_id is valid before committing sale.

3. **Financial Reporting**: Sales records + Inventory cost → Finance dashboard queries SUM/AVG/GROUP BY. Margin calculated as (revenue - cost) / revenue. Should cache if queries slow (but unlikely with single store).

4. **Incentive Visibility**: Superadmin enters incentives → Finance queries incentives table filtered by user. Audit trail (created_by, created_at) important for accountability.

## Scaling Considerations

For a single-store system, scaling is not the primary concern. However, consider these:

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-100 daily transactions | Monolith in single database. No caching needed. API Gateway not necessary (use simple routing). |
| 100-500 daily transactions | Add Redis for session storage (optional). Monitor query performance on reports (consider indices on date, product_id, user_id). Consider pagination on large reports. |
| 500+ daily transactions or multi-store | Split microservices (Inventory, Sales, Reporting). Add message queue (Kafka) for async inventory updates. Consider database replication for high availability. Implement Change Data Capture (CDC) for reporting service to avoid blocking queries. |

### Scaling Priorities

1. **Database query performance** (first bottleneck): Add indices on frequently queried columns (product_id, user_id, sale_date). Monitor slow queries. Use EXPLAIN ANALYZE to optimize WHERE clauses.

2. **Report generation** (second bottleneck): Complex GROUP BY queries can slow under high transaction volume. Solve with:
   - Materialized views for daily reports (update once per day)
   - Read replicas for reporting queries (if using PostgreSQL, not needed for MVP)
   - Caching aggregated results (e.g., "daily revenue" cached and invalidated at midnight)

3. **Concurrent inventory updates** (third, if inventory becomes bottleneck): Use optimistic locking with version fields. If very high concurrency (unlikely in single store), partition inventory by product category.

## Anti-Patterns

### Anti-Pattern 1: Calculating Inventory in Application Code

**What people do:** 
```typescript
// WRONG: Query current inventory, decrement in memory, write back
const current = await db.query("SELECT available FROM inventory WHERE id = $1", [productId]);
const updated = current - quantity; // Lost in race condition!
await db.query("UPDATE inventory SET available = $1 WHERE id = $2", [updated, productId]);
```

**Why it's wrong:** Two concurrent requests can read the same value (5), both decrement to 4, and write back 4 twice. Stock is wrong.

**Do this instead:** Use atomic database operations:
```typescript
// CORRECT: Database handles atomicity
await db.query(
  "UPDATE inventory SET available = available - $1 WHERE id = $2 AND available >= $1",
  [quantity, productId]
);
// Check: if UPDATE returned 0 rows, reservation failed. Inventory wasn't decremented.
```

Or explicitly lock during transaction:
```typescript
const result = await db.query(
  "UPDATE inventory SET available = available - $1 WHERE id = $2 AND available >= $1 FOR UPDATE",
  [quantity, productId]
);
if (result.rowCount === 0) throw new OutOfStockError();
```

### Anti-Pattern 2: Mixing Roles in Queries

**What people do:**
```typescript
// WRONG: No role check
app.get('/reports/sales', async (req, res) => {
  const sales = await getSalesData(); // Anyone can call this
  res.json(sales);
});
```

**Why it's wrong:** Cashiers and unauthorized users can view sensitive financial data (margins, salesperson performance).

**Do this instead:** Enforce role in middleware:
```typescript
const requireRole = (roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
};

app.get('/reports/sales', requireRole([Role.Finance, Role.Superadmin]), getSalesReportHandler);
```

### Anti-Pattern 3: Storing Derived Data Without Invalidation

**What people do:**
```typescript
// WRONG: Cache profit margin, but never invalidate
const margin = (revenue - cost) / revenue; // Cached in a field
await db.query("UPDATE sales SET margin = $1 WHERE id = $2", [margin, saleId]);
```

If cost prices change later (bulk discount on supplier), cached margins are stale.

**Do this instead:** Calculate on query or use triggers to invalidate:
```typescript
// CORRECT: Calculate on demand (for low-frequency queries)
SELECT 
  s.id, s.revenue, si.cost_total,
  (s.revenue - si.cost_total) / s.revenue as margin
FROM sales s
JOIN (
  SELECT sale_id, SUM(unit_cost * qty) as cost_total
  FROM sales_items GROUP BY sale_id
) si ON s.id = si.sale_id;

// Or use a trigger to update cache when cost changes
CREATE TRIGGER update_sale_margin_on_cost_change
AFTER UPDATE ON sales_items
FOR EACH ROW EXECUTE FUNCTION recalculate_sale_margin();
```

### Anti-Pattern 4: No Audit Trail for Financial Data

**What people do:**
```typescript
// WRONG: Update incentive amount without history
UPDATE incentives SET amount = 500 WHERE id = 1;
// Now you don't know if it was 300 before or 500 originally
```

**Why it's wrong:** Finance can't explain why incentive changed. Superadmin can modify without accountability.

**Do this instead:** Add audit fields:
```typescript
CREATE TABLE incentives (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  amount DECIMAL,
  reason TEXT,
  entry_date DATE,
  created_by INT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_by INT REFERENCES users(id),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (updated_by) REFERENCES users(id)
);

-- On update
UPDATE incentives 
SET amount = $1, updated_by = $2, updated_at = NOW()
WHERE id = $3;

-- Finance can query: who changed what and when
SELECT * FROM incentives WHERE id = 1 ORDER BY updated_at DESC;
```

Alternatively, use immutable events (INSERT-only):
```typescript
// Never update. Only insert new entries.
INSERT INTO incentive_events (user_id, amount_delta, reason, created_by, created_at) VALUES (...);
// To get current total: SUM(amount_delta) WHERE user_id = ? AND created_at <= ?
```

## Integration Points

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| **Sales → Inventory** | Synchronous (same transaction) | On sale completion, inventory decrement must succeed or entire sale fails. Use database transactions. |
| **Sales → User** | Synchronous (lookup) | Must verify salesperson exists before recording sale. Quick query, don't parallelize. |
| **Sales → Incentives** | Asynchronous (optional future) | Not needed for MVP. Superadmin manually enters incentives, not tied to sales. If auto-calc needed later, can be async job. |
| **Finance Service → Sales/Inventory** | Read-only query | Finance dashboard only reads. Never write. Can be eventual-consistency (minute-old data is OK). |
| **Superadmin Console → All Services** | All operations | Superadmin can create users, modify inventory (manual replenishment), record incentives. Check permissions everywhere. |

### External Services (Future, Not MVP)

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| **Payment Gateway** (Stripe, Square) | REST API call with webhook callback | For now, single-store can use cash-only. If cards needed, integrate async: call gateway, wait for callback, finalize sale. |
| **Email/SMS** (Twilio, SendGrid) | Async queue (if added) | Send receipt to customer, alert to Superadmin on low stock. Not MVP priority. |
| **Analytics** (Mixpanel, Amplitude) | Event streaming (if scaled) | Track "sale completed", "inventory checked". Not MVP. Only add if business needs it. |

## Sources

- [Retail POS: The Best Guide To Choose & Setup in 2026](https://hostmerchantservices.com/2026/04/retail-pos-setup-guide/)
- [Top 7 POS with Inventory Management to Transform Your Operations in 2026](https://www.connectpos.com/pos-with-inventory-management/)
- [Understanding POS Software Architecture: A Comprehensive Guide for Developers](https://www.retailgear.com/pos-software-architecture/)
- [DFD for POS (Point of Sales) System](https://medium.com/@pies052022/dfd-for-pos-point-of-sales-system-data-flow-diagram-level-0-1-and-2-d7671e640315)
- [Design Inventory Management System: Step-by-Step Guide](https://www.systemdesignhandbook.com/guides/design-inventory-management-system/)
- [How to build an inventory management system that scales](https://www.cockroachlabs.com/blog/inventory-management-reference-architecture/)
- [How to Design ER Diagrams for Point of Sale (POS) Systems](https://www.geeksforgeeks.org/dbms/how-to-design-er-diagrams-for-point-of-sale-pos-systems/)
- [Sales and inventory system database Design Sample with ERD](https://itsourcecode.com/free-projects/database-design-projects/sales-inventory-system-database-design/)
- [Role-Based Access Control (RBAC) Guide for Secure Access](https://netwrix.com/en/resources/blog/role-based-access-control-rbac-guide/)
- [Demystifying POS Architecture: Transactions, Masters, and Interfaces](https://retail.town/it-application-in-retail/exploring-architecture-pos-systems/)

---

*Architecture research for: Retail Inventory & POS System (Single-Store)*  
*Researched: 2026-04-14*
