`````text
[MANDATORY SYSTEM DIRECTIVE]:
You are executing a multi-step engineering task based on the verified plan at:
docs/plans/qlhk-client/qlhk-client-ui-fidelity.md

ENVIRONMENT REQUIREMENT:
All shell commands require a POSIX-compatible shell (Git Bash on Windows, WSL, Linux, or macOS).

STRICT INVARIANTS:
1. BRANCH & PRE-FLIGHT (Initial Start Only):
   - **Pre-Switch Detached-HEAD & Protected-Branch Guard**: Before creating `roadmap/qlhk-client-ui-fidelity`, verify `HEAD` is not detached (`BASE_BRANCH=$(git branch --show-current)` and `test -n "$BASE_BRANCH"`; if empty/detached, halt immediately and ask the user to check out a named branch first). If `$BASE_BRANCH` is a protected branch (`main`, `master`, or `production`), ask the user whether to branch `roadmap/qlhk-client-ui-fidelity` directly from `$BASE_BRANCH` (recording it as `Base Branch`) or switch to a feature/planning branch first.
   - Create and switch to isolated branch: `git switch -c roadmap/qlhk-client-ui-fidelity`. If the branch already exists on a fresh start, halt immediately and ask the user whether to resume the existing branch or choose a new branch name. (When resuming via a Handoff Prompt, skip `STEP 0` and use `git switch roadmap/qlhk-client-ui-fidelity`.)
   - Verify clean working tree: `test -z "$(git status --porcelain)"`.
   - Execute the baseline test command **twice** (`Run 1` and `Run 2`), record `Base Branch: <BASE_BRANCH>`, the passing count, and exact names of any tests failing in **either** run as "flaky/known failing" into `docs/plans/qlhk-client/qlhk-client-ui-fidelity.task.md`, and immediately commit the task tracker. Never build on an uncommitted dirty tree.
2. TWO-TIER READ CADENCE & CONTEXT ANCHORING:
   - **Tier 1 (Session / Task Initialization)**: At `STEP 0`, when resuming from a handoff, or after a `/compact` event, perform a one-time anchor read of: `docs/plans/qlhk-client/qlhk-client-ui-fidelity.task.md`, `.agents/frontend-developer.md` (if present in repo), and the plan header (`docs/plans/qlhk-client/qlhk-client-ui-fidelity.md`). Emit mandatory proof-of-read log before taking action:
     `[Context Anchored]: qlhk-client-ui-fidelity.task.md (<status>), frontend-developer.md (<invariants>), qlhk-client-ui-fidelity.md (<goal>)`
   - **Tier 2 (In-Session Atomic Step K)**: Never re-read the entire plan or role file at each step. Rely on inlined instructions inside `STEP K` (or read only the exact surgical slice `### Section K: ...`, `<= 30 lines`). Follow the embedded `Role Focus` invariants and only read code files strictly inside `Target Files`. Review `## Project Gotchas & Learned Invariants` in `docs/plans/qlhk-client/qlhk-client-ui-fidelity.task.md` before starting a step.
3. SCOPE HYGIENE & DIFF GATE (<= 200 GROSS LOC):
   - After implementing changes and BEFORE staging, run `git status --short`. Note that tracker modifications (`[/]`) in `docs/plans/qlhk-client/qlhk-client-ui-fidelity.task.md` are expected—never reset or delete the tracker. If out-of-scope files (`.env*`, scratch scripts, build artifacts) appear, reset (`git reset <file>`), delete, or add to `.gitignore`.
   - Run the **DIFF GATE** command to stage changes and verify gross diff size (added + deleted lines) <= 200 LOC per step, excluding lockfiles, migrations, fixtures, and task trackers:
     ```bash
     git add -A && git diff --cached --numstat -- . \
       ':(exclude)*.lock' ':(exclude)*lock.json' \
       ':(exclude,glob)**/migrations/**' ':(exclude,glob)**/fixtures/**' \
       ':(exclude)*task.md' \
       | awk '{s+=$1+$2} END{print (s?s:0) " LOC"}'
     ```
   - If > 200 gross LOC, unstage (`git reset`), split the step in `docs/plans/qlhk-client/qlhk-client-ui-fidelity.task.md` into `Step K.a` and `Step K.b` (without renumbering subsequent steps), and execute `Step K.a` first.
4. ATOMIC COMMITS & COMMIT HOOKS:
   - After scoped tests pass, update `docs/plans/qlhk-client/qlhk-client-ui-fidelity.task.md` (`[x]` + any new gotchas) and commit using semantic types (`feat`, `fix`, `refactor`, `test`, `perf`, `chore`):
     `git add -A && git commit -m "<type>(roadmap): complete step K - <title>"`
   - Never use `--no-verify`.
   - Verify working tree is 100% clean after commit (`test -z "$(git status --porcelain)"`).
