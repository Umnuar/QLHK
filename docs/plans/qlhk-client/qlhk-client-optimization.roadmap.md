`````text
[MANDATORY SYSTEM DIRECTIVE]:
You are executing a multi-step engineering task based on the verified plan at:
docs/plans/qlhk-client/qlhk-client-optimization.md

ENVIRONMENT REQUIREMENT:
All shell commands require a POSIX-compatible shell (Git Bash on Windows, WSL, Linux, or macOS).

STRICT INVARIANTS:
1. BRANCH & PRE-FLIGHT (Initial Start Only):
   - **Pre-Switch Detached-HEAD & Protected-Branch Guard**: Before creating `roadmap/qlhk-client-optimization`, verify `HEAD` is not detached (`BASE_BRANCH=$(git branch --show-current)` and `test -n "$BASE_BRANCH"`; if empty/detached, halt immediately and ask the user to check out a named branch first). If `$BASE_BRANCH` is a protected branch (`main`, `master`, or `production`), ask the user whether to branch `roadmap/qlhk-client-optimization` directly from `$BASE_BRANCH` (recording it as `Base Branch`) or switch to a feature/planning branch first.
   - Create and switch to isolated branch: `git switch -c roadmap/qlhk-client-optimization`. If the branch already exists on a fresh start, halt immediately and ask the user whether to resume the existing branch or choose a new branch name. (When resuming via a Handoff Prompt, skip `STEP 0` and use `git switch roadmap/qlhk-client-optimization`.)
   - Verify clean working tree: `test -z "$(git status --porcelain)"`.
   - Execute the baseline test command **twice** (`Run 1` and `Run 2`), record `Base Branch: <BASE_BRANCH>`, the passing count, and exact names of any tests failing in **either** run as "flaky/known failing" into `docs/plans/qlhk-client/qlhk-client-optimization.task.md`, and immediately commit `docs/plans/qlhk-client/qlhk-client-optimization.task.md`. Never build on an uncommitted dirty tree.
2. ZERO COMMENTS IN CODE POLICY (P0 STRICT INVARIANT):
   - ABSOLUTELY NEVER write any comments (`//`, `/* ... */`, `#`, JSDoc/TSDoc, HTML comments) in any new or modified code.
   - Code must be completely self-describing through explicit, meaningful variable, function, and parameter names.
   - Actively remove existing comments in touched areas.
3. TWO-TIER READ CADENCE & CONTEXT ANCHORING:
   - **Tier 1 (Session / Task Initialization)**: At `STEP 0`, when resuming from a handoff, or after a `/compact` event, you MUST perform a one-time anchor read of: `docs/plans/qlhk-client/qlhk-client-optimization.task.md` and the plan header (`docs/plans/qlhk-client/qlhk-client-optimization.md`). Emit mandatory proof-of-read log before taking action:
     `[Context Anchored]: qlhk-client-optimization.task.md (<status>), plan.md (<goal>)`
   - **Tier 2 (In-Session Atomic Step K)**: NEVER re-read the entire `plan.md` file at each step. Rely on inlined instructions inside `STEP K` (or read ONLY the exact surgical slice `### Section K: ...`, `<= 30 lines`). Follow the embedded `Role Focus` invariants and only read code files strictly inside `Target Files`. Review `## Project Gotchas & Learned Invariants` in `docs/plans/qlhk-client/qlhk-client-optimization.task.md` before starting a step.
4. GRAPH-AWARE BLAST RADIUS:
   - When a step specifies a `GRAPH-MAP CHECK`, check if the tool (`graft`, `graphify`, `codegraph`) is installed before querying callers/callees. Fall back to native grep or LSP find-references if unavailable.
