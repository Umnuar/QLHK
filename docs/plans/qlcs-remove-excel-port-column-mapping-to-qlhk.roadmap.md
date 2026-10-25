`````text
[MANDATORY SYSTEM DIRECTIVE]:
You are executing a multi-step engineering task based on the verified plan at:
docs/plans/qlcs-remove-excel-port-column-mapping-to-qlhk.md

ENVIRONMENT REQUIREMENT:
All shell commands require a POSIX-compatible shell (Git Bash on Windows, WSL, Linux, or macOS).

STRICT INVARIANTS:
1. BRANCH & PRE-FLIGHT (Initial Start Only):
   - **Pre-Switch Detached-HEAD & Protected-Branch Guard**: Before creating `roadmap/qlcs-remove-excel-port-column-mapping-to-qlhk`, verify `HEAD` is not detached (`BASE_BRANCH=$(git branch --show-current)` and `test -n "$BASE_BRANCH"`; if empty/detached, halt immediately and ask the user to check out a named branch first). If `$BASE_BRANCH` is a protected branch (`main`, `master`, or `production`), ask the user whether to branch `roadmap/qlcs-remove-excel-port-column-mapping-to-qlhk` directly from `$BASE_BRANCH` (recording it as `Base Branch`) or switch to a feature/planning branch first.
   - Create and switch to isolated branch: `git switch -c roadmap/qlcs-remove-excel-port-column-mapping-to-qlhk`. If the branch already exists on a fresh start, halt immediately and ask the user whether to resume the existing branch or choose a new branch name. (When resuming via a Handoff Prompt, skip `STEP 0` and use `git switch roadmap/qlcs-remove-excel-port-column-mapping-to-qlhk`.)
   - Verify clean working tree: `test -z "$(git status --porcelain)"`.
   - Execute the baseline test command **twice** (`Run 1` and `Run 2`), record `Base Branch: <BASE_BRANCH>`, the passing count, and exact names of any tests failing in **either** run as "flaky/known failing" into `task.md`, and immediately commit `task.md`. Never build on an uncommitted dirty tree.
2. TWO-TIER READ CADENCE & CONTEXT ANCHORING:
   - **Tier 1 (Session / Task Initialization)**: At `STEP 0`, when resuming from a handoff, or after a `/compact` event, you MUST perform a one-time anchor read of: `docs/plans/qlcs-remove-excel-port-column-mapping-to-qlhk.task.md`, `.agents/frontend-developer.md` (if present in repo), and the plan header (`docs/plans/qlcs-remove-excel-port-column-mapping-to-qlhk.md`). Emit mandatory proof-of-read log before taking action:
     `[Context Anchored]: qlcs-remove-excel-port-column-mapping-to-qlhk.task.md (<status>), frontend-developer.md (<invariants>), plan.md (<goal>)`
   - **Tier 2 (In-Session Atomic Step K)**: NEVER re-read the entire `plan.md` or role file at each step. Rely on inlined instructions inside `STEP K` (or read ONLY the exact surgical slice `### Section K: ...`, `<= 30 lines`). Follow the embedded `Role Focus` invariants and only read code files strictly inside `Target Files`. Review `## Project Gotchas & Learned Invariants` in `docs/plans/qlcs-remove-excel-port-column-mapping-to-qlhk.task.md` before starting a step.
3. GRAPH-AWARE BLAST RADIUS:
   - When a step specifies a `GRAPH-MAP CHECK`, check if the tool (`graft`, `graphify`, `codegraph`) is installed before querying callers/callees. Fall back to native grep or LSP find-references if unavailable.
4. SCOPE HYGIENE & DIFF GATE (<= 200 GROSS LOC):
   - After implementing changes and BEFORE staging, run `git status --short`. Note that tracker modifications (`[/]`) in `docs/plans/qlcs-remove-excel-port-column-mapping-to-qlhk.task.md` are expected—never reset or delete the tracker. If out-of-scope files (`.env*`, scratch scripts, build artifacts) appear, reset (`git reset <file>`), delete, or add to `.gitignore`.
   - Run the **DIFF GATE** command to stage changes and verify gross diff size (added + deleted lines) <= 200 LOC per step, excluding lockfiles, migrations, fixtures, and task trackers (note that binary files output `-\t-\t<path>` in `git diff --numstat` and naturally count as `0 LOC` in `awk '{s+=$1+$2}'`):
     ```bash
     git add -A && git diff --cached --numstat -- . \
       ':(exclude)*.lock' ':(exclude)*lock.json' \
       ':(exclude,glob)**/migrations/**' ':(exclude,glob)**/fixtures/**' \
       ':(exclude)*task.md' \
       | awk '{s+=$1+$2} END{print (s?s:0) " LOC"}'
     ```
   - If > 200 gross LOC, unstage (`git reset`), split the step in `docs/plans/qlcs-remove-excel-port-column-mapping-to-qlhk.task.md` into `Step K.a` and `Step K.b` (without renumbering subsequent steps), and execute `Step K.a` first:
     1. Save the `Step K.b` changes to an isolated patch file inside `.git/` (so the working tree stays 100% clean):
        ```bash
        mkdir -p .git/roadmap-stash
        git diff -- <step_Kb_files> > ".git/roadmap-stash/qlcs-remove-excel-port-column-mapping-to-qlhk-K.b.patch"
        git checkout -- <step_Kb_files>
        git clean -fd -- <step_Kb_new_files>
        ```
        *(Or if `Step K.b` includes untracked files, stage only `Step K.b` files first and use `git diff --cached --binary > ".git/roadmap-stash/qlcs-remove-excel-port-column-mapping-to-qlhk-K.b.patch" && git reset --hard` while preserving `docs/plans/qlcs-remove-excel-port-column-mapping-to-qlhk.task.md`.)*
     2. Record `Deferred Patch: .git/roadmap-stash/qlcs-remove-excel-port-column-mapping-to-qlhk-K.b.patch` under `Step K.b` in `docs/plans/qlcs-remove-excel-port-column-mapping-to-qlhk.task.md`. Never commit `Step K.b` changes inside `Step K.a`.
     3. When `Step K.b` starts, apply the saved patch via `git apply ".git/roadmap-stash/qlcs-remove-excel-port-column-mapping-to-qlhk-K.b.patch"`, and immediately after committing `Step K.b`, delete the patch file via `rm -f ".git/roadmap-stash/qlcs-remove-excel-port-column-mapping-to-qlhk-K.b.patch"`. Each committed sub-step (`Step K.a`, `Step K.b`) counts as **1 step** toward the 4-step session handoff counter (Invariant 8).
