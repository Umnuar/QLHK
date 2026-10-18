# Task Progress Tracker

- **Project**: QLHK-Client
- **Base Branch**: `plan/remediate-frontend-audit-findings`
- **Branch**: `roadmap/remediate-frontend-audit-findings`
- **Plan Reference**: `docs/plans/remediate-client-audit-findings.md`
- **Roadmap Prompt Reference**: `docs/plans/remediate-client-audit-findings.roadmap.md`
- **Baseline Checkpoint**: `7f7e444` (159 passing, verified across 2 baseline runs)
- **Known Baseline / Flaky Failures (Failed in Either Baseline Run)**:
  - None
- **Status Legend**: 
  - `[ ]` Pending
  - `[/]` In Progress
  - `[x]` Completed
  - `[!]` Blocked (Circuit Breaker Tripped)

## Execution Checklist

- [ ] Step 1: Fallback to Vietnamese Demographic Aliases in normalizeHousehold and CitizenModal
  - Finding IDs: `BUG-001`
  - Target Files: `QLHK-Client/src/api/householdApi.ts`, `QLHK-Client/src/components/households/CitizenModal.tsx`, `QLHK-Client/src/api/__tests__/householdApi.test.ts`
  - Role Focus: Demographic preservation, payload normalization, and Vietnamese key alias fallback
  - Graph Check: `graft callers normalizeHousehold || grep -rn "normalizeHousehold" src/`
  - Diff Budget: <= 200 gross LOC
  - Verification: `cd QLHK-Client && npx vitest run src/api/__tests__/householdApi.test.ts`
  - Static Check: `cd QLHK-Client && npx tsc --noEmit`
- [ ] Step 2: Replace Hardcoded 2026 with Dynamic Calculation Year in householdStore
  - Finding IDs: `BUG-002`
  - Target Files: `QLHK-Client/src/store/householdStore.ts`, `QLHK-Client/src/utils/__tests__/utilities.test.ts`
  - Role Focus: Dynamic temporal calculation, age computation, and state persistence
  - Graph Check: `graft callers useHouseholdStore || grep -rn "useHouseholdStore" src/`
  - Diff Budget: <= 200 gross LOC
  - Verification: `cd QLHK-Client && npx vitest run src/utils/__tests__/utilities.test.ts`
  - Static Check: `cd QLHK-Client && npx tsc --noEmit`
- [ ] Step 3: Add backdrop-blur-sm to Fullscreen Modal Overlays
  - Finding IDs: `BUG-003`
  - Target Files: `QLHK-Client/src/components/common/Modal.tsx`, `QLHK-Client/src/components/households/CitizenModal.tsx`, `QLHK-Client/src/components/households/HouseholdDrawer.tsx`, `QLHK-Client/src/components/excel/ExportSettingsModal.tsx`, `QLHK-Client/src/components/excel/ImportPreviewModal.tsx`, `QLHK-Client/src/components/households/ConflictResolutionModal.tsx`, `QLHK-Client/src/hooks/useModal.tsx`
  - Role Focus: UI design invariant compliance, modal backdrop glassmorphism, and visual polish
  - Graph Check: `graft callers Modal || grep -rn "bg-slate-950/45" src/`
  - Diff Budget: <= 200 gross LOC
  - Verification: `cd QLHK-Client && npx vitest run src/components/households/__tests__/CitizenModal.test.tsx`
  - Static Check: `cd QLHK-Client && npx tsc --noEmit`
- [ ] Step 4: Robustify DOB Parsing Regex in AnalyticsDashboard
  - Finding IDs: `BUG-004`
  - Target Files: `QLHK-Client/src/components/analytics/AnalyticsDashboard.tsx`, `QLHK-Client/src/components/analytics/__tests__/AnalyticsDashboard.test.tsx`
  - Role Focus: Demographic analytics aggregation, ISO/Vietnamese date normalization, and pyramid cohort accuracy
  - Graph Check: `graft callers AnalyticsDashboard || grep -rn "AnalyticsDashboard" src/`
  - Diff Budget: <= 200 gross LOC
  - Verification: `cd QLHK-Client && npx vitest run src/components/analytics/__tests__/AnalyticsDashboard.test.tsx`
  - Static Check: `cd QLHK-Client && npx tsc --noEmit`
- [ ] Step 5: Verification & Final Gate
  - Full Test Suite: `cd QLHK-Client && npm test -- --run` (Zero new failures vs baseline)
  - Typecheck: `cd QLHK-Client && npx tsc --noEmit` (0 errors)
  - Clean Working Tree & No Orphan Patches: Verified (`test -z "$(git status --porcelain)" && test -z "$(ls -A .git/roadmap-stash 2>/dev/null)"`)

## Finding Closure Mapping (When Sourced from `audit` / `optimize`)
<!-- Populate at Step 5 when steps carry Finding IDs: `BUG-001 -> <commit_hash> (Step 1)` -->

## Project Gotchas & Learned Invariants
<!-- Append verified gotchas here when encountering subtle bugs -->
