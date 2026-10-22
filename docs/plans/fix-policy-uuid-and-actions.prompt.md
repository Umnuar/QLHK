# Fix Policy UUID Handling & Live Action Sync

## Bối cảnh & Nguyên nhân lỗi (BUG-001)
Khi người dùng click đổi trạng thái quà (Toggle Đã nhận/Chưa nhận) hoặc sửa/xóa hồ sơ trên giao diện mới:
Log Docker Backend báo lỗi 500:
`Inconsistent column data: Error creating UUID, invalid character: expected an optional prefix of urn:uuid: followed by [0-9a-fA-F-], found 't' at 2`
`[HTTP] PATCH /api/policies/chuctho/ct-2/received 500`

Nguyên nhân:
1. Client `useProfiles.ts` chứa dữ liệu mẫu fallback mang `id: "ct-1"`, `"ct-2"`, `"ht-1"`.
2. Backend PostgreSQL định nghĩa cột `id` là kiểu `UUID` (`@id @db.Uuid`).
3. Khi nhận chuỗi không phải UUID (`ct-2`), Prisma cố cast sang UUID và ném ngoại lệ không xử lý dẫn đến sập 500.
4. Cơ sở dữ liệu chưa có dữ liệu mẫu thực tế, khiến người dùng nhìn thấy dữ liệu fallback cũ và thao tác trên đó bị lỗi.

## Invariant Bắt Buộc
- P0: ZERO COMMENTS IN CODE (Không viết bất kỳ comment `//`, `/* */`, `#`, JSDoc vào code).
- KHÔNG THAY ĐỔI GIAO DIỆN / BỐ CỤC UI.

## Nhiệm vụ Backend Agent
1. **Kiểm tra hợp lệ UUID (isValidUuid)** trong `src/controllers/policyChuctho.controller.ts` và `src/controllers/policyHtxh.controller.ts`:
   - Hàm kiểm tra: `const isValidUuid = (id: string): boolean => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);`
   - Áp dụng cho toàn bộ các endpoint nhận `:id`: `updateChucthoProfile`, `markChucthoReceived`, `deleteChucthoProfile`, `updateHtxhProfile`, `markHtxhReceived`, `deleteHtxhProfile`.
   - Nếu `!isValidUuid(id)`, trả về HTTP 400: `{ error: "Mã định danh hồ sơ không hợp lệ (yêu cầu định dạng UUID)" }` thay vì để Prisma crash 500.
   - Thêm xử lý `catch` kiểm tra lỗi RecordNotFound (Prisma error code `P2025`): trả về 404 `{ error: "Hồ sơ không tồn tại" }`.
2. **Seed dữ liệu mẫu ban đầu vào PostgreSQL**:
   - Tạo script seed hoặc chèn các hồ sơ Chúc Thọ và HTXH thực tế với UUID hợp lệ, liên kết với các thôn hiện có (`Thôn 1`, `Thôn 2`, `Thôn 3`...).
   - Đảm bảo khi gọi `GET /api/policies/chuctho` và `GET /api/policies/htxh`, backend trả về các bản ghi thật trong CSDL.
3. **Chạy kiểm thử chất lượng**:
   - `npx tsc --noEmit` -> 0 error.
   - `npx vitest run tests/unit/policy*` -> 100% pass.

## Nhiệm vụ Client Agent
1. **Chuẩn hóa ID trong Fallback Data (`src/hooks/useProfiles.ts`)**:
   - Đổi toàn bộ các ID mẫu trong `FALLBACK_CHUC_THO` và `FALLBACK_HTXH` sang định dạng UUID hợp lệ:
     `00000000-0000-4000-8000-000000000001`, `00000000-0000-4000-8000-000000000002`...
2. **Dọn dẹp Cache Cũ**:
   - Trong `useProfiles.ts`: Kiểm tra dữ liệu đọc từ cache. Nếu danh sách chứa phần tử có `id` bắt đầu bằng `ct-` hoặc `ht-`, tự động loại bỏ cache cũ và nạp lại từ network.
3. **Xử lý An Toàn trong Actions (`src/hooks/useProfilesActions.ts`)**:
   - Trong `handleStatusToggle`, `handleSave`, `handleDelete`:
     Nếu gặp lỗi 404 hoặc ID mẫu, thông báo rõ ràng và đồng bộ lại danh sách từ server thay vì giữ trạng thái xung đột.
4. **Chạy kiểm thử chất lượng**:
   - `npx tsc --noEmit` -> 0 error.
   - `npm test -- --run` -> 22/22 test files pass, 179/179 tests pass.
   - `npm run build` -> Build thành công.
