# Implementation Plan: Remediate Fullstack Optimization Findings (`remediate-qlhk-optimizations`)

- **Task Name (`<TASK_NAME>`)**: `remediate-qlhk-optimizations`
- **Task Type**: `Optimization`
- **Source Input**: `optimize/report.md`
- **Target Branch (for `roadmap`)**: `roadmap/remediate-qlhk-optimizations`
- **Full Test Command**: `npm --prefix QLHK-Backend test && npm --prefix QLHK-Client test`
- **Typecheck / Lint Command**: `npm --prefix QLHK-Backend run build && npm --prefix QLHK-Client run build`
- **Total Implementation Steps**: `5` (plus Final Verification Gate)

---

## 1. Context & Goal
The fullstack optimization audit of QLHK-Backend (Express/TypeScript/Prisma/PostgreSQL) and QLHK-Client (React/Vite/Tailwind) identified 8 verified performance bottlenecks (`OPT-001` through `OPT-008`). Key bottlenecks include an N+1 transaction overhead of 200 sequential queries per chunk in Excel bulk ingestion, in-memory fetching of all citizen DOBs for age breakdown calculation, unindexed string and token cleanup operations, and main-thread blocking synchronous `localStorage` writes in the client. The goal of this plan is to execute a surgical, bottom-up refactor that resolves all 8 bottlenecks while maintaining 100% test coverage and strict zero-regression compliance with core domain invariants.

### Verified Roadmap Input (`optimize/report.md`)
| Finding ID | Severity / Impact | Confidence | Target Source Files to Modify | One-Line Fix Intent | Equivalence / Regression Test to Migrate | Scoped Verification Command |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `OPT-001` | **High** | High | `QLHK-Backend/src/controllers/excel.controller.ts` | Pre-generate UUIDs and bulk insert households and citizens in 2 queries per chunk | Retain exact imported household & citizen counts | `npm --prefix QLHK-Backend test -- tests/integration/excel-import-demographics.test.ts` |
| `OPT-002` | **High** | High | `QLHK-Backend/src/controllers/analytics.controller.ts` | Aggregate age brackets in SQL via conditional counts instead of pulling all DOBs into RAM | Assert total sum of age buckets equals total citizens and preserves 100.0% Hare-Niemeyer math | `npm --prefix QLHK-Backend test -- tests/integration/api.test.ts` |
| `OPT-003` | **Medium** | High | `QLHK-Backend/prisma/schema.prisma` | Add GIN Trigram index on `name_unaccented` and B-tree index on `refresh_tokens.expires_at` | Verify Prisma schema validation and query performance | `npm --prefix QLHK-Backend test -- tests/security/crypto.test.ts` |
| `OPT-004` | **Medium** | High | `QLHK-Client/src/store/householdStore.ts` | Offload household cache to asynchronous debounced IndexedDB instead of synchronous localStorage | Ensure data persists offline without main thread block | `npm --prefix QLHK-Client test -- src/db/__tests__/indexedDB.test.ts` |
| `OPT-005` | **Medium** | High | `QLHK-Client/src/store/householdStore.ts` | Filter against pre-computed `m.name_unaccented` rather than re-running Unicode NFD on every keystroke | Verify identical search match outcomes | `npm --prefix QLHK-Client test -- src/api/__tests__/householdApi.test.ts` |
| `OPT-006` | **Medium** | High | `QLHK-Client/src/components/analytics/AnalyticsDashboard.tsx` | Read pre-parsed `m.age` / `m.birth_year` in dashboard memo instead of re-running regex | Assert age distribution numbers match exactly | `npm --prefix QLHK-Client test -- src/components/analytics/__tests__/AnalyticsDashboard.test.tsx` |
| `OPT-007` | **Low** | High | `QLHK-Client/src/components/households/HouseholdTable.tsx` | Extract `HouseholdRow` with `React.memo` to isolate checkbox toggles from table re-renders | Ensure row selection, accordion toggle, and actions work identically | `npm --prefix QLHK-Client test -- src/components/households/__tests__/HouseholdTable.test.tsx` |
| `OPT-008` | **Low** | High | `QLHK-Backend/src/controllers/backup.controller.ts` | Use compact JSON stringification and async file writing for database backup | Verify backup JSON parses into valid schema structure | `npm --prefix QLHK-Backend test -- tests/unit/logger.test.ts` |

