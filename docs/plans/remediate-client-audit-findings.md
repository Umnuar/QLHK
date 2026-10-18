# Implementation Plan: Remediate Client Audit Findings (`remediate-client-audit-findings`)

- **Task Name (`remediate-client-audit-findings`)**: `remediate-client-audit-findings`
- **Task Type**: `Audit Remediation`
- **Source Input**: `audit/state.md`
- **Target Branch (for `roadmap`)**: `roadmap/remediate-client-audit-findings`
- **Full Test Command**: `cd QLHK-Client && npm test -- --run`
- **Typecheck / Lint Command**: `cd QLHK-Client && npx tsc --noEmit`
- **Total Implementation Steps**: 4 (plus Final Verification Gate)

---

## 1. Context & Goal
The comprehensive static and runtime audit of `QLHK-Client` (71 implementation files, 17 test suites) confirmed four functional and visual defects:
1. `BUG-001`: Missing Vietnamese alias fallback in `normalizeHousehold` and `CitizenModal` (`education`/`hoc_van`, `military_status`/`nvqs`, `occupation`/`nghe_nghiep`, `native_place`/`que_quan`, `notes`/`ghi_chu`).
2. `BUG-002`: Hardcoded year `2026` across 5 locations in `householdStore.ts` for age and birth year calculations.
3. `BUG-003`: Missing `backdrop-blur-sm` glassmorphism class on fullscreen modal overlay elements (`Modal.tsx`, `CitizenModal.tsx`, `HouseholdDrawer.tsx`, `ExportSettingsModal.tsx`, `ImportPreviewModal.tsx`, `ConflictResolutionModal.tsx`, `useModal.tsx`).
4. `BUG-004`: DOB year extraction regex `match(/(\d{4})$/)` in `AnalyticsDashboard.tsx` breaks on ISO formatted dates (`YYYY-MM-DD` or `YYYY/MM/DD`), defaulting age to `0` or uninitialized value.

The goal is to apply surgical, non-breaking fixes aligned with existing codebase conventions, extend relevant unit/integration tests to ensure regression-free behavior, and verify zero regressions against the 159 baseline tests in `QLHK-Client`.

## 2. Assumptions
- `ASM-01`: Backend payload uses either English column names (`education`, `military_status`, etc.) or Vietnamese field names (`hoc_van`, `nvqs`, etc.) depending on legacy or Excel import pipelines.
- `ASM-02`: Age calculations should dynamically evaluate against the current calendar year (`new Date().getFullYear()`) matching `src/utils/date.ts:CURRENT_YEAR`.
- `ASM-03`: All client modals are rendered via `createPortal` into document body and use Tailwind CSS utility classes for styling.
- `ASM-04`: Baseline test suite (`159/159 tests passing`) and TypeScript compiler (`0 errors`) are clean before any code changes.

## 3. Non-Goals (Out of Scope — YAGNI)
- No modifications to `QLHK-Backend` source code or database schemas (backend was previously audited and remediated with 119/119 passing tests).
- No new third-party libraries or date-fns dependencies; native JavaScript `Date` and existing regex utilities suffice.
- No redesign of modal animations, layouts, or color schemes beyond adding `backdrop-blur-sm` to overlay backdrops.

