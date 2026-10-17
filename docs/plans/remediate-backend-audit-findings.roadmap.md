`````text
[MANDATORY SYSTEM DIRECTIVE]:
You are executing a multi-step engineering task based on the verified plan at:
docs/plans/remediate-backend-audit-findings.md

ENVIRONMENT REQUIREMENT:
All shell commands require a POSIX-compatible shell (Git Bash on Windows, WSL, Linux, or macOS).

STRICT INVARIANTS:
1. BRANCH & PRE-FLIGHT (Initial Start Only):
   - **Pre-Switch Detached-HEAD & Protected-Branch Guard**: Before creating `roadmap/remediate-backend-audit-findings`, verify `HEAD` is not detached (`BASE_BRANCH=$(git branch --show-current)` and `test -n "$BASE_BRANCH"`; if empty/detached, halt immediately and ask the user to check out a named branch first). If `$BASE_BRANCH` is a protected branch (`main`, `master`, or `production`), ask the user whether to branch `roadmap/remediate-backend-audit-findings` directly from `$BASE_BRANCH` (recording it as `Base Branch`) or switch to a feature/planning branch first.
   - Create and switch to isolated branch: `git switch -c roadmap/remediate-backend-audit-findings`. If the branch already exists on a fresh start, halt immediately and ask the user whether to resume the existing branch or choose a new branch name. (When resuming via a Handoff Prompt, skip `STEP 0` and use `git switch roadmap/remediate-backend-audit-findings`.)
   - Verify clean working tree: `test -z "$(git status --porcelain)"`.
   - Execute the baseline test command **twice** (`Run 1` and `Run 2`), record `Base Branch: <BASE_BRANCH>`, the passing count, and exact names of any tests failing in **either** run as "flaky/known failing" into `task.md`, and immediately commit `task.md`. Never build on an uncommitted dirty tree.
2. CONTEXTUAL INGESTION:
   - Read the designated plan section in a single parallel tool-call turn before modifying code, unless already loaded in the active session context.
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
        git diff -- <step_Kb_files> > ".git/roadmap-stash/remediate-backend-audit-findings-K.b.patch"
        git checkout -- <step_Kb_files>
        git clean -fd -- <step_Kb_new_files>
        ```
     2. Record `Deferred Patch: .git/roadmap-stash/remediate-backend-audit-findings-K.b.patch` under `Step K.b` in `task.md`. Never commit `Step K.b` changes inside `Step K.a`.
     3. When `Step K.b` starts, apply the saved patch via `git apply ".git/roadmap-stash/remediate-backend-audit-findings-K.b.patch"`, and immediately after committing `Step K.b`, delete the patch file via `rm -f ".git/roadmap-stash/remediate-backend-audit-findings-K.b.patch"`. Each committed sub-step (`Step K.a`, `Step K.b`) counts as **1 step** toward the 4-step session handoff counter (Invariant 8).
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
   - If a step fails after 3 consecutive code attempts, preserve the 3rd attempt's WIP on a unique branch and restore `roadmap/remediate-backend-audit-findings` cleanly:
     ```bash
     ATTEMPT_TS=$(date +%s)
     git switch -c "failed/remediate-backend-audit-findings/step-K-attempt-${ATTEMPT_TS}"
     git add -A && git commit -m "wip: failed step K attempt after 3 tries"
     git switch "roadmap/remediate-backend-audit-findings"
     git add task.md && git commit -m "chore(roadmap): mark step K blocked"
     ```
   - Halt and await user guidance. Never delete `failed/remediate-backend-audit-findings/*` branches automatically; preserve them until user explicitly confirms deletion after `STEP N` completes.
   - Unblocking procedure: Once user provides guidance, ensure you are on `roadmap/remediate-backend-audit-findings`, change `[!]` back to `[/]` in `task.md`, and retry Step K from the clean Step K-1 checkpoint.
