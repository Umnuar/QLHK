`````text
[MANDATORY SYSTEM DIRECTIVE]:
You are executing a multi-step engineering task based on the verified plan at:
docs/plans/qlhk-client/qlhk-client-merge-qlcs.md

ENVIRONMENT REQUIREMENT:
All shell commands require a POSIX-compatible shell (Git Bash on Windows, WSL, Linux, or macOS).

STRICT INVARIANTS:
1. BRANCH & PRE-FLIGHT (Initial Start Only):
   - **Pre-Switch Detached-HEAD & Protected-Branch Guard**: Before creating `roadmap/qlhk-client-merge-qlcs`, verify `HEAD` is not detached (`BASE_BRANCH=$(git branch --show-current)` and `test -n "$BASE_BRANCH"`; if empty/detached, halt immediately and ask the user to check out a named branch first). If `$BASE_BRANCH` is a protected branch (`main`, `master`, or `production`), ask the user whether to branch `roadmap/qlhk-client-merge-qlcs` directly from `$BASE_BRANCH` (recording it as `Base Branch`) or switch to a feature/planning branch first.
   - Create and switch to isolated branch: `git switch -c roadmap/qlhk-client-merge-qlcs`. If the branch already exists on a fresh start, halt immediately and ask the user whether to resume the existing branch or choose a new branch name. (When resuming via a Handoff Prompt, skip `STEP 0` and use `git switch roadmap/qlhk-client-merge-qlcs`.)
   - Verify clean working tree: `test -z "$(git status --porcelain)"`.
   - Execute the baseline test command **twice** (`Run 1` and `Run 2`), record `Base Branch: <BASE_BRANCH>`, the passing count, and exact names of any tests failing in **either** run as "flaky/known failing" into `docs/plans/qlhk-client/qlhk-client-merge-qlcs.task.md`, and immediately commit the task tracker. Never build on an uncommitted dirty tree.
2. TWO-TIER READ CADENCE & CONTEXT ANCHORING:
   - **Tier 1 (Session / Task Initialization)**: At `STEP 0`, when resuming from a handoff, or after a `/compact` event, perform a one-time anchor read of: `docs/plans/qlhk-client/qlhk-client-merge-qlcs.task.md`, `.agents/frontend-developer.md` (if present in repo), and the plan header (`docs/plans/qlhk-client/qlhk-client-merge-qlcs.md`). Emit mandatory proof-of-read log before taking action:
     `[Context Anchored]: qlhk-client-merge-qlcs.task.md (<status>), frontend-developer.md (<invariants>), qlhk-client-merge-qlcs.md (<goal>)`
   - **Tier 2 (In-Session Atomic Step K)**: Never re-read the entire plan or role file at each step. Rely on inlined instructions inside `STEP K` (or read only the exact surgical slice `### Section K: ...`, `<= 30 lines`). Follow the embedded `Role Focus` invariants and only read code files strictly inside `Target Files`. Review `## Project Gotchas & Learned Invariants` in `docs/plans/qlhk-client/qlhk-client-merge-qlcs.task.md` before starting a step.
3. GRAPH-AWARE BLAST RADIUS:
   - When a step specifies a `GRAPH-MAP CHECK`, check if the tool (`graft`, `graphify`, `codegraph`) is installed before querying callers/callees. Fall back to native grep or LSP find-references if unavailable.