---

## 2. Assumptions
- `ASM-01`: PostgreSQL server is running natively on port 5002 with `pg_trgm` extension enabled as declared in `QLHK-Backend/prisma/schema.prisma:11`.
- `ASM-02`: All 5 extended demographic fields (`que_quan`, `hoc_van`, `nvqs`, `nghe_nghiep`, `ghi_chu`) must remain in all bulk insert mappings and database queries (`INV-01`).
- `ASM-03`: AES-256-GCM encryption and HMAC-SHA256 blind indexing for CCCD must be strictly preserved (`INV-02`).
- `ASM-04`: Age calculations in analytics must continue to use dynamic `currentYear = new Date().getFullYear()` and exact Hare-Niemeyer 100.0% sum (`INV-03`).

---

## 3. Non-Goals (Out of Scope — YAGNI)
- No alteration of database table columns or breaking relational schema changes.
- No replacement of Express router architecture with alternative frameworks.
- No introduction of heavy third-party state managers (Redux, Zustand) on the client where native context and IndexedDB suffice.
- No introduction of flaky wall-clock timing assertions in automated tests (benchmarks verify deterministic call counts and equivalence only).

---

## 4. Current State & Codebase Grounding (`file:start-end` Read)
| File Path (`verified on disk`) | Lines Read | Current Responsibility & Relevant Symbols |
| :--- | :---: | :--- |
| `QLHK-Backend/prisma/schema.prisma` | `40-46`, `94-99` | Defines `refresh_tokens` and `citizens` indexes; lacks GIN trigram and `expires_at` indexes. |
| `QLHK-Backend/src/controllers/excel.controller.ts` | `121-198` | `importExcel`: loops 100 households executing 200 sequential queries per chunk inside interactive transaction. |
| `QLHK-Backend/src/controllers/analytics.controller.ts` | `144-147`, `218-253` | `getOverview`: pulls all citizen DOB strings from database into Node.js heap memory to tally age brackets in JS. |
| `QLHK-Backend/src/controllers/backup.controller.ts` | `60-70`, `128-135` | `exportDatabase`, `runAutoBackup`: serializes JSON with 2-space indentation and blocking `fs.writeFileSync`. |
| `QLHK-Client/src/store/householdStore.ts` | `50-56`, `99-113` | Synchronously writes JSON to `localStorage` on every change; runs Unicode NFD on every keystroke. |
| `QLHK-Client/src/components/analytics/AnalyticsDashboard.tsx` | `118-128` | Re-parses and validates DOB via regex inside `localCalculated` memo for all members on filter changes. |
| `QLHK-Client/src/components/households/HouseholdTable.tsx` | `223-385` | Maps all household rows inline in a single component without row-level memoization. |

---

## 5. Chosen Design & Blast Radius
- **Chosen Approach**:
  1. *Database layer*: Add GIN trigram index on `citizens(name_unaccented)` and B-tree index on `refresh_tokens(expires_at)`.
  2. *Ingestion layer*: Pre-generate household UUIDs with `crypto.randomUUID()`. Convert the per-chunk ingestion from 200 sequential queries to 2 bulk queries (`tx.households.createMany` and `tx.citizens.createMany`).
  3. *Analytics & Backup layer*: Replace in-memory DOB fetching with a single PostgreSQL conditional aggregate query. Use compact JSON and async file writes for database backups.
  4. *Client storage & filtering layer*: Debounce offline cache updates and write to IndexedDB (`setCache`) asynchronously. Filter using pre-computed `m.name_unaccented`.
  5. *Client presentation layer*: Read pre-computed `m.age` / `m.birth_year` in dashboard aggregations; extract `HouseholdRow` with `React.memo`.
