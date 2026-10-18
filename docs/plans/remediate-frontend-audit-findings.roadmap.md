`````text
[MANDATORY SYSTEM DIRECTIVE]:
You are executing a multi-step engineering task based on the verified plan at:
docs/plans/remediate-frontend-audit-findings.md

ENVIRONMENT REQUIREMENT:
All shell commands require a POSIX-compatible shell (Git Bash on Windows, WSL, Linux, or macOS).

STRICT INVARIANTS:
1. BRANCH & PRE-FLIGHT (Initial Start Only):
   - **Pre-Switch Detached-HEAD & Protected-Branch Guard**: Before creating `roadmap/remediate-frontend-audit-findings`, verify `HEAD` is not detached (`BASE_BRANCH=$(git branch --show-current)` and `test -n "$BASE_BRANCH"`; if empty/detached, halt immediately and ask the user to check out a named branch first). If `$BASE_BRANCH` is a protected branch (`main`, `master`, or `production`), ask the user whether to branch `roadmap/remediate-frontend-audit-findings` directly from `$BASE_BRANCH` (recording it as `Base Branch`) or switch to a feature/planning branch first.
   - Create and switch to isolated branch: `git switch -c roadmap/remediate-frontend-audit-findings`. If the branch already exists on a fresh start, halt immediately and ask the user whether to resume the existing branch or choose a new branch name. (When resuming via a Handoff Prompt, skip `STEP 0` and use `git switch roadmap/remediate-frontend-audit-findings`.)
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
        git diff -- <step_Kb_files> > ".git/roadmap-stash/remediate-frontend-audit-findings-K.b.patch"
        git checkout -- <step_Kb_files>
        git clean -fd -- <step_Kb_new_files>
        ```
     2. Record `Deferred Patch: .git/roadmap-stash/remediate-frontend-audit-findings-K.b.patch` under `Step K.b` in `task.md`. Never commit `Step K.b` changes inside `Step K.a`.
     3. When `Step K.b` starts, apply the saved patch via `git apply ".git/roadmap-stash/remediate-frontend-audit-findings-K.b.patch"`, and immediately after committing `Step K.b`, delete the patch file via `rm -f ".git/roadmap-stash/remediate-frontend-audit-findings-K.b.patch"`. Each committed sub-step (`Step K.a`, `Step K.b`) counts as **1 step** toward the 4-step session handoff counter (Invariant 8).
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
   - If a step fails after 3 consecutive code attempts, preserve the 3rd attempt's WIP on a unique branch and restore `roadmap/remediate-frontend-audit-findings` cleanly:
     ```bash
     ATTEMPT_TS=$(date +%s)
     git switch -c "failed/remediate-frontend-audit-findings/step-K-attempt-${ATTEMPT_TS}"
     git add -A && git commit -m "wip: failed step K attempt after 3 tries"
     git switch "roadmap/remediate-frontend-audit-findings"
     git add task.md && git commit -m "chore(roadmap): mark step K blocked"
     ```
   - Halt and await user guidance. **Branch Retention Rule**: Never delete `failed/remediate-frontend-audit-findings/*` branches automatically; preserve them until the user explicitly confirms deletion after `STEP 5` completes.
   - Unblocking procedure: Once user provides guidance, ensure you are on `roadmap/remediate-frontend-audit-findings`, change `[!]` back to `[/]` in `task.md` (which resets the attempt counter to `0`), and retry Step K from the clean Step K-1 checkpoint.
7. SCOPED TESTS, PER-STEP STATIC CHECK, FLAKY POLICY VS FULL SUITE:
   - Run fast scoped tests AND the per-step static/typecheck command (`cd QLHK-Client && npx tsc --noEmit`) at each step.
   - Run the full test suite (`cd QLHK-Client && npm test`) and full typecheck at session handoffs and at the final verification gate (`Step 5`).
   - **Flaky Test Policy**: The Step 0 baseline test run is executed **twice**; any test failing in **either** run is recorded under `Known Baseline / Flaky Failures` in `task.md`. During `STEP K`, handoffs, or `STEP 5`, any **new** test failure (not listed in `Known Baseline / Flaky Failures`) MUST be **re-run once** before being counted as a regression or code attempt failure (if it passes on the immediate re-run, log it as flaky in `task.md` under `## Project Gotchas & Learned Invariants` and do not count it as a regression).
   - Enforce zero confirmed new failures compared to the baseline recorded in Step 0.
   - If the full test suite still fails after re-running the failing test once at handoff, treat it as a blocked gate: inspect `git log -n 4 --oneline` and test checkpoints individually (or via `git bisect`) to isolate which step caused the regression. After isolating the culprit step, **always return to the branch tip before making any edits**: run `git bisect reset` (if bisect was used), then `git switch "roadmap/remediate-frontend-audit-findings"`, and verify with `git branch --show-current`.
