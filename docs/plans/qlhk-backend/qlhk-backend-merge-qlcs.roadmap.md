`````text
[MANDATORY SYSTEM DIRECTIVE]:
You are executing a multi-step engineering task based on the verified plan at:
docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.md

ENVIRONMENT REQUIREMENT:
All shell commands require a POSIX-compatible shell (Git Bash on Windows, WSL, Linux, or macOS) or PowerShell.

STRICT INVARIANTS:
1. BRANCH & PRE-FLIGHT (Initial Start Only):
   - **Pre-Switch Detached-HEAD & Protected-Branch Guard**: Before creating `roadmap/qlhk-backend-merge-qlcs`, verify `HEAD` is not detached (`BASE_BRANCH=$(git branch --show-current)` and `test -n "$BASE_BRANCH"`; if empty/detached, halt immediately and ask the user to check out a named branch first). If `$BASE_BRANCH` is a protected branch (`main`, `master`, or `production`), proceed by branching `roadmap/qlhk-backend-merge-qlcs` directly from `$BASE_BRANCH` (recording it as `Base Branch`).
   - Create and switch to isolated branch: `git switch -c roadmap/qlhk-backend-merge-qlcs`. If the branch already exists on a fresh start, resume the existing branch.
   - Verify clean working tree: `test -z "$(git status --porcelain)"`.
   - Execute the baseline test command **twice** (`Run 1` and `Run 2`), record `Base Branch: <BASE_BRANCH>`, the passing count, and exact names of any tests failing in **either** run as "flaky/known failing" into `docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.task.md`, and immediately commit the task tracker.
2. TWO-TIER READ CADENCE & CONTEXT ANCHORING:
   - **Tier 1 (Session / Task Initialization)**: At `STEP 0`, when resuming from a handoff, perform a one-time anchor read of: `docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.task.md`, `.agents/backend-architect.md`, and the plan header (`docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.md`). Emit mandatory proof-of-read log before taking action:
     `[Context Anchored]: qlhk-backend-merge-qlcs.task.md, backend-architect.md, qlhk-backend-merge-qlcs.md`
   - **Tier 2 (In-Session Atomic Step K)**: Never re-read the entire plan at each step. Rely on inlined instructions inside `STEP K`. Follow the embedded `Role Focus` invariants and only read code files strictly inside `Target Files`. Review `## Project Gotchas & Learned Invariants` in `docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.task.md` before starting a step.
3. SCOPE HYGIENE & DIFF GATE (<= 200 GROSS LOC):
   - After implementing changes and BEFORE staging, run `git status --short`. Note that tracker modifications (`[/]`) in `docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.task.md` are expected—never reset or delete the tracker.
   - Run the **DIFF GATE** command to stage changes and verify gross diff size (added + deleted lines) <= 200 LOC per step, excluding lockfiles, migrations, fixtures, and task trackers:
     ```bash
     git add -A && git diff --cached --numstat -- . \
       ':(exclude)*.lock' ':(exclude)*lock.json' \
       ':(exclude,glob)**/migrations/**' ':(exclude,glob)**/fixtures/**' \
       ':(exclude)*task.md' \
       | awk '{s+=$1+$2} END{print (s?s:0) " LOC"}'
     ```
   - If > 200 gross LOC, split the step in `docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.task.md` into `Step K.a` and `Step K.b`.
4. ATOMIC COMMITS & COMMIT HOOKS:
   - After scoped tests pass, update `docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.task.md` (`[x]` + any new gotchas) and commit using semantic types (`feat`, `fix`, `refactor`, `test`, `perf`, `chore`):
     `git add -A && git commit -m "<type>(roadmap): complete step K - <title>"`
   - Verify working tree is 100% clean after commit (`test -z "$(git status --porcelain)"`).
5. CIRCUIT BREAKER ROLLBACK:
   - If a step fails after 3 consecutive attempts, preserve WIP and halt for review.
6. MINIMAL WORKING DIFF & ZERO COMMENTS IN CODE:
   - Shortest working code, strict YAGNI, zero unrequested abstractions, zero temporary scratch scripts.
   - **ZERO COMMENTS IN CODE**: Absolutely no comments (`//`, `/* ... */`, `#`, JSDoc/TSDoc, HTML comments) in any new or modified code.

