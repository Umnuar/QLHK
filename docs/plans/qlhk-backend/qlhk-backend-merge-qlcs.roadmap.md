`````text
[MANDATORY SYSTEM DIRECTIVE]:
You are executing a multi-step engineering task based on the verified plan at:
docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.md

ENVIRONMENT REQUIREMENT:
All shell commands require a POSIX-compatible shell (Git Bash on Windows, WSL, Linux, or macOS).

STRICT INVARIANTS:
1. BRANCH & PRE-FLIGHT (Initial Start Only):
   - **Pre-Switch Detached-HEAD & Protected-Branch Guard**: Before creating `roadmap/qlhk-backend-merge-qlcs`, verify `HEAD` is not detached (`BASE_BRANCH=$(git branch --show-current)` and `test -n "$BASE_BRANCH"`; if empty/detached, halt immediately and ask the user to check out a named branch first). If `$BASE_BRANCH` is a protected branch (`main`, `master`, or `production`), ask the user whether to branch `roadmap/qlhk-backend-merge-qlcs` directly from `$BASE_BRANCH` (recording it as `Base Branch`) or switch to a feature/planning branch first.
   - Create and switch to isolated branch: `git switch -c roadmap/qlhk-backend-merge-qlcs`. If the branch already exists on a fresh start, halt immediately and ask the user whether to resume the existing branch or choose a new branch name. (When resuming via a Handoff Prompt, skip `STEP 0` and use `git switch roadmap/qlhk-backend-merge-qlcs`.)
   - Verify clean working tree: `test -z "$(git status --porcelain)"`.
   - Execute the baseline test command **twice** (`Run 1` and `Run 2`), record `Base Branch: <BASE_BRANCH>`, the passing count, and exact names of any tests failing in **either** run as "flaky/known failing" into `docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.task.md`, and immediately commit the task tracker. Never build on an uncommitted dirty tree.
2. TWO-TIER READ CADENCE & CONTEXT ANCHORING:
   - **Tier 1 (Session / Task Initialization)**: At `STEP 0`, when resuming from a handoff, or after a `/compact` event, perform a one-time anchor read of: `docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.task.md`, `.agents/backend-architect.md` (if present in repo), and the plan header (`docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.md`). Emit mandatory proof-of-read log before taking action:
     `[Context Anchored]: qlhk-backend-merge-qlcs.task.md (<status>), backend-architect.md (<invariants>), qlhk-backend-merge-qlcs.md (<goal>)`
   - **Tier 2 (In-Session Atomic Step K)**: Never re-read the entire plan or role file at each step. Rely on inlined instructions inside `STEP K` (or read only the exact surgical slice `### Section K: ...`, `<= 30 lines`). Follow the embedded `Role Focus` invariants and only read code files strictly inside `Target Files`. Review `## Project Gotchas & Learned Invariants` in `docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.task.md` before starting a step.
3. GRAPH-AWARE BLAST RADIUS:
   - When a step specifies a `GRAPH-MAP CHECK`, check if the tool (`graft`, `graphify`, `codegraph`) is installed before querying callers/callees. Fall back to native grep or LSP find-references if unavailable.
