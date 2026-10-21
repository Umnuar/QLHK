`````text
[MANDATORY SYSTEM DIRECTIVE]:
You are executing a multi-step engineering task based on the verified plan at:
docs/plans/qlhk-client/qlhk-feature-modularization.md

ENVIRONMENT REQUIREMENT:
All shell commands require a POSIX-compatible shell (Git Bash on Windows, WSL, Linux, or macOS).

STRICT INVARIANTS:
1. BRANCH & PRE-FLIGHT (Initial Start Only):
   - **Pre-Switch Detached-HEAD & Protected-Branch Guard**: Before creating `roadmap/qlhk-feature-modularization`, verify `HEAD` is not detached (`BASE_BRANCH=$(git branch --show-current)` and `test -n "$BASE_BRANCH"`; if empty/detached, halt immediately and ask the user to check out a named branch first). If `$BASE_BRANCH` is a protected branch (`main`, `master`, or `production`), ask the user whether to branch `roadmap/qlhk-feature-modularization` directly from `$BASE_BRANCH` (recording it as `Base Branch`) or switch to a feature/planning branch first.
   - Create and switch to isolated branch: `git switch -c roadmap/qlhk-feature-modularization`. If the branch already exists on a fresh start, halt immediately and ask the user whether to resume the existing branch or choose a new branch name. (When resuming via a Handoff Prompt, skip `STEP 0` and use `git switch roadmap/qlhk-feature-modularization`.)
   - Verify clean working tree: `test -z "$(git status --porcelain)"`.
   - Execute the baseline test command **twice** (`Run 1` and `Run 2`), record `Base Branch: <BASE_BRANCH>`, the passing count, and exact names of any tests failing in **either** run as "flaky/known failing" into `docs/plans/qlhk-client/qlhk-feature-modularization.task.md`, and immediately commit the task tracker. Never build on an uncommitted dirty tree.
2. TWO-TIER READ CADENCE & CONTEXT ANCHORING:
   - **Tier 1 (Session / Task Initialization)**: At `STEP 0`, when resuming from a handoff, or after a `/compact` event, you MUST perform a one-time anchor read of: `docs/plans/qlhk-client/qlhk-feature-modularization.task.md`, `.agents/frontend-developer.md` (if present in repo), and the plan header (`docs/plans/qlhk-client/qlhk-feature-modularization.md`). Emit mandatory proof-of-read log before taking action:
     `[Context Anchored]: qlhk-feature-modularization.task.md (<status>), frontend-developer.md (<invariants>), qlhk-feature-modularization.md (<goal>)`
   - **Tier 2 (In-Session Atomic Step K)**: NEVER re-read the entire `plan.md` or role file at each step. Rely on inlined instructions inside `STEP K` (or read ONLY the exact surgical slice `### Section K: ...`, `<= 30 lines`). Follow the embedded `Role Focus` invariants and only read code files strictly inside `Target Files`. Review `## Project Gotchas & Learned Invariants` in `docs/plans/qlhk-client/qlhk-feature-modularization.task.md` before starting a step.
3. GRAPH-AWARE BLAST RADIUS:
   - When a step specifies a `GRAPH-MAP CHECK`, check if the tool (`graft`, `graphify`, `codegraph`) is installed before querying callers/callees. Fall back to native grep or LSP find-references if unavailable.
4. SCOPE HYGIENE & DIFF GATE (<= 200 GROSS LOC):
   - After implementing changes and BEFORE staging, run `git status --short`. Note that tracker modifications (`[/]`) in `docs/plans/qlhk-client/qlhk-feature-modularization.task.md` are expected—never reset or delete the tracker. If out-of-scope files (`.env*`, scratch scripts, build artifacts) appear, reset (`git reset <file>`), delete, or add to `.gitignore`.
   - Run the **DIFF GATE** command to stage changes and verify gross diff size (added + deleted lines) <= 200 LOC per step, excluding lockfiles, migrations, fixtures, and task trackers:
     ```bash
     git add -A && git diff --cached --numstat -- . \
       ':(exclude)*.lock' ':(exclude)*lock.json' \
       ':(exclude,glob)**/migrations/**' ':(exclude,glob)**/fixtures/**' \
       ':(exclude)*task.md' \
       | awk '{s+=$1+$2} END{print (s?s:0) " LOC"}'
     ```
   - If > 200 gross LOC, unstage (`git reset`), split the step in `docs/plans/qlhk-client/qlhk-feature-modularization.task.md` into `Step K.a` and `Step K.b` (without renumbering subsequent steps), and execute `Step K.a` first:
     1. Save the `Step K.b` changes to an isolated patch file inside `.git/` (so the working tree stays 100% clean):
        ```bash
        mkdir -p .git/roadmap-stash
        git diff -- <step_Kb_files> > ".git/roadmap-stash/qlhk-feature-modularization-K.b.patch"
        git checkout -- <step_Kb_files>
        git clean -fd -- <step_Kb_new_files>
        ```
     2. Record `Deferred Patch: .git/roadmap-stash/qlhk-feature-modularization-K.b.patch` under `Step K.b` in `docs/plans/qlhk-client/qlhk-feature-modularization.task.md`. Never commit `Step K.b` changes inside `Step K.a`.
     3. When `Step K.b` starts, apply the saved patch via `git apply ".git/roadmap-stash/qlhk-feature-modularization-K.b.patch"`, and immediately after committing `Step K.b`, delete the patch file via `rm -f ".git/roadmap-stash/qlhk-feature-modularization-K.b.patch"`. Each committed sub-step (`Step K.a`, `Step K.b`) counts as **1 step** toward the 4-step session handoff counter (Invariant 8).