5. ATOMIC COMMITS & COMMIT HOOKS:
   - After scoped tests pass, update `docs/plans/qlcs-remove-excel-port-column-mapping-to-qlhk.task.md` (`[x]` + any new gotchas) and commit using semantic types (`feat`, `fix`, `refactor`, `test`, `perf`, `chore`):
     `git add -A && git commit -m "<type>(roadmap): complete step K - <title>"`
   - Never use `--no-verify`; hook failures caused by the agent's own change are code attempts; infrastructure/hook-tool failures are not.
   - Verify working tree is 100% clean after commit (`test -z "$(git status --porcelain)"`).
6. SAFE CIRCUIT BREAKER ROLLBACK & UNBLOCKING:
   - **What Counts as an Attempt**: A single cycle of implementing/modifying code for the current step (or sub-step `K.a`/`K.b`) followed by a failing scoped test, failing per-step static/typecheck command, or a pre-commit hook failure caused by the agent's own code change. Transient infrastructure, port, network, or hook-tool runner errors do NOT count as code attempts.
   - **Pre-Retry Reset Rule (Before Attempt 2 and Attempt 3)**: Before starting each retry attempt (`Attempt 2` or `Attempt 3`), you MUST reset all tracked and untracked code changes back to the last committed checkpoint while preserving `docs/plans/qlcs-remove-excel-port-column-mapping-to-qlhk.task.md`:
     ```bash
     cp docs/plans/qlcs-remove-excel-port-column-mapping-to-qlhk.task.md ".git/roadmap-task-qlcs-remove-excel-port-column-mapping-to-qlhk.md.bak"
     git restore --staged . && git checkout -- . && git clean -fd -e docs/plans/qlcs-remove-excel-port-column-mapping-to-qlhk.task.md -e task.md
     mv ".git/roadmap-task-qlcs-remove-excel-port-column-mapping-to-qlhk.md.bak" docs/plans/qlcs-remove-excel-port-column-mapping-to-qlhk.task.md
     ```
   - **Counter Reset Rule**: The 3-attempt counter is scoped per step (or sub-step `K.a`/`K.b`) and resets to `0` when: (a) a step (or sub-step) passes verification and is committed (`[x]`), or (b) the user provides unblocking guidance after a `[!]` halt and the step is transitioned from `[!]` back to `[/]`.
   - If a step fails after 3 consecutive code attempts, preserve the 3rd attempt's WIP on a unique branch and restore `roadmap/qlcs-remove-excel-port-column-mapping-to-qlhk` cleanly:
     ```bash
     ATTEMPT_TS=$(date +%s)
     git switch -c "failed/qlcs-remove-excel-port-column-mapping-to-qlhk/step-K-attempt-${ATTEMPT_TS}"
     git add -A && git commit -m "wip: failed step K attempt after 3 tries"
     git switch "roadmap/qlcs-remove-excel-port-column-mapping-to-qlhk"
     # Update tracker to mark [!] and log failure reason, then commit on roadmap branch:
     git add docs/plans/qlcs-remove-excel-port-column-mapping-to-qlhk.task.md && git commit -m "chore(roadmap): mark step K blocked"
     ```
   - Halt and await user guidance. **Branch Retention Rule**: Never delete `failed/qlcs-remove-excel-port-column-mapping-to-qlhk/*` branches automatically; preserve them until the user explicitly confirms deletion after `STEP N` completes.
   - Unblocking procedure: Once user provides guidance, ensure you are on `roadmap/qlcs-remove-excel-port-column-mapping-to-qlhk`, change `[!]` back to `[/]` in `docs/plans/qlcs-remove-excel-port-column-mapping-to-qlhk.task.md` (which resets the attempt counter to `0`), and retry Step K from the clean Step K-1 checkpoint.
7. SCOPED TESTS, PER-STEP STATIC CHECK, FLAKY POLICY VS FULL SUITE:
   - Run fast scoped tests AND the per-step static/typecheck command (`& "QLHK/QLHK-Client/node_modules/.bin/tsc.cmd" --project QLHK/QLHK-Client/tsconfig.json --noEmit && cargo check --manifest-path QLHK/QLHK-Backend-Rust/Cargo.toml`) at each step.
   - Run the full test suite and full typecheck at session handoffs and at the final verification gate (`Step 8`).
   - **Flaky Test Policy**: The Step 0 baseline test run is executed **twice**; any test failing in **either** run is recorded under `Known Baseline / Flaky Failures` in `docs/plans/qlcs-remove-excel-port-column-mapping-to-qlhk.task.md`. During `STEP K`, handoffs, or `STEP N`, any **new** test failure (not listed in `Known Baseline / Flaky Failures`) MUST be **re-run once** before being counted as a regression or code attempt failure (if it passes on the immediate re-run, log it as flaky in `docs/plans/qlcs-remove-excel-port-column-mapping-to-qlhk.task.md` under `## Project Gotchas & Learned Invariants` and do not count it as a regression).
   - Enforce zero confirmed new failures compared to the baseline recorded in Step 0.
   - If the full test suite still fails after re-running the failing test once at handoff, treat it as a blocked gate: inspect `git log -n 4 --oneline` and test checkpoints individually (or via `git bisect`) to isolate which step caused the regression. After isolating the culprit step, **always return to the branch tip before making any edits**: run `git bisect reset` (if bisect was used), then `git switch "roadmap/qlcs-remove-excel-port-column-mapping-to-qlhk"`, and verify with `git branch --show-current`.
