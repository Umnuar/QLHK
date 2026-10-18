# Implementation Plan: Remediate Frontend Audit Findings (`remediate-frontend-audit-findings`)

- **Task Name (`remediate-frontend-audit-findings`)**: `remediate-frontend-audit-findings`
- **Task Type**: `Audit Remediation`
- **Source Input**: `audit/report.md`
- **Target Branch (for `roadmap`)**: `roadmap/remediate-frontend-audit-findings`
- **Full Test Command**: `cd QLHK-Client && npm test`
- **Typecheck / Lint Command**: `cd QLHK-Client && npx tsc --noEmit`
- **Total Implementation Steps**: `4` (plus Final Verification Gate)

---

## 1. Context & Goal
The comprehensive static and runtime audit of `QLHK-Client` identified four functional and styling defects across 88 source files:
- `BUG-001`: `normalizeHousehold` in `src/api/householdApi.ts` and `CitizenModal.tsx` only check English field names (`education`, `military_status`, `occupation`, `native_place`, `notes`), dropping Vietnamese property aliases (`hoc_van`, `nvqs`, `nghe_nghiep`, `que_quan`, `ghi_chu`) into empty strings.
- `BUG-002`: `householdStore.ts` hardcodes year `2026` in age and birth year calculations (`calculateAge(dobRaw, 2026)` and `2026 - age`).
- `BUG-003`: Fullscreen modal overlays across `Modal.tsx`, `CitizenModal.tsx`, `HouseholdDrawer.tsx`, `ExportSettingsModal.tsx`, `ImportPreviewModal.tsx`, and `ConflictResolutionModal.tsx` lack `backdrop-blur-sm`, failing P0 system directives.
- `BUG-004`: `AnalyticsDashboard.tsx` extracts birth year using regex `match(/(\d{4})$/)`, which fails on standard ISO dates (`YYYY-MM-DD`), causing ages to fall back to 0 and misclassifying citizens into `< 16` age groups.

The goal is to apply surgical, non-breaking remediation across all 4 defects, update unit tests, and guarantee zero regressions against the 159 baseline tests.

## 2. Assumptions
- `ASM-01`: Client types in `src/types/index.ts` define `native_place`, `education`, `military_status`, `occupation`, and `notes` as optional string fields on `Person` interface.
- `ASM-02`: Server APIs and raw Excel imports may send either English keys or Vietnamese aliases (`que_quan`, `hoc_van`, `nvqs`, `nghe_nghiep`, `ghi_chu`); `normalizeHousehold` and `CitizenModal` must handle both transparently without data loss.
- `ASM-03`: `parseAndValidateDob` from `src/utils/date.ts` is the single source of truth for date validation and birth year extraction across the application.
- `ASM-04`: Tailwind CSS 4 in `QLHK-Client` supports `backdrop-blur-sm` utility on backdrop overlays.

## 3. Non-Goals (Out of Scope — YAGNI)
- No changes to backend API schemas or database tables (server endpoints already handle canonical fields).
- No new external npm dependencies (complying strictly with Ponytail Ultra: native Tailwind and React utilities only).
- No alterations to Donut chart geometry (diameter 176px, 16px/20px stroke, 2px gap, 30px transparent hit-ring are already verified compliant).
- No changes to Hare-Niemeyer math algorithm in `tableStyles.ts` (already verified 100.0% compliant).