5. SAFE CIRCUIT BREAKER ROLLBACK & UNBLOCKING:
   - Limit to maximum 3 attempts per step. Before retrying, reset uncommitted code back to last checkpoint while preserving `.task.md`.
6. SCOPED TESTS, PER-STEP STATIC CHECK, FLAKY POLICY VS FULL SUITE:
   - Run fast scoped tests AND the per-step static/typecheck command (`cd QLHK/QLHK-Client && npx tsc --noEmit`) at each step.
   - Run the full test suite and full typecheck at session handoffs and at the final verification gate (`Step 7`).
7. MINIMAL WORKING DIFF & ZERO COMMENTS IN CODE:
   - Shortest working code, strict YAGNI, zero unrequested abstractions.
   - **ZERO COMMENTS IN CODE**: Absolutely no comments (`//`, `/* ... */`, `#`, JSDoc/TSDoc, HTML comments) in any new or modified code.

---

### STEP 0: BRANCH ISOLATION, PRE-FLIGHT GATE & TASK INITIALIZATION
1. Capture current branch as `BASE_BRANCH`: `BASE_BRANCH=$(git branch --show-current)` (ensure `HEAD` is not detached). Create and switch to branch: `git switch -c roadmap/qlhk-client-ui-fidelity`.
2. Verify clean working tree: `test -z "$(git status --porcelain)"`.
3. Capture baseline commit hash via `git rev-parse --short HEAD` and run baseline tests **twice**: `cd QLHK/QLHK-Client && npm test -- --run && npm test -- --run` -> Record passing count (expect 181 passing).
4. Create `docs/plans/qlhk-client/qlhk-client-ui-fidelity.task.md` with standard header and task checklist:
   - Base Branch: `<BASE_BRANCH>`
   - Baseline Checkpoint: `<BASELINE_HASH>`
   - Step 1: Analytics Visual Components & Micro-Charts
   - Step 2: Policy Analytics Page High-Fidelity Dashboard
   - Step 3: High-Fidelity Chúc Thọ FilterBar & Table
   - Step 4: Chúc Thọ Drawer, Enhanced Modal & Page Integration
   - Step 5: High-Fidelity Hỗ Trợ Xã Hội FilterBar & Table
   - Step 6: Hỗ Trợ Xã Hội Drawer, Enhanced Modal & Page Integration
   - Step 7: Final Verification Gate
5. Commit Step 0:
   `git add docs/plans/qlhk-client/qlhk-client-ui-fidelity.task.md && git commit -m "chore(roadmap): initialize task tracker for qlhk-client-ui-fidelity"`

---

### STEP 1: ANALYTICS VISUAL COMPONENTS & MICRO-CHARTS
- **Goal**: Xây dựng 4 component biểu đồ visual siêu nhẹ bằng SVG và Tailwind thuần: `PolicyKpiRow.tsx`, `MicroBar.tsx`, `DonutChart.tsx`, `GenderRatioBar.tsx`.
- **Target Files**:
  - `QLHK/QLHK-Client/src/components/analytics/PolicyKpiRow.tsx` (Card thống kê KPI: Tổng số, Đã nhận quà, Chưa nhận, Tỷ lệ hoàn thành).
  - `QLHK/QLHK-Client/src/components/analytics/MicroBar.tsx` (Thanh bar phân bố mini hiển thị nhãn, số lượng và phần trăm).
  - `QLHK/QLHK-Client/src/components/analytics/DonutChart.tsx` (Biểu đồ vành khuyên SVG hiển thị tỷ lệ đã nhận quà với tâm hiển thị % và chú giải).
  - `QLHK/QLHK-Client/src/components/analytics/GenderRatioBar.tsx` (Thanh phân bố giới tính Nam/Nữ hai màu đối lập kèm số lượng và tỷ lệ).
- **Invariants**: ZERO COMMENTS IN CODE. Đảm bảo export rõ ràng, type-safe, không dùng dependencies ngoài.
- **Verification**: `cd QLHK/QLHK-Client && npx tsc --noEmit`
- **Diff Gate**: <= 200 gross LOC.
- **Commit**: `feat(roadmap): complete step 1 - analytics visual components and micro charts`

---

### STEP 2: POLICY ANALYTICS PAGE HIGH-FIDELITY DASHBOARD
- **Goal**: Nâng cấp `src/pages/PolicyAnalyticsPage.tsx` từ bảng sơ sài thành dashboard phân tích chuyên sâu chuẩn mực.
- **Target Files**:
  - `QLHK/QLHK-Client/src/pages/PolicyAnalyticsPage.tsx`
  - `QLHK/QLHK-Client/src/pages/__tests__/PolicyAnalyticsPage.test.tsx`