7. SCOPED TESTS, PER-STEP STATIC CHECK, FLAKY POLICY VS FULL SUITE:
   - Run fast scoped tests AND the per-step static/typecheck command (`cd QLHK-Backend && npx tsc --noEmit`) at each step.
   - Run the full test suite and full typecheck at session handoffs and at the final verification gate (`Step 3`).
   - **Flaky Test Policy**: The Step 0 baseline test run is executed **twice**; any test failing in **either** run is recorded under `Known Baseline / Flaky Failures` in `task.md`. During `STEP K`, handoffs, or `STEP 3`, any **new** test failure (not listed in `Known Baseline / Flaky Failures`) MUST be **re-run once** before being counted as a regression or code attempt failure.
   - Enforce zero confirmed new failures compared to the baseline recorded in Step 0.
8. FRESH CONTEXT HANDOFF (EVERY 4 IMPLEMENTATION STEPS IN SESSION OR ON USER REQUEST):
   - After completing 4 implementation steps in the current session, or immediately when requested by the user—**unless `Step 3` (the final step) has just completed**—run the full test suite, verify a clean working tree, output the embedded `SESSION HANDOFF CHECKPOINT` block, and **STOP immediately**.
9. MINIMAL WORKING DIFF:
   - Shortest working code, strict YAGNI, zero unrequested abstractions, zero temporary scratch scripts (`fix*.js`, `patch*.py`, `temp*`).

---

### STEP 0: BRANCH ISOLATION, PRE-FLIGHT GATE & TASK INITIALIZATION
1. Capture the current branch as `BASE_BRANCH` (`BASE_BRANCH=$(git branch --show-current)`), verify `HEAD` is not detached (`test -n "$BASE_BRANCH"`, halting if detached), and if `$BASE_BRANCH` is protected (`main`/`master`/`production`), confirm with the user whether to use it as `BASE_BRANCH` or switch first; then create and switch to branch: `git switch -c roadmap/remediate-backend-audit-findings` (if branch already exists, halt and ask user whether to resume or rename).
2. Verify clean working tree: `test -z "$(git status --porcelain)"` (Must exit 0).
3. Capture baseline commit hash via `git rev-parse --short HEAD` and run baseline tests **twice**: `cd QLHK-Backend && npm test && npm test` -> Record total passing count and exact names of any tests failing in **either** run as "flaky/known failing".
4. Create `task.md` at project root with this exact content (replace `<BASE_BRANCH>`, `<BASELINE_HASH>`, and `<PASS_COUNT>` with actual values from steps 1 and 3):

```markdown
# Task Progress Tracker

- **Project**: QLHK-Backend
- **Base Branch**: `<BASE_BRANCH>`
- **Branch**: `roadmap/remediate-backend-audit-findings`
- **Plan Reference**: `docs/plans/remediate-backend-audit-findings.md`
- **Roadmap Prompt Reference**: `docs/plans/remediate-backend-audit-findings.roadmap.md`
- **Baseline Checkpoint**: `<BASELINE_HASH>` (<PASS_COUNT> passing, verified across 2 baseline runs)
- **Known Baseline / Flaky Failures (Failed in Either Baseline Run)**:
  - None
- **Status Legend**: 
  - `[ ]` Pending
  - `[/]` In Progress
  - `[x]` Completed
  - `[!]` Blocked (Circuit Breaker Tripped)

## Execution Checklist

- [ ] Step 1: Fix Demographics Persistence and Placeholder CCCD Handling in Excel Import
  - Finding IDs: `BUG-001`, `BUG-002`
  - Target Files: `QLHK-Backend/src/controllers/excel.controller.ts`, `QLHK-Backend/tests/integration/excel-import-demographics.test.ts`
  - Role Focus: Excel data ingestion, CCCD validation, and demographic persistence invariants
  - Graph Check: `graft callers importExcel || grep -rn "importExcel" src/`
  - Diff Budget: <= 200 gross LOC
  - Verification: `cd QLHK-Backend && npx vitest run tests/integration/excel-import-demographics.test.ts`
  - Static Check: `cd QLHK-Backend && npx tsc --noEmit`
- [ ] Step 2: Support Full 9/12-Digit CCCD Hash Matching in Citizens Search
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
```

