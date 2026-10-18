`````text
[MANDATORY SYSTEM DIRECTIVE]:
You are executing a multi-step engineering task based on the verified plan at:
docs/plans/remediate-optimization-findings.md

ENVIRONMENT REQUIREMENT:
All shell commands require a POSIX-compatible shell (Git Bash on Windows, WSL, Linux, or macOS).

STRICT INVARIANTS:
1. BRANCH & PRE-FLIGHT (Initial Start Only):
   - **Pre-Switch Detached-HEAD & Protected-Branch Guard**: Before creating `roadmap/remediate-optimization-findings`, verify `HEAD` is not detached (`BASE_BRANCH=$(git branch --show-current)` and `test -n "$BASE_BRANCH"`; if empty/detached, halt immediately and ask the user to check out a named branch first). If `$BASE_BRANCH` is a protected branch (`main`, `master`, or `production`), ask the user whether to branch `roadmap/remediate-optimization-findings` directly from `$BASE_BRANCH` (recording it as `Base Branch`) or switch to a feature/planning branch first.
   - Create and switch to isolated branch: `git switch -c roadmap/remediate-optimization-findings`. If the branch already exists on a fresh start, halt immediately and ask the user whether to resume the existing branch or choose a new branch name. (When resuming via a Handoff Prompt, skip `STEP 0` and use `git switch roadmap/remediate-optimization-findings`.)
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
        git diff -- <step_Kb_files> > ".git/roadmap-stash/remediate-optimization-findings-K.b.patch"
        git checkout -- <step_Kb_files>
        git clean -fd -- <step_Kb_new_files>
        ```
        *(Or if `Step K.b` includes untracked files, stage only `Step K.b` files first and use `git diff --cached --binary > ".git/roadmap-stash/remediate-optimization-findings-K.b.patch" && git reset --hard` while preserving `task.md`.)*
     2. Record `Deferred Patch: .git/roadmap-stash/remediate-optimization-findings-K.b.patch` under `Step K.b` in `task.md`. Never commit `Step K.b` changes inside `Step K.a`.
     3. When `Step K.b` starts, apply the saved patch via `git apply ".git/roadmap-stash/remediate-optimization-findings-K.b.patch"`, and immediately after committing `Step K.b`, delete the patch file via `rm -f ".git/roadmap-stash/remediate-optimization-findings-K.b.patch"`. Each committed sub-step (`Step K.a`, `Step K.b`) counts as **1 step** toward the 4-step session handoff counter (Invariant 8).
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
   - If a step fails after 3 consecutive code attempts, preserve the 3rd attempt's WIP on a unique branch and restore `roadmap/remediate-optimization-findings` cleanly:
     ```bash
     ATTEMPT_TS=$(date +%s)
     git switch -c "failed/remediate-optimization-findings/step-K-attempt-${ATTEMPT_TS}"
     git add -A && git commit -m "wip: failed step K attempt after 3 tries"
     git switch "roadmap/remediate-optimization-findings"
     # Update task.md to mark [!] and log failure reason, then commit on roadmap branch:
     git add task.md && git commit -m "chore(roadmap): mark step K blocked"
     ```
   - Halt and await user guidance. **Branch Retention Rule**: Never delete `failed/remediate-optimization-findings/*` branches automatically; preserve them until the user explicitly confirms deletion after `STEP 6` completes.
   - Unblocking procedure: Once user provides guidance, ensure you are on `roadmap/remediate-optimization-findings`, change `[!]` back to `[/]` in `task.md` (which resets the attempt counter to `0`), and retry Step K from the clean Step K-1 checkpoint.
7. SCOPED TESTS, PER-STEP STATIC CHECK, FLAKY POLICY VS FULL SUITE:
   - Run fast scoped tests AND the per-step static/typecheck command (`cd QLHK-Backend && npx tsc --noEmit && cd ../QLHK-Client && npx tsc --noEmit`) at each step.
   - Run the full test suite and full typecheck at session handoffs and at the final verification gate (`Step 6`).
   - **Flaky Test Policy**: The Step 0 baseline test run is executed **twice**; any test failing in **either** run is recorded under `Known Baseline / Flaky Failures` in `task.md`. During `STEP K`, handoffs, or `STEP 6`, any **new** test failure (not listed in `Known Baseline / Flaky Failures`) MUST be **re-run once** before being counted as a regression or code attempt failure (if it passes on the immediate re-run, log it as flaky in `task.md` under `## Project Gotchas & Learned Invariants` and do not count it as a regression).
   - Enforce zero confirmed new failures compared to the baseline recorded in Step 0.
   - If the full test suite still fails after re-running the failing test once at handoff, treat it as a blocked gate: inspect `git log -n 4 --oneline` and test checkpoints individually (or via `git bisect`) to isolate which step caused the regression. After isolating the culprit step, **always return to the branch tip before making any edits**: run `git bisect reset` (if bisect was used), then `git switch "roadmap/remediate-optimization-findings"`, and verify with `git branch --show-current`.
