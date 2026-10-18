`````text
[MANDATORY SYSTEM DIRECTIVE]:
You are executing a multi-step engineering task based on the verified plan at:
docs/plans/remediate-qlhk-optimizations.md

ENVIRONMENT REQUIREMENT:
All shell commands require a POSIX-compatible shell (Git Bash on Windows, WSL, Linux, or macOS).

STRICT INVARIANTS:
1. BRANCH & PRE-FLIGHT (Initial Start Only):
   - **Pre-Switch Detached-HEAD & Protected-Branch Guard**: Before creating `roadmap/remediate-qlhk-optimizations`, verify `HEAD` is not detached (`BASE_BRANCH=$(git branch --show-current)` and `test -n "$BASE_BRANCH"`; if empty/detached, halt immediately and ask the user to check out a named branch first). If `$BASE_BRANCH` is a protected branch (`main`, `master`, or `production`), ask the user whether to branch `roadmap/remediate-qlhk-optimizations` directly from `$BASE_BRANCH` (recording it as `Base Branch`) or switch to a feature/planning branch first.
   - Create and switch to isolated branch: `git switch -c roadmap/remediate-qlhk-optimizations`. If the branch already exists on a fresh start, halt immediately and ask the user whether to resume the existing branch or choose a new branch name. (When resuming via a Handoff Prompt, skip `STEP 0` and use `git switch roadmap/remediate-qlhk-optimizations`.)
   - Verify clean working tree: `test -z "$(git status --porcelain)"`.
   - Execute the baseline test command **twice** (`Run 1` and `Run 2`), record `Base Branch: <BASE_BRANCH>`, the passing count, and exact names of any tests failing in **either** run as "flaky/known failing" into `task.md`, and immediately commit `task.md`. Never build on an uncommitted dirty tree.
2. CONTEXTUAL INGESTION:
   - Read the designated plan section in a single tool-call turn before modifying code, unless already loaded in the active session context.
   - Follow the embedded `Role Focus` invariants and always review `## Project Gotchas & Learned Invariants` in `task.md` before starting a step.
3. GRAPH-AWARE BLAST RADIUS:
   - When a step specifies a `GRAPH-MAP CHECK`, check if the tool (`graft`, `graphify`, `codegraph`) is installed before querying callers/callees. Fall back to native grep or LSP find-references if unavailable.
4. SCOPE HYGIENE & DIFF GATE (<= 200 GROSS LOC):
   - After implementing changes and BEFORE staging, run `git status --short`. Note that `task.md` modifications (`[/]`) are expected—never reset or delete `task.md`. If out-of-scope files (`.env*`, scratch scripts, build artifacts) appear, reset (`git reset <file>`), delete, or add to `.gitignore`.
   - Run the **DIFF GATE** command to stage changes and verify gross diff size (added + deleted lines) <= 200 LOC per step, excluding lockfiles, migrations, fixtures, and `task.md` (note that binary files output `-\t-\t<path>` in `git diff --numstat` and naturally count as `0 LOC` in `awk '{s+=$1+$2}'`):
     ```bash
     git add -A && git diff --cached --numstat -- . \
       ':(exclude)*.lock' ':(exclude)*lock.json' \
       ':(exclude,glob)**/migrations/**' ':(exclude,glob)**/fixtures/**' \
       ':(exclude)task.md' \
       | awk '{s+=$1+$2} END{print (s?s:0) " LOC"}'
     ```
   - If > 200 gross LOC, unstage (`git reset`), split the step in `task.md` into `Step K.a` and `Step K.b` (without renumbering subsequent steps), and execute `Step K.a` first:
     1. Save the `Step K.b` changes to an isolated patch file inside `.git/` (so the working tree stays 100% clean):
        ```bash
        mkdir -p .git/roadmap-stash
        git diff -- <step_Kb_files> > ".git/roadmap-stash/remediate-qlhk-optimizations-K.b.patch"
        git checkout -- <step_Kb_files>
        git clean -fd -- <step_Kb_new_files>
        ```
     2. Record `Deferred Patch: .git/roadmap-stash/remediate-qlhk-optimizations-K.b.patch` under `Step K.b` in `task.md`. Never commit `Step K.b` changes inside `Step K.a`.
     3. When `Step K.b` starts, apply the saved patch via `git apply ".git/roadmap-stash/remediate-qlhk-optimizations-K.b.patch"`, and immediately after committing `Step K.b`, delete the patch file via `rm -f ".git/roadmap-stash/remediate-qlhk-optimizations-K.b.patch"`. Each committed sub-step (`Step K.a`, `Step K.b`) counts as **1 step** toward the 4-step session handoff counter (Invariant 8).
