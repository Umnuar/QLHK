`````text
[MANDATORY SYSTEM DIRECTIVE]:
You are executing a multi-step, behavior-preserving hygiene and dead-code elimination plan produced by the `clean` skill. The findings are embedded in this prompt as `FINDING BRIEF` blocks inside each step. The discovery workspace (`clean/`) is git-excluded and may not exist on this machine: NEVER depend on it.
Clean prompt file: docs/plans/cleanup.clean.md

ENVIRONMENT REQUIREMENT:
All shell commands require a POSIX-compatible shell (Git Bash on Windows, WSL, Linux, or macOS).

STRICT INVARIANTS:
1. BRANCH & PRE-FLIGHT (Initial Start Only):
   - **Pre-Switch Detached-HEAD & Protected-Branch Guard**: Verify `HEAD` is not detached (`test -n "$(git branch --show-current)"`, halting if detached). Set `BASE_BRANCH="${BASE_BRANCH:-roadmap/remediate-optimization-findings}"` (the intended base branch `roadmap/remediate-optimization-findings` captured and confirmed when the prompt was generated).
   - Create and switch to isolated branch: `git switch -c clean/cleanup-client`. If the branch already exists on a fresh start, halt immediately and ask the user whether to resume the existing branch or choose a new branch name. (When resuming via a Handoff Prompt, skip `STEP 0` and use `git switch clean/cleanup-client`.)
   - Verify clean working tree: `test -z "$(git status --porcelain)"`.
   - Execute the baseline test command **twice** (`Run 1` and `Run 2`), record `Base Branch: <BASE_BRANCH>`, the passing count, and exact names of any tests failing in **either** run as "flaky/known failing" into `task.md`. Run `cd QLHK-Client && npx tsc --noEmit` once and record the baseline error count.
   - **API Surface Snapshot**: Capture the project's public surface (package exports, public route table, CLI help, or type declarations) and record in `task.md` before making any code modifications.
   - **Ignored & Untracked Files Inventory**: Capture baseline list of ignored files (`GIT_COMMON_DIR=$(git rev-parse --git-common-dir) && git ls-files --others --ignored --exclude-standard --directory | sort > "$GIT_COMMON_DIR/roadmap-ignored-baseline.txt"`) and record file count in `task.md` to guarantee zero pre-existing ignored/local files (e.g. `.env`) are deleted during execution.
   - Commit `task.md` immediately. Never build on an uncommitted dirty tree.
2. CONTEXTUAL INGESTION:
   - The `FINDING BRIEF` embedded in each step is the authoritative description of the cleanup candidate. Do NOT read or depend on `clean/` paths. Characterization test sources are either inlined in the step or committed under `docs/plans/cleanup.clean.repro/`.
   - Read the files at `Location` in a single parallel tool-call turn before modifying code, unless already loaded in the active session context.
   - Follow the embedded `Role Focus` invariants and always review `## Project Gotchas & Learned Invariants` in `task.md` before starting a step.
3. GRAPH-AWARE BLAST RADIUS:
   - When a step specifies a `GRAPH-MAP CHECK`, check if the tool (`graft`, `graphify`, `codegraph`) is installed before querying callers/callees. Fall back to native grep or LSP find-references if unavailable.
4. SCOPE HYGIENE & DIFF GATE (<= 200 GROSS LOC OR <= 25 DELETED FILES OUTSIDE TARGET DIRS):
   - After implementing changes and BEFORE staging, run `git status --short`. Note that `task.md` modifications (`[/]`) are expected—never reset or delete `task.md`. If out-of-scope files (`.env*`, scratch scripts, temporary files, build artifacts) appear, reset (`git reset <file>`), delete, or add to `.gitignore`.
   - Run the **DIFF GATE** command to stage changes and verify:
     1. Modified/Added files gross LOC <= 200 (binary files count as 0 LOC).
     2. Pure deletions (`git rm` / `git rm --cached`): <= 25 individual deleted files outside the step's designated target directories. For whole-directory untracks (`SRC-02`), up to 5 target directory roots listed in the step's `Target Files` are declared in `STEP_TARGET_DIRS` and exempted via pathspec exclusions. Exempted directories must remain on disk and be ignored by `.gitignore`:
     ```bash
     git add -A
     MOD_LOC=$(git diff --cached --numstat --diff-filter=d -- . \
       ':(exclude)*.lock' ':(exclude)*lock.json' \
       ':(exclude,glob)**/migrations/**' ':(exclude,glob)**/fixtures/**' \
       ':(exclude)task.md' \
       | awk '{s+=$1+$2} END {print s+0}')
     STEP_TARGET_DIRS="${STEP_TARGET_DIRS:-}"
     EXCLUDE_ARGS=()
     for d in $STEP_TARGET_DIRS; do
       test -n "$d" && EXCLUDE_ARGS+=(":(exclude)${d%/}/**")
     done
     DEL_OUTSIDE=$(git diff --cached --name-only --diff-filter=D -- . \
       ':(exclude)task.md' "${EXCLUDE_ARGS[@]}" \
       | wc -l | awk '{print $1+0}')
     echo "Modified LOC: ${MOD_LOC} (max 200), Deleted files outside target dirs: ${DEL_OUTSIDE} (max 25)"
     test "$MOD_LOC" -le 200 && test "$DEL_OUTSIDE" -le 25
     for d in $STEP_TARGET_DIRS; do
       test -n "$d" && { test -d "$d" && git check-ignore -q "$d/" || { echo "FAIL: exempted dir $d must remain on disk and be ignored"; exit 1; }; }
     done
     ```
   - If limits exceeded, unstage (`git reset`), split the step in `task.md` into `Step K.a` and `Step K.b` touching **disjoint sets of files** (without renumbering subsequent steps), and execute `Step K.a` first:
     1. Save the `Step K.b` changes to an isolated patch file inside `.git/` (so the working tree stays 100% clean), explicitly backing up `task.md` so in-progress progress markers are never lost:
        ```bash
        mkdir -p .git/roadmap-stash
        cp task.md .git/roadmap-task.md.bak
        git add -N -- step_Kb_new_files 2>/dev/null || true
        git diff -- step_Kb_files step_Kb_new_files > ".git/roadmap-stash/cleanup-client-K.b.patch"
        git checkout -- step_Kb_files
        git clean -fd -- step_Kb_new_files
        mv .git/roadmap-task.md.bak task.md
        ```
     2. Record `Deferred Patch: .git/roadmap-stash/cleanup-client-K.b.patch` under `Step K.b` in `task.md`. Never commit `Step K.b` changes inside `Step K.a`.
     3. When `Step K.b` starts, apply the saved patch via `git apply ".git/roadmap-stash/cleanup-client-K.b.patch"`, and immediately after committing `Step K.b`, delete the patch file via `rm -f ".git/roadmap-stash/cleanup-client-K.b.patch"`. Each committed sub-step counts as **1 step** toward the 4-step session handoff counter.
5. ATOMIC COMMITS & COMMIT HOOKS:
   - After BEFORE/AFTER equivalence and scoped tests pass, update `task.md` (`[x]` + any new gotchas) and commit one finding per commit using `refactor` (for `CL-XX`) or `chore` (for `SRC-XX`):
     ```bash
     git add -A && git commit -m "refactor(scope): complete step K - title [Finding-ID]" \
       -m "Cleanup class: CL-01" \
       -m "Proof: Reference proof summary -> 0 hits" \
       -m "BEFORE: scoped command -> pass summary" \
       -m "AFTER: scoped command -> pass summary; API-SURFACE: unchanged"
     ```
   - For skipped steps (`[-]` or `[~]`), commit only `task.md`:
     `git add task.md && git commit -m "chore(clean): skip step K (reason) [Finding-ID]"`
   - Never use `--no-verify`. Never push, rebase, or force-anything. Clean tree after commit.
6. SAFE CIRCUIT BREAKER ROLLBACK & UNBLOCKING:
   - **What Counts as an Attempt**: A single cycle of modifying code for the current step (or sub-step `K.a`/`K.b`) followed by a failing scoped test, failing per-step static/typecheck command, a new full-suite regression, an API Surface break, or a pre-commit hook failure caused by the agent's own code change.
   - **Pre-Retry Reset Rule (Before Attempt 2 and Attempt 3)**: Before starting each retry attempt (`Attempt 2` or `Attempt 3`), reset all tracked and untracked code changes back to the last committed checkpoint while preserving `task.md`:
     ```bash
     cp task.md .git/roadmap-task.md.bak
     git restore --staged . && git checkout -- . && git clean -fd -e task.md
     mv .git/roadmap-task.md.bak task.md
     ```
   - **Counter Reset Rule**: The 3-attempt counter is scoped per step (or sub-step `K.a`/`K.b`) and resets to `0` when: (a) a step passes verification and is committed (`[x]`), or (b) the user provides unblocking guidance after a `[!]` halt and the step is transitioned from `[!]` back to `[/]`.
   - If a step fails after 3 consecutive attempts, preserve WIP on a unique branch and restore `clean/cleanup-client` cleanly:
     ```bash
     ATTEMPT_TS=$(date +%s)
     git switch -c "failed/cleanup-client/step-K-attempt-${ATTEMPT_TS}"
     git add -A && git commit -m "wip: failed step K attempt after 3 tries"
     git switch "clean/cleanup-client"
     git add task.md && git commit -m "chore(clean): mark step K blocked (CIRCUIT_BREAKER)"
     ```
   - Halt and await user guidance. Never delete `failed/cleanup-client/*` branches automatically.
   - Unblocking procedure: Once user provides guidance, ensure you are on `clean/cleanup-client`, change `[!]` back to `[/]` in `task.md` (which resets the attempt counter to `0`), and retry Step K from the clean Step K-1 checkpoint. If the user replies `skip`, mark the step `[~]` with reason `BLOCKED_BY_USER_SKIP`, commit `task.md`, and continue with the next step.
7. SCOPED TESTS, PER-STEP STATIC CHECK, FLAKY POLICY VS FULL SUITE:
   - Run fast scoped tests AND `cd QLHK-Client && npx tsc --noEmit` at each step.
   - Run full test suite and full typecheck at session handoffs and at the final verification gate (`Step 8`).
   - **Flaky Test Policy**: Double baseline run; any test failing in either run is recorded in `task.md`. During `STEP K`, handoffs, or `STEP 8`, any new failure must be re-run once before counting as a regression.
   - Enforce zero confirmed new failures compared to baseline.