8. FRESH CONTEXT HANDOFF (EVERY 4 IMPLEMENTATION STEPS IN SESSION OR ON USER REQUEST):
   - After completing 4 implementation steps (`Step 1`..`Step 5`, where each committed sub-step `Step K.a` or `Step K.b` counts as **1 step** toward the 4-step counter; `Step 0` does not count) in the current session, or immediately when requested by the user—**unless `Step 6` (the final step) has just completed**—run the full test suite, verify a clean working tree, output the embedded `SESSION HANDOFF CHECKPOINT` block at the bottom of this prompt, and **STOP immediately**. Do not start the next step in the current session.
9. MINIMAL WORKING DIFF:
   - Shortest working code, strict YAGNI, zero unrequested abstractions, zero temporary scratch scripts (`fix*.js`, `patch*.py`, `temp*`).

---

### STEP 0: BRANCH ISOLATION, PRE-FLIGHT GATE & TASK INITIALIZATION
1. Capture the current branch as `BASE_BRANCH` (`BASE_BRANCH=$(git branch --show-current)`), verify `HEAD` is not detached (`test -n "$BASE_BRANCH"`, halting if detached), and if `$BASE_BRANCH` is protected (`main`/`master`/`production`), confirm with the user whether to use it as `BASE_BRANCH` or switch first; then create and switch to branch: `git switch -c roadmap/remediate-optimization-findings` (if branch already exists, halt and ask user whether to resume or rename).
2. Verify clean working tree: `test -z "$(git status --porcelain)"` (Must exit 0).
3. Capture baseline commit hash via `git rev-parse --short HEAD` and run baseline tests **twice**: `(cd QLHK-Backend && npm test && cd ../QLHK-Client && npm test) && (cd QLHK-Backend && npm test && cd ../QLHK-Client && npm test)` -> Record total passing count and exact names of any tests failing in **either** run as "flaky/known failing".
4. Create `task.md` at project root with this exact content (replace `<BASE_BRANCH>`, `<BASELINE_HASH>`, and `<PASS_COUNT>` with actual values from steps 1 and 3):

```markdown
# Task Progress Tracker

- **Project**: QLHK Fullstack
- **Base Branch**: `<BASE_BRANCH>`
- **Branch**: `roadmap/remediate-optimization-findings`
- **Plan Reference**: `docs/plans/remediate-optimization-findings.md`
- **Roadmap Prompt Reference**: `docs/plans/remediate-optimization-findings.roadmap.md`
- **Baseline Checkpoint**: `<BASELINE_HASH>` (<PASS_COUNT> passing, verified across 2 baseline runs)
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
```

5. Commit initial tracker: `git add task.md && git commit -m "chore(roadmap): init task.md"`.
6. Verify clean tree: `test -z "$(git status --porcelain)"`.

---

### STEP 1: Batch Audit Logging in Backend Batch Delete
- START STEP:
  + Update `task.md`: Mark Step 1 as `[/]` (In Progress) and review `## Project Gotchas & Learned Invariants` (if executing a deferred `Step 1.b`, apply `.git/roadmap-stash/remediate-optimization-findings-1.b.patch` via `git apply`).
- PRE-REQUISITE READS (Parallel call; skip file read if already in active session context):
  + Plan Section: `docs/plans/remediate-optimization-findings.md` (Section 1: Batch Audit Logging in Backend Batch Delete (Step 1))
  + Role Focus: Database I/O efficiency, atomic batch transactions, preserving audit log schema.
- GRAPH-MAP CHECK (Omit if standalone/greenfield):
  + Command: `graft callers "logAudit"` (fallback: `grep -rn "logAudit" QLHK-Backend/src`)