5. SCOPE HYGIENE & DIFF GATE (<= 200 GROSS LOC):
   - After implementing changes and BEFORE staging, run `git status --short`. Note that tracker modifications (`[/]`) in `docs/plans/qlhk-client/qlhk-client-optimization.task.md` are expected—never reset or delete the tracker. If out-of-scope files (`.env*`, scratch scripts, build artifacts) appear, reset (`git reset <file>`), delete, or add to `.gitignore`.
   - Run the **DIFF GATE** command to stage changes and verify gross diff size (added + deleted lines) <= 200 LOC per step, excluding lockfiles, migrations, fixtures, and task trackers (note that binary files output `-\t-\t<path>` in `git diff --numstat` and naturally count as `0 LOC` in `awk '{s+=$1+$2}'`):
     ```bash
     git add -A && git diff --cached --numstat -- . \
       ':(exclude)*.lock' ':(exclude)*lock.json' \
       ':(exclude,glob)**/migrations/**' ':(exclude,glob)**/fixtures/**' \
       ':(exclude)*task.md' \
       | awk '{s+=$1+$2} END{print (s?s:0) " LOC"}'
     ```
   - If > 200 gross LOC, unstage (`git reset`), split the step in `docs/plans/qlhk-client/qlhk-client-optimization.task.md` into `Step K.a` and `Step K.b` (without renumbering subsequent steps), and execute `Step K.a` first:
     1. Save the `Step K.b` changes to an isolated patch file inside `.git/` (so the working tree stays 100% clean):
        ```bash
        mkdir -p .git/roadmap-stash
        git diff -- <step_Kb_files> > ".git/roadmap-stash/qlhk-client-optimization-K.b.patch"
        git checkout -- <step_Kb_files>
        git clean -fd -- <step_Kb_new_files>
        ```
     2. Record `Deferred Patch: .git/roadmap-stash/qlhk-client-optimization-K.b.patch` under `Step K.b` in `docs/plans/qlhk-client/qlhk-client-optimization.task.md`. Never commit `Step K.b` changes inside `Step K.a`.
     3. When `Step K.b` starts, apply the saved patch via `git apply ".git/roadmap-stash/qlhk-client-optimization-K.b.patch"`, and immediately after committing `Step K.b`, delete the patch file via `rm -f ".git/roadmap-stash/qlhk-client-optimization-K.b.patch"`. Each committed sub-step (`Step K.a`, `Step K.b`) counts as **1 step** toward the 4-step session handoff counter (Invariant 9).
6. ATOMIC COMMITS & COMMIT HOOKS:
   - After scoped tests pass, update `docs/plans/qlhk-client/qlhk-client-optimization.task.md` (`[x]` + any new gotchas) and commit using semantic types (`feat`, `fix`, `refactor`, `test`, `perf`, `chore`):
     `git add -A && git commit -m "<type>(roadmap): complete step K - <title> [<Finding-ID>]"`
   - Never use `--no-verify`; hook failures caused by the agent's own change are code attempts; infrastructure/hook-tool failures are not.
   - Verify working tree is 100% clean after commit (`test -z "$(git status --porcelain)"`).
7. SAFE CIRCUIT BREAKER ROLLBACK & UNBLOCKING:
   - **What Counts as an Attempt**: A single cycle of implementing/modifying code for the current step (or sub-step `K.a`/`K.b`) followed by a failing scoped test, failing per-step static/typecheck command, or a pre-commit hook failure caused by the agent's own code change. Transient infrastructure, port, network, or hook-tool runner errors do NOT count as code attempts.
   - **Pre-Retry Reset Rule (Before Attempt 2 and Attempt 3)**: Before starting each retry attempt (`Attempt 2` or `Attempt 3`), you MUST reset all tracked and untracked code changes back to the last committed checkpoint while preserving `docs/plans/qlhk-client/qlhk-client-optimization.task.md`:
     ```bash
     cp docs/plans/qlhk-client/qlhk-client-optimization.task.md ".git/roadmap-task-qlhk-client-optimization.md.bak"
     git restore --staged . && git checkout -- . && git clean -fd -e docs/plans/qlhk-client/qlhk-client-optimization.task.md -e task.md
     mv ".git/roadmap-task-qlhk-client-optimization.md.bak" docs/plans/qlhk-client/qlhk-client-optimization.task.md
     ```
   - **Counter Reset Rule**: The 3-attempt counter is scoped per step (or sub-step `K.a`/`K.b`) and resets to `0` when: (a) a step (or sub-step) passes verification and is committed (`[x]`), or (b) the user provides unblocking guidance after a `[!]` halt and the step is transitioned from `[!]` back to `[/]`.
   - If a step fails after 3 consecutive code attempts, preserve the 3rd attempt's WIP on a unique branch and restore `roadmap/qlhk-client-optimization` cleanly:
     ```bash
     ATTEMPT_TS=$(date +%s)
     git switch -c "failed/qlhk-client-optimization/step-K-attempt-${ATTEMPT_TS}"
     git add -A && git commit -m "wip: failed step K attempt after 3 tries"
     git switch "roadmap/qlhk-client-optimization"
     git add docs/plans/qlhk-client/qlhk-client-optimization.task.md && git commit -m "chore(roadmap): mark step K blocked"
     ```
   - Halt and await user guidance. **Branch Retention Rule**: Never delete `failed/qlhk-client-optimization/*` branches automatically; preserve them until the user explicitly confirms deletion after `STEP 5` completes.
   - Unblocking procedure: Once user provides guidance, ensure you are on `roadmap/qlhk-client-optimization`, change `[!]` back to `[/]` in `docs/plans/qlhk-client/qlhk-client-optimization.task.md` (which resets the attempt counter to `0`), and retry Step K from the clean Step K-1 checkpoint.
