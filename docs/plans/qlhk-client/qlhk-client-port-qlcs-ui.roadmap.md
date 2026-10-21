`````text
[MANDATORY SYSTEM DIRECTIVE]:
You are executing a multi-step engineering task based on the verified plan at:
docs/plans/qlhk-client/qlhk-client-port-qlcs-ui.md

ENVIRONMENT REQUIREMENT:
All shell commands require a POSIX-compatible shell (Git Bash on Windows, WSL, Linux, or macOS).

STRICT INVARIANTS:
1. BRANCH & PRE-FLIGHT (Initial Start Only):
   - Pre-Switch Detached-HEAD & Protected-Branch Guard: Before creating roadmap/qlhk-client-port-qlcs-ui, verify HEAD is not detached (BASE_BRANCH=$(git branch --show-current) and test -n "$BASE_BRANCH"; if empty/detached, halt immediately and ask user to check out a named branch first).
   - Create and switch to isolated branch: git switch -c roadmap/qlhk-client-port-qlcs-ui. If the branch already exists on a fresh start, halt immediately and ask whether to resume or rename.
   - Verify clean working tree: test -z "$(git status --porcelain)".
   - Execute baseline test command twice: cd QLHK/QLHK-Client && npm test -- --run && npm test -- --run -> Record passing count into docs/plans/qlhk-client/qlhk-client-port-qlcs-ui.task.md and immediately commit the task tracker.
2. TWO-TIER READ CADENCE & CONTEXT ANCHORING:
   - Tier 1 (Session Initialization): At STEP 0, perform an anchor read of docs/plans/qlhk-client/qlhk-client-port-qlcs-ui.task.md, .agents/frontend-developer.md (if present), and the plan header docs/plans/qlhk-client/qlhk-client-port-qlcs-ui.md. Emit mandatory proof-of-read log before taking action:
     [Context Anchored]: qlhk-client-port-qlcs-ui.task.md (<status>), frontend-developer.md (<invariants>), qlhk-client-port-qlcs-ui.md (<goal>)
   - Tier 2 (In-Session Atomic Step K): Never re-read the entire plan or role file at each step. Rely on inlined instructions inside STEP K.
3. PRAGMATIC EFFECTIVENESS & ZERO CODE MUTILATION:
   - Copy the FULL, AUTHENTIC, RICH components from QLCS/QLCS-Client/src into QLHK/QLHK-Client/src without cutting down features, tabs, filters, or modals.
   - Replace any external clsx import with an inline helper: const clsx = (...args: any[]) => args.flat().filter(Boolean).join(" ");
   - Replace xlsx-js-style dynamic import with standard xlsx (already in package.json): import * as XLSX from "xlsx";
4. ZERO COMMENTS IN CODE (P0 INVARIANT):
   - Absolutely NO comments (//, /* ... */, #, JSDoc/TSDoc, HTML comments) in any new or modified code.
   - Active removal: strip all comments from any code copied from QLCS.
5. ATOMIC COMMITS & COMMIT HOOKS:
   - After scoped tests and typecheck pass, update docs/plans/qlhk-client/qlhk-client-port-qlcs-ui.task.md to mark [x] and commit:
     git add -A && git commit -m "<type>(roadmap): complete step K - <title>"
   - Never use --no-verify. Working tree must be 100% clean after each step commit.
6. SAFE CIRCUIT BREAKER ROLLBACK & UNBLOCKING:
   - Limit to maximum 3 attempts per step. Before retrying, reset uncommitted code back to last checkpoint while preserving .task.md.
7. SCOPED TESTS & TYPECHECK:
   - Execute scoped tests AND typecheck: cd QLHK/QLHK-Client && npx tsc --noEmit at each step.
   - Run the full test suite and full typecheck at final verification gate (Step 6).

---

### STEP 0: BRANCH ISOLATION, PRE-FLIGHT GATE & TASK INITIALIZATION
1. Capture current branch as BASE_BRANCH: BASE_BRANCH=$(git branch --show-current). Verify HEAD is not detached. Create and switch to branch:
   git switch -c roadmap/qlhk-client-port-qlcs-ui
2. Verify clean working tree: test -z "$(git status --porcelain)".
3. Capture baseline commit hash via git rev-parse --short HEAD and run baseline tests twice:
   cd QLHK/QLHK-Client && npm test -- --run && npm test -- --run -> Record passing count (expect 183 passing).
4. Create docs/plans/qlhk-client/qlhk-client-port-qlcs-ui.task.md with this content:

# Task Progress Tracker: qlhk-client-port-qlcs-ui

- **Project**: QLHK-Client
- **Base Branch**: `<BASE_BRANCH>`
- **Branch**: `roadmap/qlhk-client-port-qlcs-ui`
- **Plan Reference**: `docs/plans/qlhk-client/qlhk-client-port-qlcs-ui.md`
- **Roadmap Reference**: `docs/plans/qlhk-client/qlhk-client-port-qlcs-ui.roadmap.md`
- **Baseline Checkpoint**: `<BASELINE_HASH>` (<PASS_COUNT> passing across 2 baseline runs)
- **Known Baseline / Flaky Failures**: None

## Step Checklist
- [x] Step 0: Branch Isolation, Pre-Flight Gate & Task Initialization
- [ ] Step 1: Foundation Types, Context & API Adapters
- [ ] Step 2: Hooks & Utility Layer
- [ ] Step 3: Full Analytics Suite Components & Page
- [ ] Step 4: Full Dashboard UI Components
- [ ] Step 5: DashboardPage, Page Integration & Test Contract Alignment
- [ ] Step 6: Final Verification Gate

## Project Gotchas & Learned Invariants
- QLCS code contains comments; mandatory to strip 100% of comments before saving into QLHK.
- QLCS uses clsx; in QLHK-Client use inline helper `const clsx = (...args: any[]) => args.flat().filter(Boolean).join(" ");`.
- QLCS uses xlsx-js-style; in QLHK-Client use standard `xlsx` library already installed.

5. Commit Step 0:
   git add docs/plans/qlhk-client/qlhk-client-port-qlcs-ui.task.md && git commit -m "chore(roadmap): initialize task tracker for qlhk-client-port-qlcs-ui"

---

### STEP 1: FOUNDATION TYPES, CONTEXT & API ADAPTERS
- START STEP:
  + Update `docs/plans/qlhk-client/qlhk-client-port-qlcs-ui.task.md`: Mark Step 1 as `[/]`
- **Goal**: Cung cấp đầy đủ các types, context helpers và API client adapters tương thích 100% cho các component từ QLCS.
- **Target Files**:
  - `QLHK/QLHK-Client/src/AppContext.tsx`: Expose thêm `isDarkMode: theme === "dark"`, và export alias `export const useAppContext = useApp;`.
  - `QLHK/QLHK-Client/src/hooks/useModal.tsx`: Bổ sung 2 helper functions `showAlert(title, message, type?)` và `showConfirm(title, message, type?, confirmText?, cancelText?)` trả về Promise<boolean|void>, export cùng `useModal`.
  - `QLHK/QLHK-Client/src/types/index.ts`: Export thêm `TabType = "chuctho" | "htxh"`, `Profile`, `HtxhProfile`, `AuditLog`, `SortKey`, `SortDirection`, `IPCResponse`.
  - `QLHK/QLHK-Client/src/api/apiClient.ts`: Export `apiClient` từ `./client` làm bridge.
  - `QLHK/QLHK-Client/src/api/settings.ts`: Re-export `settingsApi` từ `./settingsApi` hoặc alias tương ứng.
  - `QLHK/QLHK-Client/src/api/profiles.ts`: Port từ `QLCS/QLCS-Client/src/api/profiles.ts`, cấu hình endpoint gọi `/policies/chuctho`, map `data`, `pagination`, `getProfileStats`, `updateProfileStatus`, `bulkUpdateStatus`, `bulkDelete`, `recalculate`.
  - `QLHK/QLHK-Client/src/api/htxh.ts`: Port từ `QLCS/QLCS-Client/src/api/htxh.ts`, cấu hình endpoint gọi `/policies/htxh`, map tương tự.
  - `QLHK/QLHK-Client/src/api/analyticsApi.ts`: Port từ `QLCS/QLCS-Client/src/api/analyticsApi.ts`, cấu hình gọi `/policies/analytics`.
- **Invariants**: ZERO COMMENTS IN CODE. 100% Type-safe.
- **Verification**: `cd QLHK/QLHK-Client && npx tsc --noEmit`
- **Commit**: `feat(roadmap): complete step 1 - foundation types context and api adapters`

---

### STEP 2: HOOKS & UTILITY LAYER
- START STEP:
  + Update `docs/plans/qlhk-client/qlhk-client-port-qlcs-ui.task.md`: Mark Step 2 as `[/]`
- **Goal**: Đưa đầy đủ các hooks, helpers và utilities cốt lõi từ QLCS sang QLHK-Client.
- **Target Files**:
  - `QLHK/QLHK-Client/src/components/dashboard/constants.ts`: Port từ `QLCS/QLCS-Client/src/components/dashboard/constants.ts` (chứa `DAKHA_ETHNICITIES`).
  - `QLHK/QLHK-Client/src/components/common/Tooltip.tsx`: Port từ `QLCS/QLCS-Client/src/components/common/Tooltip.tsx` (`Tooltip`, `TooltipTrigger`, `TooltipContent`).
  - `QLHK/QLHK-Client/src/components/common/Toast.tsx`: Export `useToast` từ `../../hooks/useToast` để đáp ứng các file import từ common/Toast.
  - `QLHK/QLHK-Client/src/components/common/ExcelDropzone.tsx`: Re-export từ `../excel/ExcelDropzone`.
  - `QLHK/QLHK-Client/src/hooks/useProfiles.ts`: Port từ `QLCS/QLCS-Client/src/hooks/useProfiles.ts` (xử lý state profiles, stats, selection, bulk actions, status toggle).
  - `QLHK/QLHK-Client/src/hooks/useFilters.ts`: Port từ `QLCS/QLCS-Client/src/hooks/useFilters.ts` (xử lý bộ lọc tìm kiếm, thôn, mốc tuổi, năm, sort).
  - `QLHK/QLHK-Client/src/hooks/useAnalyticsFluctuation.ts`: Port từ `QLCS/QLCS-Client/src/hooks/useAnalyticsFluctuation.ts`.
  - `QLHK/QLHK-Client/src/hooks/useUndo.ts`: Port từ `QLCS/QLCS-Client/src/hooks/useUndo.ts`.
  - `QLHK/QLHK-Client/src/hooks/useFormValidation.ts`: Port từ `QLCS/QLCS-Client/src/hooks/useFormValidation.ts`.
  - `QLHK/QLHK-Client/src/utils/excelExporter.ts`: Port từ `QLCS/QLCS-Client/src/utils/excelExporter.ts`, thay thế `xlsx-js-style` bằng `xlsx` chuẩn.
  - `QLHK/QLHK-Client/src/utils/excelParser.ts`: Port các hằng số mapping và parser cần thiết từ QLCS sang QLHK.
- **Invariants**: ZERO COMMENTS IN CODE.
- **Verification**: `cd QLHK/QLHK-Client && npx tsc --noEmit`
- **Commit**: `feat(roadmap): complete step 2 - hooks and utility layer`

---

### STEP 3: FULL ANALYTICS SUITE COMPONENTS & PAGE
- START STEP:
  + Update `docs/plans/qlhk-client/qlhk-client-port-qlcs-ui.task.md`: Mark Step 3 as `[/]`
- **Goal**: Port nguyên vẹn toàn bộ cụm component thống kê phân tích chính sách và AnalyticsPage từ QLCS.
- **Target Files**:
  - `QLHK/QLHK-Client/src/components/analytics/CardShell.tsx`: Port từ QLCS.
  - `QLHK/QLHK-Client/src/components/analytics/policyAnalyticsData.ts`: Port từ QLCS.
  - `QLHK/QLHK-Client/src/components/analytics/MicroBar.tsx`: Port từ QLCS.
  - `QLHK/QLHK-Client/src/components/analytics/GenderRatioBar.tsx`: Port từ QLCS.
  - `QLHK/QLHK-Client/src/components/analytics/DonutChart.tsx`: Port từ QLCS.
  - `QLHK/QLHK-Client/src/components/analytics/DistributionCard.tsx`: Port từ QLCS.
  - `QLHK/QLHK-Client/src/components/analytics/PolicyKpiRow.tsx`: Port từ QLCS.
  - `QLHK/QLHK-Client/src/components/analytics/PolicyCompositeCard.tsx`: Port từ QLCS.
  - `QLHK/QLHK-Client/src/components/analytics/AnalyticsWidgets.tsx`: Port từ QLCS (chứa `STAT_ACCENTS`, `TrendBadge`, `formatVnPercent`, v.v.).
  - `QLHK/QLHK-Client/src/pages/PolicyAnalyticsPage.tsx`: Cập nhật hiển thị toàn diện toàn bộ `AnalyticsPage` từ QLCS (KPI row, mốc tuổi, tiến độ quà tặng, so sánh thôn, xuất dữ liệu).
- **Invariants**: ZERO COMMENTS IN CODE. Sử dụng inline clsx helper nếu cần.
- **Verification**: `cd QLHK/QLHK-Client && npx tsc --noEmit && npm test -- src/pages/__tests__/PolicyAnalyticsPage.test.tsx`
- **Commit**: `feat(roadmap): complete step 3 - full analytics suite components and page`

---

### STEP 4: FULL DASHBOARD UI COMPONENTS
- START STEP:
  + Update `docs/plans/qlhk-client/qlhk-client-port-qlcs-ui.task.md`: Mark Step 4 as `[/]`
- **Goal**: Port nguyên vẹn toàn bộ 8 component dashboard giàu tính năng từ `QLCS/QLCS-Client/src/components/dashboard/`.
- **Target Files**:
  - `QLHK/QLHK-Client/src/components/dashboard/YearSelector.tsx`: Port nguyên vẹn.
  - `QLHK/QLHK-Client/src/components/dashboard/StatsCards.tsx`: Port nguyên vẹn.
  - `QLHK/QLHK-Client/src/components/dashboard/ProfileRow.tsx`: Port nguyên vẹn (giữ nguyên STT, avatar, age tooltip, mask/unmask cccd, badge mốc tuổi, checkbox nhận quà, popover chính sách, nút sửa/xóa/lịch sử).
  - `QLHK/QLHK-Client/src/components/dashboard/MainTable.tsx`: Port nguyên vẹn (tiêu đề sortable, select all, sticky header, empty state, pagination).
  - `QLHK/QLHK-Client/src/components/dashboard/ProfileFilterBar.tsx`: Port nguyên vẹn (thanh tìm kiếm, chọn thôn, lọc trạng thái, tab mốc tuổi, bộ chọn năm, nút import/export, nút reset, bulk action bar).
  - `QLHK/QLHK-Client/src/components/dashboard/ProfileModal.tsx`: Port nguyên vẹn (modal đa tab: Thông tin chung, Tiêu chí chính sách, Địa chỉ, Ghi chú; kiểm tra dữ liệu đầu vào đầy đủ).
  - `QLHK/QLHK-Client/src/components/dashboard/ExportModal.tsx`: Port nguyên vẹn.
  - `QLHK/QLHK-Client/src/components/dashboard/ImportModal.tsx`: Port nguyên vẹn.
- **Invariants**: ZERO COMMENTS IN CODE. Thay thế external clsx bằng inline helper `const clsx = (...args: any[]) => args.flat().filter(Boolean).join(" ");`.
- **Verification**: `cd QLHK/QLHK-Client && npx tsc --noEmit`
- **Commit**: `feat(roadmap): complete step 4 - full dashboard ui components`

---

### STEP 5: DASHBOARDPAGE, PAGE INTEGRATION & TEST CONTRACT ALIGNMENT
- START STEP:
  + Update `docs/plans/qlhk-client/qlhk-client-port-qlcs-ui.task.md`: Mark Step 5 as `[/]`
- **Goal**: Port `DashboardPage.tsx` từ QLCS, tích hợp trực tiếp vào `ChucThoPage.tsx` và `HtxhPage.tsx`, đồng thời cập nhật test contract tương ứng.
- **Target Files**:
  - `QLHK/QLHK-Client/src/pages/DashboardPage.tsx`: Port từ `QLCS/QLCS-Client/src/pages/DashboardPage.tsx`, nhận prop `tabOverride?: "chuctho" | "htxh"` và `isGlobal?: boolean`.
  - `QLHK/QLHK-Client/src/pages/ChucThoPage.tsx`: Render `<Dashboard tabOverride="chuctho" />`.
  - `QLHK/QLHK-Client/src/pages/HtxhPage.tsx`: Render `<Dashboard tabOverride="htxh" />`.
  - `QLHK/QLHK-Client/src/pages/__tests__/ChucThoPage.test.tsx`: Cập nhật mock và assertions để khớp với giao diện thực tế của Dashboard (bảng hồ sơ, toggle quà, bộ lọc mốc tuổi).
  - `QLHK/QLHK-Client/src/pages/__tests__/HtxhPage.test.tsx`: Cập nhật mock và assertions tương ứng.
- **Invariants**: ZERO COMMENTS IN CODE. Đảm bảo toàn bộ tương tác trên giao diện chạy thông suốt.
- **Verification**: `cd QLHK/QLHK-Client && npx tsc --noEmit && npm test -- src/pages/__tests__/`
- **Commit**: `feat(roadmap): complete step 5 - dashboardpage and page integration`

---

### STEP 6: FINAL VERIFICATION GATE
- START STEP:
  + Update `docs/plans/qlhk-client/qlhk-client-port-qlcs-ui.task.md`: Mark Step 6 as `[/]`
- **Goal**: Kiểm tra toàn diện chất lượng, biên dịch, test suite và kiểm toán zero comments trước khi merge.
- **Target Execution**:
  1. Chạy toàn bộ test suite:
     `cd QLHK/QLHK-Client && npm test -- --run`
     -> Tất cả các file test và unit test đều phải pass 100%.
  2. Kiểm tra typecheck toàn dự án:
     `cd QLHK/QLHK-Client && npx tsc --noEmit`
     -> Đạt 0 error.
  3. Kiểm tra production build:
     `cd QLHK/QLHK-Client && npm run build`
     -> Hoàn tất thành công không có lỗi bundle.
  4. Kiểm toán Zero Comments In Code (P0 Invariant):
     `cd QLHK && git diff feat/qlhk-merge-qlcs..HEAD -- "QLHK-Client/*" | grep -E "^\+[ ]*(\/\/|\/\*|\*|#)" || true`
     -> Không có bất kỳ comment nào trong diff.
  5. Đánh dấu [x] Step 6 trong `docs/plans/qlhk-client/qlhk-client-port-qlcs-ui.task.md`.
  6. Commit hoàn thành Step 6:
     `git add -A && git commit -m "chore(roadmap): complete final verification gate for qlhk-client-port-qlcs-ui"`
  7. Merge branch roadmap vào `feat/qlhk-merge-qlcs`:
     `git switch feat/qlhk-merge-qlcs && git merge --no-ff roadmap/qlhk-client-port-qlcs-ui -m "feat(policy-ui): merge authentic qlcs ui components and pages into feat/qlhk-merge-qlcs"`

---

### 🔄 Session Handoff Checkpoint
Resume execution of the roadmap on branch `roadmap/qlhk-client-port-qlcs-ui` (base branch: `feat/qlhk-merge-qlcs`). Read `docs/plans/qlhk-client/qlhk-client-port-qlcs-ui.roadmap.md` (the committed original roadmap prompt) for all `STRICT INVARIANTS` and step definitions—or use the original roadmap prompt pasted above as a fallback.

CRITICAL: Do NOT re-execute STEP 0 or any step already marked `[x]` in `docs/plans/qlhk-client/qlhk-client-port-qlcs-ui.task.md`. The branch and tracker already exist—Invariant 1's `git switch -c` applies only to the initial fresh start.

Directives:
1. Switch to branch: `git switch roadmap/qlhk-client-port-qlcs-ui`
2. Working tree check:
   - If clean (`test -z "$(git status --porcelain)"` exits 0), proceed to Directive 3.
   - If dirty, inspect `docs/plans/qlhk-client/qlhk-client-port-qlcs-ui.task.md`:
     + If a step is marked `[/]` (In Progress), proceed to Directive 5 to evaluate WIP changes.
     + If dirty without an in-progress step, halt immediately and alert the user.
3. Context Anchoring (Tier 1): Read `docs/plans/qlhk-client/qlhk-client-port-qlcs-ui.task.md` (progress, known failures, gotchas), the designated role file (`.agents/<role>.md` if applicable), and the plan header (`docs/plans/qlhk-client/qlhk-client-port-qlcs-ui.md`). Emit mandatory verification log: `[Context Anchored]: qlhk-client-port-qlcs-ui.task.md (<status>), <role>.md (<invariants>), plan.md (<goal>)`.
4. Inspect `git log -n 3 --oneline` to confirm the last committed checkpoint.
5. If Step K is marked `[/]` (In Progress) with uncommitted WIP, inspect existing changes via `git status --short` before continuing.
6. If Step K is marked `[!]` (Blocked):
   - Review the failure reason logged in `docs/plans/qlhk-client/qlhk-client-port-qlcs-ui.task.md`.
   - Await user guidance on the resolution strategy.
   - Upon guidance, update `docs/plans/qlhk-client/qlhk-client-port-qlcs-ui.task.md` to mark Step K back to `[/]` (In Progress) and resume implementation from the clean Step K-1 commit.
7. Otherwise, proceed with the next pending `[ ]` step following the strict invariants and step definitions in the roadmap prompt pasted above.
`````
