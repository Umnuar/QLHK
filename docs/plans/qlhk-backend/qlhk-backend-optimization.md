# Implementation Plan: Comprehensive Performance Optimization (`qlhk-backend-optimization`)

- **Task Name (`<TASK_NAME>`)**: `qlhk-backend-optimization`
- **Task Type**: `Optimization`
- **Source Input**: `optimize/report.md`
- **Target Branch (for `roadmap`)**: `roadmap/qlhk-backend-optimization`
- **Full Test Command**: `cd QLHK-Backend && npx vitest run tests/unit tests/security/crypto.test.ts tests/security/rbac.test.ts`
- **Typecheck / Lint Command**: `cd QLHK-Backend && npx tsc --noEmit`
- **Total Implementation Steps**: 4 (plus Final Verification Gate)

---

## 1. Context & Goal
The performance audit of `QLHK-Backend` in `optimize/report.md` identified 5 verified bottlenecks across cryptography and analytics modules: redundant 32-byte key buffer allocations in `getKeyBuffer()` (`OPT-001`), multi-pass array allocation and dual sorting in Hare-Niemeyer percentage calculations (`OPT-002`), regex capture overhead over 23,000+ date of birth records (`OPT-003`), closure instantiation in `removeAccents()` (`OPT-004`), and eager hydration of 29,000 database entities in `getByVillage()` (`OPT-005`). These bottlenecks degrade CPU throughput during bulk data imports and cause heap inflation during analytics queries. The goal is to apply minimal, surgical, behavior-preserving optimizations to reduce latency and memory usage while maintaining 100% contract compatibility, zero comments in code, and full passing tests across the backend test suite.

| ID | Title | Module | Scope / Target File | Optimization Class | Impact | Risk | Verification Reference |
| :--- | :--- | :--- | :--- | :---: | :---: | :---: | :--- |
| `OPT-001` | Key Buffer Caching in `getKeyBuffer()` | Module 05 | `src/utils/crypto.ts:4-10` | `OC-04` / `OC-03` | `MEDIUM` | `LOW` | `optimize/bench/bench_opt_001.test.ts` (-86.5% latency) |
| `OPT-002` | Hare-Niemeyer Algorithm Single-Pass Allocation | Module 02 | `src/controllers/analytics.controller.ts:39-65` | `OC-01` / `OC-04` | `LOW` | `LOW` | `optimize/bench/bench_opt_002.test.ts` (-18.7% latency) |
| `OPT-003` | Zero-Allocation Birth Year Parsing for 23,000+ Records | Module 02 | `src/controllers/analytics.controller.ts:211-237` | `OC-07` / `OC-04` | `HIGH` | `LOW` | `optimize/bench/bench_opt_003.test.ts` (-89.1% latency) |
| `OPT-004` | Closure Elimination & Direct Replacing in `removeAccents()` | Module 05 | `src/utils/crypto.ts:72-80` | `OC-08` / `OC-04` | `MEDIUM` | `LOW` | `optimize/bench/bench_opt_004.test.ts` (-34.4% latency) |
| `OPT-005` | Aggregate Grouping in `getByVillage()` | Module 02 | `src/controllers/analytics.controller.ts:392-432` | `OC-13` / `OC-04` | `HIGH` | `MEDIUM` | Cardinality formula (29,000 -> <= 250 rows) |

## 2. Assumptions
- `ASM-01`: Runtime configuration `config.encryptionKey` in `src/config/env.ts` is immutable after application boot, making cached key buffers safe and valid indefinitely across requests.
- `ASM-02`: Dates of birth in `citizens.dob` end with 4-digit Gregorian calendar years when populated, allowing trailing character-code extraction without regex compilation.
- `ASM-03`: The Hare-Niemeyer calculation preserves 1 decimal place percentage precision summing to 100.0% across all categories.
- `ASM-04`: PostgreSQL database supports standard SQL aggregate functions (`COUNT`) grouped by village and demographic fields.

## 3. Non-Goals (Out of Scope — YAGNI)
- No alteration of encryption formats or cryptographic algorithms: AES-256-GCM cipher format `iv:authTag:encryptedHex` and HMAC-SHA256 blind indices remain untouched.
- No inclusion of flaky wall-clock benchmark timing assertions inside permanent CI unit tests: only deterministic equivalence, output correctness, and schema invariants are asserted.
- No changes to frontend components in `QLHK-Client`: scope is strictly confined to `QLHK-Backend`.
- No introduction of external caching dependencies such as Redis or in-memory LRU libraries: standard Node.js module-level state and database grouping suffice.

