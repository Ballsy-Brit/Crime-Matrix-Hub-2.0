# Crime Matrix Hub 2.0 SQL Map

This document maps each backend API route to the SQL operations it performs.

## 1) Schema And Bootstrap SQL

### Source files
- Runtime bootstrap: `server/db.js`
- Static schema script: `server/sql/schema.sql`

### Objects created
- Database: `crimematrixhub2db`
- Tables: `Users`, `CrimeReports`
- Foreign keys:
  - `CrimeReports.reportedById -> Users.id` (`ON DELETE CASCADE`)
  - `CrimeReports.verifiedById -> Users.id` (`ON DELETE SET NULL`)
  - `CrimeReports.officerInCharge -> Users.id` (`ON DELETE SET NULL`)
- Indexes:
  - `idx_users_role` on `Users(role)`
  - `idx_users_is_admin` on `Users(isAdmin)`
  - `idx_crime_status` on `CrimeReports(status)`
  - `idx_crime_region` on `CrimeReports(region)`

## 2) Endpoint-To-SQL Mapping

| Endpoint | Method | SQL Type | Main Tables | Conditions / Notes | Index Benefit |
|---|---|---|---|---|---|
| `/api/users/:username` | GET | `SELECT` | `Users` | By `username`, single row | Uses unique constraint on `username` |
| `/api/users/:username/history` | GET | `SELECT` + `LEFT JOIN` | `CrimeReports`, `Users`(x3 aliases) | `reportedById = ? OR verifiedById = ?`, ordered by `createdAt DESC` | No direct index on `reportedById` / `verifiedById` yet |
| `/api/users/:username` | PUT | `SELECT`, `SELECT`, `UPDATE` | `Users` | Load user by username, check email uniqueness, update profile fields | Unique on `email` and `username` helps lookups |
| `/api/users/register` | POST | `SELECT`, `SELECT`, `SELECT`, `INSERT` | `Users` | Check admin count, username/email uniqueness, then insert new user | `idx_users_is_admin` + unique `username`/`email` |
| `/api/crime-reports` | GET | `SELECT` + `LEFT JOIN` | `CrimeReports`, `Users`(x3 aliases) | `status IN ('Verified','Closed')`, ordered by `createdAt DESC` | `idx_crime_status` on status filter |
| `/api/crime-reports/:id/close` | PATCH | `SELECT`, `SELECT`, `UPDATE`, `SELECT` | `Users`, `CrimeReports` | Validate officer by username+role, close report, set `verifiedById` | PK/unique lookups; role index not used with username equality |
| `/api/crime-reports` | POST | `SELECT`, `INSERT`, `SELECT` | `Users`, `CrimeReports` | Validate reporting user, create pending report | Username unique + PK fetch |
| `/api/crime-reports/:id/verify` | PATCH | `SELECT`, `SELECT`, `UPDATE`, `SELECT` | `Users`, `CrimeReports` | Validate officer, enforce same-region policy, mark report verified | PK/unique lookups |
| `/api/crime-reports/pending` | GET | `SELECT` + `LEFT JOIN` | `CrimeReports`, `Users`(x3 aliases) | `status = 'Pending'`, ordered by `createdAt DESC` | `idx_crime_status` on status filter |
| `/api/admin/officers` | GET | `SELECT` + `SELECT` | `Users` | Check admin access; fetch officers by role | `idx_users_role` on role filter |
| `/api/admin/users` | GET | `SELECT` + `SELECT` | `Users` | Check admin access; fetch non-admin users | `idx_users_is_admin` on filter |
| `/api/admin/appoint-officer` | POST | `SELECT`, `SELECT`, `SELECT`, `UPDATE`, `SELECT` | `Users`, `CrimeReports` | Validate admin, report, officer and region match, then assign officer | PK/unique lookups |
| `/api/admin/users/:userId` | DELETE | `SELECT`, `SELECT`, `DELETE` | `Users` | Check admin access, prevent deleting admin accounts, delete user | PK lookup |
| `/api/admin/info` | GET | `SELECT` | `Users` | By username + `isAdmin=1` | Username unique + `idx_users_is_admin` |

## 3) Reused Helper Queries

These run as shared helpers inside `server/index.js`:

- `getUserByUsername(username)`
  - `SELECT * FROM Users WHERE username = ? LIMIT 1`
- `requireAdmin(adminUsername)`
  - `SELECT id, username, isAdmin FROM Users WHERE username = ? AND isAdmin = 1 LIMIT 1`

## 4) Security / Query Safety

- All runtime SQL in `server/index.js` goes through parameterized placeholders (`?`) via `pool.execute(...)` in `server/db.js`.
- This prevents direct value interpolation and mitigates SQL injection for user-supplied values.

## 5) Optional Performance Additions (If Data Grows)

If your dataset gets larger, these indexes can improve high-traffic reads:

- `CrimeReports(reportedById)`
- `CrimeReports(verifiedById)`
- `CrimeReports(createdAt)`
- Composite: `CrimeReports(status, createdAt)`
- Composite: `Users(username, isAdmin)` (usually unnecessary because username is already unique)
