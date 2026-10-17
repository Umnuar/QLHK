# Task Progress Tracker

- **Project**: QLHK-Backend
- **Base Branch**: `feat/version-v1.5.0`
- **Branch**: `roadmap/remediate-backend-audit-findings`
- **Plan Reference**: `docs/plans/remediate-backend-audit-findings.md`
- **Roadmap Prompt Reference**: `docs/plans/remediate-backend-audit-findings.roadmap.md`
- **Baseline Checkpoint**: `86838e1` (115 passing, verified across 2 baseline runs)
- **Known Baseline / Flaky Failures (Failed in Either Baseline Run)**:
  - None
- **Status Legend**: 
  - `[ ]` Pending
  - `[/]` In Progress
  - `[x]` Completed
  - `[!]` Blocked (Circuit Breaker Tripped)

## Execution Checklist

- [x] Step 1: Fix Demographics Persistence and Placeholder CCCD Handling in Excel Import
  - Finding IDs: `BUG-001`, `BUG-002`
  - Target Files: `QLHK-Backend/src/controllers/excel.controller.ts`, `QLHK-Backend/tests/integration/excel-import-demographics.test.ts`
  - Role Focus: Excel data ingestion, CCCD validation, and demographic persistence invariants
  - Graph Check: `graft callers importExcel || grep -rn "importExcel" src/`
  - Diff Budget: <= 200 gross LOC
  - Verification: `cd QLHK-Backend && npx vitest run tests/integration/excel-import-demographics.test.ts`
  - Static Check: `cd QLHK-Backend && npx tsc --noEmit`
- [x] Step 2: Support Full 9/12-Digit CCCD Hash Matching in Citizens Search
  - Finding IDs: `BUG-003`
  - Target Files: `QLHK-Backend/src/controllers/citizens.controller.ts`, `QLHK-Backend/tests/integration/citizens-search-cccd.test.ts`
  - Role Focus: Citizen query sanitization, exact CCCD hash lookup, and database index utilization
  - Graph Check: `graft callers getCitizens || grep -rn "getCitizens" src/`
  - Diff Budget: <= 200 gross LOC
  - Verification: `cd QLHK-Backend && npx vitest run tests/integration/citizens-search-cccd.test.ts`
  - Static Check: `cd QLHK-Backend && npx tsc --noEmit`
- [ ] Step 3: Verification & Final Gate
  - Full Test Suite: `cd QLHK-Backend && npm test` (Zero new failures vs baseline)
  - Typecheck: `cd QLHK-Backend && npx tsc --noEmit` (0 errors)
  - Clean Working Tree & No Orphan Patches: Verified (`test -z "$(git status --porcelain)" && test -z "$(ls -A .git/roadmap-stash 2>/dev/null)"`)

## Finding Closure Mapping (When Sourced from `audit` / `optimize`)
<!-- Populate at Step 3 when steps carry Finding IDs: `BUG-001 -> <commit_hash> (Step 1)` -->

## Project Gotchas & Learned Invariants
<!-- Append verified gotchas here when encountering subtle bugs -->
