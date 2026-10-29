# Kế hoạch Thực hiện: Ẩn/Xóa Mã Thôn & Tái thiết Lập trình Năm Tính Toán Mục Chúc Thọ

- **Mã kế hoạch (`<TASK_NAME>`)**: `clean-village-code-overhaul-chuctho-calculation-year`
- **Loại tác vụ**: `Clean` (Vệ sinh UI/UX loại bỏ mã thôn thừa) & `Fix` (Tái thiết toàn diện cơ chế năm tính toán Chúc thọ)
- **Phương pháp tiếp cận**: Triển khai theo quy chuẩn `/plan`, kết hợp các nguyên lý từ `/clean` (loại bỏ trường thừa, giữ nguyên tính tương đương) và `/fix` (phân tích nguyên nhân gốc rễ, Red/Green verification, Zero-comment, Diff budget <= 200 LOC/bước).

---

## 1. Goal Description (Mục tiêu & Bối cảnh)

### A. Vấn đề 1: Mã thôn gây rối mắt và không cần thiết trong nghiệp vụ xã
- **Hiện trạng**: Hệ thống quản lý địa bàn (`ModernVillageTable.tsx`) đang hiển thị huy hiệu mã thôn (`v.short_code` như `TH1`, `TH2`, `KXL`), dòng phụ đề `Mã: ...`, và trường nhập liệu *"Mã Thôn / Ký Hiệu Viết Tắt (Tùy chọn)"* trong form tạo/sửa thôn.
- **Thực tế nghiệp vụ**: Cán bộ xã và trưởng thôn tại Đăk Hà chỉ quản lý địa bàn theo **Tên thôn / làng** (Thôn Kon Xôm Lũy, Thôn 1, Thôn Ty Tu...). Mã thôn viết tắt là trường kỹ thuật nội bộ, không có giá trị hành chính thực tế đối với người dùng, làm chật chội giao diện và gây bối rối khi nhập liệu.
- **Giải pháp Clean**:
  - Ẩn/xóa hoàn toàn các thành phần hiển thị `Mã thôn` trên bảng danh sách, danh thiếp lưới (grid card), modal thêm/sửa thôn và thanh tìm kiếm.
  - Về mặt backend/CSDL: Giữ nguyên cột `code` trong CSDL để đảm bảo toàn vẹn khóa ngoại và tự động sinh mã ngầm (`format!("THON_{}", timestamp)`) nếu người dùng không truyền lên.

### B. Vấn đề 2: Năm tính toán mục Chúc thọ bị lỗi dữ liệu và thiếu cơ chế chiếu động (Dynamic Projection)
- **Hiện trạng**:
  - Khi đổi năm tính toán từ 2026 sang 2027, hệ thống cập nhật đè (`UPDATE calculation_year`) trực tiếp vào bản ghi CSDL và ghi đè các cột mốc tuổi (`age60..age_over_100`).
  - Khi quay trở lại năm 2026 hoặc đổi năm nhanh, danh sách chúc thọ bị trống (0 bản ghi) hoặc mất mốc tuổi cũ do bị dữ liệu năm 2027 ghi đè.
  - Bộ đếm và thống kê KPI (`analytics`) lọc cứng `WHERE calculation_year = $1` thay vì tính động theo tuổi của công dân tại năm đó.
- **Giải pháp Fix (Đập đi xây lại)**:
  - **Tái thiết theo mô hình Kính lọc Thời gian Chiếu Động (Pure Dynamic Projection Lens)**:
    - Hồ sơ gốc nằm bất biến trong `qlhk.citizens` kèm ngày sinh `dob` chuẩn xác.
    - Tại bất kỳ năm tính toán $Y$ nào được chọn (2025, 2026, 2027, 2028...):
      - Tuổi của công dân tại năm $Y$ được tính động:
        $$\text{Tuổi}(Y) = \text{calculate\_exact\_age}(\text{dob}, 31/12/Y) \text{ (hoặc } Y - \text{năm\_sinh})$$
      - Điều kiện hiển thị Chúc thọ tại năm $Y$: $\text{Tuổi}(Y) \ge 60$. (Công dân chưa đủ 60 tuổi trong năm $Y$ sẽ tự động không xuất hiện).
      - Các mốc chúc thọ tròn (60, 65, 70, 75, 80, 85, 90, 95, 100, >100) được tính toán thời gian thực (in-memory projection) theo tuổi tại năm $Y$.
      - Khi chuyển đổi qua lại giữa các năm (2026 <-> 2027 <-> 2028 <-> 2030), dữ liệu **KHÔNG BAO GIỜ BỊ MẤT**, không ghi đè CSDL, hiển thị tức thì với tuổi và mốc tương ứng của năm đó.
      - Xuất file Excel (`/policies/chuctho/export?year=Y`) phản ánh chính xác tuổi và mốc chúc thọ chiếu theo năm $Y$.

