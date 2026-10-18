`````text
[MANDATORY SYSTEM DIRECTIVE]:
You are executing a multi-step, behavior-preserving hygiene and dead-code elimination plan produced by the `clean` skill. The findings are embedded in this prompt as `FINDING BRIEF` blocks inside each step. The discovery workspace (`clean/`) is git-excluded and may not exist on this machine: NEVER depend on it.
Clean prompt file: docs/plans/qlhk-client/qlhk-client-clean-20261019.clean.md

ENVIRONMENT REQUIREMENT:
All shell commands require a POSIX-compatible shell (Git Bash on Windows, WSL, Linux, or macOS).

STRICT INVARIANTS:
1. BRANCH & PRE-FLIGHT (Initial Start Only):
   - **Pre-Switch Detached-HEAD & Protected-Branch Guard**: Verify `HEAD` is not detached (`test -n "$(git branch --show-current)"`, halting if detached). Set `BASE_BRANCH="${BASE_BRANCH:-clean/client-clean-20261018}"` (the intended base branch `clean/client-clean-20261018` captured and confirmed when the prompt was generated).
   - Create and switch to isolated branch: `git switch -c clean/qlhk-client-clean-20261019`. If the branch already exists on a fresh start, halt immediately and ask the user whether to resume the existing branch or choose a new branch name. (When resuming via a Handoff Prompt, skip `STEP 0` and use `git switch clean/qlhk-client-clean-20261019`.)
   - Verify clean working tree: `test -z "$(git status --porcelain)"`.
   - Execute the baseline test command **twice** (`Run 1` and `Run 2`), record `Base Branch: <BASE_BRANCH>`, the passing count, and exact names of any tests failing in **either** run as "flaky/known failing" into `docs/plans/qlhk-client/qlhk-client-clean-20261019.task.md`. Run `cd QLHK-Client && npx tsc --noEmit` once and record the baseline error count.
   - **API Surface Snapshot**: Capture the project's public surface (package exports, public route table, CLI help, or type declarations) and record in `docs/plans/qlhk-client/qlhk-client-clean-20261019.task.md` before making any code modifications.
   - **Ignored & Untracked Files Inventory**: Capture baseline list of ignored files (`GIT_COMMON_DIR=$(git rev-parse --git-common-dir) && git ls-files --others --ignored --exclude-standard --directory | sort > "$GIT_COMMON_DIR/roadmap-ignored-baseline-qlhk-client-clean-20261019.txt"`) and record file count in `docs/plans/qlhk-client/qlhk-client-clean-20261019.task.md` to guarantee zero pre-existing ignored/local files (e.g. `.env`) are deleted during execution.
   - Commit `docs/plans/qlhk-client/qlhk-client-clean-20261019.task.md` immediately. Never build on an uncommitted dirty tree.
2. TWO-TIER READ CADENCE & CONTEXT ANCHORING:
   - **Tier 1 (Session / Task Initialization)**: At `STEP 0`, when resuming from a handoff, or after a `/compact` event, you MUST perform a one-time anchor read of: `docs/plans/qlhk-client/qlhk-client-clean-20261019.task.md`, `.agents/frontend-developer.md` (if present in repo), and the prompt header (`docs/plans/qlhk-client/qlhk-client-clean-20261019.clean.md`). Emit mandatory proof-of-read log before taking action:
     `[Context Anchored]: docs/plans/qlhk-client/qlhk-client-clean-20261019.task.md (<status>), frontend-developer.md (<invariants>), clean plan (<goal>)`
   - **Tier 2 (In-Session Atomic Step K)**: The `FINDING BRIEF` embedded in each step is the authoritative description of the cleanup candidate. NEVER re-read the entire plan or role file at each step. Do NOT read or depend on `clean/` paths. Rely on inlined instructions inside `STEP K`. Follow the embedded `Role Focus` invariants and only read code files strictly inside `Target Files`. Review `## Project Gotchas & Learned Invariants` in `docs/plans/qlhk-client/qlhk-client-clean-20261019.task.md` before starting a step.
3. GRAPH-AWARE BLAST RADIUS:
   - When a step specifies a `GRAPH-MAP CHECK`, check if the tool (`graft`, `graphify`, `codegraph`) is installed before querying callers/callees. Fall back to native grep or LSP find-references if unavailable.
4. SCOPE HYGIENE & DIFF GATE (<= 200 GROSS LOC OR <= 25 DELETED FILES OUTSIDE TARGET DIRS):
   - After implementing changes and BEFORE staging, run `git status --short`. Note that `docs/plans/qlhk-client/qlhk-client-clean-20261019.task.md` modifications (`[/]`) are expected—never reset or delete `docs/plans/qlhk-client/qlhk-client-clean-20261019.task.md`. If out-of-scope files (`.env*`, scratch scripts, temporary files, build artifacts) appear, reset (`git reset <file>`), delete, or add to `.gitignore`.
   - Run the **DIFF GATE** command to stage changes and verify:
     1. Modified/Added files gross LOC <= 200 (binary files count as 0 LOC).
     2. Pure deletions (`git rm` / `git rm --cached`): <= 25 individual deleted files outside the step's designated target directories. For whole-directory untracks (`SRC-02`), up to 5 target directory roots listed in the step's `Target Files` are declared in `STEP_TARGET_DIRS` and exempted via pathspec exclusions. Exempted directories must remain on disk and be ignored by `.gitignore`:
     ```bash
     git add -A
     MOD_LOC=$(git diff --cached --numstat --diff-filter=d -- . \
       ':(exclude)*.lock' ':(exclude)*lock.json' \
       ':(exclude,glob)**/migrations/**' ':(exclude,glob)**/fixtures/**' \
       ':(exclude)docs/plans/qlhk-client/qlhk-client-clean-20261019.task.md' \
       | awk '{s+=$1+$2} END {print s+0}')
     STEP_TARGET_DIRS="${STEP_TARGET_DIRS:-}"
     EXCLUDE_ARGS=()
     for d in $STEP_TARGET_DIRS; do
       test -n "$d" && EXCLUDE_ARGS+=(":(exclude)${d%/}/**")
     done
     DEL_OUTSIDE=$(git diff --cached --name-only --diff-filter=D -- . \
       ':(exclude)docs/plans/qlhk-client/qlhk-client-clean-20261019.task.md' "${EXCLUDE_ARGS[@]}" \
       | wc -l | awk '{print $1+0}')
     echo "Modified LOC: ${MOD_LOC} (max 200), Deleted files outside target dirs: ${DEL_OUTSIDE} (max 25)"
     test "$MOD_LOC" -le 200 && test "$DEL_OUTSIDE" -le 25
     for d in $STEP_TARGET_DIRS; do
       test -n "$d" && { test -d "$d" && git check-ignore -q "$d/" || { echo "FAIL: exempted dir $d must remain on disk and be ignored"; exit 1; }; }
     done
     ```
   - If limits exceeded, unstage (`git reset`), split the step in `docs/plans/qlhk-client/qlhk-client-clean-20261019.task.md` into `Step K.a` and `Step K.b` touching **disjoint sets of files** (without renumbering subsequent steps), and execute `Step K.a` first:
     1. Save the `Step K.b` changes to an isolated patch file inside `.git/` (so the working tree stays 100% clean), explicitly backing up `docs/plans/qlhk-client/qlhk-client-clean-20261019.task.md` so in-progress progress markers are never lost:
        ```bash
        mkdir -p .git/roadmap-stash
        cp docs/plans/qlhk-client/qlhk-client-clean-20261019.task.md .git/roadmap-task.md.bak
        git add -N -- step_Kb_new_files 2>/dev/null || true
        git diff -- step_Kb_files step_Kb_new_files > ".git/roadmap-stash/qlhk-client-clean-20261019-K.b.patch"
        git checkout -- step_Kb_files
        git clean -fd -- step_Kb_new_files
        mv .git/roadmap-task.md.bak docs/plans/qlhk-client/qlhk-client-clean-20261019.task.md
        ```
     2. Record `Deferred Patch: .git/roadmap-stash/qlhk-client-clean-20261019-K.b.patch` under `Step K.b` in `docs/plans/qlhk-client/qlhk-client-clean-20261019.task.md`. Never commit `Step K.b` changes inside `Step K.a`.
     3. When `Step K.b` starts, apply the saved patch via `git apply ".git/roadmap-stash/qlhk-client-clean-20261019-K.b.patch"`, and immediately after committing `Step K.b`, delete the patch file via `rm -f ".git/roadmap-stash/qlhk-client-clean-20261019-K.b.patch"`. Each committed sub-step counts as **1 step** toward the 4-step session handoff counter.
5. ATOMIC COMMITS & COMMIT HOOKS:
   - After BEFORE/AFTER equivalence and scoped tests pass, update `docs/plans/qlhk-client/qlhk-client-clean-20261019.task.md` (`[x]` + any new gotchas) and commit one finding per commit using `refactor` (for `CL-XX`) or `chore` (for `SRC-XX`):
     ```bash
     git add -A && git commit -m "refactor(scope): complete step K - title [Finding-ID]" \
       -m "Cleanup class: CL-XX" \
       -m "Proof: Reference proof summary -> 0 hits" \
       -m "BEFORE: scoped command -> pass summary" \
       -m "AFTER: scoped command -> pass summary; API-SURFACE: unchanged"
     ```
   - For skipped steps (`[-]` or `[~]`), commit only `docs/plans/qlhk-client/qlhk-client-clean-20261019.task.md`:
     `git add docs/plans/qlhk-client/qlhk-client-clean-20261019.task.md && git commit -m "chore(clean): skip step K (reason) [Finding-ID]"`
   - Never use `--no-verify`. Never push, rebase, or force-anything. Clean tree after commit.