- **Key Features**:
  - Bộ chọn năm tính tuổi (`calculation_year`) và bộ chọn thôn (với quyền admin).
  - Tích hợp `PolicyKpiRow` cho Chúc Thọ và Hỗ Trợ Xã Hội.
  - Tích hợp `DonutChart` và `GenderRatioBar`.
  - Bảng đối soát chi tiết giữa các thôn (STT, Tên thôn, Số lượng Chúc thọ, Số lượng HTXH, Tỷ lệ hoàn thành kèm thanh tiến độ mini).
  - Danh sách thanh `MicroBar` cho các mốc tuổi Chúc thọ (60..>100) và các diện HTXH.
- **Invariants**: ZERO COMMENTS IN CODE.
- **Verification**: `cd QLHK/QLHK-Client && npx vitest run src/pages/__tests__/PolicyAnalyticsPage.test.tsx && npx tsc --noEmit`
- **Diff Gate**: <= 200 gross LOC.
- **Commit**: `feat(roadmap): complete step 2 - policy analytics high fidelity dashboard`

---

### STEP 3: HIGH-FIDELITY CHÚC THỌ FILTERBAR & TABLE
- **Goal**: Xây dựng thanh công cụ lọc nâng cao `ChucThoFilterBar.tsx` và bảng dữ liệu chuẩn `ChucThoTable.tsx`.
- **Target Files**:
  - `QLHK/QLHK-Client/src/components/chuctho/ChucThoFilterBar.tsx`
  - `QLHK/QLHK-Client/src/components/chuctho/ChucThoTable.tsx`
- **Key Features**:
  - `ChucThoFilterBar`: Ô tìm kiếm có nút xóa, nút chọn năm, bộ lọc mốc tuổi (60, 65, 70, 75, 80, 85, 90, 95, 100, >100), lọc trạng thái quà (Tất cả / Đã nhận / Chưa nhận), lọc giới tính, lọc thôn. Thanh thao tác hàng loạt khi có chọn dòng (Đánh dấu đã nhận, Bỏ chọn).
  - `ChucThoTable`: Bảng phân trang đầy đủ cột: Checkbox chọn dòng, STT, Họ tên (click mở Drawer xem chi tiết), Năm sinh, Giới tính, CCCD (có nút Eye toggle ẩn/hiện), Thôn, Badge mốc tuổi nổi bật theo màu sắc, Checkbox toggle quà tặng có spinner loading, Nút Sửa, Nút Xóa.
- **Invariants**: ZERO COMMENTS IN CODE.
- **Verification**: `cd QLHK/QLHK-Client && npx tsc --noEmit`
- **Diff Gate**: <= 200 gross LOC.
- **Commit**: `feat(roadmap): complete step 3 - chuctho filter bar and table components`

---

### STEP 4: CHÚC THỌ DRAWER, ENHANCED MODAL & PAGE INTEGRATION
- **Goal**: Xây dựng Drawer chi tiết `ChucThoDrawer.tsx`, nâng cấp modal `ChucThoModal.tsx` đủ 14 trường và tích hợp vào `ChucThoPage.tsx`.
- **Target Files**:
  - `QLHK/QLHK-Client/src/components/chuctho/ChucThoDrawer.tsx`
  - `QLHK/QLHK-Client/src/components/chuctho/ChucThoModal.tsx`
  - `QLHK/QLHK-Client/src/pages/ChucThoPage.tsx`
  - `QLHK/QLHK-Client/src/pages/__tests__/ChucThoPage.test.tsx`
- **Key Features**:
  - `ChucThoDrawer`: Trượt từ cạnh phải hiển thị hồ sơ cá nhân hoàn chỉnh: Họ tên, Giới tính, Ngày sinh, CCCD, Dân tộc, Nơi thường trú, Nơi ở hiện tại, Tình trạng cư trú, Mốc tuổi hưởng thọ, Ghi chú và trạng thái quà.
  - `ChucThoModal`: Form thêm/sửa với validation: Họ tên, Giới tính, Ngày sinh (DD/MM/YYYY hoặc YYYY), CCCD (12 số), Dân tộc (dropdown ETHNIC_GROUPS chuẩn), Thôn/Xóm, Thường trú, Hiện tại, Ghi chú, Đã nhận quà.
  - `ChucThoPage`: Tích hợp FilterBar, Table, Pagination, Modal và Drawer, xử lý tải dữ liệu theo tham số.
- **Invariants**: ZERO COMMENTS IN CODE.
- **Verification**: `cd QLHK/QLHK-Client && npx vitest run src/pages/__tests__/ChucThoPage.test.tsx && npx tsc --noEmit`
- **Diff Gate**: <= 200 gross LOC.
- **Commit**: `feat(roadmap): complete step 4 - chuctho drawer modal and page integration`

