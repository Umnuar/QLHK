# Implementation Plan: Remediate Fullstack Performance & Efficiency Findings (`remediate-optimization-findings`)

- **Task Name (`<TASK_NAME>`)**: `remediate-optimization-findings`
- **Task Type**: `Optimization`
- **Source Input**: `optimize/report.md`
- **Target Branch (for `roadmap`)**: `roadmap/remediate-optimization-findings`
- **Full Test Command**: `cd QLHK-Backend && npm test && cd ../QLHK-Client && npm test`
- **Typecheck / Lint Command**: `cd QLHK-Backend && npx tsc --noEmit && cd ../QLHK-Client && npx tsc --noEmit`
- **Total Implementation Steps**: `5` (plus Final Verification Gate)

---

## 1. Context & Goal
The QLHK fullstack system audit identified 6 high-value optimization bottlenecks across backend PostgreSQL/Prisma database round-trips and frontend React rendering loops. Currently, batch deletions execute $2N$ sequential database round trips (`OPT-004`), Excel bulk imports perform 200 individual queries per 100-household chunk (`OPT-005`), client search filters re-run expensive 5-stage Unicode normalization across 8,000 citizens per keystroke (`OPT-002`), table selections perform $O(M \times N)$ linear scans (`OPT-003`), and dashboard analytics run $O(V \times H)$ nested filter loops with redundant date parsing (`OPT-001`, `OPT-006`).

This plan defines 5 atomic, bottom-up optimization steps that eliminate these bottlenecks, cutting database round trips by up to 99% and frontend CPU render/search overhead by 73%–99% while guaranteeing zero semantic drift, preserving all behavioral contracts (`INV-01` through `INV-04`), and passing 100% of existing test suites.

---

## 2. Assumptions
- `ASM-01`: PostgreSQL supports batch inserting records with client-provided UUID primary keys in Prisma `createMany` (`QLHK-Backend/prisma/schema.prisma:49-65, 68-99`).
- `ASM-02`: In `normalizeHousehold` (`QLHK-Client/src/api/householdApi.ts:34-87`), `m.name_unaccented` and `m.age` are already precalculated during API response mapping; fallback to dynamic calculation is only necessary when those fields are empty.
- `ASM-03`: The client table selection model relies on unique household string IDs; substituting `Array.prototype.includes` with `Set.prototype.has` preserves identical boolean results across all rows (`QLHK-Client/src/components/households/HouseholdTable.tsx:123-127`).
- `ASM-04`: Audit log entries in `batchDeleteHouseholds` share the exact same `userId` and `ipAddress` across the entire batch request (`QLHK-Backend/src/controllers/households.controller.ts:999-1009`).

---

## 3. Non-Goals (Out of Scope — YAGNI)
- Introducing Redis or in-memory LRU caching for overview stats (data freshness across village clerks takes priority).
- Migrating cursor-based keyset pagination in table APIs (would break existing page-number jump buttons in the UI).
- Replacing standard React rendering with third-party canvas or virtual table libraries (existing pagination at $10..100$ items per page is fast once $O(1)$ Set lookups are applied).
- Modifying encryption algorithms or CCCD security contracts (`INV-02`).

---

## 4. Current State & Codebase Grounding (`file:start-end` Read)

| File Path (`verified on disk`) | Lines Read | Current Responsibility & Relevant Symbols |
| :--- | :---: | :--- |
| `QLHK-Backend/src/controllers/households.controller.ts` | `985-1015` | `batchDeleteHouseholds`: sequential loop executing `logAudit` for each deleted household. |
| `QLHK-Backend/src/utils/audit.ts` | `24-60` | `logAudit`: queries `prisma.users.findUnique` on lines 31-38 then inserts single record via `prisma.audit_logs.create` on line 46. |
| `QLHK-Backend/src/controllers/excel.controller.ts` | `121-195` | `importExcel`: loops 100 households per chunk, executing `tx.households.create` followed by `tx.citizens.createMany` individually. |
| `QLHK-Client/src/store/householdStore.ts` | `99-115, 192-210` | `searchedHouseholds`: executes `normalizeUnaccented` for all members per keystroke; `villageStats`: runs $O(V \times H)$ nested filter loop. |
| `QLHK-Client/src/components/households/HouseholdTable.tsx` | `123-128, 240-272` | Table header and row render calls `selectedIds.includes(hh.id)` up to 4 times per row. |
| `QLHK-Client/src/components/analytics/AnalyticsDashboard.tsx` | `118-130, 257-275` | Calls `parseAndValidateDob` unconditionally for 10,000 citizens; runs nested `villages.map` + `filter` for village breakdown. |

