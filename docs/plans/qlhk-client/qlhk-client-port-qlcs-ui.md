# Kế hoạch Port Nguyên Vẹn Toàn Bộ Giao Diện QLCS sang QLHK-Client (High-Fidelity UI Port)

- **Total Implementation Steps**: 5

## 1. Bối cảnh & Mục tiêu
- **Mục tiêu**: Người dùng yêu cầu không tối ưu hóa quá mức hay thu gọn các component thành mini-tables sơ sài, mà phải copy nguyên vẹn ("copy i xì") toàn bộ giao diện giàu tính năng từ `QLCS/QLCS-Client/src` sang `QLHK/QLHK-Client/src`, đảm bảo giao diện đầy đủ các bảng, các modal đa tab, popover, thanh lọc nâng cao, biểu đồ phân tích chuyên sâu, và chạy trơn tru 100%.
- **Phạm vi tác động**:
  - Giao diện Chúc thọ (`ChucThoPage.tsx` -> tích hợp `<Dashboard tabOverride="chuctho" />`).
  - Giao diện Hỗ trợ xã hội (`HtxhPage.tsx` -> tích hợp `<Dashboard tabOverride="htxh" />`).
  - Giao diện Thống kê chính sách (`PolicyAnalyticsPage.tsx` -> tích hợp `<AnalyticsPage />`).
  - Toàn bộ các component dashboard: `MainTable.tsx`, `ProfileRow.tsx`, `ProfileFilterBar.tsx`, `ProfileModal.tsx`, `StatsCards.tsx`, `YearSelector.tsx`, `ExportModal.tsx`, `ImportModal.tsx`, `constants.ts`.
  - Toàn bộ các component analytics: `AnalyticsWidgets.tsx`, `CardShell.tsx`, `DistributionCard.tsx`, `DonutChart.tsx`, `GenderRatioBar.tsx`, `MicroBar.tsx`, `PolicyCompositeCard.tsx`, `PolicyKpiRow.tsx`, `policyAnalyticsData.ts`.
  - Các hooks và tiện ích: `useProfiles.ts`, `useFilters.ts`, `useAnalyticsFluctuation.ts`, `useUndo.ts`, `useFormValidation.ts`, `excelExporter.ts`.
  - Tầng API Client adapter: ánh xạ các phương thức của `profiles.ts` và `htxh.ts` tới backend QLHK `/api/policies/chuctho` và `/api/policies/htxh`.

## 2. Tiêu chí Hoàn thành (Success Criteria)
1. Toàn bộ các file UI từ `QLCS-Client` được chuyển giao đầy đủ, tương thích với theme dark/light và responsive.
2. 100% test suite trong QLHK-Client pass (tất cả các test files, không hồi quy).
3. `npx tsc --noEmit` đạt 0 lỗi biên dịch TypeScript.
4. `npm run build` hoàn thành với exit code 0.
5. P0 Invariant: Tuyệt đối không chứa bất kỳ dòng comment nào trong code (`//`, `/* */`, JSDoc, `#`).

## 3. Phân rã Các Bước Thực Thi
- **Bước 1**: Foundation Types, Context & API Adapters.
- **Bước 2**: Hooks & Utility Layer.
- **Bước 3**: Full Analytics Suite Components & Page.
- **Bước 4**: Full Dashboard UI Components.
- **Bước 5**: DashboardPage, Page Integration & Test Contract Alignment.
