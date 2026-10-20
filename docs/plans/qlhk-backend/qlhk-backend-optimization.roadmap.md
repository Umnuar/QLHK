`````text
[MANDATORY SYSTEM DIRECTIVE]:
You are executing a multi-step engineering task based on the verified plan at:
docs/plans/qlhk-backend/qlhk-backend-optimization.md

ENVIRONMENT REQUIREMENT:
All shell commands require a POSIX-compatible shell (Git Bash on Windows, WSL, Linux, or macOS).

STRICT INVARIANTS:
1. BRANCH & PRE-FLIGHT (Initial Start Only):
   - **Pre-Switch Detached-HEAD & Protected-Branch Guard**: Before creating `roadmap/qlhk-backend-optimization`, verify `HEAD` is not detached (`BASE_BRANCH=$(git branch --show-current)` and `test -n "$BASE_BRANCH"`; if empty/detached, halt immediately and ask the user to check out a named branch first). If `$BASE_BRANCH` is a protected branch (`main`, `master`, or `production`), ask the user whether to branch `roadmap/qlhk-backend-optimization` directly from `$BASE_BRANCH` (recording it as `Base Branch`) or switch to a feature/planning branch first.
   - Create and switch to isolated branch: `git switch -c roadmap/qlhk-backend-optimization`. If the branch already exists on a fresh start, halt immediately and ask the user whether to resume the existing branch or choose a new branch name. (When resuming via a Handoff Prompt, skip `STEP 0` and use `git switch roadmap/qlhk-backend-optimization`.)
   - Verify clean working tree: `test -z "$(git status --porcelain)"`.
   - Execute the baseline test command **twice** (`Run 1` and `Run 2`), record `Base Branch: <BASE_BRANCH>`, the passing count, and exact names of any tests failing in **either** run as "flaky/known failing" into `docs/plans/qlhk-backend/qlhk-backend-optimization.task.md`, and immediately commit the task tracker. Never build on an uncommitted dirty tree.
2. TWO-TIER READ CADENCE & CONTEXT ANCHORING:
   - **Tier 1 (Session / Task Initialization)**: At `STEP 0`, when resuming from a handoff, or after a `/compact` event, perform a one-time anchor read of: `docs/plans/qlhk-backend/qlhk-backend-optimization.task.md`, `.agents/performance-engineer.md` (or relevant specialist role), and the plan header (`docs/plans/qlhk-backend/qlhk-backend-optimization.md`). Emit mandatory proof-of-read log before taking action:
     `[Context Anchored]: qlhk-backend-optimization.task.md (<status>), performance-engineer.md (<invariants>), qlhk-backend-optimization.md (<goal>)`
   - **Tier 2 (In-Session Atomic Step K)**: Never re-read the entire plan or role file at each step. Rely on inlined instructions inside `STEP K` (or read only the exact surgical slice `### Section K: ...`, `<= 30 lines`). Follow the embedded `Role Focus` invariants and only read code files strictly inside `Target Files`. Review `## Project Gotchas & Learned Invariants` in `docs/plans/qlhk-backend/qlhk-backend-optimization.task.md` before starting a step.
3. GRAPH-AWARE BLAST RADIUS:
   - When a step specifies a `GRAPH-MAP CHECK`, check if the tool (`graft`, `graphify`, `codegraph`) is installed before querying callers/callees. Fall back to native grep or LSP find-references if unavailable.
