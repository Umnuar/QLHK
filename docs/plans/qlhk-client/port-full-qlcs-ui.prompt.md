# GOAL: PORT TOÀN BỘ 100% UI NGUYÊN BẢN TỪ QLCS SANG QLHK-CLIENT

Người dùng yêu cầu:
"ui vẫn không giống hay bạn cho nó copy toàn bộ ui qua , kết nội chúng lại tạm thời để dùng xem nào tôi cần ui trước đã , điều khiển agent client"

Nhiệm vụ của bạn: Sao chép toàn bộ các component và trang UI nguyên bản từ QLCS (`QLCS/QLCS-Client/src`) sang `QLHK/QLHK-Client/src/features/qlcs/`, kết nối tạm thời với fallback mock data để giao diện hiển thị và hoạt động 1:1 chuẩn xác như QLCS.

## CÁC BƯỚC THỰC THI CHI TIẾT:

### BƯỚC 1: DỌN DẸP CODE TẠM CŨ
1. Xoá thư mục `QLHK/QLHK-Client/src/features/qlcs/components/chuctho` và `QLHK/QLHK-Client/src/features/qlcs/components/htxh` (đây là các component rút gọn cũ làm hỏng giao diện).

### BƯỚC 2: SAO CHÉP TOÀN BỘ COMPONENT NGUYÊN BẢN CỦA QLCS
1. Tạo thư mục `QLHK/QLHK-Client/src/features/qlcs/components/dashboard` và copy toàn bộ 9 file từ `QLCS/QLCS-Client/src/components/dashboard/`:
   - `MainTable.tsx`
   - `ProfileRow.tsx`
   - `ProfileFilterBar.tsx`
   - `ProfileModal.tsx`
   - `StatsCards.tsx`
   - `YearSelector.tsx`
   - `ImportModal.tsx`
   - `ExportModal.tsx`
   - `constants.ts`
2. Tạo thư mục `QLHK/QLHK-Client/src/features/qlcs/components/analytics` và copy toàn bộ 9 file từ `QLCS/QLCS-Client/src/components/analytics/`:
   - `AnalyticsWidgets.tsx`
   - `CardShell.tsx`
   - `DistributionCard.tsx`
   - `DonutChart.tsx`
   - `GenderRatioBar.tsx`
   - `MicroBar.tsx`
   - `policyAnalyticsData.ts`
   - `PolicyCompositeCard.tsx`
   - `PolicyKpiRow.tsx`

### BƯỚC 3: SAO CHÉP VÀ CẤU HÌNH CÁC TRANG (PAGES)
1. Copy `QLCS/QLCS-Client/src/pages/DashboardPage.tsx` sang `QLHK/QLHK-Client/src/features/qlcs/pages/DashboardPage.tsx`.
2. Copy `QLCS/QLCS-Client/src/pages/AnalyticsPage.tsx` sang `QLHK/QLHK-Client/src/features/qlcs/pages/PolicyAnalyticsPage.tsx`.
3. Sửa `QLHK/QLHK-Client/src/features/qlcs/pages/ChucThoPage.tsx`:
```tsx
import React from "react";
import Dashboard from "./DashboardPage";

export const ChucThoPage: React.FC = () => {
	return <Dashboard tabOverride="chuctho" />;
};

export default ChucThoPage;
```
4. Sửa `QLHK/QLHK-Client/src/features/qlcs/pages/HtxhPage.tsx`:
```tsx
import React from "react";
import Dashboard from "./DashboardPage";

export const HtxhPage: React.FC = () => {
	return <Dashboard tabOverride="htxh" />;
};

export default HtxhPage;
```
5. Sửa `QLHK/QLHK-Client/src/features/qlcs/pages/index.ts`: export đầy đủ `ChucThoPage`, `HtxhPage`, `PolicyAnalyticsPage`, `DashboardPage`.

### BƯỚC 4: ĐIỀU CHỈNH IMPORT VÀ KẾT NỐI DỮ LIỆU TẠM THỜI (FALLBACK MOCK)
1. Trong các file vừa copy, sửa lại các import path cho đúng:
   - Thay `../AppContext` bằng `@/AppContext`
   - Thay `../api/...` bằng `@/api/...`
   - Thay `../hooks/...` bằng `@/hooks/...`
   - Thay `../components/common/...` bằng `@/components/common/...`
   - Thay `../types` bằng `@/types`
   - Thay `../utils/...` bằng `@/utils/...`
2. Kết nối tạm thời (Fallback Mock Data):
   - Đảm bảo nếu API `/policies/chuctho` hoặc `/policies/htxh` trả về rỗng hoặc lỗi khi chưa có backend, `useProfiles` hoặc component có fallback mock data để hiển thị đầy đủ các thẻ stats, bảng dữ liệu mẫu và các modal tương tác bình thường cho người dùng trải nghiệm.

### BƯỚC 5: TUÂN THỦ NGHIÊM NGẶT P0 (ZERO COMMENTS IN CODE)
- TUYỆT ĐỐI KHÔNG để lại bất kỳ comment nào (`//`, `/* */`, `#`, JSDoc) trong toàn bộ các file mới copy hoặc chỉnh sửa.
- Xoá sạch toàn bộ comment thừa.

### BƯỚC 6: KIỂM TRA CHẤT LƯỢNG (QUALITY GATES)
1. Chạy `npx tsc --noEmit` trong `QLHK/QLHK-Client` đảm bảo 0 lỗi TypeScript.
2. Chạy `npm test -- --run` trong `QLHK/QLHK-Client` đảm bảo pass 100% tests.
3. Chạy `npm run build` trong `QLHK/QLHK-Client` đảm bảo build thành công.

Sau khi hoàn thành, hãy báo cáo kết quả chi tiết từng bước.