8. FRESH CONTEXT HANDOFF (EVERY 4 STEPS IN SESSION OR ON USER REQUEST):
   - After **4 implementation steps reach a terminal status** (`[x]` committed, `[~]` deferred, or `[-]` not applicable; each committed sub-step counts as 1 step) in the current session, run the full test suite, verify clean working tree, output the embedded `SESSION HANDOFF CHECKPOINT` block, and **STOP immediately**.
9. MINIMAL WORKING DIFF:
   - Shortest working code, strict YAGNI, zero temporary scratch scripts. Only modify `Target Files` (+ at most 2 justified extra files).
10. CLEAN DISCIPLINE & EVIDENCE GATES:
   - **Re-validate first**: Re-read `Location`, confirm candidate exists. If gone -> `[-] ALREADY_FIXED`/`STALE`; if live external references exist -> `[-] FINDING_INVALID`; if public contract change required -> `[~] NEEDS_DECISION`; if human category -> `[~] REQUIRES_HUMAN`. For `[-]`/`[~]`: update `task.md`, run `git add task.md && git commit -m "chore(clean): skip step K (reason) [Finding-ID]"`, verify clean tree, and proceed.
   - **Mandatory Reference Proof**:
     1. Static Search: Whole-repo search (`grep -rn`, LSP references, `graft callers`) across all code, tests, CI, scripts, docs, configs showing zero external references (or references restricted strictly to dead code chains removed in the same step).
     2. Dynamic Checklist: Explicitly verify symbol/file is NOT loaded via reflection (`getattr`, `eval`), DI bindings, convention autodiscovery (routes, models), serialization keys, package exports, or deployment configs (`package.json#main`, `action.yml`, Pages).
     3. Tier Outcome: Must be `PROVEN_DEAD` to delete automatically.
   - **BEFORE/AFTER Equivalence Gate**:
     1. BEFORE: Scoped tests PASS and typecheck baseline recorded on unchanged code.
     2. Characterization test: Required for `CL-06`, `CL-07`, `CL-09`. Must PASS before and after. Pure deletions do NOT require writing tests.
     3. AFTER: Scoped tests PASS, 0 new typecheck errors, build succeeds, API Surface Snapshot is unchanged (or `n/a (non-code)` for pure non-code assets).
   - **In-Step Orphaned Import Cleanup**: A structural deletion step (`CL-03`, `CL-04`, `CL-02`) is permitted to remove any imports in the same file that become orphaned as a direct consequence of deleting that dead code.
   - **Never Weaken Tests Rule**: Do not delete, skip, or loosen existing tests. A test file may be removed ONLY when it exclusively exercises code removed in the same step.
   - **Python / Named Arguments Guard**: Never rename unused kwargs or named parameters in Python or languages supporting named arguments.
   - **Async Try/Catch Guard**: Never unwrap `return await` inside `try/catch` or `try/finally`.
   - **Untracked File Sanctity & Safe Cleanup**: Never delete pre-existing untracked files. `git clean -fd` is permitted strictly to clean ephemeral files generated by a failed attempt during Pre-Retry Reset or step splitting.
   - **Human-Only Categories**: Package manifests (`SRC-08`), untracked clutter (`SRC-10`), secrets, and migrations are never auto-applied.

---

## CLEAN STRATEGIES TO APPLY (Starting Points; the Finding Brief Takes Precedence)

### 1. Generic Rules (Always Followed)
1. **Behavior preservation is absolute**: The core contract of `clean` is that observable system behavior is IDENTICAL before and after. Return values, exception semantics, side effects, database queries, network calls, log outputs, and public API surfaces must not change.
2. **Reference Proof before deletion**: Never delete or rename a symbol or file because it "looks unused". Every deletion requires a complete Reference Proof: whole-repository static search across code, tests, CI, scripts, docs, and configs showing zero external references (or references strictly confined to dead code chains removed in the same step), plus an explicit dynamic checklist (reflection, DI, convention autodiscovery, serialization, templates).
3. **Orphaned import cleanup in structural steps**: A structural code deletion step (`CL-03`, `CL-04`, `CL-02`, etc.) is explicitly permitted to remove any imports within the same file that become orphaned as a direct consequence of removing that dead code, and those deleted import lines count toward the step's gross LOC budget. This prevents cascading dead-import drift without needing a separate `CL-01` step.
4. **Never rename kwargs or named parameters**: In Python or any language supporting keyword arguments, renaming an unused parameter (e.g. adding `_` prefix) alters the caller interface and breaks callers using keyword invocation (`func(param=val)`). In such languages, leave the parameter name intact or use language-specific unused directives without renaming. In TS/JS, `_` prefix is permitted strictly for positional callback signatures.
5. **Never unwrap `return await` inside `try/catch/finally`**: While `return await promise` is redundant at the top level of an async function, inside a `try/catch` or `try/finally` block it is essential: unwrapping `await` causes rejected promises to escape the local `catch` or bypass `finally`.
6. **Never rename or alter public/exported APIs in `code` mode**: All renames or signature modifications are strictly limited to private, file-local, or package-internal symbols. Changing an export or public contract requires human approval -> route to Excluded Block (`NEEDS_DECISION`).
7. **Never weaken or delete tests**: Do not delete, skip (`.skip`, `xit`, `@Ignore`), or loosen assertions in existing test suites. A test file may be deleted ONLY if it exclusively exercises code removed in the same step and the brief provides explicit proof.
8. **Characterization tests for behavioral refactors**: For deduplication (`CL-06`), construct simplification (`CL-07`), or function extraction (`CL-09`), write or verify a scoped characterization test capturing current behavior before touching production code; confirm it passes before and after the change.
9. **Smallest safe change & Diff Gate**: One cleanup class and cohesive cluster per step. Staged modifications/additions must remain `<= 200 gross LOC`. Pure deletions (`git rm` / `git rm --cached`) must remain `<= 25 files` outside target directories; `SRC-02` allows up to 5 exempted target directory roots where all deleted files reside strictly inside the step's `Target Files` and remain on disk ignored. If limits are exceeded, split into `Step K.a` and `Step K.b` touching **disjoint file sets** via `.git/roadmap-stash/`.
10. **Untracked File Sanctity & Clean Exception**: Never delete pre-existing untracked files. Exception: `git clean -fd` is permitted strictly during Pre-Retry Reset and step splitting to discard ephemeral files created by the current failed attempt (guaranteed safe because each step starts from a clean tree verified at Step 0 and previous step commit).
11. **No new dependencies or configuration sprawl**: Never introduce a new library, package, or build tool to perform cleanup. Use existing project tooling or the standard library.
12. **Comment hygiene rule**: Remove only commented-out executable code blocks. Never remove explanatory comments, architectural notes, license headers, docstrings, or TODOs (unless specifically addressing `SRC-07` with proof of resolution).
13. **Respect generated and vendored code**: Never edit or clean files marked `generated`, `DO NOT EDIT`, `@generated`, or located in `dist/`, `build/`, `vendor/`, `node_modules/`, or snapshots.
14. **Human-only boundaries**: Manifests and lockfiles (`SRC-08`), secrets, CI/IaC pipelines, live database migrations, and untracked files (`SRC-10`) are permanently excluded from automated execution and reported in the Excluded Findings Block.

### 2. Class-Specific Clean Starting Points
| ID | Preferred Clean Pattern | Equivalence & Verification Focus |
| :--- | :--- | :--- |
| `CL-01` | Remove unused imports or local variables. For unused parameters: in TS/JS positional callbacks, prefix with `_` (e.g. `_req`); in Python or languages with named arguments, NEVER rename keyword parameters; delete unused parameters only if internal and all call sites are updated. | Scoped compiler/linter check (`tsc --noEmit`, `eslint`, `ruff`, `go vet`); verify 0 new diagnostic errors. |

---

## Excluded Findings (Requires Human Confirmation)

### `EXC-001` | Unused Manifest Dependency `react-router-dom`
- **Class**: `SRC-08` (Unused dependencies declared in package manifests)
- **Location**: `QLHK-Client/package.json:30`
- **Target Symbol**: `react-router-dom: "^7.15.0"`
- **Reason**: QLHK-Client uses state-based tab routing (`activeTab` in `AppContext.tsx`). `react-router-dom` is declared as dependency but never imported in `src/`. Package manifests and lockfiles are permanently excluded from automated execution.
- **Disposition**: `REQUIRES_HUMAN` (User can run `npm uninstall react-router-dom` in `QLHK-Client/` to save bundle size).

### `EXC-002` | Generic Unused Base Component `Modal.tsx`
- **Class**: `CL-04` / `SRC-03` (Unused component / potential base component)
- **Location**: `QLHK-Client/src/components/common/Modal.tsx`
- **Target File**: `Modal.tsx`
- **Reason**: `Modal.tsx` is not imported anywhere in client source code or tests, but is documented in architecture plans as a standard modal wrapper template. Deleting it requires architectural confirmation.
- **Disposition**: `NEEDS_DECISION`

### `EXC-003` | Shared Ecosystem Design Tokens in `statStyles.tsx`
- **Class**: `CL-04` (Unused exported tokens and components)
- **Location**: `QLHK-Client/src/components/common/statStyles.tsx`
- **Target Symbols**: `StatDonut`, `StatKpiCard`, `StatChartPanel`, `StatBarRow`, `STAT_KPI_GRID_CLASS`, `STAT_PANEL_GRID_CLASS`, `STAT_SCROLL_CONTAINER_CLASS`
- **Reason**: These symbols are defined as shared cross-system tokens for the Đăk Hà ecosystem. While uncalled within `QLHK-Client`, removing them may break planned cross-subsystem parity.
- **Disposition**: `NEEDS_DECISION`

---

