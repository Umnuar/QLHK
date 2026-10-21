# Implementation Plan: Sáp Nhập Phân Hệ Quản Lý Chính Sách Vào QLHK Client (`qlhk-client-merge-qlcs`)

- **Task Name (`<TASK_NAME>`)**: `qlhk-client-merge-qlcs`
- **Task Type**: `Refactor`
- **Source Input**: `User Request`
- **Target Branch (for `roadmap`)**: `roadmap/qlhk-client-merge-qlcs`
- **Full Test Command**: `cd QLHK/QLHK-Client && npm test`
- **Typecheck / Lint Command**: `cd QLHK/QLHK-Client && npx tsc --noEmit`
- **Total Implementation Steps**: 5 (plus Final Verification Gate)

---

## 1. Context & Goal
Hiện tại, cán bộ chính sách xã Đăk Hà phải sử dụng ứng dụng Desktop Electron riêng biệt của QLCS (~180MB) để quản lý hồ sơ Chúc thọ và Hỗ trợ xã hội. Mục tiêu của phân hệ client là chuyển giao toàn bộ giao diện và chức năng của QLCS vào ứng dụng Thin-Client Tauri v2 của `QLHK-Client` (~10MB). Giao diện mới kế thừa toàn diện hệ thống thiết kế màu Emerald/Slate của QLHK, nạp động các trang chính sách bằng `React.lazy()` để bảo đảm không làm tăng thời gian khởi động app trên các máy tính thôn cấu hình yếu, đạt 0 lỗi TypeScript và 0 comment trong code.

## 2. Assumptions
- `ASM-01`: Backend QLHK tại cổng `5002` cung cấp đầy đủ các API chính sách dưới namespace `/api/policies/*` (`/chuctho`, `/htxh`, `/analytics`, `/excel`).
- `ASM-02`: Axios client hiện hữu tại `src/api/client.ts` tự động đính kèm JWT Bearer token và xử lý refresh token cho toàn bộ yêu cầu gọi API chính sách.
- `ASM-03`: Tái sử dụng tối đa các component giao diện cơ bản có sẵn trong `QLHK-Client` (`CustomSelect`, `Modal`, `TablePagination`, icon `lucide-react`).
- `ASM-04`: Phân quyền giao diện theo `user.role`: Cán bộ Xã (`admin`) xem được toàn xã và có selector chọn thôn; Trưởng thôn (`user`) bị cố định theo `user.village_id`.
- `ASM-05`: Toàn bộ mã nguồn mới tuân thủ nghiêm ngặt quy tắc Zero Comments in Code, tự mô tả qua định danh rõ ràng.

## 3. Non-Goals (Out of Scope — YAGNI)
- Không chỉnh sửa các trang hiện hữu của QLHK (`HouseholdsPage`, `VillagesPage`, `RecycleBinPage`, `SettingsPage`).
- Không cài đặt thêm bất kỳ thư viện UI bên ngoài nào; tận dụng 100% Tailwind CSS và Lucide React hiện có.
- Không sửa đổi mã nguồn backend trong phạm vi kế hoạch client này.

## 4. Current State & Codebase Grounding (`file:start-end` Read)
| File Path (`verified on disk`) | Lines Read | Current Responsibility & Relevant Symbols |
| :--- | :---: | :--- |
| `QLHK/QLHK-Client/src/App.tsx` | `1-66` | Bộ điều hướng chính và nạp động (lazy loading) các trang của QLHK-Client. |
| `QLHK/QLHK-Client/src/components/Layout/Sidebar.tsx` | `1-60` | Thanh điều hướng giao diện máy trạm Tauri v2, nơi thêm menu "CHÍNH SÁCH XÃ HỘI". |
| `QLCS/QLCS-Client/src/App.tsx` | `1-59` | Cấu trúc điều hướng nguồn của QLCS: tab Chúc thọ, HTXH và Thống kê chính sách. |
| `QLCS/QLCS-Client/src/pages/DashboardPage.tsx` | `1-65` | Giao diện gốc quản lý bảng Chúc thọ và HTXH của QLCS. |
| `QLCS/QLCS-Client/src/pages/AnalyticsPage.tsx` | `1-50` | Giao diện biểu đồ và thống kê chính sách nguồn của QLCS. |