4. SCOPE HYGIENE & DIFF GATE (<= 200 GROSS LOC):
   - After implementing changes and BEFORE staging, run `git status --short`. Note that tracker modifications (`[/]`) in `docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.task.md` are expected—never reset or delete the tracker. If out-of-scope files (`.env*`, scratch scripts, build artifacts) appear, reset (`git reset <file>`), delete, or add to `.gitignore`.
   - Run the **DIFF GATE** command to stage changes and verify gross diff size (added + deleted lines) <= 200 LOC per step, excluding lockfiles, migrations, fixtures, and task trackers:
     ```bash
     git add -A && git diff --cached --numstat -- . \
       ':(exclude)*.lock' ':(exclude)*lock.json' \
       ':(exclude,glob)**/migrations/**' ':(exclude,glob)**/fixtures/**' \
       ':(exclude)*task.md' \
       | awk '{s+=$1+$2} END{print (s?s:0) " LOC"}'
     ```
   - If > 200 gross LOC, unstage (`git reset`), split the step in `docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.task.md` into `Step K.a` and `Step K.b` (without renumbering subsequent steps), and execute `Step K.a` first:
     1. Save the `Step K.b` changes to an isolated patch file inside `.git/`:
        ```bash
        mkdir -p .git/roadmap-stash
        git diff -- <step_Kb_files> > ".git/roadmap-stash/qlhk-backend-merge-qlcs-K.b.patch"
        git checkout -- <step_Kb_files>
        git clean -fd -- <step_Kb_new_files>
        ```
     2. Record `Deferred Patch: .git/roadmap-stash/qlhk-backend-merge-qlcs-K.b.patch` under `Step K.b` in `docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.task.md`. Never commit `Step K.b` changes inside `Step K.a`.
     3. When `Step K.b` starts, apply the saved patch via `git apply ".git/roadmap-stash/qlhk-backend-merge-qlcs-K.b.patch"`, and immediately after committing `Step K.b`, delete the patch file via `rm -f ".git/roadmap-stash/qlhk-backend-merge-qlcs-K.b.patch"`. Each committed sub-step (`Step K.a`, `Step K.b`) counts as **1 step** toward the 4-step session handoff counter.
5. ATOMIC COMMITS & COMMIT HOOKS:
   - After scoped tests pass, update `docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.task.md` (`[x]` + any new gotchas) and commit using semantic types (`feat`, `fix`, `refactor`, `test`, `perf`, `chore`):
     `git add -A && git commit -m "<type>(roadmap): complete step K - <title>"`
   - Never use `--no-verify`; hook failures caused by the agent's own change are code attempts; infrastructure/hook-tool failures are not.
   - Verify working tree is 100% clean after commit (`test -z "$(git status --porcelain)"`).
6. SAFE CIRCUIT BREAKER ROLLBACK & UNBLOCKING:
   - **What Counts as an Attempt**: A single cycle of implementing/modifying code for the current step followed by a failing scoped test, failing per-step static/typecheck command, or a pre-commit hook failure caused by the agent's own code change. Transient infrastructure, port, network, or runner errors do not count as code attempts.
   - **Pre-Retry Reset Rule (Before Attempt 2 and Attempt 3)**: Before starting each retry attempt (`Attempt 2` or `Attempt 3`), reset all tracked and untracked code changes back to the last committed checkpoint while preserving `docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.task.md`:
     ```bash
     cp docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.task.md ".git/roadmap-task-qlhk-backend-merge-qlcs.md.bak"
     git restore --staged . && git checkout -- . && git clean -fd -e docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.task.md -e docs/plans/*.task.md -e task.md
     mv ".git/roadmap-task-qlhk-backend-merge-qlcs.md.bak" docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.task.md
     ```
   - **Counter Reset Rule**: The 3-attempt counter is scoped per step and resets to `0` when: (a) a step passes verification and is committed (`[x]`), or (b) the user provides unblocking guidance after a `[!]` halt and the step is transitioned from `[!]` back to `[/]`.
   - If a step fails after 3 consecutive code attempts, preserve the 3rd attempt's WIP on a unique branch and restore `roadmap/qlhk-backend-merge-qlcs` cleanly:
     ```bash
     ATTEMPT_TS=$(date +%s)
     git switch -c "failed/qlhk-backend-merge-qlcs/step-K-attempt-${ATTEMPT_TS}"
     git add -A && git commit -m "wip: failed step K attempt after 3 tries"
     git switch "roadmap/qlhk-backend-merge-qlcs"
     git add docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.task.md && git commit -m "chore(roadmap): mark step K blocked"
     ```
   - Halt and await user guidance. Never delete `failed/qlhk-backend-merge-qlcs/*` branches automatically.
   - Unblocking procedure: Once user provides guidance, ensure you are on `roadmap/qlhk-backend-merge-qlcs`, change `[!]` back to `[/]` in `docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.task.md`, and retry Step K from the clean Step K-1 checkpoint.