4. SCOPE HYGIENE & DIFF GATE (<= 200 GROSS LOC):
   - After implementing changes and BEFORE staging, run `git status --short`. Note that tracker modifications (`[/]`) in `docs/plans/qlhk-client/qlhk-client-merge-qlcs.task.md` are expected—never reset or delete the tracker. If out-of-scope files (`.env*`, scratch scripts, build artifacts) appear, reset (`git reset <file>`), delete, or add to `.gitignore`.
   - Run the **DIFF GATE** command to stage changes and verify gross diff size (added + deleted lines) <= 200 LOC per step, excluding lockfiles, migrations, fixtures, and task trackers:
     ```bash
     git add -A && git diff --cached --numstat -- . \
       ':(exclude)*.lock' ':(exclude)*lock.json' \
       ':(exclude,glob)**/migrations/**' ':(exclude,glob)**/fixtures/**' \
       ':(exclude)*task.md' \
       | awk '{s+=$1+$2} END{print (s?s:0) " LOC"}'
     ```
   - If > 200 gross LOC, unstage (`git reset`), split the step in `docs/plans/qlhk-client/qlhk-client-merge-qlcs.task.md` into `Step K.a` and `Step K.b` (without renumbering subsequent steps), and execute `Step K.a` first:
     1. Save the `Step K.b` changes to an isolated patch file inside `.git/`:
        ```bash
        mkdir -p .git/roadmap-stash
        git diff -- <step_Kb_files> > ".git/roadmap-stash/qlhk-client-merge-qlcs-K.b.patch"
        git checkout -- <step_Kb_files>
        git clean -fd -- <step_Kb_new_files>
        ```
     2. Record `Deferred Patch: .git/roadmap-stash/qlhk-client-merge-qlcs-K.b.patch` under `Step K.b` in `docs/plans/qlhk-client/qlhk-client-merge-qlcs.task.md`. Never commit `Step K.b` changes inside `Step K.a`.
     3. When `Step K.b` starts, apply the saved patch via `git apply ".git/roadmap-stash/qlhk-client-merge-qlcs-K.b.patch"`, and immediately after committing `Step K.b`, delete the patch file via `rm -f ".git/roadmap-stash/qlhk-client-merge-qlcs-K.b.patch"`. Each committed sub-step (`Step K.a`, `Step K.b`) counts as **1 step** toward the 4-step session handoff counter.
5. ATOMIC COMMITS & COMMIT HOOKS:
   - After scoped tests pass, update `docs/plans/qlhk-client/qlhk-client-merge-qlcs.task.md` (`[x]` + any new gotchas) and commit using semantic types (`feat`, `fix`, `refactor`, `test`, `perf`, `chore`):
     `git add -A && git commit -m "<type>(roadmap): complete step K - <title>"`
   - Never use `--no-verify`; hook failures caused by the agent's own change are code attempts; infrastructure/hook-tool failures are not.
   - Verify working tree is 100% clean after commit (`test -z "$(git status --porcelain)"`).
6. SAFE CIRCUIT BREAKER ROLLBACK & UNBLOCKING:
   - **What Counts as an Attempt**: A single cycle of implementing/modifying code for the current step followed by a failing scoped test, failing per-step static/typecheck command, or a pre-commit hook failure caused by the agent's own code change. Transient infrastructure, port, network, or runner errors do not count as code attempts.
   - **Pre-Retry Reset Rule (Before Attempt 2 and Attempt 3)**: Before starting each retry attempt (`Attempt 2` or `Attempt 3`), reset all tracked and untracked code changes back to the last committed checkpoint while preserving `docs/plans/qlhk-client/qlhk-client-merge-qlcs.task.md`:
     ```bash
     cp docs/plans/qlhk-client/qlhk-client-merge-qlcs.task.md ".git/roadmap-task-qlhk-client-merge-qlcs.md.bak"
     git restore --staged . && git checkout -- . && git clean -fd -e docs/plans/qlhk-client/qlhk-client-merge-qlcs.task.md -e docs/plans/*.task.md -e task.md
     mv ".git/roadmap-task-qlhk-client-merge-qlcs.md.bak" docs/plans/qlhk-client/qlhk-client-merge-qlcs.task.md
     ```
   - **Counter Reset Rule**: The 3-attempt counter is scoped per step and resets to `0` when: (a) a step passes verification and is committed (`[x]`), or (b) the user provides unblocking guidance after a `[!]` halt and the step is transitioned from `[!]` back to `[/]`.
   - If a step fails after 3 consecutive code attempts, preserve the 3rd attempt's WIP on a unique branch and restore `roadmap/qlhk-client-merge-qlcs` cleanly:
     ```bash
     ATTEMPT_TS=$(date +%s)
     git switch -c "failed/qlhk-client-merge-qlcs/step-K-attempt-${ATTEMPT_TS}"
     git add -A && git commit -m "wip: failed step K attempt after 3 tries"
     git switch "roadmap/qlhk-client-merge-qlcs"
     git add docs/plans/qlhk-client/qlhk-client-merge-qlcs.task.md && git commit -m "chore(roadmap): mark step K blocked"
     ```
   - Halt and await user guidance. Never delete `failed/qlhk-client-merge-qlcs/*` branches automatically.
   - Unblocking procedure: Once user provides guidance, ensure you are on `roadmap/qlhk-client-merge-qlcs`, change `[!]` back to `[/]` in `docs/plans/qlhk-client/qlhk-client-merge-qlcs.task.md`, and retry Step K from the clean Step K-1 checkpoint.