8. FRESH CONTEXT HANDOFF (EVERY 4 IMPLEMENTATION STEPS IN SESSION OR ON USER REQUEST):
   - After completing 4 implementation steps (`Step 1`..`Step 7`, where each committed sub-step `Step K.a` or `Step K.b` counts as **1 step** toward the 4-step counter; `Step 0` does not count) in the current session, or immediately when requested by the user—**unless `Step 8` (the final step) has just completed**—run the full test suite, verify a clean working tree, output the embedded `SESSION HANDOFF CHECKPOINT` block at the bottom of this prompt, and **STOP immediately**. Do not start the next step in the current session.
9. MINIMAL WORKING DIFF:
   - Shortest working code, strict YAGNI, zero unrequested abstractions, zero temporary scratch scripts (`fix*.js`, `patch*.py`, `temp*`).

---

### STEP 0: BRANCH ISOLATION, PRE-FLIGHT GATE & TASK INITIALIZATION
1. Capture the current branch as `BASE_BRANCH` (`BASE_BRANCH=$(git branch --show-current)`), verify `HEAD` is not detached (`test -n "$BASE_BRANCH"`, halting if detached), and if `$BASE_BRANCH` is protected (`main`/`master`/`production`), confirm with the user whether to use it as `BASE_BRANCH` or switch first; then create and switch to branch: `git switch -c roadmap/qlcs-remove-excel-port-column-mapping-to-qlhk` (if branch already exists, halt and ask user whether to resume or rename).
2. Verify clean working tree: `test -z "$(git status --porcelain)"` (Must exit 0).
3. Capture baseline commit hash via `git rev-parse --short HEAD` and run baseline tests **twice**: `cargo check --manifest-path QLHK/QLHK-Backend-Rust/Cargo.toml && & "QLHK/QLHK-Client/node_modules/.bin/vitest.cmd" run --config QLHK/QLHK-Client/vitest.config.ts && cargo check --manifest-path QLHK/QLHK-Backend-Rust/Cargo.toml && & "QLHK/QLHK-Client/node_modules/.bin/vitest.cmd" run --config QLHK/QLHK-Client/vitest.config.ts` -> Record total passing count and exact names of any tests failing in **either** run as "flaky/known failing".
4. Create `docs/plans/qlcs-remove-excel-port-column-mapping-to-qlhk.task.md` with this exact content:

````markdown
# Task Progress Tracker

- **Project**: QLHK
- **Base Branch**: `<BASE_BRANCH>`
- **Branch**: `roadmap/qlcs-remove-excel-port-column-mapping-to-qlhk`
- **Plan Reference**: `docs/plans/qlcs-remove-excel-port-column-mapping-to-qlhk.md`
- **Roadmap Prompt Reference**: `docs/plans/qlcs-remove-excel-port-column-mapping-to-qlhk.roadmap.md`
- **Baseline Checkpoint**: `<BASELINE_HASH>` (<PASS_COUNT> passing, verified across 2 baseline runs)
- **Known Baseline / Flaky Failures (Failed in Either Baseline Run)**:
  - None (or list exact paths/names: `path/to/test.ts > "test name" [flaky/known failing]`)
- **Status Legend**: 
  - `[ ]` Pending
  - `[/]` In Progress
  - `[x]` Completed
  - `[!]` Blocked (Circuit Breaker Tripped)

## Execution Checklist

- [ ] Step 1: Remove Policy Excel Import from QLCS Frontend
  - Target Files: `QLHK/QLHK-Client/src/features/qlcs/pages/DashboardPage.tsx`, `QLHK/QLHK-Client/src/hooks/useImportExport.ts`
  - Assigned Role: `.agents/frontend-developer.md`
  - Role Focus: Eliminate dead UI affordance without breaking policy export or profile filtering
  - Diff Budget: <= 200 gross LOC
  - Verification: `& "QLHK/QLHK-Client/node_modules/.bin/vitest.cmd" run --config QLHK/QLHK-Client/vitest.config.ts src/pages/__tests__/HtxhPage.test.tsx src/pages/__tests__/ChucThoPage.test.tsx`
  - Static Check: `& "QLHK/QLHK-Client/node_modules/.bin/tsc.cmd" --project QLHK/QLHK-Client/tsconfig.json --noEmit`
- [ ] Step 2: Clean Policy Excel Import Handlers in Backend Rust
  - Target Files: `QLHK/QLHK-Backend-Rust/src/handlers/policies.rs`
  - Assigned Role: `.agents/rust-pro.md`
  - Role Focus: Safely decommission redundant policy spreadsheet ingestion routes
  - Diff Budget: <= 200 gross LOC
  - Verification: `cargo check --manifest-path QLHK/QLHK-Backend-Rust/Cargo.toml`
  - Static Check: `cargo check --manifest-path QLHK/QLHK-Backend-Rust/Cargo.toml`
- [ ] Step 3: Household Column Mapping Dictionary & Auto-Suggest Engine
  - Target Files: `QLHK/QLHK-Client/src/utils/householdExcelFields.ts`, `QLHK/QLHK-Client/src/utils/householdExcelMapping.ts`
  - Assigned Role: `.agents/frontend-developer.md`
  - Role Focus: Construct robust alias dictionary and scoring algorithm for household/citizen fields
  - Diff Budget: <= 200 gross LOC
  - Verification: `& "QLHK/QLHK-Client/node_modules/.bin/vitest.cmd" run --config QLHK/QLHK-Client/vitest.config.ts src/utils/__tests__/excelParser.test.ts`
  - Static Check: `& "QLHK/QLHK-Client/node_modules/.bin/tsc.cmd" --project QLHK/QLHK-Client/tsconfig.json --noEmit`
- [ ] Step 4: Mapped Household Excel Row Parser & Normalizer
  - Target Files: `QLHK/QLHK-Client/src/utils/householdExcelParser.ts`, `QLHK/QLHK-Client/src/utils/excelParser.ts`
  - Assigned Role: `.agents/frontend-developer.md`
  - Role Focus: Transform arbitrary mapped 2D Excel rows into standardized ParsedExcelRow[]
  - Diff Budget: <= 200 gross LOC
  - Verification: `& "QLHK/QLHK-Client/node_modules/.bin/vitest.cmd" run --config QLHK/QLHK-Client/vitest.config.ts src/utils/__tests__/excelParser.test.ts`
  - Static Check: `& "QLHK/QLHK-Client/node_modules/.bin/tsc.cmd" --project QLHK/QLHK-Client/tsconfig.json --noEmit`
