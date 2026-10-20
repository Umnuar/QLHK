`````text
[MANDATORY SYSTEM DIRECTIVE]:
You are executing a multi-step engineering task based on the verified plan at:
docs/plans/qlhk-client/qlhk-client-audit-remediation.md

ENVIRONMENT REQUIREMENT:
All shell commands require a POSIX-compatible shell (Git Bash on Windows, WSL, Linux, or macOS).

STRICT INVARIANTS:
1. BRANCH & PRE-FLIGHT (Initial Start Only):
   - **Pre-Switch Detached-HEAD & Protected-Branch Guard**: Before creating `roadmap/qlhk-client-audit-remediation`, verify `HEAD` is not detached (`BASE_BRANCH=$(git branch --show-current)` and `test -n "$BASE_BRANCH"`; if empty/detached, halt immediately and ask the user to check out a named branch first). If `$BASE_BRANCH` is a protected branch (`main`, `master`, or `production`), ask the user whether to branch `roadmap/qlhk-client-audit-remediation` directly from `$BASE_BRANCH` (recording it as `Base Branch`) or switch to a feature/planning branch first.
   - Create and switch to isolated branch: `git switch -c roadmap/qlhk-client-audit-remediation`. If the branch already exists on a fresh start, halt immediately and ask the user whether to resume the existing branch or choose a new branch name. (When resuming via a Handoff Prompt, skip `STEP 0` and use `git switch roadmap/qlhk-client-audit-remediation`.)
   - Verify clean working tree: `test -z "$(git status --porcelain)"`.
   - Execute the baseline test command **twice** (`Run 1` and `Run 2`), record `Base Branch: <BASE_BRANCH>`, the passing count, and exact names of any tests failing in **either** run as "flaky/known failing" into `docs/plans/qlhk-client/qlhk-client-audit-remediation.task.md`, and immediately commit `docs/plans/qlhk-client/qlhk-client-audit-remediation.task.md`. Never build on an uncommitted dirty tree.
2. TWO-TIER READ CADENCE & CONTEXT ANCHORING:
   - **Tier 1 (Session / Task Initialization)**: At `STEP 0`, when resuming from a handoff, or after a `/compact` event, you MUST perform a one-time anchor read of: `docs/plans/qlhk-client/qlhk-client-audit-remediation.task.md` and the plan header (`docs/plans/qlhk-client/qlhk-client-audit-remediation.md`). Emit mandatory proof-of-read log before taking action:
     `[Context Anchored]: qlhk-client-audit-remediation.task.md (<status>), plan.md (<goal>)`
   - **Tier 2 (In-Session Atomic Step K)**: NEVER re-read the entire `plan.md` file at each step. Rely on inlined instructions inside `STEP K` (or read ONLY the exact surgical slice `### Section K: ...`, `<= 30 lines`). Follow the embedded `Role Focus` invariants and only read code files strictly inside `Target Files`. Review `## Project Gotchas & Learned Invariants` in `docs/plans/qlhk-client/qlhk-client-audit-remediation.task.md` before starting a step.
3. GRAPH-AWARE BLAST RADIUS:
   - When a step specifies a `GRAPH-MAP CHECK`, check if the tool (`graft`, `graphify`, `codegraph`) is installed before querying callers/callees. Fall back to native grep or LSP find-references if unavailable.
4. SCOPE HYGIENE & DIFF GATE (<= 200 GROSS LOC):
   - After implementing changes and BEFORE staging, run `git status --short`. Note that tracker modifications (`[/]`) in `docs/plans/qlhk-client/qlhk-client-audit-remediation.task.md` are expected—never reset or delete the tracker. If out-of-scope files (`.env*`, scratch scripts, build artifacts) appear, reset (`git reset <file>`), delete, or add to `.gitignore`.
   - Run the **DIFF GATE** command to stage changes and verify gross diff size (added + deleted lines) <= 200 LOC per step, excluding lockfiles, migrations, fixtures, and task trackers (note that binary files output `-\t-\t<path>` in `git diff --numstat` and naturally count as `0 LOC` in `awk '{s+=$1+$2}'`):
     ```bash
     git add -A && git diff --cached --numstat -- . \
       ':(exclude)*.lock' ':(exclude)*lock.json' \
       ':(exclude,glob)**/migrations/**' ':(exclude,glob)**/fixtures/**' \
       ':(exclude)*task.md' \
       | awk '{s+=$1+$2} END{print (s?s:0) " LOC"}'
     ```
   - If > 200 gross LOC, unstage (`git reset`), split the step in `docs/plans/qlhk-client/qlhk-client-audit-remediation.task.md` into `Step K.a` and `Step K.b` (without renumbering subsequent steps), and execute `Step K.a` first:
     1. Save the `Step K.b` changes to an isolated patch file inside `.git/` (so the working tree stays 100% clean):
        ```bash
        mkdir -p .git/roadmap-stash
        git diff -- <step_Kb_files> > ".git/roadmap-stash/qlhk-client-audit-remediation-K.b.patch"
        git checkout -- <step_Kb_files>
        git clean -fd -- <step_Kb_new_files>
        ```
        *(Or if `Step K.b` includes untracked files, stage only `Step K.b` files first and use `git diff --cached --binary > ".git/roadmap-stash/qlhk-client-audit-remediation-K.b.patch" && git reset --hard` while preserving `docs/plans/qlhk-client/qlhk-client-audit-remediation.task.md`.)*
     2. Record `Deferred Patch: .git/roadmap-stash/qlhk-client-audit-remediation-K.b.patch` under `Step K.b` in `docs/plans/qlhk-client/qlhk-client-audit-remediation.task.md`. Never commit `Step K.b` changes inside `Step K.a`.
     3. When `Step K.b` starts, apply the saved patch via `git apply ".git/roadmap-stash/qlhk-client-audit-remediation-K.b.patch"`, and immediately after committing `Step K.b`, delete the patch file via `rm -f ".git/roadmap-stash/qlhk-client-audit-remediation-K.b.patch"`. Each committed sub-step (`Step K.a`, `Step K.b`) counts as **1 step** toward the 4-step session handoff counter (Invariant 8).