## 4. Current State & Codebase Grounding (`file:start-end` Read)
| File Path (`verified on disk`) | Lines Read | Current Responsibility & Relevant Symbols |
| :--- | :---: | :--- |
| `QLHK-Client/src/api/householdApi.ts` | `31-109` | `normalizeHousehold`: maps `citizens` / `members`, reads only English property keys, dropping Vietnamese keys. |
| `QLHK-Client/src/components/households/CitizenModal.tsx` | `88-131, 250-265` | `useEffect` initializes state from `initialMember` using English keys only; overlay portal missing `backdrop-blur-sm`. |
| `QLHK-Client/src/store/householdStore.ts` | `370-420` | `saveMember`: computes `age` and `birth_year` hardcoded to year `2026`. |
| `QLHK-Client/src/components/analytics/AnalyticsDashboard.tsx` | `170-225` | `localCalculated`: `dobVal.match(/(\d{4})$/)` fails on ISO date format (`YYYY-MM-DD`), causing `age` to fall back to 0. |
| `QLHK-Client/src/components/common/Modal.tsx` | `50-75` | Base `Modal` component: overlay uses `bg-slate-950/45 dark:bg-black/60` without `backdrop-blur-sm`. |
| `QLHK-Client/src/components/households/HouseholdDrawer.tsx` | `360-380` | `HouseholdDrawer`: overlay portal uses `bg-slate-950/45 dark:bg-black/60` without `backdrop-blur-sm`. |
| `QLHK-Client/src/components/households/ConflictResolutionModal.tsx` | `35-50` | `ConflictResolutionModal`: overlay portal uses `bg-slate-950/45 dark:bg-black/60` without `backdrop-blur-sm`. |
| `QLHK-Client/src/components/excel/ExportSettingsModal.tsx` | `140-160` | `ExportSettingsModal`: overlay portal uses `bg-slate-950/45 dark:bg-black/60` without `backdrop-blur-sm`. |
| `QLHK-Client/src/components/excel/ImportPreviewModal.tsx` | `290-305` | `ImportPreviewModal`: overlay portal uses `bg-[rgba(15,23,42,0.45)]` without `backdrop-blur-sm`. |
| `QLHK-Client/src/components/common/AppUpdateModal.tsx` | `185-200` | `AppUpdateModal`: overlay portal uses `backdrop-blur-xs`, needs standard `backdrop-blur-sm`. |
| `QLHK-Client/src/components/network/ServerStatusModal.tsx` | `25-40` | `ServerStatusModal`: overlay portal uses `bg-slate-950/45 dark:bg-black/60` without `backdrop-blur-sm`. |

## 5. Chosen Design & Blast Radius
- **Chosen Approach**:
  1. In `normalizeHousehold` and `CitizenModal`, implement defensive fallback reads `(c.education || c.hoc_van)`, `(c.military_status || c.nvqs)`, `(c.occupation || c.nghe_nghiep)`, `(c.native_place || c.que_quan)`, and `(c.notes || c.ghi_chu)` to guarantee zero data loss.
  2. In `householdStore.ts`, replace hardcoded `2026` with `new Date().getFullYear()` or contextual calculation year.
  3. In `AnalyticsDashboard.tsx`, replace `dobVal.match(/(\d{4})$/)` with `parseAndValidateDob(dobVal).birthYear` so ISO dates are handled robustly.
  4. In all modal overlays (`Modal.tsx`, `CitizenModal.tsx`, `HouseholdDrawer.tsx`, `ConflictResolutionModal.tsx`, `ExportSettingsModal.tsx`, `ImportPreviewModal.tsx`, `AppUpdateModal.tsx`, `ServerStatusModal.tsx`), append `backdrop-blur-sm` to ensure full compliance with P0 modal separation directives.
- **Caller / Contract Blast Radius**:
  - `householdApi.ts`: Public API response signatures unchanged. Data preservation improved.
  - `CitizenModal.tsx`: Props and output signatures unchanged.
  - `householdStore.ts`: Store methods interface unchanged.
  - `AnalyticsDashboard.tsx`: Dashboard visuals unchanged; age pyramid accuracy improved.
  - Modals: CSS class updates only; layout dimensions and a11y attributes preserved 100%.
- **Rejected Alternatives (`<= 2`)**:
  1. *Rewrite all citizen properties to Vietnamese identifiers*: Rejected because frontend types, backend Prisma models, and existing unit tests are standardized on English keys.
  2. *Add heavy global blur filters on `body` instead of overlay*: Rejected because applying filters to `document.body` triggers repaints across the entire DOM tree and causes performance degradation in Tauri WebView2.

---