4. SCOPE HYGIENE & DIFF GATE (<= 200 GROSS LOC):
   - After implementing changes and BEFORE staging, run `git status --short`. Note that tracker modifications (`[/]`) in `docs/plans/qlhk-backend/qlhk-backend-optimization.task.md` are expected—never reset or delete the tracker. If out-of-scope files (`.env*`, scratch scripts, build artifacts) appear, reset (`git reset <file>`), delete, or add to `.gitignore`.
   - Run the **DIFF GATE** command to stage changes and verify gross diff size (added + deleted lines) <= 200 LOC per step, excluding lockfiles, migrations, fixtures, and task trackers:
     ```bash
     git add -A && git diff --cached --numstat -- . \
       ':(exclude)*.lock' ':(exclude)*lock.json' \
       ':(exclude,glob)**/migrations/**' ':(exclude,glob)**/fixtures/**' \
       ':(exclude)*task.md' \
       | awk '{s+=$1+$2} END{print (s?s:0) " LOC"}'
     ```
   - If > 200 gross LOC, unstage (`git reset`), split the step in `docs/plans/qlhk-backend/qlhk-backend-optimization.task.md` into `Step K.a` and `Step K.b` (without renumbering subsequent steps), and execute `Step K.a` first:
     1. Save the `Step K.b` changes to an isolated patch file inside `.git/`:
        ```bash
        mkdir -p .git/roadmap-stash
        git diff -- <step_Kb_files> > ".git/roadmap-stash/qlhk-backend-optimization-K.b.patch"
        git checkout -- <step_Kb_files>
        git clean -fd -- <step_Kb_new_files>
        ```
     2. Record `Deferred Patch: .git/roadmap-stash/qlhk-backend-optimization-K.b.patch` under `Step K.b` in `docs/plans/qlhk-backend/qlhk-backend-optimization.task.md`. Never commit `Step K.b` changes inside `Step K.a`.
     3. When `Step K.b` starts, apply the saved patch via `git apply ".git/roadmap-stash/qlhk-backend-optimization-K.b.patch"`, and immediately after committing `Step K.b`, delete the patch file via `rm -f ".git/roadmap-stash/qlhk-backend-optimization-K.b.patch"`. Each committed sub-step (`Step K.a`, `Step K.b`) counts as **1 step** toward the 4-step session handoff counter.
5. ATOMIC COMMITS & COMMIT HOOKS:
   - After scoped tests pass, update `docs/plans/qlhk-backend/qlhk-backend-optimization.task.md` (`[x]` + any new gotchas) and commit using semantic types (`feat`, `fix`, `refactor`, `test`, `perf`, `chore`):
     `git add -A && git commit -m "<type>(roadmap): complete step K - <title>"`
   - Never use `--no-verify`; hook failures caused by the agent's own change are code attempts; infrastructure/hook-tool failures are not.
   - Verify working tree is 100% clean after commit (`test -z "$(git status --porcelain)"`).
6. SAFE CIRCUIT BREAKER ROLLBACK & UNBLOCKING:
   - **What Counts as an Attempt**: A single cycle of implementing/modifying code for the current step followed by a failing scoped test, failing per-step static/typecheck command, or a pre-commit hook failure caused by the agent's own code change. Transient infrastructure, port, network, or runner errors do not count as code attempts.
   - **Pre-Retry Reset Rule (Before Attempt 2 and Attempt 3)**: Before starting each retry attempt (`Attempt 2` or `Attempt 3`), reset all tracked and untracked code changes back to the last committed checkpoint while preserving `docs/plans/qlhk-backend/qlhk-backend-optimization.task.md`:
     ```bash
     cp docs/plans/qlhk-backend/qlhk-backend-optimization.task.md ".git/roadmap-task-qlhk-backend-optimization.md.bak"
     git restore --staged . && git checkout -- . && git clean -fd -e docs/plans/qlhk-backend/qlhk-backend-optimization.task.md -e docs/plans/*.task.md -e task.md
     mv ".git/roadmap-task-qlhk-backend-optimization.md.bak" docs/plans/qlhk-backend/qlhk-backend-optimization.task.md
     ```
   - **Counter Reset Rule**: The 3-attempt counter is scoped per step and resets to `0` when: (a) a step passes verification and is committed (`[x]`), or (b) the user provides unblocking guidance after a `[!]` halt and the step is transitioned from `[!]` back to `[/]`.
   - If a step fails after 3 consecutive code attempts, preserve the 3rd attempt's WIP on a unique branch and restore `roadmap/qlhk-backend-optimization` cleanly:
     ```bash
     ATTEMPT_TS=$(date +%s)
     git switch -c "failed/qlhk-backend-optimization/step-K-attempt-${ATTEMPT_TS}"
     git add -A && git commit -m "wip: failed step K attempt after 3 tries"
     git switch "roadmap/qlhk-backend-optimization"
     git add docs/plans/qlhk-backend/qlhk-backend-optimization.task.md && git commit -m "chore(roadmap): mark step K blocked"
     ```
   - Halt and await user guidance. Never delete `failed/qlhk-backend-optimization/*` branches automatically.
   - Unblocking procedure: Once user provides guidance, ensure you are on `roadmap/qlhk-backend-optimization`, change `[!]` back to `[/]` in `docs/plans/qlhk-backend/qlhk-backend-optimization.task.md`, and retry Step K from the clean Step K-1 checkpoint.