## 4. Current State & Codebase Grounding (`file:start-end` Read)
| File Path (`verified on disk`) | Lines Read | Current Responsibility & Relevant Symbols |
| :--- | :---: | :--- |
| `QLHK-Client/src/api/householdApi.ts` | `75-95` | `normalizeHousehold`: maps API payload into `Household` model. Omission of Vietnamese alias fallback (`c.hoc_van`, `c.nvqs`, `c.nghe_nghiep`, `c.que_quan`, `c.ghi_chu`) causes blank fields when ingesting Vietnamese-keyed objects. |
| `QLHK-Client/src/components/households/CitizenModal.tsx` | `100-125, 245-265` | `CitizenModal`: form state initialization drops demographic attributes if initial member has Vietnamese keys; overlay backdrop at line 252 lacks `backdrop-blur-sm`. |
| `QLHK-Client/src/store/householdStore.ts` | `245-270, 375-415, 450-460` | `useHouseholdStore`: hardcodes `2026` in `addHousehold` (lines 248, 266) and `saveMember` (lines 379, 410, 453) instead of dynamic current year. |
| `QLHK-Client/src/components/common/Modal.tsx` | `85-105` | Generic `Modal` component: backdrop container at line 91 uses `bg-slate-950/45 dark:bg-black/60` without `backdrop-blur-sm`. |
| `QLHK-Client/src/components/households/HouseholdDrawer.tsx` | `360-375` | `HouseholdDrawer`: modal backdrop at line 366 lacks `backdrop-blur-sm`. |
| `QLHK-Client/src/components/excel/ExportSettingsModal.tsx` | `140-155` | `ExportSettingsModal`: modal backdrop at line 146 lacks `backdrop-blur-sm`. |
| `QLHK-Client/src/components/excel/ImportPreviewModal.tsx` | `290-305` | `ImportPreviewModal`: modal backdrop at line 293 lacks `backdrop-blur-sm`. |
| `QLHK-Client/src/components/households/ConflictResolutionModal.tsx` | `30-45` | `ConflictResolutionModal`: modal backdrop at line 37 lacks `backdrop-blur-sm`. |
| `QLHK-Client/src/hooks/useModal.tsx` | `65-80` | `useModal` confirmation dialog: backdrop at line 69 lacks `backdrop-blur-sm`. |
| `QLHK-Client/src/components/analytics/AnalyticsDashboard.tsx` | `115-130` | `AnalyticsDashboard`: line 118 regex `dobVal.match(/(\d{4})$/)` expects year at end, failing on ISO `YYYY-MM-DD` strings. |

## 5. Chosen Design & Blast Radius
- **Chosen Approach**:
  1. In `householdApi.ts:normalizeHousehold` and `CitizenModal.tsx:useEffect`, add fallback chaining to Vietnamese keys (`c.education || c.hoc_van`, `c.military_status || c.nvqs`, `c.occupation || c.nghe_nghiep`, `c.native_place || c.que_quan`, `c.notes || c.ghi_chu`).
  2. In `householdStore.ts`, define `const currentYear = new Date().getFullYear()` and replace all 5 occurrences of literal `2026` in `calculateAge` and `birth_year` calculations.
  3. In all modal overlay backdrop wrappers (`Modal.tsx`, `CitizenModal.tsx`, `HouseholdDrawer.tsx`, `ExportSettingsModal.tsx`, `ImportPreviewModal.tsx`, `ConflictResolutionModal.tsx`, `useModal.tsx`), append `backdrop-blur-sm` to backdrop classes.
  4. In `AnalyticsDashboard.tsx`, replace `dobVal.match(/(\d{4})$/)` with `dobVal.match(/(?:^|\D)(\d{4})(?:\D|$)/)` to extract 4-digit years from both `DD/MM/YYYY` and ISO `YYYY-MM-DD` / `YYYY/MM/DD` strings.
- **Caller / Contract Blast Radius**:
  - `normalizeHousehold`: Return type `Household` unchanged; fields now robust against Vietnamese server responses.
  - `saveMember`: Signatures unchanged; year calculations remain consistent regardless of runtime calendar year.
  - Modal backdrops: Styling enhancement only; no DOM structure or event listener alterations.
  - `AnalyticsDashboard`: Cohort grouping logic unchanged; ISO date support prevents miscategorization of citizens into under-16 / unknown cohorts.
- **Rejected Alternatives (`<= 2`)**:
  - *Introduce date-fns or dayjs library for ISO date parsing*: Rejected because native regex `/(?:^|\D)(\d{4})(?:\D|$)/` solves the issue in 1 line without adding bundle bloat or dependencies.
  - *Convert all internal citizen models to bilingual key dictionaries*: Rejected because it multiplies type complexity; handling fallbacks at API boundary (`normalizeHousehold`) keeps the rest of the application clean.

---

## 6. Atomic Step Breakdown (`<= 200 Gross LOC` Per Step)