7. SCOPED TESTS, PER-STEP STATIC CHECK, FLAKY POLICY VS FULL SUITE:
   - Run fast scoped tests AND the per-step static/typecheck command (`cd QLHK/QLHK-Client && npx tsc --noEmit`) at each step.
   - Run the full test suite and full typecheck at session handoffs and at the final verification gate (`Step 6`).
   - **Flaky Test Policy**: The Step 0 baseline test run is executed **twice**; any test failing in **either** run is recorded under `Known Baseline / Flaky Failures` in `docs/plans/qlhk-client/qlhk-client-merge-qlcs.task.md`. During `STEP K`, handoffs, or `STEP 6`, any **new** test failure (not listed in `Known Baseline / Flaky Failures`) must be **re-run once** before being counted as a regression or code attempt failure.
   - Enforce zero confirmed new failures compared to the baseline recorded in Step 0.
8. FRESH CONTEXT HANDOFF (EVERY 4 IMPLEMENTATION STEPS IN SESSION OR ON USER REQUEST):
   - After completing 4 implementation steps (`Step 1`..`Step 4`) in the current session, or immediately when requested by the user, run the full test suite, verify a clean working tree, output the embedded `SESSION HANDOFF CHECKPOINT` block at the bottom of this prompt, and **STOP immediately**.
9. MINIMAL WORKING DIFF & ZERO COMMENTS IN CODE:
   - Shortest working code, strict YAGNI, zero unrequested abstractions, zero temporary scratch scripts (`fix*.js`, `patch*.py`, `temp*`).
   - **ZERO COMMENTS IN CODE**: Absolutely no comments (`//`, `/* ... */`, `#`, JSDoc/TSDoc, HTML comments) in any new or modified code.

---

### STEP 0: BRANCH ISOLATION, PRE-FLIGHT GATE & TASK INITIALIZATION
1. Capture the current branch as `BASE_BRANCH` (`BASE_BRANCH=$(git branch --show-current)`), verify `HEAD` is not detached (`test -n "$BASE_BRANCH"`, halting if detached), and if `$BASE_BRANCH` is protected (`main`/`master`/`production`), confirm with the user whether to use it as `BASE_BRANCH` or switch first; then create and switch to branch: `git switch -c roadmap/qlhk-client-merge-qlcs` (if branch already exists, halt and ask user whether to resume or rename).
2. Verify clean working tree: `test -z "$(git status --porcelain)"` (Must exit 0).
3. Capture baseline commit hash via `git rev-parse --short HEAD` and run baseline tests **twice**: `cd QLHK/QLHK-Client && npm test && npm test` -> Record total passing count and exact names of any tests failing in **either** run as "flaky/known failing".
4. Create `docs/plans/qlhk-client/qlhk-client-merge-qlcs.task.md` with this exact content (replace `<BASE_BRANCH>`, `<BASELINE_HASH>`, and `<PASS_COUNT>` with actual values from steps 1 and 3):