8. SCOPED TESTS, PER-STEP STATIC CHECK, FLAKY POLICY VS FULL SUITE:
   - Run fast scoped tests AND the per-step static/typecheck command (`cd QLHK-Client && npx tsc --noEmit`) at each step.
   - Run the full test suite (`cd QLHK-Client && npm test`) and full typecheck (`cd QLHK-Client && npx tsc --noEmit`) at session handoffs and at the final verification gate (`Step 5`).
   - **Flaky Test Policy**: The Step 0 baseline test run is executed **twice**; any test failing in **either** run is recorded under `Known Baseline / Flaky Failures` in `docs/plans/qlhk-client/qlhk-client-optimization.task.md`. During `STEP K`, handoffs, or `STEP 5`, any **new** test failure (not listed in `Known Baseline / Flaky Failures`) MUST be **re-run once** before being counted as a regression or code attempt failure (if it passes on the immediate re-run, log it as flaky in `docs/plans/qlhk-client/qlhk-client-optimization.task.md` under `## Project Gotchas & Learned Invariants` and do not count it as a regression).
   - Enforce zero confirmed new failures compared to the baseline recorded in Step 0.
   - If the full test suite still fails after re-running the failing test once at handoff, treat it as a blocked gate: inspect `git log -n 4 --oneline` and test checkpoints individually (or via `git bisect`) to isolate which step caused the regression. After isolating the culprit step, **always return to the branch tip before making any edits**: run `git bisect reset` (if bisect was used), then `git switch "roadmap/qlhk-client-optimization"`, and verify with `git branch --show-current`.
9. FRESH CONTEXT HANDOFF (EVERY 4 IMPLEMENTATION STEPS IN SESSION OR ON USER REQUEST):
   - After completing 4 implementation steps (`Step 1`..`Step 4`, where each committed sub-step `Step K.a` or `Step K.b` counts as **1 step** toward the 4-step counter; `Step 0` does not count) in the current session, or immediately when requested by the user—**unless Step 5 (the final step) has just completed**—run the full test suite, verify a clean working tree, output the embedded `SESSION HANDOFF CHECKPOINT` block at the bottom of this prompt, and **STOP immediately**. Do not start the next step in the current session.
10. MINIMAL WORKING DIFF:
    - Shortest working code, strict YAGNI, zero unrequested abstractions, zero temporary scratch scripts (`fix*.js`, `patch*.py`, `temp*`).

---

### STEP 0: BRANCH ISOLATION, PRE-FLIGHT GATE & TASK INITIALIZATION
1. Capture the current branch as `BASE_BRANCH` (`BASE_BRANCH=$(git branch --show-current)`), verify `HEAD` is not detached (`test -n "$BASE_BRANCH"`, halting if detached), and if `$BASE_BRANCH` is protected (`main`/`master`/`production`), confirm with the user whether to use it as `BASE_BRANCH` or switch first; then create and switch to branch: `git switch -c roadmap/qlhk-client-optimization` (if branch already exists, halt and ask user whether to resume or rename).
2. Verify clean working tree: `test -z "$(git status --porcelain)"` (Must exit 0).
3. Capture baseline commit hash via `git rev-parse --short HEAD` and run baseline tests **twice**: `cd QLHK-Client && npm test && cd QLHK-Client && npm test` (running both even if the first has pre-existing failures) -> Record total passing count and exact names of any tests failing in **either** run as "flaky/known failing".
4. Create `docs/plans/qlhk-client/qlhk-client-optimization.task.md` with this exact content (replace `<BASE_BRANCH>`, `<BASELINE_HASH>`, and `<PASS_COUNT>` with actual values from steps 1 and 3):

````markdown
# Task Progress Tracker

- **Project**: QLHK-Client
- **Base Branch**: `<BASE_BRANCH>`
- **Branch**: `roadmap/qlhk-client-optimization`
- **Plan Reference**: `docs/plans/qlhk-client/qlhk-client-optimization.md`
- **Roadmap Prompt Reference**: `docs/plans/qlhk-client/qlhk-client-optimization.roadmap.md`
- **Baseline Checkpoint**: `<BASELINE_HASH>` (<PASS_COUNT> passing, verified across 2 baseline runs)
- **Known Baseline / Flaky Failures (Failed in Either Baseline Run)**:
  - None (or list exact paths/names: `path/to/test.ts > "test name" [flaky/known failing]`)
- **Status Legend**: 
  - `[ ]` Pending
  - `[/]` In Progress
  - `[x]` Completed
  - `[!]` Blocked (Circuit Breaker Tripped)

## Execution Checklist