5. ATOMIC COMMITS & COMMIT HOOKS:
   - After scoped tests pass, update `docs/plans/qlhk-client/qlhk-client-audit-remediation.task.md` (`[x]` + any new gotchas) and commit using semantic types (`feat`, `fix`, `refactor`, `test`, `perf`, `chore`):
     `git add -A && git commit -m "<type>(roadmap): complete step K - <title>"`
   - Never use `--no-verify`; hook failures caused by the agent's own change are code attempts; infrastructure/hook-tool failures are not.
   - Verify working tree is 100% clean after commit (`test -z "$(git status --porcelain)"`).
6. SAFE CIRCUIT BREAKER ROLLBACK & UNBLOCKING:
   - **What Counts as an Attempt**: A single cycle of implementing/modifying code for the current step (or sub-step `K.a`/`K.b`) followed by a failing scoped test, failing per-step static/typecheck command, or a pre-commit hook failure caused by the agent's own code change. Transient infrastructure, port, network, or hook-tool runner errors do NOT count as code attempts.
   - **Pre-Retry Reset Rule (Before Attempt 2 and Attempt 3)**: Before starting each retry attempt (`Attempt 2` or `Attempt 3`), you MUST reset all tracked and untracked code changes back to the last committed checkpoint while preserving `docs/plans/qlhk-client/qlhk-client-audit-remediation.task.md`:
     ```bash
     cp docs/plans/qlhk-client/qlhk-client-audit-remediation.task.md ".git/roadmap-task-qlhk-client-audit-remediation.md.bak"
     git restore --staged . && git checkout -- . && git clean -fd -e docs/plans/qlhk-client/qlhk-client-audit-remediation.task.md -e task.md
     mv ".git/roadmap-task-qlhk-client-audit-remediation.md.bak" docs/plans/qlhk-client/qlhk-client-audit-remediation.task.md
     ```
   - **Counter Reset Rule**: The 3-attempt counter is scoped per step (or sub-step `K.a`/`K.b`) and resets to `0` when: (a) a step (or sub-step) passes verification and is committed (`[x]`), or (b) the user provides unblocking guidance after a `[!]` halt and the step is transitioned from `[!]` back to `[/]`.
   - If a step fails after 3 consecutive code attempts, preserve the 3rd attempt's WIP on a unique branch and restore `roadmap/qlhk-client-audit-remediation` cleanly:
     ```bash
     ATTEMPT_TS=$(date +%s)
     git switch -c "failed/qlhk-client-audit-remediation/step-K-attempt-${ATTEMPT_TS}"
     git add -A && git commit -m "wip: failed step K attempt after 3 tries"
     git switch "roadmap/qlhk-client-audit-remediation"
     # Update tracker to mark [!] and log failure reason, then commit on roadmap branch:
     git add docs/plans/qlhk-client/qlhk-client-audit-remediation.task.md && git commit -m "chore(roadmap): mark step K blocked"
     ```
   - Halt and await user guidance. **Branch Retention Rule**: Never delete `failed/qlhk-client-audit-remediation/*` branches automatically; preserve them until the user explicitly confirms deletion after `STEP 6` completes.
   - Unblocking procedure: Once user provides guidance, ensure you are on `roadmap/qlhk-client-audit-remediation`, change `[!]` back to `[/]` in `docs/plans/qlhk-client/qlhk-client-audit-remediation.task.md` (which resets the attempt counter to `0`), and retry Step K from the clean Step K-1 checkpoint.
7. SCOPED TESTS, PER-STEP STATIC CHECK, FLAKY POLICY VS FULL SUITE:
   - Run fast scoped tests AND the per-step static/typecheck command (`cd QLHK-Client && npx tsc --noEmit`) at each step.
   - Run the full test suite (`cd QLHK-Client && npm test`) and full typecheck (`cd QLHK-Client && npx tsc --noEmit`) at session handoffs and at the final verification gate (`Step 6`).
   - **Flaky Test Policy**: The Step 0 baseline test run is executed **twice**; any test failing in **either** run is recorded under `Known Baseline / Flaky Failures` in `docs/plans/qlhk-client/qlhk-client-audit-remediation.task.md`. During `STEP K`, handoffs, or `STEP 6`, any **new** test failure (not listed in `Known Baseline / Flaky Failures`) MUST be **re-run once** before being counted as a regression or code attempt failure (if it passes on the immediate re-run, log it as flaky in `docs/plans/qlhk-client/qlhk-client-audit-remediation.task.md` under `## Project Gotchas & Learned Invariants` and do not count it as a regression).
   - Enforce zero confirmed new failures compared to the baseline recorded in Step 0.
   - If the full test suite still fails after re-running the failing test once at handoff, treat it as a blocked gate: inspect `git log -n 4 --oneline` and test checkpoints individually (or via `git bisect`) to isolate which step caused the regression. After isolating the culprit step, **always return to the branch tip before making any edits**: run `git bisect reset` (if bisect was used), then `git switch "roadmap/qlhk-client-audit-remediation"`, and verify with `git branch --show-current`.
