# Crime Matrix Hub 2.0 Query Flow

This page visualizes how API requests move through route handlers, SQL queries, tables, and response payloads.

## 1) Full Backend Data Flow

```mermaid
flowchart TD
  A[Client Request] --> B[Express Route in server/index.js]
  B --> C[Validation and Guards]
  C --> D[query.sql with parameters]
  D --> E[MySQL Pool in server/db.js]
  E --> F[(Users)]
  E --> G[(CrimeReports)]
  F --> E
  G --> E
  E --> H[Row Mapping normalizeUser/mapCrimeRow]
  H --> I[JSON Response]
```

## 2) Auth and User Flow

```mermaid
flowchart LR
  U1[POST /api/users/register] --> U2{Checks}
  U2 --> U3[Admin exists?]
  U2 --> U4[Username unique?]
  U2 --> U5[Email unique?]
  U3 --> U6[INSERT Users]
  U4 --> U6
  U5 --> U6
  U6 --> U7[201 Created user payload]

  U8[GET /api/users/:username] --> U9[SELECT Users by username]
  U9 --> U10[normalizeUser]
  U10 --> U11[200 Profile JSON]

  U12[PUT /api/users/:username] --> U13[SELECT user]
  U13 --> U14[SELECT email uniqueness if changed]
  U14 --> U15[UPDATE Users profile fields]
  U15 --> U16[200 Updated profile JSON]
```

## 3) Crime Report Flow

```mermaid
flowchart TD
  C1[POST /api/crime-reports] --> C2[SELECT reporter by username]
  C2 --> C3[INSERT CrimeReports status Pending]
  C3 --> C4[SELECT created report]
  C4 --> C5[201 Crime report created]

  C6[PATCH /api/crime-reports/:id/verify] --> C7[SELECT officer by username and role Officer]
  C7 --> C8[SELECT report id and region]
  C8 --> C9{Region match?}
  C9 -->|Yes| C10[UPDATE CrimeReports status Verified and verifiedById]
  C9 -->|No| C11[403 Region mismatch]
  C10 --> C12[SELECT updated report]
  C12 --> C13[200 Verified]

  C14[PATCH /api/crime-reports/:id/close] --> C15[SELECT officer]
  C15 --> C16[SELECT report]
  C16 --> C17{Already closed?}
  C17 -->|No| C18[UPDATE CrimeReports status Closed and verifiedById]
  C17 -->|Yes| C19[400 Already closed]
  C18 --> C20[SELECT updated report]
  C20 --> C21[200 Closed]
```

## 4) Feed, Pending, and History Reads

```mermaid
flowchart LR
  R1[GET /api/crime-reports] --> R2[SELECT CrimeReports LEFT JOIN Users aliases]
  R2 --> R3[Filter status in Verified or Closed]
  R3 --> R4[ORDER BY createdAt DESC]
  R4 --> R5[mapCrimeRow array]
  R5 --> R6[200 Feed list]

  R7[GET /api/crime-reports/pending] --> R8[SELECT CrimeReports LEFT JOIN Users aliases]
  R8 --> R9[Filter status Pending]
  R9 --> R10[ORDER BY createdAt DESC]
  R10 --> R11[mapCrimeRow array]
  R11 --> R12[200 Pending list]

  R13[GET /api/users/:username/history] --> R14[SELECT user by username]
  R14 --> R15[SELECT CrimeReports LEFT JOIN Users aliases]
  R15 --> R16[WHERE reportedById = userId OR verifiedById = userId]
  R16 --> R17[ORDER BY createdAt DESC]
  R17 --> R18[200 History payload]
```

## 5) Admin Management Flow

```mermaid
flowchart TD
  A1[GET /api/admin/officers] --> A2[requireAdmin check]
  A2 --> A3[SELECT Users WHERE role Officer]
  A3 --> A4[200 Officers list]

  A5[GET /api/admin/users] --> A6[requireAdmin check]
  A6 --> A7[SELECT Users WHERE isAdmin = 0]
  A7 --> A8[200 Users list]

  A9[POST /api/admin/appoint-officer] --> A10[requireAdmin]
  A10 --> A11[SELECT report by id]
  A11 --> A12[SELECT officer by id and role Officer]
  A12 --> A13{Region match?}
  A13 -->|Yes| A14[UPDATE CrimeReports officerInCharge]
  A13 -->|No| A15[400 Region mismatch]
  A14 --> A16[SELECT updated report]
  A16 --> A17[200 Assignment success]

  A18[DELETE /api/admin/users/:userId] --> A19[requireAdmin]
  A19 --> A20[SELECT target user]
  A20 --> A21{isAdmin true?}
  A21 -->|No| A22[DELETE Users by id]
  A21 -->|Yes| A23[400 Cannot delete admin]
  A22 --> A24[200 User removed]

  A25[GET /api/admin/info] --> A26[SELECT admin by username and isAdmin]
  A26 --> A27[200 Admin profile]
```

## 6) Table Touch Matrix

| Route Group | Users Table | CrimeReports Table |
|---|---|---|
| Auth and profile | Read and write | No |
| Crime submit | Read reporter | Insert and read |
| Crime verify and close | Read officer | Read and update |
| Feed and pending | Join-read | Join-read |
| User history | Join-read | Join-read |
| Admin manage officers and users | Read and delete | Update assignment |

## 7) Related Files

- [server/index.js](../index.js)
- [server/db.js](../db.js)
- [server/sql/schema.sql](schema.sql)
- [server/sql/QUERY_MAP.md](QUERY_MAP.md)

## 8) Export Mermaid To PNG

Use Mermaid CLI to render any diagram in this file into PNG for reports/slides.

### One-time install (from project root)

```powershell
npm install --save-dev @mermaid-js/mermaid-cli
```

### Quick export commands (PowerShell)

```powershell
# From project root
Set-Location "e:\Crime-Matrix-Hub-2.0\server\sql"

# Create output folder
New-Item -ItemType Directory -Force -Path ".\diagrams" | Out-Null

# Save each mermaid block into .mmd files, then render:
# Example for one diagram file named flow_auth.mmd
npx mmdc -i .\flow_auth.mmd -o .\diagrams\flow_auth.png -b transparent -s 2
```

### Recommended batch script pattern

Create a PowerShell script named `export-diagrams.ps1` in `server/sql` with:

```powershell
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

New-Item -ItemType Directory -Force -Path ".\diagrams" | Out-Null

$files = Get-ChildItem -Path "." -Filter "*.mmd"
foreach ($f in $files) {
  $out = Join-Path ".\diagrams" ($f.BaseName + ".png")
  npx mmdc -i $f.FullName -o $out -b transparent -s 2
}

Write-Host "Export complete. PNG files are in server/sql/diagrams"
```

Run it:

```powershell
Set-Location "e:\Crime-Matrix-Hub-2.0\server\sql"
powershell -ExecutionPolicy Bypass -File .\export-diagrams.ps1
```