6. SAFE CIRCUIT BREAKER ROLLBACK & UNBLOCKING:
   - **What Counts as an Attempt**: A single cycle of modifying code for the current step (or sub-step `K.a`/`K.b`) followed by a failing scoped test, failing per-step static/typecheck command, a new full-suite regression, an API Surface break, or a pre-commit hook failure caused by the agent's own code change.
   - **Pre-Retry Reset Rule (Before Attempt 2 and Attempt 3)**: Before starting each retry attempt (`Attempt 2` or `Attempt 3`), reset all tracked and untracked code changes back to the last committed checkpoint while preserving `docs/plans/qlhk-client/qlhk-client-clean-20261019.task.md`:
     ```bash
     cp docs/plans/qlhk-client/qlhk-client-clean-20261019.task.md .git/roadmap-task.md.bak
     git restore --staged . && git checkout -- . && git clean -fd -e docs/plans/qlhk-client/qlhk-client-clean-20261019.task.md
     mv .git/roadmap-task.md.bak docs/plans/qlhk-client/qlhk-client-clean-20261019.task.md
     ```
   - **Counter Reset Rule**: The 3-attempt counter is scoped per step (or sub-step `K.a`/`K.b`) and resets to `0` when: (a) a step passes verification and is committed (`[x]`), or (b) the user provides unblocking guidance after a `[!]` halt and the step is transitioned from `[!]` back to `[/]`.
   - If a step fails after 3 consecutive attempts, preserve WIP on a unique branch and restore `clean/qlhk-client-clean-20261019` cleanly:
     ```bash
     ATTEMPT_TS=$(date +%s)
     git switch -c "failed/qlhk-client-clean-20261019/step-K-attempt-${ATTEMPT_TS}"
     git add -A && git commit -m "wip: failed step K attempt after 3 tries"
     git switch "clean/qlhk-client-clean-20261019"
     git add docs/plans/qlhk-client/qlhk-client-clean-20261019.task.md && git commit -m "chore(clean): mark step K blocked (CIRCUIT_BREAKER)"
     ```
   - Halt and await user guidance. Never delete `failed/qlhk-client-clean-20261019/*` branches automatically.
   - Unblocking procedure: Once user provides guidance, ensure you are on `clean/qlhk-client-clean-20261019`, change `[!]` back to `[/]` in `docs/plans/qlhk-client/qlhk-client-clean-20261019.task.md` (which resets the attempt counter to `0`), and retry Step K from the clean Step K-1 checkpoint. If the user replies `skip`, mark the step `[~]` with reason `BLOCKED_BY_USER_SKIP`, commit `docs/plans/qlhk-client/qlhk-client-clean-20261019.task.md`, and continue with the next step.
7. SCOPED TESTS, PER-STEP STATIC CHECK, FLAKY POLICY VS FULL SUITE:
   - Run fast scoped tests AND `cd QLHK-Client && npx tsc --noEmit` at each step.
   - Run full test suite and full typecheck at session handoffs and at the final verification gate (`Step 8`).
   - **Flaky Test Policy**: Double baseline run; any test failing in either run is recorded in `docs/plans/qlhk-client/qlhk-client-clean-20261019.task.md`. During `STEP K`, handoffs, or `STEP 8`, any new failure must be re-run once before counting as a regression.
   - Enforce zero confirmed new failures compared to baseline.
8. FRESH CONTEXT HANDOFF (EVERY 4 STEPS IN SESSION OR ON USER REQUEST):
   - After **4 implementation steps reach a terminal status** (`[x]` committed, `[~]` deferred, or `[-]` not applicable; each committed sub-step counts as 1 step) in the current session, run the full test suite, verify clean working tree, output the embedded `SESSION HANDOFF CHECKPOINT` block, and **STOP immediately**.
9. MINIMAL WORKING DIFF:
   - Shortest working code, strict YAGNI, zero temporary scratch scripts. Only modify `Target Files` (+ at most 2 justified extra files).
10. CLEAN DISCIPLINE & EVIDENCE GATES:
   - **Re-validate first**: Re-read `Location`, confirm candidate exists. If gone -> `[-] ALREADY_FIXED`/`STALE`; if live external references exist -> `[-] FINDING_INVALID`; if public contract change required -> `[~] NEEDS_DECISION`; if human category -> `[~] REQUIRES_HUMAN`. For `[-]`/`[~]`: update `docs/plans/qlhk-client/qlhk-client-clean-20261019.task.md`, run `git add docs/plans/qlhk-client/qlhk-client-clean-20261019.task.md && git commit -m "chore(clean): skip step K (<reason>) [<Finding-ID>]"`, verify clean tree, and proceed.
   - **Mandatory Reference Proof & Code-Graph Verification**:
     1. Static Micro Search: Whole-repo search (`grep -rn`, LSP references, `graft callers <symbol>`) across all code, tests, CI, scripts, docs, configs showing zero external references.
     2. Macro Cluster Isolation: For full module/directory deletions, verify via `graphify path "<AppEntry>" "<CandidateModule>"` that zero reachable dependency paths exist from root entrypoints.
     3. Dynamic Checklist: Explicitly verify symbol/file is NOT loaded via reflection (`getattr`, `eval`), DI bindings, convention autodiscovery (routes, models), serialization keys, package exports, or deployment configs.
     4. Tier Outcome: Must be `PROVEN_DEAD` to delete automatically.
   - **BEFORE/AFTER Equivalence Gate**:
     1. BEFORE: Scoped tests PASS and typecheck baseline recorded on unchanged code.
     2. Characterization test: Required for `CL-06`, `CL-07`, `CL-09`. Must PASS before and after. Pure deletions do NOT require writing tests.
     3. AFTER: Scoped tests PASS, 0 new typecheck errors, build succeeds, API Surface Snapshot is unchanged.
   - **In-Step Orphaned Import Cleanup**: A structural deletion step (`CL-03`, `CL-04`, `CL-02`) is permitted to remove any imports in the same file that become orphaned as a direct consequence of deleting that dead code.
   - **Never Weaken Tests Rule**: Do not delete, skip, or loosen existing tests. A test file may be removed ONLY when it exclusively exercises code removed in the same step.
   - **Python / Named Arguments Guard**: Never rename unused kwargs or named parameters in Python or languages supporting named arguments.
   - **Async Try/Catch Guard**: Never unwrap `return await` inside `try/catch` or `try/finally`.
   - **Untracked File Sanctity & Safe Cleanup**: Never delete pre-existing untracked files. `git clean -fd` is permitted strictly to clean ephemeral files generated by a failed attempt during Pre-Retry Reset or step splitting.
   - **Human-Only Categories**: Package manifests (`SRC-08`), untracked clutter (`SRC-10`), secrets, and migrations are never auto-applied.

---

## CLEAN STRATEGIES TO APPLY (Starting Points; the Finding Brief Takes Precedence)

### 1. Generic Rules (Always Applied)

1. **Behavior preservation is absolute**: The core contract of `clean` is that observable system behavior is IDENTICAL before and after. Return values, exception semantics, side effects, database queries, network calls, log outputs, and public API surfaces must not change.
2. **Reference Proof & Code-Graph Verification before deletion**: Never delete or rename a symbol or file because it "looks unused". Every deletion requires a complete Reference Proof:
   - **Micro (Symbols & Single Files)**: Run `graft callers <symbol>` (fallback: whole-repo `grep -rn`, LSP `find-references`) showing zero external callers across code, tests, CI, scripts, docs, and configs.
   - **Macro (Orphaned Subgraphs & Zombie Clusters)**: When deleting an entire module, subsystem, or directory tree (`SRC-03`), run `graphify path "<AppEntry>" "<CandidateModule>"` to prove zero reachable paths exist from application entrypoints.
   - **Dynamic Usage Checklist**: Explicitly verify reflection, dynamic imports (`import()`), DI tokens, framework route autodiscovery, serialization models, and template bindings.
3. **Orphaned import cleanup in structural steps**: A structural code deletion step (`CL-03`, `CL-04`, `CL-02`, etc.) is explicitly permitted to remove any imports within the same file that become orphaned as a direct consequence of removing that dead code.
4. **Never rename kwargs or named parameters**: In TS/JS, `_` prefix is permitted strictly for positional callback signatures.
5. **Never unwrap `return await` inside `try/catch/finally`**: Inside a `try/catch` or `try/finally` block, unwrapping `await` causes rejected promises to escape the local `catch` or bypass `finally`.
6. **Never rename or alter public/exported APIs in `code` mode**: All renames or signature modifications are strictly limited to private, file-local, or package-internal symbols. Changing an export or public contract requires human approval -> route to Excluded Block (`NEEDS_DECISION`).
7. **Never weaken or delete tests**: Do not delete, skip (`.skip`, `xit`), or loosen assertions in existing test suites.
8. **Smallest safe change & Diff Gate**: One cleanup class and cohesive cluster per step. Staged modifications/additions must remain `<= 200 gross LOC`. Pure deletions must remain `<= 25 files` outside target directories.
9. **Untracked File Sanctity & Clean Exception**: Never delete pre-existing untracked files.
10. **No new dependencies or configuration sprawl**: Never introduce a new library, package, or build tool to perform cleanup.
11. **Comment hygiene rule**: Remove only commented-out executable code blocks. Never remove explanatory comments, architectural notes, license headers, docstrings, or TODOs.
12. **Respect generated and vendored code**: Never edit or clean files marked `generated`, `DO NOT EDIT`, or located in `dist/`, `build/`, `vendor/`, `node_modules/`, or snapshots.
13. **Human-only boundaries**: Manifests and lockfiles (`SRC-08`), secrets, CI/IaC pipelines, live database migrations, and untracked files (`SRC-10`) are permanently excluded from automated execution and reported in the Excluded Findings Block.

### 2. Class-Specific Clean Starting Points

| ID | Preferred Clean Pattern | Equivalence & Verification Focus |
| :--- | :--- | :--- |
| `CL-01` | Remove unused imports or local variables. For unused parameters: in TS/JS positional callbacks, prefix with `_` (e.g. `_req`); delete unused parameters only if internal and all call sites are updated. | Scoped compiler/linter check (`tsc --noEmit`, `eslint`, `vitest`); verify 0 new diagnostic errors. |

---