7. SCOPED TESTS, PER-STEP STATIC CHECK, FLAKY POLICY VS FULL SUITE:
   - Run fast scoped tests AND the per-step static/typecheck command (`cd QLHK-Backend && npx tsc --noEmit`) at each step.
   - Run the full test suite and full typecheck at session handoffs and at the final verification gate (`Step 5`).
   - **Flaky Test Policy**: The Step 0 baseline test run is executed **twice**; any test failing in **either** run is recorded under `Known Baseline / Flaky Failures` in `docs/plans/qlhk-backend/qlhk-backend-optimization.task.md`. During `STEP K`, handoffs, or `STEP 5`, any **new** test failure (not listed in `Known Baseline / Flaky Failures`) must be **re-run once** before being counted as a regression or code attempt failure.
   - Enforce zero confirmed new failures compared to the baseline recorded in Step 0.
8. FRESH CONTEXT HANDOFF (EVERY 4 IMPLEMENTATION STEPS IN SESSION OR ON USER REQUEST):
   - After completing 4 implementation steps (`Step 1`..`Step 4`) in the current session, or immediately when requested by the user, run the full test suite, verify a clean working tree, output the embedded `SESSION HANDOFF CHECKPOINT` block at the bottom of this prompt, and **STOP immediately**.
9. MINIMAL WORKING DIFF & ZERO COMMENTS IN CODE:
   - Shortest working code, strict YAGNI, zero unrequested abstractions, zero temporary scratch scripts (`fix*.js`, `patch*.py`, `temp*`).
   - **ZERO COMMENTS IN CODE**: Absolutely no comments (`//`, `/* ... */`, `#`, JSDoc/TSDoc, HTML comments) in any new or modified code.

---

### STEP 0: BRANCH ISOLATION, PRE-FLIGHT GATE & TASK INITIALIZATION
1. Capture the current branch as `BASE_BRANCH` (`BASE_BRANCH=$(git branch --show-current)`), verify `HEAD` is not detached (`test -n "$BASE_BRANCH"`, halting if detached), and if `$BASE_BRANCH` is protected (`main`/`master`/`production`), confirm with the user whether to use it as `BASE_BRANCH` or switch first; then create and switch to branch: `git switch -c roadmap/qlhk-backend-optimization` (if branch already exists, halt and ask user whether to resume or rename).
2. Verify clean working tree: `test -z "$(git status --porcelain)"` (Must exit 0).
3. Capture baseline commit hash via `git rev-parse --short HEAD` and run baseline tests **twice**: `cd QLHK-Backend && npx vitest run tests/unit tests/security/crypto.test.ts tests/security/rbac.test.ts && npx vitest run tests/unit tests/security/crypto.test.ts tests/security/rbac.test.ts` -> Record total passing count and exact names of any tests failing in **either** run as "flaky/known failing".
4. Create `docs/plans/qlhk-backend/qlhk-backend-optimization.task.md` with this exact content (replace `<BASE_BRANCH>`, `<BASELINE_HASH>`, and `<PASS_COUNT>` with actual values from steps 1 and 3):