8. FRESH CONTEXT HANDOFF (EVERY 4 IMPLEMENTATION STEPS IN SESSION OR ON USER REQUEST):
   - After completing 4 implementation steps (`Step 1`..`Step 5`, where each committed sub-step `Step K.a` or `Step K.b` counts as **1 step** toward the 4-step counter; `Step 0` does not count) in the current session, or immediately when requested by the user—**unless Step 6 (the final step) has just completed**—run the full test suite, verify a clean working tree, output the embedded `SESSION HANDOFF CHECKPOINT` block at the bottom of this prompt, and **STOP immediately**. Do not start the next step in the current session.
9. MINIMAL WORKING DIFF:
   - Shortest working code, strict YAGNI, zero unrequested abstractions, zero temporary scratch scripts (`fix*.js`, `patch*.py`, `temp*`).

---

### STEP 0: BRANCH ISOLATION, PRE-FLIGHT GATE & TASK INITIALIZATION
1. Capture the current branch as `BASE_BRANCH` (`BASE_BRANCH=$(git branch --show-current)`), verify `HEAD` is not detached (`test -n "$BASE_BRANCH"`, halting if detached), and if `$BASE_BRANCH` is protected (`main`/`master`/`production`), confirm with the user whether to use it as `BASE_BRANCH` or switch first; then create and switch to branch: `git switch -c roadmap/qlhk-client-audit-remediation` (if branch already exists, halt and ask user whether to resume or rename).
2. Verify clean working tree: `test -z "$(git status --porcelain)"` (Must exit 0).
3. Capture baseline commit hash via `git rev-parse --short HEAD` and run baseline tests **twice**: `cd QLHK-Client && npm test && cd QLHK-Client && npm test` (running both even if the first has pre-existing failures) -> Record total passing count and exact names of any tests failing in **either** run as "flaky/known failing".
4. Create `docs/plans/qlhk-client/qlhk-client-audit-remediation.task.md` with this exact content (replace `<BASE_BRANCH>`, `<BASELINE_HASH>`, and `<PASS_COUNT>` with actual values from steps 1 and 3):

````markdown
# Task Progress Tracker

- **Project**: QLHK-Client
- **Base Branch**: `<BASE_BRANCH>`
- **Branch**: `roadmap/qlhk-client-audit-remediation`
- **Plan Reference**: `docs/plans/qlhk-client/qlhk-client-audit-remediation.md`
- **Roadmap Prompt Reference**: `docs/plans/qlhk-client/qlhk-client-audit-remediation.roadmap.md`
- **Baseline Checkpoint**: `<BASELINE_HASH>` (<PASS_COUNT> passing, verified across 2 baseline runs)
- **Known Baseline / Flaky Failures (Failed in Either Baseline Run)**:
  - None (or list exact paths/names: `path/to/test.ts > "test name" [flaky/known failing]`)
- **Status Legend**: 
  - `[ ]` Pending
  - `[/]` In Progress
  - `[x]` Completed
  - `[!]` Blocked (Circuit Breaker Tripped)

## Execution Checklist

- [ ] Step 1: Secure Storage Logout Wipe & Offline Token Header Leak Guard
  - Finding IDs: `BUG-006`, `BUG-002`
  - Target Files: `QLHK-Client/src/utils/secureStorage.ts`, `QLHK-Client/src/api/client.ts`, `QLHK-Client/src/utils/__tests__/secureStorage.test.ts`
  - Role Focus: Ensure sensitive storage is thoroughly purged on logout and offline tokens never escape across network boundary.
  - Graph Check: `git grep -n "secureStorage.clear" QLHK-Client/src/`
  - Diff Budget: <= 200 gross LOC
  - Verification: `cd QLHK-Client && npx vitest run src/utils/__tests__/secureStorage.test.ts`
  - Static Check: `cd QLHK-Client && npx tsc --noEmit`
- [ ] Step 2: Offline Login Password Verification & Credential Integrity
  - Finding IDs: `BUG-007`
  - Target Files: `QLHK-Client/src/api/authApi.ts`, `QLHK-Client/src/api/__tests__/authApi.test.ts`
  - Role Focus: Guarantee offline authentication strictly enforces password verification via cryptographic digest.
  - Graph Check: `git grep -n "getStoredSessionUser" QLHK-Client/src/`
  - Diff Budget: <= 200 gross LOC
  - Verification: `cd QLHK-Client && npx vitest run src/api/__tests__/authApi.test.ts`
  - Static Check: `cd QLHK-Client && npx tsc --noEmit`
- [ ] Step 3: Standard 11-Column Excel Household Code Collision & Normalization
  - Finding IDs: `BUG-001`
  - Target Files: `QLHK-Client/src/utils/excelParser.ts`, `QLHK-Client/src/utils/__tests__/excelParser.test.ts`
  - Role Focus: Ensure Excel parser allocates distinct, collision-free household codes regardless of row code omissions.
  - Graph Check: `git grep -n "parseStandard11ColumnsFormat" QLHK-Client/src/`
  - Diff Budget: <= 200 gross LOC
  - Verification: `cd QLHK-Client && npx vitest run src/utils/__tests__/excelParser.test.ts`
  - Static Check: `cd QLHK-Client && npx tsc --noEmit`
- [ ] Step 4: Household Head State Integrity on Member Deletion
  - Finding IDs: `BUG-004`
  - Target Files: `QLHK-Client/src/store/householdStore.ts`, `QLHK-Client/src/components/households/__tests__/HouseholdTable.test.tsx`
  - Role Focus: Defend invariant INV-02 so households never hold orphaned head names or 0 head members upon deletion.
  - Graph Check: `git grep -n "deleteMember" QLHK-Client/src/`
  - Diff Budget: <= 200 gross LOC
  - Verification: `cd QLHK-Client && npx vitest run src/components/households/__tests__/HouseholdTable.test.tsx`
  - Static Check: `cd QLHK-Client && npx tsc --noEmit`