### Section 1: Fallback to Vietnamese Demographic Aliases in normalizeHousehold and CitizenModal (Step 1)
- **Finding IDs**: `BUG-001`
- **Target Files**: `QLHK-Client/src/api/householdApi.ts`, `QLHK-Client/src/components/households/CitizenModal.tsx`, `QLHK-Client/src/api/__tests__/householdApi.test.ts`
- **Assigned Role**: None (no .agents/ directory)
- **Role Focus**: Demographic preservation, payload normalization, and Vietnamese key alias fallback
- **Graph Check**: `graft callers normalizeHousehold || grep -rn "normalizeHousehold" src/`
- **Estimated Gross Diff**: `~45 LOC` (`<= 200 gross LOC` ceiling)
- **Target Signatures / Contract Changes**:
  ```ts
  // QLHK-Client/src/api/householdApi.ts:81-86 & CitizenModal.tsx:109-113
  education: c.education ? String(c.education).trim() : (c.hoc_van ? String(c.hoc_van).trim() : ""),
  military_status: c.military_status ? String(c.military_status).trim() : (c.nvqs ? String(c.nvqs).trim() : ""),
  occupation: c.occupation ? String(c.occupation).trim() : (c.nghe_nghiep ? String(c.nghe_nghiep).trim() : ""),
  native_place: c.native_place ? String(c.native_place).trim() : (c.que_quan ? String(c.que_quan).trim() : ""),
  notes: c.notes ? String(c.notes).trim() : (c.ghi_chu ? String(c.ghi_chu).trim() : ""),
  // CitizenModal.tsx:
  setMilitaryStatus(initialMember.military_status || (initialMember as any).nvqs || "");
  setEducation(initialMember.education || (initialMember as any).hoc_van || "");
  setOccupation(initialMember.occupation || (initialMember as any).nghe_nghiep || "");
  setNativePlace(initialMember.native_place || (initialMember as any).que_quan || "");
  setNotes(initialMember.notes || (initialMember as any).ghi_chu || "");
  ```
- **Actions**:
  1. In `QLHK-Client/src/api/householdApi.ts`, update lines 81-86 in `normalizeHousehold` to fallback to `c.hoc_van`, `c.nvqs`, `c.nghe_nghiep`, `c.que_quan`, and `c.ghi_chu` when English keys are absent.
  2. In `QLHK-Client/src/components/households/CitizenModal.tsx`, update lines 109-113 in `useEffect` when populating `initialMember` to check `(initialMember as any).nvqs`, `hoc_van`, `nghe_nghiep`, `que_quan`, `ghi_chu`.
  3. In `QLHK-Client/src/api/__tests__/householdApi.test.ts`, add a unit test verifying `normalizeHousehold` correctly extracts demographic fields when provided Vietnamese keys.
- **Scoped Test Command**: `cd QLHK-Client && npx vitest run src/api/__tests__/householdApi.test.ts`
- **Done Criteria**: `householdApi.test.ts` exits with code 0; Vietnamese alias fallback verified; staged gross diff `<= 200 LOC`.

---

### Section 2: Replace Hardcoded 2026 with Dynamic Calculation Year in householdStore (Step 2)
- **Finding IDs**: `BUG-002`
- **Target Files**: `QLHK-Client/src/store/householdStore.ts`, `QLHK-Client/src/utils/__tests__/utilities.test.ts`
- **Assigned Role**: None (no .agents/ directory)
- **Role Focus**: Dynamic temporal calculation, age computation, and state persistence
- **Graph Check**: `graft callers useHouseholdStore || grep -rn "useHouseholdStore" src/`
- **Estimated Gross Diff**: `~35 LOC` (`<= 200 gross LOC` ceiling)
- **Target Signatures / Contract Changes**:
  ```ts
  // QLHK-Client/src/store/householdStore.ts:248, 266, 379, 410, 453
  const currentYear = new Date().getFullYear();
  // In addHousehold:
  const age = calculateAge(dobRaw, currentYear);
  birth_year: currentYear - age,
  // In saveMember (edit existing):
  const age = calculateAge(dobRaw, currentYear);
  birth_year: currentYear - age,
  // In saveMember (add new):
  birth_year: currentYear - age,
  ```
- **Actions**:
  1. In `QLHK-Client/src/store/householdStore.ts`, define `const currentYear = new Date().getFullYear()` or use local current year.
  2. In `addHousehold` (lines 248, 266), replace `calculateAge(dobRaw, 2026)` with `calculateAge(dobRaw, currentYear)` and `birth_year: currentYear - age`.
  3. In `saveMember` (lines 379, 410, 453), replace `calculateAge(dobRaw, 2026)` with `calculateAge(dobRaw, currentYear)` and `birth_year: currentYear - age`.
  4. Verify existing test suite `src/utils/__tests__/utilities.test.ts` passes cleanly.
