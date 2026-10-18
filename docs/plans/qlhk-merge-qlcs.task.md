# Task: Quy hoạch & Sáp nhập QLCS vào QLHK

- **Branch**: `feat/qlhk-merge-qlcs`
- **Tác vụ**: Sáp nhập phân hệ QLCS (Quản lý Chính sách - Chúc thọ & Hỗ trợ xã hội) vào hệ thống QLHK (Quản lý Hộ khẩu)
- **Trạng thái**: Ingestion Complete · Ready for Orchestration

---

## 1. Trụ Cột Ngữ Cảnh QLHK (Hiện Hữu)

- **Backend**: Express + Prisma ORM + PostgreSQL (`QLHK/QLHK-Backend/`)
  - Entities: `villages`, `users`, `refresh_tokens`, `households`, `citizens`, `audit_logs`, `settings`.
  - Routes: `/auth`, `/households`, `/citizens`, `/excel`, `/analytics`, `/villages`, `/users`, `/audit`, `/backup`, `/updates`, `/settings`.
- **Client**: Tauri v2 + React 18 + TypeScript + Vite + Tailwind CSS (`QLHK/QLHK-Client/`)
  - Screens: `VillagesPage`, `HouseholdsPage`, `AnalyticsPage`, `RecycleBinPage`, `AuditLogView`, `SettingsPage`.
  - State: `AppContext` + Zustand `householdStore`.

---

## 2. Kế Hoạch Sáp Nhập QLCS (Quản lý Chính sách)

### 2.1 Lược Đồ Dữ Liệu (Schema Merging)
- [ ] Tái sử dụng bảng master `villages` và `users` từ QLHK (tránh trùng lặp / conflict quan hệ).
- [ ] Chuyển giao các model chuyên biệt của QLCS vào `QLHK/QLHK-Backend/prisma/schema.prisma`:
  - `profiles` -> Đổi tên thành `chuctho_profiles` (hoặc giữ `profiles` nếu namespace rõ ràng), liên kết `village_id` -> `villages.id`, tùy chọn liên kết `citizen_id` -> `citizens.id`.
  - `htxh_profiles` -> Giữ nguyên, liên kết `village_id` -> `villages.id`.
  - `profile_audit_log` -> Giữ nguyên để phục vụ audit chi tiết từng trường thay đổi của hồ sơ chính sách.
  - `stats_cache` -> Giữ nguyên để duy trì tương thích hoặc chuyển sang in-memory caching.

### 2.2 Phân Tuyến Tuyến Đường (Backend Routing)
- [ ] Thiết lập namespace riêng biệt: `/api/policies` hoặc `/api/chinh-sach`
  - `/api/policies/chuctho` -> Chúc thọ routes (`profiles.routes.ts`)
  - `/api/policies/htxh` -> Hỗ trợ xã hội routes (`htxh.routes.ts`)
  - `/api/policies/analytics` -> Thống kê chính sách
  - `/api/policies/excel` -> Import / Export Excel chính sách

### 2.3 Phân Hệ Giao Diện (Client UI Integration)
- [ ] Cập nhật `Sidebar.tsx`:
  - Bổ sung nhóm phân hệ "Chính Sách":
    - Tab "Chúc Thọ" (`id: "chuctho"`, icon: Award / Gift)
    - Tab "Hỗ Trợ Xã Hội" (`id: "htxh"`, icon: HeartHandshake)
- [ ] Cập nhật `App.tsx`:
  - Tích hợp Lazy Loading cho các trang phân hệ chính sách (`ChucThoPage`, `HtxhPage`).
- [ ] Cập nhật Tiêu đề `tauri.conf.json`:
  - Đổi tiêu đề ứng dụng phản ánh hệ thống tích hợp đa phân hệ.

---

## 3. Nhật Ký Tiến Độ (Checklist)

- [x] Phase 1: Context Ingestion & Scope Survey
- [ ] Phase 2: Schema Migration & Prisma Generation
- [ ] Phase 3: Backend Controller & Route Namespacing
- [ ] Phase 4: Client State, API Client & UI Component Migration
- [ ] Phase 5: Verification & Fullstack E2E Testing
