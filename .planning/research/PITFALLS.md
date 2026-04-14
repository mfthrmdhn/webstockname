# Pitfalls Research

**Domain:** Retail inventory and POS systems with sales attribution and manual incentives
**Researched:** 2026-04-14
**Confidence:** MEDIUM (WebSearch verified with multiple sources; no official framework docs available for retail-specific systems)

## Critical Pitfalls

### Pitfall 1: Inventory Sync Desynchronization (System of Record Drift)

**What goes wrong:**
Inventory counts in the system no longer match physical stock, causing customers to buy out-of-stock items or cashiers to see incorrect availability. The system shows 50 units but only 30 exist on shelves. Finance reports are built on phantom inventory, leading to inaccurate profit calculations.

**Why it happens:**
- Automatic inventory decrease on sale (your key feature) relies on perfect transaction recording. If a sale transaction fails halfway through (system crash, network outage), inventory may decrease without payment recording, or payment may record without inventory decrease
- Manual replenishment workflows are error-prone: staff entering "add 10 units" might mistype "add 100 units"
- Multiple concurrent sales from the same warehouse/store location without proper transaction locking can cause double-sells
- Returns, damaged stock, and theft are not recorded in the system
- Warehouse inventory is maintained separately and manual transfers don't trigger system updates
- Over time, small discrepancies compound into large gaps (30% of operational inefficiencies in retail, costing billions annually)

**How to avoid:**
- Implement transactional atomicity: inventory decrease and sale recording must be a single atomic operation — if either fails, both rollback
- Use database-level row locks (SELECT FOR UPDATE) when adjusting inventory to prevent concurrent modification race conditions
- Create a three-way reconciliation: POS sales data vs. inventory system vs. physical count audits
- Establish a daily/weekly physical count vs. system count with reconciliation protocol
- Log every inventory change with who, what, when, why — immutable audit trail
- For manual replenishment, implement two-person verification for transfers above a threshold quantity
- Track returns and damage in the system as negative sales or adjustments, not ignored

**Warning signs:**
- Cashiers report "system says we have it but shelf is empty" more than once per week
- Stock check discrepancies > 2% variance from physical counts
- Finance team reports inventory adjustments that account for > 5% of revenue
- Multiple inventory queries return different stock levels within minutes
- Unable to explain specific inventory changes during audit (no trail of who/why)

**Phase to address:**
Phase 2 (Inventory Core) — Must have atomic transactions and audit trails before expanding to multi-user concurrent sales. Phase 3 (Reconciliation) — Must implement daily/weekly count verification and discrepancy resolution workflows.

---

### Pitfall 2: Sales Attribution Falsification or Ambiguity

**What goes wrong:**
Commissions and incentive tracking become unreliable because sales are attributed to the wrong person, attributed multiple times, or not attributed at all. A cashier processes $10,000 in sales but claims $15,000. Finance cannot determine which staff member actually drove a sale, undermining incentive fairness and creating legal/financial audit issues.

**Why it happens:**
- Manual attribution (cashier selects themselves or another staff member) is untrustworthy — incentive misalignment encourages fraud
- Multiple people can claim a sale (cashier, manager override, final approval)
- No immutable record of who actually attributed the sale
- System allows retroactive changes to sales attribution without audit trail
- Business rules around attribution are ambiguous ("who gets credit if customer changes mind and one staff member rang it, another bagged it?")
- Manual incentive entry is decoupled from attribution, allowing mismatch between sales and incentives paid

**How to avoid:**
- Attribution must happen at the moment of sale (POS terminal), not retrospectively
- Only the cashier physically at the terminal can attribute a sale; cannot be reassigned without explicit approval
- Every attribution change (rare) must log: original attribution, new attribution, who changed it, when, and reason
- Create clear business rules: "attribution belongs to the cashier who completed the transaction"
- Implement approval workflow for incentives: Finance reviews attributed sales and reconciles with incentive entries before approval
- Audit mismatch: if total incentives paid don't align with total attributed sales within margin, flag for investigation
- For manual incentive entry, require Finance to attach supporting evidence (sales reports) to each incentive entry