- [ ] Step 1: HouseholdStore Single-Pass Statistical Aggregation
  - Finding IDs: `OPT-004`
  - Target Files: `QLHK-Client/src/store/householdStore.ts`
  - Assigned Role: `.agents/performance-engineer.md`
  - Role Focus: Unify multi-pass statistical loops into a single memoized accumulator while maintaining exact numeric invariant equivalence. Enforce zero comments in code.
  - Graph Check: `git grep -n "kpiStats\|ethnicStats\|villageStats" QLHK-Client/src/`
  - Diff Budget: <= 200 gross LOC
  - Verification: `cd QLHK-Client && npx vitest run src/api/__tests__/householdApi.test.ts src/db/__tests__/indexedDB.test.ts`
  - Static Check: `cd QLHK-Client && npx tsc --noEmit`
- [ ] Step 2: Household List Search & Age Filter Hot-Path Acceleration
  - Finding IDs: `OPT-002`
  - Target Files: `QLHK-Client/src/pages/HouseholdsPage.tsx`
  - Assigned Role: `.agents/react-performance-optimization.md`
  - Role Focus: Eliminate redundant Unicode normalizations and string date parsing inside high-frequency filter loops. Enforce zero comments in code.
  - Graph Check: `git grep -n "head_name_unaccented\|calculateAge" QLHK-Client/src/pages/HouseholdsPage.tsx`
  - Diff Budget: <= 200 gross LOC
  - Verification: `cd QLHK-Client && npx vitest run src/components/households/__tests__/HouseholdTable.test.tsx src/utils/__tests__/utilities.test.ts`
  - Static Check: `cd QLHK-Client && npx tsc --noEmit`
- [ ] Step 3: Analytics Dashboard Village Breakdown Decoupling
  - Finding IDs: `OPT-003`
  - Target Files: `QLHK-Client/src/components/analytics/AnalyticsDashboard.tsx`
  - Assigned Role: `.agents/react-performance-optimization.md`
  - Role Focus: Decouple commune-wide breakdown calculation from village filter state to achieve O(1) filter response. Enforce zero comments in code.
  - Graph Check: `git grep -n "villageStatsMap\|villageBreakdown" QLHK-Client/src/components/analytics/`
  - Diff Budget: <= 200 gross LOC
  - Verification: `cd QLHK-Client && npx vitest run src/components/analytics/__tests__/AnalyticsDashboard.test.tsx`
  - Static Check: `cd QLHK-Client && npx tsc --noEmit`
- [ ] Step 4: Client Bundle Code-Splitting & Dynamic XLSX Loading
  - Finding IDs: `OPT-001`
  - Target Files: `QLHK-Client/src/utils/fileExport.ts`, `QLHK-Client/src/pages/HouseholdsPage.tsx`, `QLHK-Client/src/components/analytics/AnalyticsDashboard.tsx`, `QLHK-Client/src/components/excel/ImportPreviewModal.tsx`
  - Assigned Role: `.agents/frontend-developer.md`
  - Role Focus: Eliminate heavy XLSX library chunk from initial page preload through dynamic asynchronous imports. Enforce zero comments in code.
  - Graph Check: `git grep -n "import.*from [\"']xlsx[\"']" QLHK-Client/src/`
  - Diff Budget: <= 200 gross LOC
  - Verification: `cd QLHK-Client && npm run build && npx vitest run tests/e2e/workflow.test.ts src/components/excel/__tests__/ExportSettingsModal.test.tsx src/components/excel/__tests__/ImportPreviewModal.test.tsx`
  - Static Check: `cd QLHK-Client && npx tsc --noEmit`
- [ ] Step 5: Verification & Final Gate
  - Full Test Suite: `cd QLHK-Client && npm test` (Zero new failures vs baseline)
  - Typecheck: `cd QLHK-Client && npx tsc --noEmit` (0 errors)
  - Production Build: `cd QLHK-Client && npm run build` (vendor-excel excluded from initial modulepreload)
  - Zero Comments Audit: `git diff <BASE_BRANCH>...HEAD | grep -E '^\+[ ]*(\/\/|\/\*|\*\/|#)'` (0 matches)
  - Clean Working Tree & No Orphan Patches: Verified (`test -z "$(git status --porcelain)" && test -z "$(ls -A .git/roadmap-stash/qlhk-client-optimization-*.patch 2>/dev/null)"`)

## Finding Closure Mapping (When Sourced from `audit` / `optimize`)
<!-- Populate at Step 5: `OPT-XXX -> <commit_hash> (Step K)` -->

## Project Gotchas & Learned Invariants
<!-- Append verified gotchas here when encountering subtle bugs -->
````