7. SCOPED TESTS, PER-STEP STATIC CHECK, FLAKY POLICY VS FULL SUITE:
   - Run fast scoped tests AND the per-step static/typecheck command (`cd QLHK/QLHK-Backend && npx tsc --noEmit`) at each step.
   - Run the full test suite and full typecheck at session handoffs and at the final verification gate (`Step 8`).
   - **Flaky Test Policy**: The Step 0 baseline test run is executed **twice**; any test failing in **either** run is recorded under `Known Baseline / Flaky Failures` in `docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.task.md`. During `STEP K`, handoffs, or `STEP 8`, any **new** test failure (not listed in `Known Baseline / Flaky Failures`) must be **re-run once** before being counted as a regression or code attempt failure.
   - Enforce zero confirmed new failures compared to the baseline recorded in Step 0.
8. FRESH CONTEXT HANDOFF (EVERY 4 IMPLEMENTATION STEPS IN SESSION OR ON USER REQUEST):
   - After completing 4 implementation steps (`Step 1`..`Step 4`) in the current session, or immediately when requested by the user, run the full test suite, verify a clean working tree, output the embedded `SESSION HANDOFF CHECKPOINT` block at the bottom of this prompt, and **STOP immediately**.
9. MINIMAL WORKING DIFF & ZERO COMMENTS IN CODE:
   - Shortest working code, strict YAGNI, zero unrequested abstractions, zero temporary scratch scripts (`fix*.js`, `patch*.py`, `temp*`).
   - **ZERO COMMENTS IN CODE**: Absolutely no comments (`//`, `/* ... */`, `#`, JSDoc/TSDoc, HTML comments) in any new or modified code.

---

### STEP 0: BRANCH ISOLATION, PRE-FLIGHT GATE & TASK INITIALIZATION
1. Capture the current branch as `BASE_BRANCH` (`BASE_BRANCH=$(git branch --show-current)`), verify `HEAD` is not detached (`test -n "$BASE_BRANCH"`, halting if detached), and if `$BASE_BRANCH` is protected (`main`/`master`/`production`), confirm with the user whether to use it as `BASE_BRANCH` or switch first; then create and switch to branch: `git switch -c roadmap/qlhk-backend-merge-qlcs` (if branch already exists, halt and ask user whether to resume or rename).
2. Verify clean working tree: `test -z "$(git status --porcelain)"` (Must exit 0).
3. Capture baseline commit hash via `git rev-parse --short HEAD` and run baseline tests **twice**: `cd QLHK/QLHK-Backend && npx vitest run tests/unit tests/security/crypto.test.ts tests/security/rbac.test.ts && npx vitest run tests/unit tests/security/crypto.test.ts tests/security/rbac.test.ts` -> Record total passing count and exact names of any tests failing in **either** run as "flaky/known failing".
4. Create `docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.task.md` with this exact content (replace `<BASE_BRANCH>`, `<BASELINE_HASH>`, and `<PASS_COUNT>` with actual values from steps 1 and 3):