## 5. Chosen Design & Blast Radius
- **Chosen Approach**:
  1. *API Layer*: Tạo `src/types/policy.ts` và `src/api/policyApi.ts` đóng gói các hàm gọi API `/api/policies/*`.
  2. *Sidebar & Window Title*: Thêm nhóm "CHÍNH SÁCH XÃ HỘI" vào `Sidebar.tsx` và cập nhật tiêu đề cửa sổ trong `src-tauri/tauri.conf.json`.
  3. *Chuc Tho Page & Modal*: Tạo `ChucThoPage.tsx` với bộ lọc mốc tuổi (60..>100) và modal `ChucThoModal.tsx`.
  4. *HTXH Page & Modal*: Tạo `HtxhPage.tsx` với 6 nút diện trợ cấp xã hội và modal `HtxhModal.tsx`.
  5. *Analytics & App Wiring*: Tạo `PolicyAnalyticsPage.tsx` và nạp động bằng `React.lazy()` vào `src/App.tsx` khi chọn tab tương ứng.
- **Caller / Contract Blast Radius**:
  - `src/components/Layout/Sidebar.tsx`: Thêm 3 mục điều hướng mới, không xáo trộn mục cũ.
  - `src/App.tsx`: Thêm nhánh điều kiện render cho 3 tab chính sách mới.
- **Rejected Alternatives (`<= 2`)**:
  1. *Import tĩnh (Static Import) toàn bộ trang chính sách*: Bị loại bỏ vì làm phình to bundle JS ban đầu, gây lag máy tính cấu hình yếu tại thôn.
  2. *Dùng webview riêng biệt trong Tauri*: Bị loại bỏ vì làm gãy trải nghiệm điều hướng liền mạch và tốn thêm RAM.

---

## 6. Atomic Step Breakdown (`<= 200 Gross LOC` Per Step)

### Section 1: Client Policy API Layer & State Types (Step 1)
- **Finding IDs**: None
- **Target Files**: `QLHK/QLHK-Client/src/types/policy.ts` `(new)`, `QLHK/QLHK-Client/src/api/policyApi.ts` `(new)`, `QLHK/QLHK-Client/src/api/__tests__/policyApi.test.ts` `(new)`
- **Assigned Role**: `.agents/frontend-developer.md`
- **Role Focus**: TypeScript interfaces, Axios client wrapper, typed error handling, REST contracts.
- **Graph Check**: `graft callers api`
- **Estimated Gross Diff**: `~170 LOC` (`<= 200 gross LOC` ceiling)
- **Target Signatures / Contract Changes**:
  ```typescript
  export interface PolicyProfile {
    id: string; name: string; dob?: string; gender?: string;
    cccd?: string; village_id: string; received: boolean; calculation_year?: number;
  }
  export const policyApi: {
    getChuctho: (params?: any) => Promise<{ data: PolicyProfile[]; total: number }>;
    getHtxh: (params?: any) => Promise<{ data: PolicyProfile[]; total: number }>;
    toggleReceived: (type: 'chuctho' | 'htxh', id: string, received: boolean) => Promise<void>;
    getAnalytics: (villageId?: string) => Promise<any>;
  };
  ```
- **Actions**:
  1. Tạo `src/types/policy.ts` định nghĩa kiểu dữ liệu cho hồ sơ chúc thọ, hồ sơ HTXH, và payload thống kê chính sách.
  2. Tạo `src/api/policyApi.ts` triển khai các phương thức gọi API tới endpoint `/api/policies/*` tái sử dụng client Axios hiện hữu của QLHK.
  3. Viết unit test `src/api/__tests__/policyApi.test.ts` kiểm chứng mock gọi API đúng URL, tham số và xử lý phản hồi.
- **Scoped Test Command**: `cd QLHK/QLHK-Client && npx vitest run src/api/__tests__/policyApi.test.ts`
- **Done Criteria**: Toàn bộ phương thức API được định kiểu mạnh và test mock vượt qua; staged diff `<= 200 LOC`.

---

### Section 2: Client Navigation & Desktop Window Configuration (Step 2)
- **Finding IDs**: None
- **Target Files**: `QLHK/QLHK-Client/src/components/Layout/Sidebar.tsx`, `QLHK/QLHK-Client/src-tauri/tauri.conf.json`, `QLHK/QLHK-Client/src/components/Layout/__tests__/SidebarPolicy.test.tsx` `(new)`
- **Assigned Role**: `.agents/frontend-developer.md`
- **Role Focus**: Tauri configuration, navigation sidebar, accessible icons, responsive layout.
- **Graph Check**: `graft callers Sidebar`
- **Estimated Gross Diff**: `~120 LOC`
- **Target Signatures / Contract Changes**:
  ```typescript
  export interface NavItemConfig {
    id: string;
    label: string;
    icon: any;
    badge?: string;
    group?: 'household' | 'policy' | 'system';
  }
  // Sidebar adds "CHÍNH SÁCH XÃ HỘI" section with chuctho, htxh, policy-analytics
  // tauri.conf.json sets title: "Quản Lý Hộ Khẩu & Chính Sách Xã Hội - Xã Đăk Hà"
  ```