**EXCLUDED FINDINGS (NOT EXECUTED AS STEPS — report in the final summary):**
- `EXC-001` | `REQUIRES_HUMAN` | `SRC-08` unused dependency `react-router-dom` in `QLHK-Client/package.json:30`; client uses state-driven tab router; manifest modifications require human evaluation
- `EXC-002` | `REQUIRES_HUMAN` | `SRC-10` untracked clutter check via `git clean -nd` reported 0 files; working tree is clean
- `EXC-003` | `NEEDS_DECISION` | `CL-04` exported wrapper `HouseholdModal` in `QLHK-Client/src/components/households/HouseholdModal.tsx:9`; preserved for backward compatibility and test contracts (`tests/e2e/workflow.test.ts:182`)
- `EXC-004` | `NEEDS_DECISION` | `SRC-01` standalone Excel tooling and preview pages unmounted from main navigation in `QLHK-Client/src/components/excel/ExcelDropzone.tsx` & `QLHK-Client/src/pages/ExcelPage.tsx`; preserved for reference / requires product decision before deletion
- `EXC-005` | `NEEDS_DECISION` | `SRC-02` platform configuration files (`tauri.conf.json`, `capabilities/`, `Cargo.toml`) and Tauri native assets in `QLHK-Client/src-tauri/`; permanently excluded by system directive

---

### STEP 0: BRANCH ISOLATION, PRE-FLIGHT GATE & TASK INITIALIZATION
1. Resolve BASE_BRANCH: set `BASE_BRANCH="${BASE_BRANCH:-clean/client-clean-20261018}"` (verifying `HEAD` is not detached via `test -n "$(git branch --show-current)"`, halting if detached). Create and switch to branch: `git switch -c clean/qlhk-client-clean-20261019` (if branch already exists, halt and ask user whether to resume or rename).
2. Verify clean working tree: `test -z "$(git status --porcelain)"` (Must exit 0).
3. Capture baseline commit hash via `git rev-parse --short HEAD` and run baseline tests **twice**: `cd QLHK-Client && npm test && cd QLHK-Client && npm test` -> Record total passing count (162 passing across 17 test files) and exact names of any tests failing in **either** run as "flaky/known failing". Also run `cd QLHK-Client && npx tsc --noEmit` once and record its error count (0 errors) as the typecheck baseline.
4. Capture API Surface Snapshot: Record public export signatures, route definitions, or CLI options to serve as the baseline for behavior preservation:
   - Client Page Navigation: `villages`, `households`, `analytics`, `recycle-bin`, `audit`, `settings`
   - Context Providers: `AppProvider`, `HouseholdProvider`, `NetworkProvider`, `ModalProvider`, `ToastProvider`
   - Native Tauri Bridge: `initTauriBridge`, `tauriHttpAdapter`, `getTauriAxiosAdapter`
5. Capture Ignored Files Inventory: Run `GIT_COMMON_DIR=$(git rev-parse --git-common-dir) && git ls-files --others --ignored --exclude-standard --directory | sort > "$GIT_COMMON_DIR/roadmap-ignored-baseline-qlhk-client-clean-20261019.txt"` and record count in `docs/plans/qlhk-client/qlhk-client-clean-20261019.task.md` to ensure zero pre-existing local/ignored files are deleted.
6. Create `docs/plans/qlhk-client/qlhk-client-clean-20261019.task.md` at project root with this exact content (replace `<BASE_BRANCH>`, `<BASELINE_HASH>`, and `<PASS_COUNT>` with actual values from steps 1 and 3):

```markdown
# Task Progress Tracker: qlhk-client-clean-20261019

- **Project**: QLHK-Client
- **Intended Base Branch**: `clean/client-clean-20261018`
- **Base Branch**: `<BASE_BRANCH>`
- **Branch**: `clean/qlhk-client-clean-20261019`
- **Plan Reference**: `N/A (direct clean hygiene remediation)`
- **Clean Prompt Reference**: `docs/plans/qlhk-client/qlhk-client-clean-20261019.clean.md`
- **Baseline Checkpoint**: `<BASELINE_HASH>` (<PASS_COUNT> passing, verified across 2 baseline runs)
- **Known Baseline / Flaky Failures (Failed in Either Baseline Run)**:
  - None (162/162 passing across 17 test files)
- **Typecheck Baseline**: 0 errors (`cd QLHK-Client && npx tsc --noEmit`)
- **API Surface Snapshot**: Baseline captured (0 public breaks permitted)
- **Ignored Files Baseline**: Recorded in $(git rev-parse --git-common-dir)/roadmap-ignored-baseline-qlhk-client-clean-20261019.txt (0 missing ignored files permitted)
- **Status Legend**: 
  - `[ ]` Pending
  - `[/]` In Progress
  - `[x]` Completed (cleaned, verified equivalent, committed)
  - `[!]` Blocked (`CIRCUIT_BREAKER`)
  - `[~]` Deferred (`NEEDS_DECISION`, `REQUIRES_HUMAN`, `BLOCKED`, `BLOCKED_BY_USER_SKIP`)
  - `[-]` Not Applicable (`ALREADY_FIXED`, `STALE`, `FINDING_INVALID`)

## Execution Checklist

- [ ] Step 1: Remove Dead Latency State and File-Scope Constants in AppContext [CLN-001]
  - Finding IDs: `CLN-001` (Root Cause Key: `CL-01:QLHK-Client/src/AppContext.tsx:dead-latency-state-and-constants`; Class: `CL-01`)
  - Target Files: `QLHK-Client/src/AppContext.tsx`
  - Role Focus: Preserving external behavior, dead-code elimination, caller-callee blast radius verification
  - Reference Proof: Static TS6133 0 external callers via `graft callers "emaLatency"`; Dynamic verified `PROVEN_DEAD`
  - Diff Budget: <= 200 gross LOC (modified/added), <= 25 files outside target directories
  - Verification: `cd QLHK-Client && npm test -- tests/e2e/workflow.test.ts && cd QLHK-Client && npx tsc --noEmit`
  - Equivalence Check: API Surface unchanged vs Step 0 snapshot; scoped tests pass
  - Evidence: BEFORE `<pass summary>` / AFTER `<pass summary>`

- [ ] Step 2: Remove Unused State Setter setLoading in Household Store [CLN-002]
  - Finding IDs: `CLN-002` (Root Cause Key: `CL-01:QLHK-Client/src/store/householdStore.ts:unused-setLoading-setter`; Class: `CL-01`)
  - Target Files: `QLHK-Client/src/store/householdStore.ts`
  - Role Focus: Preserving external behavior, dead-code elimination, caller-callee blast radius verification
  - Reference Proof: Static TS6133 0 external callers via `graft callers "setLoading"`; Dynamic verified `PROVEN_DEAD`
  - Diff Budget: <= 200 gross LOC (modified/added), <= 25 files outside target directories
  - Verification: `cd QLHK-Client && npm test -- src/api/__tests__/householdApi.test.ts && cd QLHK-Client && npx tsc --noEmit`
  - Equivalence Check: API Surface unchanged vs Step 0 snapshot; scoped tests pass
  - Evidence: BEFORE `<pass summary>` / AFTER `<pass summary>`

- [ ] Step 3: Remove Unused Icons and Dead State in AnalyticsDashboard [CLN-003]
  - Finding IDs: `CLN-003` (Root Cause Key: `CL-01:QLHK-Client/src/components/analytics/AnalyticsDashboard.tsx:unused-icons-and-state`; Class: `CL-01`)
  - Target Files: `QLHK-Client/src/components/analytics/AnalyticsDashboard.tsx`
  - Role Focus: Preserving external behavior, dead-code elimination, caller-callee blast radius verification
  - Reference Proof: Static TS6133 0 external callers via `graft callers "AnalyticsDashboard"`; Dynamic verified `PROVEN_DEAD`
  - Diff Budget: <= 200 gross LOC (modified/added), <= 25 files outside target directories
  - Verification: `cd QLHK-Client && npm test -- src/components/analytics/__tests__/AnalyticsDashboard.test.tsx && cd QLHK-Client && npx tsc --noEmit`
  - Equivalence Check: API Surface unchanged vs Step 0 snapshot; scoped tests pass
  - Evidence: BEFORE `<pass summary>` / AFTER `<pass summary>`

- [ ] Step 4: Remove Unused Icons, Dead Hook and State Setter in AuditLogView [CLN-004]
  - Finding IDs: `CLN-004` (Root Cause Key: `CL-01:QLHK-Client/src/components/audit/AuditLogView.tsx:unused-imports-and-state`; Class: `CL-01`)
  - Target Files: `QLHK-Client/src/components/audit/AuditLogView.tsx`
  - Role Focus: Preserving external behavior, dead-code elimination, caller-callee blast radius verification
  - Reference Proof: Static TS6133 0 external callers via `graft callers "AuditLogView"`; Dynamic verified `PROVEN_DEAD`
  - Diff Budget: <= 200 gross LOC (modified/added), <= 25 files outside target directories
  - Verification: `cd QLHK-Client && npm test -- tests/e2e/regressionFlows.test.ts && cd QLHK-Client && npx tsc --noEmit`
  - Equivalence Check: API Surface unchanged vs Step 0 snapshot; scoped tests pass
  - Evidence: BEFORE `<pass summary>` / AFTER `<pass summary>`

- [ ] Step 5: Remove Unused Imports and Dead Local in Common, Layout, and Settings Components [CLN-005]
  - Finding IDs: `CLN-005` (Root Cause Key: `CL-01:QLHK-Client/src/components:common-layout-settings-unused`; Class: `CL-01`)
  - Target Files: `QLHK-Client/src/components/common/CustomSelect.tsx`, `QLHK-Client/src/components/common/statStyles.tsx`, `QLHK-Client/src/components/Layout/Header.tsx`, `QLHK-Client/src/components/settings/ProfileCard.tsx`
  - Role Focus: Preserving external behavior, dead-code elimination, caller-callee blast radius verification
  - Reference Proof: Static TS6133 0 external callers; Dynamic verified `PROVEN_DEAD`
  - Diff Budget: <= 200 gross LOC (modified/added), <= 25 files outside target directories
  - Verification: `cd QLHK-Client && npm test -- src/components/common/__tests__/CustomSelect.test.tsx && cd QLHK-Client && npx tsc --noEmit`
  - Equivalence Check: API Surface unchanged vs Step 0 snapshot; scoped tests pass
  - Evidence: BEFORE `<pass summary>` / AFTER `<pass summary>`

- [ ] Step 6: Remove Unused Imports and Dead Local Variable in Page Components [CLN-006]
  - Finding IDs: `CLN-006` (Root Cause Key: `CL-01:QLHK-Client/src/pages:unused-page-symbols`; Class: `CL-01`)
  - Target Files: `QLHK-Client/src/pages/ExcelPage.tsx`, `QLHK-Client/src/pages/HouseholdsPage.tsx`, `QLHK-Client/src/pages/SettingsPage.tsx`, `QLHK-Client/src/pages/VillagesPage.tsx`
  - Role Focus: Preserving external behavior, dead-code elimination, caller-callee blast radius verification
  - Reference Proof: Static TS6133 0 external callers; Dynamic verified `PROVEN_DEAD`
  - Diff Budget: <= 200 gross LOC (modified/added), <= 25 files outside target directories
  - Verification: `cd QLHK-Client && npm test -- tests/e2e/regressionFlows.test.ts && cd QLHK-Client && npx tsc --noEmit`
  - Equivalence Check: API Surface unchanged vs Step 0 snapshot; scoped tests pass
  - Evidence: BEFORE `<pass summary>` / AFTER `<pass summary>`

- [ ] Step 7: Remove Redundant React and FireEvent Imports in Test Suites [CLN-007]
  - Finding IDs: `CLN-007` (Root Cause Key: `CL-01:QLHK-Client/tests:redundant-test-imports`; Class: `CL-01`)
  - Target Files: `QLHK-Client/src/components/analytics/__tests__/AnalyticsDashboard.test.tsx`, `QLHK-Client/src/components/common/__tests__/CustomSelect.test.tsx`, `QLHK-Client/src/components/excel/__tests__/ExportSettingsModal.test.tsx`, `QLHK-Client/src/components/excel/__tests__/ImportPreviewModal.test.tsx`, `QLHK-Client/src/components/households/__tests__/AgeFilterPopover.test.tsx`, `QLHK-Client/src/components/households/__tests__/CitizenModal.test.tsx`, `QLHK-Client/src/components/households/__tests__/HouseholdTable.test.tsx`
  - Role Focus: Preserving external behavior, dead-code elimination, test suite cleanliness
  - Reference Proof: Static TS6133 0 external callers; Dynamic verified `PROVEN_DEAD`
  - Diff Budget: <= 200 gross LOC (modified/added), <= 25 files outside target directories
  - Verification: `cd QLHK-Client && npm test -- src/components/analytics/__tests__/AnalyticsDashboard.test.tsx src/components/common/__tests__/CustomSelect.test.tsx && cd QLHK-Client && npx tsc --noEmit`
  - Equivalence Check: API Surface unchanged vs Step 0 snapshot; scoped tests pass
  - Evidence: BEFORE `<pass summary>` / AFTER `<pass summary>`

- [ ] Step 8: Full Suite Verification, Equivalence & Zero-Regression Gate
  - Full Test Suite: `cd QLHK-Client && npm test` (162 passing, zero new failures vs baseline)
  - Typecheck: `cd QLHK-Client && npx tsc --noEmit` (0 new errors vs baseline)
  - API Surface Check: Unchanged vs Step 0 snapshot
  - Ignored Files Check: Preserved (0 missing baseline ignored files via comm -23)
  - Clean Working Tree & No Orphan Patches: Verified (`test -z "$(git status --porcelain)" && test -z "$(ls -A .git/roadmap-stash/qlhk-client-clean-20261019-*.patch 2>/dev/null)"`)

## Deferred / Needs Human Decision
<!-- Append `Step K | Finding ID | Reason Code | exact blocker or decision needed | files:lines` for every [~] step -->

## Finding Closure Mapping
<!-- Populate at Step 8: `CLN-001 -> <commit_hash> (Step 1)`, etc. -->

## Project Gotchas & Learned Invariants
<!-- Append verified gotchas here when encountering subtle bugs -->
```