## 4. Current State & Codebase Grounding (`file:start-end` Read)
| File Path (`verified on disk`) | Lines Read | Current Responsibility & Relevant Symbols |
| :--- | :---: | :--- |
| `QLHK-Backend/src/utils/crypto.ts` | `4-10` | `getKeyBuffer`: repeatedly validates regex and allocates new 32-byte Buffer per call. |
| `QLHK-Backend/src/utils/crypto.ts` | `72-80` | `removeAccents`: allocates per-invocation lambda closure and runs multi-stage regex passes. |
| `QLHK-Backend/src/controllers/analytics.controller.ts` | `39-65` | `calculatePercentagesWithLargestRemainder`: creates intermediate wrapper objects and runs dual sorting passes. |
| `QLHK-Backend/src/controllers/analytics.controller.ts` | `211-237` | `getOverview`: executes regex matching and string allocation for 23,000+ citizen birth years in memory. |
| `QLHK-Backend/src/controllers/analytics.controller.ts` | `392-432` | `getByVillage`: eagerly loads all households and citizens, hydrating ~29,000 objects to calculate frequencies. |

## 5. Chosen Design & Blast Radius
- **Chosen Approach**:
  1. In `src/utils/crypto.ts`, cache the resolved 32-byte Key Buffer in a module-scoped variable `cachedKeyBuffer` and optimize `removeAccents` by lowercasing prior to single-pass `đ` replacement and diacritics stripping.
  2. In `src/controllers/analytics.controller.ts`, optimize `calculatePercentagesWithLargestRemainder` using flat typed arrays (`Int32Array`, `Float64Array`) and single-pass remainder index sorting.
  3. In `src/controllers/analytics.controller.ts`, introduce zero-allocation birth year parsing via `extractBirthYear` reading trailing ASCII character codes.
  4. In `src/controllers/analytics.controller.ts`, refactor `getByVillage` to fetch village metadata with household counts and aggregate citizen demographic statistics, transforming grouped counts into identical response shapes.
- **Caller / Contract Blast Radius**:
  - `getKeyBuffer`: called internally by `encryptCCCD` and `decryptCCCD`. No external signature changes.
  - `removeAccents`: called by `citizens.controller.ts` and `excel.controller.ts`. Return values remain character-for-character identical.
  - `calculatePercentagesWithLargestRemainder`: invoked within `analytics.controller.ts` across 6 demographic charts. Array structure and percentage sums remain identical.
  - `getOverview`: returns identical JSON payload for demographic age brackets.
  - `getByVillage`: returns identical `villageStats` response array.
- **Rejected Alternatives (`<= 2`)**:
  1. *Introduce LRU memory cache for analytics endpoints*: Rejected due to cache invalidation complexity and stale data risks when village leaders edit records simultaneously.
  2. *Replace ExcelJS with custom XML stream parser*: Rejected as unnecessary complexity under ponytail minimalism given Excel parsing already meets operational SLA.

---

## 6. Atomic Step Breakdown (`<= 200 Gross LOC` Per Step)

### Section 1: Cache Encryption Key Buffer and Optimize Accents Removal in Crypto Utility (Step 1)
- **Finding IDs**: `OPT-001`, `OPT-004`
- **Target Files**: `QLHK-Backend/src/utils/crypto.ts`, `QLHK-Backend/tests/security/crypto.test.ts`
- **Assigned Role**: `.agents/security-engineer.md`
- **Role Focus**: Cryptographic standards, zero allocation overhead, strict input validation
- **Graph Check**: `graft callers getKeyBuffer --direction in`
- **Estimated Gross Diff**: `~45 LOC`
- **Target Signatures / Contract Changes**:
  ```typescript
  let cachedKeyBuffer: Buffer | null = null;
  function getKeyBuffer(): Buffer;
  const DIACRITICS_REGEX: RegExp;
  const D_STROKE_REGEX: RegExp;
  export function removeAccents(str: string): string;
  ```