---

## 5. Chosen Design & Blast Radius
- **Chosen Approach**:
  - **Backend**: Provide a batch helper `logAuditBatch` in `audit.ts` to validate user existence once and execute `prisma.audit_logs.createMany`. In `excel.controller.ts`, pre-generate `crypto.randomUUID()` for all households in the chunk so both households and citizens are inserted via single `createMany` queries.
  - **Client Store**: Fast-path search filter using `(m.name_unaccented || normalizeUnaccented(m.full_name)).includes(query)`; convert `villageStats` to a single-pass `Map<village_id, Accumulator>` aggregation.
  - **Client UI**: Wrap `selectedIds` into `useMemo(() => new Set(selectedIds), [selectedIds])` in `HouseholdTable.tsx`. In `AnalyticsDashboard.tsx`, short-circuit age parsing if `m.age > 0` and convert village breakdown to a single-pass `Map` aggregation.
- **Caller / Contract Blast Radius**:
  - `logAuditBatch` is purely additive; `logAudit` is preserved for single entity modifications.
  - `householdStore.ts` and `AnalyticsDashboard.tsx` retain identical output schemas and calculation formulas (`INV-03`).
  - `HouseholdTable.tsx` props and event signatures are untouched.
- **Rejected Alternatives (`<= 2`)**:
  - *Alternative A: Keyset cursor pagination for households*: Rejected because the UI requires page numbers (`page 1, 2, 3`) and total page counts.
  - *Alternative B: Asynchronous background worker for audit logs*: Rejected because Prisma `createMany` in a single query takes `< 5ms`, avoiding external queue dependencies (YAGNI).

---

## 6. Atomic Step Breakdown (`<= 200 Gross LOC` Per Step)

### Section 1: Batch Audit Logging in Backend Batch Delete (Step 1)
- **Finding IDs**: `OPT-004`
- **Target Files**: `QLHK-Backend/src/utils/audit.ts`, `QLHK-Backend/src/controllers/households.controller.ts`
- **Assigned Role**: `None (no .agents/ directory)`
- **Role Focus**: Database I/O efficiency, atomic batch transactions, preserving audit log schema.
- **Graph Check**: `graft callers "logAudit"` (fallback: `grep -rn "logAudit" QLHK-Backend/src`)
- **Estimated Gross Diff**: `~45 LOC`
- **Target Signatures / Contract Changes**:
  ```typescript
  // QLHK-Backend/src/utils/audit.ts
  export async function logAuditBatch(items: AuditParams[]): Promise<void>;
  ```
- **Actions**:
  1. In `QLHK-Backend/src/utils/audit.ts`, add and export `logAuditBatch(items: AuditParams[])`. Validate `userId` once with `prisma.users.findUnique` if provided, validate `villageId` regex, and execute `await prisma.audit_logs.createMany({ data: mappedEntries })`.
  2. In `QLHK-Backend/src/controllers/households.controller.ts:999-1009`, replace the serial `for (const h of households) { await logAudit(...) }` loop with a single `await logAuditBatch(auditItems)` call.
  3. Verify existing integration test `QLHK-Backend/tests/integration/households.test.ts` passes.
- **Scoped Test Command**: `cd QLHK-Backend && npx vitest run tests/integration/households.test.ts`
- **Done Criteria**: Batch delete integration tests pass; database audit queries reduced from $2N$ to 2; gross diff $\le 200$ LOC.

---

### Section 2: Chunked Batch Insert for Excel Import Ingestion (Step 2)
- **Finding IDs**: `OPT-005`
- **Target Files**: `QLHK-Backend/src/controllers/excel.controller.ts`
- **Assigned Role**: `None (no .agents/ directory)`
- **Role Focus**: PostgreSQL bulk write performance, foreign key integrity, preserving 5 new citizen fields (`INV-01`).
- **Graph Check**: `graft callers "importExcel"` (fallback: `grep -rn "importExcel" QLHK-Backend/src`)
- **Estimated Gross Diff**: `~65 LOC`
- **Target Signatures / Contract Changes**:
  ```typescript
  // QLHK-Backend/src/controllers/excel.controller.ts: import crypto from "node:crypto";
  // Pre-generate UUIDs for parent households in chunk
  const householdId = crypto.randomUUID();
  ```