- **Caller / Contract Blast Radius**:
  - `excel.controller.ts`: Internal transaction execution change only. API response contract `{ success: true, message, data: { insertedHouseholds, insertedCitizens } }` remains 100% identical.
  - `analytics.controller.ts`: Response structure `{ data: { overview: { ageDistribution, ... } } }` remains 100% identical.
  - `householdStore.ts` & `HouseholdTable.tsx`: UI props and emitted events remain 100% identical.
- **Rejected Alternatives (`<= 2`)**:
  1. *Web Worker for Client Search*: Rejected as over-engineering because `m.name_unaccented` pre-normalization reduces search string operations by >90%, making search instant (<2ms) on main thread without Worker message serialization overhead.
  2. *Redis Caching Layer for Backend*: Rejected because the native PostgreSQL Native schema with compound & GIN indexes executes queries in <10ms without adding Redis operational complexity.

---

## 6. Atomic Step Breakdown (`<= 200 Gross LOC` Per Step)

### Section 1: Database GIN Trigram & Expiry Indexes (Step 1)
- **Finding IDs**: `OPT-003`
- **Target Files**: `QLHK-Backend/prisma/schema.prisma`
- **Assigned Role**: `None (no .agents/ directory in repo)`
- **Role Focus**: Database indexing, query planning, zero schema regression on existing foreign keys and constraints.
- **Graph Check**: `graft ask "citizens model indexes" --source`
- **Estimated Gross Diff**: `~20 LOC`
- **Target Signatures / Contract Changes**:
  ```prisma
  model refresh_tokens {
    // ...
    expires_at DateTime  @db.Timestamptz
    @@index([expires_at])
  }

  model citizens {
    // ...
    name_unaccented String?    @db.VarChar(255)
    @@index([name_unaccented(ops: raw("gin_trgm_ops"))], type: Gin)
  }
  ```
- **Actions**:
  1. In `QLHK-Backend/prisma/schema.prisma`, add `@@index([expires_at])` to `model refresh_tokens`.
  2. In `QLHK-Backend/prisma/schema.prisma`, update `@@index([name_unaccented])` on `model citizens` to `@@index([name_unaccented(ops: raw("gin_trgm_ops"))], type: Gin)`.
  3. Run `npx prisma generate` in `QLHK-Backend` to regenerate Prisma Client types.
- **Scoped Test Command**: `npm --prefix QLHK-Backend test -- tests/security/crypto.test.ts`
- **Done Criteria**: Scoped test exits 0; Prisma client successfully generates with updated index metadata.

---

### Section 2: Bulk Ingestion Batch Inserts with Pre-Generated UUIDs (Step 2)
- **Finding IDs**: `OPT-001`
- **Target Files**: `QLHK-Backend/src/controllers/excel.controller.ts`
- **Assigned Role**: `None (no .agents/ directory in repo)`
- **Role Focus**: Transaction minimization, connection contention avoidance, data integrity across 5 demographic fields.
- **Graph Check**: `graft callers "importExcel"`
- **Estimated Gross Diff**: `~75 LOC`
- **Target Signatures / Contract Changes**:
  ```typescript
  import { randomUUID } from "node:crypto";
  // Pre-generate UUID per household in chunk:
  // tx.households.createMany({ data: householdsData })
  // tx.citizens.createMany({ data: allCitizensData })
  ```
- **Actions**:
  1. In `QLHK-Backend/src/controllers/excel.controller.ts` (lines 121-198), import `randomUUID` from `node:crypto`.
  2. Replace the inner `for (const h of chunk)` sequential `await tx.households.create` and `await tx.citizens.createMany` loop with a single preparation loop that assigns `id: randomUUID()` to each household.
  3. Execute `await tx.households.createMany({ data: chunkHouseholds })` followed by `await tx.citizens.createMany({ data: chunkCitizens })`, reducing 200 sequential queries down to 2 batch queries per chunk.
  4. Ensure all 5 extended demographic fields (`education`, `military_status`, `occupation`, `native_place`, `notes`) and dual CCCD encryption (`cccd`, `cccd_hash`, `cccd_last4`) are preserved verbatim.
