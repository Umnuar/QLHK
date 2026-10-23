# NHIỆM VỤ BACKEND: ĐỒNG BỘ CÔNG DÂN QLHK SANG CHÚC THỌ & HƯU TRÍ XÃ HỘI

## 1. MỤC TIÊU VÀ NGUYÊN TẮC P0
- Toàn bộ dữ liệu của phân hệ Chính Sách (Chúc Thọ, Hưu Trí Xã Hội) dùng chung dữ liệu nhân khẩu từ QLHK (`citizens`).
- Chúc Thọ (`chuctho_profiles`): Chuyển tất cả công dân từ QLHK sang QLCS, lọc tất cả người từ 60 tuổi trở lên (`age >= 60`), tính toán đúng các mốc tuổi chúc thọ (`age60`..`age_over_100`). Bổ sung API lọc theo ngày/tháng sinh.
- Hưu Trí Xã Hội (`htxh_profiles`): Người trong bảng hưu trí CHỈ XUẤT HIỆN KHI VÀ CHỈ KHI nghề nghiệp (`occupation`) của hồ sơ đó ghi "hưu trí" hoặc "nghỉ hưu" (chứa từ "hưu", không phân biệt hoa thường).
- BẮT BUỘC P0: ZERO COMMENTS TRONG TOÀN BỘ CODE MỚI HOẶC SỬA ĐỔI. Không viết bất kỳ comment nào (`//`, `/* */`, `#`, JSDoc). Xóa mọi comment cũ trong các vùng mã được chạm vào.

---

## 2. CHI TIẾT CÁC ĐẦU VIỆC BACKEND

### 2.1. Logic Đồng Bộ Dữ Liệu Công Dân QLHK Sang Chính Sách
- Tệp: `QLHK/QLHK-Backend/src/services/policySync.service.ts` (hoặc trong controller liên quan)
- Thuật toán đồng bộ:
  1. Lấy toàn bộ công dân hợp lệ từ bảng `citizens` (kèm thông tin `household` để lấy `village_id` và `address`) với điều kiện `citizens.is_deleted = false` và `household.is_deleted = false`.
  2. Xử lý Chúc Thọ (`chuctho_profiles`):
     - Tính tuổi hiện tại dựa vào chuỗi `dob` (năm tính toán `calcYear` mặc định năm hiện tại `new Date().getFullYear()`).
     - Lọc tất cả công dân có `age >= 60`:
       - Tự động xác định mốc tuổi:
         - 60 <= age < 65: `age60 = "x"`
         - 65 <= age < 70: `age65 = "x"`
         - 70 <= age < 75: `age70 = "x"`
         - 75 <= age < 80: `age75 = "x"`
         - 80 <= age < 85: `age80 = "x"`
         - 85 <= age < 90: `age85 = "x"`
         - 90 <= age < 95: `age90 = "x"`
         - 95 <= age < 100: `age95 = "x"`
         - age = 100: `age100 = "x"`
         - age > 100: `age_over_100 = "x"`
       - Upsert vào `chuctho_profiles` theo `cccd_hash` hoặc `(name_unaccented, dob, village_id)`:
         - `name = citizen.full_name`, `name_unaccented = citizen.name_unaccented`
         - `dob = citizen.dob`, `gender = citizen.gender`
         - `cccd = citizen.cccd`, `cccd_hash = citizen.cccd_hash`, `cccd_last4 = citizen.cccd_last4`
         - `ethnicity = citizen.ethnicity`, `residence = household.address`, `current_address = household.address`
         - `village_id = household.village_id`, `calculation_year = calcYear`
         - Giữ nguyên trạng thái `received` đã trao quà nếu hồ sơ đã tồn tại trước đó.
  3. Xử lý Hưu Trí Xã Hội (`htxh_profiles`):
     - Chỉ chọn các công dân có `occupation` chứa từ "hưu" (không phân biệt hoa thường, ví dụ: "hưu trí", "nghỉ hưu", "cán bộ hưu trí").
     - Upsert vào `htxh_profiles`:
       - `name = citizen.full_name`, `name_unaccented = citizen.name_unaccented`
       - `dob = citizen.dob`, `gender = citizen.gender`
       - `cccd = citizen.cccd`, `cccd_hash = citizen.cccd_hash`, `cccd_last4 = citizen.cccd_last4`
       - `ethnicity = citizen.ethnicity`, `residence = household.address`, `current_address = household.address`
       - `village_id = household.village_id`, `calculation_year = calcYear`
       - `huu_tri = "x"`
     - Đồng thời xóa / đánh dấu `is_deleted = true` các bản ghi trong `htxh_profiles` không thuộc nhóm nghề nghiệp chứa từ "hưu" để đảm bảo bảng hưu trí chỉ chứa đúng đối tượng hưu trí.
  4. Cung cấp API endpoint: `POST /api/policies/sync` trong `policy.routes.ts` để gọi hàm đồng bộ bất cứ khi nào cần.
  5. Viết script chạy đồng bộ ngay lập tức để nạp toàn bộ 81 công dân >= 60 tuổi vào `chuctho_profiles` và công dân hưu trí vào `htxh_profiles`.

### 2.2. Bổ Sung Bộ Lọc Theo Ngày Cho API Chúc Thọ
- Tệp: `QLHK/QLHK-Backend/src/controllers/policyChuctho.controller.ts`
- Trong hàm `getChucthoProfiles`:
  - Tiếp nhận query params: `day`, `month`, `dob`, `exact_date`, `date_from`, `date_to`.
  - Nếu có `dob` hoặc `exact_date`: tìm kiếm chính xác hoặc `contains` trong trường `dob`.
  - Nếu có `day`: tìm kiếm các bản ghi có ngày sinh bắt đầu bằng `${day}/` hoặc `-${day}`.
  - Nếu có `month`: tìm kiếm các bản ghi có tháng sinh `${month}/` hoặc `-${month}-`.

### 2.3. Đảm Bảo Bảng Hưu Trí Xã Hội Chỉ Trả Về Người Có Nghề Nghiệp Hưu Trí
- Tệp: `QLHK/QLHK-Backend/src/controllers/policyHtxh.controller.ts`
- Trong hàm `getHtxhProfiles`:
  - Đảm bảo danh sách chỉ trả về các hồ sơ hưu trí hợp lệ.
  - Cập nhật unit test để kiểm tra điều kiện này.

---

## 3. QUALITY GATES BACKEND
1. `cd QLHK/QLHK-Backend; npx tsc --noEmit` -> 0 lỗi.
2. `cd QLHK/QLHK-Backend; npx vitest run tests/unit` -> Pass 100%.
3. Kiểm tra P0 Zero Comments trên toàn bộ file code.
