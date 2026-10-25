# Implementation Plan: Remove QLCS Policy Excel Import & Port Intelligent Column Mapping to QLHK (`qlcs-remove-excel-port-column-mapping-to-qlhk`)

- **Task Name (`<TASK_NAME>`)**: `qlcs-remove-excel-port-column-mapping-to-qlhk`
- **Task Type**: `Refactor`
- **Source Input**: `User Request`
- **Target Branch (for `roadmap`)**: `roadmap/qlcs-remove-excel-port-column-mapping-to-qlhk`
- **Full Test Command**: `cargo check --manifest-path QLHK/QLHK-Backend-Rust/Cargo.toml && & "QLHK/QLHK-Client/node_modules/.bin/vitest.cmd" run --config QLHK/QLHK-Client/vitest.config.ts`
- **Typecheck / Lint Command**: `& "QLHK/QLHK-Client/node_modules/.bin/tsc.cmd" --project QLHK/QLHK-Client/tsconfig.json --noEmit && cargo check --manifest-path QLHK/QLHK-Backend-Rust/Cargo.toml`
- **Total Implementation Steps**: `7`

---

## 1. Context & Goal
In the current system architecture, social policy data (Chúc thọ and Hưu trí xã hội) is dynamically derived and synchronized from master demographic records (Hộ khẩu & Nhân khẩu) based on citizen age, date of birth, and social welfare status. Consequently, direct Excel file imports into Chúc thọ and Hưu trí are redundant, bypass demographic data invariants, and create data divergence risks. Conversely, QLHK's demographic Excel import currently relies on a rigid parser that assumes fixed 11-column templates, failing on arbitrary spreadsheet layouts.

The goal of this plan is twofold: (1) Clean up and eliminate Excel import functionality from the QLCS policy module (UI button in `DashboardPage.tsx`, `ImportModal` invocation, and backend policy import handlers), while keeping policy Excel export fully intact; and (2) Port and adapt the intelligent, 3-step column-mapping engine and interactive UI (`Upload` -> `Khớp cột` -> `Xem trước & Xác nhận`) over to QLHK, allowing village and communal officers to upload arbitrary household spreadsheets, map columns visually with smart alias matching, validate records, and import them reliably.

---

## 2. Assumptions
- `ASM-01`: Policy export ("Xuất Excel") in QLCS (`DashboardPage.tsx`, `ExportModal.tsx`) remains 100% intact and functional as it is critical for administrative reporting (`QLHK/QLHK-Client/src/features/qlcs/pages/DashboardPage.tsx:458-465`).
- `ASM-02`: Policy data continues to be automatically derived and queried from demographic records in `qlhk.citizens` and `qlhk.households` without requiring manual file uploads into policy tables.
- `ASM-03`: QLHK system fields for demographic column mapping comprise: `stt`, `code` (mã hộ), `household_head` (chủ hộ/thành viên), `fullName` (họ và tên - bắt buộc), `relationship` (quan hệ chủ hộ), `dob` (ngày/năm sinh - bắt buộc), `gender` (giới tính), `ethnicity` (dân tộc), `religion` (tôn giáo), `cccd` (số CCCD/CMND), `address` (địa chỉ/thôn), and `notes` (ghi chú).
- `ASM-04`: Backward compatibility with legacy standard 11-column Dak Ha templates is preserved via automatic alias matching reaching 100% suggestion confidence.

---

## 3. Non-Goals (Out of Scope — YAGNI)
- Modifying backend core demographic import algorithms (`/excel/import` in `QLHK/QLHK-Backend-Rust/src/handlers/excel.rs`) or database schema migrations for `qlhk.households` / `qlhk.citizens`.
- Removing Excel export capabilities from either QLCS or QLHK.
- Introducing external third-party column mapping packages or UI dependencies; all mapping logic uses native TypeScript and existing UI primitives.
- Altering existing authentication, authorization, or village scoping RBAC rules.

---

