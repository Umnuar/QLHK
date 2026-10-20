# Implementation Plan: QLHK-Client Performance Optimization Remediation (`qlhk-client-optimization`)

- **Task Name (`<TASK_NAME>`)**: `qlhk-client-optimization`
- **Task Type**: `Optimization`
- **Source Input**: `QLHK-Client/optimize/report.md`
- **Target Branch (for `roadmap`)**: `roadmap/qlhk-client-optimization`
- **Full Test Command**: `cd QLHK-Client && npm test`
- **Typecheck / Lint Command**: `cd QLHK-Client && npx tsc --noEmit`
- **Total Implementation Steps**: `4` (plus Final Verification Gate)

---

## 1. Context & Goal

A rigorous, benchmark-driven performance audit on `QLHK-Client` identified 4 high-impact, verified optimization opportunities across application bundle weight, client-side filtering latency, and demographic statistical aggregation (`OPT-001` through `OPT-004`). The root entry route currently forces every client to preload 141.76 kB gzipped (424.24 kB raw) of static Excel parsing code (`OPT-001`), while search filters execute redundant Unicode NFD normalizations and string date parsing on every keystroke (`OPT-002`), analytics view traverses full household records multiple times on village selection changes (`OPT-003`), and household store executes three separate full passes over active records on every state mutation (`OPT-004`).

The goal of this implementation plan is to surgically remediate all 4 verified bottlenecks in clean dependency order (`Core Store -> Filter Hot-Path -> Analytics UI -> Bundle Splitting`), migrate deterministic behavior-equivalence tests into the permanent test suite, maintain 100% test pass rate (169/169 tests), and guarantee ZERO COMMENTS IN CODE across all modified files.

---

## 2. Assumptions

- `ASM-01`: Client runtime environment supports ES2020 dynamic imports (`await import("xlsx")`) bundled through Vite 5; dynamic chunk loading functions identically across both native Tauri desktop and browser PWA environments.
- `ASM-02`: Every `Person` record in `QLHK-Client` maintains `birth_year: number` (`1900 < birth_year <= calculationYear`); integer subtraction `calculationYear - m.birth_year` is numerically identical to `calculateAge` for all valid records while executing in 1 CPU instruction.
- `ASM-03`: `Household.head_name_unaccented` is pre-populated during seed generation and store addition; if absent on legacy cached records, fallback to `normalizeUnaccented(h.head_name.toLowerCase())` ensures 100% search backward compatibility.
- `ASM-04`: Demographic breakdown across villages depends strictly on commune-wide `activeHouseholds` and `villages` list; decoupling `villageBreakdown` from `selectedVillageId` preserves exact numeric outputs while eliminating O(N) recalculation on village filter toggles.
- `ASM-05`: Statistical aggregations in `useHouseholdStore` (`kpiStats`, `ethnicStats`, `villageStats`) share identical input boundaries (`activeHouseholds`); unifying their calculation in a single traversal loop produces 100% identical data structures.

---

## 3. Non-Goals (Out of Scope — YAGNI)

- No backend changes: Zero modifications to `QLHK-Backend`, database schemas, or Prisma ORM models.
- No UI visual redesign: Keep all Tailwind layout tokens, CSS classes, modal styles, and table columns completely unchanged.
- No flaky wall-clock assertions in CI: Unit and integration tests must verify deterministic output equivalence (`Before === After`) and data consistency, never wall-clock timing bounds.
- No premature virtualization: Do not replace standard table markup with virtualized lists (`react-window`) to avoid DOM layout regressions on complex multi-column accordion rows.
- No modification to discarded candidates: Do not alter `normalizeExcelDob` fast-path logic since it failed the Minimum Significance Gate (+6% speedup < 10% threshold).

---

## 4. Current State & Codebase Grounding (`file:start-end` Read)

| File Path (`verified on disk`) | Lines Read | Current Responsibility & Relevant Symbols |
| :--- | :---: | :--- |
| `QLHK-Client/src/store/householdStore.ts` | `117-240` | `kpiStats`, `ethnicStats`, and `villageStats` execute 3 separate nested loops over `activeHouseholds` (`OPT-004`). |
| `QLHK-Client/src/pages/HouseholdsPage.tsx` | `143-156` | `matchesFilters` invokes `calculateAge` parsing strings with regex for every citizen member (`OPT-002`). |
| `QLHK-Client/src/pages/HouseholdsPage.tsx` | `198-206` | `fetchHouseholds` executes `normalizeUnaccented(h.head_name.toLowerCase())` on all households on every search keystroke (`OPT-002`). |
| `QLHK-Client/src/components/analytics/AnalyticsDashboard.tsx` | `58-320` | `localCalculated` couples commune-wide `villageBreakdown` inside memo hook depending on `selectedVillageId` (`OPT-003`). |
| `QLHK-Client/src/pages/HouseholdsPage.tsx` | `10-18` | Static import `import * as XLSX from "xlsx"` causes initial HTML to preload 141.76 kB gzipped `vendor-excel` chunk (`OPT-001`). |
| `QLHK-Client/src/utils/fileExport.ts` | `1-40` | Static import `import * as XLSX from "xlsx"` forces bundle coupling into entry utilities (`OPT-001`). |
| `QLHK-Client/src/components/analytics/AnalyticsDashboard.tsx` | `12-14` | Static import `import * as XLSX from "xlsx"` bundled eagerly for single export button handler (`OPT-001`). |
| `QLHK-Client/src/components/excel/ImportPreviewModal.tsx` | `17-19` | Static import `import * as XLSX from "xlsx"` bundled eagerly in preview modal component (`OPT-001`). |