5. ATOMIC COMMITS & COMMIT HOOKS:
   - After scoped tests pass, update `docs/plans/qlhk-client/qlhk-feature-modularization.task.md` (`[x]` + any new gotchas) and commit using semantic types (`feat`, `fix`, `refactor`, `test`, `perf`, `chore`):
     `git add -A && git commit -m "<type>(roadmap): complete step K - <title>"`
   - Never use `--no-verify`; hook failures caused by the agent's own change are code attempts; infrastructure/hook-tool failures are not.
   - Verify working tree is 100% clean after commit (`test -z "$(git status --porcelain)"`).
6. SAFE CIRCUIT BREAKER ROLLBACK & UNBLOCKING:
   - Limit to maximum 3 attempts per step. Before retrying, reset uncommitted code back to last checkpoint while preserving `.task.md`:
     ```bash
     cp docs/plans/qlhk-client/qlhk-feature-modularization.task.md ".git/roadmap-task-qlhk-feature-modularization.md.bak"
     git restore --staged . && git checkout -- . && git clean -fd -e docs/plans/qlhk-client/qlhk-feature-modularization.task.md -e task.md
     mv ".git/roadmap-task-qlhk-feature-modularization.md.bak" docs/plans/qlhk-client/qlhk-feature-modularization.task.md
     ```
   - If a step fails after 3 consecutive code attempts, preserve the 3rd attempt's WIP on a unique branch and restore `roadmap/qlhk-feature-modularization` cleanly:
     ```bash
     ATTEMPT_TS=$(date +%s)
     git switch -c "failed/qlhk-feature-modularization/step-K-attempt-${ATTEMPT_TS}"
     git add -A && git commit -m "wip: failed step K attempt after 3 tries"
     git switch "roadmap/qlhk-feature-modularization"
     git add docs/plans/qlhk-client/qlhk-feature-modularization.task.md && git commit -m "chore(roadmap): mark step K blocked"
     ```
   - Halt and await user guidance.
   - Unblocking procedure: Once user provides guidance, ensure you are on `roadmap/qlhk-feature-modularization`, change `[!]` back to `[/]` in `docs/plans/qlhk-client/qlhk-feature-modularization.task.md`, and retry Step K from the clean Step K-1 checkpoint.
7. SCOPED TESTS, PER-STEP STATIC CHECK, FLAKY POLICY VS FULL SUITE:
   - Run fast scoped tests AND the per-step static/typecheck command (`cd QLHK/QLHK-Client && npx tsc --noEmit`) at each step.
   - Run the full test suite and full typecheck at session handoffs and at the final verification gate (`Step 9`).
   - Baseline test run is executed **twice**; any test failing in **either** run is recorded under `Known Baseline / Flaky Failures`. Any new test failure must be re-run once before counting as failure.
8. FRESH CONTEXT HANDOFF (EVERY 4 IMPLEMENTATION STEPS IN SESSION OR ON USER REQUEST):
   - After completing 4 implementation steps (`Step 1`..`Step 8`) in the current session, or immediately when requested by the user—unless `Step 9` has just completed—run the full test suite, verify clean tree, output the `SESSION HANDOFF CHECKPOINT` block, and **STOP immediately**.