- [ ] Step 5: Interactive Visual Column-Mapping Component
  - Target Files: `QLHK/QLHK-Client/src/components/excel/ColumnMappingStep.tsx`
  - Assigned Role: `.agents/frontend-developer.md`
  - Role Focus: Deliver an intuitive, accessible column-matching table matching project design language
  - Diff Budget: <= 200 gross LOC
  - Verification: `& "QLHK/QLHK-Client/node_modules/.bin/tsc.cmd" --project QLHK/QLHK-Client/tsconfig.json --noEmit`
  - Static Check: `& "QLHK/QLHK-Client/node_modules/.bin/tsc.cmd" --project QLHK/QLHK-Client/tsconfig.json --noEmit`
- [ ] Step 6: Upgrade QLHK ImportPreviewModal to 3-Step Wizard
  - Target Files: `QLHK/QLHK-Client/src/components/excel/ImportPreviewModal.tsx`
  - Assigned Role: `.agents/frontend-developer.md`
  - Role Focus: Integrate multi-step navigation: Upload -> Khớp cột -> Xem trước & Xác nhận
  - Diff Budget: <= 200 gross LOC
  - Verification: `& "QLHK/QLHK-Client/node_modules/.bin/vitest.cmd" run --config QLHK/QLHK-Client/vitest.config.ts src/components/excel/__tests__/ImportPreviewModal.test.tsx`
  - Static Check: `& "QLHK/QLHK-Client/node_modules/.bin/tsc.cmd" --project QLHK/QLHK-Client/tsconfig.json --noEmit`
- [ ] Step 7: Regression Tests & Verification
  - Target Files: `QLHK/QLHK-Client/src/utils/__tests__/householdExcelMapping.test.ts`, `QLHK/QLHK-Client/src/components/excel/__tests__/ImportPreviewModal.test.tsx`
  - Assigned Role: `.agents/test-engineer.md`
  - Role Focus: Ensure zero regression across file formats and verify mapping step accuracy
  - Diff Budget: <= 200 gross LOC
  - Verification: `& "QLHK/QLHK-Client/node_modules/.bin/vitest.cmd" run --config QLHK/QLHK-Client/vitest.config.ts src/utils/__tests__/householdExcelMapping.test.ts src/components/excel/__tests__/ImportPreviewModal.test.tsx`
  - Static Check: `& "QLHK/QLHK-Client/node_modules/.bin/tsc.cmd" --project QLHK/QLHK-Client/tsconfig.json --noEmit`
- [ ] Step 8: Verification & Final Gate
  - Full Test Suite: `cargo check --manifest-path QLHK/QLHK-Backend-Rust/Cargo.toml && & "QLHK/QLHK-Client/node_modules/.bin/vitest.cmd" run --config QLHK/QLHK-Client/vitest.config.ts` (Zero new failures vs baseline)
  - Typecheck: `& "QLHK/QLHK-Client/node_modules/.bin/tsc.cmd" --project QLHK/QLHK-Client/tsconfig.json --noEmit && cargo check --manifest-path QLHK/QLHK-Backend-Rust/Cargo.toml` (0 errors)
  - Clean Working Tree & No Orphan Patches: Verified (`test -z "$(git status --porcelain)" && test -z "$(ls -A .git/roadmap-stash/qlcs-remove-excel-port-column-mapping-to-qlhk-*.patch 2>/dev/null)"`)

## Project Gotchas & Learned Invariants
<!-- Append verified gotchas here when encountering subtle bugs -->
````

5. Commit initial tracker: `git add docs/plans/qlcs-remove-excel-port-column-mapping-to-qlhk.task.md && git commit -m "chore(roadmap): init qlcs-remove-excel-port-column-mapping-to-qlhk.task.md"`.
6. Verify clean tree: `test -z "$(git status --porcelain)"`.
7. Anchor Context (Tier 1): Read `docs/plans/qlcs-remove-excel-port-column-mapping-to-qlhk.task.md`, `.agents/frontend-developer.md` (if present), and the plan header (`docs/plans/qlcs-remove-excel-port-column-mapping-to-qlhk.md`). Emit log: `[Context Anchored]: qlcs-remove-excel-port-column-mapping-to-qlhk.task.md (<status>), frontend-developer.md (<invariants>), plan.md (<goal>)`.

---

### STEP 1: Remove Policy Excel Import from QLCS Frontend
- START STEP:
  + Update `docs/plans/qlcs-remove-excel-port-column-mapping-to-qlhk.task.md`: Mark Step 1 as `[/]` (In Progress) and review `## Project Gotchas & Learned Invariants`.
- PRE-REQUISITE READS (Tier 2 slice; skip file read if already anchored in active session):
  + Plan Section: `docs/plans/qlcs-remove-excel-port-column-mapping-to-qlhk.md` (Section 1: Remove Policy Excel Import from QLCS Frontend (Step 1))
  + Agent Role: `.agents/frontend-developer.md`
  + Role Focus: Eliminate dead UI affordance without breaking policy export or profile filtering
- GRAPH-MAP CHECK:
  + Command: `graft callers useImportExport`
- ACTIONS:
  1. In `QLHK/QLHK-Client/src/features/qlcs/pages/DashboardPage.tsx`: Remove the "Nhập Excel" button (lines 446-456), remove the `<ImportModal>` component mount (lines 562-585), and remove unused import state variables destructured from `useImportExport`.
  2. In `QLHK/QLHK-Client/src/hooks/useImportExport.ts`: Remove `useImportProfiles` instantiation, forwarding only `useExportProfiles` states.
  3. Verify that `DashboardPage.tsx` compiles with zero unused variable warnings.
- SCOPE REVIEW & DIFF BUDGET GATE:
  1. Review working tree: `git status --short`.
  2. Run **DIFF GATE** (Invariant 4) -> Verify staged gross diff is `<= 200 LOC`.
