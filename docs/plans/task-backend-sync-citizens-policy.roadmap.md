# Roadmap Execution Prompt: Sync QLHK Citizens to Policy

`````text
[MANDATORY SYSTEM DIRECTIVE]:
You are executing a multi-step engineering task based on the verified plan at:
QLHK/docs/plans/task-backend-sync-citizens-policy.md

ENVIRONMENT REQUIREMENT:
All shell commands require a POSIX-compatible shell (Git Bash on Windows, WSL, Linux, or macOS).

STRICT INVARIANTS:
1. BRANCH & PRE-FLIGHT (Initial Start Only):
   - Pre-Switch Detached-HEAD & Protected-Branch Guard: Before creating `roadmap/task-backend-sync-citizens-policy`, verify `HEAD` is not detached (`BASE_BRANCH=$(git branch --show-current)` and `test -n "$BASE_BRANCH"`).
   - Create and switch to isolated branch: `git switch -c roadmap/task-backend-sync-citizens-policy`.
   - Verify clean working tree: `test -z "$(git status --porcelain)"`.
   - Execute baseline test command twice: `cd QLHK/QLHK-Backend && npx vitest run tests/unit && npx vitest run tests/unit` -> Record pass count.
2. TWO-TIER READ CADENCE & CONTEXT ANCHORING:
   - Tier 1: Anchor read of `docs/plans/task-backend-sync-citizens-policy.task.md`.
   - Tier 2: Surgical read of exact step files only.
3. GRAPH-AWARE BLAST RADIUS:
   - Use graft or grep/LSP to inspect callers and dependencies before modifying shared controllers.
4. SCOPE HYGIENE & DIFF GATE (<= 200 GROSS LOC):
   - Staged gross diff size <= 200 LOC per step.
5. ATOMIC COMMITS & ZERO COMMENTS IN CODE (P0):
   - NEVER write comments in code. Actively remove comments in touched areas.
   - Commit with semantic types: `feat(roadmap): complete step K - <title>`.
6. SAFE CIRCUIT BREAKER ROLLBACK & UNBLOCKING:
   - Max 3 attempts per step before halting for human review.
7. SCOPED TESTS, PER-STEP STATIC CHECK:
   - Run scoped tests and `npx tsc --noEmit` at each step.
8. FRESH CONTEXT HANDOFF:
   - Output handoff block after 4 implementation steps if needed.
9. MINIMAL WORKING DIFF:
   - Shortest working code, strict YAGNI.

---

### STEP 0: BRANCH ISOLATION, PRE-FLIGHT GATE & TASK INITIALIZATION
1. Capture `BASE_BRANCH=$(git branch --show-current)`. Create branch: `git switch -c roadmap/task-backend-sync-citizens-policy`.
2. Verify clean working tree: `test -z "$(git status --porcelain)"`.
3. Capture baseline commit hash via `git rev-parse --short HEAD` and run baseline tests twice: `cd QLHK/QLHK-Backend && npx vitest run tests/unit && npx vitest run tests/unit`.
4. Create `docs/plans/task-backend-sync-citizens-policy.task.md` with this exact content:

````markdown
# Task Progress Tracker

- **Project**: QLHK Backend Policy Sync
- **Base Branch**: `<BASE_BRANCH>`
- **Branch**: `roadmap/task-backend-sync-citizens-policy`
- **Plan Reference**: `QLHK/docs/plans/task-backend-sync-citizens-policy.md`
- **Roadmap Prompt Reference**: `docs/plans/task-backend-sync-citizens-policy.roadmap.md`
- **Baseline Checkpoint**: `<BASELINE_HASH>` (<PASS_COUNT> passing, verified across 2 baseline runs)
- **Known Baseline / Flaky Failures**:
  - None

- **Status Legend**:
  - `[ ]` Pending
  - `[/]` In Progress
  - `[x]` Completed
  - `[!]` Blocked (Circuit Breaker Tripped)

## Execution Checklist

- [ ] Step 1: Policy Sync Engine Service
  - Target Files: `QLHK/QLHK-Backend/src/services/policySync.service.ts`
  - Role Focus: Data integrity, accurate age milestones, idempotent upsert
  - Diff Budget: <= 200 gross LOC
  - Verification: `npx vitest run tests/unit/policy-sync.test.ts`
  - Static Check: `npx tsc --noEmit`
- [ ] Step 2: Policy Sync Controller & Route Integration
  - Target Files: `QLHK/QLHK-Backend/src/controllers/policySync.controller.ts`, `QLHK/QLHK-Backend/src/routes/policy.routes.ts`
  - Role Focus: RBAC permission, sync trigger endpoint POST /api/policies/sync
  - Diff Budget: <= 200 gross LOC
  - Verification: `npx vitest run tests/unit/policy-sync.test.ts`
  - Static Check: `npx tsc --noEmit`
- [ ] Step 3: Chúc Thọ Date & Exact Filtering Enhancement
  - Target Files: `QLHK/QLHK-Backend/src/controllers/policyChuctho.controller.ts`
  - Role Focus: Filtering by day, month, dob, exact_date, date_from, date_to
  - Diff Budget: <= 200 gross LOC
  - Verification: `npx vitest run tests/unit/policy-chuctho.test.ts`
  - Static Check: `npx tsc --noEmit`
- [ ] Step 4: HTXH Hưu Trí Filtering & Occupation Guard
  - Target Files: `QLHK/QLHK-Backend/src/controllers/policyHtxh.controller.ts`
  - Role Focus: Strict filter for occupation containing 'hưu'
  - Diff Budget: <= 200 gross LOC
  - Verification: `npx vitest run tests/unit/policy-htxh.test.ts`
  - Static Check: `npx tsc --noEmit`
- [ ] Step 5: Immediate Database Synchronization Execution
  - Target Files: `QLHK/QLHK-Backend/scripts/sync-citizens-to-policy.ts`
  - Role Focus: CLI sync execution for 81 senior citizens and retirees
  - Diff Budget: <= 200 gross LOC
  - Verification: `npx tsx scripts/sync-citizens-to-policy.ts`
  - Static Check: `npx tsc --noEmit`
- [ ] Step 6: Full Suite Verification & Zero-Regression Gate
  - Full Test Suite: `cd QLHK/QLHK-Backend && npx vitest run tests/unit`
  - Typecheck: `cd QLHK/QLHK-Backend && npx tsc --noEmit`
  - Clean Working Tree: Verified

## Project Gotchas & Learned Invariants
- P0: Zero comments in all new and edited code.
````

5. Commit tracker: `git add docs/plans/task-backend-sync-citizens-policy.task.md && git commit -m "chore(roadmap): init task-backend-sync-citizens-policy.task.md"`.
6. Verify clean tree: `test -z "$(git status --porcelain)"`.

---

### STEP 1: Policy Sync Engine Service
- START STEP:
  + Update `docs/plans/task-backend-sync-citizens-policy.task.md`: Mark Step 1 as `[/]`
- PRE-REQUISITE READS:
  + Plan Section: QLHK/docs/plans/task-backend-sync-citizens-policy.md (Section 2.1)
  + Role Focus: Extract valid citizens from `citizens` with `household`, filter `age >= 60` for Chúc Thọ and occupation containing 'hưu' for HTXH. Idempotent upsert preserving `received` status.
- ACTIONS:
  1. Create `QLHK/QLHK-Backend/src/services/policySync.service.ts` with `syncCitizensToPolicy(calcYear?: number)`.
  2. Implement Chúc Thọ sync:
     - Compute age based on citizen `dob` and `calcYear`.
     - Filter citizens with `age >= 60`. Compute milestone flags (`age60`..`age_over_100`).
     - Upsert into `chuctho_profiles` matching by `cccd_hash` (or `name_unaccented`, `dob`, `village_id`).
     - Preserve existing `received` value if already present.
  3. Implement HTXH sync:
     - Filter citizens where `occupation` contains 'hưu' (case-insensitive).
     - Upsert into `htxh_profiles` setting `huu_tri = "x"`.
     - Soft-delete or clean up non-retiree profiles in `htxh_profiles`.
- VERIFICATION:
  - Run `cd QLHK/QLHK-Backend && npx tsc --noEmit`
- CHECKPOINT & PROGRESS UPDATE:
  - Update `docs/plans/task-backend-sync-citizens-policy.task.md`: Mark Step 1 as `[x]`
  - Commit: `git add -A && git commit -m "feat(roadmap): complete step 1 - policy sync engine service"`

---

### STEP 2: Policy Sync Controller & Route Integration
- START STEP:
  + Update `docs/plans/task-backend-sync-citizens-policy.task.md`: Mark Step 2 as `[/]`
- PRE-REQUISITE READS:
  + Plan Section: QLHK/docs/plans/task-backend-sync-citizens-policy.md (Section 2.1.4)
  + Role Focus: Expose `POST /api/policies/sync` endpoint in `policy.routes.ts` with admin/user village scope authorization.
- ACTIONS:
  1. Create `QLHK/QLHK-Backend/src/controllers/policySync.controller.ts` with `syncPolicyData` handler calling `syncCitizensToPolicy`.
  2. Register `router.post("/sync", syncPolicyData);` in `QLHK/QLHK-Backend/src/routes/policy.routes.ts`.
  3. Add unit test `tests/unit/policy-sync.test.ts`.
- VERIFICATION:
  - Run `cd QLHK/QLHK-Backend && npx vitest run tests/unit/policy-sync.test.ts`
  - Run `cd QLHK/QLHK-Backend && npx tsc --noEmit`
- CHECKPOINT & PROGRESS UPDATE:
  - Update `docs/plans/task-backend-sync-citizens-policy.task.md`: Mark Step 2 as `[x]`
  - Commit: `git add -A && git commit -m "feat(roadmap): complete step 2 - policy sync controller and route integration"`

---

### STEP 3: Chúc Thọ Date & Exact Filtering Enhancement
- START STEP:
  + Update `docs/plans/task-backend-sync-citizens-policy.task.md`: Mark Step 3 as `[/]`
- PRE-REQUISITE READS:
  + Plan Section: QLHK/docs/plans/task-backend-sync-citizens-policy.md (Section 2.2)
  + Role Focus: Support `day`, `month`, `dob`, `exact_date`, `date_from`, `date_to` in `getChucthoProfiles`.
- ACTIONS:
  1. Update `QLHK/QLHK-Backend/src/controllers/policyChuctho.controller.ts`:
     - Parse `day`, `month`, `dob`, `exact_date`, `date_from`, `date_to` from `req.query`.
     - Build SQL/Prisma filters for date matching.
  2. Update `tests/unit/policy-chuctho.test.ts` to test date filtering query parameters.
- VERIFICATION:
  - Run `cd QLHK/QLHK-Backend && npx vitest run tests/unit/policy-chuctho.test.ts`
  - Run `cd QLHK/QLHK-Backend && npx tsc --noEmit`
- CHECKPOINT & PROGRESS UPDATE:
  - Update `docs/plans/task-backend-sync-citizens-policy.task.md`: Mark Step 3 as `[x]`
  - Commit: `git add -A && git commit -m "feat(roadmap): complete step 3 - chuctho date filtering enhancement"`

---

### STEP 4: HTXH Hưu Trí Filtering & Occupation Guard
- START STEP:
  + Update `docs/plans/task-backend-sync-citizens-policy.task.md`: Mark Step 4 as `[/]`
- PRE-REQUISITE READS:
  + Plan Section: QLHK/docs/plans/task-backend-sync-citizens-policy.md (Section 2.3)
  + Role Focus: In `getHtxhProfiles`, ensure results return valid retiree profiles (`huu_tri = "x"`).
- ACTIONS:
  1. Update `QLHK/QLHK-Backend/src/controllers/policyHtxh.controller.ts`:
     - Ensure query condition requires `huu_tri = "x"` or valid retiree profile.
  2. Update `tests/unit/policy-htxh.test.ts` to test retiree filter condition.
- VERIFICATION:
  - Run `cd QLHK/QLHK-Backend && npx vitest run tests/unit/policy-htxh.test.ts`
  - Run `cd QLHK/QLHK-Backend && npx tsc --noEmit`
- CHECKPOINT & PROGRESS UPDATE:
  - Update `docs/plans/task-backend-sync-citizens-policy.task.md`: Mark Step 4 as `[x]`
  - Commit: `git add -A && git commit -m "feat(roadmap): complete step 4 - htxh huu tri filtering and occupation guard"`

---

### STEP 5: Immediate Database Synchronization Execution
- START STEP:
  + Update `docs/plans/task-backend-sync-citizens-policy.task.md`: Mark Step 5 as `[/]`
- PRE-REQUISITE READS:
  + Plan Section: QLHK/docs/plans/task-backend-sync-citizens-policy.md (Section 2.1.5)
  + Role Focus: Execute standalone sync script to populate 81 citizens >= 60 into `chuctho_profiles` and retirees into `htxh_profiles`.
- ACTIONS:
  1. Create `QLHK/QLHK-Backend/scripts/sync-citizens-to-policy.ts`.
  2. Execute sync script to synchronize live PostgreSQL database.
  3. Verify database record counts for Chúc Thọ and HTXH.
- VERIFICATION:
  - Run `cd QLHK/QLHK-Backend && npx tsx scripts/sync-citizens-to-policy.ts`
  - Run `cd QLHK/QLHK-Backend && npx tsc --noEmit`
- CHECKPOINT & PROGRESS UPDATE:
  - Update `docs/plans/task-backend-sync-citizens-policy.task.md`: Mark Step 5 as `[x]`
  - Commit: `git add -A && git commit -m "feat(roadmap): complete step 5 - immediate database synchronization execution"`

---

### STEP 6: FULL SUITE VERIFICATION & ZERO-REGRESSION GATE
- START STEP:
  + Update `docs/plans/task-backend-sync-citizens-policy.task.md`: Mark Step 6 as `[/]`
- ACTIONS:
  1. Run Full Test Suite: `cd QLHK/QLHK-Backend && npx vitest run tests/unit` (100% passing).
  2. Run Typecheck: `cd QLHK/QLHK-Backend && npx tsc --noEmit` (0 errors).
  3. P0 Zero Comments Audit: scan all modified and new files for comments.
  4. Update `docs/plans/task-backend-sync-citizens-policy.task.md`: Mark Step 6 as `[x]`.
  5. Final Commit: `git add -A && git commit -m "chore(roadmap): complete task-backend-sync-citizens-policy verification gate"`.
- POST-GATE COMPLETION:
  - Confirm completion to user.

---

### SESSION HANDOFF CHECKPOINT TEMPLATE (Output after every 4 implementation steps in a session, unless Step N just finished)

When 4 implementation steps (`Step 0` excluded) are completed in the current session (or when requested by the user), and `Step N` is not yet complete, run full test suite, ensure clean git status, output the block below (replacing `<STEPS_COMPLETED_IN_SESSION>` with the actual count), and STOP immediately:

````text
### 🔄 Session Handoff Checkpoint

Completed <STEPS_COMPLETED_IN_SESSION> step(s) in this session on branch `roadmap/task-backend-sync-citizens-policy` (base branch: `<BASE_BRANCH>`). Full test suite verified.

To resume in a fresh session:
1. Read `docs/plans/task-backend-sync-citizens-policy.roadmap.md` then continue.
2. Append or send this resume block immediately after:

```text
Resume execution of the roadmap on branch `roadmap/task-backend-sync-citizens-policy` (base branch: `<BASE_BRANCH>`). Read `docs/plans/task-backend-sync-citizens-policy.roadmap.md` for all STRICT INVARIANTS and step definitions.

CRITICAL: Do NOT re-execute STEP 0 or any step already marked `[x]` in `docs/plans/task-backend-sync-citizens-policy.task.md`.

Directives:
1. Switch to branch: `git switch roadmap/task-backend-sync-citizens-policy`
2. Working tree check: Verify clean tree.
3. Inspect `git log -n 3 --oneline` to confirm last checkpoint.
4. Proceed with next pending `[ ]` step.
```
````
`````