## 4. Current State & Codebase Grounding (`file:start-end` Read)
| File Path (`verified on disk`) | Lines Read | Current Responsibility & Relevant Symbols |
| :--- | :---: | :--- |
| `QLHK/QLHK-Client/src/features/qlcs/pages/DashboardPage.tsx` | `446-465` | Renders "Nhập Excel" button triggering `setIsImportModalOpen(true)` and "Xuất Excel" button. |
| `QLHK/QLHK-Client/src/features/qlcs/pages/DashboardPage.tsx` | `562-585` | Mounts `ImportModal` passing mapping, preview, and confirmation props. |
| `QLHK/QLHK-Client/src/hooks/useImportExport.ts` | `8-39` | Combines `useImportProfiles` and `useExportProfiles` into a unified hook. |
| `QLHK/QLHK-Client/src/features/qlcs/components/dashboard/ImportModal.tsx` | `1-100` | 1205-line modal component implementing 3-step wizard with visual column mapping table. |
| `QLHK/QLHK-Client/src/utils/policyExcelMapping.ts` | `1-62` | Implements `suggestColumnMapping` using alias scoring (exact=100, prefix/suffix=80, substring=50). |
| `QLHK/QLHK-Client/src/utils/policyExcelHeaders.ts` | `1-100` | Implements `extractExcelHeaders` detecting header rows and merged two-tier subheaders. |
| `QLHK/QLHK-Client/src/utils/policyExcelBaseFields.ts` | `1-152` | Defines `BASE_SYSTEM_FIELDS` (`name`, `dob`, `gender`, `cccd`, `ethnicity`, `residence`, etc.). |
| `QLHK/QLHK-Client/src/components/excel/ImportPreviewModal.tsx` | `1-100` | Current QLHK import modal that parses directly via `parseExcelSheet` without column mapping. |
| `QLHK/QLHK-Client/src/features/qlhk/pages/HouseholdsPage.tsx` | `794-840` | `handleConfirmImport` receiving `validRows` and committing households and members via `householdApi`. |
| `QLHK/QLHK-Backend-Rust/src/handlers/policies.rs` | `2415-2430` | `import_policy_excel` handler processing policy spreadsheet rows. |
| `QLHK/QLHK-Backend-Rust/src/handlers/policies.rs` | `2673-2708` | Route bindings for `/chuctho/import`, `/htxh/import`, and `/excel/import`. |

---

## 5. Chosen Design & Blast Radius
- **Chosen Approach**:
  1. *QLCS Cleanup*: Surgically eliminate the "Nhập Excel" button in `DashboardPage.tsx`, remove the `<ImportModal>` mount, and decouple `useImportProfiles` from `useImportExport.ts` while retaining export functionality. In the Rust backend, deprecate or remove the `/chuctho/import`, `/htxh/import`, and `/excel/import` route endpoints with clear logging that policy records are synchronized from demographics.
  2. *QLHK Mapping Core*: Create `householdExcelFields.ts`, `householdExcelMapping.ts`, and `householdExcelParser.ts` under `QLHK/QLHK-Client/src/utils/`. These adapt the alias dictionary and scoring heuristic specifically for household registration concepts (Mã hộ, Chủ hộ, Họ tên, Quan hệ, Ngày sinh, Giới tính, Dân tộc, Tôn giáo, CCCD, Địa chỉ, Ghi chú).
  3. *QLHK Multi-Step UI*: Refactor `ImportPreviewModal.tsx` and extract a dedicated `ColumnMappingStep.tsx` component under `QLHK/QLHK-Client/src/components/excel/`. The modal transitions across 3 steps: `upload` (Dropzone & template download) -> `mapping` (Visual column selector with auto-match and sample preview) -> `preview` (Row table with validation errors/warnings and batch confirmation).
- **Caller / Contract Blast Radius**:
  - Downstream callers of QLCS `DashboardPage`: No breaking changes; UI simply drops the redundant button.
  - Downstream callers of `ImportPreviewModal`: Both `HouseholdsPage.tsx` and `ExcelPage.tsx` interface with `ImportPreviewModal` using the existing `isOpen`, `onClose`, and `onConfirm(validRows)` contract, maintaining 100% backward compatibility.
