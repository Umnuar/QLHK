# Task Tracker: Clean Village Code & Overhaul Chúc Thọ Calculation Year

- **Plan**: `docs/plans/clean-village-code-overhaul-chuctho-calculation-year.md`
- **Branch**: `feat/clean-village-code-overhaul-chuctho-year`
- **Rules Invariants**:
  - Zero Comments in Code (`//`, `/* */`, `#`, JSDoc/TSDoc).
  - Ponytail Ultra: Shortest working diff, minimal code, zero dead code.
  - Diff Budget: <= 200 gross LOC per step.
  - Line Endings: LF (`\n`).
  - Verification: `npx tsc --noEmit` (0 errors), `cargo check` (0 errors), Vitest tests passing.

## Steps Checklist

- [x] **Step 1**: Clean UI Mã Thôn (`ModernVillageTable.tsx`, `VillagesPage.tsx`, `AuditLogView.tsx`)
- [x] **Step 2**: Backend Village Code Safeguard (`QLHK-Backend-Rust/src/handlers/villages.rs`)
- [x] **Step 3**: Backend Dynamic Chúc Thọ Projection (`QLHK-Backend-Rust/src/handlers/policies.rs`)
- [x] **Step 4**: Backend Excel Export Dynamic Projection (`QLHK-Backend-Rust/src/handlers/excel.rs`)
- [ ] **Step 5**: Frontend Client Cache & Year Navigation (`useProfiles.ts`, `ProfileRow.tsx`, `ProfileFilterBar.tsx`, `DashboardPage.tsx`)
- [ ] **Step 6**: Unit & Regression Tests (`ProfileRow.test.tsx`, multi-year dynamic projection test)
- [ ] **Step 7**: Final Quality Gate (Full test suite 223+ tests, tsc, cargo check)

## Gotchas & Notes
- PostgreSQL schema `qlhk.villages.code` column must NOT be dropped (retained for DB foreign key `household_code` `HK-...`).
- Do NOT use hardcoded SQL `WHERE p.calculation_year = $1` or destructive `UPDATE` on policy calculation records.
- All ages and milestone flags for year Y must be projected on-the-fly from citizen `dob` relative to `31/12/Y`.