```markdown
# Task Progress Tracker

- **Project**: QLHK-Backend
- **Base Branch**: `<BASE_BRANCH>`
- **Branch**: `roadmap/qlhk-backend-merge-qlcs`
- **Plan Reference**: `docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.md`
- **Roadmap Prompt Reference**: `docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.roadmap.md`
- **Baseline Checkpoint**: `<BASELINE_HASH>` (<PASS_COUNT> passing, verified across 2 baseline runs)
- **Known Baseline / Flaky Failures (Failed in Either Baseline Run)**:
  - None
- **Status Legend**: 
  - `[ ]` Pending
  - `[/]` In Progress
  - `[x]` Completed
  - `[!]` Blocked (Circuit Breaker Tripped)

## Implementation Steps

- [ ] `Step 0`: Setup isolated branch `roadmap/qlhk-backend-merge-qlcs`, baseline verification & task tracker
- [ ] `Step 1`: Prisma Schema Integration & DDL Extension
- [ ] `Step 2`: Policy DTO Types & Shared Age Calculation Engine
- [ ] `Step 3`: Database ETL & CCCD Re-encryption Migration Script
- [ ] `Step 4`: Backend Chúc Thọ Policy Controller & Service
- [ ] `Step 5`: Backend Hỗ Trợ Xã Hội (HTXH) Policy Controller & Service
- [ ] `Step 6`: Backend Policy Analytics & Excel Export/Import Controllers
- [ ] `Step 7`: Backend Policy Routes & RBAC Middleware Integration
- [ ] `Step 8`: Final Verification Gate (Full test suite, static typecheck & clean tree)

## Project Gotchas & Learned Invariants
- P0: Zero Comments in Code.
- Model names: `chuctho_profiles`, `htxh_profiles`, `profile_audit_log`.
- All policy endpoints mounted under `/api/policies/*` with `authenticateToken` and `authorizeVillage`.
```

5. Commit tracker: `git add docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.task.md && git commit -m "chore(roadmap): init qlhk-backend-merge-qlcs.task.md"`

---

### STEP 1: Prisma Schema Integration & DDL Extension
- START STEP:
+ Update `docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.task.md`: Mark Step 1 as `[/]`
- **Target Files**: `QLHK/QLHK-Backend/prisma/schema.prisma`
- **Assigned Role**: `.agents/database-architect.md`
- **Role Focus**: Database schema design, non-breaking additive DDL extensions, relation integrity, zero comments.
- **Graph Check**: `graft callers villages`
- **Actions**:
  1. Add `chuctho_profiles` model to `schema.prisma` with age milestone fields (`age60`..`age_over_100`), indexes, and relation to `villages`.
  2. Add `htxh_profiles` model to `schema.prisma` with 6 assistance fields and relation to `villages`.
  3. Add `profile_audit_log` model to `schema.prisma` with relation to `users`.
  4. Update `villages` with `chuctho_profiles[]` and `htxh_profiles[]`; update `users` with `profile_audit_log[]`.
  5. Run `npx prisma generate` to rebuild Prisma client.
- **Verification Commands**:
  - Scoped Test: `cd QLHK/QLHK-Backend && npx prisma validate && npx tsc --noEmit`
  - Per-Step Static Check: `cd QLHK/QLHK-Backend && npx tsc --noEmit`
- **Scope Hygiene & Commit**:
  - Review `git status --short`.
  - Check DIFF GATE (<= 200 gross LOC).
  - Update `docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.task.md`: Mark Step 1 as `[x]`.
  - Commit: `git add -A && git commit -m "feat(roadmap): complete step 1 - prisma schema integration and ddl extension"`
  - Verify clean working tree (`test -z "$(git status --porcelain)"`).

---

### STEP 2: Policy DTO Types & Shared Age Calculation Engine
- START STEP:
+ Update `docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.task.md`: Mark Step 2 as `[/]`
- **Target Files**: `QLHK/QLHK-Backend/src/types/policy.types.ts`, `QLHK/QLHK-Backend/src/utils/age.ts`, `QLHK/QLHK-Backend/tests/unit/age-milestones.test.ts`
- **Assigned Role**: `.agents/backend-architect.md`
- **Role Focus**: Pure calculation utilities, type-safe DTOs, zero-allocation algorithms, zero comments.
- **Graph Check**: `None (greenfield utilities)`
- **Actions**:
  1. Create `src/types/policy.types.ts` defining input and output DTOs for Chúc thọ and HTXH records.
  2. Port and adapt `parseDobValue`, `computeChucthoMilestones`, and `computeHtxhMilestones` into `src/utils/age.ts` with zero comments.
  3. Create unit test `tests/unit/age-milestones.test.ts` verifying all milestones (60..>100) and 6 HTXH categories.
- **Verification Commands**:
  - Scoped Test: `cd QLHK/QLHK-Backend && npx vitest run tests/unit/age-milestones.test.ts`
  - Per-Step Static Check: `cd QLHK/QLHK-Backend && npx tsc --noEmit`
- **Scope Hygiene & Commit**:
  - Review `git status --short`.
  - Check DIFF GATE (<= 200 gross LOC).
  - Update `docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.task.md`: Mark Step 2 as `[x]`.
  - Commit: `git add -A && git commit -m "feat(roadmap): complete step 2 - policy dto types and shared age calculation engine"`
  - Verify clean working tree (`test -z "$(git status --porcelain)"`).

---

### STEP 3: Database ETL & CCCD Re-encryption Migration Script
- START STEP:
+ Update `docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.task.md`: Mark Step 3 as `[/]`
- **Target Files**: `QLHK/QLHK-Backend/scripts/migrate-qlcs-to-qlhk.ts`, `QLHK/QLHK-Backend/tests/unit/migrate-qlcs.test.ts`
- **Assigned Role**: `.agents/data-engineer.md`
- **Role Focus**: Data migration, UUID foreign key harmonization, cryptographic key translation, transaction safety, zero comments.
- **Graph Check**: `graft callers encryptCCCD`
- **Actions**:
  1. Implement `buildVillageMapping` to map QLCS village IDs to QLHK village IDs based on unaccented names and codes.
  2. Implement `reEncryptCCCD` to decrypt QLCS CCCD in RAM and re-encrypt with QLHK `ENCRYPTION_KEY` and `CCCD_HASH_PEPPER`.
  3. Build safe migration script with `--dry-run` flag in `scripts/migrate-qlcs-to-qlhk.ts`.
  4. Create unit test `tests/unit/migrate-qlcs.test.ts` verifying in-memory transformation and re-encryption.
- **Verification Commands**:
  - Scoped Test: `cd QLHK/QLHK-Backend && npx vitest run tests/unit/migrate-qlcs.test.ts`
  - Per-Step Static Check: `cd QLHK/QLHK-Backend && npx tsc --noEmit`
- **Scope Hygiene & Commit**:
  - Review `git status --short`.
  - Check DIFF GATE (<= 200 gross LOC).
  - Update `docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.task.md`: Mark Step 3 as `[x]`.
  - Commit: `git add -A && git commit -m "feat(roadmap): complete step 3 - database etl and cccd re-encryption migration script"`
  - Verify clean working tree (`test -z "$(git status --porcelain)"`).

---

### STEP 4: Backend Chúc Thọ Policy Controller & Service
- START STEP:
+ Update `docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.task.md`: Mark Step 4 as `[/]`
- **Target Files**: `QLHK/QLHK-Backend/src/controllers/policyChuctho.controller.ts`, `QLHK/QLHK-Backend/tests/unit/policy-chuctho.test.ts`
- **Assigned Role**: `.agents/backend-architect.md`
- **Role Focus**: REST controller, pagination, stream NDJSON, optimistic concurrency control (OCC), soft-delete, zero comments.
- **Graph Check**: `graft callers prisma`
- **Actions**:
  1. Create `src/controllers/policyChuctho.controller.ts` with `getChucthoProfiles` (pagination, search, milestone filtering).
  2. Implement `getChucthoStream` for large NDJSON data streaming with disconnect cleanup.
  3. Implement `createChucthoProfile`, `updateChucthoProfile` (with OCC version locking), `markChucthoReceived`, and soft-delete `deleteChucthoProfile`.
  4. Create unit test `tests/unit/policy-chuctho.test.ts` testing CRUD and OCC version collision handling.
- **Verification Commands**:
  - Scoped Test: `cd QLHK/QLHK-Backend && npx vitest run tests/unit/policy-chuctho.test.ts`
  - Per-Step Static Check: `cd QLHK/QLHK-Backend && npx tsc --noEmit`
- **Scope Hygiene & Commit**:
  - Review `git status --short`.
  - Check DIFF GATE (<= 200 gross LOC).
  - Update `docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.task.md`: Mark Step 4 as `[x]`.
  - Commit: `git add -A && git commit -m "feat(roadmap): complete step 4 - backend chuc tho policy controller and service"`
  - Verify clean working tree (`test -z "$(git status --porcelain)"`).

---

### STEP 5: Backend Hỗ Trợ Xã Hội (HTXH) Policy Controller & Service
- START STEP:
+ Update `docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.task.md`: Mark Step 5 as `[/]`
- **Target Files**: `QLHK/QLHK-Backend/src/controllers/policyHtxh.controller.ts`, `QLHK/QLHK-Backend/tests/unit/policy-htxh.test.ts`
- **Assigned Role**: `.agents/backend-architect.md`
- **Role Focus**: REST controller for social assistance, 6 categories filter, NDJSON stream, OCC locking, zero comments.
- **Graph Check**: `graft callers prisma`
- **Actions**:
  1. Create `src/controllers/policyHtxh.controller.ts` with `getHtxhProfiles` supporting 6 assistance category filters.
  2. Implement `getHtxhStream` for large-scale NDJSON exports.
  3. Implement `createHtxhProfile`, `updateHtxhProfile`, `markHtxhReceived`, and `deleteHtxhProfile`.
  4. Create unit test `tests/unit/policy-htxh.test.ts` verifying category querying and status toggling.
- **Verification Commands**:
  - Scoped Test: `cd QLHK/QLHK-Backend && npx vitest run tests/unit/policy-htxh.test.ts`
  - Per-Step Static Check: `cd QLHK/QLHK-Backend && npx tsc --noEmit`
- **Scope Hygiene & Commit**:
  - Review `git status --short`.
  - Check DIFF GATE (<= 200 gross LOC).
  - Update `docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.task.md`: Mark Step 5 as `[x]`.
  - Commit: `git add -A && git commit -m "feat(roadmap): complete step 5 - backend htxh policy controller and service"`
  - Verify clean working tree (`test -z "$(git status --porcelain)"`).

---

### STEP 6: Backend Policy Analytics & Excel Export/Import Controllers
- START STEP:
+ Update `docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.task.md`: Mark Step 6 as `[/]`
- **Target Files**: `QLHK/QLHK-Backend/src/controllers/policyAnalytics.controller.ts`, `QLHK/QLHK-Backend/src/controllers/policyExcel.controller.ts`, `QLHK/QLHK-Backend/tests/unit/policy-analytics.test.ts`
- **Assigned Role**: `.agents/performance-engineer.md`
- **Role Focus**: In-memory caching, aggregated SQL grouping, Excel Smart-Upsert with candidate lookup, zero comments.
- **Graph Check**: `graft callers ExcelJS`
- **Actions**:
  1. Create `src/controllers/policyAnalytics.controller.ts` with 10s In-Memory cache for Chúc thọ and HTXH aggregations.
  2. Create `src/controllers/policyExcel.controller.ts` implementing Smart-Upsert for Excel imports and formatted official exports.
  3. Create unit test `tests/unit/policy-analytics.test.ts` testing cache TTL and aggregation accuracy.
- **Verification Commands**:
  - Scoped Test: `cd QLHK/QLHK-Backend && npx vitest run tests/unit/policy-analytics.test.ts`
  - Per-Step Static Check: `cd QLHK/QLHK-Backend && npx tsc --noEmit`
- **Scope Hygiene & Commit**:
  - Review `git status --short`.
  - Check DIFF GATE (<= 200 gross LOC).
  - Update `docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.task.md`: Mark Step 6 as `[x]`.
  - Commit: `git add -A && git commit -m "feat(roadmap): complete step 6 - backend policy analytics and excel controllers"`
  - Verify clean working tree (`test -z "$(git status --porcelain)"`).

---

### STEP 7: Backend Policy Routes & RBAC Middleware Integration
- START STEP:
+ Update `docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.task.md`: Mark Step 7 as `[/]`
- **Target Files**: `QLHK/QLHK-Backend/src/routes/policy.routes.ts`, `QLHK/QLHK-Backend/src/routes/index.ts`, `QLHK/QLHK-Backend/tests/security/policy-rbac.test.ts`
- **Assigned Role**: `.agents/security-engineer.md`
- **Role Focus**: API routing, RBAC enforcement, village scoping boundary, 403 Forbidden on village mismatch, zero comments.
- **Graph Check**: `graft callers authenticateToken`
- **Actions**:
  1. Create `src/routes/policy.routes.ts` grouping `/chuctho`, `/htxh`, `/analytics`, `/excel` and wrapping them with `authenticateToken` and `authorizeVillage`.
  2. Mount `/policies` into `src/routes/index.ts`.
  3. Create security integration test `tests/security/policy-rbac.test.ts` confirming cross-village 403 Forbidden enforcement.
- **Verification Commands**:
  - Scoped Test: `cd QLHK/QLHK-Backend && npx vitest run tests/security/policy-rbac.test.ts`
  - Per-Step Static Check: `cd QLHK/QLHK-Backend && npx tsc --noEmit`
- **Scope Hygiene & Commit**:
  - Review `git status --short`.
  - Check DIFF GATE (<= 200 gross LOC).
  - Update `docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.task.md`: Mark Step 7 as `[x]`.
  - Commit: `git add -A && git commit -m "feat(roadmap): complete step 7 - backend policy routes and rbac middleware integration"`
  - Verify clean working tree (`test -z "$(git status --porcelain)"`).

---

### STEP 8: Final Verification Gate & Completion
- START STEP:
+ Update `docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.task.md`: Mark Step 8 as `[/]`
- **Assigned Role**: `.agents/test-engineer.md`
- **Role Focus**: Full regression verification, static analysis, clean tree.
- **Actions**:
  1. Run full backend unit and security test suite: `cd QLHK/QLHK-Backend && npx vitest run tests/unit tests/security/crypto.test.ts tests/security/rbac.test.ts` (Must pass with 0 regressions vs baseline).
  2. Run TypeScript static typecheck: `cd QLHK/QLHK-Backend && npx tsc --noEmit` (Must exit 0 with 0 errors).
  3. Audit for zero comments in code: verify no comments exist in touched files.
  4. Update `docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.task.md`: Mark Step 8 as `[x]`.
  5. Final commit: `git add -A && git commit -m "chore(roadmap): complete qlhk-backend-merge-qlcs verification gate"`
  6. Verify clean working tree: `test -z "$(git status --porcelain)"`.

---

### 🔄 Session Handoff Checkpoint

Completed <STEPS_COMPLETED_IN_SESSION> step(s) in this session on branch `roadmap/qlhk-backend-merge-qlcs` (base branch: `<BASE_BRANCH>`). Full test suite verified.

To resume in a fresh session:
1. Read `docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.roadmap.md` (the committed original roadmap prompt containing all `STRICT INVARIANTS` and step definitions) then continue — or paste the **ORIGINAL roadmap prompt** below as a fallback.
2. Append or send this resume block immediately after:

```text
Resume execution of the roadmap on branch `roadmap/qlhk-backend-merge-qlcs` (base branch: `<BASE_BRANCH>`). Read `docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.roadmap.md` (the committed original roadmap prompt) for all `STRICT INVARIANTS` and step definitions—or use the original roadmap prompt pasted above as a fallback.

CRITICAL: Do NOT re-execute STEP 0 or any step already marked `[x]` in `docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.task.md`. The branch and tracker already exist—Invariant 1's `git switch -c` applies only to the initial fresh start.

Directives:
1. Switch to branch: `git switch roadmap/qlhk-backend-merge-qlcs`
2. Working tree check:
   - If clean (`test -z "$(git status --porcelain)"` exits 0), proceed to Directive 3.
   - If dirty, inspect `docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.task.md`:
     + If a step is marked `[/]` (In Progress), proceed to Directive 5 to evaluate WIP changes.
     + If dirty without an in-progress step, halt immediately and alert the user.
3. Context Anchoring (Tier 1): Read `docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.task.md` (progress, known failures, gotchas), the designated role file (`.agents/backend-architect.md` if applicable), and the plan header (`docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.md`). Emit mandatory verification log: `[Context Anchored]: qlhk-backend-merge-qlcs.task.md (<status>), backend-architect.md (<invariants>), qlhk-backend-merge-qlcs.md (<goal>)`.
4. Inspect `git log -n 3 --oneline` to confirm the last committed checkpoint.
5. If Step K is marked `[/]` (In Progress) with uncommitted WIP, inspect existing changes via `git status --short` before continuing.
6. If Step K is marked `[!]` (Blocked):
   - Review the failure reason logged in `docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.task.md`.
   - Await user guidance on the resolution strategy.
   - Upon guidance, update `docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.task.md` to mark Step K back to `[/]` (In Progress) and resume implementation from the clean Step K-1 commit.
7. Otherwise, proceed with the next pending `[ ]` step following the strict invariants and step definitions in the roadmap prompt pasted above.
```
````
`````