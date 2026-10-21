# Implementation Plan: Nâng Cấp High-Fidelity UI Cho Phân Hệ Quản Lý Chính Sách (`qlhk-client-ui-fidelity`)

- **Task Name (`<TASK_NAME>`)**: `qlhk-client-ui-fidelity`
- **Task Type**: `Refactor`
- **Source Input**: `User Request`
- **Target Branch (for `roadmap`)**: `roadmap/qlhk-client-ui-fidelity`
- **Full Test Command**: `cd QLHK/QLHK-Client && npm test -- --run`
- **Typecheck / Lint Command**: `cd QLHK/QLHK-Client && npx tsc --noEmit`
- **Total Implementation Steps**: 6 (plus Final Verification Gate)

---

## 1. Context & Goal
Người dùng yêu cầu giao diện phân hệ Quản lý Chính sách (Chúc Thọ, Hỗ Trợ Xã Hội, Thống Kê Chính Sách) trong `QLHK-Client` phải đạt độ hoàn thiện cao, chuẩn mực, giàu tính năng và trực quan tương đương giao diện gốc của `QLCS-Client` (Tauri Desktop), thay vì bảng dữ liệu và modal sơ sài dạng placeholder. 

Kế hoạch này thực hiện việc tái thiết kế và nâng cấp các component UI theo chuẩn thiết kế hiện đại của QLHK (màu Emerald/Slate, Dark mode), bổ sung các thanh lọc đa tiêu chí, thanh thao tác hàng loạt (Bulk actions), bảng dữ liệu chi tiết kèm mốc tuổi/diện hưởng, Drawer trượt xem hồ sơ chi tiết, Modal thêm/sửa đầy đủ 14 trường thông tin chuẩn, và cụm biểu đồ phân tích chuyên sâu (KPI cards, Donut chart, MicroBar, GenderRatioBar). Toàn bộ mã nguồn mới phải tuân thủ nghiêm ngặt **P0 Zero Comments in Code** và **DIFF GATE <= 200 gross LOC** mỗi bước commit.

## 2. Assumptions
- `ASM-01`: Backend QLHK tại cổng `5002` đã hỗ trợ đầy đủ các trường và tham số lọc (`page`, `limit`, `search`, `milestone`, `received`, `calculation_year`, `village_id`) trên các endpoint `/api/policies/*`.
- `ASM-02`: Toàn bộ các icon và phong cách đồ họa sử dụng thư viện `lucide-react` và Tailwind CSS hiện có, không bổ sung thêm thư viện UI nặng bên ngoài.
- `ASM-03`: Tái sử dụng các tiện ích dùng chung sẵn có của `QLHK-Client` (`CustomSelect`, `TablePagination`, `formatVietnameseNumber`).
- `ASM-04`: Giữ nguyên mô hình nạp động qua `React.lazy()` trong `App.tsx` để bảo đảm tốc độ khởi động nhẹ nhàng của Tauri Thin-Client (~10MB).
- `ASM-05`: Toàn bộ mã nguồn mới tuyệt đối không có comment (`//`, `/* */`, JSDoc, `#`).

## 3. Non-Goals (Out of Scope — YAGNI)
- Không chỉnh sửa các trang cốt lõi của QLHK (`HouseholdsPage`, `CitizensPage`, `VillagesPage`).
- Không cài thêm bất kỳ dependency npm mới nào.
- Không thay đổi cấu trúc database hoặc API contracts của Backend.