- [ ] Step 5: Dynamic Calculation Year in Import Handlers & Analytics Metric Precedence
  - Finding IDs: `BUG-003`, `BUG-005`
  - Target Files: `QLHK-Client/src/pages/HouseholdsPage.tsx`, `QLHK-Client/src/pages/ExcelPage.tsx`, `QLHK-Client/src/components/analytics/AnalyticsDashboard.tsx`, `QLHK-Client/src/components/analytics/__tests__/AnalyticsDashboard.test.tsx`
  - Role Focus: Ensure dynamic calculation year is respected across import workflows and demographic metric keys are mapped in correct precedence.
  - Graph Check: `git grep -n "calculateAge" QLHK-Client/src/`
  - Diff Budget: <= 200 gross LOC
  - Verification: `cd QLHK-Client && npx vitest run src/components/analytics/__tests__/AnalyticsDashboard.test.tsx`
  - Static Check: `cd QLHK-Client && npx tsc --noEmit`
- [ ] Step 6: Verification & Final Gate
  - Full Test Suite: `cd QLHK-Client && npm test` (Zero new failures vs baseline)
  - Typecheck: `cd QLHK-Client && npx tsc --noEmit` (0 errors)
  - Clean Working Tree & No Orphan Patches: Verified (`test -z "$(git status --porcelain)" && test -z "$(ls -A .git/roadmap-stash/qlhk-client-audit-remediation-*.patch 2>/dev/null)"`)

## Finding Closure Mapping (When Sourced from `audit` / `optimize`)
<!-- Populate at Step 6 when steps carry Finding IDs: `BUG-001 -> <commit_hash> (Step K)` -->

## Project Gotchas & Learned Invariants
<!-- Append verified gotchas here when encountering subtle bugs -->
````

5. Commit initial tracker: `git add docs/plans/qlhk-client/qlhk-client-audit-remediation.task.md && git commit -m "chore(roadmap): init qlhk-client-audit-remediation.task.md"`.
6. Verify clean tree: `test -z "$(git status --porcelain)"`.
7. Anchor Context (Tier 1): Read `docs/plans/qlhk-client/qlhk-client-audit-remediation.task.md` and the plan header (`docs/plans/qlhk-client/qlhk-client-audit-remediation.md`). Emit log: `[Context Anchored]: qlhk-client-audit-remediation.task.md (<status>), plan.md (<goal>)`.

---

### STEP 1: Secure Storage Logout Wipe & Offline Token Header Leak Guard
- START STEP:
  + Update `docs/plans/qlhk-client/qlhk-client-audit-remediation.task.md`: Mark Step 1 as `[/]` (In Progress) and review `## Project Gotchas & Learned Invariants` (if executing a deferred `Step 1.b`, apply `.git/roadmap-stash/qlhk-client-audit-remediation-1.b.patch` via `git apply`).
- PRE-REQUISITE READS (Tier 2 slice; skip file read if already anchored in active session):
  + Plan Section: `docs/plans/qlhk-client/qlhk-client-audit-remediation.md` (Section 1: Secure Storage Logout Wipe & Offline Token Header Leak Guard)
  + Role Focus: Ensure sensitive storage is thoroughly purged on logout and offline tokens never escape across network boundary.
- GRAPH-MAP CHECK:
  + Command: `git grep -n "secureStorage.clear" QLHK-Client/src/`
- ACTIONS:
  1. In `QLHK-Client/src/utils/secureStorage.ts:116-127`, update `clear()` to iterate `localStorage` keys and remove all keys starting with `qlhk_` (including `SESSION_USER_STORE_KEY`, `USERS_CACHE_STORE_KEY`, `accessToken`, `refreshToken`, `user`).
  2. In `QLHK-Client/src/api/client.ts:61-78`, modify request interceptor to verify:
     `if (token && !token.startsWith("offline-token-") && config.headers) { config.headers.Authorization = "Bearer " + token; }`.
  3. Migrate reproduction test `docs/plans/qlhk-client/qlhk-client-audit-remediation.repro/repro_bug_006.test.ts` and `repro_bug_002.test.ts` into permanent test file `QLHK-Client/src/utils/__tests__/secureStorage.test.ts`.
- SCOPE REVIEW & DIFF BUDGET GATE:
  1. Review working tree: `git status --short` (`docs/plans/qlhk-client/qlhk-client-audit-remediation.task.md` changes are expected—do not reset or delete `docs/plans/qlhk-client/qlhk-client-audit-remediation.task.md`; reset or remove any out-of-scope files before staging).
  2. Run **DIFF GATE** (Invariant 4) -> Verify staged gross diff is `<= 200 LOC` (if > 200 LOC, unstage, write `Step 1.b` changes to `.git/roadmap-stash/qlhk-client-audit-remediation-1.b.patch`, record its path in `docs/plans/qlhk-client/qlhk-client-audit-remediation.task.md`, clean `Step 1.b` changes from working tree, and split into `Step 1.a` / `Step 1.b` in `docs/plans/qlhk-client/qlhk-client-audit-remediation.task.md`).
- VERIFICATION:
  - Run scoped tests (zero new failures vs baseline; re-run any new failure once before counting as regression): `cd QLHK-Client && npx vitest run src/utils/__tests__/secureStorage.test.ts`.
  - Run static check / typecheck (0 errors): `cd QLHK-Client && npx tsc --noEmit`.