- VERIFICATION:
  - Run scoped tests: `& "QLHK/QLHK-Client/node_modules/.bin/vitest.cmd" run --config QLHK/QLHK-Client/vitest.config.ts src/pages/__tests__/HtxhPage.test.tsx src/pages/__tests__/ChucThoPage.test.tsx`.
  - Run static check / typecheck: `& "QLHK/QLHK-Client/node_modules/.bin/tsc.cmd" --project QLHK/QLHK-Client/tsconfig.json --noEmit`.
- CHECKPOINT & PROGRESS UPDATE:
  - If gotchas discovered: Append to `## Project Gotchas & Learned Invariants` in `docs/plans/qlcs-remove-excel-port-column-mapping-to-qlhk.task.md`.
  - Update `docs/plans/qlcs-remove-excel-port-column-mapping-to-qlhk.task.md`: Mark Step 1 as `[x]` Completed.
  - Commit: `git add -A && git commit -m "refactor(roadmap): complete step 1 - remove policy excel import from qlcs frontend"`.
  - Verify clean: `test -z "$(git status --porcelain)"`.

---

### STEP 2: Clean Policy Excel Import Handlers in Backend Rust
- START STEP:
  + Update `docs/plans/qlcs-remove-excel-port-column-mapping-to-qlhk.task.md`: Mark Step 2 as `[/]` (In Progress) and review `## Project Gotchas & Learned Invariants`.
- PRE-REQUISITE READS (Tier 2 slice; skip file read if already anchored in active session):
  + Plan Section: `docs/plans/qlcs-remove-excel-port-column-mapping-to-qlhk.md` (Section 2: Clean Policy Excel Import Handlers in Backend Rust (Step 2))
  + Agent Role: `.agents/rust-pro.md`
  + Role Focus: Safely decommission redundant policy spreadsheet ingestion routes
- GRAPH-MAP CHECK:
  + Command: `graft callers import_policy_excel`
- ACTIONS:
  1. In `QLHK/QLHK-Backend-Rust/src/handlers/policies.rs`: Remove route bindings for `/chuctho/import`, `/htxh/import`, and `/excel/import` (or return an explicit HTTP 410 Gone / informative message that policies are synced from demographics).
  2. Remove dead code warnings for unused payload structs.
  3. Run `cargo check` to ensure clean backend compilation.
- SCOPE REVIEW & DIFF BUDGET GATE:
  1. Review working tree: `git status --short`.
  2. Run **DIFF GATE** (Invariant 4) -> Verify staged gross diff is `<= 200 LOC`.
- VERIFICATION:
  - Run scoped tests: `cargo check --manifest-path QLHK/QLHK-Backend-Rust/Cargo.toml`.
  - Run static check / typecheck: `cargo check --manifest-path QLHK/QLHK-Backend-Rust/Cargo.toml`.
- CHECKPOINT & PROGRESS UPDATE:
  - If gotchas discovered: Append to `## Project Gotchas & Learned Invariants` in `docs/plans/qlcs-remove-excel-port-column-mapping-to-qlhk.task.md`.
  - Update `docs/plans/qlcs-remove-excel-port-column-mapping-to-qlhk.task.md`: Mark Step 2 as `[x]` Completed.
  - Commit: `git add -A && git commit -m "refactor(roadmap): complete step 2 - clean policy excel import handlers in backend rust"`.
  - Verify clean: `test -z "$(git status --porcelain)"`.

---

### STEP 3: Household Column Mapping Dictionary & Auto-Suggest Engine
- START STEP:
  + Update `docs/plans/qlcs-remove-excel-port-column-mapping-to-qlhk.task.md`: Mark Step 3 as `[/]` (In Progress) and review `## Project Gotchas & Learned Invariants`.
- PRE-REQUISITE READS (Tier 2 slice; skip file read if already anchored in active session):
  + Plan Section: `docs/plans/qlcs-remove-excel-port-column-mapping-to-qlhk.md` (Section 3: Household Column Mapping Dictionary & Auto-Suggest Engine (Step 3))
  + Agent Role: `.agents/frontend-developer.md`
  + Role Focus: Construct robust alias dictionary and scoring algorithm for household/citizen fields
- GRAPH-MAP CHECK:
  + Command: None (greenfield utility)
- ACTIONS:
  1. Create `QLHK/QLHK-Client/src/utils/householdExcelFields.ts` defining `HOUSEHOLD_SYSTEM_FIELDS`: `fullName` (required), `dob` (required), `relationship`, `code`, `household_head`, `gender`, `ethnicity`, `religion`, `cccd`, `address`, `notes`, with extensive Vietnamese aliases without accents (`ho va ten`, `chu ho`, `ngay sinh`, `nam sinh`, `cmnd`, `hktt`, `dan toc`, etc.).
  2. Create `QLHK/QLHK-Client/src/utils/householdExcelMapping.ts` with `suggestHouseholdColumnMapping(headers)` implementing fuzzy normalized alias matching (exact match score 100, prefix/suffix 80, substring 50).
  3. Export types and helper functions for consumption by the UI.
- SCOPE REVIEW & DIFF BUDGET GATE:
  1. Review working tree: `git status --short`.
  2. Run **DIFF GATE** (Invariant 4) -> Verify staged gross diff is `<= 200 LOC`.
- VERIFICATION:
  - Run scoped tests: `& "QLHK/QLHK-Client/node_modules/.bin/vitest.cmd" run --config QLHK/QLHK-Client/vitest.config.ts src/utils/__tests__/excelParser.test.ts`.
  - Run static check / typecheck: `& "QLHK/QLHK-Client/node_modules/.bin/tsc.cmd" --project QLHK/QLHK-Client/tsconfig.json --noEmit`.
- CHECKPOINT & PROGRESS UPDATE:
  - If gotchas discovered: Append to `## Project Gotchas & Learned Invariants` in `docs/plans/qlcs-remove-excel-port-column-mapping-to-qlhk.task.md`.
  - Update `docs/plans/qlcs-remove-excel-port-column-mapping-to-qlhk.task.md`: Mark Step 3 as `[x]` Completed.
  - Commit: `git add -A && git commit -m "feat(roadmap): complete step 3 - household column mapping dictionary and auto-suggest engine"`.
  - Verify clean: `test -z "$(git status --porcelain)"`.

