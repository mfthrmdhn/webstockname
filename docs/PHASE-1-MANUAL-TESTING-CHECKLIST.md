# Phase 1 Manual Testing Checklist

Complete manual testing of WebStockName Phase 1 (Foundation) to verify all authentication, RBAC, and audit functionality works as intended.

**Target:** All 12 scenarios pass
**Execution Date:** 2026-04-14
**Tester:** QA Team

---

## Pre-Test Setup

### Prerequisites
- [ ] Development environment running (`npm run dev`)
- [ ] PostgreSQL database seeded with test data
- [ ] Test credentials ready (see table below)
- [ ] Browser console open (F12) to check for errors
- [ ] Network tab open to monitor API calls

### Test Accounts

| Username | Password | Role | Purpose |
|----------|----------|------|---------|
| superadmin | AdminPass123 | SUPERADMIN | Admin access |
| finance_user | FinancePass123 | FINANCE | Finance dashboard (Phase 3) |
| cashier_user | CashierPass123 | CASHIER | POS interface (Phase 2) |

### Test Steps Format

Each test has:
- **Setup:** Prerequisites for this test
- **Steps:** Actions to perform
- **Expected Result:** What should happen
- **Pass/Fail:** Mark result
- **Notes:** Issues or observations

---

## Test 1: Login with Valid Credentials (SUPERADMIN)

**Setup:** App is running, no user logged in

**Steps:**
1. Navigate to `http://localhost:3000/login`
2. Enter username: `superadmin`
3. Enter password: `AdminPass123`
4. Click "Log In" button
5. Observe page redirect