8. FRESH CONTEXT HANDOFF (EVERY 4 IMPLEMENTATION STEPS IN SESSION OR ON USER REQUEST):
   - After completing 4 implementation steps (`Step 1`..`Step 4`, where each committed sub-step `Step K.a` or `Step K.b` counts as **1 step** toward the 4-step counter; `Step 0` does not count) in the current session, or immediately when requested by the user—**unless `Step 5` (the final step) has just completed**—run the full test suite, verify a clean working tree, output the embedded `SESSION HANDOFF CHECKPOINT` block at the bottom of this prompt, and **STOP immediately**. Do not start the next step in the current session.
9. MINIMAL WORKING DIFF:
   - Shortest working code, strict YAGNI, zero unrequested abstractions, zero temporary scratch scripts (`fix*.js`, `patch*.py`, `temp*`).

---

### STEP 0: BRANCH ISOLATION, PRE-FLIGHT GATE & TASK INITIALIZATION
1. Capture the current branch as `BASE_BRANCH` (`BASE_BRANCH=$(git branch --show-current)`), verify `HEAD` is not detached (`test -n "$BASE_BRANCH"`, halting if detached), and if `$BASE_BRANCH` is protected (`main`/`master`/`production`), confirm with the user whether to use it as `BASE_BRANCH` or switch first; then create and switch to branch: `git switch -c roadmap/remediate-frontend-audit-findings` (if branch already exists, halt and ask user whether to resume or rename).
2. Verify clean working tree: `test -z "$(git status --porcelain)"` (Must exit 0).
3. Capture baseline commit hash via `git rev-parse --short HEAD` and run baseline tests **twice**: `cd QLHK-Client && npm test && npm test` -> Record total passing count and exact names of any tests failing in **either** run as "flaky/known failing".
4. Create `task.md` at project root with this exact content (replace `<BASE_BRANCH>`, `<BASELINE_HASH>`, and `<PASS_COUNT>` with actual values from steps 1 and 3):