- **Rejected Alternatives (`<= 2`)**:
  - *Alternative A: Keep QLCS ImportModal and copy-paste entire 1200 lines into QLHK*: Rejected because copying the monolithic file duplicates code, introduces technical debt, and carries policy-specific fields (`age60`, `age75plus`, `baoTro`) into demographic records.
  - *Alternative B: Force all users to format Excel according to fixed 11 columns*: Rejected because real-world files from police or provincial departments arrive with arbitrary column layouts and headers; automated mapping is essential for user ergonomics.
- **UI/UX & Design Heuristics (Mandatory for Frontend / UI Tasks per `shared/contracts.md` §9)**:
  - *Hierarchy & Layout*: The 3-step import modal provides clear progressive disclosure: Step 1 (Dropzone with generous click/drag bounds), Step 2 (Structured 2-column mapping grid: System Field badge/label on left, Excel Column selector on right with row 1 sample data pill), Step 3 (Summary statistics bar with green/amber/rose badges and paginated preview table).
  - *Systemic Consistency*: Adheres strictly to the project design tokens: `rounded-2xl`/`rounded-3xl` cards, subtle borders `border-slate-200/90 dark:border-slate-800`, backdrop blur, and primary emerald/rose accents.

---

## 6. Atomic Step Breakdown (`<= 200 Gross LOC` Per Step)

### Section 1: Remove Policy Excel Import from QLCS Frontend (Step 1)
- **Target Files**: `QLHK/QLHK-Client/src/features/qlcs/pages/DashboardPage.tsx`, `QLHK/QLHK-Client/src/hooks/useImportExport.ts`
- **Assigned Role**: `.agents/frontend-developer.md`
- **Role Focus**: Eliminate dead UI affordance without breaking policy export or profile filtering.
- **Graph Check**: `graft callers useImportExport`
- **Estimated Gross Diff**: `~75 LOC`
- **Target Signatures / Contract Changes**:
  ```typescript
  export function useImportExport(
    villageId: string | undefined,
    activeTab: TabType,
    _user: any,
    loadProfiles: () => Promise<void>,
    isGlobal?: boolean,
    villages?: { id: number; name: string }[],
    filters?: ImportExportFilters,
  ): ReturnType<typeof useExportProfiles>;
  ```
- **Actions**:
  1. In `DashboardPage.tsx`: Remove the "Nhập Excel" button (`lines 446-456`), remove the `<ImportModal>` component mount (`lines 562-585`), and remove unused import state variables destructured from `useImportExport`.
  2. In `useImportExport.ts`: Remove `useImportProfiles` instantiation, forwarding only `useExportProfiles` states.
  3. Verify that `DashboardPage.tsx` compiles with zero unused variable warnings.
- **Scoped Test Command**: `& "QLHK/QLHK-Client/node_modules/.bin/vitest.cmd" run --config QLHK/QLHK-Client/vitest.config.ts src/pages/__tests__/HtxhPage.test.tsx src/pages/__tests__/ChucThoPage.test.tsx`
- **Done Criteria**: Policy dashboard tests pass; "Nhập Excel" button is absent from the rendered UI; staged diff <= 200 LOC.

---

### Section 2: Clean Policy Excel Import Handlers in Backend Rust (Step 2)
- **Target Files**: `QLHK/QLHK-Backend-Rust/src/handlers/policies.rs`
- **Assigned Role**: `.agents/rust-pro.md`
- **Role Focus**: Safely decommission redundant policy spreadsheet ingestion routes.
- **Graph Check**: `graft callers import_policy_excel`
- **Estimated Gross Diff**: `~45 LOC`
- **Target Signatures / Contract Changes**:
  ```rust
  pub fn router() -> axum::Router<AppState> {
      // Routes retain /chuctho, /htxh, /analytics, /excel/export
      // Unused /chuctho/import, /htxh/import, /excel/import removed or deprecated
  }
  ```
- **Actions**:
  1. In `QLHK/QLHK-Backend-Rust/src/handlers/policies.rs`: Remove route bindings for `/chuctho/import`, `/htxh/import`, and `/excel/import` (or return an explicit HTTP 410 Gone / informative message that policies are synced from demographics).
  2. Remove dead code warnings for unused payload structs.
  3. Run `cargo check` to ensure clean backend compilation.
