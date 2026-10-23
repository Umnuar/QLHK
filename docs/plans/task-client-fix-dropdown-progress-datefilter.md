# NHIỆM VỤ CLIENT: SỬA LỖI DROPDOWN PORTAL, BỎ TIẾN ĐỘ THỰC HIỆN & BỘ LỌC NGÀY CHÚC THỌ

## 1. MỤC TIÊU VÀ NGUYÊN TẮC P0
- Sửa triệt để lỗi Dropdown `CustomSelect` bị nhảy toạ độ từ góc trên bên trái (0, 0) khi mở (theo video `2026-10-23 18-37-53.mp4`).
- Tạm thời xóa component "Tiến độ thực hiện chính sách" (`PolicyCompositeCard`) khỏi trang thống kê theo ảnh `Screenshot 2026-10-23 191107.png`.
- Bổ sung bộ lọc theo ngày sinh / mốc ngày trên thanh công cụ danh sách Chúc Thọ để người dùng có thể lọc theo ngày.
- BẮT BUỘC P0: ZERO COMMENTS TRONG TOÀN BỘ CODE MỚI HOẶC SỬA ĐỔI. Không viết bất kỳ comment nào (`//`, `/* */`, `#`, JSDoc). Xóa mọi comment cũ trong các vùng mã được chạm vào.

---

## 2. CHI TIẾT CÁC ĐẦU VIỆC CLIENT

### 2.1. Sửa Lỗi Dropdown CustomSelect Nhảy Vị Trí Từ Góc Trên Trái (0, 0)
- Tệp: `QLHK/QLHK-Client/src/components/common/CustomSelect.tsx`
- Nguyên nhân:
  - Khởi tạo `menuPosition = { top: 0, left: 0, width: 0 }`.
  - Khi mở dropdown, `createPortal` render ngay lập tức ở vị trí `top: 0px, left: 0px, width: 0px` trước khi `useEffect` kịp tính toán toạ độ từ `containerRef.current.getBoundingClientRect()`.
  - Class `animate-in fade-in zoom-in-95` khiến dropdown bị trượt/phóng to từ góc (0, 0) xuống vị trí của ô chọn.
- Giải pháp:
  1. Trong hàm xử lý mở dropdown (`handleToggle`):
     - Nếu đang đóng và chuẩn bị mở: Đo ngay `containerRef.current.getBoundingClientRect()` và cập nhật `menuPosition` trước khi set `isOpen(true)`.
  2. Thay `useEffect` bằng `useLayoutEffect` cho việc tính toán vị trí ban đầu để bảo đảm DOM được gán toạ độ chính xác trước khi trình duyệt vẽ frame đầu tiên.
  3. Thêm điều kiện render portal: `{isOpen && menuPosition.width > 0 && typeof document !== "undefined" && createPortal(...)}`.
  4. Đặt `transformOrigin` tương ứng (nếu mở xuống thì `top center`, nếu mở lên thì `bottom center`), loại bỏ hiện tượng giật toạ độ từ góc trên trái màn hình.

### 2.2. Xóa Tạm Thẻ "Tiến Độ Thực Hiện Chính Sách"
- Tệp: `QLHK/QLHK-Client/src/features/qlcs/pages/PolicyAnalyticsPage.tsx`
- Yêu cầu người dùng:
  "Screenshot 2026-10-23 191107.png còn tiến độ thực hiện chả liên quan gì xóa tạm đi"
- Thực hiện:
  - Bỏ rendering của `<PolicyCompositeCard data={policyData} />` trong `PolicyAnalyticsPage.tsx`.

### 2.3. Bổ Sung Bộ Lọc Theo Ngày Cho Danh Sách Chúc Thọ
- Tệp: `QLHK/QLHK-Client/src/features/qlcs/components/dashboard/ProfileFilterBar.tsx` và `DashboardPage.tsx`
- Yêu cầu người dùng:
  "lọc tất cả mọi người trên 60 tuổi thôi còn lại để lọc theo ngày"
- Thực hiện:
  - Khi `activeTab === "chuctho"`:
    - Bổ sung ô nhập hoặc chọn ngày/tháng lọc (ví dụ input chọn ngày hoặc tháng, hoặc nhập text ngày sinh DD/MM).
    - Cập nhật state filter và truyền param `dob` hoặc `day`/`month` vào hàm gọi `policyApi.getProfiles`.

---

## 3. QUALITY GATES CLIENT
1. `cd QLHK/QLHK-Client; npx tsc --noEmit` -> 0 lỗi.
2. `cd QLHK/QLHK-Client; npm test -- --run` -> Pass 100%.
3. `cd QLHK/QLHK-Client; npm run build` -> Build thành công.
4. Kiểm tra P0 Zero Comments trên toàn bộ file code.