```markdown
# Task Progress Tracker

- **Project**: QLHK-Client
- **Base Branch**: `<BASE_BRANCH>`
- **Branch**: `roadmap/remediate-frontend-audit-findings`
- **Plan Reference**: `docs/plans/remediate-frontend-audit-findings.md`
- **Roadmap Prompt Reference**: `docs/plans/remediate-frontend-audit-findings.roadmap.md`
- **Baseline Checkpoint**: `<BASELINE_HASH>` (<PASS_COUNT> passing, verified across 2 baseline runs)
- **Known Baseline / Flaky Failures (Failed in Either Baseline Run)**:
  - None
- **Status Legend**: 
  - `[ ]` Pending
  - `[/]` In Progress
  - `[x]` Completed
  - `[!]` Blocked (Circuit Breaker Tripped)

## Execution Checklist

- [ ] Step 1: Preserve 5 Citizen Fields with Vietnamese Alias Fallbacks
  - Finding IDs: `BUG-001`
  - Target Files: `QLHK-Client/src/api/householdApi.ts`, `QLHK-Client/src/components/households/CitizenModal.tsx`, `QLHK-Client/src/api/__tests__/householdApi.test.ts`, `QLHK-Client/src/components/households/__tests__/CitizenModal.test.tsx`
  - Role Focus: Data mapping normalization, form state initialization, and zero demographic data loss invariants
  - Graph Check: `graft callers normalizeHousehold || grep -rn "normalizeHousehold" QLHK-Client/src/`
  - Diff Budget: <= 200 gross LOC
  - Verification: `cd QLHK-Client && npx vitest run src/api/__tests__/householdApi.test.ts src/components/households/__tests__/CitizenModal.test.tsx`
  - Static Check: `cd QLHK-Client && npx tsc --noEmit`
- [ ] Step 2: Dynamic Calculation Year in Store and Robust ISO Date Parsing in Analytics
  - Finding IDs: `BUG-002`, `BUG-004`
  - Target Files: `QLHK-Client/src/store/householdStore.ts`, `QLHK-Client/src/components/analytics/AnalyticsDashboard.tsx`, `QLHK-Client/src/components/analytics/__tests__/AnalyticsDashboard.test.tsx`
  - Role Focus: Dynamic calendar year calculations and ISO date parsing robustness
  - Graph Check: `graft callers calculateAge || grep -rn "calculateAge" QLHK-Client/src/`
  - Diff Budget: <= 200 gross LOC
  - Verification: `cd QLHK-Client && npx vitest run src/components/analytics/__tests__/AnalyticsDashboard.test.tsx`
  - Static Check: `cd QLHK-Client && npx tsc --noEmit`
- [ ] Step 3: Add Backdrop Blur to Core and Household Modal Overlays
  - Finding IDs: `BUG-003`
  - Target Files: `QLHK-Client/src/components/common/Modal.tsx`, `QLHK-Client/src/components/households/CitizenModal.tsx`, `QLHK-Client/src/components/households/HouseholdDrawer.tsx`, `QLHK-Client/src/components/households/ConflictResolutionModal.tsx`
  - Role Focus: Modal overlay separation and visual accessibility standards
  - Graph Check: `graft ask "createPortal" --source`
  - Diff Budget: <= 200 gross LOC
  - Verification: `cd QLHK-Client && npx vitest run src/components/households/__tests__/CitizenModal.test.tsx src/components/households/__tests__/HouseholdTable.test.tsx`
  - Static Check: `cd QLHK-Client && npx tsc --noEmit`
- [ ] Step 4: Add Backdrop Blur to Excel and Auxiliary Modal Overlays
  - Finding IDs: `BUG-003`
  - Target Files: `QLHK-Client/src/components/excel/ExportSettingsModal.tsx`, `QLHK-Client/src/components/excel/ImportPreviewModal.tsx`, `QLHK-Client/src/components/common/AppUpdateModal.tsx`, `QLHK-Client/src/components/network/ServerStatusModal.tsx`
  - Role Focus: Auxiliary and import/export modal overlay consistency
  - Graph Check: None (isolated styling changes)
  - Diff Budget: <= 200 gross LOC
  - Verification: `cd QLHK-Client && npx vitest run src/components/excel/__tests__/ExportSettingsModal.test.tsx src/components/excel/__tests__/ImportPreviewModal.test.tsx`
  - Static Check: `cd QLHK-Client && npx tsc --noEmit`
- [ ] Step 5: Verification & Final Gate
  - Full Test Suite: `cd QLHK-Client && npm test` (Zero new failures vs baseline)
  - Typecheck: `cd QLHK-Client && npx tsc --noEmit` (0 errors)
  - Clean Working Tree & No Orphan Patches: Verified (`test -z "$(git status --porcelain)" && test -z "$(ls -A .git/roadmap-stash 2>/dev/null)"`)

## Finding Closure Mapping (When Sourced from `audit` / `optimize`)
<!-- Populate at Step 5 when steps carry Finding IDs: `BUG-001 -> <commit_hash> (Step K)` -->

## Project Gotchas & Learned Invariants
<!-- Append verified gotchas here when encountering subtle bugs -->
```

5. Commit initial tracker: `git add task.md && git commit -m "chore(roadmap): init task.md"`.
6. Verify clean tree: `test -z "$(git status --porcelain)"`.

---

### STEP 1: Preserve 5 Citizen Fields with Vietnamese Alias Fallbacks
- START STEP:
  + Update `task.md`: Mark Step 1 as `[/]` (In Progress) and review `## Project Gotchas & Learned Invariants` (if executing a deferred `Step 1.b`, apply `.git/roadmap-stash/remediate-frontend-audit-findings-1.b.patch` via `git apply`).
- PRE-REQUISITE READS (Parallel call; skip file read if already in active session context):
  + Plan Section: `docs/plans/remediate-frontend-audit-findings.md` (Section 1: Preserve 5 Citizen Fields with Vietnamese Alias Fallbacks (Step 1))
  + Role Focus: Data mapping normalization, form state initialization, and zero demographic data loss invariants
- GRAPH-MAP CHECK (Omit if standalone/greenfield):
  + Command: `graft callers normalizeHousehold || grep -rn "normalizeHousehold" QLHK-Client/src/`