5. Commit initial tracker: `git add docs/plans/qlhk-client/qlhk-client-optimization.task.md && git commit -m "chore(roadmap): init qlhk-client-optimization.task.md"`.
6. Verify clean tree: `test -z "$(git status --porcelain)"`.
7. Anchor Context (Tier 1): Read `docs/plans/qlhk-client/qlhk-client-optimization.task.md` and the plan header (`docs/plans/qlhk-client/qlhk-client-optimization.md`). Emit log: `[Context Anchored]: qlhk-client-optimization.task.md (<status>), plan.md (<goal>)`.

---

### STEP 1: HouseholdStore Single-Pass Statistical Aggregation
- START STEP:
  + Update `docs/plans/qlhk-client/qlhk-client-optimization.task.md`: Mark Step 1 as `[/]` (In Progress) and review `## Project Gotchas & Learned Invariants`.
- PRE-REQUISITE READS (Tier 2 slice; skip file read if already anchored in active session):
  + Plan Section: `docs/plans/qlhk-client/qlhk-client-optimization.md` (Section 1: HouseholdStore Single-Pass Statistical Aggregation (Step 1))
  + Agent Role: `.agents/performance-engineer.md`
  + Role Focus: Unify multi-pass statistical loops into a single memoized accumulator while maintaining exact numeric invariant equivalence. Enforce zero comments in code.
- GRAPH-MAP CHECK:
  + Command: `git grep -n "kpiStats\|ethnicStats\|villageStats" QLHK-Client/src/`
- ACTIONS:
  1. In `QLHK-Client/src/store/householdStore.ts:117-240`, replace the three separate `useMemo` declarations (`kpiStats`, `ethnicStats`, `villageStats`) with a single `useMemo` calculating `aggregatedStats`.
  2. In the unified loop, iterate over `activeHouseholds` and `h.members` once, updating KPI totals, ethnic distribution map, and village statistics map simultaneously.
  3. Destructure `kpiStats`, `ethnicStats`, and `villageStats` from the memoized result to preserve the store's public return contract.
  4. Ensure ZERO COMMENTS IN CODE in all touched lines.
- SCOPE REVIEW & DIFF BUDGET GATE:
  1. Review working tree: `git status --short` (`docs/plans/qlhk-client/qlhk-client-optimization.task.md` changes expected; reset or remove any out-of-scope files before staging).
  2. Run **DIFF GATE** (Invariant 5) -> Verify staged gross diff is `<= 200 LOC`.
- VERIFICATION:
  - Run scoped tests (zero new failures vs baseline; re-run any new failure once before counting as regression): `cd QLHK-Client && npx vitest run src/api/__tests__/householdApi.test.ts src/db/__tests__/indexedDB.test.ts`.
  - Run static check / typecheck (0 errors): `cd QLHK-Client && npx tsc --noEmit`.
- CHECKPOINT & PROGRESS UPDATE:
  - If gotchas discovered: Append to `## Project Gotchas & Learned Invariants` in `docs/plans/qlhk-client/qlhk-client-optimization.task.md`.
  - Update `docs/plans/qlhk-client/qlhk-client-optimization.task.md`: Mark Step 1 as `[x]` Completed.
  - Commit: `git add -A && git commit -m "perf(roadmap): complete step 1 - HouseholdStore Single-Pass Statistical Aggregation [OPT-004]"`.
  - Verify clean: `test -z "$(git status --porcelain)"`.

---

### STEP 2: Household List Search & Age Filter Hot-Path Acceleration
- START STEP:
  + Update `docs/plans/qlhk-client/qlhk-client-optimization.task.md`: Mark Step 2 as `[/]` (In Progress) and review `## Project Gotchas & Learned Invariants`.
- PRE-REQUISITE READS (Tier 2 slice; skip file read if already anchored in active session):
  + Plan Section: `docs/plans/qlhk-client/qlhk-client-optimization.md` (Section 2: Household List Search & Age Filter Hot-Path Acceleration (Step 2))
  + Agent Role: `.agents/react-performance-optimization.md`
  + Role Focus: Eliminate redundant Unicode normalizations and string date parsing inside high-frequency filter loops. Enforce zero comments in code.
- GRAPH-MAP CHECK:
  + Command: `git grep -n "head_name_unaccented\|calculateAge" QLHK-Client/src/pages/HouseholdsPage.tsx`
- ACTIONS:
  1. In `QLHK-Client/src/pages/HouseholdsPage.tsx:198-206`, update search filter comparison to prioritize `(h.head_name_unaccented || normalizeUnaccented(h.head_name.toLowerCase())).includes(q)`.
  2. In `QLHK-Client/src/pages/HouseholdsPage.tsx:143-156`, update `matchesFilters` age comparison to use `typeof m.birth_year === "number" && m.birth_year > 1900 ? calculationYear - m.birth_year : calculateAge(m.dob_formatted || m.dob_raw || m.dob, calculationYear)`.
  3. Ensure ZERO COMMENTS IN CODE in all touched lines.