---

### STEP 0: BRANCH ISOLATION, PRE-FLIGHT GATE & TASK INITIALIZATION
1. Capture `BASE_BRANCH=$(git branch --show-current)`, switch to branch: `git switch -c roadmap/qlhk-backend-merge-qlcs` (or `git switch roadmap/qlhk-backend-merge-qlcs` if it exists).
2. Verify clean working tree: `test -z "$(git status --porcelain)"`.
3. Capture baseline commit hash via `git rev-parse --short HEAD` and run baseline tests twice: `cd QLHK/QLHK-Backend && npx vitest run tests/unit tests/security/crypto.test.ts tests/security/rbac.test.ts`.
4. Create `docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.task.md` with this exact content:

```markdown
# Task Progress Tracker: qlhk-backend-merge-qlcs

- **Project**: QLHK-Backend
- **Base Branch**: `<BASE_BRANCH>`
- **Branch**: `roadmap/qlhk-backend-merge-qlcs`
- **Plan Reference**: `docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.md`
- **Roadmap Prompt Reference**: `docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.roadmap.md`
- **Baseline Checkpoint**: `<BASELINE_HASH>` (<PASS_COUNT> passing, verified across 2 baseline runs)
- **Known Baseline / Flaky Failures**:
  - None
- **Status Legend**: 
  - `[ ]` Pending
  - `[/]` In Progress
  - `[x]` Completed
  - `[!]` Blocked

## Implementation Steps

- [ ] Step 1: Prisma Schema Integration & DDL Extension
  - **Plan Section**: docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.md (Section 1: Prisma Schema Integration & DDL Extension)
  - **Target Files**: QLHK/QLHK-Backend/prisma/schema.prisma
  - **Scoped Test**: cd QLHK/QLHK-Backend && npx prisma validate && npx tsc --noEmit
- [ ] Step 2: Policy DTO Types & Shared Age Calculation Engine
  - **Plan Section**: docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.md (Section 2: Policy DTO Types & Shared Age Calculation Engine)
  - **Target Files**: QLHK/QLHK-Backend/src/types/policy.types.ts, QLHK/QLHK-Backend/src/utils/age.ts, QLHK/QLHK-Backend/tests/unit/age-milestones.test.ts
  - **Scoped Test**: cd QLHK/QLHK-Backend && npx vitest run tests/unit/age-milestones.test.ts
- [ ] Step 3: Database ETL & CCCD Re-encryption Migration Script
  - **Plan Section**: docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.md (Section 3: Database ETL & CCCD Re-encryption Migration Script)
  - **Target Files**: QLHK/QLHK-Backend/scripts/migrate-qlcs-to-qlhk.ts, QLHK/QLHK-Backend/tests/unit/migrate-qlcs.test.ts
  - **Scoped Test**: cd QLHK/QLHK-Backend && npx vitest run tests/unit/migrate-qlcs.test.ts
- [ ] Step 4: Backend Chúc Thọ Policy Controller & Service
  - **Plan Section**: docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.md (Section 4: Backend Chúc Thọ Policy Controller & Service)
  - **Target Files**: QLHK/QLHK-Backend/src/controllers/policyChuctho.controller.ts, QLHK/QLHK-Backend/tests/unit/policy-chuctho.test.ts
  - **Scoped Test**: cd QLHK/QLHK-Backend && npx vitest run tests/unit/policy-chuctho.test.ts
- [ ] Step 5: Backend Hỗ Trợ Xã Hội (HTXH) Policy Controller & Service
  - **Plan Section**: docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.md (Section 5: Backend Hỗ Trợ Xã Hội (HTXH) Policy Controller & Service)
  - **Target Files**: QLHK/QLHK-Backend/src/controllers/policyHtxh.controller.ts, QLHK/QLHK-Backend/tests/unit/policy-htxh.test.ts
  - **Scoped Test**: cd QLHK/QLHK-Backend && npx vitest run tests/unit/policy-htxh.test.ts
- [ ] Step 6: Backend Policy Analytics & Excel Export/Import Controllers
  - **Plan Section**: docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.md (Section 6: Backend Policy Analytics & Excel Export/Import Controllers)
  - **Target Files**: QLHK/QLHK-Backend/src/controllers/policyAnalytics.controller.ts, QLHK/QLHK-Backend/src/controllers/policyExcel.controller.ts, QLHK/QLHK-Backend/tests/unit/policy-analytics.test.ts
  - **Scoped Test**: cd QLHK/QLHK-Backend && npx vitest run tests/unit/policy-analytics.test.ts
- [ ] Step 7: Backend Policy Routes & RBAC Middleware Integration
  - **Plan Section**: docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.md (Section 7: Backend Policy Routes & RBAC Middleware Integration)
  - **Target Files**: QLHK/QLHK-Backend/src/routes/policy.routes.ts, QLHK/QLHK-Backend/src/routes/index.ts, QLHK/QLHK-Backend/tests/security/policy-rbac.test.ts
  - **Scoped Test**: cd QLHK/QLHK-Backend && npx vitest run tests/security/policy-rbac.test.ts
- [ ] Step 8: Final Verification Gate
  - **Plan Section**: docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.md (Section 8: Final Verification Gate)
  - **Scoped Test**: cd QLHK/QLHK-Backend && npx vitest run tests/unit tests/security/crypto.test.ts tests/security/rbac.test.ts && npx tsc --noEmit

## Project Gotchas & Learned Invariants
- Zero Comments In Code invariant must be strictly respected.
```