5. ATOMIC COMMITS & COMMIT HOOKS:
   - After scoped tests pass, update `task.md` (`[x]` + any new gotchas) and commit using semantic types (`feat`, `fix`, `refactor`, `test`, `perf`, `chore`):
     `git add -A && git commit -m "<type>(roadmap): complete step K - <title>"`
   - Never use `--no-verify`; hook failures caused by the agent's own change are code attempts; infrastructure/hook-tool failures are not.
   - Verify working tree is 100% clean after commit (`test -z "$(git status --porcelain)"`).
6. SAFE CIRCUIT BREAKER ROLLBACK & UNBLOCKING:
   - **What Counts as an Attempt**: A single cycle of implementing/modifying code for the current step (or sub-step `K.a`/`K.b`) followed by a failing scoped test, failing per-step static/typecheck command, or a pre-commit hook failure caused by the agent's own code change. Transient infrastructure, port, network, or hook-tool runner errors do NOT count as code attempts.
   - **Pre-Retry Reset Rule (Before Attempt 2 and Attempt 3)**: Before starting each retry attempt (`Attempt 2` or `Attempt 3`), you MUST reset all tracked and untracked code changes back to the last committed checkpoint while preserving `task.md`:
     ```bash
     cp task.md .git/roadmap-task.md.bak
     git restore --staged . && git checkout -- . && git clean -fd -e task.md
     mv .git/roadmap-task.md.bak task.md
     ```
   - **Counter Reset Rule**: The 3-attempt counter is scoped per step (or sub-step `K.a`/`K.b`) and resets to `0` when: (a) a step (or sub-step) passes verification and is committed (`[x]`), or (b) the user provides unblocking guidance after a `[!]` halt and the step is transitioned from `[!]` back to `[/]`.
   - If a step fails after 3 consecutive code attempts, preserve the 3rd attempt's WIP on a unique branch and restore `roadmap/remediate-qlhk-optimizations` cleanly:
     ```bash
     ATTEMPT_TS=$(date +%s)
     git switch -c "failed/remediate-qlhk-optimizations/step-K-attempt-${ATTEMPT_TS}"
     git add -A && git commit -m "wip: failed step K attempt after 3 tries"
     git switch "roadmap/remediate-qlhk-optimizations"
     git add task.md && git commit -m "chore(roadmap): mark step K blocked"
     ```
   - Halt and await user guidance. **Branch Retention Rule**: Never delete `failed/remediate-qlhk-optimizations/*` branches automatically; preserve them until the user explicitly confirms deletion after `STEP 6` completes.
   - Unblocking procedure: Once user provides guidance, ensure you are on `roadmap/remediate-qlhk-optimizations`, change `[!]` back to `[/]` in `task.md` (which resets the attempt counter to `0`), and retry Step K from the clean Step K-1 checkpoint.