- CHECKPOINT & PROGRESS UPDATE:
  - If gotchas discovered: Append to `## Project Gotchas & Learned Invariants` in `docs/plans/qlhk-client/qlhk-client-audit-remediation.task.md`.
  - Update `docs/plans/qlhk-client/qlhk-client-audit-remediation.task.md`: Mark Step 1 as `[x]` Completed.
  - Commit: `git add -A && git commit -m "fix(roadmap): complete step 1 - Secure Storage Logout Wipe & Offline Token Header Leak Guard [BUG-006, BUG-002]"` (if completing `Step 1.b`, delete `.git/roadmap-stash/qlhk-client-audit-remediation-1.b.patch` via `rm -f`).
  - Verify clean: `test -z "$(git status --porcelain)"`.

---

### STEP 2: Offline Login Password Verification & Credential Integrity
- START STEP:
  + Update `docs/plans/qlhk-client/qlhk-client-audit-remediation.task.md`: Mark Step 2 as `[/]` (In Progress) and review `## Project Gotchas & Learned Invariants` (if executing a deferred `Step 2.b`, apply `.git/roadmap-stash/qlhk-client-audit-remediation-2.b.patch` via `git apply`).
- PRE-REQUISITE READS (Tier 2 slice; skip file read if already anchored in active session):
  + Plan Section: `docs/plans/qlhk-client/qlhk-client-audit-remediation.md` (Section 2: Offline Login Password Verification & Credential Integrity)
  + Role Focus: Guarantee offline authentication strictly enforces password verification via cryptographic digest.
- GRAPH-MAP CHECK:
  + Command: `git grep -n "getStoredSessionUser" QLHK-Client/src/`
- ACTIONS:
  1. In `QLHK-Client/src/api/authApi.ts`, add helper `async function hashPassword(password: string): Promise<string>` using `crypto.subtle.digest("SHA-256", new TextEncoder().encode(password))` formatted as hex.
  2. In `authApi.login()`, when online login succeeds, compute `passwordHash` and persist it via `saveStoredSessionUser({ ...session, passwordHash })`.
  3. In `authApi.login()` catch block, when network error occurs and `storedSession` matches `inputUser`, hash `credentials.password` and compare against `storedSession.passwordHash`. If mismatched or missing, throw `Error("Tên đăng nhập hoặc mật khẩu không chính xác.")`.
  4. Migrate reproduction test from `docs/plans/qlhk-client/qlhk-client-audit-remediation.repro/repro_bug_007.test.ts` into permanent test file `QLHK-Client/src/api/__tests__/authApi.test.ts`.
- SCOPE REVIEW & DIFF BUDGET GATE:
  1. Review working tree: `git status --short` (`docs/plans/qlhk-client/qlhk-client-audit-remediation.task.md` changes are expected—do not reset or delete `docs/plans/qlhk-client/qlhk-client-audit-remediation.task.md`; reset or remove any out-of-scope files before staging).
  2. Run **DIFF GATE** (Invariant 4) -> Verify staged gross diff is `<= 200 LOC` (if > 200 LOC, unstage, write `Step 2.b` changes to `.git/roadmap-stash/qlhk-client-audit-remediation-2.b.patch`, record its path in `docs/plans/qlhk-client/qlhk-client-audit-remediation.task.md`, clean `Step 2.b` changes from working tree, and split into `Step 2.a` / `Step 2.b` in `docs/plans/qlhk-client/qlhk-client-audit-remediation.task.md`).
- VERIFICATION:
  - Run scoped tests (zero new failures vs baseline; re-run any new failure once before counting as regression): `cd QLHK-Client && npx vitest run src/api/__tests__/authApi.test.ts`.
  - Run static check / typecheck (0 errors): `cd QLHK-Client && npx tsc --noEmit`.
- CHECKPOINT & PROGRESS UPDATE:
  - If gotchas discovered: Append to `## Project Gotchas & Learned Invariants` in `docs/plans/qlhk-client/qlhk-client-audit-remediation.task.md`.
  - Update `docs/plans/qlhk-client/qlhk-client-audit-remediation.task.md`: Mark Step 2 as `[x]` Completed.
  - Commit: `git add -A && git commit -m "fix(roadmap): complete step 2 - Offline Login Password Verification & Credential Integrity [BUG-007]"` (if completing `Step 2.b`, delete `.git/roadmap-stash/qlhk-client-audit-remediation-2.b.patch` via `rm -f`).
  - Verify clean: `test -z "$(git status --porcelain)"`.

---

### STEP 3: Standard 11-Column Excel Household Code Collision & Normalization
- START STEP:
  + Update `docs/plans/qlhk-client/qlhk-client-audit-remediation.task.md`: Mark Step 3 as `[/]` (In Progress) and review `## Project Gotchas & Learned Invariants` (if executing a deferred `Step 3.b`, apply `.git/roadmap-stash/qlhk-client-audit-remediation-3.b.patch` via `git apply`).
- PRE-REQUISITE READS (Tier 2 slice; skip file read if already anchored in active session):
  + Plan Section: `docs/plans/qlhk-client/qlhk-client-audit-remediation.md` (Section 3: Standard 11-Column Excel Household Code Collision & Normalization)
  + Role Focus: Ensure Excel parser allocates distinct, collision-free household codes regardless of row code omissions.
- GRAPH-MAP CHECK:
  + Command: `git grep -n "parseStandard11ColumnsFormat" QLHK-Client/src/`