---

## 5. Chosen Design & Blast Radius

- **Chosen Approach**:
  1. **Core Store Single-Pass Aggregation (`OPT-004`)**: Unify `kpiStats`, `ethnicStats`, and `villageStats` calculation into a single memoized helper function `aggregateHouseholdStats`. Traverse `activeHouseholds` and citizen members once, simultaneously accumulating total counts, gender ratios, ethnic distribution tallies, and village breakdown buckets.
  2. **Hot-Path Search & Age Filter Acceleration (`OPT-002`)**: In `HouseholdsPage.tsx:198-206`, leverage pre-indexed `h.head_name_unaccented` for string search matches. In `matchesFilters`, check `m.birth_year > 1900 ? calculationYear - m.birth_year : calculateAge(...)` to bypass regex string parsing for 99.8% of valid citizen records.
  3. **Analytics Village Breakdown Decoupling (`OPT-003`)**: Decouple `villageBreakdown` into a dedicated `useMemo(() => ..., [activeHouseholds, villages])`. When `selectedVillageId` changes, lookup the target village statistics directly in O(1) from the pre-aggregated breakdown instead of re-iterating thousands of households and citizens.
  4. **Dynamic XLSX Code-Splitting (`OPT-001`)**: Replace static `import * as XLSX from "xlsx"` across `HouseholdsPage.tsx`, `fileExport.ts`, `AnalyticsDashboard.tsx`, and `ImportPreviewModal.tsx` with dynamic `const XLSX = await import("xlsx")`. Wrap `ImportPreviewModal` with `React.lazy()` so the 141.76 kB gzipped chunk is downloaded on demand only when the user triggers export or import.

- **Caller / Contract Blast Radius**:
  - `useHouseholdStore()`: Return values `{ kpiStats, ethnicStats, villageStats }` retain exact same TypeScript types and numeric fields.
  - `HouseholdsPage.tsx`: Filtered search results and pagination outputs remain 100% byte-for-byte identical.
  - `AnalyticsDashboard.tsx`: KPI cards, distribution charts, and village comparison tables receive identical data structures.
  - `exportExcelWithDialog`: Async signature `(workbookFactory, filename)` or `(workbook, filename)` preserves user dialog flow and file saving behavior.

- **Rejected Alternatives (`<= 2`)**:
  1. *Virtualizing table rows with react-window*: Rejected because `HouseholdTable` features expandable accordion member sub-tables, checkboxes, sticky headers, and variable row heights. Virtualization adds layout complexity and risks breaking existing E2E table tests while exceeding the 200 LOC budget.
  2. *Offloading search filtering to a Web Worker*: Rejected because client-side filtering with pre-indexed unaccented strings takes only 0.14 ms for 2,000 households. The postMessage serialization overhead across threads would exceed the compute time and violate YAGNI.

---

## 6. Atomic Step Breakdown (`<= 200 Gross LOC` Per Step)

### Section 1: HouseholdStore Single-Pass Statistical Aggregation (Step 1)
- **Finding IDs**: `OPT-004`
- **Target Files**:
  - `QLHK-Client/src/store/householdStore.ts`
- **Assigned Role**: `.agents/performance-engineer.md`
- **Role Focus**: Unify multi-pass statistical loops into a single memoized accumulator while maintaining exact numeric invariant equivalence.
- **Graph Check**: `git grep -n "kpiStats\|ethnicStats\|villageStats" QLHK-Client/src/`
- **Estimated Gross Diff**: `~75 LOC` (`<= 200 gross LOC` ceiling)
- **Target Signatures / Contract Changes**:
  ```typescript
  interface AggregatedStats {
  	kpiStats: KpiStats;
  	ethnicStats: EthnicDistribution[];
  	villageStats: VillageStatRow[];
  }
  function computeAggregatedStats(
  	activeHouseholds: Household[],
  ): AggregatedStats;
  ```