## 6. Atomic Step Breakdown (`<= 200 Gross LOC` Per Step)

### Section 1: Preserve 5 Citizen Fields with Vietnamese Alias Fallbacks (Step 1)
- **Finding IDs**: `BUG-001`
- **Target Files**: `QLHK-Client/src/api/householdApi.ts`, `QLHK-Client/src/components/households/CitizenModal.tsx`, `QLHK-Client/src/api/__tests__/householdApi.test.ts`, `QLHK-Client/src/components/households/__tests__/CitizenModal.test.tsx`
- **Assigned Role**: None (no .agents/ directory)
- **Role Focus**: Data mapping normalization, form state initialization, and zero demographic data loss invariants
- **Graph Check**: `graft callers normalizeHousehold || grep -rn "normalizeHousehold" QLHK-Client/src/`
- **Estimated Gross Diff**: `~65 LOC` (`<= 200 gross LOC` ceiling)
- **Target Signatures / Contract Changes**:
  ```ts
  // QLHK-Client/src/api/householdApi.ts:81-86
  education: (c.education ?? c.hoc_van ? String(c.education ?? c.hoc_van).trim() : ""),
  military_status: (c.military_status ?? c.nvqs ? String(c.military_status ?? c.nvqs).trim() : ""),
  occupation: (c.occupation ?? c.nghe_nghiep ? String(c.occupation ?? c.nghe_nghiep).trim() : ""),
  native_place: (c.native_place ?? c.que_quan ? String(c.native_place ?? c.que_quan).trim() : ""),
  notes: (c.notes ?? c.ghi_chu ? String(c.notes ?? c.ghi_chu).trim() : ""),
  ```
- **Actions**:
  1. In `QLHK-Client/src/api/householdApi.ts`, update `normalizeHousehold` member mapping (lines 81-86) to check Vietnamese aliases (`hoc_van`, `nvqs`, `nghe_nghiep`, `que_quan`, `ghi_chu`) when English keys are undefined or empty.
  2. In `QLHK-Client/src/components/households/CitizenModal.tsx`, update state initialization in `useEffect` (lines 109-113) to read `(initialMember.military_status || (initialMember as any).nvqs || "")`, `(initialMember.education || (initialMember as any).hoc_van || "")`, `(initialMember.occupation || (initialMember as any).nghe_nghiep || "")`, `(initialMember.native_place || (initialMember as any).que_quan || "")`, and `(initialMember.notes || (initialMember as any).ghi_chu || "")`.
  3. In `QLHK-Client/src/api/__tests__/householdApi.test.ts`, add unit test verifying `normalizeHousehold` extracts demographic fields from objects using Vietnamese aliases.
  4. In `QLHK-Client/src/components/households/__tests__/CitizenModal.test.tsx`, add test asserting `CitizenModal` populates form inputs when passed an `initialMember` with Vietnamese keys.
- **Scoped Test Command**: `cd QLHK-Client && npx vitest run src/api/__tests__/householdApi.test.ts src/components/households/__tests__/CitizenModal.test.tsx`
- **Done Criteria**: Scoped test command exits 0 with all householdApi and CitizenModal tests passing; staged gross diff <= 200 LOC.

---

### Section 2: Dynamic Calculation Year in Store and Robust ISO Date Parsing in Analytics (Step 2)
- **Finding IDs**: `BUG-002`, `BUG-004`
- **Target Files**: `QLHK-Client/src/store/householdStore.ts`, `QLHK-Client/src/components/analytics/AnalyticsDashboard.tsx`, `QLHK-Client/src/components/analytics/__tests__/AnalyticsDashboard.test.tsx`
- **Assigned Role**: None (no .agents/ directory)
- **Role Focus**: Dynamic calendar year calculations and ISO date parsing robustness
- **Graph Check**: `graft callers calculateAge || grep -rn "calculateAge" QLHK-Client/src/`
- **Estimated Gross Diff**: `~55 LOC` (`<= 200 gross LOC` ceiling)
- **Target Signatures / Contract Changes**:
  ```ts
  // QLHK-Client/src/store/householdStore.ts:379, 410
  const currentYear = new Date().getFullYear();
  const age = calculateAge(dobRaw, currentYear);
  birth_year: currentYear - age,
  // QLHK-Client/src/components/analytics/AnalyticsDashboard.tsx:210-215
  const parsedDob = parseAndValidateDob(dobVal);
  let age = parsedDob.isValid && parsedDob.birthYear ? currentYear - parsedDob.birthYear : m.age;
  ```