**Warning signs:**
- Staff incentive disputes: "I made that sale, why isn't it attributed to me?"
- Incentive amounts don't match attributed sales (e.g., $100K in attributed sales but $200K in incentives paid)
- Inability to explain why a specific sale was attributed to a specific person
- Multiple staff claiming the same transaction
- Finance team spends > 1 hour per day reconciling incentives to sales

**Phase to address:**
Phase 2 (Sales Processing) — Must enforce immutable attribution at transaction time. Phase 3 (Incentives & Reporting) — Must implement audit trails and approval workflows for incentive entry.

---

### Pitfall 3: Concurrent Transaction Race Conditions (Double-Sells or Lost Updates)

**What goes wrong:**
Two cashiers process the last unit of an item simultaneously. System records both sales as complete, but only one unit existed. Inventory goes negative. Customer leaves unhappy, inventory is wrong, financial records are wrong.

Alternatively: Cashier A checks inventory (shows 50), cashier B checks inventory (shows 50), both ring up 25 units each — system only recorded 25 sold because updates overwrote each other. Inventory shows 25 remaining when actually 50 was sold.

**Why it happens:**
- No row-level locking on inventory updates
- Inventory system uses optimistic locking without checking for conflicts
- Multiple cashiers at different terminals can modify the same inventory simultaneously
- Network delays mean inventory reads are stale by the time the write occurs
- In-memory caches of inventory not synchronized with database

**How to avoid:**
- Use database transaction isolation (SERIALIZABLE or at minimum REPEATABLE READ) for all inventory reads/writes
- Implement pessimistic locking: SELECT FOR UPDATE NOWAIT/SKIP LOCKED when adjusting stock
- For high-concurrency scenarios, use advisory locks or application-level locks keyed by inventory item
- Test with load testing: simulate 5+ concurrent cashiers on the same inventory item
- Fail gracefully: if inventory can't be reserved, reject the sale with clear message (don't silently allow negative stock)

**Warning signs:**
- Inventory sometimes goes negative (very clear sign of race condition)
- Physical counts reveal sales that system didn't record
- "Lost update" errors appear in logs (two writes happened but one was lost)
- During busy periods (lunch rush), discrepancies spike
- System performs slow during peak sales hours (sign of lock contention)

**Phase to address:**
Phase 2 (Inventory Core) — Must prevent race conditions before public launch. Test with concurrent cashier simulations.

---

### Pitfall 4: Role-Based Access Control (RBAC) Misconfiguration — Privilege Creep

**What goes wrong:**
A cashier is supposed to ring sales only, but through misconfiguration can view/modify all staff financial data. Finance staff can somehow delete incentive records. A fired employee still has access to the system two weeks later. Role permissions gradually expand without review ("Bob needs to see today's sales, so we gave him report access... then he needed to fix a data entry error, so he got edit access...").

**Why it happens:**
- RBAC roles are created without clear, documented responsibility boundaries
- Permissions are added ad-hoc without formal change control or audit
- No regular access reviews — assume permissions are correct until proven otherwise
- Too many granular roles created (role explosion), leading to confusion and mistakes
- Insufficient tooling for managing role-to-permission mappings at scale
- No automation for revoking access when staff leave or change roles
- Retail's high employee turnover means frequent access changes (seasonal staff, part-time)

**How to avoid:**
- Define three core roles: Cashier (stock check + sales), Finance (read reports + incentive entry), Superadmin (all management)
- Document each role: exact permissions, use cases, what they can/cannot do
- Principle of least privilege: grant minimum needed, audit regularly for unnecessary permissions
- Implement automated provisioning/deprovisioning: access tied to user lifecycle (onboarding/offboarding events)
- For each permission change, log: who changed it, when, what was changed, and why
- Quarterly access audit: review all staff → roles → permissions → verify still appropriate
- Enforce immutable audit log: all RBAC changes recorded in append-only log that cannot be deleted/modified
- Prevent shared accounts: each person gets individual login, not shared "cashier account"

**Warning signs:**
- Users report "I can access stuff I shouldn't be able to"
- Multiple staff using the same login credentials
- No record of why a staff member has their current permissions
- Offboarded staff accounts still able to login
- Difficulty explaining permissions during audit (no clear mapping)
- RBAC changes made without documentation or approval