```markdown
# Task Progress Tracker

- **Project**: QLHK-Backend
- **Base Branch**: `<BASE_BRANCH>`
- **Branch**: `roadmap/qlhk-backend-optimization`
- **Plan Reference**: `docs/plans/qlhk-backend/qlhk-backend-optimization.md`
- **Roadmap Prompt Reference**: `docs/plans/qlhk-backend/qlhk-backend-optimization.roadmap.md`
- **Baseline Checkpoint**: `<BASELINE_HASH>` (<PASS_COUNT> passing, verified across 2 baseline runs)
- **Known Baseline / Flaky Failures (Failed in Either Baseline Run)**:
  - None
- **Status Legend**: 
  - `[ ]` Pending
  - `[/]` In Progress
  - `[x]` Completed
  - `[!]` Blocked (Circuit Breaker Tripped)

## Execution Checklist

- [ ] Step 1: Cache Encryption Key Buffer and Optimize Accents Removal in Crypto Utility
  - Finding IDs: `OPT-001`, `OPT-004`
  - Target Files: `QLHK-Backend/src/utils/crypto.ts`, `QLHK-Backend/tests/security/crypto.test.ts`
  - Assigned Role: `.agents/security-engineer.md`
  - Role Focus: Cryptographic standards, zero allocation overhead, strict input validation
  - Graph Check: `graft callers getKeyBuffer --direction in`
  - Diff Budget: <= 200 gross LOC
  - Verification: `cd QLHK-Backend && npx vitest run tests/security/crypto.test.ts`
  - Static Check: `cd QLHK-Backend && npx tsc --noEmit`
- [ ] Step 2: Optimize Hare-Niemeyer Algorithm Single-Pass Allocation in Analytics Controller
  - Finding IDs: `OPT-002`
  - Target Files: `QLHK-Backend/src/controllers/analytics.controller.ts`, `QLHK-Backend/tests/unit/analytics.test.ts`
  - Assigned Role: `.agents/performance-engineer.md`
  - Role Focus: Algorithmic complexity, zero intermediate wrappers, deterministic numerical stability
  - Graph Check: `graft callers calculatePercentagesWithLargestRemainder --direction in`
  - Diff Budget: <= 200 gross LOC
  - Verification: `cd QLHK-Backend && npx vitest run tests/unit/analytics.test.ts -t "Hare-Niemeyer"`
  - Static Check: `cd QLHK-Backend && npx tsc --noEmit`
- [ ] Step 3: Implement Zero-Allocation Birth Year Parsing for Demographics
  - Finding IDs: `OPT-003`
  - Target Files: `QLHK-Backend/src/controllers/analytics.controller.ts`, `QLHK-Backend/tests/unit/analytics.test.ts`
  - Assigned Role: `.agents/performance-engineer.md`
  - Role Focus: String parsing optimization, zero regex compilation overhead, boundary validation
  - Graph Check: `graft callers extractBirthYear --direction in`
  - Diff Budget: <= 200 gross LOC
  - Verification: `cd QLHK-Backend && npx vitest run tests/unit/analytics.test.ts -t "Birth Year"`
  - Static Check: `cd QLHK-Backend && npx tsc --noEmit`
- [ ] Step 4: Replace Eager Hydration with Database Aggregate Grouping in Village Analytics
  - Finding IDs: `OPT-005`
  - Target Files: `QLHK-Backend/src/controllers/analytics.controller.ts`, `QLHK-Backend/tests/unit/analytics.test.ts`
  - Assigned Role: `.agents/database-optimization.md`
  - Role Focus: Database cardinality reduction, projection pruning, relation aggregation
  - Graph Check: `graft callers getByVillage --direction in`
  - Diff Budget: <= 200 gross LOC
  - Verification: `cd QLHK-Backend && npx vitest run tests/unit/analytics.test.ts -t "Village Stats"`
  - Static Check: `cd QLHK-Backend && npx tsc --noEmit`
- [ ] Step 5: Verification & Final Gate
  - Full Test Suite: `cd QLHK-Backend && npx vitest run tests/unit tests/security/crypto.test.ts tests/security/rbac.test.ts` (Zero new failures vs baseline)
  - Typecheck: `cd QLHK-Backend && npx tsc --noEmit` (0 errors)
  - Clean Working Tree & No Orphan Patches: Verified (`test -z "$(git status --porcelain)" && test -z "$(ls -A .git/roadmap-stash/qlhk-backend-optimization-*.patch 2>/dev/null)"`)

## Finding Closure Mapping (When Sourced from audit / optimize)

## Project Gotchas & Learned Invariants
```

5. Commit initial tracker: `git add docs/plans/qlhk-backend/qlhk-backend-optimization.task.md && git commit -m "chore(roadmap): init qlhk-backend-optimization.task.md"`.
6. Verify clean tree: `test -z "$(git status --porcelain)"`.
7. Anchor Context (Tier 1): Read `docs/plans/qlhk-backend/qlhk-backend-optimization.task.md`, `.agents/performance-engineer.md`, and the plan header (`docs/plans/qlhk-backend/qlhk-backend-optimization.md`). Emit log: `[Context Anchored]: qlhk-backend-optimization.task.md (<status>), performance-engineer.md (<invariants>), qlhk-backend-optimization.md (<goal>)`.

---

### STEP 1: Cache Encryption Key Buffer and Optimize Accents Removal in Crypto Utility
- START STEP:
  + Update `docs/plans/qlhk-backend/qlhk-backend-optimization.task.md`: Mark Step 1 as `[/]` (In Progress) and review `## Project Gotchas & Learned Invariants`.