- ACTIONS:
  1. In `QLHK-Backend/src/utils/audit.ts`, implement and export `logAuditBatch(items: AuditParams[])`: validate `userId` once via `prisma.users.findUnique` if provided, validate `villageId` regex, and insert all mapped records with `await prisma.audit_logs.createMany({ data: mappedEntries })`.
  2. In `QLHK-Backend/src/controllers/households.controller.ts:999-1009`, replace the serial `for (const h of households) { await logAudit(...) }` loop with a single `await logAuditBatch(auditItems)` call.
- SCOPE REVIEW & DIFF BUDGET GATE:
  1. Review working tree: `git status --short` (`task.md` changes are expected—do not reset or delete `task.md`; reset or remove any out-of-scope files before staging).
  2. Run **DIFF GATE** (Invariant 4) -> Verify staged gross diff is `<= 200 LOC` (if > 200 LOC, unstage, write `Step 1.b` changes to `.git/roadmap-stash/remediate-optimization-findings-1.b.patch`, record its path in `task.md`, clean `Step 1.b` changes from working tree, and split into `Step 1.a` / `Step 1.b` in `task.md`).
- VERIFICATION:
  - Run scoped tests (zero new failures vs baseline; re-run any new failure once before counting as regression): `cd QLHK-Backend && npx vitest run tests/integration/households.test.ts`.
  - Run static check / typecheck (optional-but-default; 0 errors): `cd QLHK-Backend && npx tsc --noEmit && cd ../QLHK-Client && npx tsc --noEmit`.
- CHECKPOINT & PROGRESS UPDATE:
  - If gotchas discovered: Append to `## Project Gotchas & Learned Invariants` in `task.md`.
  - Update `task.md`: Mark Step 1 as `[x]` Completed.
  - Commit: `git add -A && git commit -m "perf(roadmap): complete step 1 - Batch Audit Logging in Backend Batch Delete [OPT-004]"`.
  - Verify clean: `test -z "$(git status --porcelain)"`.

---

### STEP 2: Chunked Batch Insert for Excel Import Ingestion
- START STEP:
  + Update `task.md`: Mark Step 2 as `[/]` (In Progress) and review `## Project Gotchas & Learned Invariants` (if executing a deferred `Step 2.b`, apply `.git/roadmap-stash/remediate-optimization-findings-2.b.patch` via `git apply`).
- PRE-REQUISITE READS (Parallel call; skip file read if already in active session context):
  + Plan Section: `docs/plans/remediate-optimization-findings.md` (Section 2: Chunked Batch Insert for Excel Import Ingestion (Step 2))
  + Role Focus: PostgreSQL bulk write performance, foreign key integrity, preserving 5 new citizen fields (INV-01).
- GRAPH-MAP CHECK (Omit if standalone/greenfield):
  + Command: `graft callers "importExcel"` (fallback: `grep -rn "importExcel" QLHK-Backend/src`)
- ACTIONS:
  1. In `QLHK-Backend/src/controllers/excel.controller.ts:121-195`, import `crypto` from `"crypto"`.
  2. Inside each chunk of 100 households, pre-generate `householdId = crypto.randomUUID()` for each household, push to `chunkHouseholdsData`, and associate each citizen's `household_id = householdId` in `allChunkCitizens`.
  3. Execute `await tx.households.createMany({ data: chunkHouseholdsData })` and `await tx.citizens.createMany({ data: allChunkCitizens })` within the transaction, reducing DB round-trips from 200 to 2 per chunk.
- SCOPE REVIEW & DIFF BUDGET GATE:
  1. Review working tree: `git status --short` (`task.md` changes are expected—do not reset or delete `task.md`; reset or remove any out-of-scope files before staging).
  2. Run **DIFF GATE** (Invariant 4) -> Verify staged gross diff is `<= 200 LOC` (if > 200 LOC, unstage, write `Step 2.b` changes to `.git/roadmap-stash/remediate-optimization-findings-2.b.patch`, record its path in `task.md`, clean `Step 2.b` changes from working tree, and split into `Step 2.a` / `Step 2.b` in `task.md`).
- VERIFICATION:
  - Run scoped tests (zero new failures vs baseline; re-run any new failure once before counting as regression): `cd QLHK-Backend && npx vitest run tests/integration/excel.test.ts`.
  - Run static check / typecheck (optional-but-default; 0 errors): `cd QLHK-Backend && npx tsc --noEmit && cd ../QLHK-Client && npx tsc --noEmit`.