- **Actions**:
  1. In `QLHK-Client/src/store/householdStore.ts:117-240`, replace the three separate `useMemo` declarations (`kpiStats`, `ethnicStats`, `villageStats`) with a single `useMemo` calculating `aggregatedStats`.
  2. In the unified loop, iterate over `activeHouseholds` and `h.members` once, updating KPI totals, ethnic distribution map, and village statistics map simultaneously.
  3. Destructure `kpiStats`, `ethnicStats`, and `villageStats` from the memoized result to preserve the store's public return contract.
  4. Ensure ZERO COMMENTS IN CODE in all touched lines.
- **Scoped Test Command**: `cd QLHK-Client && npx vitest run src/api/__tests__/householdApi.test.ts src/db/__tests__/indexedDB.test.ts`
- **Done Criteria**: All 10 scoped store/API tests pass; single-pass aggregation produces identical numbers; staged gross diff <= 80 LOC.

---

### Section 2: Household List Search & Age Filter Hot-Path Acceleration (Step 2)
- **Finding IDs**: `OPT-002`
- **Target Files**:
  - `QLHK-Client/src/pages/HouseholdsPage.tsx`
- **Assigned Role**: `.agents/react-performance-optimization.md`
- **Role Focus**: Eliminate redundant Unicode normalizations and string date parsing inside high-frequency filter loops.
- **Graph Check**: `git grep -n "head_name_unaccented\|calculateAge" QLHK-Client/src/pages/HouseholdsPage.tsx`
- **Estimated Gross Diff**: `~45 LOC` (`<= 200 gross LOC` ceiling)
- **Target Signatures / Contract Changes**:
  ```typescript
  function checkMemberAgeMatch(
  	member: Person,
  	targetYear: number,
  	filter: { min?: number; max?: number },
  ): boolean;
  ```
- **Actions**:
  1. In `QLHK-Client/src/pages/HouseholdsPage.tsx:198-206`, update search filter comparison to prioritize `(h.head_name_unaccented || normalizeUnaccented(h.head_name.toLowerCase())).includes(q)`.
  2. In `QLHK-Client/src/pages/HouseholdsPage.tsx:143-156`, update `matchesFilters` age comparison to use `typeof m.birth_year === "number" && m.birth_year > 1900 ? calculationYear - m.birth_year : calculateAge(m.dob_formatted || m.dob_raw || m.dob, calculationYear)`.
  3. Ensure ZERO COMMENTS IN CODE in all touched lines.
- **Scoped Test Command**: `cd QLHK-Client && npx vitest run src/components/households/__tests__/HouseholdTable.test.tsx src/utils/__tests__/utilities.test.ts`
- **Done Criteria**: All 34 scoped table and utility tests pass; search filter and age criteria yield identical household rows; staged gross diff <= 60 LOC.

---

### Section 3: Analytics Dashboard Village Breakdown Decoupling (Step 3)
- **Finding IDs**: `OPT-003`
- **Target Files**:
  - `QLHK-Client/src/components/analytics/AnalyticsDashboard.tsx`
- **Assigned Role**: `.agents/react-performance-optimization.md`
- **Role Focus**: Decouple commune-wide breakdown calculation from village filter state to achieve O(1) filter response.
- **Graph Check**: `git grep -n "villageStatsMap\|villageBreakdown" QLHK-Client/src/components/analytics/`
- **Estimated Gross Diff**: `~65 LOC` (`<= 200 gross LOC` ceiling)
- **Target Signatures / Contract Changes**:
  ```typescript
  interface VillageBreakdownAccumulator {
  	household_count: number;
  	citizen_count: number;
  	male_count: number;
  	female_count: number;
  	dtts_count: number;
  }
  ```
- **Actions**:
  1. In `QLHK-Client/src/components/analytics/AnalyticsDashboard.tsx:258-320`, extract `villageBreakdown` calculation out of `localCalculated` into an independent `useMemo(() => ..., [activeHouseholds, villages])`.
  2. In `localCalculated`, when `selectedVillageId` is active, find the pre-aggregated village entry in O(1) from `villageBreakdown` to populate header totals, eliminating the second redundant traversal of active households.
  3. Keep all age distributions, education, and occupation charts intact.
  4. Ensure ZERO COMMENTS IN CODE in all touched lines.
- **Scoped Test Command**: `cd QLHK-Client && npx vitest run src/components/analytics/__tests__/AnalyticsDashboard.test.tsx`
- **Done Criteria**: All 10 analytics dashboard tests pass; village selection updates instantly without re-aggregating the whole dataset; staged gross diff <= 80 LOC.

---

### Section 4: Client Bundle Code-Splitting & Dynamic XLSX Loading (Step 4)
- **Finding IDs**: `OPT-001`
- **Target Files**:
  - `QLHK-Client/src/utils/fileExport.ts`
  - `QLHK-Client/src/pages/HouseholdsPage.tsx`
  - `QLHK-Client/src/components/analytics/AnalyticsDashboard.tsx`
  - `QLHK-Client/src/components/excel/ImportPreviewModal.tsx`