- ACTIONS:
  1. In `QLHK-Client/src/api/householdApi.ts`, update `normalizeHousehold` member mapping (lines 81-86) to check Vietnamese aliases (`hoc_van`, `nvqs`, `nghe_nghiep`, `que_quan`, `ghi_chu`) when English keys are undefined or empty:
     ```ts
     education: (c.education ?? c.hoc_van ? String(c.education ?? c.hoc_van).trim() : ""),
     military_status: (c.military_status ?? c.nvqs ? String(c.military_status ?? c.nvqs).trim() : ""),
     occupation: (c.occupation ?? c.nghe_nghiep ? String(c.occupation ?? c.nghe_nghiep).trim() : ""),
     native_place: (c.native_place ?? c.que_quan ? String(c.native_place ?? c.que_quan).trim() : ""),
     notes: (c.notes ?? c.ghi_chu ? String(c.notes ?? c.ghi_chu).trim() : ""),
     ```
  2. In `QLHK-Client/src/components/households/CitizenModal.tsx`, update state initialization in `useEffect` (lines 109-113) to read `(initialMember.military_status || (initialMember as any).nvqs || "")`, `(initialMember.education || (initialMember as any).hoc_van || "")`, `(initialMember.occupation || (initialMember as any).nghe_nghiep || "")`, `(initialMember.native_place || (initialMember as any).que_quan || "")`, and `(initialMember.notes || (initialMember as any).ghi_chu || "")`.
  3. In `QLHK-Client/src/api/__tests__/householdApi.test.ts`, add unit test verifying `normalizeHousehold` extracts demographic fields from objects using Vietnamese aliases.
  4. In `QLHK-Client/src/components/households/__tests__/CitizenModal.test.tsx`, add test asserting `CitizenModal` populates form inputs when passed an `initialMember` with Vietnamese keys.
- SCOPE REVIEW & DIFF BUDGET GATE:
  1. Review working tree: `git status --short` (`task.md` changes are expected—do not reset or delete `task.md`; reset or remove any out-of-scope files before staging).
  2. Run **DIFF GATE** (Invariant 4) -> Verify staged gross diff is `<= 200 LOC` (if > 200 LOC, unstage, write `Step 1.b` changes to `.git/roadmap-stash/remediate-frontend-audit-findings-1.b.patch`, record its path in `task.md`, clean `Step 1.b` changes from working tree, and split into `Step 1.a` / `Step 1.b` in `task.md`).
- VERIFICATION:
  - Run scoped tests (zero new failures vs baseline; re-run any new failure once before counting as regression): `cd QLHK-Client && npx vitest run src/api/__tests__/householdApi.test.ts src/components/households/__tests__/CitizenModal.test.tsx`.
  - Run static check / typecheck (optional-but-default; 0 errors): `cd QLHK-Client && npx tsc --noEmit`.
- CHECKPOINT & PROGRESS UPDATE:
  - If gotchas discovered: Append to `## Project Gotchas & Learned Invariants` in `task.md`.
  - Update `task.md`: Mark Step 1 as `[x]` Completed.
  - Commit: `git add -A && git commit -m "fix(roadmap): complete step 1 - preserve 5 citizen fields with vietnamese aliases [BUG-001]"` (if completing `Step 1.b`, delete `.git/roadmap-stash/remediate-frontend-audit-findings-1.b.patch` via `rm -f`).
  - Verify clean: `test -z "$(git status --porcelain)"`.

---

### STEP 2: Dynamic Calculation Year in Store and Robust ISO Date Parsing in Analytics
- START STEP:
  + Update `task.md`: Mark Step 2 as `[/]` (In Progress) and review `## Project Gotchas & Learned Invariants` (if executing a deferred `Step 2.b`, apply `.git/roadmap-stash/remediate-frontend-audit-findings-2.b.patch` via `git apply`).
- PRE-REQUISITE READS (Parallel call; skip file read if already in active session context):
  + Plan Section: `docs/plans/remediate-frontend-audit-findings.md` (Section 2: Dynamic Calculation Year in Store and Robust ISO Date Parsing in Analytics (Step 2))
  + Role Focus: Dynamic calendar year calculations and ISO date parsing robustness
- GRAPH-MAP CHECK (Omit if standalone/greenfield):
  + Command: `graft callers calculateAge || grep -rn "calculateAge" QLHK-Client/src/`