```markdown
# Task Progress Tracker

- **Project**: QLHK-Client
- **Base Branch**: `<BASE_BRANCH>`
- **Branch**: `roadmap/qlhk-client-merge-qlcs`
- **Plan Reference**: `docs/plans/qlhk-client/qlhk-client-merge-qlcs.md`
- **Roadmap Prompt Reference**: `docs/plans/qlhk-client/qlhk-client-merge-qlcs.roadmap.md`
- **Baseline Checkpoint**: `<BASELINE_HASH>` (<PASS_COUNT> passing, verified across 2 baseline runs)
- **Known Baseline / Flaky Failures (Failed in Either Baseline Run)**:
  - None
- **Status Legend**: 
  - `[ ]` Pending
  - `[/]` In Progress
  - `[x]` Completed
  - `[!]` Blocked (Circuit Breaker Tripped)

## Implementation Steps

- [ ] `Step 0`: Setup isolated branch `roadmap/qlhk-client-merge-qlcs`, baseline verification & task tracker
- [ ] `Step 1`: Client Policy API Layer & State Types
- [ ] `Step 2`: Client Navigation & Desktop Window Configuration
- [ ] `Step 3`: Client Chúc Thọ Page & Management Modals
- [ ] `Step 4`: Client Hỗ Trợ Xã Hội Page & Modals
- [ ] `Step 5`: Client Policy Analytics Dashboard Page & Route Wiring
- [ ] `Step 6`: Final Verification Gate (Full test suite, static typecheck & clean tree)

## Project Gotchas & Learned Invariants
- P0: Zero Comments in Code.
- Tauri v2 Desktop: Use React.lazy() for all policy pages to maintain ~10MB lightweight bundle.
- Re-use existing UI components (CustomSelect, Modal, TablePagination) and Lucide icons.
```

5. Commit tracker: `git add docs/plans/qlhk-client/qlhk-client-merge-qlcs.task.md && git commit -m "chore(roadmap): init qlhk-client-merge-qlcs.task.md"`

---

### STEP 1: Client Policy API Layer & State Types
- START STEP:
+ Update `docs/plans/qlhk-client/qlhk-client-merge-qlcs.task.md`: Mark Step 1 as `[/]`
- **Target Files**: `QLHK/QLHK-Client/src/types/policy.ts`, `QLHK/QLHK-Client/src/api/policyApi.ts`, `QLHK/QLHK-Client/src/api/__tests__/policyApi.test.ts`
- **Assigned Role**: `.agents/frontend-developer.md`
- **Role Focus**: TypeScript interfaces, Axios client wrapper, typed error handling, REST contracts, zero comments.
- **Graph Check**: `None (new API client)`
- **Actions**:
  1. Create `src/types/policy.ts` defining types for Chúc thọ and HTXH records, milestone filters, and analytics summaries.
  2. Create `src/api/policyApi.ts` implementing `getChuctho`, `getHtxh`, `toggleReceived`, `getAnalytics`, `importExcel`, `exportExcel`.
  3. Create `src/api/__tests__/policyApi.test.ts` asserting all endpoints call Axios correctly.
- **Verification Commands**:
  - Scoped Test: `cd QLHK/QLHK-Client && npx vitest run src/api/__tests__/policyApi.test.ts`
  - Per-Step Static Check: `cd QLHK/QLHK-Client && npx tsc --noEmit`
- **Scope Hygiene & Commit**:
  - Review `git status --short`.
  - Check DIFF GATE (<= 200 gross LOC).
  - Update `docs/plans/qlhk-client/qlhk-client-merge-qlcs.task.md`: Mark Step 1 as `[x]`.
  - Commit: `git add -A && git commit -m "feat(roadmap): complete step 1 - client policy api layer and state types"`
  - Verify clean working tree (`test -z "$(git status --porcelain)"`).

---