### STEP 0: BRANCH ISOLATION, PRE-FLIGHT GATE & TASK INITIALIZATION
1. Resolve BASE_BRANCH: set `BASE_BRANCH="${BASE_BRANCH:-roadmap/remediate-optimization-findings}"` (verifying `HEAD` is not detached via `test -n "$(git branch --show-current)"`, halting if detached). Create and switch to branch: `git switch -c clean/cleanup-client` (if branch already exists, halt and ask user whether to resume or rename).
2. Verify clean working tree: `test -z "$(git status --porcelain)"` (Must exit 0).
3. Capture baseline commit hash via `git rev-parse --short HEAD` and run baseline tests **twice**: `cd QLHK-Client && npm test && npm test` -> Record total passing count (162 passing) and exact names of any tests failing in **either** run as "flaky/known failing". Also run `cd QLHK-Client && npx tsc --noEmit` once and record its error count as the typecheck baseline (0 errors).
4. Capture API Surface Snapshot: Record public export signatures, route definitions, or CLI options to serve as the baseline for behavior preservation.
5. Capture Ignored Files Inventory: Run `GIT_COMMON_DIR=$(git rev-parse --git-common-dir) && git ls-files --others --ignored --exclude-standard --directory | sort > "$GIT_COMMON_DIR/roadmap-ignored-baseline.txt"` and record count in `task.md` to ensure zero pre-existing local/ignored files are deleted.
6. Create `task.md` at project root with this exact content (replace `<BASE_BRANCH>`, `<BASELINE_HASH>`, and `<PASS_COUNT>` with actual values from steps 1 and 3):

```markdown
# Task Progress Tracker

- **Project**: QLHK-Client
- **Intended Base Branch**: `roadmap/remediate-optimization-findings`
- **Base Branch**: `<BASE_BRANCH>`
- **Branch**: `clean/cleanup-client`
- **Plan Reference**: `N/A (direct clean hygiene remediation)`
- **Clean Prompt Reference**: `docs/plans/cleanup.clean.md`
- **Baseline Checkpoint**: `<BASELINE_HASH>` (<PASS_COUNT> passing, verified across 2 baseline runs)
- **Known Baseline / Flaky Failures (Failed in Either Baseline Run)**:
  - None
- **Typecheck Baseline**: 0 errors
- **API Surface Snapshot**: Baseline captured (0 public breaks permitted)
- **Ignored Files Baseline**: Recorded in $(git rev-parse --git-common-dir)/roadmap-ignored-baseline.txt (0 missing ignored files permitted)
- **Status Legend**: 
  - `[ ]` Pending
  - `[/]` In Progress
  - `[x]` Completed (cleaned, verified equivalent, committed)
  - `[!]` Blocked (`CIRCUIT_BREAKER`)
  - `[~]` Deferred (`NEEDS_DECISION`, `REQUIRES_HUMAN`, `BLOCKED`, `BLOCKED_BY_USER_SKIP`)
  - `[-]` Not Applicable (`ALREADY_FIXED`, `STALE`, `FINDING_INVALID`)

## Execution Checklist

- [ ] Step 1: Remove Dead Latency State and File-Scope Constants [CLN-001]
  - Finding IDs: `CLN-001` (Root Cause Key: `CL-01:QLHK-Client/src/AppContext.tsx:dead-latency-state-and-constants`; Class: `CL-01`)
  - Target Files: `QLHK-Client/src/AppContext.tsx`
  - Role Focus: Refactoring & Hygiene: Preserving external behavior, dead-code elimination, caller-callee blast radius verification.
  - Reference Proof: Static 0 external hits; Dynamic verified `PROVEN_DEAD`
  - Diff Budget: <= 200 gross LOC (modified/added)
  - Verification: `cd QLHK-Client && npm test -- tests/e2e/workflow.test.ts && npx tsc --noEmit`
  - Equivalence Check: API Surface unchanged vs Step 0 snapshot; scoped tests pass
  - Evidence: BEFORE pass summary / AFTER pass summary
- [ ] Step 2: Remove Unused State Setter setLoading in Client Store [CLN-002]
  - Finding IDs: `CLN-002` (Root Cause Key: `CL-01:QLHK-Client/src/store/householdStore.ts:unused-setLoading-setter`; Class: `CL-01`)
  - Target Files: `QLHK-Client/src/store/householdStore.ts`
  - Role Focus: Refactoring & Hygiene: Preserving external behavior, dead-code elimination, caller-callee blast radius verification.
  - Reference Proof: Static 0 external hits; Dynamic verified `PROVEN_DEAD`
  - Diff Budget: <= 200 gross LOC (modified/added)
  - Verification: `cd QLHK-Client && npm test -- src/api/__tests__/householdApi.test.ts && npx tsc --noEmit`
  - Equivalence Check: API Surface unchanged vs Step 0 snapshot; scoped tests pass
  - Evidence: BEFORE pass summary / AFTER pass summary
- [ ] Step 3: Remove Unused Icons and State in AnalyticsDashboard [CLN-003]
  - Finding IDs: `CLN-003` (Root Cause Key: `CL-01:QLHK-Client/src/components/analytics/AnalyticsDashboard.tsx:unused-icons-and-refreshing-state`; Class: `CL-01`)
  - Target Files: `QLHK-Client/src/components/analytics/AnalyticsDashboard.tsx`
  - Role Focus: Refactoring & Hygiene: Preserving external behavior, dead-code elimination, caller-callee blast radius verification.
  - Reference Proof: Static 0 external hits; Dynamic verified `PROVEN_DEAD`
  - Diff Budget: <= 200 gross LOC (modified/added)
  - Verification: `cd QLHK-Client && npm test -- src/components/analytics/__tests__/AnalyticsDashboard.test.tsx && npx tsc --noEmit`
  - Equivalence Check: API Surface unchanged vs Step 0 snapshot; scoped tests pass
  - Evidence: BEFORE pass summary / AFTER pass summary
- [ ] Step 4: Remove Unused Icons, Hook and State Setter in AuditLogView [CLN-004]
  - Finding IDs: `CLN-004` (Root Cause Key: `CL-01:QLHK-Client/src/components/audit/AuditLogView.tsx:unused-icons-and-state-setter`; Class: `CL-01`)
  - Target Files: `QLHK-Client/src/components/audit/AuditLogView.tsx`
  - Role Focus: Refactoring & Hygiene: Preserving external behavior, dead-code elimination, caller-callee blast radius verification.
  - Reference Proof: Static 0 external hits; Dynamic verified `PROVEN_DEAD`
  - Diff Budget: <= 200 gross LOC (modified/added)
  - Verification: `cd QLHK-Client && npm test -- tests/e2e/regressionFlows.test.ts && npx tsc --noEmit`
  - Equivalence Check: API Surface unchanged vs Step 0 snapshot; scoped tests pass
  - Evidence: BEFORE pass summary / AFTER pass summary
- [ ] Step 5: Remove Unused Imports and Dead Local in Common and Layout Components [CLN-005]
  - Finding IDs: `CLN-005` (Root Cause Key: `CL-01:QLHK-Client/src/components:common-and-layout-unused-symbols`; Class: `CL-01`)
  - Target Files: `QLHK-Client/src/components/common/CustomSelect.tsx`, `QLHK-Client/src/components/common/statStyles.tsx`, `QLHK-Client/src/components/Layout/Header.tsx`, `QLHK-Client/src/components/settings/ProfileCard.tsx`
  - Role Focus: Refactoring & Hygiene: Preserving external behavior, dead-code elimination, caller-callee blast radius verification.
  - Reference Proof: Static 0 external hits; Dynamic verified `PROVEN_DEAD`
  - Diff Budget: <= 200 gross LOC (modified/added)
  - Verification: `cd QLHK-Client && npm test -- src/components/common/__tests__/CustomSelect.test.tsx && npx tsc --noEmit`
  - Equivalence Check: API Surface unchanged vs Step 0 snapshot; scoped tests pass
  - Evidence: BEFORE pass summary / AFTER pass summary
- [ ] Step 6: Remove Unused Imports and Dead Local Variable in Page Components [CLN-006]
  - Finding IDs: `CLN-006` (Root Cause Key: `CL-01:QLHK-Client/src/pages:unused-page-imports-and-locals`; Class: `CL-01`)
  - Target Files: `QLHK-Client/src/pages/ExcelPage.tsx`, `QLHK-Client/src/pages/HouseholdsPage.tsx`, `QLHK-Client/src/pages/SettingsPage.tsx`, `QLHK-Client/src/pages/VillagesPage.tsx`
  - Role Focus: Refactoring & Hygiene: Preserving external behavior, dead-code elimination, caller-callee blast radius verification.
  - Reference Proof: Static 0 external hits; Dynamic verified `PROVEN_DEAD`
  - Diff Budget: <= 200 gross LOC (modified/added)
  - Verification: `cd QLHK-Client && npm test -- tests/e2e/regressionFlows.test.ts && npx tsc --noEmit`
  - Equivalence Check: API Surface unchanged vs Step 0 snapshot; scoped tests pass
  - Evidence: BEFORE pass summary / AFTER pass summary
- [ ] Step 7: Remove Redundant React and FireEvent Imports in Test Suites [CLN-007]
  - Finding IDs: `CLN-007` (Root Cause Key: `CL-01:QLHK-Client/tests:unused-react-and-fireEvent-imports`; Class: `CL-01`)
  - Target Files: `QLHK-Client/src/components/analytics/__tests__/AnalyticsDashboard.test.tsx`, `QLHK-Client/src/components/common/__tests__/CustomSelect.test.tsx`, `QLHK-Client/src/components/excel/__tests__/ExportSettingsModal.test.tsx`, `QLHK-Client/src/components/excel/__tests__/ImportPreviewModal.test.tsx`, `QLHK-Client/src/components/households/__tests__/AgeFilterPopover.test.tsx`, `QLHK-Client/src/components/households/__tests__/CitizenModal.test.tsx`, `QLHK-Client/src/components/households/__tests__/HouseholdTable.test.tsx`
  - Role Focus: Refactoring & Hygiene: Preserving external behavior, dead-code elimination, caller-callee blast radius verification.
  - Reference Proof: Static 0 external hits; Dynamic verified `PROVEN_DEAD`
  - Diff Budget: <= 200 gross LOC (modified/added)
  - Verification: `cd QLHK-Client && npm test -- src/components/analytics/__tests__/AnalyticsDashboard.test.tsx src/components/common/__tests__/CustomSelect.test.tsx && npx tsc --noEmit`
  - Equivalence Check: API Surface unchanged vs Step 0 snapshot; scoped tests pass
  - Evidence: BEFORE pass summary / AFTER pass summary
- [ ] Step 8: Verification & Final Gate
  - Full Test Suite: `cd QLHK-Client && npm test` (Zero new failures vs baseline: 162/162 passing)
  - Typecheck: `cd QLHK-Client && npx tsc --noEmit` (0 new errors vs baseline)
  - API Surface Check: Unchanged vs Step 0 snapshot
  - Ignored Files Check: Preserved (0 missing baseline ignored files via comm -23)
  - Clean Working Tree & No Orphan Patches: Verified (`test -z "$(git status --porcelain)" && test -z "$(ls -A .git/roadmap-stash 2>/dev/null)"`)

## Deferred / Needs Human Decision
<!-- Append `Step K | Finding ID | Reason Code | exact blocker or decision needed | files:lines` for every [~] step -->

## Finding Closure Mapping
<!-- Populate at Step N: `CLN-001 -> <commit_hash> (Step K)`; for [~]/[-] steps record `CLN-004 -> DEFERRED (NEEDS_DECISION)` -->

## Project Gotchas & Learned Invariants
<!-- Append verified gotchas here when encountering subtle bugs -->
```