- **Actions**:
  1. In `QLHK-Backend/src/controllers/excel.controller.ts:121-195`, import `crypto` from `"crypto"`.
  2. In each chunk of 100 households, accumulate `chunkHouseholdsData` with pre-generated `id = crypto.randomUUID()`.
  3. Assign each member's `household_id = householdId` and accumulate all member objects in `allChunkCitizens`.
  4. Inside `tx`, execute `await tx.households.createMany({ data: chunkHouseholdsData })` followed by `await tx.citizens.createMany({ data: allChunkCitizens })`.
  5. Verify Excel integration tests pass with all fields preserved.
- **Scoped Test Command**: `cd QLHK-Backend && npx vitest run tests/integration/excel.test.ts`
- **Done Criteria**: Excel import tests pass; queries per chunk reduced from 200 to 2; gross diff $\le 200$ LOC.

---

### Section 3: Client Store Search Filter & Village Aggregation Fast Paths (Step 3)
- **Finding IDs**: `OPT-001`, `OPT-002`
- **Target Files**: `QLHK-Client/src/store/householdStore.ts`
- **Assigned Role**: `None (no .agents/ directory)`
- **Role Focus**: React state memoization, string search performance, avoiding Unicode NFD re-allocations.
- **Graph Check**: `graft callers "searchedHouseholds"` (fallback: `grep -rn "searchedHouseholds" QLHK-Client/src`)
- **Estimated Gross Diff**: `~55 LOC`
- **Target Signatures / Contract Changes**:
  ```typescript
  // QLHK-Client/src/store/householdStore.ts
  const memberMatch = h.members.some((m) =>
      (m.name_unaccented || normalizeUnaccented(m.full_name)).includes(query),
  );
  ```
- **Actions**:
  1. In `QLHK-Client/src/store/householdStore.ts:99-113`, update `searchedHouseholds`: use `(m.name_unaccented || normalizeUnaccented(m.full_name)).includes(query)` and `(h.head_name_unaccented || normalizeUnaccented(h.head_name)).includes(query)` to bypass the 5-stage Unicode pipeline.
  2. In `QLHK-Client/src/store/householdStore.ts:192-215`, rewrite `villageStats` to aggregate all active households and members into a `Map<village_id, Accumulator>` in a single $O(H \times M)$ pass, eliminating repeated `activeHouseholds.filter`.
  3. Run client utility and store tests to verify search and statistic equivalence.
- **Scoped Test Command**: `cd QLHK-Client && npx vitest run tests/utilities.test.ts`
- **Done Criteria**: Client utility tests pass with identical search results; operations reduced by $\ge 70\%$; gross diff $\le 200$ LOC.

---

### Section 4: O(1) Set Lookup for Household Table Row Selection (Step 4)
- **Finding IDs**: `OPT-003`
- **Target Files**: `QLHK-Client/src/components/households/HouseholdTable.tsx`
- **Assigned Role**: `None (no .agents/ directory)`
- **Role Focus**: Component render efficiency, $O(1)$ set membership, table interaction responsiveness.
- **Graph Check**: `graft callers "HouseholdTable"` (fallback: `grep -rn "HouseholdTable" QLHK-Client/src`)
- **Estimated Gross Diff**: `~35 LOC`
- **Target Signatures / Contract Changes**:
  ```tsx
  // QLHK-Client/src/components/households/HouseholdTable.tsx
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  ```
- **Actions**:
  1. In `QLHK-Client/src/components/households/HouseholdTable.tsx:123`, define `const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);`.
  2. Replace `selectedIds.includes(h.id)` on lines 125, 127, 241, and 267 with `selectedSet.has(h.id)`.
  3. Verify `HouseholdTable.test.tsx` passes with identical selection behaviors.
- **Scoped Test Command**: `cd QLHK-Client && npx vitest run tests/components/HouseholdTable.test.tsx`
- **Done Criteria**: Table component tests pass; selection check complexity reduced from $O(M \times N)$ to $O(1)$; gross diff $\le 200$ LOC.

---