### STEP 2: Client Navigation & Desktop Window Configuration
- START STEP:
+ Update `docs/plans/qlhk-client/qlhk-client-merge-qlcs.task.md`: Mark Step 2 as `[/]`
- **Target Files**: `QLHK/QLHK-Client/src/components/Layout/Sidebar.tsx`, `QLHK/QLHK-Client/src-tauri/tauri.conf.json`, `QLHK/QLHK-Client/src/components/Layout/__tests__/SidebarPolicy.test.tsx`
- **Assigned Role**: `.agents/frontend-developer.md`
- **Role Focus**: Tauri configuration, navigation sidebar, accessible icons, responsive layout, zero comments.
- **Graph Check**: `graft callers Sidebar`
- **Actions**:
  1. In `src/components/Layout/Sidebar.tsx`, add the "CHÍNH SÁCH XÃ HỘI" section with items `chuctho`, `htxh`, and `policy-analytics`.
  2. In `src-tauri/tauri.conf.json`, update the main window title to "Quản Lý Hộ Khẩu & Chính Sách Xã Hội - Xã Đăk Hà".
  3. Create unit test `src/components/Layout/__tests__/SidebarPolicy.test.tsx` verifying tab clicks and active indicators.
- **Verification Commands**:
  - Scoped Test: `cd QLHK/QLHK-Client && npx vitest run src/components/Layout/__tests__/SidebarPolicy.test.tsx`
  - Per-Step Static Check: `cd QLHK/QLHK-Client && npx tsc --noEmit`
- **Scope Hygiene & Commit**:
  - Review `git status --short`.
  - Check DIFF GATE (<= 200 gross LOC).
  - Update `docs/plans/qlhk-client/qlhk-client-merge-qlcs.task.md`: Mark Step 2 as `[x]`.
  - Commit: `git add -A && git commit -m "feat(roadmap): complete step 2 - client navigation and desktop window configuration"`
  - Verify clean working tree (`test -z "$(git status --porcelain)"`).

---

### STEP 3: Client Chúc Thọ Page & Management Modals
- START STEP:
+ Update `docs/plans/qlhk-client/qlhk-client-merge-qlcs.task.md`: Mark Step 3 as `[/]`
- **Target Files**: `QLHK/QLHK-Client/src/pages/ChucThoPage.tsx`, `QLHK/QLHK-Client/src/components/chuctho/ChucThoModal.tsx`, `QLHK/QLHK-Client/src/pages/__tests__/ChucThoPage.test.tsx`
- **Assigned Role**: `.agents/frontend-developer.md`
- **Role Focus**: React components, table presentation, milestone filters, modal form validation, zero comments.
- **Graph Check**: `None (new page component)`
- **Actions**:
  1. Create `src/pages/ChucThoPage.tsx` with milestone pill tabs (60..>100), received toggle checkbox, and search input.
  2. Create `src/components/chuctho/ChucThoModal.tsx` for viewing, creating, and editing elderly profile records.
  3. Create unit test `src/pages/__tests__/ChucThoPage.test.tsx` asserting table rendering and milestone filtering.
- **Verification Commands**:
  - Scoped Test: `cd QLHK/QLHK-Client && npx vitest run src/pages/__tests__/ChucThoPage.test.tsx`
  - Per-Step Static Check: `cd QLHK/QLHK-Client && npx tsc --noEmit`
- **Scope Hygiene & Commit**:
  - Review `git status --short`.
  - Check DIFF GATE (<= 200 gross LOC).
  - Update `docs/plans/qlhk-client/qlhk-client-merge-qlcs.task.md`: Mark Step 3 as `[x]`.
  - Commit: `git add -A && git commit -m "feat(roadmap): complete step 3 - client chuc tho page and management modals"`
  - Verify clean working tree (`test -z "$(git status --porcelain)"`).

---