- **Scoped Test Command**: `cargo check --manifest-path QLHK/QLHK-Backend-Rust/Cargo.toml`
- **Done Criteria**: `cargo check` exits 0 with 0 errors; staged diff <= 200 LOC.

---

### Section 3: Household Column Mapping Dictionary & Auto-Suggest Engine (Step 3)
- **Target Files**: `QLHK/QLHK-Client/src/utils/householdExcelFields.ts` `(new)`, `QLHK/QLHK-Client/src/utils/householdExcelMapping.ts` `(new)`
- **Assigned Role**: `.agents/frontend-developer.md`
- **Role Focus**: Construct robust alias dictionary and scoring algorithm for household/citizen fields.
- **Graph Check**: None (greenfield utility)
- **Estimated Gross Diff**: `~140 LOC`
- **Target Signatures / Contract Changes**:
  ```typescript
  export interface HouseholdSystemField {
    key: string;
    label: string;
    required?: boolean;
    description: string;
    aliases: string[];
  }
  export function suggestHouseholdColumnMapping(headers: string[]): Record<string, string>;
  ```
- **Actions**:
  1. Create `householdExcelFields.ts` defining `HOUSEHOLD_SYSTEM_FIELDS`: `fullName` (required), `dob` (required), `relationship`, `code`, `household_head`, `gender`, `ethnicity`, `religion`, `cccd`, `address`, `notes`, with extensive Vietnamese aliases without accents (`ho va ten`, `chu ho`, `ngay sinh`, `nam sinh`, `cmnd`, `hktt`, `dan toc`, etc.).
  2. Create `householdExcelMapping.ts` with `suggestHouseholdColumnMapping(headers)` implementing fuzzy normalized alias matching (exact match score 100, prefix/suffix 80, substring 50).
  3. Export types and helper functions for consumption by the UI.
- **Scoped Test Command**: `& "QLHK/QLHK-Client/node_modules/.bin/vitest.cmd" run --config QLHK/QLHK-Client/vitest.config.ts src/utils/__tests__/excelParser.test.ts`
- **Done Criteria**: Unit tests pass; `suggestHouseholdColumnMapping` accurately resolves standard 11-column headers and unaccented variations; staged diff <= 200 LOC.

---

### Section 4: Mapped Household Excel Row Parser & Normalizer (Step 4)
- **Target Files**: `QLHK/QLHK-Client/src/utils/householdExcelParser.ts` `(new)`, `QLHK/QLHK-Client/src/utils/excelParser.ts`
- **Assigned Role**: `.agents/frontend-developer.md`
- **Role Focus**: Transform arbitrary mapped 2D Excel rows into standardized `ParsedExcelRow[]`.
- **Graph Check**: `graft callers parseExcelSheet`
- **Estimated Gross Diff**: `~160 LOC`
- **Target Signatures / Contract Changes**:
  ```typescript
  export interface MappedHouseholdParseResult {
    rows: ParsedExcelRow[];
    stats: { total: number; valid: number; warnings: number; errors: number };
  }
  export function parseExcelWithHouseholdMapping(
    rawRows: Record<string, any>[],
    mapping: Record<string, string>,
    defaultVillageName?: string,
  ): MappedHouseholdParseResult;
  ```
- **Actions**:
  1. Implement `parseExcelWithHouseholdMapping` in `householdExcelParser.ts`:
     - Reads mapped columns for each row (`fullName`, `dob`, `gender`, `relationship`, `cccd`, `address`, etc.).
     - Validates mandatory fields (`fullName`, `dob`) and normalizes dates via `normalizeExcelDob`.
     - Validates and formats CCCD length (9 or 12 digits), flags warnings for missing or suspect values.
     - Auto-groups households by `code` or consecutive records under detected head of household.
  2. Re-export helper in `excelParser.ts` for clean unified access.
- **Scoped Test Command**: `& "QLHK/QLHK-Client/node_modules/.bin/vitest.cmd" run --config QLHK/QLHK-Client/vitest.config.ts src/utils/__tests__/excelParser.test.ts`
- **Done Criteria**: Scoped unit tests exit 0; parsed rows match expected `ParsedExcelRow` structure; staged diff <= 200 LOC.