- **Scoped Test Command**: `cd QLHK-Client && npx vitest run src/utils/__tests__/utilities.test.ts`
- **Done Criteria**: `utilities.test.ts` exits with code 0; 0 occurrences of hardcoded `2026` remain in `householdStore.ts`; staged gross diff `<= 200 LOC`.

---

### Section 3: Add backdrop-blur-sm to Fullscreen Modal Overlays (Step 3)
- **Finding IDs**: `BUG-003`
- **Target Files**: `QLHK-Client/src/components/common/Modal.tsx`, `QLHK-Client/src/components/households/CitizenModal.tsx`, `QLHK-Client/src/components/households/HouseholdDrawer.tsx`, `QLHK-Client/src/components/excel/ExportSettingsModal.tsx`, `QLHK-Client/src/components/excel/ImportPreviewModal.tsx`, `QLHK-Client/src/components/households/ConflictResolutionModal.tsx`, `QLHK-Client/src/hooks/useModal.tsx`
- **Assigned Role**: None (no .agents/ directory)
- **Role Focus**: UI design invariant compliance, modal backdrop glassmorphism, and visual polish
- **Graph Check**: `graft callers Modal || grep -rn "bg-slate-950/45" src/`
- **Estimated Gross Diff**: `~30 LOC` (`<= 200 gross LOC` ceiling)
- **Target Signatures / Contract Changes**:
  ```tsx
  // QLHK-Client/src/components/common/Modal.tsx:91
  className="fixed inset-0 !m-0 flex items-center justify-center p-4 sm:p-6 bg-slate-950/45 dark:bg-black/60 backdrop-blur-sm select-none animate-in fade-in duration-150"
  // QLHK-Client/src/components/households/CitizenModal.tsx:252
  className="fixed inset-0 !m-0 z-[70] flex items-center justify-center p-4 bg-slate-950/45 dark:bg-black/60 backdrop-blur-sm select-none animate-in fade-in duration-150"
  // QLHK-Client/src/components/households/HouseholdDrawer.tsx:366
  className="fixed inset-0 !m-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/45 dark:bg-black/60 backdrop-blur-sm select-none animate-in fade-in duration-150"
  // QLHK-Client/src/components/excel/ImportPreviewModal.tsx:293
  className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-[rgba(15,23,42,0.45)] dark:bg-[rgba(0,0,0,0.6)] backdrop-blur-sm animate-in fade-in duration-150 select-none"
  ```
- **Actions**:
  1. In `QLHK-Client/src/components/common/Modal.tsx:91`, add `backdrop-blur-sm` to overlay `className`.
  2. In `QLHK-Client/src/components/households/CitizenModal.tsx:252`, add `backdrop-blur-sm`.
  3. In `QLHK-Client/src/components/households/HouseholdDrawer.tsx:366`, add `backdrop-blur-sm`.
  4. In `QLHK-Client/src/components/excel/ExportSettingsModal.tsx:146`, add `backdrop-blur-sm`.
  5. In `QLHK-Client/src/components/excel/ImportPreviewModal.tsx:293`, add `backdrop-blur-sm`.
  6. In `QLHK-Client/src/components/households/ConflictResolutionModal.tsx:37`, add `backdrop-blur-sm`.
  7. In `QLHK-Client/src/hooks/useModal.tsx:69`, add `backdrop-blur-sm`.
  8. Run existing modal component tests to verify no rendering regressions.
- **Scoped Test Command**: `cd QLHK-Client && npx vitest run src/components/households/__tests__/CitizenModal.test.tsx`
- **Done Criteria**: `CitizenModal.test.tsx` exits with code 0; all fullscreen modal overlay backdrops contain `backdrop-blur-sm`; staged gross diff `<= 200 LOC`.

---