- SCOPE REVIEW & DIFF BUDGET GATE:
  1. Review working tree: `git status --short`.
  2. Run **DIFF GATE** (Invariant 5) -> Verify staged gross diff is `<= 200 LOC`.
- VERIFICATION:
  - Run scoped tests (zero new failures vs baseline; re-run any new failure once before counting as regression): `cd QLHK-Client && npx vitest run src/components/households/__tests__/HouseholdTable.test.tsx src/utils/__tests__/utilities.test.ts`.
  - Run static check / typecheck (0 errors): `cd QLHK-Client && npx tsc --noEmit`.
- CHECKPOINT & PROGRESS UPDATE:
  - If gotchas discovered: Append to `## Project Gotchas & Learned Invariants` in `docs/plans/qlhk-client/qlhk-client-optimization.task.md`.
  - Update `docs/plans/qlhk-client/qlhk-client-optimization.task.md`: Mark Step 2 as `[x]` Completed.
  - Commit: `git add -A && git commit -m "perf(roadmap): complete step 2 - Household List Search & Age Filter Hot-Path Acceleration [OPT-002]"`.
  - Verify clean: `test -z "$(git status --porcelain)"`.

---

### STEP 3: Analytics Dashboard Village Breakdown Decoupling
- START STEP:
  + Update `docs/plans/qlhk-client/qlhk-client-optimization.task.md`: Mark Step 3 as `[/]` (In Progress) and review `## Project Gotchas & Learned Invariants`.
- PRE-REQUISITE READS (Tier 2 slice; skip file read if already anchored in active session):
  + Plan Section: `docs/plans/qlhk-client/qlhk-client-optimization.md` (Section 3: Analytics Dashboard Village Breakdown Decoupling (Step 3))
  + Agent Role: `.agents/react-performance-optimization.md`
  + Role Focus: Decouple commune-wide breakdown calculation from village filter state to achieve O(1) filter response. Enforce zero comments in code.
- GRAPH-MAP CHECK:
  + Command: `git grep -n "villageStatsMap\|villageBreakdown" QLHK-Client/src/components/analytics/`
- ACTIONS:
  1. In `QLHK-Client/src/components/analytics/AnalyticsDashboard.tsx:258-320`, extract `villageBreakdown` calculation out of `localCalculated` into an independent `useMemo(() => ..., [activeHouseholds, villages])`.
  2. In `localCalculated`, when `selectedVillageId` is active, find the pre-aggregated village entry in O(1) from `villageBreakdown` to populate header totals, eliminating the second redundant traversal of active households.
  3. Keep all age distributions, education, and occupation charts intact.
  4. Ensure ZERO COMMENTS IN CODE in all touched lines.
- SCOPE REVIEW & DIFF BUDGET GATE:
  1. Review working tree: `git status --short`.
  2. Run **DIFF GATE** (Invariant 5) -> Verify staged gross diff is `<= 200 LOC`.
- VERIFICATION:
  - Run scoped tests (zero new failures vs baseline; re-run any new failure once before counting as regression): `cd QLHK-Client && npx vitest run src/components/analytics/__tests__/AnalyticsDashboard.test.tsx`.
  - Run static check / typecheck (0 errors): `cd QLHK-Client && npx tsc --noEmit`.
- CHECKPOINT & PROGRESS UPDATE:
  - If gotchas discovered: Append to `## Project Gotchas & Learned Invariants` in `docs/plans/qlhk-client/qlhk-client-optimization.task.md`.
  - Update `docs/plans/qlhk-client/qlhk-client-optimization.task.md`: Mark Step 3 as `[x]` Completed.
  - Commit: `git add -A && git commit -m "perf(roadmap): complete step 3 - Analytics Dashboard Village Breakdown Decoupling [OPT-003]"`.
  - Verify clean: `test -z "$(git status --porcelain)"`.

---

### STEP 4: Client Bundle Code-Splitting & Dynamic XLSX Loading
- START STEP:
  + Update `docs/plans/qlhk-client/qlhk-client-optimization.task.md`: Mark Step 4 as `[/]` (In Progress) and review `## Project Gotchas & Learned Invariants`.
- PRE-REQUISITE READS (Tier 2 slice; skip file read if already anchored in active session):
  + Plan Section: `docs/plans/qlhk-client/qlhk-client-optimization.md` (Section 4: Client Bundle Code-Splitting & Dynamic XLSX Loading (Step 4))
  + Agent Role: `.agents/frontend-developer.md`
  + Role Focus: Eliminate heavy XLSX library chunk from initial page preload through dynamic asynchronous imports. Enforce zero comments in code.