---

### Section 5: Interactive Visual Column-Mapping Component (Step 5)
- **Target Files**: `QLHK/QLHK-Client/src/components/excel/ColumnMappingStep.tsx` `(new)`
- **Assigned Role**: `.agents/frontend-developer.md`
- **Role Focus**: Deliver an intuitive, accessible column-matching table matching project design language.
- **Graph Check**: None (greenfield UI component)
- **Estimated Gross Diff**: `~150 LOC`
- **Target Signatures / Contract Changes**:
  ```typescript
  export interface ColumnMappingStepProps {
    headers: string[];
    sampleRow: Record<string, any>;
    mapping: Record<string, string>;
    onMappingChange: (fieldKey: string, header: string) => void;
    onAutoSuggest: () => void;
    onReset: () => void;
  }
  export const ColumnMappingStep: React.FC<ColumnMappingStepProps>;
  ```
- **Actions**:
  1. Create `ColumnMappingStep.tsx` rendering a clean mapping table:
     - Left column: System field label, required badge (`Bắt buộc` in red/emerald), and descriptive tooltip.
     - Center column: `CustomSelect` dropdown listing all extracted Excel headers, with a clear `(Bỏ qua / Không ánh xạ)` option.
     - Right column: Sample preview pill showing the extracted value from row 1 for the selected header.
  2. Add header action bar with "Tự động khớp cột" (magic wand) and "Đặt lại" buttons.
  3. Ensure complete dark mode and light mode visual polish (`bg-slate-50 dark:bg-slate-800/50`).
- **Scoped Test Command**: `& "QLHK/QLHK-Client/node_modules/.bin/tsc.cmd" --project QLHK/QLHK-Client/tsconfig.json --noEmit`
- **Done Criteria**: Component compiles with 0 TypeScript errors; accessible dropdown controls; staged diff <= 200 LOC.

---

### Section 6: Upgrade QLHK ImportPreviewModal to 3-Step Wizard (Step 6)
- **Target Files**: `QLHK/QLHK-Client/src/components/excel/ImportPreviewModal.tsx`
- **Assigned Role**: `.agents/frontend-developer.md`
- **Role Focus**: Integrate multi-step navigation: Upload -> Khớp cột -> Xem trước & Xác nhận.
- **Graph Check**: `graft callers ImportPreviewModal`
- **Estimated Gross Diff**: `~180 LOC`
- **Target Signatures / Contract Changes**:
  ```typescript
  export type ImportWizardStep = "upload" | "mapping" | "preview";
  export interface ImportPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    file?: File | null;
    onConfirm?: (validRows: ParsedExcelRow[]) => Promise<void> | void;
    importing?: boolean;
  }
  ```
- **Actions**:
  1. Add `currentStep` state (`upload` | `mapping` | `preview`) and stepper header indicator at the top of the modal.
  2. When a file is uploaded in Step 1, extract headers and auto-suggest mapping, transitioning smoothly to Step 2 (`mapping`).
  3. In Step 2, render `ColumnMappingStep` allowing user review/adjustment. Validate required fields before allowing "Tiếp tục xem trước ->".
  4. In Step 3, parse data with the confirmed mapping, displaying the existing paginated preview table, issue filters, and "Xác nhận Nhập" button.
  5. Provide "Quay lại" buttons to allow stepping backward without losing chosen file or mapping state.
- **Scoped Test Command**: `& "QLHK/QLHK-Client/node_modules/.bin/vitest.cmd" run --config QLHK/QLHK-Client/vitest.config.ts src/components/excel/__tests__/ImportPreviewModal.test.tsx`
- **Done Criteria**: Modal transitions through all 3 steps seamlessly; `onConfirm` receives mapped `ParsedExcelRow[]`; staged diff <= 200 LOC.

---

