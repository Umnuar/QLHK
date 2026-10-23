# Roadmap Execution Prompt: Client Fix Dropdown Portal Jump, Remove Policy Composite Card, Add Chuc Tho Date Filter

`````text
[MANDATORY SYSTEM DIRECTIVE]:
You are executing a multi-step engineering task based on the verified plan at:
QLHK/docs/plans/task-client-fix-dropdown-progress-datefilter.md

ENVIRONMENT REQUIREMENT:
All shell commands require a POSIX-compatible shell (Git Bash on Windows, WSL, Linux, or macOS).

STRICT INVARIANTS:
1. BRANCH & PRE-FLIGHT (Initial Start Only):
   - Pre-Switch Detached-HEAD & Protected-Branch Guard: Before creating `roadmap/task-client-fix-dropdown-progress-datefilter`, verify `HEAD` is not detached (`BASE_BRANCH=$(git branch --show-current)` and `test -n "$BASE_BRANCH"`).
   - Create and switch to isolated branch: `git switch -c roadmap/task-client-fix-dropdown-progress-datefilter`.
   - Verify clean working tree: `test -z "$(git status --porcelain)"`.
   - Execute baseline test command twice: `cd QLHK/QLHK-Client && npm test -- --run && npm test -- --run` -> Record passing count (182 passing).
2. TWO-TIER READ CADENCE & CONTEXT ANCHORING:
   - Tier 1: Anchor read of `docs/plans/task-client-fix-dropdown-progress-datefilter.task.md`.
   - Tier 2: Surgical read of exact step files only.
3. GRAPH-AWARE BLAST RADIUS:
   - Use graft or grep/LSP to inspect callers and dependencies before modifying shared components.
4. SCOPE HYGIENE & DIFF GATE (<= 200 GROSS LOC):
   - Staged gross diff size <= 200 LOC per step.
5. ATOMIC COMMITS & ZERO COMMENTS IN CODE (P0):
   - NEVER write comments in code (`//`, `/* */`, `#`, JSDoc). Actively remove comments in touched areas.
   - Commit with semantic types: `fix(roadmap): complete step K - <title>`.
6. SAFE CIRCUIT BREAKER ROLLBACK & UNBLOCKING:
   - Max 3 attempts per step before halting for human review.
7. SCOPED TESTS, PER-STEP STATIC CHECK:
   - Run scoped tests and `npx tsc --noEmit` at each step.
8. FRESH CONTEXT HANDOFF:
   - Output handoff block after 4 implementation steps if needed.
9. MINIMAL WORKING DIFF:
   - Shortest working code, strict YAGNI.

---

### STEP 0: BRANCH ISOLATION, PRE-FLIGHT GATE & TASK INITIALIZATION
1. Capture `BASE_BRANCH=$(git branch --show-current)`. Create branch: `git switch -c roadmap/task-client-fix-dropdown-progress-datefilter`.
2. Verify clean working tree: `test -z "$(git status --porcelain)"`.
3. Capture baseline commit hash via `git rev-parse --short HEAD` and run baseline tests twice: `cd QLHK/QLHK-Client && npm test -- --run && npm test -- --run`.
4. Create `docs/plans/task-client-fix-dropdown-progress-datefilter.task.md` with this exact content:

````markdown
# Task Progress Tracker

- **Project**: QLHK Client Fix Dropdown Progress DateFilter
- **Base Branch**: `<BASE_BRANCH>`
- **Branch**: `roadmap/task-client-fix-dropdown-progress-datefilter`
- **Plan Reference**: `QLHK/docs/plans/task-client-fix-dropdown-progress-datefilter.md`
- **Roadmap Prompt Reference**: `docs/plans/task-client-fix-dropdown-progress-datefilter.roadmap.md`
- **Baseline Checkpoint**: `<BASELINE_HASH>` (<PASS_COUNT> passing, verified across 2 baseline runs)
- **Known Baseline / Flaky Failures**:
  - None