**Phase to address:**
Phase 1 (MVP Auth) — Must implement individual accounts and basic RBAC before launch. Phase 2+ — must audit and tighten permissions quarterly.

---

### Pitfall 5: Financial Data Reconciliation Gaps — Hidden Discrepancies

**What goes wrong:**
Finance closes the books: $100K in sales recorded, cash drawer has $98.5K, inventory count is off by $3K. Where did the $4.5K go? Is it theft, data entry error, returns not recorded, or system bug? Finance cannot reconcile, audit becomes painful, and small discrepancies are ignored until they compound into major problems.

**Why it happens:**
- Sales system, inventory system, and cash reconciliation are separate workflows with no automated link
- Manual data entry between systems (POS → inventory → accounting → payroll) introduces errors at each step
- No standardized reconciliation process or cadence (daily? weekly?)
- Returns, refunds, discounts are not tracked in the same system as sales
- Multiple "sources of truth": POS says $100K, accounting ledger says $99K, nobody knows which is right
- Discrepancies are explained away rather than investigated ("must be rounding")
- No clear ownership of reconciliation (Finance blames POS team, POS blames Inventory)

**How to avoid:**
- Implement three-way reconciliation daily: Sales (POS data) vs. Inventory (quantity x cost) vs. Cash (physical count)
- All transactions (sales, returns, adjustments) flow through a single system → prevents translation errors
- Cash reconciliation must happen immediately after close-out, not days later
- Automate variance detection: flag any difference > 2% or > $500 for investigation
- Root cause required: every discrepancy must be investigated and logged (not just noted as "variance")
- Reconciliation sign-off: Finance lead must sign off daily reconciliation; creates accountability
- Segregation of duties: person who processes sales shouldn't reconcile them; supervisor reconciles

**Warning signs:**
- Cash drawer shortages/overages > 1% of sales
- Inventory physical count reveals discrepancies > 2%
- Finance team unable to explain specific transactions during audit
- Multiple correction entries in ledger for "adjustments" or "rounding"
- Reconciliation takes > 2 hours to complete each day
- Same discrepancies repeat weekly/monthly

**Phase to address:**
Phase 3 (Reporting & Reconciliation) — Must implement daily reconciliation workflows and audit trails. Phase 1 integration point: ensure all sales data flows to a single ledger.

---

### Pitfall 6: Audit Trail Gaps — Non-Immutable or Incomplete Logging

**What goes wrong:**
Finance wants to audit who changed the inventory on March 15th. Logs show nothing — either the change wasn't logged, or the log was deleted/modified after the fact. During a dispute about an incentive payment, you can't prove who approved it or why. System audit for compliance fails because audit trail is incomplete or can be altered by system admins.

**Why it happens:**
- Audit logs are stored in mutable database tables (can be edited/deleted)
- Logging is incomplete: some operations logged, others aren't
- Logs are deleted after X days to "save space" without proper archival
- System admin (superuser) can directly modify audit logs
- Logs lack context: shows "inventory changed from 50 to 45" but not who, when, or why

**How to avoid:**
- Implement immutable audit trail: append-only log that cannot be deleted or modified by anyone, including admins
- Log every state-changing operation: who, what, when, why, from where (IP/terminal)
- Include affected data: before/after values, not just "inventory changed"
- Use write-once-read-many (WORM) storage or cryptographic integrity verification for logs
- Retention: keep audit logs for minimum 3-7 years (regulatory requirement varies by region)
- Archive logs to separate storage after 1 year (prevents tampering with "active" logs)
- Make logs searchable/queryable: must be able to answer "show me all changes to Item X by User Y in March"

**Warning signs:**
- Cannot answer "who deleted/modified record X and when?"
- Audit logs grow unbounded (hitting storage limits) because deletion isn't implemented
- Superadmin can modify/delete logs (indicates mutable storage)
- Log entries lack context (who/why)
- Compliance audit requires manual review of system to reconstruct audit trail
- Logs missing for time periods when you know changes happened

**Phase to address:**
Phase 1 (MVP Auth) — must implement basic audit logging for all operations. Phase 2 (Inventory/Sales) — must enforce immutability and retention policies.

---

### Pitfall 7: Manual Incentive Entry Decoupling — Paying for Non-Existent Sales

