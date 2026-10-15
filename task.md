# Task Progress Tracker (v0 Dashboard (1) Porting & Optimization Roadmap)

- **Project**: QLHK (Hệ thống Quản lý Hộ khẩu Đăk Hà)
- **Reference Source**: `C:\Users\umnuar\Downloads\dak-ha-demographic-dashboard (1)`
- **Baseline Git Checkpoint**: `9162786` (Clean working tree, Backend: 115/115 PASS, Client: 155/155 PASS)
- **Status Legend**: 
  - `[ ]` Pending
  - `[/]` In Progress
  - `[x]` Completed
  - `[!]` Blocked (Circuit Breaker Tripped - Cleanly Rolled Back)

## Execution Checklist

- [x] Step 1: Upgrade Core Primitives to v0 (1) Spec (`DonutChart` 176px + Hit-Target, `MicroBar`, `CardShell`, `statStyles.tsx`)
  - Target Files: `QLHK-Client/src/components/analytics/DonutChart.tsx`, `QLHK-Client/src/components/common/statStyles.tsx`
  - Assigned Role: `.agents/ui-ux-designer.md`
  - Key Specs: `size = 176`, `stroke = 16`, `gap = 2`, `MIN_HIT_LENGTH = 16`, hit-target ring `strokeWidth = 30`, visual hover `strokeWidth = 20`, dimming 0.3, center label `maxWidth = Math.max(size - stroke * 2 - 20, 60)`, export `StatMicroBar`, `StatChartPanel`, `StatDonut`.
  - Diff Budget: <= 200 LOC
  - Verification: `npx tsc --noEmit` Client (0 error), `npm test` Client (155/155 PASS)

- [/] Step 2: Refine Composite Cards (`DistributionCard.tsx`, `WelfareCard.tsx`, `KpiRow.tsx`)
  - Target Files: `QLHK-Client/src/components/analytics/DistributionCard.tsx`, `QLHK-Client/src/components/analytics/WelfareCard.tsx`, `QLHK-Client/src/components/analytics/KpiRow.tsx`
  - Assigned Role: `.agents/frontend-developer.md`
  - Key Specs: DistributionCard Donut 176px + full Vietnamese center labels, WelfareCard 2-column layout matching v0 (1), KpiRow 88px.
  - Diff Budget: <= 200 LOC
  - Verification: `npx tsc --noEmit` Client (0 error), `npm test` Client (155/155 PASS)

- [ ] Step 3: Polish Single-Viewport Layout in `AnalyticsDashboard.tsx`
  - Target Files: `QLHK-Client/src/components/analytics/AnalyticsDashboard.tsx`
  - Assigned Role: `.agents/frontend-developer.md`, `.agents/ui-ux-designer.md`
  - Key Specs: 1080p single viewport (~700px total height, zero page scroll), full center labels, preserve Excel export & offline cache.
  - Diff Budget: <= 180 LOC
  - Verification: `AnalyticsDashboard.test.tsx` (7/7 PASS), `npm test` Client (155/155 PASS)

- [ ] Step 4: Final Quality Gates & Full Verification
  - Verification: `npm test` Client (155/155 PASS), `npx tsc --noEmit` Client (0 error), `npm test` Backend (115/115 PASS), Docker container health check (HTTP 200 OK)

## Project Gotchas & Learned Invariants
- [Donut Hit-Target]: Với các phân khúc nhỏ (< 16px arc length), phải dùng `MIN_HIT_LENGTH = 16` trên vòng hit-target trong suốt `strokeWidth = stroke + 14` và `pointerEvents="stroke"` để chống trượt chuột khi rê vào lát cắt hẹp.
- [Center Text Wrapping]: Nhãn phụ ở tâm Donut có `style={{ maxWidth: Math.max(size - stroke * 2 - 20, 60) }}` và `text-balance break-words text-[10px]` để nhãn tiếng Việt dài không bị tràn ra ngoài vòng Donut.
- [Test Selectors Preservation]: Bắt buộc giữ nguyên các tiêu đề `Phân Bổ Dân Tộc Địa Bàn Đăk Hà`, `Cơ Cấu Tín Ngưỡng & Tôn Giáo`, `Tháp Tuổi & Cơ Cấu Thế Hệ`, `Tình Hình Nghĩa Vụ Quân Sự`, `Trình Độ Học Vấn`, `Cơ Cấu Nghề Nghiệp` và nhãn `Dân tộc Kinh...`, `12/12...` để 155 test Client không bị gãy.
- [Zero-Dependency UI]: Không cài `@base-ui` hay `@radix-ui` mới; dùng React thuần + Tailwind CSS để bảo toàn tốc độ build và kích thước bundle.