- **Actions**:
  1. Cập nhật `src/components/Layout/Sidebar.tsx` bổ sung nhóm điều hướng "CHÍNH SÁCH XÃ HỘI" gồm: Chúc Thọ (`id: "chuctho"`, Icon: `Award`), Hỗ Trợ Xã Hội (`id: "htxh"`, Icon: `HeartHandshake`), Thống Kê Chính Sách (`id: "policy-analytics"`, Icon: `BarChart2`).
  2. Cập nhật `src-tauri/tauri.conf.json` đổi tiêu đề cửa sổ chính thành `Quản Lý Hộ Khẩu & Chính Sách Xã Hội - Xã Đăk Hà`.
  3. Viết unit test `src/components/Layout/__tests__/SidebarPolicy.test.tsx` kiểm chứng hiển thị menu chính sách và tương tác chọn tab.
- **Scoped Test Command**: `cd QLHK/QLHK-Client && npx vitest run src/components/Layout/__tests__/SidebarPolicy.test.tsx`
- **Done Criteria**: Sidebar hiển thị đúng các tab mới; cấu hình Tauri window title hợp lệ; staged diff `<= 200 LOC`.

---

### Section 3: Client Chúc Thọ Page & Management Modals (Step 3)
- **Finding IDs**: None
- **Target Files**: `QLHK/QLHK-Client/src/pages/ChucThoPage.tsx` `(new)`, `QLHK/QLHK-Client/src/components/chuctho/ChucThoModal.tsx` `(new)`, `QLHK/QLHK-Client/src/pages/__tests__/ChucThoPage.test.tsx` `(new)`
- **Assigned Role**: `.agents/frontend-developer.md`
- **Role Focus**: React components, table presentation, milestone filters, modal form validation, zero comments.
- **Graph Check**: `None (new page component)`
- **Estimated Gross Diff**: `~190 LOC`
- **Target Signatures / Contract Changes**:
  ```typescript
  export interface ChucThoPageProps { villageId?: string; }
  export const ChucThoPage: React.FC<ChucThoPageProps>;
  export interface ChucThoModalProps {
    isOpen: boolean;
    onClose: () => void;
    profile?: PolicyProfile | null;
    onSaved: () => void;
  }
  export const ChucThoModal: React.FC<ChucThoModalProps>;
  ```
- **Actions**:
  1. Xây dựng trang `ChucThoPage.tsx` với bảng danh sách đối tượng chúc thọ, thanh lọc mốc tuổi (60, 65, 70.. >100), nút chuyển đổi trạng thái đã nhận quà.
  2. Xây dựng modal `ChucThoModal.tsx` cho phép xem chi tiết, thêm mới và chỉnh sửa hồ sơ mừng thọ.
  3. Viết component test `src/pages/__tests__/ChucThoPage.test.tsx` kiểm chứng render dữ liệu và tương tác lọc.
- **Scoped Test Command**: `cd QLHK/QLHK-Client && npx vitest run src/pages/__tests__/ChucThoPage.test.tsx`
- **Done Criteria**: Trang Chúc Thọ render mượt mà; các bộ lọc mốc tuổi hoạt động chính xác; staged diff `<= 200 LOC`.

---

### Section 4: Client Hỗ Trợ Xã Hội Page & Modals (Step 4)
- **Finding IDs**: None
- **Target Files**: `QLHK/QLHK-Client/src/pages/HtxhPage.tsx` `(new)`, `QLHK/QLHK-Client/src/components/htxh/HtxhModal.tsx` `(new)`, `QLHK/QLHK-Client/src/pages/__tests__/HtxhPage.test.tsx` `(new)`
- **Assigned Role**: `.agents/frontend-developer.md`
- **Role Focus**: React UI, 6 category pill filters, status toggling, CRUD modal.
- **Graph Check**: `None (new page component)`
- **Estimated Gross Diff**: `~190 LOC`
- **Target Signatures / Contract Changes**:
  ```typescript
  export interface HtxhPageProps { villageId?: string; }
  export const HtxhPage: React.FC<HtxhPageProps>;
  export interface HtxhModalProps {
    isOpen: boolean;
    onClose: () => void;
    profile?: PolicyProfile | null;
    onSaved: () => void;
  }
  export const HtxhModal: React.FC<HtxhModalProps>;
  ```
- **Actions**:
  1. Xây dựng trang `HtxhPage.tsx` quản lý 6 diện trợ cấp xã hội (75+, 70-74 nghèo, bảo trợ, hưu trí, hưu tuất, người có công).
  2. Xây dựng modal `HtxhModal.tsx` hỗ trợ tạo mới và cập nhật đối tượng chính sách.
  3. Viết component test `src/pages/__tests__/HtxhPage.test.tsx` kiểm thử các bộ lọc diện và cập nhật trạng thái.