- GRAPH-MAP CHECK:
  + Command: `git grep -n "import.*from [\"']xlsx[\"']" QLHK-Client/src/`
- ACTIONS:
  1. In `QLHK-Client/src/utils/fileExport.ts:1-15`, replace static `import * as XLSX from "xlsx"` with dynamic import helper `loadXlsx = async () => await import("xlsx")`.
  2. In `QLHK-Client/src/pages/HouseholdsPage.tsx:10-18`, remove static `import * as XLSX from "xlsx"`. In `handleExportSpecialReport` and `handleExportFullHouseholdData`, dynamically load XLSX before creating workbook.
  3. In `QLHK-Client/src/components/analytics/AnalyticsDashboard.tsx:12`, remove static `import * as XLSX from "xlsx"`. In `handleExportExcel`, dynamically load XLSX before sheet generation.
  4. In `QLHK-Client/src/components/excel/ImportPreviewModal.tsx:17`, dynamically load XLSX inside `handleProcessFile`.
  5. In `HouseholdsPage.tsx`, lazy-load `ImportPreviewModal` using `React.lazy()`.
  6. Ensure ZERO COMMENTS IN CODE in all touched lines.
- SCOPE REVIEW & DIFF BUDGET GATE:
  1. Review working tree: `git status --short`.
  2. Run **DIFF GATE** (Invariant 5) -> Verify staged gross diff is `<= 200 LOC`.
- VERIFICATION:
  - Run scoped tests (zero new failures vs baseline; re-run any new failure once before counting as regression): `cd QLHK-Client && npm run build && npx vitest run tests/e2e/workflow.test.ts src/components/excel/__tests__/ExportSettingsModal.test.tsx src/components/excel/__tests__/ImportPreviewModal.test.tsx`.
  - Run static check / typecheck (0 errors): `cd QLHK-Client && npx tsc --noEmit`.
- CHECKPOINT & PROGRESS UPDATE:
  - If gotchas discovered: Append to `## Project Gotchas & Learned Invariants` in `docs/plans/qlhk-client/qlhk-client-optimization.task.md`.
  - Update `docs/plans/qlhk-client/qlhk-client-optimization.task.md`: Mark Step 4 as `[x]` Completed.
  - Commit: `git add -A && git commit -m "perf(roadmap): complete step 4 - Client Bundle Code-Splitting & Dynamic XLSX Loading [OPT-001]"`.
  - Verify clean: `test -z "$(git status --porcelain)"`.

---

### STEP 5: FULL SUITE VERIFICATION & ZERO-REGRESSION GATE
- START STEP:
  + Update `docs/plans/qlhk-client/qlhk-client-optimization.task.md`: Mark Step 5 as `[/]` (In Progress).
- ACTIONS:
  1. Run Full Test Suite: `cd QLHK-Client && npm test` (Zero new failures vs baseline; 17/17 test files and 169/169 tests passing).
  2. Run Typecheck: `cd QLHK-Client && npx tsc --noEmit` (0 errors).
  3. Run Production Build: `cd QLHK-Client && npm run build` (Verify build succeeds and `vendor-excel` chunk is eliminated from initial `dist/index.html` modulepreload).
  4. Run Zero Comments Audit: `git diff <BASE_BRANCH>...HEAD | grep -E '^\+[ ]*(\/\/|\/\*|\*\/|#)'` (Must exit 1 with 0 matches).
  5. Review Working Tree & Orphan Patches: `git status --short` (`docs/plans/qlhk-client/qlhk-client-optimization.task.md` changes expected; verify no temporary artifacts, untracked files, or leftover `.git/roadmap-stash/qlhk-client-optimization-*.patch` files).
  6. Update `docs/plans/qlhk-client/qlhk-client-optimization.task.md`: Mark Step 5 and all checklist items as `[x]` Completed, and record the `Finding ID -> commit hash` closure mapping under `## Finding Closure Mapping` in `docs/plans/qlhk-client/qlhk-client-optimization.task.md`:
     - `OPT-004 -> <commit_hash> (Step 1)`
     - `OPT-002 -> <commit_hash> (Step 2)`
     - `OPT-003 -> <commit_hash> (Step 3)`
     - `OPT-001 -> <commit_hash> (Step 4)`
  7. Final Commit: `git add -A && git commit -m "chore(roadmap): complete qlhk-client-optimization verification gate"`.
  8. Final Clean & No-Orphan-Patch Verification: `test -z "$(git status --porcelain)" && test -z "$(ls -A .git/roadmap-stash/qlhk-client-optimization-*.patch 2>/dev/null)"` (Must exit 0).