**What goes wrong:**
Superadmin manually enters: "Cashier John: $500 incentive for March". Finance later audits and finds John only attributed $300 in sales for the whole month. Was the $500 justified? For which sales? No supporting evidence. Payroll processes $500 anyway. Incentive is overpaid by $200, but nobody catches it until audit.

**Why it happens:**
- Manual incentive entry is a free-form text workflow with no validation
- No link between incentive entry and actual attributed sales
- Superadmin enters incentive from memory or spreadsheet, not from system data
- No approval step: Finance sees incentive but doesn't verify it matches sales
- Business rules for incentives are vague ("performance bonus" — what's the formula?)
- Multiple incentive sources (base commission + bonus + manual adjustment) not reconciled

**How to avoid:**
- Incentive entry must be transaction-based: incentives calculated/entered per sale or per period based on actual attributed sales
- For manual incentives (not automatically calculated), require: Superadmin proposes → Finance verifies against sales data → Superadmin approves → signed off
- Require supporting evidence: every manual incentive entry must reference specific sales or clear business justification
- Audit loop: total incentives paid must equal (sum of attributed sales × commission rate) + documented exceptions
- Monthly reconciliation: "We paid John $500 — verify these are the sales/bonuses that justified it"
- Audit trail: keep records of who entered the incentive, when, and what evidence supported it

**Warning signs:**
- Incentive amounts > 150% of attributed sales for a person (overpayment)
- Incentive < 50% of attributed sales for a person (underpayment, staff satisfaction risk)
- Manual incentive entries with no supporting documentation
- Finance team spending > 1 hour per pay period trying to understand/justify incentives
- Staff disputes about incentive amounts and no clear way to resolve

**Phase to address:**
Phase 3 (Incentives & Reporting) — must implement validation and approval workflows. Phase 2 integration: ensure sales attribution data is complete before incentives are entered.

---

### Pitfall 8: Cash/Inventory Shortage Detection Delay — Problems Hidden for Weeks

**What goes wrong:**
A cashier steals $500 from the register over two weeks, $25/day. If you reconcile only monthly, the shortage is hidden. By the time you notice, the money is gone, and you can't determine which days/cashiers to investigate. Alternatively, inventory shrinkage (theft or loss) of $100/week adds up to $5,200/year undetected.

**Why it happens:**
- Reconciliation is manual and done infrequently (monthly, not daily)
- No early-warning system: discrepancies aren't flagged until variance > 5-10%
- Small daily discrepancies under the radar (e.g., $25 out of $5,000 = 0.5%, seems normal)
- Investigation is expensive and time-consuming, so small discrepancies are ignored
- No real-time dashboard: staff don't see daily variance, only notice at month-end

**How to avoid:**
- Implement daily cash reconciliation: end-of-shift close-out, compare cash to POS record
- Alert on variance > 2% or > $100 immediately (don't wait for monthly review)
- Root cause required for every variance: document explanation (customer refund, penny pinching, etc.)
- Weekly inventory spot checks: count high-value or high-velocity items, compare to system
- Track variance trends: if the same cashier has +0.5% variance every day, that's a pattern worth investigating
- Investigate vs. ignore threshold: define — discrepancies > $500/month require investigation
- Segregation of duties: different person reconciles cash than handled it

**Warning signs:**
- No daily reconciliation process (wait until month-end to discover problems)
- Same cashier has consistent overages or shortages
- Monthly variance > 3% of sales
- No documented explanations for discrepancies
- Inventory shrinkage suspected but not quantified
- Staff think "discrepancies happen, nothing we can do"

**Phase to address:**
Phase 2 (POS & Inventory) — must implement daily close-out and basic variance detection. Phase 3 (Reporting) — must implement dashboard and trending analysis.

---

### Pitfall 9: Warehouse vs. Store Inventory Split — Partial Visibility Problem

**What goes wrong:**
Cashier checks system: "We have 20 units in stock." Customer wants to buy 5. Cashier rings it up, inventory goes to 15. Later, warehouse says "We only have 10 total across store and warehouse." Turns out 8 were in the warehouse, 12 in the store, but system recorded 20 in store + unknown in warehouse. Inventory accuracy is impossible.

**Why it happens:**
- Two separate inventory locations (store + warehouse) managed as one "SKU total" in system
- Manual transfers between warehouse and store are error-prone (staff enters wrong qty, forgets to update)
- Warehouse inventory not synced with POS system in real-time
- Cashiers see combined inventory but can't actually access warehouse stock immediately
- No single source of truth: POS tracks store, warehouse system tracks warehouse, nobody reconciles

**How to avoid:**
- Track inventory by location: store vs. warehouse as separate line items per SKU
- Cashier can check both, but can only sell from store stock (clear distinction)
- Manual transfers: initiated in system, confirmed by warehouse staff with actual count
- Daily sync: warehouse and store do physical count vs. system, reconcile discrepancies
- For single-store MVP, keep it simple: separate "store" and "warehouse" locations in the database, but treat warehouse as "in transit" or "reserved" until physically moved to store
- Don't allow selling from warehouse stock directly; must be transferred to store first

**Warning signs:**
- Cashiers report "system says we have it, but warehouse doesn't"
- Inventory reconciliation requires manual warehouse count outside the system
- Customers get told "out of stock" when warehouse has stock
- Warehouse and store inventory numbers don't add up to system total
- Manual transfer workflow is slow/error-prone (bottleneck)

**Phase to address:**
Phase 2 (Inventory Core) — must implement location-based tracking and transfer workflows. Phase 1 foundation: data model must distinguish store vs. warehouse.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Omit immutable audit logs, log to regular database | Faster to build, smaller database | Cannot audit who changed what; fails compliance; enables fraud | Never — must have from day 1 |
| Manual inventory sync between warehouse and store | Simpler initial implementation | Inventory chaos within weeks; compounding discrepancies | Phase 1 only: one person manually syncs daily, with clear process. Phase 2: must automate or formalize. |
| Single shared "cashier" account for all point-of-sale users | Faster login, less complexity | Cannot attribute sales; RBAC audit fails; theft undetectable | Never — each person must have individual account |
| Skip physical inventory counts, trust system | Fast, no labor | Discrepancies grow unchecked; discovers major problems only at year-end | Never — must do cycle counts weekly at minimum |
| Incentive entry without approval/verification | Faster payroll processing | Overpayments, disputes, audit failures | Phase 1 only if manual entry to < 5 staff. By Phase 2, must require verification |
| Allow superadmin to edit audit logs for "corrections" | Solves immediate problems with audit trail | Audit trail becomes unreliable; defeats compliance; enables cover-ups | Never — immutable logs non-negotiable |
| Daily reconciliation by same person who handled cash | Simpler responsibility | Inability to detect their own theft; audit concern | Never — segregation of duties required |

---

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Inventory system → Warehouse system | Assuming warehouse system is always available; no fallback if sync fails | Design offline mode for inventory: if warehouse sync fails, POS continues to work with cached data; retry/reconcile when connection restored |
| Sales POS → Accounting system | Exporting sales data nightly without validation | Validate data before export: check for missing/duplicate transactions, ensure totals match POS; log validation results |
| Payroll system → Incentive data | Importing incentive entries without verification | Require manual approval step before payroll import: Finance verifies incentive entries match sales data, signs off, then exports to payroll |
| Staff management → User accounts | Assuming HR system is source of truth for access provisioning | Sync but don't auto-remove: HR says "John is inactive," system marks account inactive but requires manual superadmin confirmation before access revoked |
| Reports → Finance dashboards | Pulling real-time data from live database for reports | Use separate reporting database or snapshots: don't query production data for reports; take daily snapshots, report from those |

---

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Counting all inventory per SKU on every cashier check | Slow queries during busy hours; cashier waits 3+ seconds for stock check | Implement caching: cache inventory per SKU, invalidate only on sales. Cache at database level (materialized view) or application level (Redis). | 50+ SKUs with 3+ concurrent cashiers |
| Generating daily reports by scanning entire sales log | Reports take 30+ minutes to run; blocks nightly batch | Implement incremental reporting: track "last report run," only scan new transactions since then. Aggregate hourly summaries. | 10K+ daily transactions |
| Loading all audit logs in memory for searching | Memory bloat; slow queries; crashes | Implement pagination and indexed search: audit table with indexed fields (date, user, operation type). Query with limits, not full scan. | 100K+ audit entries |
| Reconciliation done manually by one person viewing spreadsheets | Human error; takes 2+ hours daily | Implement automated reconciliation alerts: system flags discrepancies > threshold, human reviews the flagged items only. | 1,000+ daily transactions |
| One database serving POS, inventory, and reporting queries | Slow during peak sales hours; report queries block cashiers | Separate reporting database: POS/inventory on transactional DB, reports on read-only replica or snapshot DB. | 10+ concurrent cashiers |

---

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Storing POS terminal IDs or cashier IDs in clear text in logs | If logs are breached, attacker knows which terminals/staff are active | Hash or encrypt terminal/staff IDs in logs; or aggregate logs (don't store per-transaction detail) |
| Allowing incentive/commission data to be exported to unencrypted spreadsheets | Staff compensation data breached if spreadsheet shared insecurely | Require secure export: encrypted file, password-protected, audit trail of who exported when |
| Not validating sales amount before recording (e.g., $0 sales accepted) | Fraudster rings up fake sale for $0, attributes to themselves, manipulates incentives | Validate sale amount > $0; validate item price matches catalog; flag unusual sales (duplicate in < 10 seconds, extremely high volume) |
| Allowing manual inventory adjustments without approval | Staff adjusts inventory to cover up theft or loss | Require approval for adjustments > threshold: adjustment > $100 requires superadmin approval, logged with reason |
| Unencrypted data in transit for sensitive operations (sales, incentives, cash) | Man-in-the-middle attack intercepts data | Use HTTPS/TLS for all transactions; enforce certificate pinning on mobile POS terminals |
| Sharing customer/transaction data in reports without anonymization | Privacy breach if reports shared externally | Never include customer names/IDs in reports; aggregate by category or date only; encrypt sensitive fields in logs |

---

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Inventory Tracking**: Implemented automatic decrease on sale but missing: physical count verification, negative stock prevention, audit log of who/why for changes. Verify: run test where system shows 10 units, actual count is 5 — can you explain the discrepancy and who caused it?

- [ ] **Sales Processing**: Implemented cashier sale & attribution but missing: audit trail of who attributed the sale and when, no possibility to reassign, validation that attributed person actually worked that shift. Verify: pull a random sale, confirm immutable proof of attribution with timestamp.

- [ ] **Incentive Tracking**: Implemented manual incentive entry but missing: approval workflow, supporting evidence link, reconciliation to attributed sales, audit of who entered it and why. Verify: total incentives paid matches total attributed sales within 1%; if not, document exceptions.

- [ ] **RBAC**: Implemented three roles (Cashier/Finance/Superadmin) but missing: documented permission boundaries, audit log of access changes, process for revoking access on termination, verification that permissions are correct. Verify: offboard a test staff member, confirm their account is locked/disabled within 1 day.

- [ ] **Cash Reconciliation**: Implemented end-of-shift reconciliation but missing: automated variance detection, daily alert for discrepancies > threshold, investigation documentation, trend tracking. Verify: create test discrepancy (short cash by $50), system alerts Finance within 1 hour.

- [ ] **Warehouse/Store Inventory**: Implemented separate tracking but missing: transfer workflow, confirmation process, reconciliation between locations, handling of in-transit stock. Verify: move 10 units from warehouse to store, trace through system, confirm both sides updated and reconciled.

- [ ] **Audit Trails**: Implemented audit logging but missing: immutability (can superadmin edit logs?), retention policy (are old logs deleted?), searchability (can you find "all inventory changes by John on March 15"?). Verify: create audit entry, attempt to delete/edit it — system prevents this.

---

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Inventory desynchronization (system ≠ physical) | HIGH | 1) Stop sales; 2) Physical count all stock; 3) Identify which transactions caused drift; 4) Investigate root cause; 5) Adjust system to match physical; 6) Implement daily reconciliation to prevent recurrence. Time: 1-2 days depending on inventory size. |
| Sales attribution fraud detected (attributed to wrong person) | MEDIUM | 1) Audit all sales for person in question; 2) Identify fraudulent transactions; 3) Correct attribution in system; 4) Adjust incentives to match corrected attribution; 5) Investigate how fraud occurred; 6) Implement approval workflow. Time: 4-8 hours depending on fraud scope. |
| Race condition caused negative inventory | MEDIUM | 1) Identify affected inventory items; 2) Physical count them; 3) Adjust system to match; 4) Implement row-level locking; 5) Test with concurrent load; 6) Deploy fix. Time: 4-6 hours + testing. |
| RBAC misconfiguration (unauthorized access) | LOW | 1) Audit current permissions; 2) Identify over-privileged users; 3) Revoke unnecessary permissions; 4) Verify access logs; 5) Implement quarterly audit process. Time: 1-2 hours. |
| Financial reconciliation gap (can't explain discrepancy) | MEDIUM | 1) Manual trace: POS transactions → inventory changes → cash count; 2) Identify missing/duplicate records; 3) Audit for fraud/error; 4) Adjust records to match physical reality; 5) Implement daily reconciliation. Time: 4-8 hours depending on age of discrepancy. |
| Incomplete audit trail (cannot prove who did what) | HIGH | 1) Reconstruct audit from available sources (system logs, backups, staff interviews); 2) Document reconstruction process; 3) Implement immutable audit trail; 4) Retain logs properly. Time: 8-16 hours; impact: compliance risk until resolved. |
| Incentive overpayment discovered in audit | MEDIUM | 1) Identify overpaid staff; 2) Calculate amount owed back; 3) Negotiate repayment (voluntary vs. paycheck deduction); 4) Implement verification workflow; 5) Reconcile actual attributions. Time: 2-4 hours per person, plus negotiation. |
| Theft suspected (daily shortages consistent) | MEDIUM | 1) Implement surveillance/audit focus on suspect; 2) Daily reconciliation with sign-off; 3) Segregation of duties; 4) Investigation (interviews, evidence review); 5) Personnel action if confirmed. Time: 1-2 weeks depending on investigation. |

