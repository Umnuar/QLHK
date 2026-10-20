# Task Progress Tracker

- **Project**: QLHK-Client
- **Base Branch**: `feat/strip-all-comments`
- **Branch**: `roadmap/qlhk-client-audit-remediation`
- **Plan Reference**: `docs/plans/qlhk-client/qlhk-client-audit-remediation.md`
- **Roadmap Prompt Reference**: `docs/plans/qlhk-client/qlhk-client-audit-remediation.roadmap.md`
- **Baseline Checkpoint**: `49a8dda` (162 passing, verified across 2 baseline runs)
- **Known Baseline / Flaky Failures (Failed in Either Baseline Run)**:
  - None
- **Status Legend**: 
  - `[ ]` Pending
  - `[/]` In Progress
  - `[x]` Completed
  - `[!]` Blocked (Circuit Breaker Tripped)

## Execution Checklist

- [x] Step 1: Secure Storage Logout Wipe & Offline Token Header Leak Guard
  - Finding IDs: `BUG-006`, `BUG-002`
  - Target Files: `QLHK-Client/src/utils/secureStorage.ts`, `QLHK-Client/src/api/client.ts`, `QLHK-Client/src/utils/__tests__/secureStorage.test.ts`
  - Role Focus: Ensure sensitive storage is thoroughly purged on logout and offline tokens never escape across network boundary.
  - Graph Check: `git grep -n "secureStorage.clear" QLHK-Client/src/`
  - Diff Budget: <= 200 gross LOC
  - Verification: `cd QLHK-Client && npx vitest run src/utils/__tests__/secureStorage.test.ts`
  - Static Check: `cd QLHK-Client && npx tsc --noEmit`
- [x] Step 2: Offline Login Password Verification & Credential Integrity
  - Finding IDs: `BUG-007`
  - Target Files: `QLHK-Client/src/api/authApi.ts`, `QLHK-Client/src/api/__tests__/authApi.test.ts`
  - Role Focus: Guarantee offline authentication strictly enforces password verification via cryptographic digest.
  - Graph Check: `git grep -n "getStoredSessionUser" QLHK-Client/src/`
  - Diff Budget: <= 200 gross LOC
  - Verification: `cd QLHK-Client && npx vitest run src/api/__tests__/authApi.test.ts`
  - Static Check: `cd QLHK-Client && npx tsc --noEmit`
- [x] Step 3: Standard 11-Column Excel Household Code Collision & Normalization
  - Finding IDs: `BUG-001`
  - Target Files: `QLHK-Client/src/utils/excelParser.ts`, `QLHK-Client/src/utils/__tests__/excelParser.test.ts`
  - Role Focus: Ensure Excel parser allocates distinct, collision-free household codes regardless of row code omissions.
  - Graph Check: `git grep -n "parseStandard11ColumnsFormat" QLHK-Client/src/`
  - Diff Budget: <= 200 gross LOC
  - Verification: `cd QLHK-Client && npx vitest run src/utils/__tests__/excelParser.test.ts`
  - Static Check: `cd QLHK-Client && npx tsc --noEmit`
- [ ] Step 4: Household Head State Integrity on Member Deletion
  - Finding IDs: `BUG-004`
  - Target Files: `QLHK-Client/src/store/householdStore.ts`, `QLHK-Client/src/components/households/__tests__/HouseholdTable.test.tsx`
  - Role Focus: Defend invariant INV-02 so households never hold orphaned head names or 0 head members upon deletion.
  - Graph Check: `git grep -n "deleteMember" QLHK-Client/src/`
  - Diff Budget: <= 200 gross LOC
  - Verification: `cd QLHK-Client && npx vitest run src/components/households/__tests__/HouseholdTable.test.tsx`
  - Static Check: `cd QLHK-Client && npx tsc --noEmit`
- [ ] Step 5: Dynamic Calculation Year in Import Handlers & Analytics Metric Precedence
  - Finding IDs: `BUG-003`, `BUG-005`
  - Target Files: `QLHK-Client/src/pages/HouseholdsPage.tsx`, `QLHK-Client/src/pages/ExcelPage.tsx`, `QLHK-Client/src/components/analytics/AnalyticsDashboard.tsx`, `QLHK-Client/src/components/analytics/__tests__/AnalyticsDashboard.test.tsx`
  - Role Focus: Ensure dynamic calculation year is respected across import workflows and demographic metric keys are mapped in correct precedence.
  - Graph Check: `git grep -n "calculateAge" QLHK-Client/src/`
  - Diff Budget: <= 200 gross LOC
  - Verification: `cd QLHK-Client && npx vitest run src/components/analytics/__tests__/AnalyticsDashboard.test.tsx`
  - Static Check: `cd QLHK-Client && npx tsc --noEmit`
- [ ] Step 6: Verification & Final Gate
  - Full Test Suite: `cd QLHK-Client && npm test` (Zero new failures vs baseline)
  - Typecheck: `cd QLHK-Client && npx tsc --noEmit` (0 errors)
  - Clean Working Tree & No Orphan Patches: Verified (`test -z "$(git status --porcelain)" && test -z "$(ls -A .git/roadmap-stash/qlhk-client-audit-remediation-*.patch 2>/dev/null)"`)

## Finding Closure Mapping (When Sourced from `audit` / `optimize`)
<!-- Populate at Step 6 when steps carry Finding IDs: `BUG-001 -> <commit_hash> (Step K)` -->

## Project Gotchas & Learned Invariants
<!-- Append verified gotchas here when encountering subtle bugs -->