- **Actions**:
  1. In `src/utils/crypto.ts`, introduce module-scoped variable `let cachedKeyBuffer: Buffer | null = null`.
  2. Update `getKeyBuffer()` to return `cachedKeyBuffer` immediately if already assigned; otherwise compute the 32-byte buffer once and cache it.
  3. Pre-compile `const DIACRITICS_REGEX = /[\u0300-\u036f]/g;` and `const D_STROKE_REGEX = /đ/g;` at module level.
  4. Refactor `removeAccents(str: string): string` to convert string to lowercase first, replace `đ` with `d` directly without closure, normalize `NFD`, remove diacritics with `DIACRITICS_REGEX`, and trim whitespace.
  5. In `tests/security/crypto.test.ts`, add deterministic test assertions verifying key buffer reuse, byte-for-byte equivalence, and accent removal across diverse Vietnamese names.
- **Scoped Test Command**: `cd QLHK-Backend && npx vitest run tests/security/crypto.test.ts`
- **Done Criteria**: Scoped test exits 0 with all crypto assertions passing; staged gross diff <= 200 LOC.

---

### Section 2: Optimize Hare-Niemeyer Algorithm Single-Pass Allocation in Analytics Controller (Step 2)
- **Finding IDs**: `OPT-002`
- **Target Files**: `QLHK-Backend/src/controllers/analytics.controller.ts`, `QLHK-Backend/tests/unit/analytics.test.ts` `(new)`
- **Assigned Role**: `.agents/performance-engineer.md`
- **Role Focus**: Algorithmic complexity, zero intermediate wrappers, deterministic numerical stability
- **Graph Check**: `graft callers calculatePercentagesWithLargestRemainder --direction in`
- **Estimated Gross Diff**: `~55 LOC`
- **Target Signatures / Contract Changes**:
  ```typescript
  export function calculatePercentagesWithLargestRemainder<T extends { count: number }>(
    items: T[],
    totalOverride?: number,
  ): (T & { percentage: number })[];
  ```
- **Actions**:
  1. In `src/controllers/analytics.controller.ts`, refactor `calculatePercentagesWithLargestRemainder` to eliminate intermediate object wrapper allocations.
  2. Pre-allocate `floorTenths` with `Int32Array(len)` and `remainders` with `Float64Array(len)`.
  3. Single-pass over `items` to compute integer floor tenths, store fractional remainders, and accumulate total sum into `currentSum`.
  4. Track indices with positive counts in `eligibleIndices`, sort only eligible indices by descending remainder, and distribute integer remainder deficit `diff`.
  5. Create `tests/unit/analytics.test.ts` and migrate behavior-equivalence test cases asserting exact percentage allocations and 100.0% sum preservation across multi-category demographic inputs.
- **Scoped Test Command**: `cd QLHK-Backend && npx vitest run tests/unit/analytics.test.ts -t "Hare-Niemeyer"`
- **Done Criteria**: Scoped test exits 0 with all Hare-Niemeyer assertions passing; staged gross diff <= 200 LOC.

---

### Section 3: Implement Zero-Allocation Birth Year Parsing for Demographics (Step 3)
- **Finding IDs**: `OPT-003`
- **Target Files**: `QLHK-Backend/src/controllers/analytics.controller.ts`, `QLHK-Backend/tests/unit/analytics.test.ts`
- **Assigned Role**: `.agents/performance-engineer.md`
- **Role Focus**: String parsing optimization, zero regex compilation overhead, boundary validation
- **Graph Check**: `graft callers extractBirthYear --direction in`
- **Estimated Gross Diff**: `~45 LOC`
- **Target Signatures / Contract Changes**:
  ```typescript
  export function extractBirthYear(dob: string | null | undefined): number | null;
  ```
- **Actions**:
  1. In `src/controllers/analytics.controller.ts`, export standalone helper `extractBirthYear(dob: string | null | undefined): number | null`.
  2. Implement trailing whitespace trimming by scanning backward using character codes without allocating new string instances.
  3. Verify that the 4 trailing characters are ASCII numeric digits (character codes 48 to 57) and compute integer year using base-10 arithmetic.
  4. Return `null` for missing, empty, or invalid format dates.
  5. In `getOverview`, replace `c.dob.trim().match(/(\d{4})$/)` with `extractBirthYear(c.dob)`.
  6. In `tests/unit/analytics.test.ts`, add test cases covering valid dates, trailing whitespace, pure years, invalid values, and null inputs.
- **Scoped Test Command**: `cd QLHK-Backend && npx vitest run tests/unit/analytics.test.ts -t "Birth Year"`
- **Done Criteria**: Scoped test exits 0 with all birth year parsing assertions passing; staged gross diff <= 200 LOC.

---