### Section 4: Robustify DOB Parsing Regex in AnalyticsDashboard (Step 4)
- **Finding IDs**: `BUG-004`
- **Target Files**: `QLHK-Client/src/components/analytics/AnalyticsDashboard.tsx`, `QLHK-Client/src/components/analytics/__tests__/AnalyticsDashboard.test.tsx`
- **Assigned Role**: None (no .agents/ directory)
- **Role Focus**: Demographic analytics aggregation, ISO/Vietnamese date normalization, and pyramid cohort accuracy
- **Graph Check**: `graft callers AnalyticsDashboard || grep -rn "AnalyticsDashboard" src/`
- **Estimated Gross Diff**: `~45 LOC` (`<= 200 gross LOC` ceiling)
- **Target Signatures / Contract Changes**:
  ```ts
  // QLHK-Client/src/components/analytics/AnalyticsDashboard.tsx:117-122
  const dobVal = m.dob_formatted || m.dob_raw || m.dob || "";
  const match = dobVal.match(/(?:^|\D)(\d{4})(?:\D|$)/);
  let age = m.age;
  if (match) {
    age = currentYear - parseInt(match[1], 10);
  }
  ```
- **Actions**:
  1. In `QLHK-Client/src/components/analytics/AnalyticsDashboard.tsx`, update line 118 from `dobVal.match(/(\d{4})$/)` to `dobVal.match(/(?:^|\D)(\d{4})(?:\D|$)/)`.
  2. In `QLHK-Client/src/components/analytics/__tests__/AnalyticsDashboard.test.tsx`, add an assertion testing citizen records with ISO date strings (`YYYY-MM-DD` and `YYYY/MM/DD`) to verify they are correctly placed into the right age group cohorts.
  3. Run scoped test command to ensure all dashboard analytics tests pass.
- **Scoped Test Command**: `cd QLHK-Client && npx vitest run src/components/analytics/__tests__/AnalyticsDashboard.test.tsx`
- **Done Criteria**: `AnalyticsDashboard.test.tsx` exits with code 0; ISO date strings correctly compute birth year and age cohorts; staged gross diff `<= 200 LOC`.

---

## 7. Risks & Rollback Plan
| Risk / Failure Scenario | Likelihood / Impact | Mitigation in Plan | Rollback Procedure |
| :--- | :---: | :--- | :--- |
| Vietnamese field name collides with non-demographic key | LOW / LOW | Only specific 5 demographic keys (`hoc_van`, `nvqs`, `nghe_nghiep`, `que_quan`, `ghi_chu`) checked as fallback. | `git checkout HEAD~1 -- QLHK-Client/src/api/householdApi.ts` |
| `calculateAge` fails on invalid string in dynamic year | LOW / LOW | `calculateAge` already validates via `parseAndValidateDob` and returns `0` fallback on bad data. | `git checkout HEAD~1 -- QLHK-Client/src/store/householdStore.ts` |
| `backdrop-blur-sm` causes performance drops on low-end hardware | LOW / LOW | Tailwind's `-sm` blur is GPU-accelerated and lightweight; existing CSS already supports hardware acceleration. | `git checkout HEAD~1 -- QLHK-Client/src/components/common/Modal.tsx` |
| Regex matches 4-digit street number or ID in unformatted DOB string | LOW / LOW | `dobVal` checked in order of specificity (`dob_formatted`, `dob_raw`, `dob`) which only contain date values. | `git checkout HEAD~1 -- QLHK-Client/src/components/analytics/AnalyticsDashboard.tsx` |

## 8. Final Verification Gate (Step 5 in `roadmap`)
- **Full Test Suite Command**: `cd QLHK-Client && npm test -- --run` (Must exit 0 with 0 failures across all 17 test suites)
- **Typecheck / Static Analysis Command**: `cd QLHK-Client && npx tsc --noEmit` (Must exit 0 with 0 compilation errors)
- **Clean Working Tree Check**: `test -z "$(git status --porcelain)"` (Must exit 0)

## 9. Roadmap Handoff Block
```text
Plan verified, committed, and saved to: docs/plans/remediate-client-audit-findings.md
- Task Name (remediate-client-audit-findings): remediate-client-audit-findings
- Implementation Steps: 4 (Sections 1..4, plus Step 5 Final Verification Gate)
- Full Test Command: cd QLHK-Client && npm test -- --run
- Typecheck Command: cd QLHK-Client && npx tsc --noEmit
- Clean Tree Verified: git status --porcelain is empty

Next Action: Invoke the `roadmap` skill with `docs/plans/remediate-client-audit-findings.md` to generate the step-by-step execution prompt (or execute the roadmap directly).
```