7. Commit initial tracker: `git add task.md && git commit -m "chore(clean): init task.md"`.
8. Verify clean tree: `test -z "$(git status --porcelain)"`.

---

### STEP 1: Remove Dead Latency State and File-Scope Constants [CLN-001]
- START STEP:
  + Update `task.md`: Mark Step 1 as `[/]` (In Progress) and review `## Project Gotchas & Learned Invariants` (if executing a deferred `Step 1.b`, apply `.git/roadmap-stash/cleanup-client-1.b.patch` via `git apply`).
- FINDING BRIEF (embedded; authoritative):
  [BEGIN FINDING DATA BLOCK: CLN-001]
  + ID / Class / Confidence: `CLN-001` / `CL-01` / `PROVEN_DEAD`
  + Root Cause Key: `CL-01:QLHK-Client/src/AppContext.tsx:dead-latency-state-and-constants`
  + Location: `QLHK-Client/src/AppContext.tsx:66-67, 96` | Target Symbol / File: `emaLatency`, `EMA_ALPHA`, `setLatency`
  + Code / File Excerpt (`<= 10 lines`):
    ```typescript
    let emaLatency: number | null = null;
    const EMA_ALPHA = 0.3; // Hệ số làm mượt: 0.3 = phản ứng vừa phải, loại spike
    // ...
    const [latency, setLatency] = useState<number | null>(null);
    ```
  + Reference Proof (Static + Dynamic):
    - Static: `tsc --noEmit --noUnusedLocals` reports TS6133 for `emaLatency`, `EMA_ALPHA`, and `setLatency`. Whole-repo search confirms 0 references outside `AppContext.tsx`. Active ping latency tracking was migrated to `NetworkContext.tsx:20-56`.
    - Dynamic Checklist: Verified no dynamic property access via reflection, DI, or convention.
    - Classification: `PROVEN_DEAD`
  + Before State: Dead file-scope variables `emaLatency`, `EMA_ALPHA` and unused state setter `setLatency` defined in `AppContext.tsx`.
  + After Expected State: `emaLatency` and `EMA_ALPHA` removed; `[latency]` declared without unused `setLatency`. API Surface: unchanged.
  + Clean Intent: Eliminate dead latency state variables and setter in AppContext.
  + Strategy Rows: `CL-01` (see CLEAN STRATEGIES above)
  [END FINDING DATA BLOCK: CLN-001]
- PRE-REQUISITE READS (Parallel call; skip file read if already in active session context):
  + Source: `QLHK-Client/src/AppContext.tsx` (around lines 66-96, +-40 lines)
  + Role Focus: Preserving external behavior, dead-code elimination, caller-callee blast radius verification.
- GRAPH-MAP CHECK (Omit if isolated change):
  + Command: `graft grep "emaLatency"`
- RE-VALIDATION GATE (Invariant 10):
  + Confirm the candidate still exists at `Location`. Re-check Reference Proof. Route outcomes: already removed -> `[-] ALREADY_FIXED`/`STALE`; live external references exist -> `[-] FINDING_INVALID`; public contract change -> `[~] NEEDS_DECISION`; human-only category -> `[~] REQUIRES_HUMAN`. For `[-]`/`[~]`: update `task.md` (+ `## Deferred / Needs Human Decision` when `[~]`), run `git add task.md && git commit -m "chore(clean): skip step 1 (reason) [CLN-001]"`, verify clean tree, and proceed to next step (no code changes, no attempt consumed).
- BEFORE VERIFICATION:
  + Run scoped tests and static check on unchanged code: `cd QLHK-Client && npm test -- tests/e2e/workflow.test.ts && npx tsc --noEmit` -> MUST PASS. Record as `BEFORE`.
- ACTIONS:
  1. In `QLHK-Client/src/AppContext.tsx:66-67`, remove `let emaLatency: number | null = null;` and `const EMA_ALPHA = 0.3; ...`.
  2. In `QLHK-Client/src/AppContext.tsx:96`, change `const [latency, setLatency] = useState<number | null>(null);` to `const [latency] = useState<number | null>(null);`.
- SCOPE REVIEW & DIFF BUDGET GATE:
  1. Review working tree: `git status --short` (`task.md` changes are expected—do not reset or delete `task.md`; reset or remove any out-of-scope files or scratch files before staging).
  2. Run **DIFF GATE** (Invariant 4) -> Set `STEP_TARGET_DIRS=""`, verify modified LOC <= 200 and deleted files outside target dirs <= 25. If limits exceeded, unstage, write `Step 1.b` changes to `.git/roadmap-stash/cleanup-client-1.b.patch` across disjoint files, record its path in `task.md`, clean `Step 1.b` changes from working tree, and split into `Step 1.a` / `Step 1.b` in `task.md`.
- AFTER VERIFICATION & EQUIVALENCE GATE:
  - Run scoped tests (zero new failures vs baseline): `cd QLHK-Client && npm test -- tests/e2e/workflow.test.ts` -> MUST PASS. Record as `AFTER`.
  - Run static check / typecheck (0 new errors vs baseline): `cd QLHK-Client && npx tsc --noEmit`.
  - Confirm API Surface Snapshot is unchanged.
  - Run `cd QLHK-Client && npm test` when fast enough (Invariant 7) and compare with `Known Baseline / Flaky Failures`.
- CHECKPOINT & PROGRESS UPDATE:
  - If gotchas discovered: Append to `## Project Gotchas & Learned Invariants` in `task.md` (list any justified extra files under this step).
  - Update `task.md`: Mark Step 1 as `[x]` Completed.
  - Commit: `git add -A && git commit -m "refactor(context): complete step 1 - remove dead latency state and constants [CLN-001]" -m "Cleanup class: CL-01" -m "Proof: 0 external hits across repository" -m "BEFORE: scoped tests passed" -m "AFTER: scoped tests passed; API-SURFACE: unchanged"` (if completing `Step 1.b`, delete `.git/roadmap-stash/cleanup-client-1.b.patch` via `rm -f`).
  - Verify clean: `test -z "$(git status --porcelain)"`.

---

### STEP 2: Remove Unused State Setter setLoading in Client Store [CLN-002]
- START STEP:
  + Update `task.md`: Mark Step 2 as `[/]` (In Progress) and review `## Project Gotchas & Learned Invariants` (if executing a deferred `Step 2.b`, apply `.git/roadmap-stash/cleanup-client-2.b.patch` via `git apply`).
- FINDING BRIEF (embedded; authoritative):
  [BEGIN FINDING DATA BLOCK: CLN-002]
  + ID / Class / Confidence: `CLN-002` / `CL-01` / `PROVEN_DEAD`
  + Root Cause Key: `CL-01:QLHK-Client/src/store/householdStore.ts:unused-setLoading-setter`
  + Location: `QLHK-Client/src/store/householdStore.ts:42` | Target Symbol / File: `setLoading`
  + Code / File Excerpt (`<= 10 lines`):
    ```typescript
    const [loading, setLoading] = useState<boolean>(false);
    ```
  + Reference Proof (Static + Dynamic):
    - Static: `tsc --noEmit --noUnusedLocals` reports TS6133 for `setLoading`. 0 usages in `householdStore.ts`. `loading` is exposed on store return object line 593 as initial `false`.
    - Dynamic Checklist: Verified no dynamic access.
    - Classification: `PROVEN_DEAD`
  + Before State: Unused state setter `setLoading` declared in `householdStore.ts:42`.
  + After Expected State: `const [loading] = useState<boolean>(false);` without unused setter. API Surface: unchanged.
  + Clean Intent: Drop unused `setLoading` setter while preserving `loading` state property on store return object.
  + Strategy Rows: `CL-01` (see CLEAN STRATEGIES above)
  [END FINDING DATA BLOCK: CLN-002]
- PRE-REQUISITE READS (Parallel call; skip file read if already in active session context):
  + Source: `QLHK-Client/src/store/householdStore.ts` (around line 42, +-40 lines)
  + Role Focus: Preserving external behavior, dead-code elimination, caller-callee blast radius verification.
- GRAPH-MAP CHECK (Omit if isolated change):
  + Command: `graft grep "setLoading" in store`
- RE-VALIDATION GATE (Invariant 10):
  + Confirm the candidate still exists at `Location`. Re-check Reference Proof. Route outcomes: already removed -> `[-] ALREADY_FIXED`/`STALE`; live external references exist -> `[-] FINDING_INVALID`; public contract change -> `[~] NEEDS_DECISION`; human-only category -> `[~] REQUIRES_HUMAN`. For `[-]`/`[~]`: update `task.md` (+ `## Deferred / Needs Human Decision` when `[~]`), run `git add task.md && git commit -m "chore(clean): skip step 2 (reason) [CLN-002]"`, verify clean tree, and proceed to next step (no code changes, no attempt consumed).
- BEFORE VERIFICATION:
  + Run scoped tests and static check on unchanged code: `cd QLHK-Client && npm test -- src/api/__tests__/householdApi.test.ts && npx tsc --noEmit` -> MUST PASS. Record as `BEFORE`.