- PRE-REQUISITE READS (Tier 2 slice; skip file read if already anchored in active session):
  + Plan Section: `docs/plans/qlhk-backend/qlhk-backend-optimization.md` (Section 1: Cache Encryption Key Buffer and Optimize Accents Removal in Crypto Utility (Step 1))
  + Agent Role: `.agents/security-engineer.md`
  + Role Focus: Cryptographic standards, zero allocation overhead, strict input validation
- GRAPH-MAP CHECK:
  + Command: `graft callers getKeyBuffer --direction in || grep -rn "getKeyBuffer" src/`
- ACTIONS:
  1. In `QLHK-Backend/src/utils/crypto.ts`, introduce module-scoped variable `let cachedKeyBuffer: Buffer | null = null;`.
  2. Update `getKeyBuffer()` to return `cachedKeyBuffer` immediately if already assigned; otherwise compute the 32-byte buffer once and cache it.
  3. Pre-compile `const DIACRITICS_REGEX = /[\u0300-\u036f]/g;` and `const D_STROKE_REGEX = /đ/g;` at module level.
  4. Refactor `removeAccents(str: string): string` to convert string to lowercase first, replace `đ` with `d` directly without closure, normalize `NFD`, remove diacritics with `DIACRITICS_REGEX`, and trim whitespace.
  5. In `QLHK-Backend/tests/security/crypto.test.ts`, add deterministic test assertions verifying key buffer reuse, byte-for-byte equivalence, and accent removal across diverse Vietnamese names.
- SCOPE REVIEW & DIFF BUDGET GATE:
  1. Review working tree: `git status --short` (`docs/plans/qlhk-backend/qlhk-backend-optimization.task.md` changes are expected; reset or remove any out-of-scope files before staging).
  2. Run **DIFF GATE** (Invariant 4) -> Verify staged gross diff is `<= 200 LOC`.
- VERIFICATION:
  - Run scoped tests (zero new failures vs baseline): `cd QLHK-Backend && npx vitest run tests/security/crypto.test.ts`.
  - Run static check / typecheck (0 errors): `cd QLHK-Backend && npx tsc --noEmit`.
- CHECKPOINT & PROGRESS UPDATE:
  - If gotchas discovered: Append to `## Project Gotchas & Learned Invariants` in `docs/plans/qlhk-backend/qlhk-backend-optimization.task.md`.
  - Update `docs/plans/qlhk-backend/qlhk-backend-optimization.task.md`: Mark Step 1 as `[x]` Completed.
  - Commit: `git add -A && git commit -m "perf(roadmap): complete step 1 - cache key buffer and optimize removeAccents [OPT-001] [OPT-004]"`.
  - Verify clean: `test -z "$(git status --porcelain)"`.

---

### STEP 2: Optimize Hare-Niemeyer Algorithm Single-Pass Allocation in Analytics Controller
- START STEP:
  + Update `docs/plans/qlhk-backend/qlhk-backend-optimization.task.md`: Mark Step 2 as `[/]` (In Progress) and review `## Project Gotchas & Learned Invariants`.
- PRE-REQUISITE READS (Tier 2 slice; skip file read if already anchored in active session):
  + Plan Section: `docs/plans/qlhk-backend/qlhk-backend-optimization.md` (Section 2: Optimize Hare-Niemeyer Algorithm Single-Pass Allocation in Analytics Controller (Step 2))
  + Agent Role: `.agents/performance-engineer.md`
  + Role Focus: Algorithmic complexity, zero intermediate wrappers, deterministic numerical stability
- GRAPH-MAP CHECK:
  + Command: `graft callers calculatePercentagesWithLargestRemainder --direction in || grep -rn "calculatePercentagesWithLargestRemainder" src/`
- ACTIONS:
  1. In `QLHK-Backend/src/controllers/analytics.controller.ts`, refactor `calculatePercentagesWithLargestRemainder` to eliminate intermediate object wrapper allocations.
  2. Pre-allocate `floorTenths` with `Int32Array(len)` and `remainders` with `Float64Array(len)`.
  3. Single-pass over `items` to compute integer floor tenths, store fractional remainders, and accumulate total sum into `currentSum`.
  4. Track indices with positive counts in `eligibleIndices`, sort only eligible indices by descending remainder, and distribute integer remainder deficit `diff`.
  5. Create `QLHK-Backend/tests/unit/analytics.test.ts` and migrate behavior-equivalence test cases asserting exact percentage allocations and 100.0% sum preservation across multi-category demographic inputs.