### STEP 4: Client Hỗ Trợ Xã Hội Page & Modals
- START STEP:
+ Update `docs/plans/qlhk-client/qlhk-client-merge-qlcs.task.md`: Mark Step 4 as `[/]`
- **Target Files**: `QLHK/QLHK-Client/src/pages/HtxhPage.tsx`, `QLHK/QLHK-Client/src/components/htxh/HtxhModal.tsx`, `QLHK/QLHK-Client/src/pages/__tests__/HtxhPage.test.tsx`
- **Assigned Role**: `.agents/frontend-developer.md`
- **Role Focus**: React UI, 6 category pill filters, status toggling, CRUD modal, zero comments.
- **Graph Check**: `None (new page component)`
- **Actions**:
  1. Create `src/pages/HtxhPage.tsx` managing 6 social assistance categories (75+, 70-74 poor, social protection, retirement, insurance survivorship, meritorious persons).
  2. Create `src/components/htxh/HtxhModal.tsx` for adding/editing HTXH beneficiaries.
  3. Create unit test `src/pages/__tests__/HtxhPage.test.tsx` verifying category filtering and status updates.
- **Verification Commands**:
  - Scoped Test: `cd QLHK/QLHK-Client && npx vitest run src/pages/__tests__/HtxhPage.test.tsx`
  - Per-Step Static Check: `cd QLHK/QLHK-Client && npx tsc --noEmit`
- **Scope Hygiene & Commit**:
  - Review `git status --short`.
  - Check DIFF GATE (<= 200 gross LOC).
  - Update `docs/plans/qlhk-client/qlhk-client-merge-qlcs.task.md`: Mark Step 4 as `[x]`.
  - Commit: `git add -A && git commit -m "feat(roadmap): complete step 4 - client htxh page and modals"`
  - Verify clean working tree (`test -z "$(git status --porcelain)"`).

---

### STEP 5: Client Policy Analytics Dashboard Page & Route Wiring
- START STEP:
+ Update `docs/plans/qlhk-client/qlhk-client-merge-qlcs.task.md`: Mark Step 5 as `[/]`
- **Target Files**: `QLHK/QLHK-Client/src/pages/PolicyAnalyticsPage.tsx`, `QLHK/QLHK-Client/src/App.tsx`, `QLHK/QLHK-Client/src/pages/__tests__/PolicyAnalyticsPage.test.tsx`
- **Assigned Role**: `.agents/frontend-developer.md`
- **Role Focus**: Dynamic imports (React.lazy), code splitting, analytics charts, routing integration, zero comments.
- **Graph Check**: `graft callers App`
- **Actions**:
  1. Create `src/pages/PolicyAnalyticsPage.tsx` rendering KPI cards and milestone distribution charts.
  2. In `src/App.tsx`, lazily import `ChucThoPage`, `HtxhPage`, and `PolicyAnalyticsPage` and render them when `activeTab` matches.
  3. Create unit test `src/pages/__tests__/PolicyAnalyticsPage.test.tsx` asserting chart presentation.
- **Verification Commands**:
  - Scoped Test: `cd QLHK/QLHK-Client && npx vitest run src/pages/__tests__/PolicyAnalyticsPage.test.tsx`
  - Per-Step Static Check: `cd QLHK/QLHK-Client && npx tsc --noEmit`
- **Scope Hygiene & Commit**:
  - Review `git status --short`.
  - Check DIFF GATE (<= 200 gross LOC).
  - Update `docs/plans/qlhk-client/qlhk-client-merge-qlcs.task.md`: Mark Step 5 as `[x]`.
  - Commit: `git add -A && git commit -m "feat(roadmap): complete step 5 - client policy analytics dashboard page and route wiring"`
  - Verify clean working tree (`test -z "$(git status --porcelain)"`).

---