7. SCOPED TESTS, PER-STEP STATIC CHECK, FLAKY POLICY VS FULL SUITE:
   - Run fast scoped tests AND the per-step static/typecheck command at each step.
   - Run the full test suite (`npm --prefix QLHK-Backend test && npm --prefix QLHK-Client test`) and full typecheck (`npm --prefix QLHK-Backend run build && npm --prefix QLHK-Client run build`) at session handoffs and at the final verification gate (`Step 6`).
   - **Flaky Test Policy**: The Step 0 baseline test run is executed **twice**; any test failing in **either** run is recorded under `Known Baseline / Flaky Failures` in `task.md`. During `STEP K`, handoffs, or `STEP 6`, any **new** test failure (not listed in `Known Baseline / Flaky Failures`) MUST be **re-run once** before being counted as a regression or code attempt failure (if it passes on the immediate re-run, log it as flaky in `task.md` under `## Project Gotchas & Learned Invariants` and do not count it as a regression).
   - Enforce zero confirmed new failures compared to the baseline recorded in Step 0.
   - If the full test suite still fails after re-running the failing test once at handoff, treat it as a blocked gate: inspect `git log -n 4 --oneline` and test checkpoints individually (or via `git bisect`) to isolate which step caused the regression. After isolating the culprit step, **always return to the branch tip before making any edits**: run `git bisect reset` (if bisect was used), then `git switch "roadmap/remediate-qlhk-optimizations"`, and verify with `git branch --show-current`.
8. FRESH CONTEXT HANDOFF (EVERY 4 IMPLEMENTATION STEPS IN SESSION OR ON USER REQUEST):
   - After completing 4 implementation steps (`Step 1`..`Step 5`, where each committed sub-step `Step K.a` or `Step K.b` counts as **1 step** toward the 4-step counter; `Step 0` does not count) in the current session, or immediately when requested by the user—**unless `Step 6` (the final step) has just completed**—run the full test suite, verify a clean working tree, output the embedded `SESSION HANDOFF CHECKPOINT` block at the bottom of this prompt, and **STOP immediately**. Do not start the next step in the current session.
9. MINIMAL WORKING DIFF:
   - Shortest working code, strict YAGNI, zero unrequested abstractions, zero temporary scratch scripts (`fix*.js`, `patch*.py`, `temp*`).

---

### STEP 0: BRANCH ISOLATION, PRE-FLIGHT GATE & TASK INITIALIZATION
1. Capture the current branch as `BASE_BRANCH` (`BASE_BRANCH=$(git branch --show-current)`), verify `HEAD` is not detached (`test -n "$BASE_BRANCH"`, halting if detached), and if `$BASE_BRANCH` is protected (`main`/`master`/`production`), confirm with the user whether to use it as `BASE_BRANCH` or switch first; then create and switch to branch: `git switch -c roadmap/remediate-qlhk-optimizations` (if branch already exists, halt and ask user whether to resume or rename).
2. Verify clean working tree: `test -z "$(git status --porcelain)"` (Must exit 0).
3. Capture baseline commit hash via `git rev-parse --short HEAD` and run baseline tests **twice**: `npm --prefix QLHK-Backend test && npm --prefix QLHK-Client test && npm --prefix QLHK-Backend test && npm --prefix QLHK-Client test` -> Record total passing count and exact names of any tests failing in **either** run as "flaky/known failing".
4. Create `task.md` at project root with this exact content:

```markdown
# Task Progress Tracker

- **Project**: QLHK Fullstack (QLHK-Backend & QLHK-Client)
- **Base Branch**: `<BASE_BRANCH>`
- **Branch**: `roadmap/remediate-qlhk-optimizations`
- **Plan Reference**: `docs/plans/remediate-qlhk-optimizations.md`
- **Roadmap Prompt Reference**: `docs/plans/remediate-qlhk-optimizations.roadmap.md`
- **Baseline Checkpoint**: `<BASELINE_HASH>` (<PASS_COUNT> passing, verified across 2 baseline runs)
- **Known Baseline / Flaky Failures (Failed in Either Baseline Run)**:
  - None
- **Status Legend**: 
  - `[ ]` Pending
  - `[/]` In Progress
  - `[x]` Completed
  - `[!]` Blocked (Circuit Breaker Tripped)

## Execution Checklist

- [ ] Step 1: Database GIN Trigram & Expiry Indexes
  - Finding IDs: `OPT-003`
  - Target Files: `QLHK-Backend/prisma/schema.prisma`
  - Role Focus: Database indexing, query planning, zero schema regression on existing foreign keys and constraints.
  - Graph Check: `graft ask "citizens model indexes" --source`
  - Diff Budget: <= 200 gross LOC
  - Verification: `npm --prefix QLHK-Backend test -- tests/security/crypto.test.ts`
  - Static Check: `npm --prefix QLHK-Backend run build`
- [ ] Step 2: Bulk Ingestion Batch Inserts with Pre-Generated UUIDs
  - Finding IDs: `OPT-001`
  - Target Files: `QLHK-Backend/src/controllers/excel.controller.ts`
  - Role Focus: Transaction minimization, connection contention avoidance, data integrity across 5 demographic fields.
  - Graph Check: `graft callers "importExcel"`
  - Diff Budget: <= 200 gross LOC
  - Verification: `npm --prefix QLHK-Backend test -- tests/integration/excel-import-demographics.test.ts`
  - Static Check: `npm --prefix QLHK-Backend run build`
- [ ] Step 3: SQL Age Aggregation & Asynchronous Compact Backup
  - Finding IDs: `OPT-002, OPT-008`
  - Target Files: `QLHK-Backend/src/controllers/analytics.controller.ts`, `QLHK-Backend/src/controllers/backup.controller.ts`
  - Role Focus: Elimination of in-memory heap pressure, non-blocking I/O, exact 100.0% Hare-Niemeyer math.
  - Graph Check: `graft callers "getOverview"`
  - Diff Budget: <= 200 gross LOC
  - Verification: `npm --prefix QLHK-Backend test -- tests/integration/api.test.ts`
  - Static Check: `npm --prefix QLHK-Backend run build`
- [ ] Step 4: Client Offline IndexedDB Cache Offload & Fast Search Filtering
  - Finding IDs: `OPT-004, OPT-005`
  - Target Files: `QLHK-Client/src/store/householdStore.ts`
  - Role Focus: Main thread unblocking, quota management (>5MB support), sub-millisecond search responsiveness.
  - Graph Check: `graft callers "useHouseholdStore"`
  - Diff Budget: <= 200 gross LOC
  - Verification: `npm --prefix QLHK-Client test -- src/db/__tests__/indexedDB.test.ts`
  - Static Check: `npm --prefix QLHK-Client run build`
- [ ] Step 5: Client Analytics Memoization & Table Row Component Memoization
  - Finding IDs: `OPT-006, OPT-007`
  - Target Files: `QLHK-Client/src/components/analytics/AnalyticsDashboard.tsx`, `QLHK-Client/src/components/households/HouseholdTable.tsx`
  - Role Focus: React re-render barriers, virtual DOM diffing reduction, memoization of expensive date calculations.
  - Graph Check: `graft callers "HouseholdTable"`
  - Diff Budget: <= 200 gross LOC
  - Verification: `npm --prefix QLHK-Client test -- src/components/analytics/__tests__/AnalyticsDashboard.test.tsx`
  - Static Check: `npm --prefix QLHK-Client run build`
- [ ] Step 6: Full Suite Verification & Zero-Regression Gate
  - Full Test Suite: `npm --prefix QLHK-Backend test && npm --prefix QLHK-Client test` (Zero new failures vs baseline)
  - Typecheck: `npm --prefix QLHK-Backend run build && npm --prefix QLHK-Client run build` (0 errors)
  - Clean Working Tree & No Orphan Patches: Verified (`test -z "$(git status --porcelain)" && test -z "$(ls -A .git/roadmap-stash 2>/dev/null)"`)

## Finding Closure Mapping
<!-- Populate at Step 6: OPT-001 -> <commit_hash> (Step 2), etc. -->

## Project Gotchas & Learned Invariants
```

5. Commit initial tracker: `git add task.md && git commit -m "chore(roadmap): init task.md"`.
6. Verify clean tree: `test -z "$(git status --porcelain)"`.

---