- CHECKPOINT & PROGRESS UPDATE:
  - If gotchas discovered: Append to `## Project Gotchas & Learned Invariants` in `task.md`.
  - Update `task.md`: Mark Step 2 as `[x]` Completed.
  - Commit: `git add -A && git commit -m "perf(roadmap): complete step 2 - Chunked Batch Insert for Excel Import Ingestion [OPT-005]"`.
  - Verify clean: `test -z "$(git status --porcelain)"`.

---

### STEP 3: Client Store Search Filter & Village Aggregation Fast Paths
- START STEP:
  + Update `task.md`: Mark Step 3 as `[/]` (In Progress) and review `## Project Gotchas & Learned Invariants` (if executing a deferred `Step 3.b`, apply `.git/roadmap-stash/remediate-optimization-findings-3.b.patch` via `git apply`).
- PRE-REQUISITE READS (Parallel call; skip file read if already in active session context):
  + Plan Section: `docs/plans/remediate-optimization-findings.md` (Section 3: Client Store Search Filter & Village Aggregation Fast Paths (Step 3))
  + Role Focus: React state memoization, string search performance, avoiding Unicode NFD re-allocations.
- GRAPH-MAP CHECK (Omit if standalone/greenfield):
  + Command: `graft callers "searchedHouseholds"` (fallback: `grep -rn "searchedHouseholds" QLHK-Client/src`)
- ACTIONS:
  1. In `QLHK-Client/src/store/householdStore.ts:99-113`, update `searchedHouseholds` to use `(m.name_unaccented || normalizeUnaccented(m.full_name)).includes(query)` and `(h.head_name_unaccented || normalizeUnaccented(h.head_name)).includes(query)`, bypassing Unicode NFD decomposition on search keystrokes.
  2. In `QLHK-Client/src/store/householdStore.ts:192-215`, rewrite `villageStats` to aggregate all active households and members into a `Map<village_id, Accumulator>` in a single $O(H \times M)$ pass, eliminating repeated `activeHouseholds.filter` scans.
- SCOPE REVIEW & DIFF BUDGET GATE:
  1. Review working tree: `git status --short` (`task.md` changes are expected—do not reset or delete `task.md`; reset or remove any out-of-scope files before staging).
  2. Run **DIFF GATE** (Invariant 4) -> Verify staged gross diff is `<= 200 LOC` (if > 200 LOC, unstage, write `Step 3.b` changes to `.git/roadmap-stash/remediate-optimization-findings-3.b.patch`, record its path in `task.md`, clean `Step 3.b` changes from working tree, and split into `Step 3.a` / `Step 3.b` in `task.md`).
- VERIFICATION:
  - Run scoped tests (zero new failures vs baseline; re-run any new failure once before counting as regression): `cd QLHK-Client && npx vitest run tests/utilities.test.ts`.
  - Run static check / typecheck (optional-but-default; 0 errors): `cd QLHK-Backend && npx tsc --noEmit && cd ../QLHK-Client && npx tsc --noEmit`.
- CHECKPOINT & PROGRESS UPDATE:
  - If gotchas discovered: Append to `## Project Gotchas & Learned Invariants` in `task.md`.
  - Update `task.md`: Mark Step 3 as `[x]` Completed.
  - Commit: `git add -A && git commit -m "perf(roadmap): complete step 3 - Client Store Search Filter & Village Aggregation Fast Paths [OPT-001, OPT-002]"`.
  - Verify clean: `test -z "$(git status --porcelain)"`.

---

### STEP 4: O(1) Set Lookup for Household Table Row Selection
- START STEP:
  + Update `task.md`: Mark Step 4 as `[/]` (In Progress) and review `## Project Gotchas & Learned Invariants` (if executing a deferred `Step 4.b`, apply `.git/roadmap-stash/remediate-optimization-findings-4.b.patch` via `git apply`).
- PRE-REQUISITE READS (Parallel call; skip file read if already in active session context):
  + Plan Section: `docs/plans/remediate-optimization-findings.md` (Section 4: O(1) Set Lookup for Household Table Row Selection (Step 4))
  + Role Focus: Component render efficiency, O(1) set membership, table interaction responsiveness.
- GRAPH-MAP CHECK (Omit if standalone/greenfield):
  + Command: `graft callers "HouseholdTable"` (fallback: `grep -rn "HouseholdTable" QLHK-Client/src`)