- ACTIONS:
  1. In `QLHK-Client/src/store/householdStore.ts:42`, change `const [loading, setLoading] = useState<boolean>(false);` to `const [loading] = useState<boolean>(false);`.
- SCOPE REVIEW & DIFF BUDGET GATE:
  1. Review working tree: `git status --short` (`task.md` changes are expected—do not reset or delete `task.md`; reset or remove any out-of-scope files or scratch files before staging).
  2. Run **DIFF GATE** (Invariant 4) -> Set `STEP_TARGET_DIRS=""`, verify modified LOC <= 200 and deleted files outside target dirs <= 25. If limits exceeded, unstage, write `Step 2.b` changes to `.git/roadmap-stash/cleanup-client-2.b.patch` across disjoint files, record its path in `task.md`, clean `Step 2.b` changes from working tree, and split into `Step 2.a` / `Step 2.b` in `task.md`.
- AFTER VERIFICATION & EQUIVALENCE GATE:
  - Run scoped tests (zero new failures vs baseline): `cd QLHK-Client && npm test -- src/api/__tests__/householdApi.test.ts` -> MUST PASS. Record as `AFTER`.
  - Run static check / typecheck (0 new errors vs baseline): `cd QLHK-Client && npx tsc --noEmit`.
  - Confirm API Surface Snapshot is unchanged.
  - Run `cd QLHK-Client && npm test` when fast enough (Invariant 7) and compare with `Known Baseline / Flaky Failures`.
- CHECKPOINT & PROGRESS UPDATE:
  - If gotchas discovered: Append to `## Project Gotchas & Learned Invariants` in `task.md` (list any justified extra files under this step).
  - Update `task.md`: Mark Step 2 as `[x]` Completed.
  - Commit: `git add -A && git commit -m "refactor(store): complete step 2 - remove unused setLoading setter in store [CLN-002]" -m "Cleanup class: CL-01" -m "Proof: 0 usages of setLoading in store" -m "BEFORE: scoped tests passed" -m "AFTER: scoped tests passed; API-SURFACE: unchanged"` (if completing `Step 2.b`, delete `.git/roadmap-stash/cleanup-client-2.b.patch` via `rm -f`).
  - Verify clean: `test -z "$(git status --porcelain)"`.

---

### STEP 3: Remove Unused Icons and State in AnalyticsDashboard [CLN-003]
- START STEP:
  + Update `task.md`: Mark Step 3 as `[/]` (In Progress) and review `## Project Gotchas & Learned Invariants` (if executing a deferred `Step 3.b`, apply `.git/roadmap-stash/cleanup-client-3.b.patch` via `git apply`).
- FINDING BRIEF (embedded; authoritative):
  [BEGIN FINDING DATA BLOCK: CLN-003]
  + ID / Class / Confidence: `CLN-003` / `CL-01` / `PROVEN_DEAD`
  + Root Cause Key: `CL-01:QLHK-Client/src/components/analytics/AnalyticsDashboard.tsx:unused-icons-and-refreshing-state`
  + Location: `QLHK-Client/src/components/analytics/AnalyticsDashboard.tsx:4, 7-8, 11, 13, 55` | Target Symbol / File: `Briefcase`, `GraduationCap`, `HeartHandshake`, `UserCheck`, `Users2`, `refreshing`
  + Code / File Excerpt (`<= 10 lines`):
    ```typescript
    import {
      ArrowLeft, BarChart3, Briefcase, Building2, Download, GraduationCap,
      HeartHandshake, PieChart, Shield, UserCheck, Users, Users2,
    } from "lucide-react";
    // ...
    const [refreshing, setRefreshing] = useState(false);
    ```
  + Reference Proof (Static + Dynamic):
    - Static: `tsc --noEmit --noUnusedLocals` reports TS6133 for all 5 icons and `refreshing`. Zero JSX or logic references.
    - Dynamic Checklist: Lucide icons are static JSX elements.
    - Classification: `PROVEN_DEAD`
  + Before State: 5 unused Lucide icons imported and unused `refreshing` state declared in `AnalyticsDashboard.tsx`.
  + After Expected State: Unused icon imports removed; `const [refreshing, setRefreshing] = useState(false);` removed. API Surface: unchanged.
  + Clean Intent: Clean unused icon imports and dead refreshing state from AnalyticsDashboard.
  + Strategy Rows: `CL-01` (see CLEAN STRATEGIES above)
  [END FINDING DATA BLOCK: CLN-003]
- PRE-REQUISITE READS (Parallel call; skip file read if already in active session context):
  + Source: `QLHK-Client/src/components/analytics/AnalyticsDashboard.tsx` (around lines 4-55, +-40 lines)
  + Role Focus: Preserving external behavior, dead-code elimination, caller-callee blast radius verification.
- GRAPH-MAP CHECK (Omit if isolated change):
  + Command: `graft grep "refreshing"`
- RE-VALIDATION GATE (Invariant 10):
  + Confirm the candidate still exists at `Location`. Re-check Reference Proof. Route outcomes: already removed -> `[-] ALREADY_FIXED`/`STALE`; live external references exist -> `[-] FINDING_INVALID`; public contract change -> `[~] NEEDS_DECISION`; human-only category -> `[~] REQUIRES_HUMAN`. For `[-]`/`[~]`: update `task.md` (+ `## Deferred / Needs Human Decision` when `[~]`), run `git add task.md && git commit -m "chore(clean): skip step 3 (reason) [CLN-003]"`, verify clean tree, and proceed to next step (no code changes, no attempt consumed).
- BEFORE VERIFICATION:
  + Run scoped tests and static check on unchanged code: `cd QLHK-Client && npm test -- src/components/analytics/__tests__/AnalyticsDashboard.test.tsx && npx tsc --noEmit` -> MUST PASS. Record as `BEFORE`.
- ACTIONS:
  1. In `QLHK-Client/src/components/analytics/AnalyticsDashboard.tsx:4-13`, remove `Briefcase`, `GraduationCap`, `HeartHandshake`, `UserCheck`, and `Users2` from `lucide-react` imports.
  2. In `QLHK-Client/src/components/analytics/AnalyticsDashboard.tsx:55`, remove `const [refreshing, setRefreshing] = useState(false);`.
- SCOPE REVIEW & DIFF BUDGET GATE:
  1. Review working tree: `git status --short` (`task.md` changes are expected—do not reset or delete `task.md`; reset or remove any out-of-scope files or scratch files before staging).
  2. Run **DIFF GATE** (Invariant 4) -> Set `STEP_TARGET_DIRS=""`, verify modified LOC <= 200 and deleted files outside target dirs <= 25. If limits exceeded, unstage, write `Step 3.b` changes to `.git/roadmap-stash/cleanup-client-3.b.patch` across disjoint files, record its path in `task.md`, clean `Step 3.b` changes from working tree, and split into `Step 3.a` / `Step 3.b` in `task.md`.
- AFTER VERIFICATION & EQUIVALENCE GATE:
  - Run scoped tests (zero new failures vs baseline): `cd QLHK-Client && npm test -- src/components/analytics/__tests__/AnalyticsDashboard.test.tsx` -> MUST PASS. Record as `AFTER`.
  - Run static check / typecheck (0 new errors vs baseline): `cd QLHK-Client && npx tsc --noEmit`.
  - Confirm API Surface Snapshot is unchanged.
  - Run `cd QLHK-Client && npm test` when fast enough (Invariant 7) and compare with `Known Baseline / Flaky Failures`.
- CHECKPOINT & PROGRESS UPDATE:
  - If gotchas discovered: Append to `## Project Gotchas & Learned Invariants` in `task.md` (list any justified extra files under this step).
  - Update `task.md`: Mark Step 3 as `[x]` Completed.
  - Commit: `git add -A && git commit -m "refactor(analytics): complete step 3 - remove unused icons and state in AnalyticsDashboard [CLN-003]" -m "Cleanup class: CL-01" -m "Proof: 0 JSX or logic references for 5 icons and refreshing state" -m "BEFORE: scoped tests passed" -m "AFTER: scoped tests passed; API-SURFACE: unchanged"` (if completing `Step 3.b`, delete `.git/roadmap-stash/cleanup-client-3.b.patch` via `rm -f`).
  - Verify clean: `test -z "$(git status --porcelain)"`.

---

### STEP 4: Remove Unused Icons, Hook and State Setter in AuditLogView [CLN-004]
- START STEP:
  + Update `task.md`: Mark Step 4 as `[/]` (In Progress) and review `## Project Gotchas & Learned Invariants` (if executing a deferred `Step 4.b`, apply `.git/roadmap-stash/cleanup-client-4.b.patch` via `git apply`).
- FINDING BRIEF (embedded; authoritative):
  [BEGIN FINDING DATA BLOCK: CLN-004]
  + ID / Class / Confidence: `CLN-004` / `CL-01` / `PROVEN_DEAD`
  + Root Cause Key: `CL-01:QLHK-Client/src/components/audit/AuditLogView.tsx:unused-icons-and-state-setter`
  + Location: `QLHK-Client/src/components/audit/AuditLogView.tsx:4-6, 22, 118` | Target Symbol / File: `ArrowRight`, `ChevronLeft`, `ChevronRight`, `useMemo`, `setLimit`
  + Code / File Excerpt (`<= 10 lines`):
    ```typescript
    import {
      Activity, ArrowDownCircle, ArrowRight, ChevronLeft, ChevronRight,
      // ...
    } from "lucide-react";
    import { useCallback, useEffect, useMemo, useState } from "react";
    // ...
    const [limit, setLimit] = useState<number>(10);
    ```
  + Reference Proof (Static + Dynamic):
    - Static: `tsc --noEmit --noUnusedLocals` reports TS6133 for all 5 symbols. Pagination in `AuditLogView` uses dedicated custom controls; `setLimit` is never called.
    - Dynamic Checklist: Verified 0 dynamic lookups.
    - Classification: `PROVEN_DEAD`
  + Before State: Unused icons (`ArrowRight`, `ChevronLeft`, `ChevronRight`), unused hook `useMemo`, and unused `setLimit` setter in `AuditLogView.tsx`.
  + After Expected State: Unused imports removed; `const [limit] = useState<number>(10);` declared without unused setter. API Surface: unchanged.
  + Clean Intent: Remove unused Lucide icons, useMemo hook, and setLimit setter in AuditLogView.
  + Strategy Rows: `CL-01` (see CLEAN STRATEGIES above)
  [END FINDING DATA BLOCK: CLN-004]