9. MINIMAL WORKING DIFF & ZERO COMMENTS IN CODE:
   - Shortest working code, strict YAGNI, zero unrequested abstractions.
   - **ZERO COMMENTS IN CODE (P0 Invariant)**: Absolutely no comments (`//`, `/* ... */`, `#`, JSDoc/TSDoc, HTML comments) in any new or modified code.

---

### STEP 0: BRANCH ISOLATION, PRE-FLIGHT GATE & TASK INITIALIZATION
1. Capture current branch as `BASE_BRANCH`: `BASE_BRANCH=$(git branch --show-current)` (ensure `HEAD` is not detached). Create and switch to branch: `git switch -c roadmap/qlhk-feature-modularization`.
2. Verify clean working tree: `test -z "$(git status --porcelain)"` (Must exit 0).
3. Capture baseline commit hash via `git rev-parse --short HEAD` and run baseline tests **twice**: `cd QLHK/QLHK-Client && npm test -- --run && npm test -- --run` -> Record total passing count (expect >= 183 passing) and exact names of any tests failing in either run.
4. Create `docs/plans/qlhk-client/qlhk-feature-modularization.task.md` with this exact content:

````markdown
# Task Progress Tracker

- **Project**: QLHK-Client
- **Base Branch**: `<BASE_BRANCH>`
- **Branch**: `roadmap/qlhk-feature-modularization`
- **Plan Reference**: `docs/plans/qlhk-client/qlhk-feature-modularization.md`
- **Roadmap Prompt Reference**: `docs/plans/qlhk-client/qlhk-feature-modularization.roadmap.md`
- **Baseline Checkpoint**: `<BASELINE_HASH>` (<PASS_COUNT> passing, verified across 2 baseline runs)
- **Known Baseline / Flaky Failures (Failed in Either Baseline Run)**:
  - None

## Step Checklist
- [ ] Step 0: Branch Isolation, Pre-Flight Gate & Task Initialization
- [ ] Step 1: Khởi tạo cấu trúc features/qlhk và di chuyển components Hộ tịch
- [ ] Step 2: Di chuyển pages QLHK vào features/qlhk/pages và cập nhật router & tests
- [ ] Step 3: Xây dựng các widget đồ họa & phân tích chuyên sâu 1:1 QLCS trong features/qlcs/analytics
- [ ] Step 4: Bảng đối soát thôn và Trang Thống kê Chính sách High-Fidelity
- [ ] Step 5: Chúc Thọ StatsBar, FilterBar & Table High-Fidelity trong features/qlcs/chuctho
- [ ] Step 6: Chúc Thọ Drawer, Modal 14 trường & Page Integration
- [ ] Step 7: Hỗ Trợ Xã Hội StatsBar, FilterBar & Table High-Fidelity trong features/qlcs/htxh
- [ ] Step 8: Hỗ Trợ Xã Hội Drawer, Modal Checkbox, Page Integration & Legacy Cleanup
- [ ] Step 9: Final Verification Gate (Zero Regression, Full Suite, Build)