### STEP 1: Database GIN Trigram & Expiry Indexes
- START STEP:
  + Update `task.md`: Mark Step 1 as `[/]` (In Progress) and review `## Project Gotchas & Learned Invariants`.
- PRE-REQUISITE READS:
  + Plan Section: `docs/plans/remediate-qlhk-optimizations.md` (Section 1: Database GIN Trigram & Expiry Indexes)
  + Role Focus: Database indexing, query planning, zero schema regression on existing foreign keys and constraints.
- GRAPH-MAP CHECK:
  + Command: `graft ask "citizens model indexes" --source`
- ACTIONS:
  1. In `QLHK-Backend/prisma/schema.prisma`, add `@@index([expires_at])` to `model refresh_tokens`.
  2. In `QLHK-Backend/prisma/schema.prisma`, update `@@index([name_unaccented])` on `model citizens` to `@@index([name_unaccented(ops: raw("gin_trgm_ops"))], type: Gin)`.
  3. Run `cd QLHK-Backend && npx prisma generate && cd ..` to regenerate Prisma Client types.
- SCOPE REVIEW & DIFF BUDGET GATE:
  1. Review working tree: `git status --short`.
  2. Run **DIFF GATE** -> Verify staged gross diff is `<= 200 LOC`.
- VERIFICATION:
  - Run scoped tests: `npm --prefix QLHK-Backend test -- tests/security/crypto.test.ts`.
  - Run static check: `npm --prefix QLHK-Backend run build`.
- CHECKPOINT & PROGRESS UPDATE:
  - Update `task.md`: Mark Step 1 as `[x]` Completed.
  - Commit: `git add -A && git commit -m "perf(roadmap): complete step 1 - add GIN trigram and expiry indexes [OPT-003]"`.
  - Verify clean: `test -z "$(git status --porcelain)"`.

---

### STEP 2: Bulk Ingestion Batch Inserts with Pre-Generated UUIDs
- START STEP:
  + Update `task.md`: Mark Step 2 as `[/]` (In Progress) and review `## Project Gotchas & Learned Invariants`.
- PRE-REQUISITE READS:
  + Plan Section: `docs/plans/remediate-qlhk-optimizations.md` (Section 2: Bulk Ingestion Batch Inserts with Pre-Generated UUIDs)
  + Role Focus: Transaction minimization, connection contention avoidance, data integrity across 5 demographic fields.
- GRAPH-MAP CHECK:
  + Command: `graft callers "importExcel"`
- ACTIONS:
  1. In `QLHK-Backend/src/controllers/excel.controller.ts`, import `randomUUID` from `node:crypto`.
  2. In `importExcel`, refactor the chunk insertion loop to pre-generate `householdId = randomUUID()` for each household in the chunk.
  3. Group chunk insertions into a single `await tx.households.createMany({ data: chunkHouseholds })` and a single `await tx.citizens.createMany({ data: chunkCitizens })`, reducing 200 sequential queries per chunk down to 2 batch queries.
  4. Preserve all 5 demographic fields (`education`, `military_status`, `occupation`, `native_place`, `notes`) and dual CCCD encryption (`cccd`, `cccd_hash`, `cccd_last4`) untouched.
- SCOPE REVIEW & DIFF BUDGET GATE:
  1. Review working tree: `git status --short`.
  2. Run **DIFF GATE** -> Verify staged gross diff is `<= 200 LOC`.
- VERIFICATION:
  - Run scoped tests: `npm --prefix QLHK-Backend test -- tests/integration/excel-import-demographics.test.ts`.
  - Run static check: `npm --prefix QLHK-Backend run build`.
- CHECKPOINT & PROGRESS UPDATE:
  - Update `task.md`: Mark Step 2 as `[x]` Completed.
  - Commit: `git add -A && git commit -m "perf(roadmap): complete step 2 - batch insert households and citizens in bulk ingestion [OPT-001]"`.
  - Verify clean: `test -z "$(git status --porcelain)"`.

---