---

### STEP 5: HIGH-FIDELITY HỖ TRỢ XÃ HỘI FILTERBAR & TABLE
- **Goal**: Xây dựng thanh công cụ lọc nâng cao `HtxhFilterBar.tsx` và bảng dữ liệu chuẩn `HtxhTable.tsx`.
- **Target Files**:
  - `QLHK/QLHK-Client/src/components/htxh/HtxhFilterBar.tsx`
  - `QLHK/QLHK-Client/src/components/htxh/HtxhTable.tsx`
- **Key Features**:
  - `HtxhFilterBar`: Ô tìm kiếm, chọn năm, bộ lọc 6 diện trợ cấp xã hội (Đủ 75 tuổi trở lên, 70-74 hộ nghèo, Bảo trợ xã hội, Hưu trí, Hưu tuất BH, Người có công), lọc trạng thái quà, lọc giới tính, lọc thôn, thanh thao tác hàng loạt.
  - `HtxhTable`: Bảng phân trang đầy đủ cột: Checkbox chọn dòng, STT, Họ tên (click mở Drawer), Năm sinh, Giới tính, CCCD (Eye toggle), Thôn, Badge diện hưởng sắc thái màu riêng, Checkbox toggle quà, Nút Sửa, Nút Xóa.
- **Invariants**: ZERO COMMENTS IN CODE.
- **Verification**: `cd QLHK/QLHK-Client && npx tsc --noEmit`
- **Diff Gate**: <= 200 gross LOC.
- **Commit**: `feat(roadmap): complete step 5 - htxh filter bar and table components`

---

### STEP 6: HỖ TRỢ XÃ HỘI DRAWER, ENHANCED MODAL & PAGE INTEGRATION
- **Goal**: Xây dựng Drawer chi tiết `HtxhDrawer.tsx`, nâng cấp modal `HtxhModal.tsx` và tích hợp vào `HtxhPage.tsx`.
- **Target Files**:
  - `QLHK/QLHK-Client/src/components/htxh/HtxhDrawer.tsx`
  - `QLHK/QLHK-Client/src/components/htxh/HtxhModal.tsx`
  - `QLHK/QLHK-Client/src/pages/HtxhPage.tsx`
  - `QLHK/QLHK-Client/src/pages/__tests__/HtxhPage.test.tsx`
- **Key Features**:
  - `HtxhDrawer`: Trượt từ cạnh phải hiển thị hồ sơ cá nhân: Họ tên, Giới tính, Ngày sinh, CCCD, Dân tộc, Cư trú, Diện bảo trợ xã hội đang hưởng, Ghi chú, Quà tặng.
  - `HtxhModal`: Form thêm/sửa với các checkbox diện trợ cấp xã hội, đầy đủ trường nhân thân và địa chỉ.
  - `HtxhPage`: Tích hợp FilterBar, Table, Pagination, Modal và Drawer, xử lý tải dữ liệu theo tham số.
- **Invariants**: ZERO COMMENTS IN CODE.
- **Verification**: `cd QLHK/QLHK-Client && npx vitest run src/pages/__tests__/HtxhPage.test.tsx && npx tsc --noEmit`
- **Diff Gate**: <= 200 gross LOC.
- **Commit**: `feat(roadmap): complete step 6 - htxh drawer modal and page integration`

---

### STEP 7: FINAL VERIFICATION GATE (ZERO REGRESSION, FULL SUITE, BUILD)
- **Goal**: Xác nhận toàn bộ hệ thống client hoạt động hoàn hảo, không có lỗi TypeScript, không suy giảm kiểm thử, build thành công và sạch 100% comment.
- **Verification Commands**:
  1. `cd QLHK/QLHK-Client && npm test -- --run` (Yêu cầu: 100% test files và >= 181 tests pass).
  2. `cd QLHK/QLHK-Client && npx tsc --noEmit` (Yêu cầu: 0 errors).
  3. `cd QLHK/QLHK-Client && npm run build` (Yêu cầu: build thành công, code-splitting chunks nhỏ gọn).
  4. Kiểm tra P0 Zero Comments:
     `git diff roadmap/qlhk-client-ui-fidelity...BASE_BRANCH | grep -E "^\+.*(//|/\*|#)"` (Yêu cầu: Không có dòng comment nào).
- **Final Action**: Update `docs/plans/qlhk-client/qlhk-client-ui-fidelity.task.md` thành `Completed` và commit:
  `git add docs/plans/qlhk-client/qlhk-client-ui-fidelity.task.md && git commit -m "chore(roadmap): complete final verification gate for qlhk-client-ui-fidelity"`
`````