- SCOPE REVIEW & DIFF BUDGET GATE:
  1. Review working tree: `git status --short`.
  2. Run **DIFF GATE** (Invariant 4) -> Verify staged gross diff is `<= 200 LOC`.
- VERIFICATION:
  - Run scoped tests (zero new failures vs baseline): `cd QLHK-Backend && npx vitest run tests/unit/analytics.test.ts -t "Hare-Niemeyer"`.
  - Run static check / typecheck (0 errors): `cd QLHK-Backend && npx tsc --noEmit`.
- CHECKPOINT & PROGRESS UPDATE:
  - If gotchas discovered: Append to `## Project Gotchas & Learned Invariants` in `docs/plans/qlhk-backend/qlhk-backend-optimization.task.md`.
  - Update `docs/plans/qlhk-backend/qlhk-backend-optimization.task.md`: Mark Step 2 as `[x]` Completed.
  - Commit: `git add -A && git commit -m "perf(roadmap): complete step 2 - single-pass hare-niemeyer allocation [OPT-002]"`.
  - Verify clean: `test -z "$(git status --porcelain)"`.

---

### STEP 3: Implement Zero-Allocation Birth Year Parsing for Demographics
- START STEP:
  + Update `docs/plans/qlhk-backend/qlhk-backend-optimization.task.md`: Mark Step 3 as `[/]` (In Progress) and review `## Project Gotchas & Learned Invariants`.
- PRE-REQUISITE READS (Tier 2 slice; skip file read if already anchored in active session):
  + Plan Section: `docs/plans/qlhk-backend/qlhk-backend-optimization.md` (Section 3: Implement Zero-Allocation Birth Year Parsing for Demographics (Step 3))
  + Agent Role: `.agents/performance-engineer.md`
  + Role Focus: String parsing optimization, zero regex compilation overhead, boundary validation
- GRAPH-MAP CHECK:
  + Command: `graft callers extractBirthYear --direction in || grep -rn "extractBirthYear" src/`
- ACTIONS:
  1. In `QLHK-Backend/src/controllers/analytics.controller.ts`, export standalone helper `extractBirthYear(dob: string | null | undefined): number | null`.
  2. Implement trailing whitespace trimming by scanning backward using character codes without allocating new string instances.
  3. Verify that the 4 trailing characters are ASCII numeric digits (character codes 48 to 57) and compute integer year using base-10 arithmetic.
  4. Return `null` for missing, empty, or invalid format dates.
  5. In `getOverview`, replace `c.dob.trim().match(/(\d{4})$/)` with `extractBirthYear(c.dob)`.
  6. In `QLHK-Backend/tests/unit/analytics.test.ts`, add test cases covering valid dates, trailing whitespace, pure years, invalid values, and null inputs.
- SCOPE REVIEW & DIFF BUDGET GATE:
  1. Review working tree: `git status --short`.
  2. Run **DIFF GATE** (Invariant 4) -> Verify staged gross diff is `<= 200 LOC`.
- VERIFICATION:
  - Run scoped tests (zero new failures vs baseline): `cd QLHK-Backend && npx vitest run tests/unit/analytics.test.ts -t "Birth Year"`.
  - Run static check / typecheck (0 errors): `cd QLHK-Backend && npx tsc --noEmit`.
- CHECKPOINT & PROGRESS UPDATE:
  - If gotchas discovered: Append to `## Project Gotchas & Learned Invariants` in `docs/plans/qlhk-backend/qlhk-backend-optimization.task.md`.
  - Update `docs/plans/qlhk-backend/qlhk-backend-optimization.task.md`: Mark Step 3 as `[x]` Completed.
  - Commit: `git add -A && git commit -m "perf(roadmap): complete step 3 - zero-allocation birth year parsing [OPT-003]"`.
  - Verify clean: `test -z "$(git status --porcelain)"`.

---

### STEP 4: Replace Eager Hydration with Database Aggregate Grouping in Village Analytics
- START STEP:
  + Update `docs/plans/qlhk-backend/qlhk-backend-optimization.task.md`: Mark Step 4 as `[/]` (In Progress) and review `## Project Gotchas & Learned Invariants`.