- ACTIONS:
  1. In `QLHK-Client/src/components/households/HouseholdTable.tsx:123`, define `const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);`.
  2. Replace `selectedIds.includes(hh.id)` on lines 125, 127, 241, and 267 with `selectedSet.has(hh.id)`.
- SCOPE REVIEW & DIFF BUDGET GATE:
  1. Review working tree: `git status --short` (`task.md` changes are expected—do not reset or delete `task.md`; reset or remove any out-of-scope files before staging).
  2. Run **DIFF GATE** (Invariant 4) -> Verify staged gross diff is `<= 200 LOC` (if > 200 LOC, unstage, write `Step 4.b` changes to `.git/roadmap-stash/remediate-optimization-findings-4.b.patch`, record its path in `task.md`, clean `Step 4.b` changes from working tree, and split into `Step 4.a` / `Step 4.b` in `task.md`).
- VERIFICATION:
  - Run scoped tests (zero new failures vs baseline; re-run any new failure once before counting as regression): `cd QLHK-Client && npx vitest run tests/components/HouseholdTable.test.tsx`.
  - Run static check / typecheck (optional-but-default; 0 errors): `cd QLHK-Backend && npx tsc --noEmit && cd ../QLHK-Client && npx tsc --noEmit`.
- CHECKPOINT & PROGRESS UPDATE:
  - If gotchas discovered: Append to `## Project Gotchas & Learned Invariants` in `task.md`.
  - Update `task.md`: Mark Step 4 as `[x]` Completed.
  - Commit: `git add -A && git commit -m "perf(roadmap): complete step 4 - O(1) Set Lookup for Household Table Row Selection [OPT-003]"`.
  - Verify clean: `test -z "$(git status --porcelain)"`.

---

### STEP 5: Analytics Dashboard Single-Pass Aggregation & Age Short-Circuit
- START STEP:
  + Update `task.md`: Mark Step 5 as `[/]` (In Progress) and review `## Project Gotchas & Learned Invariants` (if executing a deferred `Step 5.b`, apply `.git/roadmap-stash/remediate-optimization-findings-5.b.patch` via `git apply`).
- PRE-REQUISITE READS (Parallel call; skip file read if already in active session context):
  + Plan Section: `docs/plans/remediate-optimization-findings.md` (Section 5: Analytics Dashboard Single-Pass Aggregation & Age Short-Circuit (Step 5))
  + Role Focus: Analytics math precision (INV-03), 1080p single viewport invariants (INV-04), single-pass data bucketing.
- GRAPH-MAP CHECK (Omit if standalone/greenfield):
  + Command: `graft callers "AnalyticsDashboard"` (fallback: `grep -rn "AnalyticsDashboard" QLHK-Client/src`)
- ACTIONS:
  1. In `QLHK-Client/src/components/analytics/AnalyticsDashboard.tsx:118-128`, short-circuit date validation when `typeof m.age === "number" && m.age > 0`, avoiding thousands of unconditional `parseAndValidateDob` calls.
  2. In `QLHK-Client/src/components/analytics/AnalyticsDashboard.tsx:257-275`, replace nested `villages.map` + `filter` with single-pass `Map<village_id, Stats>` accumulation over `activeHouseholds`.
- SCOPE REVIEW & DIFF BUDGET GATE:
  1. Review working tree: `git status --short` (`task.md` changes are expected—do not reset or delete `task.md`; reset or remove any out-of-scope files before staging).
  2. Run **DIFF GATE** (Invariant 4) -> Verify staged gross diff is `<= 200 LOC` (if > 200 LOC, unstage, write `Step 5.b` changes to `.git/roadmap-stash/remediate-optimization-findings-5.b.patch`, record its path in `task.md`, clean `Step 5.b` changes from working tree, and split into `Step 5.a` / `Step 5.b` in `task.md`).
- VERIFICATION:
  - Run scoped tests (zero new failures vs baseline; re-run any new failure once before counting as regression): `cd QLHK-Client && npx vitest run tests/components/AnalyticsDashboard.test.tsx`.
  - Run static check / typecheck (optional-but-default; 0 errors): `cd QLHK-Backend && npx tsc --noEmit && cd ../QLHK-Client && npx tsc --noEmit`.
- CHECKPOINT & PROGRESS UPDATE:
  - If gotchas discovered: Append to `## Project Gotchas & Learned Invariants` in `task.md`.
  - Update `task.md`: Mark Step 5 as `[x]` Completed.
  - Commit: `git add -A && git commit -m "perf(roadmap): complete step 5 - Analytics Dashboard Single-Pass Aggregation & Age Short-Circuit [OPT-001, OPT-006]"`.
  - Verify clean: `test -z "$(git status --porcelain)"`.