---

## 2. User Review Required (Các Quyết định Cần Duyệt)

> [!IMPORTANT]
> **Giữ nguyên cột CSDL `villages.code` làm trường định danh ngầm:**
> Để tuyệt đối không gây lỗi schema hoặc phá vỡ các bảng liên kết `household_code` (`HK-...`), ta không chạy lệnh `ALTER TABLE DROP COLUMN code` ở Postgres. Thay vào đó, ta **loại bỏ hoàn toàn affordance ở giao diện Client (Zero-UI for Village Code)**. Backend tự sinh mã ngầm nếu vắng mặt.

> [!NOTE]
> **Cơ chế Đã nhận quà (`received`) khi chiếu động đa năm:**
> Khi xem danh sách năm hiện tại (2026), trạng thái `received` phản ánh việc trao quà năm 2026. Khi chuyển sang xem dự báo năm tương lai (2027, 2028), hệ thống cho phép cán bộ đối soát trước danh sách các cụ sẽ đến mốc tròn để lập dự toán ngân sách quà tặng.

---

## 3. Proposed Changes (Chi tiết Các Thay đổi Dự kiến)

### Nhóm 1: Loại bỏ / Ẩn Mã Thôn (UI & Client Clean)

#### [MODIFY] `QLHK-Client/src/features/qlhk/components/villages/ModernVillageTable.tsx`
- **Table View**: Xóa thẻ badge `{v.short_code}` bên cạnh tên thôn (dòng 722-726). Tên thôn được trình bày nổi bật, thoáng đãng.
- **Grid Card View**: Xóa text `Mã: ${v.short_code}` (dòng 875), chỉ giữ lại mô tả hành chính thân thiện `"Địa bàn Xã Đăk Hà • Bấm để xem thống kê"`.
- **Create / Edit Modal**: Xóa khối nhập liệu `<div><label>Mã Thôn / Ký Hiệu Viết Tắt (Tùy chọn)</label><input value={formCode} ... /></div>` (dòng 1029-1040). Cán bộ chỉ cần nhập duy nhất tên thôn/làng.
- **Search Bar**: Đổi placeholder từ `"Tìm tên thôn, mã thôn, tên cán bộ phụ trách..."` thành `"Tìm tên thôn, tên cán bộ phụ trách..."`.
- **Export Excel**: Bỏ cột `"Mã Thôn"` khỏi dữ liệu xuất danh mục thôn làng.

#### [MODIFY] `QLHK-Client/src/features/qlhk/pages/VillagesPage.tsx`
- Cập nhật hàm gọi `handleCreateVillage(name)` và `handleUpdateVillage(id, name)` không bắt buộc truyền `code`.

#### [MODIFY] `QLHK-Client/src/components/audit/AuditLogView.tsx`
- Đổi nhãn giải mã trường audit `village_id: "Mã thôn"` thành `village_id: "Thôn / Làng"`.

#### [MODIFY] `QLHK-Backend-Rust/src/handlers/villages.rs`
- Trong `create_village`: Đảm bảo khi payload không có `code` hoặc `code` rỗng, backend tự động sinh mã slug từ tên thôn hoặc mã duy nhất `THON_<timestamp>`, đảm bảo không bao giờ bị lỗi `400 Bad Request`.
- Trong `update_village`: Nếu `payload.code` rỗng/None, giữ nguyên mã hiện tại của thôn.

---

### Nhóm 2: Đập Đi Xây Lại Năm Tính Toán Mục Chúc Thọ (Chúc Thọ Calculation Year Overhaul)