7. Commit initial tracker: `git add docs/plans/qlhk-client/qlhk-client-clean-20261019.task.md && git commit -m "chore(clean): init qlhk-client-clean-20261019.task.md"`.
8. Verify clean tree: `test -z "$(git status --porcelain)"`.
9. Anchor Context (Tier 1): Read `docs/plans/qlhk-client/qlhk-client-clean-20261019.task.md`, `.agents/frontend-developer.md` (if present), and the prompt header (`docs/plans/qlhk-client/qlhk-client-clean-20261019.clean.md`). Emit log: `[Context Anchored]: docs/plans/qlhk-client/qlhk-client-clean-20261019.task.md (Pending), frontend-developer.md (invariants), clean plan (qlhk-client-clean-20261019)`.

---

### STEP 1: REMOVE DEAD LATENCY STATE AND FILE-SCOPE CONSTANTS IN APPCONTEXT [CLN-001]
- START STEP:
  + Update `docs/plans/qlhk-client/qlhk-client-clean-20261019.task.md`: Mark Step 1 as `[/]` (In Progress) and review `## Project Gotchas & Learned Invariants` (if executing a deferred `Step 1.b`, apply `.git/roadmap-stash/qlhk-client-clean-20261019-1.b.patch` via `git apply`).
- FINDING BRIEF (embedded; authoritative):
  [BEGIN FINDING DATA BLOCK: CLN-001]
  + ID / Class / Confidence: CLN-001 / CL-01 / PROVEN_DEAD
  + Root Cause Key: CL-01:QLHK-Client/src/AppContext.tsx:dead-latency-state-and-constants
  + Location: QLHK-Client/src/AppContext.tsx:66-67,96 | Target Symbol / File: QLHK-Client/src/AppContext.tsx
  + Code / File Excerpt (`<= 10 lines`):
    ```typescript
    let emaLatency: number | null = null;
    const EMA_ALPHA = 0.3; // He so lam muot: 0.3 = phan ung vua phai, loai spike
    // ...
    const [latency, setLatency] = useState<number | null>(null);
    ```
  + Reference Proof (Static + Dynamic):
    - Static: `tsc --noUnusedLocals --noUnusedParameters` emits TS6133 for `emaLatency`, `EMA_ALPHA`, and `setLatency`.
    - Dynamic Checklist: No reflection, no dynamic property access. The variable `latency` in context value remains available as state.
    - Classification: `PROVEN_DEAD`
  + Before State: Tracked unused module-level variables `emaLatency` and `EMA_ALPHA`, plus unused `setLatency` state setter in `AppContext.tsx`.
  + After Expected State: Unused declarations removed; `const [latency] = useState<number | null>(null);` maintained; zero compiler warnings under `noUnusedLocals`.
  + Clean Intent: Remove dead latency tracking constants and unused setter in `AppContext.tsx`.
  + Strategy Rows: CL-01 (see CLEAN STRATEGIES above)
  [END FINDING DATA BLOCK: CLN-001]
- PRE-REQUISITE READS (Tier 2 slice; skip file read if already anchored in active session):
  + Source: `QLHK-Client/src/AppContext.tsx` (around lines 60-105)
  + Role Focus: Preserving external behavior, dead-code elimination, caller-callee blast radius verification
- GRAPH-MAP CHECK (Omit if isolated change):
  + Command: `graft callers "emaLatency"` -> confirms 0 external callers.
- RE-VALIDATION GATE (Invariant 10):
  + Confirm the candidate still exists at `Location`. Re-check Reference Proof. Route outcomes: already removed -> `[-] ALREADY_FIXED`/`STALE`; live external references exist -> `[-] FINDING_INVALID`; public contract change -> `[~] NEEDS_DECISION`; human-only category -> `[~] REQUIRES_HUMAN`. For `[-]`/`[~]`: update `docs/plans/qlhk-client/qlhk-client-clean-20261019.task.md`, run `git add docs/plans/qlhk-client/qlhk-client-clean-20261019.task.md && git commit -m "chore(clean): skip step 1 (<reason>) [CLN-001]"`, verify clean tree, and proceed to next step.
- BEFORE VERIFICATION:
  + Run scoped tests and static check on unchanged code: `cd QLHK-Client && npm test -- tests/e2e/workflow.test.ts && cd QLHK-Client && npx tsc --noEmit` -> MUST PASS. Record as `BEFORE`.
- ACTIONS:
  1. In `QLHK-Client/src/AppContext.tsx:66-67`, delete declarations `let emaLatency: number | null = null;` and `const EMA_ALPHA = 0.3;`.
  2. In `QLHK-Client/src/AppContext.tsx:96`, change `const [latency, setLatency] = useState<number | null>(null);` to `const [latency] = useState<number | null>(null);`.
- SCOPE REVIEW & DIFF BUDGET GATE:
  1. Review working tree: `git status --short`.
  2. Run **DIFF GATE** (Invariant 4) -> Set `STEP_TARGET_DIRS=""`, verify modified LOC <= 200 (estimated ~5 LOC), deleted files outside target dirs <= 25 (0 files deleted).
- AFTER VERIFICATION & EQUIVALENCE GATE:
  - Run scoped tests (zero new failures vs baseline): `cd QLHK-Client && npm test -- tests/e2e/workflow.test.ts` -> MUST PASS. Record as `AFTER`.
  - Run static check / typecheck (0 new errors vs baseline): `cd QLHK-Client && npx tsc --noEmit`.
  - Confirm API Surface Snapshot is unchanged.