---

### STEP 6: FULL SUITE VERIFICATION & ZERO-REGRESSION GATE
- START STEP:
  + Update `task.md`: Mark Step 6 as `[/]` (In Progress).
- ACTIONS:
  1. Run Full Test Suite: `cd QLHK-Backend && npm test && cd ../QLHK-Client && npm test` (Zero new failures vs baseline).
  2. Run Typecheck: `cd QLHK-Backend && npx tsc --noEmit && cd ../QLHK-Client && npx tsc --noEmit` (0 errors).
  3. Review Working Tree & Orphan Patches: `git status --short` (`task.md` changes expected; verify no temporary artifacts, untracked files, or leftover `.git/roadmap-stash/*.patch` files).
  4. Update `task.md`: Mark Step 6 and all checklist items as `[x]` Completed, and record the `Finding ID -> commit hash` closure mapping under `## Finding Closure Mapping` in `task.md` and in the final completion summary.
  5. Final Commit: `git add -A && git commit -m "chore(roadmap): complete remediate-optimization-findings verification gate"`.
  6. Final Clean & No-Orphan-Patch Verification: `test -z "$(git status --porcelain)" && test -z "$(ls -A .git/roadmap-stash 2>/dev/null)"` (Must exit 0).
- POST-GATE COMPLETION & BRANCH HANDOFF:
  1. Remove `task.md` in a final cleanup commit by default (unless the user explicitly requested keeping `task.md` in the repository):
     `git rm task.md && git commit -m "chore(roadmap): remove task.md" && test -z "$(git status --porcelain)"`
  2. List any preserved circuit-breaker WIP branches (`git branch --list "failed/remediate-optimization-findings/*"`) so the user can inspect or confirm deleting them (never delete `failed/remediate-optimization-findings/*` branches without explicit user confirmation), present the completion summary (commits created on `roadmap/remediate-optimization-findings` vs. `<BASE_BRANCH>`, plus the `Finding ID -> commit hash` closure table), and ask the user how to proceed:
     - **Option 1**: Open a Pull Request from `roadmap/remediate-optimization-findings` into `<BASE_BRANCH>`.
     - **Option 2**: Merge `roadmap/remediate-optimization-findings` into `<BASE_BRANCH>` locally (`git switch "<BASE_BRANCH>" && git merge --no-ff "roadmap/remediate-optimization-findings"`).
     - **Option 3**: Leave the branch `roadmap/remediate-optimization-findings` as-is for manual inspection.

---

### SESSION HANDOFF CHECKPOINT TEMPLATE (Output after every 4 implementation steps in a session, unless Step 6 just finished)

When 4 implementation steps (`Step 0` excluded) are completed in the current session (or when requested by the user), and `Step 6` is not yet complete, run `cd QLHK-Backend && npm test && cd ../QLHK-Client && npm test`, ensure clean git status, output the block below (replacing `<STEPS_COMPLETED_IN_SESSION>` with the actual count), and **STOP immediately** (do not start the next step in this session):

````text
### 🔄 Session Handoff Checkpoint

Completed <STEPS_COMPLETED_IN_SESSION> step(s) in this session on branch `roadmap/remediate-optimization-findings` (base branch: `<BASE_BRANCH>`). Full test suite verified.

To resume in a fresh session:
1. Read `docs/plans/remediate-optimization-findings.roadmap.md` (the committed original roadmap prompt containing all `STRICT INVARIANTS` and step definitions) then continue — or paste the **ORIGINAL roadmap prompt** below as a fallback.
2. Append or send this resume block immediately after:

```text
Resume execution of the roadmap on branch `roadmap/remediate-optimization-findings` (base branch: `<BASE_BRANCH>`). Read `docs/plans/remediate-optimization-findings.roadmap.md` (the committed original roadmap prompt) for all `STRICT INVARIANTS` and step definitions—or use the original roadmap prompt pasted above as a fallback.

CRITICAL: Do NOT re-execute STEP 0 or any step already marked `[x]` in `task.md`. The branch and `task.md` already exist—Invariant 1's `git switch -c` applies only to the initial fresh start.

Directives:
1. Switch to branch: `git switch roadmap/remediate-optimization-findings`
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