#### [MODIFY] `QLHK-Backend-Rust/src/handlers/policies.rs`
- **Tái cấu trúc `get_chuctho_profiles`**:
  - Xác định năm đích: `target_year = params.year.or(params.calculation_year).unwrap_or(current_year)`.
  - Mốc ngày tham chiếu chuẩn: `ref_date = 31/12/target_year`.
  - Không truy vấn lọc cứng theo cột `p.calculation_year = $target_year` trong SQL.
  - Tự động đồng bộ các công dân đủ >= 60 tuổi trong năm $Y$ từ bảng nhân khẩu `citizens` nếu chưa có trong danh sách.
  - Lọc động theo tuổi: Chỉ đưa vào kết quả các công dân có `Age(Y) >= 60`.
  - Tính toán động toàn bộ các cờ mốc `age60..age_over_100` và trường `age` trả về cho Client.
  - Khi người dùng lọc theo mốc cụ thể (`milestone = "age70"` hoặc `age_group = "70"`): Áp dụng bộ lọc chiếu động trên mốc của năm $Y$ trước khi phân trang.
- **Tái cấu trúc `get_policy_analytics`**:
  - Tính toán tổng số lượng người cao tuổi >= 60 và cơ cấu theo từng mốc chúc thọ dựa trên tuổi tính động theo `target_year`.
- **Tái cấu trúc `recalculate_policies`**:
  - Không chạy lệnh UPDATE xóa đè các mốc tuổi của năm cũ. Thực hiện đồng bộ bổ sung (additive sync) các công dân mới bước sang tuổi 60+ của năm được chọn.

#### [MODIFY] `QLHK-Backend-Rust/src/handlers/excel.rs`
- Trong `export_chuctho`:
  - Tiếp nhận `target_year = query.year.or(query.calculation_year).unwrap_or(current_year)`.
  - Tính tuổi và mốc tròn chiếu theo `target_year`.
  - Ghi tiêu đề biểu mẫu: `"DANH SÁCH CHÚC THỌ NGƯỜI CAO TUỔI NĂM " + target_year`.
  - Điền các cột mốc tuổi (`60, 65, 70, 75, 80, 85, 90, 95, 100, >100`) chính xác theo năm tính toán đã chọn.

#### [MODIFY] `QLHK-Client/src/hooks/useProfiles.ts`
- Cô lập cache theo `yearTag`: Khi `globalCalculationYear` thay đổi, tự động nạp dữ liệu mới theo năm tương ứng mà không bị ảnh hưởng bởi cache cũ.
- Khi người dùng chọn lại năm cũ (ví dụ 2027 -> 2026), nạp ngay dữ liệu chiếu động của năm 2026 mà không bao giờ bị trả về 0 bản ghi.

#### [MODIFY] `QLHK-Client/src/features/qlcs/components/dashboard/ProfileRow.tsx`
- Căn chỉnh thuật toán hiển thị huy hiệu mốc chúc thọ:
  - Nếu công dân đến năm tính toán đúng tuổi mốc tròn (60, 65, 70, 75, 80, 85, 90, 95, 100, >100): Hiển thị huy hiệu nổi bật `"Tròn X tuổi"` (màu ngọc bích / emerald).
  - Nếu là các tuổi lẻ trung gian (ví dụ 72 tuổi): Hiển thị `"72 tuổi (Mốc 70)"` thể hiện thuộc nhóm mốc 70 tuổi.

#### [MODIFY] `QLHK-Client/src/features/qlcs/components/dashboard/ProfileFilterBar.tsx` & `DashboardPage.tsx`
- Trình bày trực quan bộ chọn năm (`YearSelector`) kèm chỉ báo trạng thái: Khi đang chọn năm khác năm hiện tại (ví dụ xem trước năm 2027), hiển thị chấm trạng thái và dải thông báo nhẹ: *"Đang xem dự phóng Chúc thọ năm 2027"*.

---

## 4. Kế hoạch Phân bổ Các Bước Atomic (Diff Budget <= 200 Gross LOC / Bước)