### STEP 6: Final Verification Gate & Completion
- START STEP:
+ Update `docs/plans/qlhk-client/qlhk-client-merge-qlcs.task.md`: Mark Step 6 as `[/]`
- **Assigned Role**: `.agents/test-engineer.md`
- **Role Focus**: Full regression verification, static analysis, bundle size check.
- **Actions**:
  1. Run full client test suite: `cd QLHK/QLHK-Client && npm test` (Must pass 100% with 0 regressions vs baseline).
  2. Run TypeScript static typecheck: `cd QLHK/QLHK-Client && npx tsc --noEmit` (Must exit 0 with 0 errors).
  3. Verify production bundle build: `cd QLHK/QLHK-Client && npm run build` (Must complete without errors).
  4. Audit for zero comments in code: verify no comments exist in touched files.
  5. Update `docs/plans/qlhk-client/qlhk-client-merge-qlcs.task.md`: Mark Step 6 as `[x]`.
  6. Final commit: `git add -A && git commit -m "chore(roadmap): complete qlhk-client-merge-qlcs verification gate"`
  7. Verify clean working tree: `test -z "$(git status --porcelain)"`.

---

````text
### 🔄 Session Handoff Checkpoint

Completed <STEPS_COMPLETED_IN_SESSION> step(s) in this session on branch `roadmap/qlhk-client-merge-qlcs` (base branch: `<BASE_BRANCH>`). Full test suite verified.

To resume in a fresh session:
1. Read `docs/plans/qlhk-client/qlhk-client-merge-qlcs.roadmap.md` (the committed original roadmap prompt containing all `STRICT INVARIANTS` and step definitions) then continue — or paste the **ORIGINAL roadmap prompt** below as a fallback.
2. Append or send this resume block immediately after:

```text
Resume execution of the roadmap on branch `roadmap/qlhk-client-merge-qlcs` (base branch: `<BASE_BRANCH>`). Read `docs/plans/qlhk-client/qlhk-client-merge-qlcs.roadmap.md` (the committed original roadmap prompt) for all `STRICT INVARIANTS` and step definitions—or use the original roadmap prompt pasted above as a fallback.

CRITICAL: Do NOT re-execute STEP 0 or any step already marked `[x]` in `docs/plans/qlhk-client/qlhk-client-merge-qlcs.task.md`. The branch and tracker already exist—Invariant 1's `git switch -c` applies only to the initial fresh start.

Directives:
1. Switch to branch: `git switch roadmap/qlhk-client-merge-qlcs`
2. Working tree check:
   - If clean (`test -z "$(git status --porcelain)"` exits 0), proceed to Directive 3.
   - If dirty, inspect `docs/plans/qlhk-client/qlhk-client-merge-qlcs.task.md`:
     + If a step is marked `[/]` (In Progress), proceed to Directive 5 to evaluate WIP changes.
     + If dirty without an in-progress step, halt immediately and alert the user.
3. Context Anchoring (Tier 1): Read `docs/plans/qlhk-client/qlhk-client-merge-qlcs.task.md` (progress, known failures, gotchas), the designated role file (`.agents/frontend-developer.md` if applicable), and the plan header (`docs/plans/qlhk-client/qlhk-client-merge-qlcs.md`). Emit mandatory verification log: `[Context Anchored]: qlhk-client-merge-qlcs.task.md (<status>), frontend-developer.md (<invariants>), qlhk-client-merge-qlcs.md (<goal>)`.
4. Inspect `git log -n 3 --oneline` to confirm the last committed checkpoint.
5. If Step K is marked `[/]` (In Progress) with uncommitted WIP, inspect existing changes via `git status --short` before continuing.
6. If Step K is marked `[!]` (Blocked):
   - Review the failure reason logged in `docs/plans/qlhk-client/qlhk-client-merge-qlcs.task.md`.
   - Await user guidance on the resolution strategy.
   - Upon guidance, update `docs/plans/qlhk-client/qlhk-client-merge-qlcs.task.md` to mark Step K back to `[/]` (In Progress) and resume implementation from the clean Step K-1 commit.
7. Otherwise, proceed with the next pending `[ ]` step following the strict invariants and step definitions in the roadmap prompt pasted above.
```
````
`````