- ACTIONS:
  1. In `QLHK-Client/src/store/householdStore.ts`, replace hardcoded `2026` in `saveMember` (lines 379 and 410) with `new Date().getFullYear()`.
  2. In `QLHK-Client/src/components/analytics/AnalyticsDashboard.tsx`, import `parseAndValidateDob` from `../../utils/date` and replace `dobVal.match(/(\d{4})$/)` in `localCalculated` (lines 210-215) with `parseAndValidateDob(dobVal)`. If valid and `birthYear` exists, compute `age = currentYear - parsedDob.birthYear`, ensuring both ISO format (`1985-05-20`) and Vietnamese format (`20/05/1985`) resolve accurately.
  3. In `QLHK-Client/src/components/analytics/__tests__/AnalyticsDashboard.test.tsx`, add test verifying that citizens with ISO format birth dates are properly categorized into age pyramid segments.
- SCOPE REVIEW & DIFF BUDGET GATE:
  1. Review working tree: `git status --short` (`task.md` changes are expected—do not reset or delete `task.md`; reset or remove any out-of-scope files before staging).
  2. Run **DIFF GATE** (Invariant 4) -> Verify staged gross diff is `<= 200 LOC` (if > 200 LOC, unstage, write `Step 2.b` changes to `.git/roadmap-stash/remediate-frontend-audit-findings-2.b.patch`, record its path in `task.md`, clean `Step 2.b` changes from working tree, and split into `Step 2.a` / `Step 2.b` in `task.md`).
- VERIFICATION:
  - Run scoped tests (zero new failures vs baseline; re-run any new failure once before counting as regression): `cd QLHK-Client && npx vitest run src/components/analytics/__tests__/AnalyticsDashboard.test.tsx`.
  - Run static check / typecheck (optional-but-default; 0 errors): `cd QLHK-Client && npx tsc --noEmit`.
- CHECKPOINT & PROGRESS UPDATE:
  - If gotchas discovered: Append to `## Project Gotchas & Learned Invariants` in `task.md`.
  - Update `task.md`: Mark Step 2 as `[x]` Completed.
  - Commit: `git add -A && git commit -m "fix(roadmap): complete step 2 - dynamic calculation year and iso date parsing [BUG-002] [BUG-004]"` (if completing `Step 2.b`, delete `.git/roadmap-stash/remediate-frontend-audit-findings-2.b.patch` via `rm -f`).
  - Verify clean: `test -z "$(git status --porcelain)"`.

---

### STEP 3: Add Backdrop Blur to Core and Household Modal Overlays
- START STEP:
  + Update `task.md`: Mark Step 3 as `[/]` (In Progress) and review `## Project Gotchas & Learned Invariants` (if executing a deferred `Step 3.b`, apply `.git/roadmap-stash/remediate-frontend-audit-findings-3.b.patch` via `git apply`).
- PRE-REQUISITE READS (Parallel call; skip file read if already in active session context):
  + Plan Section: `docs/plans/remediate-frontend-audit-findings.md` (Section 3: Add Backdrop Blur to Core and Household Modal Overlays (Step 3))
  + Role Focus: Modal overlay separation and visual accessibility standards
- GRAPH-MAP CHECK (Omit if standalone/greenfield):
  + Command: `graft ask "createPortal" --source`
- ACTIONS:
  1. In `QLHK-Client/src/components/common/Modal.tsx`, add `backdrop-blur-sm` to overlay container `className` (around line 65).
  2. In `QLHK-Client/src/components/households/CitizenModal.tsx`, add `backdrop-blur-sm` to overlay container `className` (around line 252).
  3. In `QLHK-Client/src/components/households/HouseholdDrawer.tsx`, add `backdrop-blur-sm` to overlay container `className` (around line 366).
  4. In `QLHK-Client/src/components/households/ConflictResolutionModal.tsx`, add `backdrop-blur-sm` to overlay container `className` (around line 37).
- SCOPE REVIEW & DIFF BUDGET GATE:
  1. Review working tree: `git status --short` (`task.md` changes are expected—do not reset or delete `task.md`; reset or remove any out-of-scope files before staging).
  2. Run **DIFF GATE** (Invariant 4) -> Verify staged gross diff is `<= 200 LOC` (if > 200 LOC, unstage, write `Step 3.b` changes to `.git/roadmap-stash/remediate-frontend-audit-findings-3.b.patch`, record its path in `task.md`, clean `Step 3.b` changes from working tree, and split into `Step 3.a` / `Step 3.b` in `task.md`).