- CHECKPOINT & PROGRESS UPDATE:
  - Update `docs/plans/qlhk-client/qlhk-client-clean-20261019.task.md`: Mark Step 1 as `[x]` Completed.
  - Commit: `git add -A && git commit -m "refactor(context): complete step 1 - remove dead latency state and constants [CLN-001]" -m "Cleanup class: CL-01" -m "Proof: TS6133 zero references confirmed by tsc" -m "BEFORE: scoped tests passed" -m "AFTER: scoped tests passed; API-SURFACE: unchanged"`
  - Verify clean: `test -z "$(git status --porcelain)"`.

---

### STEP 2: REMOVE UNUSED STATE SETTER SETLOADING IN HOUSEHOLD STORE [CLN-002]
- START STEP:
  + Update `docs/plans/qlhk-client/qlhk-client-clean-20261019.task.md`: Mark Step 2 as `[/]` (In Progress) and review `## Project Gotchas & Learned Invariants` (if executing a deferred `Step 2.b`, apply `.git/roadmap-stash/qlhk-client-clean-20261019-2.b.patch` via `git apply`).
- FINDING BRIEF (embedded; authoritative):
  [BEGIN FINDING DATA BLOCK: CLN-002]
  + ID / Class / Confidence: CLN-002 / CL-01 / PROVEN_DEAD
  + Root Cause Key: CL-01:QLHK-Client/src/store/householdStore.ts:unused-setLoading-setter
  + Location: QLHK-Client/src/store/householdStore.ts:42 | Target Symbol / File: QLHK-Client/src/store/householdStore.ts
  + Code / File Excerpt (`<= 10 lines`):
    ```typescript
    const [loading, setLoading] = useState<boolean>(false);
    ```
  + Reference Proof (Static + Dynamic):
    - Static: `tsc --noUnusedLocals --noUnusedParameters` emits TS6133 for `setLoading`.
    - Dynamic Checklist: `loading` state is initialized to false; `setLoading` is never invoked in internal methods.
    - Classification: `PROVEN_DEAD`
  + Before State: Unused state setter `setLoading` in `src/store/householdStore.ts`.
  + After Expected State: Unused setter removed via `const [loading] = useState<boolean>(false);`.
  + Clean Intent: Clean up unused `setLoading` setter in `householdStore.ts`.
  + Strategy Rows: CL-01 (see CLEAN STRATEGIES above)
  [END FINDING DATA BLOCK: CLN-002]
- PRE-REQUISITE READS (Tier 2 slice; skip file read if already anchored in active session):
  + Source: `QLHK-Client/src/store/householdStore.ts` (around lines 35-50)
  + Role Focus: Preserving external behavior, dead-code elimination, caller-callee blast radius verification
- GRAPH-MAP CHECK (Omit if isolated change):
  + Command: `graft callers "setLoading"` -> confirms local store scope.
- RE-VALIDATION GATE (Invariant 10):
  + Confirm `setLoading` is not accessed in `householdStore.ts`. Route outcomes: already removed -> `[-] ALREADY_FIXED`; live external references exist -> `[-] FINDING_INVALID`. For `[-]`/`[~]`: update tracker, commit skip message, verify clean tree, and proceed.
- BEFORE VERIFICATION:
  + Run scoped tests and static check on unchanged code: `cd QLHK-Client && npm test -- src/api/__tests__/householdApi.test.ts && cd QLHK-Client && npx tsc --noEmit` -> MUST PASS. Record as `BEFORE`.
- ACTIONS:
  1. In `QLHK-Client/src/store/householdStore.ts:42`, change `const [loading, setLoading] = useState<boolean>(false);` to `const [loading] = useState<boolean>(false);`.
- SCOPE REVIEW & DIFF BUDGET GATE:
  1. Review working tree: `git status --short`.
  2. Run **DIFF GATE** (Invariant 4) -> Set `STEP_TARGET_DIRS=""`, verify modified LOC <= 200 (estimated ~2 LOC), deleted files outside target dirs <= 25 (0 files deleted).
- AFTER VERIFICATION & EQUIVALENCE GATE:
  - Run scoped tests (zero new failures vs baseline): `cd QLHK-Client && npm test -- src/api/__tests__/householdApi.test.ts` -> MUST PASS. Record as `AFTER`.
  - Run static check / typecheck (0 new errors vs baseline): `cd QLHK-Client && npx tsc --noEmit`.
  - Confirm API Surface Snapshot is unchanged.
- CHECKPOINT & PROGRESS UPDATE:
  - Update `docs/plans/qlhk-client/qlhk-client-clean-20261019.task.md`: Mark Step 2 as `[x]` Completed.
  - Commit: `git add -A && git commit -m "refactor(store): complete step 2 - remove unused setLoading in householdStore [CLN-002]" -m "Cleanup class: CL-01" -m "Proof: TS6133 zero references confirmed by tsc" -m "BEFORE: scoped tests passed" -m "AFTER: scoped tests passed; API-SURFACE: unchanged"`
  - Verify clean: `test -z "$(git status --porcelain)"`.

---

### STEP 3: REMOVE UNUSED ICONS AND DEAD STATE IN ANALYTICSDASHBOARD [CLN-003]
- START STEP:
  + Update `docs/plans/qlhk-client/qlhk-client-clean-20261019.task.md`: Mark Step 3 as `[/]` (In Progress) and review `## Project Gotchas & Learned Invariants` (if executing a deferred `Step 3.b`, apply `.git/roadmap-stash/qlhk-client-clean-20261019-3.b.patch` via `git apply`).
- FINDING BRIEF (embedded; authoritative):
  [BEGIN FINDING DATA BLOCK: CLN-003]
  + ID / Class / Confidence: CLN-003 / CL-01 / PROVEN_DEAD
  + Root Cause Key: CL-01:QLHK-Client/src/components/analytics/AnalyticsDashboard.tsx:unused-icons-and-state
  + Location: QLHK-Client/src/components/analytics/AnalyticsDashboard.tsx:4, 7, 8, 11, 13, 55 | Target Symbol / File: QLHK-Client/src/components/analytics/AnalyticsDashboard.tsx
  + Code / File Excerpt (`<= 10 lines`):
    ```typescript
    Briefcase,
    GraduationCap,
    HeartHandshake,
    UserCheck,
    Users2,
    // ...
    const [refreshing, setRefreshing] = useState(false);
    ```
  + Reference Proof (Static + Dynamic):
    - Static: `tsc --noUnusedLocals --noUnusedParameters` emits TS6133 for `Briefcase`, `GraduationCap`, `HeartHandshake`, `UserCheck`, `Users2`, and `refreshing`.
    - Dynamic Checklist: Icons are not used in JSX templates. `refreshing` is assigned in `setRefreshing` calls but never read in render or conditions.
    - Classification: `PROVEN_DEAD`
  + Before State: 5 unused icon imports and dead state `refreshing` in `AnalyticsDashboard.tsx`.
  + After Expected State: Unused icon imports removed; dead state `refreshing` and its write-only assignments removed; UI/JSX unchanged.
  + Clean Intent: Clean up unused icon imports and write-only `refreshing` state in `AnalyticsDashboard.tsx`.
  + Strategy Rows: CL-01 (see CLEAN STRATEGIES above)
  [END FINDING DATA BLOCK: CLN-003]
- PRE-REQUISITE READS (Tier 2 slice; skip file read if already anchored in active session):
  + Source: `QLHK-Client/src/components/analytics/AnalyticsDashboard.tsx` (lines 1-70)
  + Role Focus: Preserving external behavior, dead-code elimination, caller-callee blast radius verification
- GRAPH-MAP CHECK (Omit if isolated change):
  + Command: `graft callers "AnalyticsDashboard"` -> verifies component callers.
- RE-VALIDATION GATE (Invariant 10):
  + Confirm `Briefcase`, `GraduationCap`, `HeartHandshake`, `UserCheck`, `Users2`, and `refreshing` are unused in `AnalyticsDashboard.tsx`.
- BEFORE VERIFICATION:
  + Run scoped tests and static check on unchanged code: `cd QLHK-Client && npm test -- src/components/analytics/__tests__/AnalyticsDashboard.test.tsx && cd QLHK-Client && npx tsc --noEmit` -> MUST PASS. Record as `BEFORE`.
- ACTIONS:
  1. In `QLHK-Client/src/components/analytics/AnalyticsDashboard.tsx:1-25`, remove unused imports `Briefcase`, `GraduationCap`, `HeartHandshake`, `UserCheck`, and `Users2` from `"lucide-react"`.
  2. In `QLHK-Client/src/components/analytics/AnalyticsDashboard.tsx:55`, remove `const [refreshing, setRefreshing] = useState(false);`.
  3. Remove any write-only calls `setRefreshing(true)` and `setRefreshing(false)` within handlers (lines ~75-90).
- SCOPE REVIEW & DIFF BUDGET GATE:
  1. Review working tree: `git status --short`.
  2. Run **DIFF GATE** (Invariant 4) -> Set `STEP_TARGET_DIRS=""`, verify modified LOC <= 200 (estimated ~15 LOC), deleted files outside target dirs <= 25 (0 files deleted).
- AFTER VERIFICATION & EQUIVALENCE GATE:
  - Run scoped tests (zero new failures vs baseline): `cd QLHK-Client && npm test -- src/components/analytics/__tests__/AnalyticsDashboard.test.tsx` -> MUST PASS. Record as `AFTER`.
  - Run static check / typecheck (0 new errors vs baseline): `cd QLHK-Client && npx tsc --noEmit`.
  - Confirm API Surface Snapshot is unchanged.
- CHECKPOINT & PROGRESS UPDATE:
  - Update `docs/plans/qlhk-client/qlhk-client-clean-20261019.task.md`: Mark Step 3 as `[x]` Completed.
  - Commit: `git add -A && git commit -m "refactor(analytics): complete step 3 - clean unused icons and state in AnalyticsDashboard [CLN-003]" -m "Cleanup class: CL-01" -m "Proof: TS6133 zero references confirmed by tsc" -m "BEFORE: scoped tests passed" -m "AFTER: scoped tests passed; API-SURFACE: unchanged"`
  - Verify clean: `test -z "$(git status --porcelain)"`.