| Bước | Mục tiêu & File trọng tâm | Diff dự kiến | Kiểm chứng (Verification) |
| :--- | :--- | :--- | :--- |
| **Bước 1** | **Clean UI Mã Thôn**: Loại bỏ badge, phụ đề, ô nhập mã thôn trong `ModernVillageTable.tsx`, cập nhật `VillagesPage.tsx` và `AuditLogView.tsx`. | ~110 LOC | `npx vitest run src/api/__tests__/villageApi.test.ts` & `npx tsc --noEmit` |
| **Bước 2** | **Backend Village Code Safeguard**: Cập nhật `villages.rs` tự động sinh mã khi tạo mới nếu vắng mặt, không bắt buộc truyền `code`. | ~65 LOC | `cargo check --manifest-path QLHK/QLHK-Backend-Rust/Cargo.toml` |
| **Bước 3** | **Backend Dynamic Chúc Thọ Projection**: Viết lại `get_chuctho_profiles` và `get_policy_analytics` trong `policies.rs` theo cơ chế chiếu động in-memory dựa trên `dob` và `target_year`. | ~160 LOC | `cargo check --manifest-path QLHK/QLHK-Backend-Rust/Cargo.toml` |
| **Bước 4** | **Backend Excel Export Dynamic Projection**: Cập nhật `export_chuctho` trong `excel.rs` tính tuổi và mốc chúc thọ theo năm xuất file. | ~80 LOC | `cargo check --manifest-path QLHK/QLHK-Backend-Rust/Cargo.toml` |
| **Bước 5** | **Frontend Client Cache & Year Navigation**: Nâng cấp `useProfiles.ts`, `DashboardPage.tsx` và `ProfileFilterBar.tsx` cho phép chuyển đổi năm tức thì, không bị kẹt cache rỗng. | ~120 LOC | `npx vitest run src/pages/__tests__/ChucThoPage.test.tsx` & `npx tsc --noEmit` |
| **Bước 6** | **Unit & Regression Tests**: Viết test kiểm tra chuyển đổi năm 2026 <-> 2027 <-> 2028 giữ nguyên danh sách, kiểm tra ẩn mã thôn trong UI. | ~130 LOC | `npx vitest run src/features/qlcs/components/dashboard/__tests__/ProfileRow.test.tsx` |
| **Bước 7** | **Final Quality Gate**: Kiểm tra toàn bộ test suite (221+ tests), toàn bộ typecheck TypeScript và biên dịch Rust. | ~10 LOC | Full Test Suite + Typecheck + Cargo Check |

---

## 5. Verification Plan (Kế hoạch Kiểm chứng Chất lượng)

### A. Kiểm tra Tự động (Automated Tests)
1. **Frontend TypeCheck & Tests**:
   ```bash
   cd QLHK/QLHK-Client
   npx tsc --noEmit
   npx vitest run src/features/qlcs/components/dashboard/__tests__/ProfileRow.test.tsx src/api/__tests__/villageApi.test.ts src/pages/__tests__/ChucThoPage.test.tsx
   ```
2. **Backend Rust TypeCheck**:
   ```bash
   cargo check --manifest-path QLHK/QLHK-Backend-Rust/Cargo.toml
   ```
3. **Full Suite Regression**:
   ```bash
   cd QLHK/QLHK-Client && npx vitest run
   ```

### B. Kiểm tra Thủ công (Manual Verification Scenarios)
1. **Kiểm tra Ẩn Mã Thôn**:
   - Mở màn hình *Quản lý Địa bàn Thôn & Làng*.
   - Quan sát danh sách bảng: Cột Tên thôn chỉ hiển thị tên (không còn badge `TH1`, `TH2`).
   - Quan sát thẻ lưới: Chỉ còn thông tin tên và số liệu thống kê hộ/khẩu, không còn phụ đề `Mã: ...`.
   - Bấm nút *Cập nhật* một thôn: Modal sửa chỉ có ô *Tên Thôn / Làng \**, không còn ô nhập mã thôn. Lưu lại thành công.
2. **Kiểm tra Năm Tính Toán Chúc Thọ**:
   - Mở mục *Chính sách Chúc thọ*: Đang ở Năm 2026, ghi nhận số lượng cụ và mốc tuổi.
   - Chuyển sang Năm 2027: Danh sách lập tức cập nhật tuổi các cụ tăng thêm 1 tuổi; cụ nào bước vào mốc tròn (60, 65, 70, 75...) lập tức được gắn huy hiệu mốc tròn tương ứng. Không có cụ nào bị biến mất.
   - Chuyển quay lại Năm 2026: Dữ liệu năm 2026 hiển thị nguyên vẹn đầy đủ, không bị rỗng 0 bản ghi.
   - Bấm *Xuất Excel*: Tệp Excel tải về thể hiện đúng năm tính toán đã chọn kèm tuổi và cột mốc chính xác.