### Section 5: Analytics Dashboard Single-Pass Aggregation & Age Short-Circuit (Step 5)
- **Finding IDs**: `OPT-001`, `OPT-006`
- **Target Files**: `QLHK-Client/src/components/analytics/AnalyticsDashboard.tsx`
- **Assigned Role**: `None (no .agents/ directory)`
- **Role Focus**: Analytics math precision (`INV-03`), 1080p single viewport invariants (`INV-04`), single-pass data bucketing.
- **Graph Check**: `graft callers "AnalyticsDashboard"` (fallback: `grep -rn "AnalyticsDashboard" QLHK-Client/src`)
- **Estimated Gross Diff**: `~60 LOC`
- **Target Signatures / Contract Changes**:
  ```typescript
  // QLHK-Client/src/components/analytics/AnalyticsDashboard.tsx
  let age = (typeof m.age === "number" && m.age > 0) ? m.age : parseAndValidateDob(dobVal).birthYear ? (currentYear - parseAndValidateDob(dobVal).birthYear!) : undefined;
  ```
- **Actions**:
  1. In `QLHK-Client/src/components/analytics/AnalyticsDashboard.tsx:118-128`, short-circuit date validation when `typeof m.age === "number" && m.age > 0`, avoiding thousands of unconditional `parseAndValidateDob` calls.
  2. In `QLHK-Client/src/components/analytics/AnalyticsDashboard.tsx:257-275`, replace nested `villages.map` + `filter` with single-pass `Map<village_id, Stats>` accumulation over `activeHouseholds`.
  3. Verify `AnalyticsDashboard.test.tsx` passes, verifying exact 100.0% Hare-Niemeyer math (`INV-03`) and exact breakdown figures.
- **Scoped Test Command**: `cd QLHK-Client && npx vitest run tests/components/AnalyticsDashboard.test.tsx`
- **Done Criteria**: Dashboard component tests pass; date parsing calls cut by 95%; gross diff $\le 200$ LOC.

---

## 7. Risks & Rollback Plan

| Risk / Failure Scenario | Likelihood / Impact | Mitigation in Plan | Rollback Procedure |
| :--- | :---: | :--- | :--- |
| `createMany` fails on pre-existing UUID primary keys in Excel import | `LOW / HIGH` | Generate standard UUIDv4 via `crypto.randomUUID()` which has negligible collision probability ($< 10^{-15}$). | `git checkout HEAD~1 -- QLHK-Backend/src/controllers/excel.controller.ts` |
| `m.name_unaccented` is missing or out of sync in client store | `LOW / LOW` | Strict fallback: `(m.name_unaccented || normalizeUnaccented(m.full_name)).includes(query)` guarantees 100% equivalence. | `git checkout HEAD~1 -- QLHK-Client/src/store/householdStore.ts` |
| Set reference recreation causes unexpected table re-render | `LOW / LOW` | Memoize `selectedSet` with `[selectedIds]` dependency array so instance identity only updates when selections change. | `git checkout HEAD~1 -- QLHK-Client/src/components/households/HouseholdTable.tsx` |

---

## 8. Final Verification Gate (Step 6 in roadmap)
- **Full Test Suite Command**: `cd QLHK-Backend && npm test && cd ../QLHK-Client && npm test` (Must pass 119 backend + 162 client tests with 0 regressions)
- **Typecheck / Static Analysis Command**: `cd QLHK-Backend && npx tsc --noEmit && cd ../QLHK-Client && npx tsc --noEmit` (Must exit 0 with 0 TypeScript compiler errors)
- **Clean Working Tree Check**: `test -z "$(git status --porcelain)"` (Must exit 0)

---

## 9. Roadmap Handoff Block
```text
Plan verified, committed, and saved to: docs/plans/remediate-optimization-findings.md
- Task Name (<TASK_NAME>): remediate-optimization-findings
- Implementation Steps: 5 (Sections 1..5, plus Step 6 Final Verification Gate)
- Full Test Command: cd QLHK-Backend && npm test && cd ../QLHK-Client && npm test
- Typecheck Command: cd QLHK-Backend && npx tsc --noEmit && cd ../QLHK-Client && npx tsc --noEmit
- Clean Tree Verified: git status --porcelain is empty

Next Action: Invoke the `roadmap` skill with `docs/plans/remediate-optimization-findings.md` to generate the step-by-step execution prompt (or execute the roadmap directly).
```