5. Stage and commit: `git add docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.task.md && git commit -m "chore(roadmap): init qlhk-backend-merge-qlcs.task.md"`.

---

### STEP 1: PRISMA SCHEMA INTEGRATION & DDL EXTENSION
- START STEP:
+ Update `docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.task.md`: Mark Step 1 as `[/]`
- Plan Section: docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.md (Section 1: Prisma Schema Integration & DDL Extension)
- Target Files: `QLHK/QLHK-Backend/prisma/schema.prisma`
- Role Focus: Database schema design, non-breaking additive DDL extensions, relation integrity.
- Actions:
  1. Add model `chuctho_profiles` with fields `age60`..`age_over_100`, GIN index `name_unaccented`, relation with `villages`.
  2. Add model `htxh_profiles` with 6 categories, search indexes, relation with `villages`.
  3. Add model `profile_audit_log` with relation with `users`.
  4. Update reverse relation arrays in `villages` (`chuctho_profiles[]`, `htxh_profiles[]`) and `users` (`profile_audit_log[]`).
  5. Run `npx prisma generate` in `QLHK/QLHK-Backend`.
- Verification:
  - Scoped Test Command: `cd QLHK/QLHK-Backend && npx prisma validate && npx tsc --noEmit`
  - Diff Gate: Gross LOC <= 200.
- Completion:
  - Update `docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.task.md`: Mark Step 1 as `[x]`.
  - Commit: `git add -A && git commit -m "feat(roadmap): complete step 1 - prisma schema integration"`.

---

### STEP 2: POLICY DTO TYPES & SHARED AGE CALCULATION ENGINE
- START STEP:
+ Update `docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.task.md`: Mark Step 2 as `[/]`
- Plan Section: docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.md (Section 2: Policy DTO Types & Shared Age Calculation Engine)
- Target Files: `QLHK/QLHK-Backend/src/types/policy.types.ts`, `QLHK/QLHK-Backend/src/utils/age.ts`, `QLHK/QLHK-Backend/tests/unit/age-milestones.test.ts`
- Role Focus: Pure calculation utilities, type-safe DTOs, zero-allocation algorithms, zero comments.
- Actions:
  1. Create `src/types/policy.types.ts` defining Chuc Tho, HTXH DTOs and query filters.
  2. Port `parseDobValue`, `computeChucthoMilestones`, `computeHtxhMilestones` into `src/utils/age.ts` with zero comments.
  3. Create unit test `tests/unit/age-milestones.test.ts` testing milestones for 60, 65, 70.. >100 and HTXH 6 categories.
- Verification:
  - Scoped Test Command: `cd QLHK/QLHK-Backend && npx vitest run tests/unit/age-milestones.test.ts`
  - Diff Gate: Gross LOC <= 200.
- Completion:
  - Update `docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.task.md`: Mark Step 2 as `[x]`.
  - Commit: `git add -A && git commit -m "feat(roadmap): complete step 2 - policy types and age calculation engine"`.

---

