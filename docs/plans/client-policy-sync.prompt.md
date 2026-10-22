# Client Policy Live Sync & Action Logic

## Mục tiêu
Đồng bộ hóa API calls và kết nối logic các nút thao tác tại QLHK-Client với Backend. Khi backend phản hồi thành công, UI phản ánh dữ liệu thật từ cơ sở dữ liệu. Khi offline, duy trì fallback mock data an toàn. Tuyệt đối KHÔNG thay đổi layout hay tối ưu lại UI.

## Invariant Bắt Buộc
- P0: ZERO COMMENTS IN CODE (Tuyệt đối không viết `//`, `/* */`, `#`, JSDoc vào code mới hoặc sửa đổi).
- GIỮ NGUYÊN 100% GIAO DIỆN HIỆN TẠI: Không can thiệp, không rút gọn, không refactor các component UI đã port 1:1.

## Các nhiệm vụ cụ thể

### 1. src/api/profiles.ts & src/api/htxh.ts
- Chuẩn hóa các hàm gọi API:
  - `getProfiles`: Đảm bảo truyền đủ các tham số `page`, `limit`, `search`, `villageId`, `calculationYear`, `status`, `ageGroup`, `gender`, `ethnicity`, `residence`, `sortKey`, `sortDirection`.
  - `bulkAddProfiles(profiles: any[])`: Kết nối gọi `excelApi.importProfiles({ type: activeTab, villageId, calculationYear, profiles })`.
  - `bulkUpdateStatus(ids: string[], received: boolean)`: Gửi request cập nhật trạng thái hàng loạt.
  - `bulkDelete(ids: string[])`: Gửi request xóa hàng loạt.

### 2. src/hooks/useProfiles.ts
- Khi `api.getProfiles` hoặc `api.getProfileStats` thành công: cập nhật state `pageData`, `total`, `stats` trực tiếp từ dữ liệu trả về của backend.
- Giữ lớp fallback `FALLBACK_CHUC_THO` và `FALLBACK_HTXH` trong khối `catch` khi và chỉ khi request mạng gặp lỗi hoặc server offline.

### 3. Kiểm tra các nút bấm
- Nút Thêm mới hồ sơ (`ProfileModal.tsx`) -> Lưu thành công vào backend.
- Nút Sửa hồ sơ -> Cập nhật thành công vào backend.
- Nút Xóa hồ sơ -> Gọi DELETE backend thành công.
- Nút Toggle Đã nhận / Chưa nhận -> Gửi PATCH backend thành công.
- Năm tính toán (YearSelector) -> Cập nhật và load lại danh sách theo năm.
- Bộ lọc thôn, độ tuổi, giới tính, dân tộc -> Truyền đúng param và load lại danh sách.

## Kiểm tra hoàn tất
1. Chạy `cd QLHK/QLHK-Client; npx tsc --noEmit` -> Đạt 0 error.
2. Chạy `npm test -- --run` -> Đạt 22/22 test files pass, 179/179 tests pass.
3. Chạy `npm run build` -> Đạt build thành công.
4. Quét kiểm tra comment: Đảm bảo 0 dòng comment trong các file đã chỉnh sửa.
5. Báo cáo hoàn tất.