---

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Inventory sync desynchronization | Phase 2 (Inventory Core) | Run test: system shows X, physical count ≠ X; ensure automated alert and reconciliation workflow explains discrepancy |
| Sales attribution falsification | Phase 2 (Sales Processing) | Run test: try to change sales attribution after transaction; system prevents it; verify audit log immutable |
| Concurrent transaction race conditions | Phase 2 (Inventory Core) | Load test: 10 concurrent cashiers sell last 10 units; system prevents negative stock and sales > available |
| RBAC misconfiguration | Phase 1 (MVP Auth) | Verify: each role has documented permissions; try to access beyond role (e.g., Cashier accesses Finance report); system denies; audit log exists |
| Financial reconciliation gaps | Phase 3 (Reporting & Reconciliation) | Run test: generate daily reconciliation report; compare POS sales + inventory cost + cash; must equal within < 1% |
| Audit trail gaps | Phase 1 (MVP Auth) & Phase 2 (Inventory/Sales) | Verify: audit log immutable; superadmin cannot edit; daily export for archive; searchable by user/date/operation |
| Manual incentive decoupling | Phase 3 (Incentives & Reporting) | Run test: enter incentive without supporting sales; system requires approval and evidence; Finance must verify |
| Cash/inventory shortage detection delay | Phase 2 (POS & Inventory) | Verify: daily reconciliation process exists; variance > 2% alerts Finance immediately; investigation documented |
| Warehouse vs. Store inventory split | Phase 2 (Inventory Core) | Run test: track inventory by location; transfer from warehouse to store; both sides updated; reconciliation shows correct totals |