- **Scoped Test Command**: `cd QLHK/QLHK-Client && npx vitest run src/pages/__tests__/HtxhPage.test.tsx`
- **Done Criteria**: Giao diện HTXH hiển thị đầy đủ 6 diện; lọc dữ liệu tức thì; staged diff `<= 200 LOC`.

---

### Section 5: Client Policy Analytics Dashboard Page & Route Wiring (Step 5)
- **Finding IDs**: None
- **Target Files**: `QLHK/QLHK-Client/src/pages/PolicyAnalyticsPage.tsx` `(new)`, `QLHK/QLHK-Client/src/App.tsx`, `QLHK/QLHK-Client/src/pages/__tests__/PolicyAnalyticsPage.test.tsx` `(new)`
- **Assigned Role**: `.agents/frontend-developer.md`
- **Role Focus**: Dynamic imports (React.lazy), code splitting, analytics charts, routing integration.
- **Graph Check**: `graft callers App`
- **Estimated Gross Diff**: `~170 LOC`
- **Target Signatures / Contract Changes**:
  ```typescript
  export interface PolicyAnalyticsPageProps { villageId?: string; }
  export const PolicyAnalyticsPage: React.FC<PolicyAnalyticsPageProps>;
  // App.tsx lazy imports:
  // const ChucThoPage = lazy(() => import('./pages/ChucThoPage'));
  // const HtxhPage = lazy(() => import('./pages/HtxhPage'));
  // const PolicyAnalyticsPage = lazy(() => import('./pages/PolicyAnalyticsPage'));
  ```
- **Actions**:
  1. Xây dựng trang `PolicyAnalyticsPage.tsx` trình bày các thẻ KPI tổng quan, biểu đồ cơ cấu mốc tuổi và phân bố diện chính sách theo từng thôn.
  2. Cập nhật `src/App.tsx` nạp động bằng `React.lazy()` cho `ChucThoPage`, `HtxhPage`, và `PolicyAnalyticsPage` khi `activeTab` tương ứng được kích hoạt.
  3. Viết component test `src/pages/__tests__/PolicyAnalyticsPage.test.tsx` kiểm chứng render biểu đồ và chuyển đổi tab.
- **Scoped Test Command**: `cd QLHK/QLHK-Client && npx vitest run src/pages/__tests__/PolicyAnalyticsPage.test.tsx`
- **Done Criteria**: Các tab chính sách nạp động mượt mà không làm tăng kích thước bundle ban đầu; staged diff `<= 200 LOC`.

---

## 7. Risks & Rollback Plan
| Risk / Failure Scenario | Likelihood / Impact | Mitigation in Plan | Rollback Procedure |
| :--- | :---: | :--- | :--- |
| Bundle size của Client Desktop tăng vọt làm chậm máy yếu | `MED / MED` | Dùng `React.lazy()` và dynamic imports cho tất cả các trang chính sách mới; tái sử dụng UI component gốc. | Kiểm tra kích thước chunk qua `npm run build`; loại bỏ các thư viện phụ thuộc trùng lặp. |
| Lỗi render trên Tauri WebView cũ | `LOW / MED` | Giữ nguyên các chuẩn HTML/CSS/Tailwind đã chạy ổn định trên Tauri v2 của QLHK. | Revert commit trên branch `roadmap/qlhk-client-merge-qlcs`. |

## 8. Final Verification Gate (Step 6 in `roadmap`)
- **Full Test Suite Command**: `cd QLHK/QLHK-Client && npm test` (Must exit 0 with zero regressions vs. baseline)
- **Typecheck / Static Analysis Command**: `cd QLHK/QLHK-Client && npx tsc --noEmit` (Must exit 0 with 0 errors)
- **Clean Working Tree Check**: `test -z "$(git status --porcelain)"` (Must exit 0)

## 9. Roadmap Handoff Block
```text
Plan verified, committed, and saved to: docs/plans/qlhk-client/qlhk-client-merge-qlcs.md
- Task Name (<TASK_NAME>): qlhk-client-merge-qlcs
- Implementation Steps: 5 (Sections 1..5, plus Step 6 Final Verification Gate)
- Full Test Command: cd QLHK/QLHK-Client && npm test
- Typecheck Command: cd QLHK/QLHK-Client && npx tsc --noEmit
- Clean Tree Verified: git status --porcelain is empty

Next Action: Invoke the `roadmap` skill with `docs/plans/qlhk-client/qlhk-client-merge-qlcs.md` to generate the step-by-step execution prompt (or execute the roadmap directly).
```