- PRE-REQUISITE READS (Parallel call; skip file read if already in active session context):
  + Source: `QLHK-Client/src/components/audit/AuditLogView.tsx` (around lines 4-118, +-40 lines)
  + Role Focus: Preserving external behavior, dead-code elimination, caller-callee blast radius verification.
- GRAPH-MAP CHECK (Omit if isolated change):
  + Command: `graft grep "setLimit"`
- RE-VALIDATION GATE (Invariant 10):
  + Confirm the candidate still exists at `Location`. Re-check Reference Proof. Route outcomes: already removed -> `[-] ALREADY_FIXED`/`STALE`; live external references exist -> `[-] FINDING_INVALID`; public contract change -> `[~] NEEDS_DECISION`; human-only category -> `[~] REQUIRES_HUMAN`. For `[-]`/`[~]`: update `task.md` (+ `## Deferred / Needs Human Decision` when `[~]`), run `git add task.md && git commit -m "chore(clean): skip step 4 (reason) [CLN-004]"`, verify clean tree, and proceed to next step (no code changes, no attempt consumed).
- BEFORE VERIFICATION:
  + Run scoped tests and static check on unchanged code: `cd QLHK-Client && npm test -- tests/e2e/regressionFlows.test.ts && npx tsc --noEmit` -> MUST PASS. Record as `BEFORE`.
- ACTIONS:
  1. In `QLHK-Client/src/components/audit/AuditLogView.tsx:4-6`, remove `ArrowRight`, `ChevronLeft`, and `ChevronRight` from `lucide-react` imports.
  2. In `QLHK-Client/src/components/audit/AuditLogView.tsx:22`, remove `useMemo` from React imports.
  3. In `QLHK-Client/src/components/audit/AuditLogView.tsx:118`, change `const [limit, setLimit] = useState<number>(10);` to `const [limit] = useState<number>(10);`.
- SCOPE REVIEW & DIFF BUDGET GATE:
  1. Review working tree: `git status --short` (`task.md` changes are expected—do not reset or delete `task.md`; reset or remove any out-of-scope files or scratch files before staging).
  2. Run **DIFF GATE** (Invariant 4) -> Set `STEP_TARGET_DIRS=""`, verify modified LOC <= 200 and deleted files outside target dirs <= 25. If limits exceeded, unstage, write `Step 4.b` changes to `.git/roadmap-stash/cleanup-client-4.b.patch` across disjoint files, record its path in `task.md`, clean `Step 4.b` changes from working tree, and split into `Step 4.a` / `Step 4.b` in `task.md`.
- AFTER VERIFICATION & EQUIVALENCE GATE:
  - Run scoped tests (zero new failures vs baseline): `cd QLHK-Client && npm test -- tests/e2e/regressionFlows.test.ts` -> MUST PASS. Record as `AFTER`.
  - Run static check / typecheck (0 new errors vs baseline): `cd QLHK-Client && npx tsc --noEmit`.
  - Confirm API Surface Snapshot is unchanged.
  - Run `cd QLHK-Client && npm test` when fast enough (Invariant 7) and compare with `Known Baseline / Flaky Failures`.
- CHECKPOINT & PROGRESS UPDATE:
  - If gotchas discovered: Append to `## Project Gotchas & Learned Invariants` in `task.md` (list any justified extra files under this step).
  - Update `task.md`: Mark Step 4 as `[x]` Completed.
  - Commit: `git add -A && git commit -m "refactor(audit): complete step 4 - remove unused icons hook and setter in AuditLogView [CLN-004]" -m "Cleanup class: CL-01" -m "Proof: 0 references for ArrowRight, ChevronLeft, ChevronRight, useMemo, setLimit" -m "BEFORE: scoped tests passed" -m "AFTER: scoped tests passed; API-SURFACE: unchanged"` (if completing `Step 4.b`, delete `.git/roadmap-stash/cleanup-client-4.b.patch` via `rm -f`).
  - Verify clean: `test -z "$(git status --porcelain)"`.

---

### STEP 5: Remove Unused Imports and Dead Local in Common and Layout Components [CLN-005]
- START STEP:
  + Update `task.md`: Mark Step 5 as `[/]` (In Progress) and review `## Project Gotchas & Learned Invariants` (if executing a deferred `Step 5.b`, apply `.git/roadmap-stash/cleanup-client-5.b.patch` via `git apply`).
- FINDING BRIEF (embedded; authoritative):
  [BEGIN FINDING DATA BLOCK: CLN-005]
  + ID / Class / Confidence: `CLN-005` / `CL-01` / `PROVEN_DEAD`
  + Root Cause Key: `CL-01:QLHK-Client/src/components:common-and-layout-unused-symbols`
  + Location: `QLHK-Client/src/components/common/CustomSelect.tsx:185-186`, `QLHK-Client/src/components/common/statStyles.tsx:18`, `QLHK-Client/src/components/Layout/Header.tsx:2`, `QLHK-Client/src/components/settings/ProfileCard.tsx:11` | Target Symbol / File: `isSelectedNonEmpty`, `createContext`, `useContext`, `Activity`, `User as UserIcon`
  + Code / File Excerpt (`<= 10 lines`):
    ```typescript
    // CustomSelect.tsx:185
    const isSelectedNonEmpty = value !== "" && value !== undefined && value !== null;
    // statStyles.tsx:18
    import React, { createContext, useContext, useMemo, useState } from "react";
    // Header.tsx:2
    Activity,
    // ProfileCard.tsx:11
    User as UserIcon,
    ```
  + Reference Proof (Static + Dynamic):
    - Static: `tsc --noEmit --noUnusedLocals` confirms TS6133 for all symbols across their respective files.
    - Dynamic Checklist: Verified 0 dynamic bindings.
    - Classification: `PROVEN_DEAD`
  + Before State: Dead local `isSelectedNonEmpty` in `CustomSelect.tsx`; unused React imports `createContext, useContext` in `statStyles.tsx`; unused `Activity` in `Header.tsx`; unused `User as UserIcon` in `ProfileCard.tsx`.
  + After Expected State: Dead local variable and unused imports removed across all 4 files. API Surface: unchanged.
  + Clean Intent: Eliminate unused imports and dead local variable in common and layout components.
  + Strategy Rows: `CL-01` (see CLEAN STRATEGIES above)
  [END FINDING DATA BLOCK: CLN-005]
- PRE-REQUISITE READS (Parallel call; skip file read if already in active session context):
  + Source: `QLHK-Client/src/components/common/CustomSelect.tsx`, `QLHK-Client/src/components/common/statStyles.tsx`, `QLHK-Client/src/components/Layout/Header.tsx`, `QLHK-Client/src/components/settings/ProfileCard.tsx`
  + Role Focus: Preserving external behavior, dead-code elimination, caller-callee blast radius verification.
- GRAPH-MAP CHECK (Omit if isolated change):
  + Command: `graft grep "isSelectedNonEmpty"`
- RE-VALIDATION GATE (Invariant 10):
  + Confirm the candidate still exists at `Location`. Re-check Reference Proof. Route outcomes: already removed -> `[-] ALREADY_FIXED`/`STALE`; live external references exist -> `[-] FINDING_INVALID`; public contract change -> `[~] NEEDS_DECISION`; human-only category -> `[~] REQUIRES_HUMAN`. For `[-]`/`[~]`: update `task.md` (+ `## Deferred / Needs Human Decision` when `[~]`), run `git add task.md && git commit -m "chore(clean): skip step 5 (reason) [CLN-005]"`, verify clean tree, and proceed to next step (no code changes, no attempt consumed).
- BEFORE VERIFICATION:
  + Run scoped tests and static check on unchanged code: `cd QLHK-Client && npm test -- src/components/common/__tests__/CustomSelect.test.tsx && npx tsc --noEmit` -> MUST PASS. Record as `BEFORE`.
- ACTIONS:
  1. In `QLHK-Client/src/components/common/CustomSelect.tsx:185-186`, delete unused variable `const isSelectedNonEmpty = value !== "" && value !== undefined && value !== null;`.
  2. In `QLHK-Client/src/components/common/statStyles.tsx:18`, remove `createContext, useContext` from React imports.
  3. In `QLHK-Client/src/components/Layout/Header.tsx:2`, remove `Activity` from `lucide-react` imports.
  4. In `QLHK-Client/src/components/settings/ProfileCard.tsx:11`, remove `User as UserIcon` from `lucide-react` imports.
- SCOPE REVIEW & DIFF BUDGET GATE:
  1. Review working tree: `git status --short` (`task.md` changes are expected—do not reset or delete `task.md`; reset or remove any out-of-scope files or scratch files before staging).
  2. Run **DIFF GATE** (Invariant 4) -> Set `STEP_TARGET_DIRS=""`, verify modified LOC <= 200 and deleted files outside target dirs <= 25. If limits exceeded, unstage, write `Step 5.b` changes to `.git/roadmap-stash/cleanup-client-5.b.patch` across disjoint files, record its path in `task.md`, clean `Step 5.b` changes from working tree, and split into `Step 5.a` / `Step 5.b` in `task.md`.
- AFTER VERIFICATION & EQUIVALENCE GATE:
  - Run scoped tests (zero new failures vs baseline): `cd QLHK-Client && npm test -- src/components/common/__tests__/CustomSelect.test.tsx` -> MUST PASS. Record as `AFTER`.
  - Run static check / typecheck (0 new errors vs baseline): `cd QLHK-Client && npx tsc --noEmit`.
  - Confirm API Surface Snapshot is unchanged.
  - Run `cd QLHK-Client && npm test` when fast enough (Invariant 7) and compare with `Known Baseline / Flaky Failures`.
- CHECKPOINT & PROGRESS UPDATE:
  - If gotchas discovered: Append to `## Project Gotchas & Learned Invariants` in `task.md` (list any justified extra files under this step).
  - Update `task.md`: Mark Step 5 as `[x]` Completed.
  - Commit: `git add -A && git commit -m "refactor(components): complete step 5 - remove unused imports and dead local in common and layout [CLN-005]" -m "Cleanup class: CL-01" -m "Proof: 0 references across repo for isSelectedNonEmpty, createContext, useContext, Activity, UserIcon" -m "BEFORE: scoped tests passed" -m "AFTER: scoped tests passed; API-SURFACE: unchanged"` (if completing `Step 5.b`, delete `.git/roadmap-stash/cleanup-client-5.b.patch` via `rm -f`).
  - Verify clean: `test -z "$(git status --porcelain)"`.