- ACTIONS:
  1. In `QLHK-Client/src/utils/excelParser.ts:337-438` (`parseStandard11ColumnsFormat`):
     - Maintain `const allocatedCodes = new Set<string>()`.
     - Whenever explicit `code` is present on a row, add it to `allocatedCodes`.
     - When generating auto-code `HK-XXXX`, increment `householdCounter` in a loop until `code` is not in `allocatedCodes`, then add to `allocatedCodes`.
     - Update `isHead` check to include unaccented text:
       `const isHead = relLower.includes("chủ hộ") || relLower === "chu ho" || relLower === "ch";`
  2. Migrate reproduction test from `docs/plans/qlhk-client/qlhk-client-audit-remediation.repro/repro_bug_001.test.ts` into permanent test file `QLHK-Client/src/utils/__tests__/excelParser.test.ts`.
- SCOPE REVIEW & DIFF BUDGET GATE:
  1. Review working tree: `git status --short` (`docs/plans/qlhk-client/qlhk-client-audit-remediation.task.md` changes are expected—do not reset or delete `docs/plans/qlhk-client/qlhk-client-audit-remediation.task.md`; reset or remove any out-of-scope files before staging).
  2. Run **DIFF GATE** (Invariant 4) -> Verify staged gross diff is `<= 200 LOC` (if > 200 LOC, unstage, write `Step 3.b` changes to `.git/roadmap-stash/qlhk-client-audit-remediation-3.b.patch`, record its path in `docs/plans/qlhk-client/qlhk-client-audit-remediation.task.md`, clean `Step 3.b` changes from working tree, and split into `Step 3.a` / `Step 3.b` in `docs/plans/qlhk-client/qlhk-client-audit-remediation.task.md`).
- VERIFICATION:
  - Run scoped tests (zero new failures vs baseline; re-run any new failure once before counting as regression): `cd QLHK-Client && npx vitest run src/utils/__tests__/excelParser.test.ts`.
  - Run static check / typecheck (0 errors): `cd QLHK-Client && npx tsc --noEmit`.
- CHECKPOINT & PROGRESS UPDATE:
  - If gotchas discovered: Append to `## Project Gotchas & Learned Invariants` in `docs/plans/qlhk-client/qlhk-client-audit-remediation.task.md`.
  - Update `docs/plans/qlhk-client/qlhk-client-audit-remediation.task.md`: Mark Step 3 as `[x]` Completed.
  - Commit: `git add -A && git commit -m "fix(roadmap): complete step 3 - Standard 11-Column Excel Household Code Collision & Normalization [BUG-001]"` (if completing `Step 3.b`, delete `.git/roadmap-stash/qlhk-client-audit-remediation-3.b.patch` via `rm -f`).
  - Verify clean: `test -z "$(git status --porcelain)"`.

---

### STEP 4: Household Head State Integrity on Member Deletion
- START STEP:
  + Update `docs/plans/qlhk-client/qlhk-client-audit-remediation.task.md`: Mark Step 4 as `[/]` (In Progress) and review `## Project Gotchas & Learned Invariants` (if executing a deferred `Step 4.b`, apply `.git/roadmap-stash/qlhk-client-audit-remediation-4.b.patch` via `git apply`).
- PRE-REQUISITE READS (Tier 2 slice; skip file read if already anchored in active session):
  + Plan Section: `docs/plans/qlhk-client/qlhk-client-audit-remediation.md` (Section 4: Household Head State Integrity on Member Deletion)
  + Role Focus: Defend invariant INV-02 so households never hold orphaned head names or 0 head members upon deletion.
- GRAPH-MAP CHECK:
  + Command: `git grep -n "deleteMember" QLHK-Client/src/`
- ACTIONS:
  1. In `QLHK-Client/src/store/householdStore.ts:491-504` (`deleteMember`):
     - Identify if deleted member has `is_head === true` or matches `h.head_name` / `h.head_cccd`.
     - Filter out the member into `updatedMembers`.
     - If deleted member was head, promote the first remaining member (`updatedMembers[0]`):
       `updatedMembers[0] = { ...updatedMembers[0], is_head: true, relationship: "Chủ hộ" };`
       Update `head_name: updatedMembers[0].full_name, head_cccd: updatedMembers[0].cccd`.
     - If `updatedMembers.length === 0`, set `head_name: "Chưa xác định", head_cccd: ""`.
  2. Migrate reproduction test from `docs/plans/qlhk-client/qlhk-client-audit-remediation.repro/repro_bug_004.test.ts` into permanent test file `QLHK-Client/src/components/households/__tests__/HouseholdTable.test.tsx`.
- SCOPE REVIEW & DIFF BUDGET GATE:
  1. Review working tree: `git status --short` (`docs/plans/qlhk-client/qlhk-client-audit-remediation.task.md` changes are expected—do not reset or delete `docs/plans/qlhk-client/qlhk-client-audit-remediation.task.md`; reset or remove any out-of-scope files before staging).
  2. Run **DIFF GATE** (Invariant 4) -> Verify staged gross diff is `<= 200 LOC` (if > 200 LOC, unstage, write `Step 4.b` changes to `.git/roadmap-stash/qlhk-client-audit-remediation-4.b.patch`, record its path in `docs/plans/qlhk-client/qlhk-client-audit-remediation.task.md`, clean `Step 4.b` changes from working tree, and split into `Step 4.a` / `Step 4.b` in `docs/plans/qlhk-client/qlhk-client-audit-remediation.task.md`).
- VERIFICATION:
  - Run scoped tests (zero new failures vs baseline; re-run any new failure once before counting as regression): `cd QLHK-Client && npx vitest run src/components/households/__tests__/HouseholdTable.test.tsx`.
  - Run static check / typecheck (0 errors): `cd QLHK-Client && npx tsc --noEmit`.