5. Commit initial tracker: `git add task.md && git commit -m "chore(roadmap): init task.md"`.
6. Verify clean tree: `test -z "$(git status --porcelain)"`.

---

### STEP 1: Fix Demographics Persistence and Placeholder CCCD Handling in Excel Import
- START STEP:
  + Update `task.md`: Mark Step 1 as `[/]` (In Progress) and review `## Project Gotchas & Learned Invariants`.
- PRE-REQUISITE READS (Parallel call; skip file read if already in active session context):
  + Plan Section: `docs/plans/remediate-backend-audit-findings.md` (Section 1: Fix Demographics Persistence and Placeholder CCCD Handling in Excel Import (Step 1))
  + Role Focus: Excel data ingestion, CCCD validation, and demographic persistence invariants
- GRAPH-MAP CHECK:
  + Command: `graft callers importExcel || grep -rn "importExcel" src/`
- ACTIONS:
  1. In `QLHK-Backend/src/controllers/excel.controller.ts`, sanitize `m.cccd` prior to encryption using `/^\d{9,12}$/` regex and placeholder checks (matching `households.controller.ts:371-379`), setting `cccdCipher`, `cccdHash`, and `cccdLast4` to `null` if invalid.
  2. In `QLHK-Backend/src/controllers/excel.controller.ts`, map `education`, `military_status`, `occupation`, and `native_place` into the `citizensData` object passed to `tx.citizens.createMany`.
  3. Create permanent integration test `QLHK-Backend/tests/integration/excel-import-demographics.test.ts` asserting demographic preservation and placeholder CCCD sanitization.
- SCOPE REVIEW & DIFF BUDGET GATE:
  1. Review working tree: `git status --short` (`task.md` changes are expected; reset or remove any out-of-scope files before staging).
  2. Run **DIFF GATE** (Invariant 4) -> Verify staged gross diff is `<= 200 LOC`.
- VERIFICATION:
  - Run scoped tests: `cd QLHK-Backend && npx vitest run tests/integration/excel-import-demographics.test.ts`.
  - Run static check / typecheck: `cd QLHK-Backend && npx tsc --noEmit`.
- CHECKPOINT & PROGRESS UPDATE:
  - If gotchas discovered: Append to `## Project Gotchas & Learned Invariants` in `task.md`.
  - Update `task.md`: Mark Step 1 as `[x]` Completed.
  - Commit: `git add -A && git commit -m "fix(roadmap): complete step 1 - fix demographic persistence and placeholder cccd in excel import [BUG-001] [BUG-002]"`.
  - Verify clean: `test -z "$(git status --porcelain)"`.

---

### STEP 2: Support Full 9/12-Digit CCCD Hash Matching in Citizens Search
- START STEP:
  + Update `task.md`: Mark Step 2 as `[/]` (In Progress) and review `## Project Gotchas & Learned Invariants`.
- PRE-REQUISITE READS (Parallel call; skip file read if already in active session context):
  + Plan Section: `docs/plans/remediate-backend-audit-findings.md` (Section 2: Support Full 9/12-Digit CCCD Hash Matching in Citizens Search (Step 2))
  + Role Focus: Citizen query sanitization, exact CCCD hash lookup, and database index utilization
- GRAPH-MAP CHECK:
  + Command: `graft callers getCitizens || grep -rn "getCitizens" src/`
- ACTIONS:
  1. In `QLHK-Backend/src/controllers/citizens.controller.ts`, update `search` parameter handling in `getCitizens` to parse `cleanDigits = rawSearch.replace(/\D/g, "")` and append `{ cccd_hash: hashCCCD(cleanDigits) }` to `where.OR` when `cleanDigits.length === 9 || cleanDigits.length === 12`.
  2. Create permanent integration test `QLHK-Backend/tests/integration/citizens-search-cccd.test.ts` verifying citizen resolution by full 12-digit and 9-digit CCCD in `?search`.