- **Status Legend**:
  - `[ ]` Pending
  - `[/]` In Progress
  - `[x]` Completed
  - `[!]` Blocked (Circuit Breaker Tripped)

## Execution Checklist

- [ ] Step 1: Fix CustomSelect Dropdown Portal (0,0) Coordinate Jump
  - Target Files: `QLHK/QLHK-Client/src/components/common/CustomSelect.tsx`
  - Role Focus: Synchronous getBoundingClientRect in toggleDropdown, useLayoutEffect, portal render guard, transformOrigin
  - Diff Budget: <= 200 gross LOC
  - Verification: `cd QLHK/QLHK-Client && npx vitest run src/components/common/__tests__/CustomSelect.test.tsx`
  - Static Check: `cd QLHK/QLHK-Client && npx tsc --noEmit`
- [ ] Step 2: Remove PolicyCompositeCard from PolicyAnalyticsPage
  - Target Files: `QLHK/QLHK-Client/src/features/qlcs/pages/PolicyAnalyticsPage.tsx`
  - Role Focus: Remove PolicyCompositeCard render and clean unused imports
  - Diff Budget: <= 200 gross LOC
  - Verification: `cd QLHK/QLHK-Client && npx vitest run src/pages/__tests__/PolicyAnalyticsPage.test.tsx`
  - Static Check: `cd QLHK/QLHK-Client && npx tsc --noEmit`
- [ ] Step 3: Implement Chúc Thọ Date Filter in ProfileFilterBar and Dashboard
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
````

5. Commit task initialization:
   ```bash
   git add docs/plans/task-client-fix-dropdown-progress-datefilter.task.md
   git commit -m "chore(roadmap): initialize task tracker for task-client-fix-dropdown-progress-datefilter"
   ```

---

### STEP 1: FIX CUSTOMSELECT DROPDOWN PORTAL (0,0) COORDINATE JUMP
1. Context Anchoring:
   - Target File: `QLHK/QLHK-Client/src/components/common/CustomSelect.tsx`
   - Goal: Calculate dropdown coordinates synchronously upon opening, use `useLayoutEffect`, guard portal render with `menuPosition.width > 0`, and set `transformOrigin`.
2. Implementation:
   - Extract `calculatePosition` helper measuring `containerRef.current.getBoundingClientRect()`.
   - In `toggleDropdown`: if opening, call `calculatePosition()` synchronously before setting `isOpen(true)`.
   - In label click: invoke `toggleDropdown` to keep behavior consistent.
   - Replace `useEffect` for position updating with `useLayoutEffect`.
   - Guard portal: `{isOpen && menuPosition.width > 0 && typeof document !== "undefined" && createPortal(...)}`.
   - Style dropdown container: add `transformOrigin: openUpward ? "bottom center" : "top center"`.
   - Invariant: Zero comments in code.
3. Verification:
   ```bash
   cd QLHK/QLHK-Client && npx vitest run src/components/common/__tests__/CustomSelect.test.tsx
   cd QLHK/QLHK-Client && npx tsc --noEmit
   ```
4. Diff Gate & Commit:
   ```bash
   git add QLHK-Client/src/components/common/CustomSelect.tsx
   git commit -m "fix(roadmap): complete step 1 - fix CustomSelect portal coordinate jump"
   ```

---

### STEP 2: REMOVE POLICYCOMPOSITECARD FROM POLICYANALYTICSPAGE
1. Context Anchoring:
   - Target File: `QLHK/QLHK-Client/src/features/qlcs/pages/PolicyAnalyticsPage.tsx`
   - Goal: Remove the "Tiến độ thực hiện chính sách" card (`<PolicyCompositeCard data={policyData} />`) and clean unused import.
2. Implementation:
   - Remove `import { PolicyCompositeCard } from "../components/analytics/PolicyCompositeCard";`.
   - Remove `<PolicyCompositeCard data={policyData} />` from the JSX tree.
   - Invariant: Zero comments in code.