---

### STEP 4: REMOVE UNUSED ICONS, DEAD HOOK AND STATE SETTER IN AUDITLOGVIEW [CLN-004]
- START STEP:
  + Update `docs/plans/qlhk-client/qlhk-client-clean-20261019.task.md`: Mark Step 4 as `[/]` (In Progress) and review `## Project Gotchas & Learned Invariants` (if executing a deferred `Step 4.b`, apply `.git/roadmap-stash/qlhk-client-clean-20261019-4.b.patch` via `git apply`).
- FINDING BRIEF (embedded; authoritative):
  [BEGIN FINDING DATA BLOCK: CLN-004]
  + ID / Class / Confidence: CLN-004 / CL-01 / PROVEN_DEAD
  + Root Cause Key: CL-01:QLHK-Client/src/components/audit/AuditLogView.tsx:unused-imports-and-state
  + Location: QLHK-Client/src/components/audit/AuditLogView.tsx:4-6, 22, 118 | Target Symbol / File: QLHK-Client/src/components/audit/AuditLogView.tsx
  + Code / File Excerpt (`<= 10 lines`):
    ```typescript
    ArrowRight,
    ChevronLeft,
    ChevronRight,
    // ...
    import { useCallback, useEffect, useMemo, useState } from "react";
    // ...
    const [limit, setLimit] = useState(25);
    ```
  + Reference Proof (Static + Dynamic):
    - Static: `tsc --noUnusedLocals --noUnusedParameters` emits TS6133 for `ArrowRight`, `ChevronLeft`, `ChevronRight`, `useMemo`, `setLimit`.
    - Dynamic Checklist: Pagination is handled via `TablePagination` component; icons and `useMemo` are unreferenced in component scope.
    - Classification: `PROVEN_DEAD`
  + Before State: Unused icon imports, unreferenced `useMemo` hook, and unused `setLimit` setter in `AuditLogView.tsx`.
  + After Expected State: Unused symbols removed; `const [limit] = useState(25);` maintained; 0 compiler warnings.
  + Clean Intent: Clean up unused imports and state setter in `AuditLogView.tsx`.
  + Strategy Rows: CL-01 (see CLEAN STRATEGIES above)
  [END FINDING DATA BLOCK: CLN-004]
- PRE-REQUISITE READS (Tier 2 slice; skip file read if already anchored in active session):
  + Source: `QLHK-Client/src/components/audit/AuditLogView.tsx` (lines 1-40, 110-130)
  + Role Focus: Preserving external behavior, dead-code elimination, caller-callee blast radius verification
- GRAPH-MAP CHECK (Omit if isolated change):
  + Command: `graft callers "AuditLogView"` -> verifies component callers.
- RE-VALIDATION GATE (Invariant 10):
  + Confirm `ArrowRight`, `ChevronLeft`, `ChevronRight`, `useMemo`, and `setLimit` are unreferenced in `AuditLogView.tsx`.
- BEFORE VERIFICATION:
  + Run scoped tests and static check on unchanged code: `cd QLHK-Client && npm test -- tests/e2e/regressionFlows.test.ts && cd QLHK-Client && npx tsc --noEmit` -> MUST PASS. Record as `BEFORE`.
- ACTIONS:
  1. In `QLHK-Client/src/components/audit/AuditLogView.tsx:1-20`, remove `ArrowRight`, `ChevronLeft`, and `ChevronRight` from `"lucide-react"` import.
  2. In `QLHK-Client/src/components/audit/AuditLogView.tsx:22`, remove `useMemo` from `"react"` import.
  3. In `QLHK-Client/src/components/audit/AuditLogView.tsx:118`, change `const [limit, setLimit] = useState(25);` to `const [limit] = useState(25);`.
- SCOPE REVIEW & DIFF BUDGET GATE:
  1. Review working tree: `git status --short`.
  2. Run **DIFF GATE** (Invariant 4) -> Set `STEP_TARGET_DIRS=""`, verify modified LOC <= 200 (estimated ~8 LOC), deleted files outside target dirs <= 25 (0 files deleted).
- AFTER VERIFICATION & EQUIVALENCE GATE:
  - Run scoped tests (zero new failures vs baseline): `cd QLHK-Client && npm test -- tests/e2e/regressionFlows.test.ts` -> MUST PASS. Record as `AFTER`.
  - Run static check / typecheck (0 new errors vs baseline): `cd QLHK-Client && npx tsc --noEmit`.
  - Confirm API Surface Snapshot is unchanged.
- CHECKPOINT & PROGRESS UPDATE:
  - Update `docs/plans/qlhk-client/qlhk-client-clean-20261019.task.md`: Mark Step 4 as `[x]` Completed.
  - Commit: `git add -A && git commit -m "refactor(audit): complete step 4 - clean unused icons and state in AuditLogView [CLN-004]" -m "Cleanup class: CL-01" -m "Proof: TS6133 zero references confirmed by tsc" -m "BEFORE: scoped tests passed" -m "AFTER: scoped tests passed; API-SURFACE: unchanged"`
  - Verify clean: `test -z "$(git status --porcelain)"`.

---

### STEP 5: REMOVE UNUSED IMPORTS AND DEAD LOCAL IN COMMON, LAYOUT, AND SETTINGS COMPONENTS [CLN-005]
- START STEP:
  + Update `docs/plans/qlhk-client/qlhk-client-clean-20261019.task.md`: Mark Step 5 as `[/]` (In Progress) and review `## Project Gotchas & Learned Invariants` (if executing a deferred `Step 5.b`, apply `.git/roadmap-stash/qlhk-client-clean-20261019-5.b.patch` via `git apply`).
- FINDING BRIEF (embedded; authoritative):
  [BEGIN FINDING DATA BLOCK: CLN-005]
  + ID / Class / Confidence: CLN-005 / CL-01 / PROVEN_DEAD
  + Root Cause Key: CL-01:QLHK-Client/src/components:common-layout-settings-unused
  + Location: QLHK-Client/src/components/common/CustomSelect.tsx:185, statStyles.tsx:18, Layout/Header.tsx:2, settings/ProfileCard.tsx:11 | Target Symbol / File: CustomSelect.tsx, statStyles.tsx, Header.tsx, ProfileCard.tsx
  + Code / File Excerpt (`<= 10 lines`):
    ```typescript
    // CustomSelect.tsx:185
    const isSelectedNonEmpty = selectedValues.length > 0;
    // statStyles.tsx:18
    import React, { createContext, useContext } from "react";
    // Header.tsx:2
    import { Activity, LogOut, MapPin, Moon, Shield, Sun, User as UserIcon, Users, Wifi, WifiOff, ZoomIn, ZoomOut } from "lucide-react";
    // ProfileCard.tsx:11
    import { Building2, KeyRound, LogOut, Mail, Phone, Shield, User as UserIcon } from "lucide-react";
    ```
  + Reference Proof (Static + Dynamic):
    - Static: `tsc --noUnusedLocals --noUnusedParameters` emits TS6133 for `isSelectedNonEmpty`, `createContext`, `useContext`, `Activity`, and `UserIcon`.
    - Dynamic Checklist: Zero references in JSX, hooks, or styles across the repository.
    - Classification: `PROVEN_DEAD`
  + Before State: Dead local variable `isSelectedNonEmpty` in `CustomSelect.tsx`; unused React context functions in `statStyles.tsx`; unused `Activity` in `Header.tsx`; unused `User as UserIcon` in `ProfileCard.tsx`.
  + After Expected State: Unused symbols and dead local variable removed; clean exports and types preserved.
  + Clean Intent: Clean up unused imports and dead local variable across common, layout, and settings components.
  + Strategy Rows: CL-01 (see CLEAN STRATEGIES above)
  [END FINDING DATA BLOCK: CLN-005]
- PRE-REQUISITE READS (Tier 2 slice; skip file read if already anchored in active session):
  + Source: `CustomSelect.tsx`, `statStyles.tsx`, `Header.tsx`, `ProfileCard.tsx`
  + Role Focus: Preserving external behavior, dead-code elimination, caller-callee blast radius verification
- GRAPH-MAP CHECK (Omit if isolated change):
  + Command: `graft callers "CustomSelect"` -> verifies component callers.
- RE-VALIDATION GATE (Invariant 10):
  + Confirm `isSelectedNonEmpty`, `createContext`, `useContext`, `Activity`, and `UserIcon` are unreferenced in their respective files.
- BEFORE VERIFICATION:
  + Run scoped tests and static check on unchanged code: `cd QLHK-Client && npm test -- src/components/common/__tests__/CustomSelect.test.tsx && cd QLHK-Client && npx tsc --noEmit` -> MUST PASS. Record as `BEFORE`.
- ACTIONS:
  1. In `QLHK-Client/src/components/common/CustomSelect.tsx:185`, delete `const isSelectedNonEmpty = selectedValues.length > 0;`.
  2. In `QLHK-Client/src/components/common/statStyles.tsx:18`, change `import React, { createContext, useContext } from "react";` to `import React from "react";`.
  3. In `QLHK-Client/src/components/Layout/Header.tsx:2`, remove `Activity` from `"lucide-react"` import.
  4. In `QLHK-Client/src/components/settings/ProfileCard.tsx:11`, remove `User as UserIcon` from `"lucide-react"` import.
- SCOPE REVIEW & DIFF BUDGET GATE:
  1. Review working tree: `git status --short`.
  2. Run **DIFF GATE** (Invariant 4) -> Set `STEP_TARGET_DIRS=""`, verify modified LOC <= 200 (estimated ~10 LOC across 4 files), deleted files outside target dirs <= 25 (0 files deleted).
- AFTER VERIFICATION & EQUIVALENCE GATE:
  - Run scoped tests (zero new failures vs baseline): `cd QLHK-Client && npm test -- src/components/common/__tests__/CustomSelect.test.tsx` -> MUST PASS. Record as `AFTER`.
  - Run static check / typecheck (0 new errors vs baseline): `cd QLHK-Client && npx tsc --noEmit`.
  - Confirm API Surface Snapshot is unchanged.
