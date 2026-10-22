# Backend Policy Logic & API Contract Normalization

## Mục tiêu
Đồng bộ hóa API contract của QLHK-Backend với QLHK-Client cho các module Chúc Thọ, Hưu Trí Xã Hội và Thống Kê Chính Sách. Toàn bộ logic nghiệp vụ, bộ lọc, sắp xếp, CRUD, toggle trạng thái, và nhập JSON array phải hoạt động trơn tru.

## Invariant Bắt Buộc
- P0: ZERO COMMENTS IN CODE (Tuyệt đối không viết `//`, `/* */`, `#`, JSDoc vào code mới hoặc sửa đổi).
- Không phá vỡ các test case bảo mật, RBAC và các route hiện có của QLHK-Backend.

## Các nhiệm vụ cụ thể

### 1. src/controllers/policyChuctho.controller.ts & policyHtxh.controller.ts
- Hỗ trợ cả 2 chuẩn query params camelCase và snake_case:
  - `village_id` || `villageId`
  - `calculation_year` || `calculationYear`
  - `status`: nếu là `"received"` hoặc `"true"` thì `received = true`, nếu `"unreceived"` hoặc `"false"` thì `received = false`.
  - Bộ lọc: `gender`, `ethnicity`, `residence`, `ageGroup` / `milestone`.
  - Sắp xếp: `sortKey` (stt, name, dob, cccd...) và `sortDirection` (asc, desc).
- Trong `createChucthoProfile` / `updateChucthoProfile` và `createHtxhProfile` / `updateHtxhProfile`:
  - Hỗ trợ cả `current_address` || `currentAddress`
  - Hỗ trợ cả `village_id` || `villageId`
  - Hỗ trợ cả `calculation_year` || `calculationYear`

### 2. src/controllers/policyAnalytics.controller.ts
- Hỗ trợ cả `village_id` || `villageId` và `calculation_year` || `calculationYear`.
- Trong object thống kê trả về:
  - `chuctho`: bổ sung `unreceived: chucthoList.filter((c) => !c.received).length` và `rate: chucthoList.length > 0 ? ((chuctho.received / chucthoList.length) * 100).toFixed(1) : "0.0"`.
  - `htxh`: bổ sung `unreceived: htxhList.filter((h) => !h.received).length` và `rate: htxhList.length > 0 ? ((htxh.received / htxhList.length) * 100).toFixed(1) : "0.0"`.

### 3. src/controllers/policyExcel.controller.ts
- Trong `importPolicyExcel`:
  - Nếu `req.body.profiles` là mảng JSON (client gửi từ `useImportProfiles`):
    - Đọc `village_id` || `req.body.villageId` || `req.user?.village_id`.
    - Duyệt qua từng profile trong `req.body.profiles`: tính toán milestones theo tuổi và năm tính toán (`calcYear`), mã hóa CCCD nếu có, và thực hiện upsert / create vào `chuctho_profiles` hoặc `htxh_profiles`.
    - Trả về response JSON: `{ success: true, inserted: count, updated: 0, errorDetails: [] }`.
  - Nếu có `req.file`: giữ nguyên luồng xử lý file nhị phân qua ExcelJS hiện tại.

## Kiểm tra hoàn tất
1. Chạy `cd QLHK/QLHK-Backend; npx tsc --noEmit` -> Đạt 0 error.
2. Chạy `npm test tests/unit/policy-chuctho.test.ts tests/unit/policy-htxh.test.ts tests/unit/policy-analytics.test.ts` -> 100% pass.
3. Quét kiểm tra comment: Đảm bảo 0 dòng comment trong các file đã chỉnh sửa.
4. Báo cáo hoàn tất.