---

## Sources

- [Avoid These Common Retail Mistakes in 2026](https://goebt.com/avoid-these-common-retail-mistakes-in-2026/)
- [Common Inventory Mistakes Retailers Make (& How POS Fixes Them)](https://floridapayments.com/common-inventory-mistakes-retailers-pos-solutions/)
- [20 Common Inventory Management Challenges in 2026 (and Solutions)](https://koronapos.com/blog/inventory-management-challenges/)
- [6 Hidden Causes of Inventory Inaccuracy — And How to Fix Them](https://altavantconsulting.com/how-do-inventory-records-become-inaccurate/)
- [The Hidden Costs of Ineffective POS Systems and Bad Inventory Management](https://www.visualretailplus.com/pos/the-hidden-costs-of-ineffective-pos-systems-and-bad-inventory-management/)
- [The Manufacturer's Guide to POS Data Management in 2026](https://computermarketresearch.com/the-manufacturers-guide-to-pos-data-management-in-2026/)
- [Why Outdated POS Systems Hurt Your Business & How to Avoid Risk](https://ivend.com/blog/risks-of-an-outdated-or-an-ordinary-pos-system/)
- [Inventory Discrepancies 2026: Common Causes Explained](https://www.omniful.ai/blog/inventory-discrepancies-2026-common-causes-explained)
- [Stock Discrepancies in Warehouses: Causes, Risks & Solutions](https://www.argosoftware.com/blog/avoid-stock-discrepancies/)
- [Inventory Discrepancies: Causes, Impacts & Smart Solutions](https://www.propelapps.com/blog/how-to-recover-from-inventory-discrepancies/)
- [Salesforce Commission Tracking: 2026 Guide](https://www.qobra.co/blog/salesforce-commission-tracking)
- [Sales Commission: The Ultimate Guide to Incentivizing Performance](https://www.kennect.io/post/sales-commission)
- [Role-Based Access Control Complete Guide In 2026](https://easydesk.app/blog/role-based-access-control)
- [Top 10 Role-Based Access Control Best Practices for 2026](https://www.techprescient.com/blogs/role-based-access-control-best-practices/)
- [Role-Based Access Control (RBAC): 2026 Guide](https://concentric.ai/how-role-based-access-control-rbac-helps-data-security-governance/)
- [Cybersecurity Challenges and Solutions for the Retail Sector](https://www.upguard.com/blog/cybersecurity-challenges-and-solutions-for-the-retail-sector)
- [Why Retail Sales Audit Matters: Improving Reconciliation, Omnichannel Visibility, and Store Performance](https://www.jestais.com/why-retail-sales-audit-matters-improving-reconciliation-omnichannel-visibility-and-store-performance/)
- [Best Practices for Ensuring Financial Data Accuracy](https://www.paystand.com/blog/financial-data)
- [Data Reconciliation Guide | Ensuring Accuracy & Consistency](https://www.acceldata.io/blog/data-reconciliation)
- [Top Auditor Challenges in 2026 Inventory Audits & Stockount Fixes](https://www.stockount.com/articles/top-auditor-challenges-in-2026-inventory-audits-and-stockount-fixes)
- [How to Handle Race Conditions in PostgreSQL Functions](https://oneuptime.com/blog/post/2026-01-25-postgresql-race-conditions/view)
- [Race Condition Vulnerabilities in Financial Transaction Processing Systems](https://www.sourcery.ai/vulnerabilities/race-condition-financial-transactions)
- [A Guide to Database Transactions: From ACID to Concurrency Control](https://blog.bytebytego.com/p/a-guide-to-database-transactions)
- [How to Handle Concurrent Transactions](https://www.moderntreasury.com/journal/how-to-handle-concurrent-transactions)
- [Immutable Audit Trails: A Complete Guide](https://www.hubifi.com/blog/immutable-audit-log-basics)
- [Inventory Audit Step-by-Step Guide: Cut Audit Time by 60% [Free Checklist 2026]](https://www.stockount.com/articles/step-by-step-guide-to-fast-and-reliable-inventory-audits)
- [Audit Trail Best Practices: Secure Compliance & Control](https://whisperit.ai/blog/audit-trail-best-practices)
- [Cash Register Discrepancies: Causes, Consequences, and Prevention for Retailers](https://apprissretail.com/blog/getting-to-the-bottom-of-register-discrepancies/)
- [Payment Reconciliation: Meaning, Process and Benefits](https://www.lightspeedhq.com/blog/payment-reconciliation/)
- [Cash Reconciliation Defined & Its Importance](https://www.netsuite.com/portal/resource/articles/accounting/cash-reconciliation.shtml)
- [Mastering Cash Reconciliation: Process, Best Practices, and Automation Tips](https://www.accountingdepartment.com/blog/mastering-cash-reconciliation-process-best-practices-and-automation-tips)
- [POS Reconciliation: How It's Done in 7 Steps (+ Free Template)](https://fitsmallbusiness.com/pos-reconciliation/)

---

*Pitfalls research for: Retail inventory and POS systems with sales attribution and manual incentives*
*Researched: 2026-04-14*