## Project Gotchas & Learned Invariants
- [Invariant]: Zero Comments in Code (P0). Absolutely no comments (//, /* */, #, JSDoc) in any new or modified code.
- [Invariant]: Diff Gate <= 200 gross LOC per commit.
- [Invariant]: Feature Slices architecture pattern with sub-components <= 150 LOC each.
- [Gotcha]: Windows CRLF line endings - normalize to LF or use Node.js UTF-8 reads/writes.
````

5. Commit Step 0:
   `git add docs/plans/qlhk-client/qlhk-feature-modularization.task.md && git commit -m "chore(roadmap): initialize task tracker for qlhk-feature-modularization"`

---

### STEP 1: KHỞI TẠO CẤU TRÚC FEATURES/QLHK VÀ DI CHUYỂN COMPONENTS HỘ TỊCH
- START STEP:
  + Update `docs/plans/qlhk-client/qlhk-feature-modularization.task.md`: Mark Step 1 as `[/]`
- **Goal**: Khởi tạo cấu trúc thư mục `src/features/qlhk/components/` và di chuyển toàn bộ components Hộ tịch, Thôn xóm, và Thống kê dân số vào phân hệ QLHK độc lập.
- **Role Focus**: Frontend Refactoring & Feature Slice Architecture
- **Target Files**:
  - `QLHK/QLHK-Client/src/features/qlhk/components/households/*` (di chuyển từ `src/components/households/*`)
  - `QLHK/QLHK-Client/src/features/qlhk/components/villages/*` (di chuyển từ `src/components/villages/*`)
  - `QLHK/QLHK-Client/src/features/qlhk/components/analytics/*` (di chuyển từ `src/components/analytics/*`)
  - Tạo bridge re-exports tại `src/components/households/index.ts`, `src/components/villages/index.ts`, `src/components/analytics/index.ts` nếu cần để tránh làm đứt gãy các import cũ trong lúc chuyển đổi.
- **Invariants**: ZERO COMMENTS IN CODE.
- **Scope Hygiene & Diff Gate**:
  ```bash
  git add -A && git diff --cached --numstat -- . ':(exclude)*task.md' | awk '{s+=$1+$2} END{print (s?s:0) " LOC"}'
  ```
  (Must be <= 200 gross LOC. Git move/rename detection naturally keeps diff small).
- **Verification**: `cd QLHK/QLHK-Client && npx tsc --noEmit`
- **Commit**: `refactor(roadmap): complete step 1 - structure features qlhk and move household components`

---

### STEP 2: DI CHUYỂN PAGES QLHK VÀO FEATURES/QLHK/PAGES VÀ CẬP NHẬT ROUTER & TESTS
- START STEP:
  + Update `docs/plans/qlhk-client/qlhk-feature-modularization.task.md`: Mark Step 2 as `[/]`
- **Goal**: Di chuyển các trang giao diện QLHK vào `src/features/qlhk/pages/`, cập nhật cấu hình Dynamic Lazy Routing trong `src/App.tsx` và đồng bộ đường dẫn test.
- **Role Focus**: Router Integration & Test Alignment
- **Target Files**:
  - `QLHK/QLHK-Client/src/features/qlhk/pages/HouseholdsPage.tsx` (di chuyển từ `src/pages/HouseholdsPage.tsx`)
  - `QLHK/QLHK-Client/src/features/qlhk/pages/VillagesPage.tsx` (di chuyển từ `src/pages/VillagesPage.tsx`)
  - `QLHK/QLHK-Client/src/features/qlhk/pages/AnalyticsPage.tsx` (di chuyển từ `src/pages/AnalyticsPage.tsx`)
  - `QLHK/QLHK-Client/src/features/qlhk/pages/RecycleBinPage.tsx` (di chuyển từ `src/pages/RecycleBinPage.tsx`)
  - `QLHK/QLHK-Client/src/App.tsx` (cập nhật dynamic import lazy tới `./features/qlhk/pages/...`)
  - `QLHK/QLHK-Client/src/pages/__tests__/HouseholdsPage.test.tsx` (cập nhật import nếu cần)
- **Invariants**: ZERO COMMENTS IN CODE.
- **Scope Hygiene & Diff Gate**: <= 200 gross LOC.
- **Verification**: `cd QLHK/QLHK-Client && npx vitest run src/pages/__tests__/HouseholdsPage.test.tsx && npx tsc --noEmit`
- **Commit**: `refactor(roadmap): complete step 2 - move qlhk pages into features and update router`

---

### STEP 3: XÂY DỰNG CÁC WIDGET ĐỒ HỌA & PHÂN TÍCH CHUYÊN SÂU 1:1 QLCS TRONG FEATURES/QLCS/ANALYTICS
- START STEP:
  + Update `docs/plans/qlhk-client/qlhk-feature-modularization.task.md`: Mark Step 3 as `[/]`
- **Goal**: Xây dựng 4 sub-components đồ họa phân tích chính sách đạt độ chuẩn mực, giàu tính năng và chi tiết 1:1 như bản gốc QLCS-Client (mỗi component <= 150 LOC).
- **Role Focus**: UI/UX High-Fidelity & Data Visualization
- **Target Files**:
  - `QLHK/QLHK-Client/src/features/qlcs/components/analytics/PolicyKpiRow.tsx` (Card thống kê 4 chỉ số chính sách với số đếm lớn, badge hoàn thành, thanh tiến độ xanh lá)
  - `QLHK/QLHK-Client/src/features/qlcs/components/analytics/PolicyDonutChart.tsx` (Biểu đồ vành khuyên SVG chuẩn QLCS hiển thị cơ cấu trao quà kèm chú giải màu sắc)
  - `QLHK/QLHK-Client/src/features/qlcs/components/analytics/PolicyGenderBar.tsx` (Thanh tỷ lệ giới tính Nam/Nữ hai sắc thái Indigo & Rose kèm % chính xác)
  - `QLHK/QLHK-Client/src/features/qlcs/components/analytics/MicroBar.tsx` (Thanh bar phân bố mini)
- **Sub-Component Specifications**:
  - `PolicyKpiRow`: 4 thẻ KPI nền Slate-900 bo góc `rounded-2xl`, hiển thị Tổng số đối tượng, Đã nhận quà, Chưa nhận quà, Tỷ lệ nhận quà với icon `lucide-react` và hiệu ứng hover.
  - `PolicyDonutChart`: SVG thuần không phụ thuộc thư viện ngoài nặng nề, vẽ đường tròn stroke-dasharray chuẩn xác với tooltip giá trị.
  - `PolicyGenderBar`: Thanh tỷ lệ giới tính bo cong 2 đầu, phân tách rõ Nam (Indigo-500) và Nữ (Rose-500) kèm số lượng và tỷ lệ phần trăm.
  - `MicroBar`: Thanh mini hiển thị tỷ trọng phân bố từng nhóm tuổi / diện trợ cấp.
- **Invariants**: ZERO COMMENTS IN CODE.
- **Scope Hygiene & Diff Gate**: <= 200 gross LOC.
- **Verification**: `cd QLHK/QLHK-Client && npx tsc --noEmit`
- **Commit**: `feat(roadmap): complete step 3 - policy analytics widgets and micro charts`

---

### STEP 4: BẢNG ĐỐI SOÁT THÔN VÀ TRANG THỐNG KÊ CHÍNH SÁCH HIGH-FIDELITY
- START STEP:
  + Update `docs/plans/qlhk-client/qlhk-feature-modularization.task.md`: Mark Step 4 as `[/]`
- **Goal**: Hoàn thiện bảng đối soát các thôn `PolicyVillageTable.tsx`, thẻ phân bố `PolicyDistributionCards.tsx` và trang phân tích `PolicyAnalyticsPage.tsx` đạt độ chi tiết 1:1 QLCS.
- **Role Focus**: Analytics Dashboard Integration & Cross-Village Reconciliation
- **Target Files**:
  - `QLHK/QLHK-Client/src/features/qlcs/components/analytics/PolicyVillageTable.tsx` (Bảng so sánh chi tiết từng thôn: STT, Tên thôn, Chúc thọ, HTXH, Thanh tiến độ hoàn thành mini)
  - `QLHK/QLHK-Client/src/features/qlcs/components/analytics/PolicyDistributionCards.tsx` (Cụm thẻ phân bố 10 mốc tuổi và 6 diện bảo trợ xã hội)
  - `QLHK/QLHK-Client/src/features/qlcs/pages/PolicyAnalyticsPage.tsx` (Trang hoàn chỉnh tích hợp KPI row, donut chart, bảng đối soát thôn, bộ chọn năm tính tuổi)
  - `QLHK/QLHK-Client/src/pages/__tests__/PolicyAnalyticsPage.test.tsx` (cập nhật test hoặc tạo mới tại `src/features/qlcs/pages/__tests__/`)
- **Key Features**:
  - `PolicyVillageTable`: Bảng đối soát từng thôn xóm trên địa bàn, tính toán tỷ lệ quà tặng từng thôn, có thanh progress bar trực quan.
  - `PolicyAnalyticsPage`: Bộ chọn năm tính tuổi linh hoạt (mặc định năm hiện tại), hỗ trợ đồng bộ dữ liệu API `/api/policies/analytics`.
- **Invariants**: ZERO COMMENTS IN CODE.
- **Scope Hygiene & Diff Gate**: <= 200 gross LOC.
- **Verification**: `cd QLHK/QLHK-Client && npx vitest run src/pages/__tests__/PolicyAnalyticsPage.test.tsx && npx tsc --noEmit`
- **Commit**: `feat(roadmap): complete step 4 - policy village table and analytics page integration`

---

### STEP 5: CHÚC THỌ STATSBAR, FILTERBAR & TABLE HIGH-FIDELITY TRONG FEATURES/QLCS/CHUCTHO
- START STEP:
  + Update `docs/plans/qlhk-client/qlhk-feature-modularization.task.md`: Mark Step 5 as `[/]`
- **Goal**: Xây dựng 3 sub-components nòng cốt của phân hệ Chúc thọ với giao diện giàu tính năng và chi tiết 1:1 QLCS (mỗi component <= 150 LOC).
- **Role Focus**: Policy UI/UX Table, Filter & Batch Operations
- **Target Files**:
  - `QLHK/QLHK-Client/src/features/qlcs/components/chuctho/ChucThoStatsBar.tsx` (Thanh 4 thẻ KPI nhanh đầu trang: Tổng số, Đã mừng thọ, Chưa mừng thọ, Tỷ lệ %)
  - `QLHK/QLHK-Client/src/features/qlcs/components/chuctho/ChucThoFilterBar.tsx` (Thanh tìm kiếm có nút xóa, bộ chọn năm tính tuổi, chip mốc tuổi tròn 60..>100, lọc thôn, lọc quà, thanh thao tác hàng loạt Bulk Actions)
  - `QLHK/QLHK-Client/src/features/qlcs/components/chuctho/ChucThoTable.tsx` (Bảng chi tiết: STT, checkbox, Họ tên click mở Drawer, Năm sinh, Giới tính, CCCD có nút Eye toggle, Thôn xóm, Badge mốc tuổi nổi bật, Toggle quà trực tiếp có spinner, Nút Sửa, Xóa)
- **Sub-Component Specifications**:
  - `ChucThoStatsBar`: 4 thẻ chỉ số nhanh có gradient nhẹ, badge tỷ lệ hoàn thành màu xanh Emerald.
  - `ChucThoFilterBar`: Ô input search debounce, cụm 10 chip mốc tuổi (60, 65, 70, 75, 80, 85, 90, 95, 100, >100) cho phép chọn nhanh, dropdown chọn thôn, thanh bulk actions khi có checkbox được tick.
  - `ChucThoTable`: Bảng phân trang đầy đủ tính năng: Checkbox chọn tất cả, click tên mở slide drawer, nút Eye ẩn/hiện số CCCD, toggle quà trực tiếp, nút sửa modal, nút xóa có xác nhận.
- **Invariants**: ZERO COMMENTS IN CODE.
- **Scope Hygiene & Diff Gate**: <= 200 gross LOC.
- **Verification**: `cd QLHK/QLHK-Client && npx tsc --noEmit`
- **Commit**: `feat(roadmap): complete step 5 - chuctho statsbar filterbar and table`

---

### STEP 6: CHÚC THỌ DRAWER, MODAL 14 TRƯỜNG & PAGE INTEGRATION
- START STEP:
  + Update `docs/plans/qlhk-client/qlhk-feature-modularization.task.md`: Mark Step 6 as `[/]`
- **Goal**: Hoàn thiện Drawer trượt từ phải `ChucThoDrawer.tsx`, Modal 14 trường dữ liệu chuẩn `ChucThoModal.tsx` và tích hợp toàn diện vào `ChucThoPage.tsx`.
- **Role Focus**: Drawer Slide-Over, Detailed Modal & Page Wiring
- **Target Files**:
  - `QLHK/QLHK-Client/src/features/qlcs/components/chuctho/ChucThoDrawer.tsx` (Slide-over drawer từ cạnh phải xem hồ sơ nhân thân đầy đủ: Họ tên, Giới tính, Năm sinh, CCCD, Dân tộc, Cư trú, Nơi ở hiện tại, Mốc tuổi, Quà tặng, Ghi chú)
  - `QLHK/QLHK-Client/src/features/qlcs/components/chuctho/ChucThoModal.tsx` (Form 14 trường dữ liệu chuẩn: Dân tộc Tây Nguyên `ETHNIC_GROUPS`, Nơi thường trú, Nơi ở hiện tại, Tình trạng cư trú, Ghi chú, Quà tặng)
  - `QLHK/QLHK-Client/src/features/qlcs/pages/ChucThoPage.tsx` (Tích hợp StatsBar, FilterBar, Table, Pagination, Modal, Drawer)
  - `QLHK/QLHK-Client/src/pages/__tests__/ChucThoPage.test.tsx` (cập nhật test hoặc đặt tại `src/features/qlcs/pages/__tests__/`)
- **Key Features**:
  - `ChucThoDrawer`: Hiệu ứng trượt mượt mà từ cạnh phải, backdrop mờ, hiển thị đầy đủ thông tin chi tiết người cao tuổi và lịch sử chúc thọ.
  - `ChucThoModal`: Đầy đủ 14 trường theo chuẩn QLCS, hỗ trợ validation ngày sinh, CCCD 12 số, dropdown danh sách dân tộc Tây Nguyên (Xơ Đăng, Ba Na, Gia Rai, Giẻ Triêng...).
- **Invariants**: ZERO COMMENTS IN CODE.
- **Scope Hygiene & Diff Gate**: <= 200 gross LOC.
- **Verification**: `cd QLHK/QLHK-Client && npx vitest run src/pages/__tests__/ChucThoPage.test.tsx && npx tsc --noEmit`
- **Commit**: `feat(roadmap): complete step 6 - chuctho drawer modal and page integration`

---

### STEP 7: HỖ TRỢ XÃ HỘI STATSBAR, FILTERBAR & TABLE HIGH-FIDELITY TRONG FEATURES/QLCS/HTXH
- START STEP:
  + Update `docs/plans/qlhk-client/qlhk-feature-modularization.task.md`: Mark Step 7 as `[/]`
- **Goal**: Xây dựng 3 sub-components nòng cốt của phân hệ Hỗ trợ xã hội với giao diện giàu tính năng và chi tiết 1:1 QLCS (mỗi component <= 150 LOC).
- **Role Focus**: Social Support UI/UX, Filters & Table Operations
- **Target Files**:
  - `QLHK/QLHK-Client/src/features/qlcs/components/htxh/HtxhStatsBar.tsx` (Thanh 4 thẻ KPI nhanh đầu trang diện trợ cấp xã hội)
  - `QLHK/QLHK-Client/src/features/qlcs/components/htxh/HtxhFilterBar.tsx` (Bộ lọc chip 6 diện bảo trợ, tìm kiếm, năm tính, lọc thôn, lọc quà, bulk actions toolbar)
  - `QLHK/QLHK-Client/src/features/qlcs/components/htxh/HtxhTable.tsx` (Bảng chi tiết, badge diện hưởng sắc thái màu riêng, toggle quà, ẩn/hiện CCCD)
- **Sub-Component Specifications**:
  - `HtxhStatsBar`: Thống kê tổng số đối tượng hưởng trợ cấp xã hội, đã nhận quà, chưa nhận quà và tỷ lệ.
  - `HtxhFilterBar`: Ô tìm kiếm, bộ lọc chip 6 diện bảo trợ (Đủ 75 tuổi trở lên, 70-74 hộ nghèo, Bảo trợ xã hội, Hưu trí, Hưu tuất BH, Người có công), lọc thôn, lọc trạng thái quà.
  - `HtxhTable`: Hiển thị rõ ràng các diện trợ cấp bằng badge màu phân biệt, hỗ trợ click xem drawer, ẩn hiện CCCD, toggle quà.
- **Invariants**: ZERO COMMENTS IN CODE.
- **Scope Hygiene & Diff Gate**: <= 200 gross LOC.
- **Verification**: `cd QLHK/QLHK-Client && npx tsc --noEmit`
- **Commit**: `feat(roadmap): complete step 7 - htxh statsbar filterbar and table`

---

### STEP 8: HỖ TRỢ XÃ HỘI DRAWER, MODAL CHECKBOX, PAGE INTEGRATION & LEGACY CLEANUP
- START STEP:
  + Update `docs/plans/qlhk-client/qlhk-feature-modularization.task.md`: Mark Step 8 as `[/]`
- **Goal**: Hoàn thiện Drawer chi tiết `HtxhDrawer.tsx`, Modal checkbox 6 diện bảo trợ `HtxhModal.tsx`, tích hợp toàn diện vào `HtxhPage.tsx` và dọn dẹp các file cũ không còn dùng.
- **Role Focus**: Drawer, Modal Form & Legacy Directory Cleanup
- **Target Files**:
  - `QLHK/QLHK-Client/src/features/qlcs/components/htxh/HtxhDrawer.tsx` (Drawer slide-over xem hồ sơ đối tượng bảo trợ xã hội)
  - `QLHK/QLHK-Client/src/features/qlcs/components/htxh/HtxhModal.tsx` (Form đầy đủ checkbox 6 diện bảo trợ và dữ liệu nhân thân, địa chỉ)
  - `QLHK/QLHK-Client/src/features/qlcs/pages/HtxhPage.tsx` (Tích hợp StatsBar, FilterBar, Table, Pagination, Modal, Drawer)
  - `QLHK/QLHK-Client/src/pages/__tests__/HtxhPage.test.tsx` (cập nhật test hoặc đặt tại `src/features/qlcs/pages/__tests__/`)
  - Dọn dẹp thư mục cũ không còn dùng: `src/components/chuctho/`, `src/components/htxh/`
- **Invariants**: ZERO COMMENTS IN CODE.
- **Scope Hygiene & Diff Gate**: <= 200 gross LOC.
- **Verification**: `cd QLHK/QLHK-Client && npx vitest run src/pages/__tests__/HtxhPage.test.tsx && npx tsc --noEmit`
- **Commit**: `feat(roadmap): complete step 8 - htxh drawer modal page integration and legacy cleanup`

---

### STEP 9: FINAL VERIFICATION GATE (ZERO REGRESSION, FULL SUITE, BUILD)
- START STEP:
  + Update `docs/plans/qlhk-client/qlhk-feature-modularization.task.md`: Mark Step 9 as `[/]`
- **Goal**: Xác nhận toàn bộ hệ thống client hoạt động hoàn hảo, không có lỗi TypeScript, không suy giảm kiểm thử, build thành công và sạch 100% comment.
- **Verification Commands**:
  1. `cd QLHK/QLHK-Client && npm test -- --run` (Yêu cầu: 100% test files và >= 183 tests pass).
  2. `cd QLHK/QLHK-Client && npx tsc --noEmit` (Yêu cầu: 0 compiler errors).
  3. `cd QLHK/QLHK-Backend && npx tsc --noEmit` (Yêu cầu: 0 compiler errors).
  4. `cd QLHK/QLHK-Client && npm run build` (Yêu cầu: build thành công, code-splitting chunks nhỏ gọn).
  5. Audit P0 Zero Comments:
     `git diff roadmap/qlhk-feature-modularization...<BASE_BRANCH> | grep -E "^\+.*(//|/\*|#)"` (Yêu cầu: 0 comment).
- **Final Action**: Update `docs/plans/qlhk-client/qlhk-feature-modularization.task.md`: Mark Step 9 as `[x]`, set Status to `Completed`.
- **Commit**: `chore(roadmap): complete final verification gate for qlhk-feature-modularization`

---

### 🔄 Session Handoff Checkpoint

Completed <STEPS_COMPLETED_IN_SESSION> step(s) in this session on branch `roadmap/qlhk-feature-modularization` (base branch: `<BASE_BRANCH>`). Full test suite verified.

To resume in a fresh session:
1. Read `docs/plans/qlhk-client/qlhk-feature-modularization.roadmap.md` (the committed original roadmap prompt containing all `STRICT INVARIANTS` and step definitions) then continue — or paste the **ORIGINAL roadmap prompt** below as a fallback.
2. Append or send this resume block immediately after:

```text
Resume execution of the roadmap on branch `roadmap/qlhk-feature-modularization` (base branch: `<BASE_BRANCH>`). Read `docs/plans/qlhk-client/qlhk-feature-modularization.roadmap.md` (the committed original roadmap prompt) for all `STRICT INVARIANTS` and step definitions—or use the original roadmap prompt pasted above as a fallback.

CRITICAL: Do NOT re-execute STEP 0 or any step already marked `[x]` in `docs/plans/qlhk-client/qlhk-feature-modularization.task.md`. The branch and tracker already exist—Invariant 1's `git switch -c` applies only to the initial fresh start.

Directives:
1. Switch to branch: `git switch roadmap/qlhk-feature-modularization`
2. Working tree check:
   - If clean (`test -z "$(git status --porcelain)"` exits 0), proceed to Directive 3.
   - If dirty, inspect `docs/plans/qlhk-client/qlhk-feature-modularization.task.md`:
     + If a step is marked `[/]` (In Progress), proceed to Directive 5 to evaluate WIP changes.
     + If dirty without an in-progress step, halt immediately and alert the user.
3. Context Anchoring (Tier 1): Read `docs/plans/qlhk-client/qlhk-feature-modularization.task.md` (progress, known failures, gotchas), the designated role file (`.agents/frontend-developer.md` if applicable), and the plan header (`docs/plans/qlhk-client/qlhk-feature-modularization.md`). Emit mandatory verification log: `[Context Anchored]: qlhk-feature-modularization.task.md (<status>), frontend-developer.md (<invariants>), qlhk-feature-modularization.md (<goal>)`.
4. Inspect `git log -n 3 --oneline` to confirm the last committed checkpoint.
5. If Step K is marked `[/]` (In Progress) with uncommitted WIP, inspect existing changes via `git status --short` before continuing.
6. If Step K is marked `[!]` (Blocked):
   - Review the failure reason logged in `docs/plans/qlhk-client/qlhk-feature-modularization.task.md`.
   - Await user guidance on the resolution strategy.
   - Upon guidance, update `docs/plans/qlhk-client/qlhk-feature-modularization.task.md` to mark Step K back to `[/]` (In Progress) and resume implementation from the clean Step K-1 commit.
7. Otherwise, proceed with the next pending `[ ]` step following the strict invariants and step definitions in the roadmap prompt pasted above.
```
`````