- SCOPE REVIEW & DIFF BUDGET GATE:
  1. Review working tree: `git status --short` (`task.md` changes are expected; reset or remove any out-of-scope files before staging).
  2. Run **DIFF GATE** (Invariant 4) -> Verify staged gross diff is `<= 200 LOC`.
- VERIFICATION:
  - Run scoped tests: `cd QLHK-Backend && npx vitest run tests/integration/citizens-search-cccd.test.ts`.
  - Run static check / typecheck: `cd QLHK-Backend && npx tsc --noEmit`.
- CHECKPOINT & PROGRESS UPDATE:
  - If gotchas discovered: Append to `## Project Gotchas & Learned Invariants` in `task.md`.
  - Update `task.md`: Mark Step 2 as `[x]` Completed.
  - Commit: `git add -A && git commit -m "fix(roadmap): complete step 2 - support full cccd hash matching in citizen search [BUG-003]"`.
  - Verify clean: `test -z "$(git status --porcelain)"`.

---

### STEP 3: FULL SUITE VERIFICATION & ZERO-REGRESSION GATE
- START STEP:
  + Update `task.md`: Mark Step 3 as `[/]` (In Progress).
- ACTIONS:
  1. Run Full Test Suite: `cd QLHK-Backend && npm test` (Zero new failures vs baseline).
  2. Run Typecheck: `cd QLHK-Backend && npx tsc --noEmit` (0 errors).
  3. Review Working Tree & Orphan Patches: `git status --short` (`task.md` changes expected; verify no temporary artifacts, untracked files, or leftover `.git/roadmap-stash/*.patch` files).
  4. Update `task.md`: Mark Step 3 and all checklist items as `[x]` Completed, and record the `Finding ID -> commit hash` closure mapping under `## Finding Closure Mapping` in `task.md`.
  5. Final Commit: `git add -A && git commit -m "chore(roadmap): complete remediate-backend-audit-findings verification gate"`.
  6. Final Clean & No-Orphan-Patch Verification: `test -z "$(git status --porcelain)" && test -z "$(ls -A .git/roadmap-stash 2>/dev/null)"` (Must exit 0).
- POST-GATE COMPLETION & BRANCH HANDOFF:
  1. Remove `task.md` in a final cleanup commit:
     `git rm task.md && git commit -m "chore(roadmap): remove task.md" && test -z "$(git status --porcelain)"`
  2. Present completion summary and ask user how to proceed (Merge into `<BASE_BRANCH>`, open PR, or leave branch as-is).

---

### 🔄 Session Handoff Checkpoint

Completed <STEPS_COMPLETED_IN_SESSION> step(s) in this session on branch `roadmap/remediate-backend-audit-findings` (base branch: `<BASE_BRANCH>`). Full test suite verified.

To resume in a fresh session:
1. Read `docs/plans/remediate-backend-audit-findings.roadmap.md` (the committed original roadmap prompt containing all `STRICT INVARIANTS` and step definitions) then continue — or paste the **ORIGINAL roadmap prompt** below as a fallback.
2. Append or send this resume block immediately after:

```text
Resume execution of the roadmap on branch `roadmap/remediate-backend-audit-findings` (base branch: `<BASE_BRANCH>`). Read `docs/plans/remediate-backend-audit-findings.roadmap.md` (the committed original roadmap prompt) for all `STRICT INVARIANTS` and step definitions—or use the original roadmap prompt pasted above as a fallback.

CRITICAL: Do NOT re-execute STEP 0 or any step already marked `[x]` in `task.md`. The branch and `task.md` already exist—Invariant 1's `git switch -c` applies only to the initial fresh start.

Directives:
1. Switch to branch: `git switch roadmap/remediate-backend-audit-findings`
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
`````