- VERIFICATION:
  - Run scoped tests (zero new failures vs baseline; re-run any new failure once before counting as regression): `cd QLHK-Client && npx vitest run src/components/households/__tests__/CitizenModal.test.tsx src/components/households/__tests__/HouseholdTable.test.tsx`.
  - Run static check / typecheck (optional-but-default; 0 errors): `cd QLHK-Client && npx tsc --noEmit`.
- CHECKPOINT & PROGRESS UPDATE:
  - If gotchas discovered: Append to `## Project Gotchas & Learned Invariants` in `task.md`.
  - Update `task.md`: Mark Step 3 as `[x]` Completed.
  - Commit: `git add -A && git commit -m "fix(roadmap): complete step 3 - backdrop blur on core modals [BUG-003]"` (if completing `Step 3.b`, delete `.git/roadmap-stash/remediate-frontend-audit-findings-3.b.patch` via `rm -f`).
  - Verify clean: `test -z "$(git status --porcelain)"`.

---

### STEP 4: Add Backdrop Blur to Excel and Auxiliary Modal Overlays
- START STEP:
  + Update `task.md`: Mark Step 4 as `[/]` (In Progress) and review `## Project Gotchas & Learned Invariants` (if executing a deferred `Step 4.b`, apply `.git/roadmap-stash/remediate-frontend-audit-findings-4.b.patch` via `git apply`).
- PRE-REQUISITE READS (Parallel call; skip file read if already in active session context):
  + Plan Section: `docs/plans/remediate-frontend-audit-findings.md` (Section 4: Add Backdrop Blur to Excel and Auxiliary Modal Overlays (Step 4))
  + Role Focus: Auxiliary and import/export modal overlay consistency
- GRAPH-MAP CHECK (Omit if standalone/greenfield):
  + Command: echo "Isolated styling changes"
- ACTIONS:
  1. In `QLHK-Client/src/components/excel/ExportSettingsModal.tsx`, add `backdrop-blur-sm` to overlay container `className` (around line 146).
  2. In `QLHK-Client/src/components/excel/ImportPreviewModal.tsx`, add `backdrop-blur-sm` to overlay container `className` (around line 293).
  3. In `QLHK-Client/src/components/common/AppUpdateModal.tsx`, update `backdrop-blur-xs` to `backdrop-blur-sm` in overlay container `className` (around line 188).
  4. In `QLHK-Client/src/components/network/ServerStatusModal.tsx`, add `backdrop-blur-sm` to overlay container `className` (around line 28).
- SCOPE REVIEW & DIFF BUDGET GATE:
  1. Review working tree: `git status --short` (`task.md` changes are expected—do not reset or delete `task.md`; reset or remove any out-of-scope files before staging).
  2. Run **DIFF GATE** (Invariant 4) -> Verify staged gross diff is `<= 200 LOC` (if > 200 LOC, unstage, write `Step 4.b` changes to `.git/roadmap-stash/remediate-frontend-audit-findings-4.b.patch`, record its path in `task.md`, clean `Step 4.b` changes from working tree, and split into `Step 4.a` / `Step 4.b` in `task.md`).
- VERIFICATION:
  - Run scoped tests (zero new failures vs baseline; re-run any new failure once before counting as regression): `cd QLHK-Client && npx vitest run src/components/excel/__tests__/ExportSettingsModal.test.tsx src/components/excel/__tests__/ImportPreviewModal.test.tsx`.
  - Run static check / typecheck (optional-but-default; 0 errors): `cd QLHK-Client && npx tsc --noEmit`.
- CHECKPOINT & PROGRESS UPDATE:
  - If gotchas discovered: Append to `## Project Gotchas & Learned Invariants` in `task.md`.
  - Update `task.md`: Mark Step 4 as `[x]` Completed.
  - Commit: `git add -A && git commit -m "fix(roadmap): complete step 4 - backdrop blur on auxiliary modals [BUG-003]"` (if completing `Step 4.b`, delete `.git/roadmap-stash/remediate-frontend-audit-findings-4.b.patch` via `rm -f`).
  - Verify clean: `test -z "$(git status --porcelain)"`.

---

