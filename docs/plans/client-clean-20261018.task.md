# Task Progress Tracker: client-clean-20261018

- **Project**: QLHK-Client
- **Base Branch**: `feat/qlhk-merge-qlcs`
- **Branch**: `clean/client-clean-20261018`
- **Plan Reference**: `docs/plans/client-clean-20261018.clean.md`
- **Baseline Checkpoint**: `ea3bad5` (162 passing, verified across 2 baseline runs)
- **Known Baseline / Flaky Failures**:
  - None
- **API Surface Baseline**: 7 client route pages, 5 context providers, 0 public npm library exports
- **Ignored Files Baseline Count**: 23 items verified via roadmap-ignored-baseline.txt
- **Status Legend**: `[ ]` Pending, `[/]` In Progress, `[x]` Completed, `[~]` Deferred/Skipped, `[-]` Not Applicable, `[!]` Blocked

## Execution Checklist

- [ ] Step 1: Remove Dead Latency State and File-Scope Constants in AppContext [CLN-001]
  - Finding IDs: `CLN-001`
  - Class / Confidence: `CL-01` / `PROVEN_DEAD`
  - Target Files: `QLHK-Client/src/AppContext.tsx`
  - Role Focus: `frontend-developer`
  - Graph Check: `graft callers "emaLatency"`
  - Scoped Test Command: `cd QLHK-Client && npm test -- tests/e2e/workflow.test.ts`
  - Static Check: `cd QLHK-Client && npx tsc --noEmit`
- [ ] Step 2: Remove Unused State Setter setLoading in Household Store [CLN-002]
  - Finding IDs: `CLN-002`
  - Class / Confidence: `CL-01` / `PROVEN_DEAD`
  - Target Files: `QLHK-Client/src/store/householdStore.ts`
  - Role Focus: `frontend-developer`
  - Graph Check: `graft callers "setLoading"`
  - Scoped Test Command: `cd QLHK-Client && npm test -- src/api/__tests__/householdApi.test.ts`
  - Static Check: `cd QLHK-Client && npx tsc --noEmit`
- [ ] Step 3: Remove Unused Icons and State in AnalyticsDashboard [CLN-003]
  - Finding IDs: `CLN-003`
  - Class / Confidence: `CL-01` / `PROVEN_DEAD`
  - Target Files: `QLHK-Client/src/components/analytics/AnalyticsDashboard.tsx`
  - Role Focus: `frontend-developer`
  - Graph Check: `graft callers "AnalyticsDashboard"`
  - Scoped Test Command: `cd QLHK-Client && npm test -- src/components/analytics/__tests__/AnalyticsDashboard.test.tsx`
  - Static Check: `cd QLHK-Client && npx tsc --noEmit`
- [ ] Step 4: Remove Unused Icons, Hook and State Setter in AuditLogView [CLN-004]
  - Finding IDs: `CLN-004`
  - Class / Confidence: `CL-01` / `PROVEN_DEAD`
  - Target Files: `QLHK-Client/src/components/audit/AuditLogView.tsx`
  - Role Focus: `frontend-developer`
  - Graph Check: `graft callers "AuditLogView"`
  - Scoped Test Command: `cd QLHK-Client && npm test -- tests/e2e/regressionFlows.test.ts`
  - Static Check: `cd QLHK-Client && npx tsc --noEmit`
- [ ] Step 5: Remove Unused Imports and Dead Local in Common and Layout Components [CLN-005]
  - Finding IDs: `CLN-005`
  - Class / Confidence: `CL-01` / `PROVEN_DEAD`
  - Target Files: `QLHK-Client/src/components/common/CustomSelect.tsx`, `QLHK-Client/src/components/common/statStyles.tsx`, `QLHK-Client/src/components/Layout/Header.tsx`, `QLHK-Client/src/components/settings/ProfileCard.tsx`
  - Role Focus: `frontend-developer`
  - Graph Check: `graft callers "CustomSelect"`
  - Scoped Test Command: `cd QLHK-Client && npm test -- src/components/common/__tests__/CustomSelect.test.tsx`
  - Static Check: `cd QLHK-Client && npx tsc --noEmit`
- [ ] Step 6: Remove Unused Imports and Dead Local Variable in Page Components [CLN-006]
  - Finding IDs: `CLN-006`
  - Class / Confidence: `CL-01` / `PROVEN_DEAD`
  - Target Files: `QLHK-Client/src/pages/ExcelPage.tsx`, `QLHK-Client/src/pages/HouseholdsPage.tsx`, `QLHK-Client/src/pages/SettingsPage.tsx`, `QLHK-Client/src/pages/VillagesPage.tsx`
  - Role Focus: `frontend-developer`
  - Graph Check: `graft callers "SettingsPage"`
  - Scoped Test Command: `cd QLHK-Client && npm test -- tests/e2e/regressionFlows.test.ts`
  - Static Check: `cd QLHK-Client && npx tsc --noEmit`
- [ ] Step 7: Remove Redundant React and FireEvent Imports in Test Suites [CLN-007]
  - Finding IDs: `CLN-007`
  - Class / Confidence: `CL-01` / `PROVEN_DEAD`
  - Target Files: `QLHK-Client/src/components/analytics/__tests__/AnalyticsDashboard.test.tsx`, `QLHK-Client/src/components/common/__tests__/CustomSelect.test.tsx`, `QLHK-Client/src/components/excel/__tests__/ExportSettingsModal.test.tsx`, `QLHK-Client/src/components/excel/__tests__/ImportPreviewModal.test.tsx`, `QLHK-Client/src/components/households/__tests__/AgeFilterPopover.test.tsx`, `QLHK-Client/src/components/households/__tests__/CitizenModal.test.tsx`, `QLHK-Client/src/components/households/__tests__/HouseholdTable.test.tsx`
  - Role Focus: `frontend-developer`
  - Graph Check: `graft callers "describe"`
  - Scoped Test Command: `cd QLHK-Client && npm test -- src/components/analytics/__tests__/AnalyticsDashboard.test.tsx src/components/common/__tests__/CustomSelect.test.tsx`
  - Static Check: `cd QLHK-Client && npx tsc --noEmit`
- [ ] Step 8: Full Suite Verification, Equivalence & Zero-Regression Gate
  - Full Test Suite: `cd QLHK-Client && npm test` (162 passing, zero new failures vs baseline)
  - Typecheck: `cd QLHK-Client && npx tsc --noEmit` (0 errors)
  - Clean Working Tree & Ignored Files: Verified

## Finding Closure Mapping
<!-- Populate at Step 8 when steps complete: `CLN-001 -> <commit_hash> (Step 1)`, etc. -->

## Project Gotchas & Learned Invariants
<!-- Append verified gotchas here when encountering subtle bugs -->