### STEP 3: SQL Age Aggregation & Asynchronous Compact Backup
- START STEP:
  + Update `task.md`: Mark Step 3 as `[/]` (In Progress) and review `## Project Gotchas & Learned Invariants`.
- PRE-REQUISITE READS:
  + Plan Section: `docs/plans/remediate-qlhk-optimizations.md` (Section 3: SQL Age Aggregation & Asynchronous Compact Backup)
  + Role Focus: Elimination of in-memory heap pressure, non-blocking I/O, exact 100.0% Hare-Niemeyer math.
- GRAPH-MAP CHECK:
  + Command: `graft callers "getOverview"`
- ACTIONS:
  1. In `QLHK-Backend/src/controllers/analytics.controller.ts`, replace `prisma.citizens.findMany({ where: citizenWhere, select: { dob: true } })` with a raw SQL conditional count query aggregating age brackets (`under16`, `youth`, `adult`, `over60`, `unknown_age`, `working_age`) directly in PostgreSQL.
  2. Pass the aggregated counts to `calculatePercentagesWithLargestRemainder` ensuring 100.0% sum invariant (`INV-03`).
  3. In `QLHK-Backend/src/controllers/backup.controller.ts`, replace `JSON.stringify(backupData, null, 2)` with compact `JSON.stringify(backupData)` and change `fs.writeFileSync` to `await fs.promises.writeFile`.
- SCOPE REVIEW & DIFF BUDGET GATE:
  1. Review working tree: `git status --short`.
  2. Run **DIFF GATE** -> Verify staged gross diff is `<= 200 LOC`.
- VERIFICATION:
  - Run scoped tests: `npm --prefix QLHK-Backend test -- tests/integration/api.test.ts`.
  - Run static check: `npm --prefix QLHK-Backend run build`.
- CHECKPOINT & PROGRESS UPDATE:
  - Update `task.md`: Mark Step 3 as `[x]` Completed.
  - Commit: `git add -A && git commit -m "perf(roadmap): complete step 3 - sql age aggregation and compact async backup [OPT-002, OPT-008]"`.
  - Verify clean: `test -z "$(git status --porcelain)"`.

---

### STEP 4: Client Offline IndexedDB Cache Offload & Fast Search Filtering
- START STEP:
  + Update `task.md`: Mark Step 4 as `[/]` (In Progress) and review `## Project Gotchas & Learned Invariants`.
- PRE-REQUISITE READS:
  + Plan Section: `docs/plans/remediate-qlhk-optimizations.md` (Section 4: Client Offline IndexedDB Cache Offload & Fast Search Filtering)
  + Role Focus: Main thread unblocking, quota management (>5MB support), sub-millisecond search responsiveness.
- GRAPH-MAP CHECK:
  + Command: `graft callers "useHouseholdStore"`
- ACTIONS:
  1. In `QLHK-Client/src/store/householdStore.ts`, import `setCache` from `../db/indexedDB`.
  2. Replace the synchronous `localStorage.setItem(STORAGE_KEY, JSON.stringify(households))` effect with a debounced (300ms) call to `setCache(STORAGE_KEY, households)`.
  3. In `searchedHouseholds`, update member search matching to check pre-computed `(m.name_unaccented || normalizeUnaccented(m.full_name)).includes(query)` and head matching `(h.head_name_unaccented || normalizeUnaccented(h.head_name)).includes(query)`, bypassing redundant Unicode NFD normalization on every keystroke.
- SCOPE REVIEW & DIFF BUDGET GATE:
  1. Review working tree: `git status --short`.
  2. Run **DIFF GATE** -> Verify staged gross diff is `<= 200 LOC`.
- VERIFICATION:
  - Run scoped tests: `npm --prefix QLHK-Client test -- src/db/__tests__/indexedDB.test.ts`.
  - Run static check: `npm --prefix QLHK-Client run build`.