- CHECKPOINT & PROGRESS UPDATE:
  - Update `docs/plans/qlhk-client/qlhk-client-clean-20261019.task.md`: Mark Step 5 as `[x]` Completed.
  - Commit: `git add -A && git commit -m "refactor(components): complete step 5 - clean unused imports in common, layout, and settings [CLN-005]" -m "Cleanup class: CL-01" -m "Proof: TS6133 zero references confirmed by tsc" -m "BEFORE: scoped tests passed" -m "AFTER: scoped tests passed; API-SURFACE: unchanged"`
  - Verify clean: `test -z "$(git status --porcelain)"`.

---

### STEP 6: REMOVE UNUSED IMPORTS AND DEAD LOCAL VARIABLE IN PAGE COMPONENTS [CLN-006]
- START STEP:
  + Update `docs/plans/qlhk-client/qlhk-client-clean-20261019.task.md`: Mark Step 6 as `[/]` (In Progress) and review `## Project Gotchas & Learned Invariants` (if executing a deferred `Step 6.b`, apply `.git/roadmap-stash/qlhk-client-clean-20261019-6.b.patch` via `git apply`).
- FINDING BRIEF (embedded; authoritative):
  [BEGIN FINDING DATA BLOCK: CLN-006]
  + ID / Class / Confidence: CLN-006 / CL-01 / PROVEN_DEAD
  + Root Cause Key: CL-01:QLHK-Client/src/pages:unused-page-symbols
  + Location: QLHK-Client/src/pages/ExcelPage.tsx:13, HouseholdsPage.tsx:6, SettingsPage.tsx:7,10,11,14,262, VillagesPage.tsx:27 | Target Symbol / File: ExcelPage.tsx, HouseholdsPage.tsx, SettingsPage.tsx, VillagesPage.tsx
  + Code / File Excerpt (`<= 10 lines`):
    ```typescript
    // ExcelPage.tsx:13
    import { householdApi } from "../api/householdApi";
    // HouseholdsPage.tsx:6
    import { ArrowLeft, Download, FileSpreadsheet, Plus, Trash2, Users } from "lucide-react";
    // SettingsPage.tsx:7, 10, 11, 14, 262
    Home, LogOut, MapPin, Shield,
    const currentVillageName = villages.find((v) => v.id === user?.village_id)?.name || "Chua phan cong";
    // VillagesPage.tsx:27
    import { type User, Village } from "../types";
    ```
  + Reference Proof (Static + Dynamic):
    - Static: `tsc --noUnusedLocals --noUnusedParameters` emits TS6133 across all 4 files.
    - Dynamic Checklist: `householdApi` is never called in `ExcelPage.tsx`; `currentVillageName` is never rendered in `SettingsPage.tsx`; `Village` in `VillagesPage.tsx` is only used as a TypeScript type annotation.
    - Classification: `PROVEN_DEAD`
  + Before State: Unused `householdApi` in `ExcelPage.tsx`; unused `Trash2` in `HouseholdsPage.tsx`; unused icons and dead local `currentVillageName` in `SettingsPage.tsx`; unused value import `Village` in `VillagesPage.tsx`.
  + After Expected State: Unused imports and dead local variable removed; `import type { User, Village } from "../types";` in `VillagesPage.tsx`.
  + Clean Intent: Clean up unused imports and dead local variable across `ExcelPage.tsx`, `HouseholdsPage.tsx`, `SettingsPage.tsx`, and `VillagesPage.tsx`.
  + Strategy Rows: CL-01 (see CLEAN STRATEGIES above)
  [END FINDING DATA BLOCK: CLN-006]
- PRE-REQUISITE READS (Tier 2 slice; skip file read if already anchored in active session):
  + Source: `ExcelPage.tsx`, `HouseholdsPage.tsx`, `SettingsPage.tsx`, `VillagesPage.tsx`
  + Role Focus: Preserving external behavior, dead-code elimination, caller-callee blast radius verification
- GRAPH-MAP CHECK (Omit if isolated change):
  + Command: `graft callers "SettingsPage"` -> verifies page callers.
- RE-VALIDATION GATE (Invariant 10):
  + Confirm `householdApi` is not called in `ExcelPage.tsx`. Confirm `currentVillageName` is unread in `SettingsPage.tsx`.
- BEFORE VERIFICATION:
  + Run scoped tests and static check on unchanged code: `cd QLHK-Client && npm test -- tests/e2e/regressionFlows.test.ts && cd QLHK-Client && npx tsc --noEmit` -> MUST PASS. Record as `BEFORE`.
- ACTIONS:
  1. In `QLHK-Client/src/pages/ExcelPage.tsx:13`, remove `import { householdApi } from "../api/householdApi";`.
  2. In `QLHK-Client/src/pages/HouseholdsPage.tsx:6`, remove `Trash2` from `"lucide-react"` import.
  3. In `QLHK-Client/src/pages/SettingsPage.tsx:7, 10, 11, 14`, remove `Home`, `LogOut`, `MapPin`, and `Shield` from `"lucide-react"` import.
  4. In `QLHK-Client/src/pages/SettingsPage.tsx:262-266`, delete the declaration `const currentVillageName = villages.find((v) => v.id === user?.village_id)?.name || "Chưa phân công";`.
  5. In `QLHK-Client/src/pages/VillagesPage.tsx:27`, change `import { type User, Village } from "../types";` to `import type { User, Village } from "../types";`.
- SCOPE REVIEW & DIFF BUDGET GATE:
  1. Review working tree: `git status --short`.
  2. Run **DIFF GATE** (Invariant 4) -> Set `STEP_TARGET_DIRS=""`, verify modified LOC <= 200 (estimated ~12 LOC across 4 files), deleted files outside target dirs <= 25 (0 files deleted).
- AFTER VERIFICATION & EQUIVALENCE GATE:
  - Run scoped tests (zero new failures vs baseline): `cd QLHK-Client && npm test -- tests/e2e/regressionFlows.test.ts` -> MUST PASS. Record as `AFTER`.
  - Run static check / typecheck (0 new errors vs baseline): `cd QLHK-Client && npx tsc --noEmit`.
  - Confirm API Surface Snapshot is unchanged.
- CHECKPOINT & PROGRESS UPDATE:
  - Update `docs/plans/qlhk-client/qlhk-client-clean-20261019.task.md`: Mark Step 6 as `[x]` Completed.
  - Commit: `git add -A && git commit -m "refactor(pages): complete step 6 - clean unused imports in page components [CLN-006]" -m "Cleanup class: CL-01" -m "Proof: TS6133 zero references confirmed by tsc" -m "BEFORE: scoped tests passed" -m "AFTER: scoped tests passed; API-SURFACE: unchanged"`
  - Verify clean: `test -z "$(git status --porcelain)"`.

---

### STEP 7: REMOVE REDUNDANT REACT AND FIREEVENT IMPORTS IN TEST SUITES [CLN-007]
- START STEP:
  + Update `docs/plans/qlhk-client/qlhk-client-clean-20261019.task.md`: Mark Step 7 as `[/]` (In Progress) and review `## Project Gotchas & Learned Invariants` (if executing a deferred `Step 7.b`, apply `.git/roadmap-stash/qlhk-client-clean-20261019-7.b.patch` via `git apply`).