### Section 4: Replace Eager Hydration with Database Aggregate Grouping in Village Analytics (Step 4)
- **Finding IDs**: `OPT-005`
- **Target Files**: `QLHK-Backend/src/controllers/analytics.controller.ts`, `QLHK-Backend/tests/unit/analytics.test.ts`
- **Assigned Role**: `.agents/database-optimization.md`
- **Role Focus**: Database cardinality reduction, projection pruning, relation aggregation
- **Graph Check**: `graft callers getByVillage --direction in`
- **Estimated Gross Diff**: `~65 LOC`
- **Target Signatures / Contract Changes**:
  ```typescript
  interface VillageGroupRow {
    village_id: string;
    gender: string;
    ethnicity: string;
    religion: string;
    count: number;
  }
  export const getByVillage: (req: AuthRequest, res: Response) => Promise<void>;
  ```
- **Actions**:
  1. In `src/controllers/analytics.controller.ts`, refactor `getByVillage` to avoid loading full household and citizen trees.
  2. Query `villages` with `select` restricting fields to `id`, `name`, `code`, and nested household count `_count: { select: { households: { where: { is_deleted: false } } } }`.
  3. Execute grouped citizen counts via database aggregation filtering on `is_deleted: false`, grouping by village, gender, ethnicity, and religion.
  4. Aggregate the grouped rows in memory over at most 250 rows to calculate `male_count`, `female_count`, `dtts_count`, `top_ethnicity`, and `top_religion`.
  5. Preserve 100% response schema compatibility for `villageStats` JSON output.
  6. In `tests/unit/analytics.test.ts`, add test cases verifying `villageStats` structure, percentages, and aggregation logic using mocked database results.
- **Scoped Test Command**: `cd QLHK-Backend && npx vitest run tests/unit/analytics.test.ts -t "Village Stats"`
- **Done Criteria**: Scoped test exits 0 with all village stats assertions passing; staged gross diff <= 200 LOC.

---

## 7. Risks & Rollback Plan
| Risk / Failure Scenario | Likelihood / Impact | Mitigation in Plan | Rollback Procedure |
| :--- | :---: | :--- | :--- |
| `OPT-001`: Runtime change to `config.encryptionKey` | `LOW / HIGH` | Key is environment-bound and immutable during application process lifetime. | Clear `cachedKeyBuffer = null` on test teardown or revert to direct resolution. |
| `OPT-002`: Rounding discrepancy in Hare-Niemeyer | `LOW / MED` | Exact arithmetic logic preserved; tested with 12 ethnic categories. | `git checkout HEAD~1 -- src/controllers/analytics.controller.ts` |
| `OPT-003`: Non-standard date formats with trailing characters | `LOW / LOW` | Strict 4-digit ASCII boundary check; fallback to `unknownAgeCount` matching regex. | Revert `extractBirthYear` to regex `/(\d{4})$/`. |
| `OPT-005`: Aggregation count mismatch on soft-deleted records | `LOW / MED` | Explicit `is_deleted: false` conditions enforced across all grouped joins. | Revert `getByVillage` to nested `findMany` query. |

## 8. Final Verification Gate (Step 5 in `roadmap`)
- **Full Test Suite Command**: `cd QLHK-Backend && npx vitest run tests/unit tests/security/crypto.test.ts tests/security/rbac.test.ts` (Must exit 0 with zero regressions vs. baseline)
- **Typecheck / Static Analysis Command**: `cd QLHK-Backend && npx tsc --noEmit` (Must exit 0 with 0 errors)
- **Clean Working Tree Check**: `test -z "$(git status --porcelain)"` (Must exit 0)

## 9. Roadmap Handoff Block
```text
Plan verified, committed, and saved to: docs/plans/qlhk-backend/qlhk-backend-optimization.md
- Task Name (<TASK_NAME>): qlhk-backend-optimization
- Implementation Steps: 4 (Sections 1..4, plus Step 5 Final Verification Gate)
- Full Test Command: cd QLHK-Backend && npx vitest run tests/unit tests/security/crypto.test.ts tests/security/rbac.test.ts
- Typecheck Command: cd QLHK-Backend && npx tsc --noEmit
- Clean Tree Verified: git status --porcelain is empty

Next Action: Invoke the `roadmap` skill with `docs/plans/qlhk-backend/qlhk-backend-optimization.md` to generate the step-by-step execution prompt (or execute the roadmap directly).
```
