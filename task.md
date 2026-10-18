# Task Progress Tracker

- **Project**: QLHK Fullstack
- **Base Branch**: `plan/remediate-qlhk-optimizations`
- **Branch**: `roadmap/remediate-optimization-findings`
- **Plan Reference**: `docs/plans/remediate-optimization-findings.md`
- **Roadmap Prompt Reference**: `docs/plans/remediate-optimization-findings.roadmap.md`
- **Baseline Checkpoint**: `81288a4` (281 passing, verified across 2 baseline runs)
- **Known Baseline / Flaky Failures (Failed in Either Baseline Run)**:
  - None
- **Status Legend**: 
  - `[ ]` Pending
  - `[/]` In Progress
  - `[x]` Completed
  - `[!]` Blocked (Circuit Breaker Tripped)

## Execution Checklist

- [ ] Step 1: Batch Audit Logging in Backend Batch Delete
  - Finding IDs: `OPT-004`
  - Target Files: `QLHK-Backend/src/utils/audit.ts`, `QLHK-Backend/src/controllers/households.controller.ts`
  - Role Focus: Database I/O efficiency, atomic batch transactions, preserving audit log schema.
  - Graph Check: `graft callers "logAudit"`
  - Diff Budget: <= 200 gross LOC
  - Verification: `cd QLHK-Backend && npx vitest run tests/integration/households.test.ts`
  - Static Check: `cd QLHK-Backend && npx tsc --noEmit && cd ../QLHK-Client && npx tsc --noEmit`
- [ ] Step 2: Chunked Batch Insert for Excel Import Ingestion
  - Finding IDs: `OPT-005`
  - Target Files: `QLHK-Backend/src/controllers/excel.controller.ts`
  - Role Focus: PostgreSQL bulk write performance, foreign key integrity, preserving 5 new citizen fields (INV-01).
  - Graph Check: `graft callers "importExcel"`
  - Diff Budget: <= 200 gross LOC
  - Verification: `cd QLHK-Backend && npx vitest run tests/integration/excel.test.ts`
  - Static Check: `cd QLHK-Backend && npx tsc --noEmit && cd ../QLHK-Client && npx tsc --noEmit`
- [ ] Step 3: Client Store Search Filter & Village Aggregation Fast Paths
  - Finding IDs: `OPT-001`, `OPT-002`
  - Target Files: `QLHK-Client/src/store/householdStore.ts`
  - Role Focus: React state memoization, string search performance, avoiding Unicode NFD re-allocations.
  - Graph Check: `graft callers "searchedHouseholds"`
  - Diff Budget: <= 200 gross LOC
  - Verification: `cd QLHK-Client && npx vitest run tests/utilities.test.ts`
  - Static Check: `cd QLHK-Backend && npx tsc --noEmit && cd ../QLHK-Client && npx tsc --noEmit`
- [ ] Step 4: O(1) Set Lookup for Household Table Row Selection
  - Finding IDs: `OPT-003`
  - Target Files: `QLHK-Client/src/components/households/HouseholdTable.tsx`
  - Role Focus: Component render efficiency, O(1) set membership, table interaction responsiveness.
  - Graph Check: `graft callers "HouseholdTable"`
  - Diff Budget: <= 200 gross LOC
  - Verification: `cd QLHK-Client && npx vitest run tests/components/HouseholdTable.test.tsx`
  - Static Check: `cd QLHK-Backend && npx tsc --noEmit && cd ../QLHK-Client && npx tsc --noEmit`
- [ ] Step 5: Analytics Dashboard Single-Pass Aggregation & Age Short-Circuit
  - Finding IDs: `OPT-001`, `OPT-006`
  - Target Files: `QLHK-Client/src/components/analytics/AnalyticsDashboard.tsx`
  - Role Focus: Analytics math precision (INV-03), 1080p single viewport invariants (INV-04), single-pass data bucketing.
  - Graph Check: `graft callers "AnalyticsDashboard"`
  - Diff Budget: <= 200 gross LOC
  - Verification: `cd QLHK-Client && npx vitest run tests/components/AnalyticsDashboard.test.tsx`
  - Static Check: `cd QLHK-Backend && npx tsc --noEmit && cd ../QLHK-Client && npx tsc --noEmit`
- [ ] Step 6: Full Suite Verification & Zero-Regression Gate
  - Full Test Suite: `cd QLHK-Backend && npm test && cd ../QLHK-Client && npm test` (Zero new failures vs baseline)
  - Typecheck: `cd QLHK-Backend && npx tsc --noEmit && cd ../QLHK-Client && npx tsc --noEmit` (0 errors)
  - Clean Working Tree & No Orphan Patches: Verified (`test -z "$(git status --porcelain)" && test -z "$(ls -A .git/roadmap-stash 2>/dev/null)"`)

## Finding Closure Mapping (When Sourced from `audit` / `optimize`)
<!-- Populate at Step 6 when steps carry Finding IDs: `OPT-001 -> <commit_hash> (Step 3, Step 5)`, etc. -->

## Project Gotchas & Learned Invariants
<!-- Append verified gotchas here when encountering subtle bugs -->