---

### STEP 4: Mapped Household Excel Row Parser & Normalizer
- START STEP:
  + Update `docs/plans/qlcs-remove-excel-port-column-mapping-to-qlhk.task.md`: Mark Step 4 as `[/]` (In Progress) and review `## Project Gotchas & Learned Invariants`.
- PRE-REQUISITE READS (Tier 2 slice; skip file read if already anchored in active session):
  + Plan Section: `docs/plans/qlcs-remove-excel-port-column-mapping-to-qlhk.md` (Section 4: Mapped Household Excel Row Parser & Normalizer (Step 4))
  + Agent Role: `.agents/frontend-developer.md`
  + Role Focus: Transform arbitrary mapped 2D Excel rows into standardized ParsedExcelRow[]
- GRAPH-MAP CHECK:
  + Command: `graft callers parseExcelSheet`
- ACTIONS:
  1. Implement `parseExcelWithHouseholdMapping` in `QLHK/QLHK-Client/src/utils/householdExcelParser.ts`:
     - Reads mapped columns for each row (`fullName`, `dob`, `gender`, `relationship`, `cccd`, `address`, etc.).
     - Validates mandatory fields (`fullName`, `dob`) and normalizes dates via `normalizeExcelDob`.
     - Validates and formats CCCD length (9 or 12 digits), flags warnings for missing or suspect values.
     - Auto-groups households by `code` or consecutive records under detected head of household.
  2. Re-export helper in `QLHK/QLHK-Client/src/utils/excelParser.ts` for clean unified access.
- SCOPE REVIEW & DIFF BUDGET GATE:
  1. Review working tree: `git status --short`.
  2. Run **DIFF GATE** (Invariant 4) -> Verify staged gross diff is `<= 200 LOC`.
- VERIFICATION:
  - Run scoped tests: `& "QLHK/QLHK-Client/node_modules/.bin/vitest.cmd" run --config QLHK/QLHK-Client/vitest.config.ts src/utils/__tests__/excelParser.test.ts`.
  - Run static check / typecheck: `& "QLHK/QLHK-Client/node_modules/.bin/tsc.cmd" --project QLHK/QLHK-Client/tsconfig.json --noEmit`.
- CHECKPOINT & PROGRESS UPDATE:
  - If gotchas discovered: Append to `## Project Gotchas & Learned Invariants` in `docs/plans/qlcs-remove-excel-port-column-mapping-to-qlhk.task.md`.
  - Update `docs/plans/qlcs-remove-excel-port-column-mapping-to-qlhk.task.md`: Mark Step 4 as `[x]` Completed.
  - Commit: `git add -A && git commit -m "feat(roadmap): complete step 4 - mapped household excel row parser and normalizer"`.
  - Verify clean: `test -z "$(git status --porcelain)"`.

---

### STEP 5: Interactive Visual Column-Mapping Component
- START STEP:
  + Update `docs/plans/qlcs-remove-excel-port-column-mapping-to-qlhk.task.md`: Mark Step 5 as `[/]` (In Progress) and review `## Project Gotchas & Learned Invariants`.
- PRE-REQUISITE READS (Tier 2 slice; skip file read if already anchored in active session):
  + Plan Section: `docs/plans/qlcs-remove-excel-port-column-mapping-to-qlhk.md` (Section 5: Interactive Visual Column-Mapping Component (Step 5))
  + Agent Role: `.agents/frontend-developer.md`
  + Role Focus: Deliver an intuitive, accessible column-matching table matching project design language
- GRAPH-MAP CHECK:
  + Command: None (greenfield UI component)
- ACTIONS:
  1. Create `QLHK/QLHK-Client/src/components/excel/ColumnMappingStep.tsx` rendering a clean mapping table:
     - Left column: System field label, required badge (`Bắt buộc` in red/emerald), and descriptive tooltip.
     - Center column: `CustomSelect` dropdown listing all extracted Excel headers, with a clear `(Bỏ qua / Không ánh xạ)` option.
     - Right column: Sample preview pill showing the extracted value from row 1 for the selected header.
  2. Add header action bar with "Tự động khớp cột" (magic wand) and "Đặt lại" buttons.
  3. Ensure complete dark mode and light mode visual polish (`bg-slate-50 dark:bg-slate-800/50`).
- SCOPE REVIEW & DIFF BUDGET GATE:
  1. Review working tree: `git status --short`.
  2. Run **DIFF GATE** (Invariant 4) -> Verify staged gross diff is `<= 200 LOC`.
- VERIFICATION:
  - Run scoped tests: `& "QLHK/QLHK-Client/node_modules/.bin/tsc.cmd" --project QLHK/QLHK-Client/tsconfig.json --noEmit`.
  - Run static check / typecheck: `& "QLHK/QLHK-Client/node_modules/.bin/tsc.cmd" --project QLHK/QLHK-Client/tsconfig.json --noEmit`.
- CHECKPOINT & PROGRESS UPDATE:
  - If gotchas discovered: Append to `## Project Gotchas & Learned Invariants` in `docs/plans/qlcs-remove-excel-port-column-mapping-to-qlhk.task.md`.
  - Update `docs/plans/qlcs-remove-excel-port-column-mapping-to-qlhk.task.md`: Mark Step 5 as `[x]` Completed.
  - Commit: `git add -A && git commit -m "feat(roadmap): complete step 5 - interactive visual column-mapping component"`.
  - Verify clean: `test -z "$(git status --porcelain)"`.

---

### STEP 6: Upgrade QLHK ImportPreviewModal to 3-Step Wizard
- START STEP:
  + Update `docs/plans/qlcs-remove-excel-port-column-mapping-to-qlhk.task.md`: Mark Step 6 as `[/]` (In Progress) and review `## Project Gotchas & Learned Invariants`.