3. Verification:
   ```bash
   cd QLHK/QLHK-Client && npx vitest run src/pages/__tests__/PolicyAnalyticsPage.test.tsx
   cd QLHK/QLHK-Client && npx tsc --noEmit
   ```
4. Diff Gate & Commit:
   ```bash
   git add QLHK-Client/src/features/qlcs/pages/PolicyAnalyticsPage.tsx
   git commit -m "fix(roadmap): complete step 2 - remove PolicyCompositeCard from policy analytics page"
   ```

---

### STEP 3: IMPLEMENT CHÚC THỌ DATE FILTER IN PROFILEFILTERBAR AND DASHBOARD
1. Context Anchoring:
   - Target Files:
     - `QLHK/QLHK-Client/src/features/qlcs/components/dashboard/ProfileFilterBar.tsx`
     - `QLHK/QLHK-Client/src/hooks/useFilters.ts`
     - `QLHK/QLHK-Client/src/hooks/useProfilesTypes.ts`
     - `QLHK/QLHK-Client/src/hooks/useProfiles.ts`
     - `QLHK/QLHK-Client/src/features/qlcs/pages/DashboardPage.tsx`
   - Goal: Add date filtering for Chúc Thọ list, enabling users to filter by birth date.
2. Implementation:
   - `ProfileFilterBar.tsx`:
     - Add `dateFilter?: string; onDateChange?: (val: string) => void;` to `ProfileFilterBarProps`.
     - When `activeTab === "chuctho"`, render a date filter text input with `Calendar` icon and clear button.
     - Include `Boolean(dateFilter?.trim())` in active filters count and reset logic.
   - `useFilters.ts`:
     - Add `ctDateFilter`, `hxDateFilter`, `dateFilter`, `setDateFilter`.
     - Reset date filters in `resetFilters`.
     - When date filter changes, reset current page to 1.
   - `useProfilesTypes.ts`:
     - Add `dateFilter?: string;` to `FilterParams`.
   - `useProfiles.ts`:
     - Include `dateFilter` in `FilterParams` destructuring and cacheKey.
     - Pass `dob: dateFilter || undefined` in `queryParams`.
   - `DashboardPage.tsx`:
     - Pass `dateFilter: filters.dateFilter` in `profileFilters` memo.
     - Pass `dateFilter={filters.dateFilter}` and `onDateChange={filters.setDateFilter}` to `ProfileFilterBar`.
   - Invariant: Zero comments in code.
3. Verification:
   ```bash
   cd QLHK/QLHK-Client && npx vitest run src/pages/__tests__/ChucThoPage.test.tsx
   cd QLHK/QLHK-Client && npx tsc --noEmit
   ```
4. Diff Gate & Commit:
   ```bash
   git add QLHK-Client/src/features/qlcs/components/dashboard/ProfileFilterBar.tsx \
           QLHK-Client/src/hooks/useFilters.ts \
           QLHK-Client/src/hooks/useProfilesTypes.ts \
           QLHK-Client/src/hooks/useProfiles.ts \
           QLHK-Client/src/features/qlcs/pages/DashboardPage.tsx
   git commit -m "feat(roadmap): complete step 3 - implement date filter for chuc tho"
   ```

---

### STEP 4: FINAL VERIFICATION GATE & ZERO COMMENTS AUDIT
1. Context Anchoring:
   - Audit all modified files for zero comments.
   - Run typecheck, unit tests, and production build.
2. Verification Commands:
   ```bash
   cd QLHK/QLHK-Client && npx tsc --noEmit
   cd QLHK/QLHK-Client && npm test -- --run
   cd QLHK/QLHK-Client && npm run build
   ```
3. Update `docs/plans/task-client-fix-dropdown-progress-datefilter.task.md` to mark all items `[x]`.
4. Commit final gate completion:
   ```bash
   git add docs/plans/task-client-fix-dropdown-progress-datefilter.task.md
   git commit -m "chore(roadmap): complete step 4 - final verification gate passed"
   ```
`````