---

### STEP 6: Remove Unused Imports and Dead Local Variable in Page Components [CLN-006]
- START STEP:
  + Update `task.md`: Mark Step 6 as `[/]` (In Progress) and review `## Project Gotchas & Learned Invariants` (if executing a deferred `Step 6.b`, apply `.git/roadmap-stash/cleanup-client-6.b.patch` via `git apply`).
- FINDING BRIEF (embedded; authoritative):
  [BEGIN FINDING DATA BLOCK: CLN-006]
  + ID / Class / Confidence: `CLN-006` / `CL-01` / `PROVEN_DEAD`
  + Root Cause Key: `CL-01:QLHK-Client/src/pages:unused-page-imports-and-locals`
  + Location: `QLHK-Client/src/pages/ExcelPage.tsx:13`, `QLHK-Client/src/pages/HouseholdsPage.tsx:6`, `QLHK-Client/src/pages/SettingsPage.tsx:7, 10-11, 14, 262-266`, `QLHK-Client/src/pages/VillagesPage.tsx:27` | Target Symbol / File: `householdApi`, `Trash2`, `Home`, `LogOut`, `MapPin`, `Shield`, `currentVillageName`, `Village`
  + Code / File Excerpt (`<= 10 lines`):
    ```typescript
    // ExcelPage.tsx:13
    import { householdApi } from "../api/householdApi";
    // HouseholdsPage.tsx:6
    Trash2,
    // SettingsPage.tsx:7, 262
    Home, LogOut, MapPin, Shield,
    const currentVillageName = ...;
    // VillagesPage.tsx:27
    import { type User, Village } from "../types";
    ```
  + Reference Proof (Static + Dynamic):
    - Static: `tsc --noEmit --noUnusedLocals` confirms TS6133 across all 4 files. 0 usages in logic or template.
    - Dynamic Checklist: Verified 0 dynamic usages.
    - Classification: `PROVEN_DEAD`
  + Before State: Unused `householdApi` in `ExcelPage.tsx`; unused `Trash2` in `HouseholdsPage.tsx`; unused icons and dead local `currentVillageName` in `SettingsPage.tsx`; unused value import `Village` in `VillagesPage.tsx`.
  + After Expected State: All unused imports and dead local variable removed. API Surface: unchanged.
  + Clean Intent: Eliminate unused imports and dead local variable in page components.
  + Strategy Rows: `CL-01` (see CLEAN STRATEGIES above)
  [END FINDING DATA BLOCK: CLN-006]
- PRE-REQUISITE READS (Parallel call; skip file read if already in active session context):
  + Source: `QLHK-Client/src/pages/ExcelPage.tsx`, `QLHK-Client/src/pages/HouseholdsPage.tsx`, `QLHK-Client/src/pages/SettingsPage.tsx`, `QLHK-Client/src/pages/VillagesPage.tsx`
  + Role Focus: Preserving external behavior, dead-code elimination, caller-callee blast radius verification.
- GRAPH-MAP CHECK (Omit if isolated change):
  + Command: `graft grep "currentVillageName"`
- RE-VALIDATION GATE (Invariant 10):
  + Confirm the candidate still exists at `Location`. Re-check Reference Proof. Route outcomes: already removed -> `[-] ALREADY_FIXED`/`STALE`; live external references exist -> `[-] FINDING_INVALID`; public contract change -> `[~] NEEDS_DECISION`; human-only category -> `[~] REQUIRES_HUMAN`. For `[-]`/`[~]`: update `task.md` (+ `## Deferred / Needs Human Decision` when `[~]`), run `git add task.md && git commit -m "chore(clean): skip step 6 (reason) [CLN-006]"`, verify clean tree, and proceed to next step (no code changes, no attempt consumed).
- BEFORE VERIFICATION:
  + Run scoped tests and static check on unchanged code: `cd QLHK-Client && npm test -- tests/e2e/regressionFlows.test.ts && npx tsc --noEmit` -> MUST PASS. Record as `BEFORE`.
- ACTIONS:
  1. In `QLHK-Client/src/pages/ExcelPage.tsx:13`, remove `import { householdApi } from "../api/householdApi";`.
  2. In `QLHK-Client/src/pages/HouseholdsPage.tsx:6`, remove `Trash2` from `lucide-react` imports.
  3. In `QLHK-Client/src/pages/SettingsPage.tsx:7, 10-14`, remove `Home`, `LogOut`, `MapPin`, and `Shield` from `lucide-react` imports.
  4. In `QLHK-Client/src/pages/SettingsPage.tsx:262-266`, remove unused local variable `const currentVillageName = useMemo(...)`.
  5. In `QLHK-Client/src/pages/VillagesPage.tsx:27`, change `import { type User, Village } from "../types";` to `import { type User } from "../types";`.
- SCOPE REVIEW & DIFF BUDGET GATE:
  1. Review working tree: `git status --short` (`task.md` changes are expected—do not reset or delete `task.md`; reset or remove any out-of-scope files or scratch files before staging).
  2. Run **DIFF GATE** (Invariant 4) -> Set `STEP_TARGET_DIRS=""`, verify modified LOC <= 200 and deleted files outside target dirs <= 25. If limits exceeded, unstage, write `Step 6.b` changes to `.git/roadmap-stash/cleanup-client-6.b.patch` across disjoint files, record its path in `task.md`, clean `Step 6.b` changes from working tree, and split into `Step 6.a` / `Step 6.b` in `task.md`.
- AFTER VERIFICATION & EQUIVALENCE GATE:
  - Run scoped tests (zero new failures vs baseline): `cd QLHK-Client && npm test -- tests/e2e/regressionFlows.test.ts` -> MUST PASS. Record as `AFTER`.
  - Run static check / typecheck (0 new errors vs baseline): `cd QLHK-Client && npx tsc --noEmit`.
  - Confirm API Surface Snapshot is unchanged.
  - Run `cd QLHK-Client && npm test` when fast enough (Invariant 7) and compare with `Known Baseline / Flaky Failures`.
- CHECKPOINT & PROGRESS UPDATE:
  - If gotchas discovered: Append to `## Project Gotchas & Learned Invariants` in `task.md` (list any justified extra files under this step).
  - Update `task.md`: Mark Step 6 as `[x]` Completed.
  - Commit: `git add -A && git commit -m "refactor(pages): complete step 6 - remove unused imports and dead local in pages [CLN-006]" -m "Cleanup class: CL-01" -m "Proof: 0 references across pages for householdApi, Trash2, Home, LogOut, MapPin, Shield, currentVillageName, Village" -m "BEFORE: scoped tests passed" -m "AFTER: scoped tests passed; API-SURFACE: unchanged"` (if completing `Step 6.b`, delete `.git/roadmap-stash/cleanup-client-6.b.patch` via `rm -f`).
  - Verify clean: `test -z "$(git status --porcelain)"`.

---

### STEP 7: Remove Redundant React and FireEvent Imports in Test Suites [CLN-007]
- START STEP:
  + Update `task.md`: Mark Step 7 as `[/]` (In Progress) and review `## Project Gotchas & Learned Invariants` (if executing a deferred `Step 7.b`, apply `.git/roadmap-stash/cleanup-client-7.b.patch` via `git apply`).
- FINDING BRIEF (embedded; authoritative):
  [BEGIN FINDING DATA BLOCK: CLN-007]
  + ID / Class / Confidence: `CLN-007` / `CL-01` / `PROVEN_DEAD`
  + Root Cause Key: `CL-01:QLHK-Client/tests:unused-react-and-fireEvent-imports`
  + Location: 7 test files in `QLHK-Client/src/components/**/__tests__/*.test.tsx` | Target Symbol / File: `import React from 'react'`, `fireEvent`
  + Code / File Excerpt (`<= 10 lines`):
    ```typescript
    import { render, screen, waitFor, fireEvent } from '@testing-library/react';
    import React from 'react';
    ```
  + Reference Proof (Static + Dynamic):
    - Static: React 18 automatic JSX runtime makes `import React from 'react'` redundant; `tsc --noEmit --noUnusedLocals` confirms TS6133 across all 7 test files.
    - Dynamic Checklist: Vitest executes all 162 tests without explicit React import.
    - Classification: `PROVEN_DEAD`
  + Before State: Redundant `import React from 'react'` present in 7 test files, and unused `fireEvent` import in `AnalyticsDashboard.test.tsx`.
  + After Expected State: Redundant React imports removed across all 7 test suites, and unused `fireEvent` dropped. API Surface: unchanged.
  + Clean Intent: Eliminate redundant React imports and unused fireEvent import in test files.
  + Strategy Rows: `CL-01` (see CLEAN STRATEGIES above)
  [END FINDING DATA BLOCK: CLN-007]
- PRE-REQUISITE READS (Parallel call; skip file read if already in active session context):
  + Source: `QLHK-Client/src/components/analytics/__tests__/AnalyticsDashboard.test.tsx`, `QLHK-Client/src/components/common/__tests__/CustomSelect.test.tsx`, `QLHK-Client/src/components/excel/__tests__/ExportSettingsModal.test.tsx`, `QLHK-Client/src/components/excel/__tests__/ImportPreviewModal.test.tsx`, `QLHK-Client/src/components/households/__tests__/AgeFilterPopover.test.tsx`, `QLHK-Client/src/components/households/__tests__/CitizenModal.test.tsx`, `QLHK-Client/src/components/households/__tests__/HouseholdTable.test.tsx`
  + Role Focus: Preserving external behavior, dead-code elimination, caller-callee blast radius verification.
- GRAPH-MAP CHECK (Omit if isolated change):
  + Command: `graft grep "import React from 'react'"`