### Section 7: Regression Tests & Verification (Step 7)
- **Target Files**: `QLHK/QLHK-Client/src/utils/__tests__/householdExcelMapping.test.ts` `(new)`, `QLHK/QLHK-Client/src/components/excel/__tests__/ImportPreviewModal.test.tsx`
- **Assigned Role**: `.agents/test-engineer.md`
- **Role Focus**: Ensure zero regression across file formats and verify mapping step accuracy.
- **Graph Check**: None
- **Estimated Gross Diff**: `~160 LOC`
- **Target Signatures / Contract Changes**:
  ```typescript
  describe("householdExcelMapping", () => {
    it("suggests 100% correct mapping for standard 11 columns", () => {});
    it("correctly maps arbitrary police export columns", () => {});
  });
  ```
- **Actions**:
  1. Create `householdExcelMapping.test.ts` testing alias suggestions against standard and exotic column names.
  2. Update `ImportPreviewModal.test.tsx` to verify step transitions, mapping adjustments, and confirm callback payload.
  3. Run the complete client test suite to ensure no collateral breaks.
- **Scoped Test Command**: `& "QLHK/QLHK-Client/node_modules/.bin/vitest.cmd" run --config QLHK/QLHK-Client/vitest.config.ts src/utils/__tests__/householdExcelMapping.test.ts src/components/excel/__tests__/ImportPreviewModal.test.tsx`
- **Done Criteria**: All new and existing test assertions pass 100%; staged diff <= 200 LOC.

---

## 7. Risks & Rollback Plan
| Risk / Failure Scenario | Likelihood / Impact | Mitigation in Plan | Rollback Procedure |
| :--- | :---: | :--- | :--- |
| File has non-standard header row index (e.g. metadata banner in rows 1-3) | MED / MED | `extractExcelHeaders` scans first 25 rows for key demographic markers (`ho ten`, `stt`, `nam sinh`). | Fallback to manual header row selector if not detected. |
| User uploads an empty or password-protected spreadsheet | LOW / LOW | File size and SheetNames guard checks with immediate descriptive modal error. | User alerted via `showAlert`; modal stays on Step 1. |
| Breaking changes to `HouseholdsPage.tsx` import callback | LOW / HIGH | `ImportPreviewModal` retains the exact same `onConfirm(validRows)` interface returning `ParsedExcelRow[]`. | Revert `ImportPreviewModal.tsx` via `git checkout HEAD~1 -- src/components/excel/ImportPreviewModal.tsx`. |

---

## 8. Final Verification Gate (Step 8 in `roadmap`)
- **Full Test Suite Command**: `cargo check --manifest-path QLHK/QLHK-Backend-Rust/Cargo.toml && & "QLHK/QLHK-Client/node_modules/.bin/vitest.cmd" run --config QLHK/QLHK-Client/vitest.config.ts` (Must exit 0 with zero regressions vs. baseline)
- **Typecheck / Static Analysis Command**: `& "QLHK/QLHK-Client/node_modules/.bin/tsc.cmd" --project QLHK/QLHK-Client/tsconfig.json --noEmit && cargo check --manifest-path QLHK/QLHK-Backend-Rust/Cargo.toml` (Must exit 0 with 0 errors)
- **Clean Working Tree Check**: `test -z "$(git status --porcelain)"` (Must exit 0)

---

## 9. Roadmap Handoff Block
```text
Plan verified, committed, and saved to: docs/plans/qlcs-remove-excel-port-column-mapping-to-qlhk.md
- Task Name (<TASK_NAME>): qlcs-remove-excel-port-column-mapping-to-qlhk
- Implementation Steps: 7 (Sections 1..7, plus Step 8 Final Verification Gate)
- Full Test Command: cargo check --manifest-path QLHK/QLHK-Backend-Rust/Cargo.toml && & "QLHK/QLHK-Client/node_modules/.bin/vitest.cmd" run --config QLHK/QLHK-Client/vitest.config.ts
- Typecheck Command: & "QLHK/QLHK-Client/node_modules/.bin/tsc.cmd" --project QLHK/QLHK-Client/tsconfig.json --noEmit && cargo check --manifest-path QLHK/QLHK-Backend-Rust/Cargo.toml
- Clean Tree Verified: git status --porcelain is empty

Next Action: Invoke the `roadmap` skill with `docs/plans/qlcs-remove-excel-port-column-mapping-to-qlhk.md` to generate the step-by-step execution prompt (or execute the roadmap directly).
```