### STEP 3: DATABASE ETL & CCCD RE-ENCRYPTION MIGRATION SCRIPT
- START STEP:
+ Update `docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.task.md`: Mark Step 3 as `[/]`
- Plan Section: docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.md (Section 3: Database ETL & CCCD Re-encryption Migration Script)
- Target Files: `QLHK/QLHK-Backend/scripts/migrate-qlcs-to-qlhk.ts`, `QLHK/QLHK-Backend/tests/unit/migrate-qlcs.test.ts`
- Role Focus: Data migration, UUID foreign key harmonization, cryptographic key translation, transaction safety.
- Actions:
  1. Implement `buildVillageMapping` matching villages by unaccented name or code.
  2. Implement `reEncryptCCCD` decrypting with old QLCS key and re-encrypting with QLHK `ENCRYPTION_KEY` and `CCCD_HASH_PEPPER`.
  3. Implement migration script with `--dry-run` flag.
  4. Write unit test `tests/unit/migrate-qlcs.test.ts` verifying transformation and re-encryption.
- Verification:
  - Scoped Test Command: `cd QLHK/QLHK-Backend && npx vitest run tests/unit/migrate-qlcs.test.ts`
  - Diff Gate: Gross LOC <= 200.
- Completion:
  - Update `docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.task.md`: Mark Step 3 as `[x]`.
  - Commit: `git add -A && git commit -m "feat(roadmap): complete step 3 - database etl and re-encryption script"`.

---

### STEP 4: BACKEND CHÚC THỌ POLICY CONTROLLER & SERVICE
- START STEP:
+ Update `docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.task.md`: Mark Step 4 as `[/]`
- Plan Section: docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.md (Section 4: Backend Chúc Thọ Policy Controller & Service)
- Target Files: `QLHK/QLHK-Backend/src/controllers/policyChuctho.controller.ts`, `QLHK/QLHK-Backend/tests/unit/policy-chuctho.test.ts`
- Role Focus: REST controller, pagination, stream NDJSON, optimistic concurrency control (OCC), soft-delete.
- Actions:
  1. Implement `getChucthoProfiles` supporting pagination, search, milestone and year filters, village scoping.
  2. Implement `getChucthoStream` with client disconnect handling.
  3. Implement `createChucthoProfile`, `updateChucthoProfile` (with version OCC), `markChucthoReceived`, `deleteChucthoProfile`.
  4. Write unit test `tests/unit/policy-chuctho.test.ts`.
- Verification:
  - Scoped Test Command: `cd QLHK/QLHK-Backend && npx vitest run tests/unit/policy-chuctho.test.ts`
  - Diff Gate: Gross LOC <= 200.
- Completion:
  - Update `docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.task.md`: Mark Step 4 as `[x]`.
  - Commit: `git add -A && git commit -m "feat(roadmap): complete step 4 - chuc tho policy controller"`.

---

### STEP 5: BACKEND HỖ TRỢ XÃ HỘI (HTXH) POLICY CONTROLLER & SERVICE
- START STEP:
+ Update `docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.task.md`: Mark Step 5 as `[/]`
- Plan Section: docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.md (Section 5: Backend Hỗ TrỢ Xã Hội (HTXH) Policy Controller & Service)
- Target Files: `QLHK/QLHK-Backend/src/controllers/policyHtxh.controller.ts`, `QLHK/QLHK-Backend/tests/unit/policy-htxh.test.ts`
- Role Focus: REST controller for social assistance, 6 categories filter, NDJSON stream, OCC locking.
- Actions:
  1. Implement `getHtxhProfiles` filtering 6 social assistance categories.
  2. Implement `getHtxhStream` for large NDJSON export.
  3. Implement `createHtxhProfile`, `updateHtxhProfile`, `markHtxhReceived`, `deleteHtxhProfile`.
  4. Write unit test `tests/unit/policy-htxh.test.ts`.
- Verification:
  - Scoped Test Command: `cd QLHK/QLHK-Backend && npx vitest run tests/unit/policy-htxh.test.ts`
  - Diff Gate: Gross LOC <= 200.
- Completion:
  - Update `docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.task.md`: Mark Step 5 as `[x]`.
  - Commit: `git add -A && git commit -m "feat(roadmap): complete step 5 - htxh policy controller"`.

---