- **Actions**:
  1. In `QLHK-Client/src/store/householdStore.ts`, replace hardcoded `2026` in `saveMember` (lines 379 and 410) with `new Date().getFullYear()`.
  2. In `QLHK-Client/src/components/analytics/AnalyticsDashboard.tsx`, import `parseAndValidateDob` from `../../utils/date` and replace `dobVal.match(/(\d{4})$/)` in `localCalculated` (lines 210-215) with `parseAndValidateDob(dobVal)`. If valid and `birthYear` exists, compute `age = currentYear - parsedDob.birthYear`, ensuring both ISO format (`1985-05-20`) and Vietnamese format (`20/05/1985`) resolve accurately.
  3. In `QLHK-Client/src/components/analytics/__tests__/AnalyticsDashboard.test.tsx`, add test verifying that citizens with ISO format birth dates are properly categorized into age pyramid segments.
- **Scoped Test Command**: `cd QLHK-Client && npx vitest run src/components/analytics/__tests__/AnalyticsDashboard.test.tsx`
- **Done Criteria**: Scoped test command exits 0 with all AnalyticsDashboard tests passing; staged gross diff <= 200 LOC.

---

### Section 3: Add Backdrop Blur to Core and Household Modal Overlays (Step 3)
- **Finding IDs**: `BUG-003`
- **Target Files**: `QLHK-Client/src/components/common/Modal.tsx`, `QLHK-Client/src/components/households/CitizenModal.tsx`, `QLHK-Client/src/components/households/HouseholdDrawer.tsx`, `QLHK-Client/src/components/households/ConflictResolutionModal.tsx`
- **Assigned Role**: None (no .agents/ directory)
- **Role Focus**: Modal overlay separation and visual accessibility standards
- **Graph Check**: `graft ask "createPortal" --source`
- **Estimated Gross Diff**: `~30 LOC` (`<= 200 gross LOC` ceiling)
- **Target Signatures / Contract Changes**:
  ```tsx
  // Overlay wrapper className update across target modals:
  className="fixed inset-0 !m-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/45 dark:bg-black/60 backdrop-blur-sm select-none animate-in fade-in duration-150"
  ```
- **Actions**:
  1. In `QLHK-Client/src/components/common/Modal.tsx`, add `backdrop-blur-sm` to overlay container `className` (around line 65).
  2. In `QLHK-Client/src/components/households/CitizenModal.tsx`, add `backdrop-blur-sm` to overlay container `className` (around line 252).
  3. In `QLHK-Client/src/components/households/HouseholdDrawer.tsx`, add `backdrop-blur-sm` to overlay container `className` (around line 366).
  4. In `QLHK-Client/src/components/households/ConflictResolutionModal.tsx`, add `backdrop-blur-sm` to overlay container `className` (around line 37).
- **Scoped Test Command**: `cd QLHK-Client && npx vitest run src/components/households/__tests__/CitizenModal.test.tsx src/components/households/__tests__/HouseholdTable.test.tsx`
- **Done Criteria**: Scoped test command exits 0; all 4 core modal overlays include `backdrop-blur-sm`; staged gross diff <= 200 LOC.

---