- PRE-REQUISITE READS (Tier 2 slice; skip file read if already anchored in active session):
  + Plan Section: `docs/plans/qlcs-remove-excel-port-column-mapping-to-qlhk.md` (Section 6: Upgrade QLHK ImportPreviewModal to 3-Step Wizard (Step 6))
  + Agent Role: `.agents/frontend-developer.md`
  + Role Focus: Integrate multi-step navigation: Upload -> Khớp cột -> Xem trước & Xác nhận
- GRAPH-MAP CHECK:
  + Command: `graft callers ImportPreviewModal`
- ACTIONS:
  1. In `QLHK/QLHK-Client/src/components/excel/ImportPreviewModal.tsx`:
     - Add `currentStep` state (`upload` | `mapping` | `preview`) and stepper header indicator at the top of the modal.
     - When a file is uploaded in Step 1, extract headers and auto-suggest mapping, transitioning smoothly to Step 2 (`mapping`).
     - In Step 2, render `ColumnMappingStep` allowing user review/adjustment. Validate required fields before allowing "Tiếp tục xem trước ->".
     - In Step 3, parse data with the confirmed mapping, displaying the existing paginated preview table, issue filters, and "Xác nhận Nhập" button.
     - Provide "Quay lại" buttons to allow stepping backward without losing chosen file or mapping state.
- SCOPE REVIEW & DIFF BUDGET GATE:
  1. Review working tree: `git status --short`.
  2. Run **DIFF GATE** (Invariant 4) -> Verify staged gross diff is `<= 200 LOC`.
- VERIFICATION:
  - Run scoped tests: `& "QLHK/QLHK-Client/node_modules/.bin/vitest.cmd" run --config QLHK/QLHK-Client/vitest.config.ts src/components/excel/__tests__/ImportPreviewModal.test.tsx`.
  - Run static check / typecheck: `& "QLHK/QLHK-Client/node_modules/.bin/tsc.cmd" --project QLHK/QLHK-Client/tsconfig.json --noEmit`.
- CHECKPOINT & PROGRESS UPDATE:
  - If gotchas discovered: Append to `## Project Gotchas & Learned Invariants` in `docs/plans/qlcs-remove-excel-port-column-mapping-to-qlhk.task.md`.
  - Update `docs/plans/qlcs-remove-excel-port-column-mapping-to-qlhk.task.md`: Mark Step 6 as `[x]` Completed.
  - Commit: `git add -A && git commit -m "feat(roadmap): complete step 6 - upgrade qlhk importpreviewmodal to 3-step wizard"`.
  - Verify clean: `test -z "$(git status --porcelain)"`.

---

### STEP 7: Regression Tests & Verification
- START STEP:
  + Update `docs/plans/qlcs-remove-excel-port-column-mapping-to-qlhk.task.md`: Mark Step 7 as `[/]` (In Progress) and review `## Project Gotchas & Learned Invariants`.
- PRE-REQUISITE READS (Tier 2 slice; skip file read if already anchored in active session):
  + Plan Section: `docs/plans/qlcs-remove-excel-port-column-mapping-to-qlhk.md` (Section 7: Regression Tests & Verification (Step 7))
  + Agent Role: `.agents/test-engineer.md`
  + Role Focus: Ensure zero regression across file formats and verify mapping step accuracy
- GRAPH-MAP CHECK:
  + Command: None
- ACTIONS:
  1. Create `QLHK/QLHK-Client/src/utils/__tests__/householdExcelMapping.test.ts` testing alias suggestions against standard and exotic column names.
  2. Update `QLHK/QLHK-Client/src/components/excel/__tests__/ImportPreviewModal.test.tsx` to verify step transitions, mapping adjustments, and confirm callback payload.
  3. Run the complete client test suite to ensure no collateral breaks.
- SCOPE REVIEW & DIFF BUDGET GATE:
  1. Review working tree: `git status --short`.
  2. Run **DIFF GATE** (Invariant 4) -> Verify staged gross diff is `<= 200 LOC`.
- VERIFICATION:
  - Run scoped tests: `& "QLHK/QLHK-Client/node_modules/.bin/vitest.cmd" run --config QLHK/QLHK-Client/vitest.config.ts src/utils/__tests__/householdExcelMapping.test.ts src/components/excel/__tests__/ImportPreviewModal.test.tsx`.
  - Run static check / typecheck: `& "QLHK/QLHK-Client/node_modules/.bin/tsc.cmd" --project QLHK/QLHK-Client/tsconfig.json --noEmit`.
- CHECKPOINT & PROGRESS UPDATE:
  - If gotchas discovered: Append to `## Project Gotchas & Learned Invariants` in `docs/plans/qlcs-remove-excel-port-column-mapping-to-qlhk.task.md`.
  - Update `docs/plans/qlcs-remove-excel-port-column-mapping-to-qlhk.task.md`: Mark Step 7 as `[x]` Completed.
  - Commit: `git add -A && git commit -m "test(roadmap): complete step 7 - regression tests and verification"`.
  - Verify clean: `test -z "$(git status --porcelain)"`.

---

### STEP 8: FULL SUITE VERIFICATION & ZERO-REGRESSION GATE
- START STEP:
  + Update `docs/plans/qlcs-remove-excel-port-column-mapping-to-qlhk.task.md`: Mark Step 8 as `[/]` (In Progress).
- ACTIONS:
  1. Run Full Test Suite: `cargo check --manifest-path QLHK/QLHK-Backend-Rust/Cargo.toml && & "QLHK/QLHK-Client/node_modules/.bin/vitest.cmd" run --config QLHK/QLHK-Client/vitest.config.ts` (Zero new failures vs baseline).
  2. Run Typecheck: `& "QLHK/QLHK-Client/node_modules/.bin/tsc.cmd" --project QLHK/QLHK-Client/tsconfig.json --noEmit && cargo check --manifest-path QLHK/QLHK-Backend-Rust/Cargo.toml` (0 errors).
  3. Review Working Tree & Orphan Patches: `git status --short` (`docs/plans/qlcs-remove-excel-port-column-mapping-to-qlhk.task.md` changes expected; verify no temporary artifacts, untracked files, or leftover `.git/roadmap-stash/qlcs-remove-excel-port-column-mapping-to-qlhk-*.patch` files).
  4. Update `docs/plans/qlcs-remove-excel-port-column-mapping-to-qlhk.task.md`: Mark Step 8 and all checklist items as `[x]` Completed.
  5. Final Commit: `git add -A && git commit -m "chore(roadmap): complete qlcs-remove-excel-port-column-mapping-to-qlhk verification gate"`.
  6. Final Clean & No-Orphan-Patch Verification: `test -z "$(git status --porcelain)" && test -z "$(ls -A .git/roadmap-stash/qlcs-remove-excel-port-column-mapping-to-qlhk-*.patch 2>/dev/null)"` (Must exit 0).