- POST-GATE COMPLETION & BRANCH HANDOFF:
  1. Remove `docs/plans/qlhk-client/qlhk-client-optimization.task.md` in a final cleanup commit by default (unless the user explicitly requested keeping it in the repository):
     `git rm docs/plans/qlhk-client/qlhk-client-optimization.task.md && git commit -m "chore(roadmap): remove qlhk-client-optimization.task.md" && test -z "$(git status --porcelain)"`
  2. List any preserved circuit-breaker WIP branches (`git branch --list "failed/qlhk-client-optimization/*"`) so the user can inspect or confirm deleting them (never delete `failed/qlhk-client-optimization/*` branches without explicit user confirmation), present the completion summary (commits created on `roadmap/qlhk-client-optimization` vs. `<BASE_BRANCH>`, plus the `OPT-ID -> commit hash` closure table), and ask the user how to proceed:
     - **Option 1**: Open a Pull Request from `roadmap/qlhk-client-optimization` into `<BASE_BRANCH>`.
     - **Option 2**: Merge `roadmap/qlhk-client-optimization` into `<BASE_BRANCH>` locally (`git switch "<BASE_BRANCH>" && git merge --no-ff "roadmap/qlhk-client-optimization"`).
     - **Option 3**: Leave the branch `roadmap/qlhk-client-optimization` as-is for manual inspection.

---

### SESSION HANDOFF CHECKPOINT TEMPLATE (Output after every 4 implementation steps in a session, unless Step 5 just finished)

When 4 implementation steps (`Step 0` excluded) are completed in the current session (or when requested by the user), and `Step 5` is not yet complete, run `cd QLHK-Client && npm test`, ensure clean git status, output the block below (replacing `<STEPS_COMPLETED_IN_SESSION>` with the actual count), and **STOP immediately** (do not start the next step in this session):

````text
### 🔄 Session Handoff Checkpoint

Completed <STEPS_COMPLETED_IN_SESSION> step(s) in this session on branch `roadmap/qlhk-client-optimization` (base branch: `<BASE_BRANCH>`). Full test suite verified.

To resume in a fresh session:
1. Read `docs/plans/qlhk-client/qlhk-client-optimization.roadmap.md` (the committed original roadmap prompt containing all `STRICT INVARIANTS` and step definitions) then continue — or paste the **ORIGINAL roadmap prompt** below as a fallback.
2. Append or send this resume block immediately after:

```text
Resume execution of the roadmap on branch `roadmap/qlhk-client-optimization` (base branch: `<BASE_BRANCH>`). Read `docs/plans/qlhk-client/qlhk-client-optimization.roadmap.md` (the committed original roadmap prompt) for all `STRICT INVARIANTS` and step definitions—or use the original roadmap prompt pasted above as a fallback.

CRITICAL: Do NOT re-execute STEP 0 or any step already marked `[x]` in `docs/plans/qlhk-client/qlhk-client-optimization.task.md`. The branch and tracker already exist—Invariant 1's `git switch -c` applies only to the initial fresh start.

Directives:
1. Switch to branch: `git switch roadmap/qlhk-client-optimization`
2. Working tree check:
   - If clean (`test -z "$(git status --porcelain)"` exits 0), proceed to Directive 3.
   - If dirty, inspect `docs/plans/qlhk-client/qlhk-client-optimization.task.md`:
     + If a step is marked `[/]` (In Progress), proceed to Directive 5 to evaluate WIP changes.
     + If dirty without an in-progress step, halt immediately and alert the user.
3. Context Anchoring (Tier 1): Read `docs/plans/qlhk-client/qlhk-client-optimization.task.md` (progress, known failures, gotchas) and the plan header (`docs/plans/qlhk-client/qlhk-client-optimization.md`). Emit mandatory verification log: `[Context Anchored]: qlhk-client-optimization.task.md (<status>), plan.md (<goal>)`.
4. Inspect `git log -n 3 --oneline` to confirm the last committed checkpoint.
5. If Step K is marked `[/]` (In Progress) with uncommitted WIP, inspect existing changes via `git status --short` before continuing.
6. If Step K is marked `[!]` (Blocked):
   - Review the failure reason logged in `docs/plans/qlhk-client/qlhk-client-optimization.task.md`.
   - Await user guidance on the resolution strategy.
   - Upon guidance, update `docs/plans/qlhk-client/qlhk-client-optimization.task.md` to mark Step K back to `[/]` (In Progress) and resume implementation from the clean Step K-1 commit.
7. Otherwise, proceed with the next pending `[ ]` step following the strict invariants and step definitions in the roadmap prompt pasted above.
```
````
`````