- PRE-REQUISITE READS (Tier 2 slice; skip file read if already anchored in active session):
  + Plan Section: `docs/plans/qlhk-backend/qlhk-backend-optimization.md` (Section 4: Replace Eager Hydration with Database Aggregate Grouping in Village Analytics (Step 4))
  + Agent Role: `.agents/database-optimization.md`
  + Role Focus: Database cardinality reduction, projection pruning, relation aggregation
- GRAPH-MAP CHECK:
  + Command: `graft callers getByVillage --direction in || grep -rn "getByVillage" src/`
- ACTIONS:
  1. In `QLHK-Backend/src/controllers/analytics.controller.ts`, refactor `getByVillage` to avoid loading full household and citizen trees.
  2. Query `villages` with `select` restricting fields to `id`, `name`, `code`, and nested household count `_count: { select: { households: { where: { is_deleted: false } } } }`.
  3. Execute grouped citizen counts via database aggregation filtering on `is_deleted: false`, grouping by village, gender, ethnicity, and religion.
  4. Aggregate the grouped rows in memory over at most 250 rows to calculate `male_count`, `female_count`, `dtts_count`, `top_ethnicity`, and `top_religion`.
  5. Preserve 100% response schema compatibility for `villageStats` JSON output.
  6. In `QLHK-Backend/tests/unit/analytics.test.ts`, add test cases verifying `villageStats` structure, percentages, and aggregation logic using mocked database results.
- SCOPE REVIEW & DIFF BUDGET GATE:
  1. Review working tree: `git status --short`.
  2. Run **DIFF GATE** (Invariant 4) -> Verify staged gross diff is `<= 200 LOC`.
- VERIFICATION:
  - Run scoped tests (zero new failures vs baseline): `cd QLHK-Backend && npx vitest run tests/unit/analytics.test.ts -t "Village Stats"`.
  - Run static check / typecheck (0 errors): `cd QLHK-Backend && npx tsc --noEmit`.
- CHECKPOINT & PROGRESS UPDATE:
  - If gotchas discovered: Append to `## Project Gotchas & Learned Invariants` in `docs/plans/qlhk-backend/qlhk-backend-optimization.task.md`.
  - Update `docs/plans/qlhk-backend/qlhk-backend-optimization.task.md`: Mark Step 4 as `[x]` Completed.
  - Commit: `git add -A && git commit -m "perf(roadmap): complete step 4 - database aggregate grouping in getByVillage [OPT-005]"`.
  - Verify clean: `test -z "$(git status --porcelain)"`.

---

### STEP 5: FULL SUITE VERIFICATION & ZERO-REGRESSION GATE
- START STEP:
  + Update `docs/plans/qlhk-backend/qlhk-backend-optimization.task.md`: Mark Step 5 as `[/]` (In Progress).
- ACTIONS:
  1. Run Full Test Suite: `cd QLHK-Backend && npx vitest run tests/unit tests/security/crypto.test.ts tests/security/rbac.test.ts` (Zero new failures vs baseline).
  2. Run Typecheck: `cd QLHK-Backend && npx tsc --noEmit` (0 errors).
  3. Review Working Tree & Orphan Patches: `git status --short` (`docs/plans/qlhk-backend/qlhk-backend-optimization.task.md` changes expected; verify no temporary artifacts, untracked files, or leftover `.git/roadmap-stash/qlhk-backend-optimization-*.patch` files).
  4. Update `docs/plans/qlhk-backend/qlhk-backend-optimization.task.md`: Mark Step 5 and all checklist items as `[x]` Completed, and record the `Finding ID -> commit hash` closure mapping under `## Finding Closure Mapping` in `docs/plans/qlhk-backend/qlhk-backend-optimization.task.md` and in the final completion summary.
  5. Final Commit: `git add -A && git commit -m "chore(roadmap): complete qlhk-backend-optimization verification gate"`.
  6. Final Clean & No-Orphan-Patch Verification: `test -z "$(git status --porcelain)" && test -z "$(ls -A .git/roadmap-stash/qlhk-backend-optimization-*.patch 2>/dev/null)"` (Must exit 0).