- FINDING BRIEF (embedded; authoritative):
  [BEGIN FINDING DATA BLOCK: CLN-007]
  + ID / Class / Confidence: CLN-007 / CL-01 / PROVEN_DEAD
  + Root Cause Key: CL-01:QLHK-Client/tests:redundant-test-imports
  + Location: QLHK-Client/src/components/**/__tests__/*.test.tsx | Target Symbol / File: 7 test files in `src/components/**/__tests__/`
  + Code / File Excerpt (`<= 10 lines`):
    ```typescript
    // AnalyticsDashboard.test.tsx:1-2
    import { fireEvent, render, screen, waitFor } from "@testing-library/react";
    import React from "react";
    // CustomSelect.test.tsx:2, ExportSettingsModal.test.tsx:2, ImportPreviewModal.test.tsx:2,
    // AgeFilterPopover.test.tsx:2, CitizenModal.test.tsx:2, HouseholdTable.test.tsx:2
    import React from "react";
    ```
  + Reference Proof (Static + Dynamic):
    - Static: `tsc --noUnusedLocals --noUnusedParameters` emits TS6133 for `fireEvent` in `AnalyticsDashboard.test.tsx` and `React` in all 7 test files.
    - Dynamic Checklist: Vite/Vitest uses automatic JSX transform (`jsx: 'automatic'`). Default `React` import is unnecessary.
    - Classification: `PROVEN_DEAD`
  + Before State: Redundant `fireEvent` in `AnalyticsDashboard.test.tsx` and unused `import React from "react";` across 7 test files.
  + After Expected State: Unused imports removed; test suite assertions and execution completely unchanged.
  + Clean Intent: Clean up redundant test imports across 7 test files.
  + Strategy Rows: CL-01 (see CLEAN STRATEGIES above)
  [END FINDING DATA BLOCK: CLN-007]
- PRE-REQUISITE READS (Tier 2 slice; skip file read if already anchored in active session):
  + Source: The 7 test files in `src/components/**/__tests__/`
  + Role Focus: Preserving external behavior, dead-code elimination, test suite cleanliness
- GRAPH-MAP CHECK (Omit if isolated change):
  + Command: `graft callers "describe"` -> verifies test runner scope.
- RE-VALIDATION GATE (Invariant 10):
  + Confirm `fireEvent` and `React` are unused in the 7 test files.
- BEFORE VERIFICATION:
  + Run scoped tests and static check on unchanged code: `cd QLHK-Client && npm test -- src/components/analytics/__tests__/AnalyticsDashboard.test.tsx src/components/common/__tests__/CustomSelect.test.tsx && cd QLHK-Client && npx tsc --noEmit` -> MUST PASS. Record as `BEFORE`.
- ACTIONS:
  1. In `QLHK-Client/src/components/analytics/__tests__/AnalyticsDashboard.test.tsx:1-2`, remove `fireEvent` from `@testing-library/react` and delete `import React from "react";`.
  2. In `QLHK-Client/src/components/common/__tests__/CustomSelect.test.tsx:2`, delete `import React from "react";`.
  3. In `QLHK-Client/src/components/excel/__tests__/ExportSettingsModal.test.tsx:2`, delete `import React from "react";`.
  4. In `QLHK-Client/src/components/excel/__tests__/ImportPreviewModal.test.tsx:2`, delete `import React from "react";`.
  5. In `QLHK-Client/src/components/households/__tests__/AgeFilterPopover.test.tsx:2`, delete `import React from "react";`.
  6. In `QLHK-Client/src/components/households/__tests__/CitizenModal.test.tsx:2`, delete `import React from "react";`.
  7. In `QLHK-Client/src/components/households/__tests__/HouseholdTable.test.tsx:2`, delete `import React from "react";`.
- SCOPE REVIEW & DIFF BUDGET GATE:
  1. Review working tree: `git status --short`.
  2. Run **DIFF GATE** (Invariant 4) -> Set `STEP_TARGET_DIRS=""`, verify modified LOC <= 200 (estimated ~10 LOC across 7 files), deleted files outside target dirs <= 25 (0 files deleted).
- AFTER VERIFICATION & EQUIVALENCE GATE:
  - Run scoped tests (zero new failures vs baseline): `cd QLHK-Client && npm test -- src/components/analytics/__tests__/AnalyticsDashboard.test.tsx src/components/common/__tests__/CustomSelect.test.tsx` -> MUST PASS. Record as `AFTER`.
  - Run static check / typecheck (0 new errors vs baseline): `cd QLHK-Client && npx tsc --noEmit`.
  - Confirm API Surface Snapshot is unchanged.
- CHECKPOINT & PROGRESS UPDATE:
  - Update `docs/plans/qlhk-client/qlhk-client-clean-20261019.task.md`: Mark Step 7 as `[x]` Completed.
  - Commit: `git add -A && git commit -m "refactor(tests): complete step 7 - clean redundant React imports in test suites [CLN-007]" -m "Cleanup class: CL-01" -m "Proof: TS6133 zero references confirmed by tsc" -m "BEFORE: scoped tests passed" -m "AFTER: scoped tests passed; API-SURFACE: unchanged"`
  - Verify clean: `test -z "$(git status --porcelain)"`.

---

### STEP 8: FULL SUITE VERIFICATION, EQUIVALENCE & ZERO-REGRESSION GATE
- START STEP:
  + Update `docs/plans/qlhk-client/qlhk-client-clean-20261019.task.md`: Mark Step 8 as `[/]` (In Progress).
- ACTIONS:
  1. Run Full Test Suite: `cd QLHK-Client && npm test` (162 passing, zero new failures vs baseline).
  2. Run Typecheck: `cd QLHK-Client && npx tsc --noEmit` (0 new errors vs baseline).
  3. Verify API Surface: Compare final public exports, route table, or type definitions against Step 0 snapshot; confirm 0 unintended contract changes.
  4. Verify Ignored & Untracked Files: Confirm zero baseline ignored files were lost (filtering transient build/test caches; preserving baseline for post-run reviewer audit):
      ```bash
      GIT_COMMON_DIR=$(git rev-parse --git-common-dir)
      git ls-files --others --ignored --exclude-standard --directory | sort > "$GIT_COMMON_DIR/roadmap-ignored-current.txt"
      MISSING_IGNORED=$(comm -23 "$GIT_COMMON_DIR/roadmap-ignored-baseline-qlhk-client-clean-20261019.txt" "$GIT_COMMON_DIR/roadmap-ignored-current.txt" \
        | grep -v -E "(^\s*$|(^|/)(\.cache|cache|coverage|tmp)/|\.pytest_cache|\.turbo)" | wc -l | awk '{print $1+0}')
      test "$MISSING_IGNORED" -eq 0
      rm -f "$GIT_COMMON_DIR/roadmap-ignored-current.txt"
      ```
  5. Review Working Tree & Orphan Patches: `git status --short` (`docs/plans/qlhk-client/qlhk-client-clean-20261019.task.md` changes expected; verify no temporary artifacts, untracked files, or leftover `.git/roadmap-stash/qlhk-client-clean-20261019-*.patch` files).
  6. Update `docs/plans/qlhk-client/qlhk-client-clean-20261019.task.md`: Mark Step 8 and all checklist items as `[x]` Completed, and record the `Finding ID -> commit hash` closure mapping under `## Finding Closure Mapping` in `docs/plans/qlhk-client/qlhk-client-clean-20261019.task.md` and in the final completion summary.
  7. Final Commit: `git add -A && git commit -m "chore(clean): complete qlhk-client-clean-20261019 verification gate"`.
  8. Final Clean & No-Orphan-Patch Verification: `test -z "$(git status --porcelain)" && test -z "$(ls -A .git/roadmap-stash/qlhk-client-clean-20261019-*.patch 2>/dev/null)"` (Must exit 0).
- POST-GATE COMPLETION & BRANCH HANDOFF:
  1. Remove `docs/plans/qlhk-client/qlhk-client-clean-20261019.task.md` in a final cleanup commit by default, AFTER copying the `## Deferred / Needs Human Decision` and closure tables into your completion summary:
     `git rm docs/plans/qlhk-client/qlhk-client-clean-20261019.task.md && git commit -m "chore(clean): remove qlhk-client-clean-20261019.task.md" && test -z "$(git status --porcelain)"`
  2. List any preserved circuit-breaker WIP branches (`git branch --list "failed/qlhk-client-clean-20261019/*"`), present completion summary, and ask the user how to proceed:
     - **Option 1**: Open a Pull Request from `clean/qlhk-client-clean-20261019` into `<BASE_BRANCH>`.
     - **Option 2**: Merge `clean/qlhk-client-clean-20261019` into `<BASE_BRANCH>` locally (`git switch "<BASE_BRANCH>" && git merge --no-ff "clean/qlhk-client-clean-20261019"`).
     - **Option 3**: Leave the branch `clean/qlhk-client-clean-20261019` as-is for manual inspection.
  3. Recommend an independent fresh-session review of the branch with the clean reviewer prompt.

---

### SESSION HANDOFF CHECKPOINT TEMPLATE (Output after every 4 steps reach a terminal status in a session, unless Step 8 just finished)

When 4 steps (`Step 0` excluded) reach `[x]`, `[~]`, or `[-]` in the current session (or when requested by the user), and `Step 8` is not yet complete, run `cd QLHK-Client && npm test`, ensure clean git status, output the block below (replacing `<STEPS_COMPLETED_IN_SESSION>` with the actual count), and **STOP immediately** (do not start the next step in this session):

````text
### 🔄 Session Handoff Checkpoint

Completed <STEPS_COMPLETED_IN_SESSION> step(s) in this session on branch `clean/qlhk-client-clean-20261019` (base branch: `<BASE_BRANCH>`). Full test suite verified.

To resume in a fresh session:
1. Read `docs/plans/qlhk-client/qlhk-client-clean-20261019.clean.md` (the committed original clean prompt containing all `STRICT INVARIANTS`, finding briefs, and step definitions) then continue — or paste the **ORIGINAL clean prompt** below as a fallback.
2. Append or send this resume block immediately after:

```text
Resume execution of the roadmap / clean remediation on branch `clean/qlhk-client-clean-20261019` (base branch: `<BASE_BRANCH>`). Read `docs/plans/qlhk-client/qlhk-client-clean-20261019.clean.md` (the committed original clean prompt) for all `STRICT INVARIANTS` and step definitions—or use the original clean prompt pasted above as a fallback.

CRITICAL: Do NOT re-execute STEP 0 or any step already marked `[x]`, `[~]`, or `[-]` in `docs/plans/qlhk-client/qlhk-client-clean-20261019.task.md`. The branch and tracker already exist—Invariant 1's `git switch -c` applies only to the initial fresh start.

Directives:
1. Switch to branch: `git switch clean/qlhk-client-clean-20261019`
2. Working tree check:
   - If clean (`test -z "$(git status --porcelain)"` exits 0), proceed to Directive 3.
   - If dirty, inspect `docs/plans/qlhk-client/qlhk-client-clean-20261019.task.md`:
     + If a step is marked `[/]` (In Progress), proceed to Directive 5 to evaluate WIP changes.
     + If dirty without an in-progress step, halt immediately and alert the user.
3. Context Anchoring (Tier 1): Read `docs/plans/qlhk-client/qlhk-client-clean-20261019.task.md` (progress, known failures, gotchas, deferred), the designated role file (`.agents/frontend-developer.md` if applicable), and the prompt header (`docs/plans/qlhk-client/qlhk-client-clean-20261019.clean.md`). Emit mandatory verification log: `[Context Anchored]: docs/plans/qlhk-client/qlhk-client-clean-20261019.task.md (<status>), frontend-developer.md (<invariants>), clean prompt (<goal>)`.
4. Inspect `git log -n 3 --oneline` to confirm the last committed checkpoint.
5. If Step K is marked `[/]` (In Progress) with uncommitted WIP, inspect existing changes via `git status --short` before continuing; re-run the step's RE-VALIDATION GATE and resume from the correct BEFORE/ACTIONS/VERIFICATION point.
6. If Step K is marked `[!]` (Blocked):
   - Review the failure reason logged in `docs/plans/qlhk-client/qlhk-client-clean-20261019.task.md`.
   - Await user guidance on the resolution strategy (or `skip` -> `[~]` `BLOCKED_BY_USER_SKIP`).
   - Upon guidance, update `docs/plans/qlhk-client/qlhk-client-clean-20261019.task.md` to mark Step K back to `[/]` (In Progress) and resume implementation from the clean Step K-1 commit.
7. Otherwise, proceed with the next pending `[ ]` step following the strict invariants and step definitions in the clean prompt pasted above.
```
````
`````