- **Assigned Role**: `.agents/frontend-developer.md`
- **Role Focus**: Eliminate heavy XLSX library chunk from initial page preload through dynamic asynchronous imports.
- **Graph Check**: `git grep -n "import.*from [\"']xlsx[\"']" QLHK-Client/src/`
- **Estimated Gross Diff**: `~85 LOC` (`<= 200 gross LOC` ceiling)
- **Target Signatures / Contract Changes**:
  ```typescript
  export async function loadXlsx(): Promise<typeof import("xlsx")>;
  export async function exportExcelWithDialog(
  	workbook: any,
  	defaultFilename: string,
  ): Promise<FileExportResult>;
  ```
- **Actions**:
  1. In `QLHK-Client/src/utils/fileExport.ts:1-15`, replace static `import * as XLSX from "xlsx"` with dynamic import helper `loadXlsx = async () => await import("xlsx")`.
  2. In `QLHK-Client/src/pages/HouseholdsPage.tsx:10-18`, remove static `import * as XLSX from "xlsx"`. In `handleExportSpecialReport` and `handleExportFullHouseholdData`, dynamically load XLSX before creating workbook.
  3. In `QLHK-Client/src/components/analytics/AnalyticsDashboard.tsx:12`, remove static `import * as XLSX from "xlsx"`. In `handleExportExcel`, dynamically load XLSX before sheet generation.
  4. In `QLHK-Client/src/components/excel/ImportPreviewModal.tsx:17`, dynamically load XLSX inside `handleProcessFile`.
  5. In `HouseholdsPage.tsx`, lazy-load `ImportPreviewModal` using `React.lazy()`.
  6. Ensure ZERO COMMENTS IN CODE in all touched lines.
- **Scoped Test Command**: `cd QLHK-Client && npm run build && npx vitest run tests/e2e/workflow.test.ts src/components/excel/__tests__/ExportSettingsModal.test.tsx src/components/excel/__tests__/ImportPreviewModal.test.tsx`
- **Done Criteria**: Production build succeeds; `dist/index.html` eliminates `vendor-excel` from modulepreload links (-141.76 kB gzipped); all 32 export and E2E tests pass; staged gross diff <= 120 LOC.

---

## 7. Risks & Rollback Plan

| Risk / Failure Scenario | Likelihood / Impact | Mitigation in Plan | Rollback Procedure |
| :--- | :---: | :--- | :--- |
| Dynamic `import("xlsx")` fails in offline desktop mode | `LOW / HIGH` | Vite bundles dynamic chunks locally into `dist/assets/`; Tauri serves assets locally without network request | Revert Step 4 commit via `git revert HEAD` |
| Incomplete legacy records missing `head_name_unaccented` | `LOW / MEDIUM` | Fallback `(h.head_name_unaccented \|\| normalizeUnaccented(h.head_name.toLowerCase()))` guarantees 100% search coverage | Revert Step 2 commit via `git revert HEAD` |
| Member birth year calculation mismatch on malformed dates | `LOW / LOW` | Strict guard `typeof m.birth_year === "number" && m.birth_year > 1900` with fallback to `calculateAge` on edge cases | Revert Step 2 commit via `git revert HEAD` |

---

## 8. Final Verification Gate (Step 5 in `roadmap`)

- **Full Test Suite Command**: `cd QLHK-Client && npm test` (Must exit 0 with 17/17 test files and 169/169 tests passing)
- **Typecheck / Static Analysis Command**: `cd QLHK-Client && npx tsc --noEmit` (Must exit 0 with 0 errors)
- **Production Build & Bundle Verification**: `cd QLHK-Client && npm run build` (Must exit 0 and verify `vendor-excel` chunk is excluded from initial `dist/index.html` preload links)
- **Zero Comments In Code Audit**: `git diff main...HEAD | grep -E '^\+[ ]*(\/\/|\/\*|\*\/|#)'` (Must exit 1 with 0 matches)
- **Clean Working Tree Check**: `test -z "$(git status --porcelain)"` (Must exit 0)

---

## 9. Roadmap Handoff Block

```text
Plan verified, committed, and saved to: docs/plans/qlhk-client/qlhk-client-optimization.md
- Task Name (<TASK_NAME>): qlhk-client-optimization
- Implementation Steps: 4 (Sections 1..4, plus Step 5 Final Verification Gate)
- Full Test Command: cd QLHK-Client && npm test
- Typecheck Command: cd QLHK-Client && npx tsc --noEmit
- Clean Tree Verified: git status --porcelain is empty

Next Action: Invoke the `roadmap` skill with `docs/plans/qlhk-client/qlhk-client-optimization.md` to generate the step-by-step execution prompt (or execute the roadmap directly).
```
