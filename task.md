# Task Progress Tracker (Dual Light & Dark Mode Dashboard Roadmap)

- **Project**: QLHK (Hệ thống Quản lý Hộ khẩu Đăk Hà)
- **Reference Source**: `C:\Users\umnuar\Downloads\dak-ha-demographic-dashboard (2)`
- **Baseline Git Checkpoint**: `d8ebb69` (Clean working tree, Backend: 115/115 PASS, Client: 155/155 PASS)
- **Status Legend**: 
  - `[ ]` Pending
  - `[/]` In Progress
  - `[x]` Completed
  - `[!]` Blocked (Circuit Breaker Tripped - Cleanly Rolled Back)

## Execution Checklist

- [x] Step 1: Core Primitives Dual Mode (`CardShell.tsx`, `MicroBar.tsx`, `DonutChart.tsx`, `statStyles.tsx`)
  - Target Files: `QLHK-Client/src/components/analytics/CardShell.tsx`, `QLHK-Client/src/components/analytics/MicroBar.tsx`, `QLHK-Client/src/components/analytics/DonutChart.tsx`, `QLHK-Client/src/components/common/statStyles.tsx`
  - Assigned Role: `.agents/ui-ux-designer.md`
  - Key Specs: CardShell wrapper (border-slate-200 bg-white text-slate-900 / dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-100), header (border-slate-100 dark:border-slate-800), MicroBar track (bg-slate-200 dark:bg-slate-800), DonutChart track (stroke-slate-100 dark:stroke-slate-800/40), center text (text-slate-900 dark:text-white / text-slate-600 dark:text-slate-400).
  - Diff Budget: <= 150 LOC
  - Verification: `npx tsc --noEmit` Client (0 error), `npm test` Client (155/155 PASS)

- [/] Step 2: Composite Cards Dual Mode (`KpiRow.tsx`, `DistributionCard.tsx`, `WelfareCard.tsx`)
  - Target Files: `QLHK-Client/src/components/analytics/KpiRow.tsx`, `QLHK-Client/src/components/analytics/DistributionCard.tsx`, `QLHK-Client/src/components/analytics/WelfareCard.tsx`
  - Assigned Role: `.agents/frontend-developer.md`
  - Key Specs: KpiCard container (border-slate-200 bg-white / dark:border-slate-800 dark:bg-slate-900/90), DistributionCard item container hover/active states, WelfareCard 2-column divide (divide-slate-200 dark:divide-slate-800) and badges/labels.
  - Diff Budget: <= 180 LOC
  - Verification: `npx tsc --noEmit` Client (0 error), `npm test` Client (155/155 PASS)

- [ ] Step 3: Dashboard Integration & Theme Toggle Button (`AnalyticsDashboard.tsx`)
  - Target Files: `QLHK-Client/src/components/analytics/AnalyticsDashboard.tsx`
  - Assigned Role: `.agents/frontend-developer.md`, `.agents/ui-ux-designer.md`
  - Key Specs: Connect `theme, toggleTheme` from `useApp()`, import `Sun, Moon` from `lucide-react`, add Theme Toggle button to header action toolbar.
  - Diff Budget: <= 80 LOC
  - Verification: `AnalyticsDashboard.test.tsx` (7/7 PASS), `npm test` Client (155/155 PASS)

- [ ] Step 4: Final Quality Gates & Full Verification
  - Verification: `npm test` Client (155/155 PASS), `npx tsc --noEmit` Client (0 error), `npm test` Backend (115/115 PASS), Docker container health check (HTTP 200 OK)

## Project Gotchas & Learned Invariants
- [Donut Track Contrast in Light Mode]: Trong chế độ sáng, rãnh nền Donut phải dùng `stroke-slate-100` và `dark:stroke-slate-800/40` để không bị quá gắt trên nền card trắng.
- [CardShell Dual Mode]: Card wrapper ở chế độ sáng dùng `bg-white border-slate-200 text-slate-900 shadow-xs`, ở tối dùng `dark:bg-slate-900/90 dark:border-slate-800 dark:text-slate-100 dark:backdrop-blur-md`.
- [Test Selectors Preservation]: Bắt buộc giữ nguyên mọi text và aria-label hiện có để 155 test Client không bị gãy.
- [AppContext Theme Protocol]: Sử dụng trực tiếp `theme` và `toggleTheme` từ `useApp()` (đã quản lý class `.dark` trên thẻ `<html>` và lưu `theme` trong `localStorage`).
