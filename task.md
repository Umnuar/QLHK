# Task Progress Tracker (v0 Dashboard Porting & Data Persistence Roadmap)

- **Project**: QLHK (Hệ thống Quản lý Hộ khẩu Đăk Hà)
- **Plan Reference**: `C:\Users\umnuar\.gemini\antigravity\brain\458ec4a9-7e3a-4e81-bed4-e6d9fa30bef9\implementation_plan.md`
- **Baseline Git Checkpoint**: `587bbd6` (Clean working tree, Backend: 115/115 PASS, Client: 155/155 PASS)
- **Status Legend**: 
  - `[ ]` Pending
  - `[/]` In Progress
  - `[x]` Completed
  - `[!]` Blocked (Circuit Breaker Tripped - Cleanly Rolled Back)

## Execution Checklist

- [x] Step 1: Porting Core UI Primitives from v0 (`DonutChart`, `MicroBar`, `CardShell`, Native `Tooltip`)
  - Target Files: `QLHK-Client/src/components/analytics/DonutChart.tsx`, `QLHK-Client/src/components/analytics/MicroBar.tsx`, `QLHK-Client/src/components/analytics/CardShell.tsx`, `QLHK-Client/src/components/common/statStyles.tsx`
  - Assigned Role: `c:/Users/umnuar/Documents/Projects/.agents/ui-ux-designer.md`
  - Diff Budget: <= 200 LOC
  - Verification: `npx tsc --noEmit` Client (0 error, 155/155 tests PASS)

- [ ] Step 2: Porting Composite Cards from v0 (`DistributionCard`, `WelfareCard`, `KpiRow`)
  - Target Files: `QLHK-Client/src/components/analytics/DistributionCard.tsx`, `QLHK-Client/src/components/analytics/WelfareCard.tsx`, `QLHK-Client/src/components/analytics/KpiRow.tsx`
  - Assigned Role: `c:/Users/umnuar/Documents/Projects/.agents/frontend-developer.md`
  - Diff Budget: <= 200 LOC
  - Verification: `npx tsc --noEmit` Client (0 error)

- [ ] Step 3: Integrating Single-Viewport Dashboard in `AnalyticsDashboard.tsx`
  - Target Files: `QLHK-Client/src/components/analytics/AnalyticsDashboard.tsx`
  - Assigned Role: `c:/Users/umnuar/Documents/Projects/.agents/frontend-developer.md`, `c:/Users/umnuar/Documents/Projects/.agents/ui-ux-designer.md`
  - Diff Budget: <= 180 LOC
  - Verification: `AnalyticsDashboard.test.tsx` (7/7 PASS), 1080p layout check

- [ ] Step 4: Final Quality Gates & Full Verification
  - Verification: `npm test` Client (155/155 PASS), `npx tsc --noEmit` Client (0 error), `npm test` Backend (115/115 PASS), Docker container health check

## Project Gotchas & Learned Invariants
- [Zero-Dependency UI]: Không cài `@base-ui` hay `@radix-ui` mới; dùng React thuần + Tailwind CSS để bảo toàn tốc độ build và kích thước bundle.
- [ActiveId 2-Way Sync]: Rê chuột vào danh sách bên phải sẽ làm sáng vòng Donut tương ứng bên trái (`activeId === segment.id ? stroke + 3 : stroke`, `opacity: 0.3` cho các segment khác) và ngược lại.
- [Single Viewport 1080p]: Chiều cao 4 card chính cố định `lg:h-[276px]`, KpiRow `lg:h-[88px]`, tổng cụm ~708px hiển thị trọn vẹn không cần cuộn chuột trên màn hình 1080p.
- [Test Selectors Preservation]: Bắt buộc giữ nguyên các tiêu đề `Phân Bổ Dân Tộc Địa Bàn Đăk Hà`, `Cơ Cấu Tín Ngưỡng & Tôn Giáo`, `Tháp Tuổi & Cơ Cấu Thế Hệ`, `Tình Hình Nghĩa Vụ Quân Sự`, `Trình Độ Học Vấn`, `Cơ Cấu Nghề Nghiệp` và nhãn `Dân tộc Kinh...`, `12/12...` để 155 test Client không bị gãy.
