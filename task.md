# Task Progress Tracker

- **Project**: QLHK-Client
- **Base Branch**: `plan/remediate-frontend-audit-findings`
- **Branch**: `roadmap/remediate-frontend-audit-findings`
- **Plan Reference**: `docs/plans/remediate-frontend-audit-findings.md`
- **Roadmap Prompt Reference**: `docs/plans/remediate-frontend-audit-findings.roadmap.md`
- **Baseline Checkpoint**: `04d8e12` (159 passing, verified across 2 baseline runs)
- **Known Baseline / Flaky Failures (Failed in Either Baseline Run)**:
  - None
- **Status Legend**: 
  - `[ ]` Pending
  - `[/]` In Progress
  - `[x]` Completed
  - `[!]` Blocked (Circuit Breaker Tripped)

## Execution Checklist

- [x] Step 1: Preserve 5 Citizen Fields with Vietnamese Alias Fallbacks
  - Finding IDs: `BUG-001`
  - Target Files: `QLHK-Client/src/api/householdApi.ts`, `QLHK-Client/src/components/households/CitizenModal.tsx`, `QLHK-Client/src/api/__tests__/householdApi.test.ts`, `QLHK-Client/src/components/households/__tests__/CitizenModal.test.tsx`
  - Role Focus: Data mapping normalization, form state initialization, and zero demographic data loss invariants
  - Graph Check: `graft callers normalizeHousehold || grep -rn "normalizeHousehold" QLHK-Client/src/`
  - Diff Budget: <= 200 gross LOC
  - Verification: `cd QLHK-Client && npx vitest run src/api/__tests__/householdApi.test.ts src/components/households/__tests__/CitizenModal.test.tsx`
  - Static Check: `cd QLHK-Client && npx tsc --noEmit`
- [x] Step 2: Dynamic Calculation Year in Store and Robust ISO Date Parsing in Analytics
  - Finding IDs: `BUG-002`, `BUG-004`
  - Target Files: `QLHK-Client/src/store/householdStore.ts`, `QLHK-Client/src/components/analytics/AnalyticsDashboard.tsx`, `QLHK-Client/src/components/analytics/__tests__/AnalyticsDashboard.test.tsx`
  - Role Focus: Dynamic calendar year calculations and ISO date parsing robustness
  - Graph Check: `graft callers calculateAge || grep -rn "calculateAge" QLHK-Client/src/`
  - Diff Budget: <= 200 gross LOC
  - Verification: `cd QLHK-Client && npx vitest run src/components/analytics/__tests__/AnalyticsDashboard.test.tsx`
  - Static Check: `cd QLHK-Client && npx tsc --noEmit`
- [ ] Step 3: Add Backdrop Blur to Core and Household Modal Overlays
  - Finding IDs: `BUG-003`
  - Target Files: `QLHK-Client/src/components/common/Modal.tsx`, `QLHK-Client/src/components/households/CitizenModal.tsx`, `QLHK-Client/src/components/households/HouseholdDrawer.tsx`, `QLHK-Client/src/components/households/ConflictResolutionModal.tsx`
  - Role Focus: Modal overlay separation and visual accessibility standards
  - Graph Check: `graft ask "createPortal" --source`
  - Diff Budget: <= 200 gross LOC
  - Verification: `cd QLHK-Client && npx vitest run src/components/households/__tests__/CitizenModal.test.tsx src/components/households/__tests__/HouseholdTable.test.tsx`
  - Static Check: `cd QLHK-Client && npx tsc --noEmit`
- [ ] Step 4: Add Backdrop Blur to Excel and Auxiliary Modal Overlays
  - Finding IDs: `BUG-003`
  - Target Files: `QLHK-Client/src/components/excel/ExportSettingsModal.tsx`, `QLHK-Client/src/components/excel/ImportPreviewModal.tsx`, `QLHK-Client/src/components/common/AppUpdateModal.tsx`, `QLHK-Client/src/components/network/ServerStatusModal.tsx`
  - Role Focus: Auxiliary and import/export modal overlay consistency
  - Graph Check: None (isolated styling changes)
  - Diff Budget: <= 200 gross LOC
  - Verification: `cd QLHK-Client && npx vitest run src/components/excel/__tests__/ExportSettingsModal.test.tsx src/components/excel/__tests__/ImportPreviewModal.test.tsx`
  - Static Check: `cd QLHK-Client && npx tsc --noEmit`
- [ ] Step 5: Verification & Final Gate
  - Full Test Suite: `cd QLHK-Client && npm test` (Zero new failures vs baseline)
  - Typecheck: `cd QLHK-Client && npx tsc --noEmit` (0 errors)
  - Clean Working Tree & No Orphan Patches: Verified (`test -z "$(git status --porcelain)" && test -z "$(ls -A .git/roadmap-stash 2>/dev/null)"`)

## Finding Closure Mapping (When Sourced from `audit` / `optimize`)
<!-- Populate at Step 5 when steps carry Finding IDs: `BUG-001 -> <commit_hash> (Step K)` -->

## Project Gotchas & Learned Invariants
<!-- Append verified gotchas here when encountering subtle bugs -->