- RE-VALIDATION GATE (Invariant 10):
  + Confirm the candidate still exists at `Location`. Re-check Reference Proof. Route outcomes: already removed -> `[-] ALREADY_FIXED`/`STALE`; live external references exist -> `[-] FINDING_INVALID`; public contract change -> `[~] NEEDS_DECISION`; human-only category -> `[~] REQUIRES_HUMAN`. For `[-]`/`[~]`: update `task.md` (+ `## Deferred / Needs Human Decision` when `[~]`), run `git add task.md && git commit -m "chore(clean): skip step 7 (reason) [CLN-007]"`, verify clean tree, and proceed to next step (no code changes, no attempt consumed).
- BEFORE VERIFICATION:
  + Run scoped tests and static check on unchanged code: `cd QLHK-Client && npm test -- src/components/analytics/__tests__/AnalyticsDashboard.test.tsx src/components/common/__tests__/CustomSelect.test.tsx && npx tsc --noEmit` -> MUST PASS. Record as `BEFORE`.
- ACTIONS:
  1. In `QLHK-Client/src/components/analytics/__tests__/AnalyticsDashboard.test.tsx`, remove `import React from 'react';` and drop `fireEvent` from `@testing-library/react`.
  2. In `QLHK-Client/src/components/common/__tests__/CustomSelect.test.tsx:2`, remove `import React from 'react';`.
  3. In `QLHK-Client/src/components/excel/__tests__/ExportSettingsModal.test.tsx:2`, remove `import React from 'react';`.
  4. In `QLHK-Client/src/components/excel/__tests__/ImportPreviewModal.test.tsx:2`, remove `import React from 'react';`.
  5. In `QLHK-Client/src/components/households/__tests__/AgeFilterPopover.test.tsx:2`, remove `import React from 'react';`.
  6. In `QLHK-Client/src/components/households/__tests__/CitizenModal.test.tsx:2`, remove `import React from 'react';`.
  7. In `QLHK-Client/src/components/households/__tests__/HouseholdTable.test.tsx:2`, remove `import React from 'react';`.
- SCOPE REVIEW & DIFF BUDGET GATE:
  1. Review working tree: `git status --short` (`task.md` changes are expected—do not reset or delete `task.md`; reset or remove any out-of-scope files or scratch files before staging).
  2. Run **DIFF GATE** (Invariant 4) -> Set `STEP_TARGET_DIRS=""`, verify modified LOC <= 200 and deleted files outside target dirs <= 25. If limits exceeded, unstage, write `Step 7.b` changes to `.git/roadmap-stash/cleanup-client-7.b.patch` across disjoint files, record its path in `task.md`, clean `Step 7.b` changes from working tree, and split into `Step 7.a` / `Step 7.b` in `task.md`.
- AFTER VERIFICATION & EQUIVALENCE GATE:
  - Run scoped tests (zero new failures vs baseline): `cd QLHK-Client && npm test -- src/components/analytics/__tests__/AnalyticsDashboard.test.tsx src/components/common/__tests__/CustomSelect.test.tsx` -> MUST PASS. Record as `AFTER`.
  - Run static check / typecheck (0 new errors vs baseline): `cd QLHK-Client && npx tsc --noEmit`.
  - Confirm API Surface Snapshot is unchanged.
  - Run `cd QLHK-Client && npm test` when fast enough (Invariant 7) and compare with `Known Baseline / Flaky Failures`.
- CHECKPOINT & PROGRESS UPDATE:
  - If gotchas discovered: Append to `## Project Gotchas & Learned Invariants` in `task.md` (list any justified extra files under this step).
  - Update `task.md`: Mark Step 7 as `[x]` Completed.
  - Commit: `git add -A && git commit -m "refactor(tests): complete step 7 - remove redundant react and fireEvent imports in test suites [CLN-007]" -m "Cleanup class: CL-01" -m "Proof: React 18 automatic runtime makes explicit React import redundant; fireEvent unreferenced" -m "BEFORE: scoped tests passed" -m "AFTER: scoped tests passed; API-SURFACE: unchanged"` (if completing `Step 7.b`, delete `.git/roadmap-stash/cleanup-client-7.b.patch` via `rm -f`).
  - Verify clean: `test -z "$(git status --porcelain)"`.

---

### STEP 8: FULL SUITE VERIFICATION, EQUIVALENCE & ZERO-REGRESSION GATE
- START STEP:
  + Update `task.md`: Mark Step 8 as `[/]` (In Progress).
- ACTIONS:
  1. Run Full Test Suite: `cd QLHK-Client && npm test` (Zero new failures vs baseline: 162/162 passing).
  2. Run Typecheck: `cd QLHK-Client && npx tsc --noEmit` (0 new errors vs baseline).
  3. Verify API Surface: Compare final public exports, route table, or type definitions against Step 0 snapshot; confirm 0 unintended contract changes.
  4. Verify Ignored & Untracked Files: Confirm zero baseline ignored files were lost (filtering transient build/test caches; preserving baseline for post-run reviewer audit):
      ```bash
      GIT_COMMON_DIR=$(git rev-parse --git-common-dir)
      git ls-files --others --ignored --exclude-standard --directory | sort > "$GIT_COMMON_DIR/roadmap-ignored-current.txt"
      MISSING_IGNORED=$(comm -23 "$GIT_COMMON_DIR/roadmap-ignored-baseline.txt" "$GIT_COMMON_DIR/roadmap-ignored-current.txt" \
        | grep -v -E "(^\s*$|(^|/)(\.cache|cache|coverage|tmp)/|\.pytest_cache|\.turbo)" | wc -l | awk '{print $1+0}')
      test "$MISSING_IGNORED" -eq 0
      rm -f "$GIT_COMMON_DIR/roadmap-ignored-current.txt"
      ```
  5. Review Working Tree & Orphan Patches: `git status --short` (`task.md` changes expected; verify no temporary artifacts, untracked files, or leftover `.git/roadmap-stash/*.patch` files).
  6. Update `task.md`: Mark Step 8 and all checklist items as `[x]` Completed, and record the `Finding ID -> commit hash` closure mapping (use `git log --oneline --grep="\[CLN-"` to obtain each hash; mark `[~]`/`[-]` findings with their reason code) under `## Finding Closure Mapping` in `task.md` and in the final completion summary.
  7. Final Commit: `git add -A && git commit -m "chore(clean): complete cleanup-client verification gate"`.
  8. Final Clean & No-Orphan-Patch Verification: `test -z "$(git status --porcelain)" && test -z "$(ls -A .git/roadmap-stash 2>/dev/null)"` (Must exit 0).
- POST-GATE COMPLETION & BRANCH HANDOFF:
  1. Remove `task.md` in a final cleanup commit by default, AFTER copying the `## Deferred / Needs Human Decision` and closure tables into your completion summary:
     `git rm task.md && git commit -m "chore(clean): remove task.md" && test -z "$(git status --porcelain)"`
  2. List any preserved circuit-breaker WIP branches (`git branch --list "failed/cleanup-client/*"`), present completion summary, and ask the user how to proceed:
     - **Option 1**: Open a Pull Request from `clean/cleanup-client` into `<BASE_BRANCH>`.
     - **Option 2**: Merge `clean/cleanup-client` into `<BASE_BRANCH>` locally (`git switch "<BASE_BRANCH>" && git merge --no-ff "clean/cleanup-client"`).
     - **Option 3**: Leave the branch `clean/cleanup-client` as-is for manual inspection.
  3. Recommend an independent fresh-session review of the branch with the clean reviewer prompt.

---

### SESSION HANDOFF CHECKPOINT TEMPLATE (Output after every 4 steps reach a terminal status in a session, unless Step N just finished)

When 4 steps (`Step 0` excluded) reach `[x]`, `[~]`, or `[-]` in the current session (or when requested by the user), and `Step 8` is not yet complete, run `cd QLHK-Client && npm test`, ensure clean git status, output the block below (replacing `<STEPS_COMPLETED_IN_SESSION>` with the actual count), and **STOP immediately** (do not start the next step in this session):

````text
### 🔄 Session Handoff Checkpoint

Completed <STEPS_COMPLETED_IN_SESSION> step(s) in this session on branch `clean/cleanup-client` (base branch: `<BASE_BRANCH>`). Full test suite verified.

To resume in a fresh session:
1. Read `docs/plans/cleanup.clean.md` (the committed original clean prompt containing all `STRICT INVARIANTS`, finding briefs, and step definitions) then continue — or paste the **ORIGINAL clean prompt** below as a fallback.
2. Append or send this resume block immediately after:

```text
Resume execution of the roadmap / clean remediation on branch `clean/cleanup-client` (base branch: `<BASE_BRANCH>`). Read `docs/plans/cleanup.clean.md` (the committed original clean prompt) for all `STRICT INVARIANTS` and step definitions—or use the original clean prompt pasted above as a fallback.

CRITICAL: Do NOT re-execute STEP 0 or any step already marked `[x]`, `[~]`, or `[-]` in `task.md`. The branch and `task.md` already exist—Invariant 1's `git switch -c` applies only to the initial fresh start.

Directives:
1. Switch to branch: `git switch clean/cleanup-client`
2. Working tree check:
   - If clean (`test -z "$(git status --porcelain)"` exits 0), proceed to Directive 3.
   - If dirty, inspect `task.md`:
     + If a step is marked `[/]` (In Progress), proceed to Directive 5 to evaluate WIP changes.
     + If dirty without an in-progress step, halt immediately and alert the user.
3. Read `task.md` to review `Base Branch`, progress, known baseline/flaky failures, `## Deferred / Needs Human Decision`, and `## Project Gotchas & Learned Invariants`.
4. Inspect `git log -n 3 --oneline` to confirm the last committed checkpoint.
5. If Step K is marked `[/]` (In Progress) with uncommitted WIP, inspect existing changes via `git status --short` before continuing; re-run the step's RE-VALIDATION GATE and resume from the correct BEFORE/ACTIONS/VERIFICATION point.
6. If Step K is marked `[!]` (Blocked):
   - Review the failure reason logged in `task.md`.
   - Await user guidance on the resolution strategy (or `skip` -> `[~]` `BLOCKED_BY_USER_SKIP`).
   - Upon guidance, update `task.md` to mark Step K back to `[/]` (In Progress) and resume implementation from the clean Step K-1 commit.
7. Otherwise, proceed with the next pending `[ ]` step following the strict invariants and step definitions in the clean prompt pasted above.
```
````
`````