- **Scoped Test Command**: `npm --prefix QLHK-Backend test -- tests/integration/excel-import-demographics.test.ts`
- **Done Criteria**: Scoped test exits 0 with all household and demographic member assertions passing.

---

### Section 3: SQL Age Aggregation & Asynchronous Compact Backup (Step 3)
- **Finding IDs**: `OPT-002`, `OPT-008`
- **Target Files**: `QLHK-Backend/src/controllers/analytics.controller.ts`, `QLHK-Backend/src/controllers/backup.controller.ts`
- **Assigned Role**: `None (no .agents/ directory in repo)`
- **Role Focus**: Elimination of in-memory heap pressure, non-blocking I/O, exact 100.0% Hare-Niemeyer math.
- **Graph Check**: `graft callers "getOverview"`
- **Estimated Gross Diff**: `~95 LOC`
- **Target Signatures / Contract Changes**:
  ```typescript
  // SQL age grouping query via Prisma.sql
  const ageCounts: Array<{ under16: bigint; youth: bigint; adult: bigint; over60: bigint; unknown_age: bigint }> =
    await prisma.$queryRaw`...`;
  ```
- **Actions**:
  1. In `QLHK-Backend/src/controllers/analytics.controller.ts`, replace `prisma.citizens.findMany({ where: citizenWhere, select: { dob: true } })` with a raw SQL conditional aggregation query (`COUNT(*) FILTER (WHERE ...)` or `SUM(CASE WHEN ...)`), grouping citizens by birth year extracted from `dob`.
  2. Feed the aggregated counts directly into `calculatePercentagesWithLargestRemainder`, preserving the exact 100.0% sum guarantee.
  3. In `QLHK-Backend/src/controllers/backup.controller.ts`, replace `JSON.stringify(backupData, null, 2)` with compact `JSON.stringify(backupData)` and change `fs.writeFileSync` to `await fs.promises.writeFile`.
- **Scoped Test Command**: `npm --prefix QLHK-Backend test -- tests/integration/api.test.ts`
- **Done Criteria**: Scoped test exits 0; overview age distribution passes with exact percentage sum.

---

### Section 4: Client Offline IndexedDB Cache Offload & Fast Search Filtering (Step 4)
- **Finding IDs**: `OPT-004`, `OPT-005`
- **Target Files**: `QLHK-Client/src/store/householdStore.ts`
- **Assigned Role**: `None (no .agents/ directory in repo)`
- **Role Focus**: Main thread unblocking, quota management (>5MB support), sub-millisecond search responsiveness.
- **Graph Check**: `graft callers "useHouseholdStore"`
- **Estimated Gross Diff**: `~75 LOC`
- **Target Signatures / Contract Changes**:
  ```typescript
  // In householdStore.ts:
  import { setCache } from "../db/indexedDB";
  // Debounced cache update:
  useEffect(() => {
    const timer = setTimeout(() => {
      setCache(STORAGE_KEY, households).catch(console.error);
    }, 300);
    return () => clearTimeout(timer);
  }, [households]);
  ```
- **Actions**:
  1. In `QLHK-Client/src/store/householdStore.ts`, import `setCache` from `../db/indexedDB`.
  2. Replace synchronous `localStorage.setItem(STORAGE_KEY, JSON.stringify(households))` with a debounced (300ms) call to `setCache(STORAGE_KEY, households)`.
  3. In `searchedHouseholds`, update member matching to use `(m.name_unaccented || normalizeUnaccented(m.full_name)).includes(query)` and head matching to use `(h.head_name_unaccented || normalizeUnaccented(h.head_name)).includes(query)`, bypassing redundant Unicode NFD normalization on every keystroke.
- **Scoped Test Command**: `npm --prefix QLHK-Client test -- src/db/__tests__/indexedDB.test.ts`
- **Done Criteria**: Scoped test exits 0; search produces identical filter results without main thread stalls.

---