- CHECKPOINT & PROGRESS UPDATE:
  - If gotchas discovered: Append to `## Project Gotchas & Learned Invariants` in `docs/plans/qlhk-client/qlhk-client-audit-remediation.task.md`.
  - Update `docs/plans/qlhk-client/qlhk-client-audit-remediation.task.md`: Mark Step 4 as `[x]` Completed.
  - Commit: `git add -A && git commit -m "fix(roadmap): complete step 4 - Household Head State Integrity on Member Deletion [BUG-004]"` (if completing `Step 4.b`, delete `.git/roadmap-stash/qlhk-client-audit-remediation-4.b.patch` via `rm -f`).
  - Verify clean: `test -z "$(git status --porcelain)"`.

---

### STEP 5: Dynamic Calculation Year in Import Handlers & Analytics Metric Precedence
- START STEP:
  + Update `docs/plans/qlhk-client/qlhk-client-audit-remediation.task.md`: Mark Step 5 as `[/]` (In Progress) and review `## Project Gotchas & Learned Invariants` (if executing a deferred `Step 5.b`, apply `.git/roadmap-stash/qlhk-client-audit-remediation-5.b.patch` via `git apply`).
- PRE-REQUISITE READS (Tier 2 slice; skip file read if already anchored in active session):
  + Plan Section: `docs/plans/qlhk-client/qlhk-client-audit-remediation.md` (Section 5: Dynamic Calculation Year in Import Handlers & Analytics Metric Precedence)
  + Role Focus: Ensure dynamic calculation year is respected across import workflows and demographic metric keys are mapped in correct precedence.
- GRAPH-MAP CHECK:
  + Command: `git grep -n "calculateAge" QLHK-Client/src/`
- ACTIONS:
  1. In `QLHK-Client/src/pages/HouseholdsPage.tsx:956-965`, replace literal `2026` with `calculationYear`:
     `age = calculateAge(dobFormatted, calculationYear);`
     `birthYear = dobVal.birthYear ?? (calculationYear - 26);`
  2. In `QLHK-Client/src/pages/ExcelPage.tsx:138-146`, replace literal `2026` with dynamic `calculationYear` extracted from `useApp()`.
  3. In `QLHK-Client/src/components/analytics/AnalyticsDashboard.tsx:432-445`, correct `ageStats` evaluation order so `militaryAge` and `workingAge` take priority:
     - `militaryAge: apiOverview.ageGroups?.militaryAge || (apiOverview.ageGroups as any)?.from6to17 || apiOverview.ageGroups?.youth || localCalculated.stats.ageStats.militaryAge`
     - `workingAge: apiOverview.ageGroups?.workingAge || (apiOverview.ageGroups as any)?.from18to60 || apiOverview.ageGroups?.adult || localCalculated.stats.ageStats.workingAge`
  4. Migrate reproduction tests from `docs/plans/qlhk-client/qlhk-client-audit-remediation.repro/repro_bug_003.test.ts` and `repro_bug_005.test.ts` into permanent test file `QLHK-Client/src/components/analytics/__tests__/AnalyticsDashboard.test.tsx`.
- SCOPE REVIEW & DIFF BUDGET GATE:
  1. Review working tree: `git status --short` (`docs/plans/qlhk-client/qlhk-client-audit-remediation.task.md` changes are expected—do not reset or delete `docs/plans/qlhk-client/qlhk-client-audit-remediation.task.md`; reset or remove any out-of-scope files before staging).
  2. Run **DIFF GATE** (Invariant 4) -> Verify staged gross diff is `<= 200 LOC` (if > 200 LOC, unstage, write `Step 5.b` changes to `.git/roadmap-stash/qlhk-client-audit-remediation-5.b.patch`, record its path in `docs/plans/qlhk-client/qlhk-client-audit-remediation.task.md`, clean `Step 5.b` changes from working tree, and split into `Step 5.a` / `Step 5.b` in `docs/plans/qlhk-client/qlhk-client-audit-remediation.task.md`).
- VERIFICATION:
  - Run scoped tests (zero new failures vs baseline; re-run any new failure once before counting as regression): `cd QLHK-Client && npx vitest run src/components/analytics/__tests__/AnalyticsDashboard.test.tsx`.
  - Run static check / typecheck (0 errors): `cd QLHK-Client && npx tsc --noEmit`.
- CHECKPOINT & PROGRESS UPDATE:
  - If gotchas discovered: Append to `## Project Gotchas & Learned Invariants` in `docs/plans/qlhk-client/qlhk-client-audit-remediation.task.md`.
  - Update `docs/plans/qlhk-client/qlhk-client-audit-remediation.task.md`: Mark Step 5 as `[x]` Completed.
  - Commit: `git add -A && git commit -m "fix(roadmap): complete step 5 - Dynamic Calculation Year in Import Handlers & Analytics Metric Precedence [BUG-003, BUG-005]"` (if completing `Step 5.b`, delete `.git/roadmap-stash/qlhk-client-audit-remediation-5.b.patch` via `rm -f`).
  - Verify clean: `test -z "$(git status --porcelain)"`.

---

### STEP 6: FULL SUITE VERIFICATION & ZERO-REGRESSION GATE
- START STEP:
  + Update `docs/plans/qlhk-client/qlhk-client-audit-remediation.task.md`: Mark Step 6 as `[/]` (In Progress).