### STEP 5: FULL SUITE VERIFICATION & ZERO-REGRESSION GATE
- START STEP:
  + Update `task.md`: Mark Step 5 as `[/]` (In Progress).
- ACTIONS:
  1. Run Full Test Suite: `cd QLHK-Client && npm test` (Zero new failures vs baseline).
  2. Run Typecheck: `cd QLHK-Client && npx tsc --noEmit` (0 errors).
  3. Review Working Tree & Orphan Patches: `git status --short` (`task.md` changes expected; verify no temporary artifacts, untracked files, or leftover `.git/roadmap-stash/*.patch` files).
  4. Update `task.md`: Mark Step 5 and all checklist items as `[x]` Completed, and record the `Finding ID -> commit hash` closure mapping under `## Finding Closure Mapping` in `task.md` and in the final completion summary:
     - `BUG-001 -> <commit_hash> (Step 1)`
     - `BUG-002 -> <commit_hash> (Step 2)`
     - `BUG-003 -> <commit_hash> (Step 3 & Step 4)`
     - `BUG-004 -> <commit_hash> (Step 2)`
  5. Final Commit: `git add -A && git commit -m "chore(roadmap): complete remediate-frontend-audit-findings verification gate"`.
  6. Final Clean & No-Orphan-Patch Verification: `test -z "$(git status --porcelain)" && test -z "$(ls -A .git/roadmap-stash 2>/dev/null)"` (Must exit 0).
- POST-GATE COMPLETION & BRANCH HANDOFF:
  1. Remove `task.md` in a final cleanup commit by default (unless the user explicitly requested keeping `task.md` in the repository):
     `git rm task.md && git commit -m "chore(roadmap): remove task.md" && test -z "$(git status --porcelain)"`
  2. List any preserved circuit-breaker WIP branches (`git branch --list "failed/remediate-frontend-audit-findings/*"`) so the user can inspect or confirm deleting them (never delete `failed/remediate-frontend-audit-findings/*` branches without explicit user confirmation), present the completion summary (commits created on `roadmap/remediate-frontend-audit-findings` vs. `<BASE_BRANCH>`, plus the `BUG-ID / OPT-ID -> commit hash` closure table when applicable), and ask the user how to proceed:
     - **Option 1**: Open a Pull Request from `roadmap/remediate-frontend-audit-findings` into `<BASE_BRANCH>`.
     - **Option 2**: Merge `roadmap/remediate-frontend-audit-findings` into `<BASE_BRANCH>` locally (`git switch "<BASE_BRANCH>" && git merge --no-ff "roadmap/remediate-frontend-audit-findings"`).
     - **Option 3**: Leave the branch `roadmap/remediate-frontend-audit-findings` as-is for manual inspection.

---

### SESSION HANDOFF CHECKPOINT TEMPLATE (Output after every 4 implementation steps in a session, unless Step 5 just finished)

When 4 implementation steps (`Step 0` excluded) are completed in the current session (or when requested by the user), and `Step 5` is not yet complete, run `cd QLHK-Client && npm test`, ensure clean git status, output the block below (replacing `<STEPS_COMPLETED_IN_SESSION>` with the actual count), and **STOP immediately** (do not start the next step in this session):

````text
### 🔄 Session Handoff Checkpoint

Completed <STEPS_COMPLETED_IN_SESSION> step(s) in this session on branch `roadmap/remediate-frontend-audit-findings` (base branch: `<BASE_BRANCH>`). Full test suite verified.

To resume in a fresh session:
1. Read `docs/plans/remediate-frontend-audit-findings.roadmap.md` (the committed original roadmap prompt containing all `STRICT INVARIANTS` and step definitions) then continue — or paste the **ORIGINAL roadmap prompt** below as a fallback.
2. Append or send this resume block immediately after:

```text
Resume execution of the roadmap on branch `roadmap/remediate-frontend-audit-findings` (base branch: `<BASE_BRANCH>`). Read `docs/plans/remediate-frontend-audit-findings.roadmap.md` (the committed original roadmap prompt) for all `STRICT INVARIANTS` and step definitions—or use the original roadmap prompt pasted above as a fallback.

CRITICAL: Do NOT re-execute STEP 0 or any step already marked `[x]` in `task.md`. The branch and `task.md` already exist—Invariant 1's `git switch -c` applies only to the initial fresh start.

Directives:
1. Switch to branch: `git switch roadmap/remediate-frontend-audit-findings`
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
