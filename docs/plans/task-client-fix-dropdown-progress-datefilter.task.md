# Task Progress Tracker

- **Project**: QLHK Client Fix Dropdown Progress DateFilter
- **Base Branch**: `feat/qlcs-full-ui-port`
- **Branch**: `roadmap/task-client-fix-dropdown-progress-datefilter`
- **Plan Reference**: `QLHK/docs/plans/task-client-fix-dropdown-progress-datefilter.md`
- **Roadmap Prompt Reference**: `docs/plans/task-client-fix-dropdown-progress-datefilter.roadmap.md`
- **Baseline Checkpoint**: `5b305b1` (182 passing, verified across 2 baseline runs)
- **Known Baseline / Flaky Failures**:
  - None

- **Status Legend**:
  - `[ ]` Pending
  - `[/]` In Progress
  - `[x]` Completed
  - `[!]` Blocked (Circuit Breaker Tripped)

## Execution Checklist

- [x] Step 1: Fix CustomSelect Dropdown Portal (0,0) Coordinate Jump
  - Target Files: `QLHK/QLHK-Client/src/components/common/CustomSelect.tsx`
  - Role Focus: Synchronous getBoundingClientRect in toggleDropdown, useLayoutEffect, portal render guard, transformOrigin
  - Diff Budget: <= 200 gross LOC
  - Verification: `cd QLHK/QLHK-Client && npx vitest run src/components/common/__tests__/CustomSelect.test.tsx`
  - Static Check: `cd QLHK/QLHK-Client && npx tsc --noEmit`
- [x] Step 2: Remove PolicyCompositeCard from PolicyAnalyticsPage
  - Target Files: `QLHK/QLHK-Client/src/features/qlcs/pages/PolicyAnalyticsPage.tsx`
  - Role Focus: Remove PolicyCompositeCard render and clean unused imports
  - Diff Budget: <= 200 gross LOC
  - Verification: `cd QLHK/QLHK-Client && npx vitest run src/pages/__tests__/PolicyAnalyticsPage.test.tsx`
  - Static Check: `cd QLHK/QLHK-Client && npx tsc --noEmit`
- [x] Step 3: Implement Chúc Thọ Date Filter in ProfileFilterBar and Dashboard
  - Target Files: `QLHK/QLHK-Client/src/features/qlcs/components/dashboard/ProfileFilterBar.tsx`, `QLHK/QLHK-Client/src/hooks/useFilters.ts`, `QLHK/QLHK-Client/src/hooks/useProfilesTypes.ts`, `QLHK/QLHK-Client/src/hooks/useProfiles.ts`, `QLHK/QLHK-Client/src/features/qlcs/pages/DashboardPage.tsx`
  - Role Focus: Date filter input, dateFilter state wiring, passing dob to queryParams, clear-all support
  - Diff Budget: <= 200 gross LOC
  - Verification: `cd QLHK/QLHK-Client && npx vitest run src/pages/__tests__/ChucThoPage.test.tsx`
  - Static Check: `cd QLHK/QLHK-Client && npx tsc --noEmit`
- [ ] Step 4: Final Verification Gate & Zero Comments Invariant Audit
  - Target Files: All modified client files
  - Role Focus: Full test suite pass (>= 182 tests), zero tsc errors, successful build, zero comments
  - Verification: `cd QLHK/QLHK-Client && npm test -- --run && npm run build`
  - Static Check: `cd QLHK/QLHK-Client && npx tsc --noEmit`

## Project Gotchas & Learned Invariants
- P0: Zero comments in all new and edited code.
- CustomSelect: Initial menuPosition must be calculated before opening to prevent flash from (0,0).