**Expected Result:**
- Form submission succeeds
- Page redirects to `/dashboard`
- Dashboard redirects to `/admin` (SUPERADMIN's dashboard)
- Admin page loads with user navigation sidebar
- Browser console shows no errors

**Pass/Fail:** [ ] PASS [ ] FAIL

**Notes:**
_______________________________________________________________________________

---

## Test 2: Login with Invalid Password

**Setup:** App is running, no user logged in

**Steps:**
1. Navigate to `http://localhost:3000/login`
2. Enter username: `superadmin`
3. Enter password: `WrongPassword123`
4. Click "Log In" button
5. Observe error message

**Expected Result:**
- Form submission fails
- Error message displays: "Invalid username or password"
- User stays on `/login` page
- Generic error message (no hint that username exists or not)

**Pass/Fail:** [ ] PASS [ ] FAIL

**Notes:**
_______________________________________________________________________________

---

## Test 3: Access Protected Page Without Login

**Setup:** App is running, browser cookies/storage cleared

**Steps:**
1. Clear browser storage (F12 → Application → Clear Storage)
2. Navigate directly to `http://localhost:3000/admin`
3. Observe redirect

**Expected Result:**
- Page immediately redirects to `/login`
- Admin page is not loaded
- No error messages (graceful redirect)

**Pass/Fail:** [ ] PASS [ ] FAIL

**Notes:**
_______________________________________________________________________________

---

## Test 4: Stay Logged In After Page Refresh

**Setup:** Logged in as superadmin

**Steps:**
1. Log in as superadmin (Test 1)
2. Once at admin page, press F5 to refresh
3. Wait for page to reload
4. Verify user is still logged in

**Expected Result:**
- Page refreshes
- Access token is restored from localStorage
- No redirect to login
- Admin page loads with user still logged in
- User info visible in nav

**Pass/Fail:** [ ] PASS [ ] FAIL

**Notes:**
_______________________________________________________________________________

---

## Test 5: Create a New User via Admin UI

**Setup:** Logged in as superadmin

**Steps:**
1. Navigate to `/admin/users` (click Users in nav)
2. Click "Add User" button
3. Fill in form:
   - Username: `testuser1`
   - Password: `TestPass123`
   - Role: `FINANCE`
4. Click "Create" button
5. Verify user appears in list

**Expected Result:**
- Form submission succeeds (201 response)
- New user appears in users list
- New user has:
  - ID (auto-generated)
  - Username: `testuser1`
  - Role: `FINANCE`
  - Status: Active
  - Created timestamp

**Pass/Fail:** [ ] PASS [ ] FAIL

**Notes:**
_______________________________________________________________________________

---

## Test 6: Login as Newly Created User

**Setup:** Newly created user from Test 5

**Steps:**
1. Click logout (if still logged in as superadmin)
2. Navigate to login page
3. Enter username: `testuser1`
4. Enter password: `TestPass123`
5. Click "Log In"
6. Verify redirect

**Expected Result:**
- Login succeeds
- Redirects to `/dashboard`
- Dashboard detects role = FINANCE
- Redirects to `/finance/reports` (or appropriate FINANCE dashboard)
- Page loads (may be placeholder for Phase 3)

**Pass/Fail:** [ ] PASS [ ] FAIL

**Notes:**
_______________________________________________________________________________

---

## Test 7: Non-SUPERADMIN Cannot Access User Management

**Setup:** Logged in as CASHIER user

**Steps:**
1. Log in as `cashier_user` / `CashierPass123`
2. Redirected to `/cashier/pos` (placeholder)
3. Try to navigate directly to `/admin/users`
4. Observe result

**Expected Result:**
- Direct navigation to `/admin` returns 403 or redirects to login
- Access is denied at the API level
- Cannot create users via API (POST /api/users returns 403)

**Pass/Fail:** [ ] PASS [ ] FAIL

**Notes:**
_______________________________________________________________________________

---

## Test 8: View Audit Trail (SUPERADMIN Only)

**Setup:** Logged in as superadmin

**Steps:**
1. Navigate to `/admin/audit` (click Audit Log in nav)
2. Scroll through audit log entries
3. Look for LOGIN entry for superadmin
4. Look for USER_CREATE entry for testuser1 (from Test 5)
5. Filter by action: select "LOGIN"
6. Verify only LOGIN entries show

**Expected Result:**
- Audit log page loads with list of entries
- Each entry shows:
  - Action (LOGIN, USER_CREATE, etc.)
  - User who performed action
  - Target entity (if applicable)
  - Timestamp
- Filter works (only LOGIN entries visible after filtering)
- Finance/Cashier users cannot access this page (403)

**Pass/Fail:** [ ] PASS [ ] FAIL

**Notes:**
_______________________________________________________________________________

---

## Test 9: Deactivate a User

**Setup:** Logged in as superadmin, testuser1 exists and is active

**Steps:**
1. Navigate to `/admin/users`
2. Find testuser1 in the list
3. Click "Deactivate" button
4. Confirm action if prompted
5. Verify user status changes

**Expected Result:**
- User is marked as inactive
- testuser1 no longer appears in active user list (if filtered)
- Audit log shows USER_DEACTIVATE entry
- Attempting to log in as testuser1 shows error:
  "User account is inactive"

**Pass/Fail:** [ ] PASS [ ] FAIL

**Notes:**
_______________________________________________________________________________

---

## Test 10: Deactivated User Cannot Login

**Setup:** testuser1 is deactivated (from Test 9)

**Steps:**
1. Log out (if logged in)
2. Navigate to `/login`
3. Enter username: `testuser1`
4. Enter password: `TestPass123`
5. Click "Log In"
6. Observe error

**Expected Result:**
- Login fails with error: "User account is inactive"
- HTTP status 403
- User is not logged in
- Stays on login page

**Pass/Fail:** [ ] PASS [ ] FAIL

**Notes:**
_______________________________________________________________________________

---

## Test 11: Logout Clears Authentication

**Setup:** Logged in as superadmin

**Steps:**
1. Click logout button (in nav sidebar)
2. Observe redirect
3. Try to navigate back to `/admin`
4. Observe result

**Expected Result:**
- Click logout → POST /api/auth/logout succeeds
- Redirect to `/login` page
- localStorage is cleared (accessToken removed)
- HTTP-only cookie is cleared (refresh_token)
- Attempting to access `/admin` redirects to `/login`
- Audit log shows LOGOUT entry

**Pass/Fail:** [ ] PASS [ ] FAIL

**Notes:**
_______________________________________________________________________________

---

## Test 12: Token Refresh on Page Refresh (Session Persistence)

**Setup:** Logged in as superadmin, access token is about to expire

**Steps:**
1. Log in as superadmin
2. Set browser's system clock forward by ~14 minutes (access token expires in 15m)
3. Perform action on admin page (click a link, make an API call)
4. Wait for AuthProvider to detect expiry and refresh
5. Verify token was refreshed

**Alternative (without clock adjustment):**
1. Log in as superadmin
2. Open dev tools (F12 → Storage → localStorage)
3. Find `accessToken` entry
4. Wait ~14 minutes, then reload page
5. Verify you're still logged in

**Expected Result:**
- AuthProvider detects token nearing expiry (< 1 min remaining)
- Automatically calls POST /api/auth/refresh
- New access token is obtained and stored
- User remains logged in without interruption
- Audit log shows no unusual activity

**Pass/Fail:** [ ] PASS [ ] FAIL

**Notes:**
_______________________________________________________________________________

---

## Test 13 (Bonus): Role-Based Dashboard Redirects

**Setup:** Multiple roles available

**Steps:**

### SUPERADMIN Flow
1. Log in as superadmin
2. Go to `/dashboard`
3. Observe redirect to `/admin`

### FINANCE Flow (if FINANCE has dashboard)
1. Log in as finance_user
2. Go to `/dashboard`
3. Observe redirect to `/finance/reports`

### CASHIER Flow
1. Log in as cashier_user
2. Go to `/dashboard`
3. Observe redirect to `/cashier/pos`

**Expected Result:**
- Each role redirects to appropriate dashboard
- Role is extracted from JWT token (client-side)
- Redirects happen immediately
- No errors in console

**Pass/Fail:** [ ] PASS [ ] FAIL

**Notes:**
_______________________________________________________________________________

---

## Test 14 (Bonus): API Endpoint Authentication (via curl/Postman)

**Setup:** Development environment running

**Steps:**

### Without Token
```bash
curl -X GET http://localhost:3000/api/users
```
Expected: `401 Unauthorized`

### With Invalid Token
```bash
curl -X GET http://localhost:3000/api/users \
  -H "Authorization: Bearer invalid.token.here"
```
Expected: `401 Unauthorized`

### With Valid SUPERADMIN Token
```bash
# First, get token from login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"superadmin","password":"AdminPass123"}'

# Use token to access protected endpoint
curl -X GET http://localhost:3000/api/users \
  -H "Authorization: Bearer <TOKEN_FROM_RESPONSE>"
```
Expected: `200 OK` with list of users

### With CASHIER Token trying SUPERADMIN endpoint
```bash
# Login as cashier
curl -X POST http://localhost:3000/api/auth/login \
  -d '{"username":"cashier_user","password":"CashierPass123"}'

# Try to create user (SUPERADMIN only)
curl -X POST http://localhost:3000/api/users \
  -H "Authorization: Bearer <CASHIER_TOKEN>" \
  -d '{"username":"newuser","password":"Pass123","role":"FINANCE"}'
```
Expected: `403 Forbidden`

**Expected Result:**
- Unauthenticated requests: 401
- Invalid tokens: 401
- SUPERADMIN requests: 200 OK
- Non-SUPERADMIN requests: 403 Forbidden
- Errors do not leak sensitive info

**Pass/Fail:** [ ] PASS [ ] FAIL

**Notes:**
_______________________________________________________________________________

---

## Test Summary

| Test # | Name | Status | Notes |
|--------|------|--------|-------|
| 1 | Valid login (SUPERADMIN) | [ ] | |
| 2 | Invalid password | [ ] | |
| 3 | Protected page without login | [ ] | |
| 4 | Session persistence (page refresh) | [ ] | |
| 5 | Create new user | [ ] | |
| 6 | Login as new user | [ ] | |
| 7 | Non-SUPERADMIN access denied | [ ] | |
| 8 | Audit log viewing | [ ] | |
| 9 | Deactivate user | [ ] | |
| 10 | Deactivated user login fails | [ ] | |
| 11 | Logout clears auth | [ ] | |
| 12 | Token refresh | [ ] | |

**Total Pass:** __ / 12  
**Total Fail:** __ / 12

---

## Issues Found

### Critical Issues
(Block Phase 2 if not resolved)

- [ ] Issue: ________________  
  Steps to reproduce: ___________  
  Expected: ________________  
  Actual: ________________  
  Severity: Critical  

### High Priority Issues
(Should fix before Phase 2)

- [ ] Issue: ________________  

### Low Priority Issues
(Nice to have, can defer to Phase 2)

- [ ] Issue: ________________  

---

## Sign-Off

- **Tester Name:** _________________________________
- **Date:** _________________________________
- **Result:** [ ] All Pass [ ] Some Fail (document above)
- **Ready for Phase 2:** [ ] YES [ ] NO

**Comments:**
_______________________________________________________________________________

---

## Notes for Developers

1. **Token Expiry Simulation:** If you need to test token refresh without waiting 15 minutes, temporarily modify `expiresIn: '15m'` to `'15s'` in `lib/auth/jwt.ts` during testing.

2. **Seeding Test Data:** If audit log is empty, ensure test user login/logout actions are performed to create entries.

3. **Browser Storage:** If tests fail due to stale tokens, clear browser storage:
   - F12 → Application → Clear Site Data
   - Or use `localStorage.clear()` in console

4. **HTTPS in Production:** Token cookies are set with `secure: true` in production but `false` in development (HTTP). This is correct behavior.

5. **Concurrent Requests:** If testing with multiple browsers/tabs, ensure refresh tokens aren't duplicated or revoked unexpectedly.

---

*Manual testing checklist for Phase 1 Foundation plan*  
*Created: 2026-04-14*  
*Ready to execute.*