- CHECKPOINT & PROGRESS UPDATE:
  - Update `task.md`: Mark Step 4 as `[x]` Completed.
  - Commit: `git add -A && git commit -m "perf(roadmap): complete step 4 - debounced indexeddb cache and fast unaccented search [OPT-004, OPT-005]"`.
  - Verify clean: `test -z "$(git status --porcelain)"`.

---

### STEP 5: Client Analytics Memoization & Table Row Component Memoization
- START STEP:
  + Update `task.md`: Mark Step 5 as `[/]` (In Progress) and review `## Project Gotchas & Learned Invariants`.
- PRE-REQUISITE READS:
  + Plan Section: `docs/plans/remediate-qlhk-optimizations.md` (Section 5: Client Analytics Memoization & Table Row Component Memoization)
  + Role Focus: React re-render barriers, virtual DOM diffing reduction, memoization of expensive date calculations.
- GRAPH-MAP CHECK:
  + Command: `graft callers "HouseholdTable"`
- ACTIONS:
  1. In `QLHK-Client/src/components/analytics/AnalyticsDashboard.tsx`, update `localCalculated` memo to prioritize reading `m.age` or `currentYear - m.birth_year` before running `parseAndValidateDob`.
  2. In `QLHK-Client/src/components/households/HouseholdTable.tsx`, extract the household row and expandable member sub-table into a `HouseholdRow` component memoized with `React.memo`.
  3. Pass minimal necessary props (`hh`, `idx`, `isSelected`, `isExpanded`, callbacks) so selecting a checkbox does not trigger re-rendering of all rows.
- SCOPE REVIEW & DIFF BUDGET GATE:
  1. Review working tree: `git status --short`.
  2. Run **DIFF GATE** -> Verify staged gross diff is `<= 200 LOC`.
- VERIFICATION:
  - Run scoped tests: `npm --prefix QLHK-Client test -- src/components/analytics/__tests__/AnalyticsDashboard.test.tsx`.
  - Run static check: `npm --prefix QLHK-Client run build`.
- CHECKPOINT & PROGRESS UPDATE:
  - Update `task.md`: Mark Step 5 as `[x]` Completed.
  - Commit: `git add -A && git commit -m "perf(roadmap): complete step 5 - dashboard age memoization and table row memo [OPT-006, OPT-007]"`.
  - Verify clean: `test -z "$(git status --porcelain)"`.

---

### STEP 6: FULL SUITE VERIFICATION & ZERO-REGRESSION GATE
- START STEP:
  + Update `task.md`: Mark Step 6 as `[/]` (In Progress).
- ACTIONS:
  1. Run Full Test Suite: `npm --prefix QLHK-Backend test && npm --prefix QLHK-Client test` (Zero new failures vs baseline).
  2. Run Typecheck: `npm --prefix QLHK-Backend run build && npm --prefix QLHK-Client run build` (0 errors).
  3. Review Working Tree & Orphan Patches: `git status --short` (`task.md` changes expected; verify no temporary artifacts, untracked files, or leftover `.git/roadmap-stash/*.patch` files).
  4. Update `task.md`: Mark Step 6 and all checklist items as `[x]` Completed, and record the `Finding ID -> commit hash` closure mapping under `## Finding Closure Mapping` in `task.md` and in the final completion summary:
     - `OPT-001 -> <commit_hash> (Step 2)`
     - `OPT-002 -> <commit_hash> (Step 3)`
     - `OPT-003 -> <commit_hash> (Step 1)`
     - `OPT-004 -> <commit_hash> (Step 4)`
     - `OPT-005 -> <commit_hash> (Step 4)`
     - `OPT-006 -> <commit_hash> (Step 5)`
     - `OPT-007 -> <commit_hash> (Step 5)`
     - `OPT-008 -> <commit_hash> (Step 3)`
  5. Final Commit: `git add -A && git commit -m "chore(roadmap): complete remediate-qlhk-optimizations verification gate"`.
  6. Final Clean & No-Orphan-Patch Verification: `test -z "$(git status --porcelain)" && test -z "$(ls -A .git/roadmap-stash 2>/dev/null)"` (Must exit 0).