### STEP 6: BACKEND POLICY ANALYTICS & EXCEL EXPORT/IMPORT CONTROLLERS
- START STEP:
+ Update `docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.task.md`: Mark Step 6 as `[/]`
- Plan Section: docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.md (Section 6: Backend Policy Analytics & Excel Export/Import Controllers)
- Target Files: `QLHK/QLHK-Backend/src/controllers/policyAnalytics.controller.ts`, `QLHK/QLHK-Backend/src/controllers/policyExcel.controller.ts`, `QLHK/QLHK-Backend/tests/unit/policy-analytics.test.ts`
- Role Focus: In-memory caching, aggregated SQL grouping, Excel Smart-Upsert with candidate lookup.
- Actions:
  1. Implement `getPolicyAnalytics` aggregating milestones & categories with in-memory 10s TTL cache.
  2. Implement `importPolicyExcel` with Smart-Upsert candidate lookup.
  3. Implement `exportPolicyExcel` formatting official reports.
  4. Write unit test `tests/unit/policy-analytics.test.ts`.
- Verification:
  - Scoped Test Command: `cd QLHK/QLHK-Backend && npx vitest run tests/unit/policy-analytics.test.ts`
  - Diff Gate: Gross LOC <= 200.
- Completion:
  - Update `docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.task.md`: Mark Step 6 as `[x]`.
  - Commit: `git add -A && git commit -m "feat(roadmap): complete step 6 - policy analytics and excel controllers"`.

---

### STEP 7: BACKEND POLICY ROUTES & RBAC MIDDLEWARE INTEGRATION
- START STEP:
+ Update `docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.task.md`: Mark Step 7 as `[/]`
- Plan Section: docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.md (Section 7: Backend Policy Routes & RBAC Middleware Integration)
- Target Files: `QLHK/QLHK-Backend/src/routes/policy.routes.ts`, `QLHK/QLHK-Backend/src/routes/index.ts`, `QLHK/QLHK-Backend/tests/security/policy-rbac.test.ts`
- Role Focus: API routing, RBAC enforcement, village scoping boundary, 403 Forbidden on village mismatch.
- Actions:
  1. Create `src/routes/policy.routes.ts` mounting all sub-routers with `authenticateToken` and `authorizeVillage`.
  2. Mount `/policies` in `src/routes/index.ts`.
  3. Write security test `tests/security/policy-rbac.test.ts` asserting village leaders receive 403 when requesting other villages.
- Verification:
  - Scoped Test Command: `cd QLHK/QLHK-Backend && npx vitest run tests/security/policy-rbac.test.ts`
  - Diff Gate: Gross LOC <= 200.
- Completion:
  - Update `docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.task.md`: Mark Step 7 as `[x]`.
  - Commit: `git add -A && git commit -m "feat(roadmap): complete step 7 - policy routes and rbac integration"`.

---

### STEP 8: FINAL VERIFICATION GATE
- START STEP:
+ Update `docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.task.md`: Mark Step 8 as `[/]`
- Plan Section: docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.md (Section 8: Final Verification Gate)
- Verification Commands:
  1. `cd QLHK/QLHK-Backend && npx vitest run tests/unit tests/security/crypto.test.ts tests/security/rbac.test.ts` (All tests must pass).
  2. `cd QLHK/QLHK-Backend && npx tsc --noEmit` (Must exit 0 with 0 errors).
  3. `test -z "$(git status --porcelain)"` (Working tree clean).
- Completion:
  - Update `docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.task.md`: Mark Step 8 as `[x]`.
  - Commit: `git add -A && git commit -m "chore(roadmap): complete step 8 - final verification gate"`.

---

### 🔄 Session Handoff Checkpoint
When executing this roadmap, if 4 implementation steps are completed in a single session:
1. Run the full verification test suite.
2. Confirm clean working tree via `git status --porcelain`.
3. Output the following handoff block:

```text
### 🔄 Session Handoff Checkpoint
Resume execution of the roadmap at: docs/plans/qlhk-backend/qlhk-backend-merge-qlcs.roadmap.md
- Task Name: qlhk-backend-merge-qlcs
- Target Branch: roadmap/qlhk-backend-merge-qlcs
- Steps Completed: <STEPS_COMPLETED_IN_SESSION>
- Next Step: Step K
```
`````