- POST-GATE COMPLETION & BRANCH HANDOFF:
  1. Remove `docs/plans/qlhk-backend/qlhk-backend-optimization.task.md` in a final cleanup commit by default (unless user explicitly requests keeping it):
     `git rm docs/plans/qlhk-backend/qlhk-backend-optimization.task.md && git commit -m "chore(roadmap): remove qlhk-backend-optimization.task.md" && test -z "$(git status --porcelain)"`
  2. List any preserved circuit-breaker WIP branches (`git branch --list "failed/qlhk-backend-optimization/*"`) so the user can inspect or confirm deleting them. Present completion summary with commit history and closure table:
     - `OPT-001 -> <commit_hash> (Step 1)`
     - `OPT-002 -> <commit_hash> (Step 2)`
     - `OPT-003 -> <commit_hash> (Step 3)`
     - `OPT-004 -> <commit_hash> (Step 1)`
     - `OPT-005 -> <commit_hash> (Step 4)`
  3. Ask user how to proceed (Option 1: Open PR; Option 2: Merge locally into `<BASE_BRANCH>`; Option 3: Leave branch as-is).

---

### SESSION HANDOFF CHECKPOINT TEMPLATE (Output after every 4 implementation steps in a session, unless Step 5 just finished)

When 4 implementation steps (`Step 0` excluded) are completed in the current session (or when requested by the user), and `Step 5` is not yet complete, run `cd QLHK-Backend && npx vitest run tests/unit tests/security/crypto.test.ts tests/security/rbac.test.ts`, ensure clean git status, output the block below (replacing `<STEPS_COMPLETED_IN_SESSION>` with the actual count), and **STOP immediately** (do not start the next step in this session):

````text
### 🔄 Session Handoff Checkpoint

Completed <STEPS_COMPLETED_IN_SESSION> step(s) in this session on branch `roadmap/qlhk-backend-optimization` (base branch: `<BASE_BRANCH>`). Full test suite verified.

To resume in a fresh session:
1. Read `docs/plans/qlhk-backend/qlhk-backend-optimization.roadmap.md` (the committed original roadmap prompt containing all `STRICT INVARIANTS` and step definitions) then continue — or paste the **ORIGINAL roadmap prompt** below as a fallback.
2. Append or send this resume block immediately after:

```text
Resume execution of the roadmap on branch `roadmap/qlhk-backend-optimization` (base branch: `<BASE_BRANCH>`). Read `docs/plans/qlhk-backend/qlhk-backend-optimization.roadmap.md` (the committed original roadmap prompt) for all `STRICT INVARIANTS` and step definitions—or use the original roadmap prompt pasted above as a fallback.

CRITICAL: Do NOT re-execute STEP 0 or any step already marked `[x]` in `docs/plans/qlhk-backend/qlhk-backend-optimization.task.md`. The branch and tracker already exist—Invariant 1's `git switch -c` applies only to the initial fresh start.

Directives:
1. Switch to branch: `git switch roadmap/qlhk-backend-optimization`
2. Working tree check:
   - If clean (`test -z "$(git status --porcelain)"` exits 0), proceed to Directive 3.
   - If dirty, inspect `docs/plans/qlhk-backend/qlhk-backend-optimization.task.md`:
     + If a step is marked `[/]` (In Progress), proceed to Directive 5 to evaluate WIP changes.
     + If dirty without an in-progress step, halt immediately and alert the user.
3. Context Anchoring (Tier 1): Read `docs/plans/qlhk-backend/qlhk-backend-optimization.task.md` (progress, known failures, gotchas), the designated role file (`.agents/performance-engineer.md` if applicable), and the plan header (`docs/plans/qlhk-backend/qlhk-backend-optimization.md`). Emit mandatory verification log: `[Context Anchored]: qlhk-backend-optimization.task.md (<status>), performance-engineer.md (<invariants>), qlhk-backend-optimization.md (<goal>)`.
4. Inspect `git log -n 3 --oneline` to confirm the last committed checkpoint.
5. If Step K is marked `[/]` (In Progress) with uncommitted WIP, inspect existing changes via `git status --short` before continuing.
6. If Step K is marked `[!]` (Blocked):
   - Review the failure reason logged in `docs/plans/qlhk-backend/qlhk-backend-optimization.task.md`.
   - Await user guidance on the resolution strategy.
   - Upon guidance, update `docs/plans/qlhk-backend/qlhk-backend-optimization.task.md` to mark Step K back to `[/]` (In Progress) and resume implementation from the clean Step K-1 commit.
7. Otherwise, proceed with the next pending `[ ]` step following the strict invariants and step definitions in the roadmap prompt pasted above.
```
````
`````