## 4. Current State & Codebase Grounding (`file:start-end` Read)
| File Path (`verified on disk`) | Lines Read | Current Responsibility & Relevant Symbols |
| :--- | :---: | :--- |
| `QLCS/QLCS-Client/src/components/analytics/AnalyticsWidgets.tsx` | `1-100` | Cụm widget biểu đồ SVG, KPI cards, tỷ lệ giới tính, thanh tiến độ. |
| `QLCS/QLCS-Client/src/components/dashboard/ProfileFilterBar.tsx` | `1-100` | Thanh lọc mốc tuổi, năm tính tuổi, giới tính, dân tộc, bulk action bar. |
| `QLCS/QLCS-Client/src/components/dashboard/ProfileRow.tsx` | `1-100` | Dòng dữ liệu chi tiết, badge mốc tuổi, toggle nhận quà, toggle CCCD. |
| `QLCS/QLCS-Client/src/components/dashboard/ProfileModal.tsx` | `1-100` | Modal nhập liệu đầy đủ trường: dân tộc, cư trú, địa chỉ, năm sinh. |
| `QLHK/QLHK-Client/src/pages/ChucThoPage.tsx` | `1-78` | Giao diện Chúc Thọ hiện tại (cần nâng cấp thành High-Fidelity). |
| `QLHK/QLHK-Client/src/pages/HtxhPage.tsx` | `1-86` | Giao diện Hỗ Trợ Xã Hội hiện tại (cần nâng cấp thành High-Fidelity). |
| `QLHK/QLHK-Client/src/pages/PolicyAnalyticsPage.tsx` | `1-84` | Giao diện Thống Kê Chính Sách hiện tại (cần nâng cấp thành High-Fidelity). |

## 5. Chosen Design & Blast Radius
- **Chosen Approach**:
  1. *Step 1*: Xây dựng các widget biểu đồ visual độc lập (`PolicyKpiRow.tsx`, `MicroBar.tsx`, `DonutChart.tsx`, `GenderRatioBar.tsx`).
  2. *Step 2*: Nâng cấp `PolicyAnalyticsPage.tsx` tích hợp KPI row, biểu đồ tròn tiến độ, cơ cấu giới tính và bảng đối soát thôn/mốc tuổi.
  3. *Step 3*: Xây dựng `ChucThoFilterBar.tsx` và `ChucThoTable.tsx` với đầy đủ mốc tuổi, tìm kiếm, ẩn/hiện CCCD, bulk actions bar.
  4. *Step 4*: Xây dựng `ChucThoDrawer.tsx`, nâng cấp `ChucThoModal.tsx` đầy đủ 14 trường và tích hợp vào `ChucThoPage.tsx`.
  5. *Step 5*: Xây dựng `HtxhFilterBar.tsx` và `HtxhTable.tsx` với 6 diện trợ cấp xã hội, tìm kiếm, bulk actions bar.
  6. *Step 6*: Xây dựng `HtxhDrawer.tsx`, nâng cấp `HtxhModal.tsx` đầy đủ các diện và tích hợp vào `HtxhPage.tsx`.
- **Caller / Contract Blast Radius**:
  - `src/pages/ChucThoPage.tsx`, `src/pages/HtxhPage.tsx`, `src/pages/PolicyAnalyticsPage.tsx`: Được thay thế bằng kiến trúc mới, giữ nguyên interface route trong `App.tsx`.
- **Rejected Alternatives (`<= 2`)**:
  1. *Copy nguyên file nguyên khối 800 dòng từ QLCS*: Bị loại bỏ vì vi phạm giới hạn DIFF GATE <= 200 LOC per commit và gây phình bundle không cần thiết.
  2. *Sử dụng thư viện biểu đồ ngoài (Recharts / Chart.js)*: Bị loại bỏ để bảo vệ dung lượng gói Tauri siêu nhẹ (~10MB), sử dụng 100% SVG và CSS Tailwind thuần.

---

## 6. Atomic Step Breakdown (`<= 200 Gross LOC` Per Step)

### Section 1: Analytics Visual Components & Micro-Charts (Step 1)
- **Finding IDs**: None
- **Target Files**: 
  - `QLHK/QLHK-Client/src/components/analytics/PolicyKpiRow.tsx` `(new)`
  - `QLHK/QLHK-Client/src/components/analytics/MicroBar.tsx` `(new)`
  - `QLHK/QLHK-Client/src/components/analytics/DonutChart.tsx` `(new)`
  - `QLHK/QLHK-Client/src/components/analytics/GenderRatioBar.tsx` `(new)`
- **Assigned Role**: `.agents/frontend-developer.md`
- **Role Focus**: Lightweight SVG visualization, responsive KPI cards, Tailwind styling, pure React presentation.
- **Verification Command**: `cd QLHK/QLHK-Client && npx tsc --noEmit`