### Section 4: Add Backdrop Blur to Excel and Auxiliary Modal Overlays (Step 4)
- **Finding IDs**: `BUG-003`
- **Target Files**: `QLHK-Client/src/components/excel/ExportSettingsModal.tsx`, `QLHK-Client/src/components/excel/ImportPreviewModal.tsx`, `QLHK-Client/src/components/common/AppUpdateModal.tsx`, `QLHK-Client/src/components/network/ServerStatusModal.tsx`
- **Assigned Role**: None (no .agents/ directory)
- **Role Focus**: Auxiliary and import/export modal overlay consistency
- **Graph Check**: None (isolated styling changes)
- **Estimated Gross Diff**: `~30 LOC` (`<= 200 gross LOC` ceiling)
- **Target Signatures / Contract Changes**:
  ```tsx
  // Overlay wrapper className update across auxiliary modals:
  className="fixed inset-0 !m-0 z-50 flex items-center justify-center p-4 bg-slate-950/45 dark:bg-black/60 backdrop-blur-sm select-none animate-in fade-in duration-150"
  ```
- **Actions**:
  1. In `QLHK-Client/src/components/excel/ExportSettingsModal.tsx`, add `backdrop-blur-sm` to overlay container `className` (around line 146).
  2. In `QLHK-Client/src/components/excel/ImportPreviewModal.tsx`, add `backdrop-blur-sm` to overlay container `className` (around line 293).
  3. In `QLHK-Client/src/components/common/AppUpdateModal.tsx`, update `backdrop-blur-xs` to `backdrop-blur-sm` in overlay container `className` (around line 188).
  4. In `QLHK-Client/src/components/network/ServerStatusModal.tsx`, add `backdrop-blur-sm` to overlay container `className` (around line 28).
- **Scoped Test Command**: `cd QLHK-Client && npx vitest run src/components/excel/__tests__/ExportSettingsModal.test.tsx src/components/excel/__tests__/ImportPreviewModal.test.tsx`
- **Done Criteria**: Scoped test command exits 0; all auxiliary modal overlays include `backdrop-blur-sm`; staged gross diff <= 200 LOC.

---

## 7. Risks & Rollback Plan
| Risk / Failure Scenario | Likelihood / Impact | Mitigation in Plan | Rollback Procedure |
| :--- | :---: | :--- | :--- |
| Tailwind CSS classes conflict or blur not rendered in WebView2 | LOW / LOW | `backdrop-blur-sm` is standard Tailwind utility; dark/light backgrounds retain alpha channel. | Revert commit or remove `backdrop-blur-sm` via `git checkout HEAD~1 <file>`. |
| Vietnamese key normalization masks valid empty strings | LOW / MED | Use `??` or check non-empty string before falling back to Vietnamese aliases. | Revert `householdApi.ts` changes via `git checkout HEAD~1 QLHK-Client/src/api/householdApi.ts`. |
| Date parsing performance regression on large household lists | LOW / LOW | `parseAndValidateDob` executes in `< 0.05ms` per date without regex backtracking; cached via useMemo. | Revert `AnalyticsDashboard.tsx` changes via `git checkout HEAD~1 QLHK-Client/src/components/analytics/AnalyticsDashboard.tsx`. |

---

## 8. Final Verification Gate (Step 5 in `roadmap`)
- **Full Test Suite Command**: `cd QLHK-Client && npm test` (Must exit 0 with all 17 test files and >= 159 tests passing)
- **Typecheck / Static Analysis Command**: `cd QLHK-Client && npx tsc --noEmit` (Must exit 0 with 0 errors)
- **Clean Working Tree Check**: `test -z "$(git status --porcelain)"` (Must exit 0)

---

## 9. Roadmap Handoff Block
```text
Plan verified, committed, and saved to: docs/plans/remediate-frontend-audit-findings.md
- Task Name (<TASK_NAME>): remediate-frontend-audit-findings
- Implementation Steps: 4 (Sections 1..4, plus Step 5 Final Verification Gate)
- Full Test Command: cd QLHK-Client && npm test
- Typecheck Command: cd QLHK-Client && npx tsc --noEmit
- Clean Tree Verified: git status --porcelain is empty

Next Action: Invoke the `roadmap` skill with `docs/plans/remediate-frontend-audit-findings.md` to generate the step-by-step execution prompt (or execute the roadmap directly).
```
