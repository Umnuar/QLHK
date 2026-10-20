# Task Progress Tracker

- **Project**: QLHK-Client
- **Base Branch**: `feat/strip-all-comments`
- **Branch**: `roadmap/qlhk-client-optimization`
- **Plan Reference**: `docs/plans/qlhk-client/qlhk-client-optimization.md`
- **Roadmap Prompt Reference**: `docs/plans/qlhk-client/qlhk-client-optimization.roadmap.md`
- **Baseline Checkpoint**: `d93c1de` (169 passing, verified across 2 baseline runs)
- **Known Baseline / Flaky Failures (Failed in Either Baseline Run)**:
  - None
- **Status Legend**: 
  - `[ ]` Pending
  - `[/]` In Progress
  - `[x]` Completed
  - `[!]` Blocked (Circuit Breaker Tripped)

## Execution Checklist

- [x] Step 1: HouseholdStore Single-Pass Statistical Aggregation
  - Finding IDs: `OPT-004`
  - Target Files: `QLHK-Client/src/store/householdStore.ts`
  - Assigned Role: `.agents/performance-engineer.md`
  - Role Focus: Unify multi-pass statistical loops into a single memoized accumulator while maintaining exact numeric invariant equivalence. Enforce zero comments in code.
  - Graph Check: `git grep -n "kpiStats\|ethnicStats\|villageStats" QLHK-Client/src/`
  - Diff Budget: <= 200 gross LOC
  - Verification: `cd QLHK-Client && npx vitest run src/api/__tests__/householdApi.test.ts src/db/__tests__/indexedDB.test.ts`
  - Static Check: `cd QLHK-Client && npx tsc --noEmit`
- [x] Step 2: Household List Search & Age Filter Hot-Path Acceleration
  - Finding IDs: `OPT-002`
  - Target Files: `QLHK-Client/src/pages/HouseholdsPage.tsx`
  - Assigned Role: `.agents/react-performance-optimization.md`
  - Role Focus: Eliminate redundant Unicode normalizations and string date parsing inside high-frequency filter loops. Enforce zero comments in code.
  - Graph Check: `git grep -n "head_name_unaccented\|calculateAge" QLHK-Client/src/pages/HouseholdsPage.tsx`
  - Diff Budget: <= 200 gross LOC
  - Verification: `cd QLHK-Client && npx vitest run src/components/households/__tests__/HouseholdTable.test.tsx src/utils/__tests__/utilities.test.ts`
  - Static Check: `cd QLHK-Client && npx tsc --noEmit`
- [x] Step 3: Analytics Dashboard Village Breakdown Decoupling
  - Finding IDs: `OPT-003`
  - Target Files: `QLHK-Client/src/components/analytics/AnalyticsDashboard.tsx`
  - Assigned Role: `.agents/react-performance-optimization.md`
  - Role Focus: Decouple commune-wide breakdown calculation from village filter state to achieve O(1) filter response. Enforce zero comments in code.
  - Graph Check: `git grep -n "villageStatsMap\|villageBreakdown" QLHK-Client/src/components/analytics/`
  - Diff Budget: <= 200 gross LOC
  - Verification: `cd QLHK-Client && npx vitest run src/components/analytics/__tests__/AnalyticsDashboard.test.tsx`
  - Static Check: `cd QLHK-Client && npx tsc --noEmit`
- [x] Step 4: Client Bundle Code-Splitting & Dynamic XLSX Loading
  - Finding IDs: `OPT-001`
  - Target Files: `QLHK-Client/src/utils/fileExport.ts`, `QLHK-Client/src/pages/HouseholdsPage.tsx`, `QLHK-Client/src/components/analytics/AnalyticsDashboard.tsx`, `QLHK-Client/src/components/excel/ImportPreviewModal.tsx`
  - Assigned Role: `.agents/frontend-developer.md`
  - Role Focus: Eliminate heavy XLSX library chunk from initial page preload through dynamic asynchronous imports. Enforce zero comments in code.
  - Graph Check: `git grep -n "import.*from [\"']xlsx[\"']" QLHK-Client/src/`
  - Diff Budget: <= 200 gross LOC
  - Verification: `cd QLHK-Client && npm run build && npx vitest run tests/e2e/workflow.test.ts src/components/excel/__tests__/ExportSettingsModal.test.tsx src/components/excel/__tests__/ImportPreviewModal.test.tsx`
  - Static Check: `cd QLHK-Client && npx tsc --noEmit`
- [x] Step 5: Verification & Final Gate
  - Full Test Suite: `cd QLHK-Client && npm test` (Zero new failures vs baseline)
  - Typecheck: `cd QLHK-Client && npx tsc --noEmit` (0 errors)
  - Production Build: `cd QLHK-Client && npm run build` (vendor-excel excluded from initial modulepreload)
  - Zero Comments Audit: `git diff feat/strip-all-comments...HEAD | grep -E '^\+[ ]*(\/\/|\/\*|\*\/|#)'` (0 matches)
  - Clean Working Tree & No Orphan Patches: Verified (`test -z "$(git status --porcelain)" && test -z "$(ls -A .git/roadmap-stash/qlhk-client-optimization-*.patch 2>/dev/null)"`)

## Finding Closure Mapping (When Sourced from `audit` / `optimize`)

- `OPT-001` -> Closed by Step 4 (Bundle Code-Splitting & Dynamic XLSX Loading)
- `OPT-002` -> Closed by Step 2 (Household List Search & Age Filter Acceleration)
- `OPT-003` -> Closed by Step 3 (Analytics Dashboard Village Breakdown Decoupling)
- `OPT-004` -> Closed by Step 1 (HouseholdStore Single-Pass Statistical Aggregation)

## Project Gotchas & Learned Invariants
- `fileExport.ts`: dynamic `import("xlsx")` prevents 429kB xlsx chunk in initial modulepreload.
- `AnalyticsDashboard.tsx`: `handleExportStatsExcel` must be async to await `loadXlsx()`.