- POST-GATE COMPLETION & BRANCH HANDOFF:
  1. Remove `docs/plans/qlcs-remove-excel-port-column-mapping-to-qlhk.task.md` in a final cleanup commit by default (unless the user explicitly requested keeping it in the repository):
     `git rm docs/plans/qlcs-remove-excel-port-column-mapping-to-qlhk.task.md && git commit -m "chore(roadmap): remove qlcs-remove-excel-port-column-mapping-to-qlhk.task.md" && test -z "$(git status --porcelain)"`
  2. List any preserved circuit-breaker WIP branches (`git branch --list "failed/qlcs-remove-excel-port-column-mapping-to-qlhk/*"`) so the user can inspect or confirm deleting them (never delete `failed/qlcs-remove-excel-port-column-mapping-to-qlhk/*` branches without explicit user confirmation), present the completion summary (commits created on `roadmap/qlcs-remove-excel-port-column-mapping-to-qlhk` vs. `<BASE_BRANCH>`), and ask the user how to proceed:
     - **Option 1**: Open a Pull Request from `roadmap/qlcs-remove-excel-port-column-mapping-to-qlhk` into `<BASE_BRANCH>`.
     - **Option 2**: Merge `roadmap/qlcs-remove-excel-port-column-mapping-to-qlhk` into `<BASE_BRANCH>` locally (`git switch "<BASE_BRANCH>" && git merge --no-ff "roadmap/qlcs-remove-excel-port-column-mapping-to-qlhk"`).
     - **Option 3**: Leave the branch `roadmap/qlcs-remove-excel-port-column-mapping-to-qlhk` as-is for manual inspection.

---

### SESSION HANDOFF CHECKPOINT TEMPLATE (Output after every 4 implementation steps in a session, unless Step N just finished)

When 4 implementation steps (`Step 0` excluded) are completed in the current session (or when requested by the user), and `Step 8` is not yet complete, run `cargo check --manifest-path QLHK/QLHK-Backend-Rust/Cargo.toml && & "QLHK/QLHK-Client/node_modules/.bin/vitest.cmd" run --config QLHK/QLHK-Client/vitest.config.ts`, ensure clean git status, output the block below (replacing `<STEPS_COMPLETED_IN_SESSION>` with the actual count), and **STOP immediately** (do not start the next step in this session):

````text
### 🔄 Session Handoff Checkpoint

Completed <STEPS_COMPLETED_IN_SESSION> step(s) in this session on branch `roadmap/qlcs-remove-excel-port-column-mapping-to-qlhk` (base branch: `<BASE_BRANCH>`). Full test suite verified.

To resume in a fresh session:
1. Read `docs/plans/qlcs-remove-excel-port-column-mapping-to-qlhk.roadmap.md` (the committed original roadmap prompt containing all `STRICT INVARIANTS` and step definitions) then continue — or paste the **ORIGINAL roadmap prompt** below as a fallback.
2. Append or send this resume block immediately after:

```text
Resume execution of the roadmap on branch `roadmap/qlcs-remove-excel-port-column-mapping-to-qlhk` (base branch: `<BASE_BRANCH>`). Read `docs/plans/qlcs-remove-excel-port-column-mapping-to-qlhk.roadmap.md` (the committed original roadmap prompt) for all `STRICT INVARIANTS` and step definitions—or use the original roadmap prompt pasted above as a fallback.

CRITICAL: Do NOT re-execute STEP 0 or any step already marked `[x]` in `docs/plans/qlcs-remove-excel-port-column-mapping-to-qlhk.task.md`. The branch and tracker already exist—Invariant 1's `git switch -c` applies only to the initial fresh start.

Directives:
1. Switch to branch: `git switch roadmap/qlcs-remove-excel-port-column-mapping-to-qlhk`
2. Working tree check:
   - If clean (`test -z "$(git status --porcelain)"` exits 0), proceed to Directive 3.
   - If dirty, inspect `docs/plans/qlcs-remove-excel-port-column-mapping-to-qlhk.task.md`:
     + If a step is marked `[/]` (In Progress), proceed to Directive 5 to evaluate WIP changes.
     + If dirty without an in-progress step, halt immediately and alert the user.
3. Context Anchoring (Tier 1): Read `docs/plans/qlcs-remove-excel-port-column-mapping-to-qlhk.task.md` (progress, known failures, gotchas), the designated role file (`.agents/frontend-developer.md` if applicable), and the plan header (`docs/plans/qlcs-remove-excel-port-column-mapping-to-qlhk.md`). Emit mandatory verification log: `[Context Anchored]: qlcs-remove-excel-port-column-mapping-to-qlhk.task.md (<status>), frontend-developer.md (<invariants>), plan.md (<goal>)`.
4. Inspect `git log -n 3 --oneline` to confirm the last committed checkpoint.
5. If Step K is marked `[/]` (In Progress) with uncommitted WIP, inspect existing changes via `git status --short` before continuing.
6. If Step K is marked `[!]` (Blocked):
   - Review the failure reason logged in `docs/plans/qlcs-remove-excel-port-column-mapping-to-qlhk.task.md`.
   - Await user guidance on the resolution strategy.
   - Upon guidance, update `docs/plans/qlcs-remove-excel-port-column-mapping-to-qlhk.task.md` to mark Step K back to `[/]` (In Progress) and resume implementation from the clean Step K-1 commit.
7. Otherwise, proceed with the next pending `[ ]` step following the strict invariants and step definitions in the roadmap prompt pasted above.
```
````
`````