- ACTIONS:
  1. Run Full Test Suite: `cd QLHK-Client && npm test` (Zero new failures vs baseline).
  2. Run Typecheck: `cd QLHK-Client && npx tsc --noEmit` (0 errors).
  3. Review Working Tree & Orphan Patches: `git status --short` (`docs/plans/qlhk-client/qlhk-client-audit-remediation.task.md` changes expected; verify no temporary artifacts, untracked files, or leftover `.git/roadmap-stash/qlhk-client-audit-remediation-*.patch` files).
  4. Update `docs/plans/qlhk-client/qlhk-client-audit-remediation.task.md`: Mark Step 6 and all checklist items as `[x]` Completed, and record the `Finding ID -> commit hash` closure mapping under `## Finding Closure Mapping` in `docs/plans/qlhk-client/qlhk-client-audit-remediation.task.md` and in the final completion summary.
  5. Final Commit: `git add -A && git commit -m "chore(roadmap): complete qlhk-client-audit-remediation verification gate"`.
  6. Final Clean & No-Orphan-Patch Verification: `test -z "$(git status --porcelain)" && test -z "$(ls -A .git/roadmap-stash/qlhk-client-audit-remediation-*.patch 2>/dev/null)"` (Must exit 0).
- POST-GATE COMPLETION & BRANCH HANDOFF:
  1. Remove `docs/plans/qlhk-client/qlhk-client-audit-remediation.task.md` in a final cleanup commit by default (unless the user explicitly requested keeping it in the repository):
     `git rm docs/plans/qlhk-client/qlhk-client-audit-remediation.task.md && git commit -m "chore(roadmap): remove qlhk-client-audit-remediation.task.md" && test -z "$(git status --porcelain)"`
  2. List any preserved circuit-breaker WIP branches (`git branch --list "failed/qlhk-client-audit-remediation/*"`) so the user can inspect or confirm deleting them (never delete `failed/qlhk-client-audit-remediation/*` branches without explicit user confirmation), present the completion summary (commits created on `roadmap/qlhk-client-audit-remediation` vs. `<BASE_BRANCH>`, plus the `BUG-ID / OPT-ID -> commit hash` closure table when applicable), and ask the user how to proceed:
     - **Option 1**: Open a Pull Request from `roadmap/qlhk-client-audit-remediation` into `<BASE_BRANCH>`.
     - **Option 2**: Merge `roadmap/qlhk-client-audit-remediation` into `<BASE_BRANCH>` locally (`git switch "<BASE_BRANCH>" && git merge --no-ff "roadmap/qlhk-client-audit-remediation"`).
     - **Option 3**: Leave the branch `roadmap/qlhk-client-audit-remediation` as-is for manual inspection.

---

### SESSION HANDOFF CHECKPOINT TEMPLATE (Output after every 4 implementation steps in a session, unless Step 6 just finished)

When 4 implementation steps (`Step 0` excluded) are completed in the current session (or when requested by the user), and `Step 6` is not yet complete, run `cd QLHK-Client && npm test`, ensure clean git status, output the block below (replacing `<STEPS_COMPLETED_IN_SESSION>` with the actual count), and **STOP immediately** (do not start the next step in this session):

````text
### 🔄 Session Handoff Checkpoint

Completed <STEPS_COMPLETED_IN_SESSION> step(s) in this session on branch `roadmap/qlhk-client-audit-remediation` (base branch: `<BASE_BRANCH>`). Full test suite verified.

To resume in a fresh session:
1. Read `docs/plans/qlhk-client/qlhk-client-audit-remediation.roadmap.md` (the committed original roadmap prompt containing all `STRICT INVARIANTS` and step definitions) then continue — or paste the **ORIGINAL roadmap prompt** below as a fallback.
2. Append or send this resume block immediately after:

```text
Resume execution of the roadmap on branch `roadmap/qlhk-client-audit-remediation` (base branch: `<BASE_BRANCH>`). Read `docs/plans/qlhk-client/qlhk-client-audit-remediation.roadmap.md` (the committed original roadmap prompt) for all `STRICT INVARIANTS` and step definitions—or use the original roadmap prompt pasted above as a fallback.

CRITICAL: Do NOT re-execute STEP 0 or any step already marked `[x]` in `docs/plans/qlhk-client/qlhk-client-audit-remediation.task.md`. The branch and tracker already exist—Invariant 1's `git switch -c` applies only to the initial fresh start.

Directives:
1. Switch to branch: `git switch roadmap/qlhk-client-audit-remediation`
2. Working tree check:
   - If clean (`test -z "$(git status --porcelain)"` exits 0), proceed to Directive 3.
   - If dirty, inspect `docs/plans/qlhk-client/qlhk-client-audit-remediation.task.md`:
     + If a step is marked `[/]` (In Progress), proceed to Directive 5 to evaluate WIP changes.
     + If dirty without an in-progress step, halt immediately and alert the user.
3. Context Anchoring (Tier 1): Read `docs/plans/qlhk-client/qlhk-client-audit-remediation.task.md` (progress, known failures, gotchas) and the plan header (`docs/plans/qlhk-client/qlhk-client-audit-remediation.md`). Emit mandatory verification log: `[Context Anchored]: qlhk-client-audit-remediation.task.md (<status>), plan.md (<goal>)`.
4. Inspect `git log -n 3 --oneline` to confirm the last committed checkpoint.
5. If Step K is marked `[/]` (In Progress) with uncommitted WIP, inspect existing changes via `git status --short` before continuing.
6. If Step K is marked `[!]` (Blocked):
   - Review the failure reason logged in `docs/plans/qlhk-client/qlhk-client-audit-remediation.task.md`.
   - Await user guidance on the resolution strategy.
   - Upon guidance, update `docs/plans/qlhk-client/qlhk-client-audit-remediation.task.md` to mark Step K back to `[/]` (In Progress) and resume implementation from the clean Step K-1 commit.
7. Otherwise, proceed with the next pending `[ ]` step following the strict invariants and step definitions in the roadmap prompt pasted above.
```
````
`````