- POST-GATE COMPLETION & BRANCH HANDOFF:
  1. Remove `task.md` in a final cleanup commit by default:
     `git rm task.md && git commit -m "chore(roadmap): remove task.md" && test -z "$(git status --porcelain)"`
  2. List any preserved circuit-breaker WIP branches (`git branch --list "failed/remediate-qlhk-optimizations/*"`) so the user can inspect or confirm deleting them, present the completion summary (commits created on `roadmap/remediate-qlhk-optimizations` vs. `<BASE_BRANCH>`, plus the `Finding ID -> commit hash` closure table), and ask the user how to proceed:
     - **Option 1**: Open a Pull Request from `roadmap/remediate-qlhk-optimizations` into `<BASE_BRANCH>`.
     - **Option 2**: Merge `roadmap/remediate-qlhk-optimizations` into `<BASE_BRANCH>` locally (`git switch "<BASE_BRANCH>" && git merge --no-ff "roadmap/remediate-qlhk-optimizations"`).
     - **Option 3**: Leave the branch `roadmap/remediate-qlhk-optimizations` as-is for manual inspection.

---

### SESSION HANDOFF CHECKPOINT TEMPLATE (Output after every 4 implementation steps in a session, unless Step N just finished)

When 4 implementation steps (`Step 0` excluded) are completed in the current session (or when requested by the user), and `Step 6` is not yet complete, run `npm --prefix QLHK-Backend test && npm --prefix QLHK-Client test`, ensure clean git status, output the block below (replacing `<STEPS_COMPLETED_IN_SESSION>` with the actual count), and **STOP immediately** (do not start the next step in this session):

````text
### 🔄 Session Handoff Checkpoint

Completed <STEPS_COMPLETED_IN_SESSION> step(s) in this session on branch `roadmap/remediate-qlhk-optimizations` (base branch: `<BASE_BRANCH>`). Full test suite verified.

To resume in a fresh session:
1. Read `docs/plans/remediate-qlhk-optimizations.roadmap.md` (the committed original roadmap prompt containing all `STRICT INVARIANTS` and step definitions) then continue — or paste the **ORIGINAL roadmap prompt** below as a fallback.
2. Append or send this resume block immediately after:

```text
Resume execution of the roadmap on branch `roadmap/remediate-qlhk-optimizations` (base branch: `<BASE_BRANCH>`). Read `docs/plans/remediate-qlhk-optimizations.roadmap.md` (the committed original roadmap prompt) for all `STRICT INVARIANTS` and step definitions—or use the original roadmap prompt pasted above as a fallback.

CRITICAL: Do NOT re-execute STEP 0 or any step already marked `[x]` in `task.md`. The branch and `task.md` already exist—Invariant 1's `git switch -c` applies only to the initial fresh start.

Directives:
1. Switch to branch: `git switch roadmap/remediate-qlhk-optimizations`
2. Working tree check:
   - If clean (`test -z "$(git status --porcelain)"` exits 0), proceed to Directive 3.
   - If dirty, inspect `task.md`:
     + If a step is marked `[/]` (In Progress), proceed to Directive 5 to evaluate WIP changes.
     + If dirty without an in-progress step, halt immediately and alert the user.
3. Read `task.md` to review `Base Branch`, progress, known baseline/flaky failures, and `## Project Gotchas & Learned Invariants`.
4. Inspect `git log -n 3 --oneline` to confirm the last committed checkpoint.
5. If Step K is marked `[/]` (In Progress) with uncommitted WIP, inspect existing changes via `git status --short` before continuing.
6. If Step K is marked `[!]` (Blocked):
   - Review the failure reason logged in `task.md`.
   - Await user guidance on the resolution strategy.
   - Upon guidance, update `task.md` to mark Step K back to `[/]` (In Progress) and resume implementation from the clean Step K-1 commit.
7. Otherwise, proceed with the next pending `[ ]` step following the strict invariants and step definitions in the roadmap prompt pasted above.
```
````
`````