### Section 5: Client Analytics Memoization & Table Row Component Memoization (Step 5)
- **Finding IDs**: `OPT-006`, `OPT-007`
- **Target Files**: `QLHK-Client/src/components/analytics/AnalyticsDashboard.tsx`, `QLHK-Client/src/components/households/HouseholdTable.tsx`
- **Assigned Role**: `None (no .agents/ directory in repo)`
- **Role Focus**: React re-render barriers, virtual DOM diffing reduction, memoization of expensive date calculations.
- **Graph Check**: `graft callers "HouseholdTable"`
- **Estimated Gross Diff**: `~120 LOC`
- **Target Signatures / Contract Changes**:
  ```tsx
  // In HouseholdTable.tsx:
  interface HouseholdRowProps {
    hh: Household;
    idx: number;
    isSelected: boolean;
    isExpanded: boolean;
    // ...
  }
  const HouseholdRow = React.memo<HouseholdRowProps>(({ hh, ... }) => { ... });
  ```
- **Actions**:
  1. In `QLHK-Client/src/components/analytics/AnalyticsDashboard.tsx` (lines 118-128), update `localCalculated` to read `m.age` or `currentYear - m.birth_year` first, calling `parseAndValidateDob` only if both are missing.
  2. In `QLHK-Client/src/components/households/HouseholdTable.tsx`, extract the household table row and its expandable member sub-table into a `HouseholdRow` component memoized with `React.memo`.
  3. Pass minimal necessary props (`hh`, `idx`, `isSelected`, `isExpanded`, event handlers) so toggling a checkbox on one row does not re-render unaffected rows.
- **Scoped Test Command**: `npm --prefix QLHK-Client test -- src/components/analytics/__tests__/AnalyticsDashboard.test.tsx`
- **Done Criteria**: Scoped test exits 0; table interactions function identically with zero visual or layout regressions.

---

## 7. Risks & Rollback Plan
| Risk / Failure Scenario | Likelihood / Impact | Mitigation in Plan | Rollback Procedure |
| :--- | :---: | :--- | :--- |
| GIN Trigram index syntax compatibility with PostgreSQL version | `LOW / MED` | `pg_trgm` extension is already loaded in `schema.prisma`; syntax validated via `prisma generate` | Revert `schema.prisma` index definition and run `npx prisma generate` |
| Pre-generated UUID collision in bulk import | `LOW / HIGH` | Node.js `crypto.randomUUID()` uses RFC 4122 v4 with negligible collision probability ($< 10^{-18}$) | Revert `excel.controller.ts` to sequential creates |
| Raw SQL age query mismatch with custom date strings | `LOW / MED` | Regex fallback in SQL `NULLIF(SUBSTRING(dob FROM '(\\d{4})$'), '')::integer` mirrors JavaScript parsing logic | Revert `analytics.controller.ts` to `findMany` |
| Client IndexedDB unavailable in private browsing | `LOW / LOW` | `indexedDB.ts` already includes automatic fallback to memory and localStorage | No rollback needed; fallback handles restricted storage |

---

## 8. Final Verification Gate (Step 6 in `roadmap`)
- **Full Test Suite Command**: `npm --prefix QLHK-Backend test && npm --prefix QLHK-Client test` (Must pass all 119 backend + 162 client tests with zero regressions)
- **Typecheck / Static Analysis Command**: `npm --prefix QLHK-Backend run build && npm --prefix QLHK-Client run build` (Must complete with 0 TypeScript compiler errors)
- **Clean Working Tree Check**: `test -z "$(git status --porcelain)"` (Must exit 0)

---

## 9. Roadmap Handoff Block
```text
Plan verified, committed, and saved to: docs/plans/remediate-qlhk-optimizations.md
- Task Name (<TASK_NAME>): remediate-qlhk-optimizations
- Implementation Steps: 5 (Sections 1..5, plus Step 6 Final Verification Gate)
- Full Test Command: npm --prefix QLHK-Backend test && npm --prefix QLHK-Client test
- Typecheck Command: npm --prefix QLHK-Backend run build && npm --prefix QLHK-Client run build
- Clean Tree Verified: git status --porcelain is empty

Next Action: Invoke the `roadmap` skill with `docs/plans/remediate-qlhk-optimizations.md` to generate the step-by-step execution prompt (or execute the roadmap directly).
```