### Section 2: Policy Analytics Page High-Fidelity Dashboard (Step 2)
- **Finding IDs**: None
- **Target Files**:
  - `QLHK/QLHK-Client/src/pages/PolicyAnalyticsPage.tsx` `(modify)`
  - `QLHK/QLHK-Client/src/pages/__tests__/PolicyAnalyticsPage.test.tsx` `(modify)`
- **Assigned Role**: `.agents/frontend-developer.md`
- **Role Focus**: Analytics dashboard layout, village comparison table, calculation year selector, loading skeletons.
- **Verification Command**: `cd QLHK/QLHK-Client && npx vitest run src/pages/__tests__/PolicyAnalyticsPage.test.tsx && npx tsc --noEmit`

### Section 3: High-Fidelity Chúc Thọ FilterBar & Table (Step 3)
- **Finding IDs**: None
- **Target Files**:
  - `QLHK/QLHK-Client/src/components/chuctho/ChucThoFilterBar.tsx` `(new)`
  - `QLHK/QLHK-Client/src/components/chuctho/ChucThoTable.tsx` `(new)`
- **Assigned Role**: `.agents/frontend-developer.md`
- **Role Focus**: Age milestone chips (60..>100), search bar with clear button, village selector, masked CCCD toggle, optimistic gift check toggle, bulk actions bar.
- **Verification Command**: `cd QLHK/QLHK-Client && npx tsc --noEmit`

### Section 4: Chúc Thọ Drawer, Enhanced Modal & Page Integration (Step 4)
- **Finding IDs**: None
- **Target Files**:
  - `QLHK/QLHK-Client/src/components/chuctho/ChucThoDrawer.tsx` `(new)`
  - `QLHK/QLHK-Client/src/components/chuctho/ChucThoModal.tsx` `(modify)`
  - `QLHK/QLHK-Client/src/pages/ChucThoPage.tsx` `(modify)`
  - `QLHK/QLHK-Client/src/pages/__tests__/ChucThoPage.test.tsx` `(modify)`
- **Assigned Role**: `.agents/frontend-developer.md`
- **Role Focus**: Citizen policy detail drawer, full-field modal (14 fields: ethnicity, address, dob, cccd), pagination integration, unit test verification.
- **Verification Command**: `cd QLHK/QLHK-Client && npx vitest run src/pages/__tests__/ChucThoPage.test.tsx && npx tsc --noEmit`

### Section 5: High-Fidelity Hỗ Trợ Xã Hội FilterBar & Table (Step 5)
- **Finding IDs**: None
- **Target Files**:
  - `QLHK/QLHK-Client/src/components/htxh/HtxhFilterBar.tsx` `(new)`
  - `QLHK/QLHK-Client/src/components/htxh/HtxhTable.tsx` `(new)`
- **Assigned Role**: `.agents/frontend-developer.md`
- **Role Focus**: 6 social assistance category chips, search bar, village selector, received status filter, bulk selection toolbar.
- **Verification Command**: `cd QLHK/QLHK-Client && npx tsc --noEmit`

### Section 6: Hỗ Trợ Xã Hội Drawer, Enhanced Modal & Page Integration (Step 6)
- **Finding IDs**: None
- **Target Files**:
  - `QLHK/QLHK-Client/src/components/htxh/HtxhDrawer.tsx` `(new)`
  - `QLHK/QLHK-Client/src/components/htxh/HtxhModal.tsx` `(modify)`
  - `QLHK/QLHK-Client/src/pages/HtxhPage.tsx` `(modify)`
  - `QLHK/QLHK-Client/src/pages/__tests__/HtxhPage.test.tsx` `(modify)`
- **Assigned Role**: `.agents/frontend-developer.md`
- **Role Focus**: HTXH detail drawer, full category checkboxes modal, pagination integration, unit test verification.
- **Verification Command**: `cd QLHK/QLHK-Client && npx vitest run src/pages/__tests__/HtxhPage.test.tsx && npx tsc --noEmit`

### Final Verification Gate (Step 7)
- **Finding IDs**: None
- **Target Files**: Entire `QLHK/QLHK-Client` codebase
- **Commands**:
  - `cd QLHK/QLHK-Client && npm test -- --run` (100% tests pass, 0 regression)
  - `cd QLHK/QLHK-Client && npx tsc --noEmit` (0 errors)
  - `cd QLHK/QLHK-Client && npm run build` (Successful production build)
