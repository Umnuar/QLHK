# BÁO CÁO THẨM TRA GIAO DIỆN & TRẢI NGHIỆM NGƯỜI DÙNG (UI/UX AUDIT REPORT)
**Dự án:** Hệ thống Quản lý Hộ khẩu & Nhân khẩu Xã Đăk Hà (QLHK)  
**Phân hệ thẩm tra:** QLHK-Client (React 18 + Vite 5 + TailwindCSS v4 + Electron 42)  
**Phân vai kiểm toán:** AGENT 4 — UI/UX & Accessibility Auditor (Master Engineering System)  
**Thời điểm thực hiện:** 2026-10-01  
**Tiêu chuẩn đối sánh:** QLHK/QLNN/QLCS Design System Tokens, Chromium Desktop Table Spec, Usability Engineering ISO 9241-11, Section 31 Forensic Verification  

---

## 1. TỔNG QUAN ĐÁNH GIÁ (EXECUTIVE SUMMARY)

Báo cáo kiểm toán độc lập UI/UX toàn diện trên toàn bộ phân hệ người dùng `QLHK-Client`. Cuộc khảo sát tập trung thẩm tra trải nghiệm thực tế công sở cấp xã: tính tiện dụng hành chính công, mật độ thông tin bảng biểu quy mô lớn (lên tới 23.000+ bản ghi), tính đồng bộ hệ thống thiết kế (Design Tokens), các trạng thái phản hồi tương tác (Interactive States), và năng lực phòng chống mất mát dữ liệu do sai sót thao tác (Error Prevention).

### 1.1. Bảng Điểm Đánh Giá UI/UX Toàn Hệ Thống

| Màn hình / Thành phần | Design Tokens | Trạng thái Tương tác | Phòng chống Mất Dữ Liệu | Tiện Dụng Công Sở | Điểm Tổng | Xếp Loại & Trạng Thái |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **1. VillagesPage.tsx** | 9/10 | 6/10 (Thiếu Skeleton & Empty) | 7/10 (Thiếu anti-double click form) | 8/10 | **7.5 / 10** | Cần nâng cấp Skeleton & Thẻ Thôn |
| **2. HouseholdsPage.tsx** | 9/10 | 8/10 (Có Offline Cache badge) | 7/10 (Batch delete an toàn) | 9/10 | **8.3 / 10** | Khá tốt |
| **3. HouseholdFilterBar.tsx** | 8/10 | 8/10 (Island bar tinh gọn) | 8/10 | 7/10 (Tràn dòng trên 1366x768) | **7.8 / 10** | Cần tối ưu responsive breakpoint |
| **4. HouseholdTable.tsx** | 9/10 | 8/10 (Accordion + Sticky tốt) | 8/10 (CCCD Masking an toàn) | 8/10 (Rủi ro lag khi mở 20 dòng) | **8.3 / 10** | Rất tốt |
| **5. HouseholdDrawer.tsx** | 9/10 | 7/10 (Có loading spinner) | **3/10 (P0: Esc/backdrop mất trắng form)** | 7/10 (Thiếu scroll lock) | **6.5 / 10** | 🔴 **CẦN SỬA GẤP P0 DIRTY CHECK** |
| **6. CitizenModal.tsx** | 9/10 | 7/10 (Validate DOB/CCCD tốt) | 4/10 (Mất form khi Esc) | 7/10 (Chỉ có lỗi banner tổng) | **6.8 / 10** | Cần inline validation & Dirty check |
| **7. AnalyticsPage.tsx** | 9/10 | 6/10 (Nuốt lỗi API, thiếu Empty) | 8/10 | 9/10 (MiniDonut/Progress bar tốt) | **8.0 / 10** | Tốt, cần Error Banner |
| **8. ExcelPage & Modals** | 9/10 | 8/10 (11 cột đối soát trực quan) | 8/10 (Kiểm tra lỗi ngày sinh tốt) | 7/10 (Thiếu Esc đóng modal) | **8.0 / 10** | Khá tốt |
| **9. RecycleBinPage.tsx** | 9/10 | 8/10 (Có Loading & Empty) | 7/10 (Thiếu disabled khi batch) | 8/10 | **8.0 / 10** | Khá tốt |
| **10. SettingsPage.tsx** | 8/10 | 7/10 (Có spinner đổi pass) | 8/10 (Bảo vệ tài khoản admin) | 7/10 (Trùng lặp code Profile/TimeCard) | **7.5 / 10** | Cần dọn rác component |
| **ĐÁNH GIÁ CHUNG TOÀN HỆ THỐNG** | **8.8 / 10** | **7.3 / 10** | **6.8 / 10** | **7.7 / 10** | **7.68 / 10** | **KHÁ — CẦN KHẮC PHỤC 1 BUG P0 & 6 BUG P1** |

---

## 2. THẨM TRA CHI TIẾT TỪNG MÀN HÌNH VÀ COMPONENT (SCREEN-BY-SCREEN AUDIT)

### 2.1. Màn hình Quản Lý Thôn & Địa Bàn (`src/pages/VillagesPage.tsx`)
- **Vai trò hành chính**: Cán bộ Quản trị Xã (`admin`) giám sát tổng quan 7 thôn, điều hướng nhanh đến dữ liệu chi tiết của từng thôn hoặc báo cáo thống kê toàn xã.
- **Phân tích Design Tokens & Trình bày**:
  - Banner Tổng quan: Gradient ngọc đậm `from-emerald-800 via-emerald-700 to-emerald-900 text-white rounded-3xl p-6 shadow-xl` thể hiện sự trang trọng, uy nghiêm của cơ quan chính quyền xã.
  - Cụm 4 Thẻ KPI: Khối viền `rounded-3xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-sm`. Thống kê phân chia rõ ràng: Số Thôn, Tổng Hộ, Tổng Nhân Khẩu, Tỷ Lệ DTTS (màu tím `text-purple-600` làm nổi bật chỉ tiêu đặc thù Tây Nguyên).
  - Lưới thẻ thôn: Đã tích hợp avatar nhận diện, tên thôn, tên trưởng thôn phụ trách, số lượng hộ dân và nhân khẩu.
- **Khiếm khuyết UX phát hiện**:
  1. *[UI-01] (P1 - High)*: **Thiếu Skeleton Loading tại Banner và Thẻ KPI**.
     - *Vị trí*: [VillagesPage.tsx:53-126](file:///c:/Projects/QLHK/QLHK-Client/src/pages/VillagesPage.tsx#L53-L126), [VillagesPage.tsx:274-290](file:///c:/Projects/QLHK/QLHK-Client/src/pages/VillagesPage.tsx#L274-L290).
     - *Hiện trạng*: Trong khi `fetchVillageStats` đang chạy bất đồng bộ, state `overview` là `null`. Toàn bộ số liệu hiển thị: `0 hộ gia đình • 0 nhân khẩu • Bình quân: 0 người/hộ`, KPI hiển thị `0 Thôn`, `0 Hộ`, `0 Người`, `0.0% DTTS`. Khi API hoặc cache trả về, các con số bất ngờ giật nảy (layout shift & content flash), gây ấn tượng phần mềm chập chờn.
     - *Giải pháp*: Khai báo state `loadingStats: boolean` và render 4 thẻ Skeleton xung nhịp `animate-pulse` khi `loadingStats = true && !overview`.
  2. *[UI-02] (P2 - Medium)*: **Trắng trang hoàn toàn khi tìm kiếm thôn không khớp (Thiếu Empty State)**.
     - *Vị trí*: [VillagesPage.tsx:526-679](file:///c:/Projects/QLHK/QLHK-Client/src/pages/VillagesPage.tsx#L526-L679).
     - *Hiện trạng*: Mảng `filteredVillages` lọc theo `searchTerm`. Khi cán bộ nhập từ khóa không tồn tại (ví dụ: "Thôn 99"), giao diện chỉ để lại một khoảng trắng hoang vu không thông điệp.
     - *Giải pháp*: Bổ sung khối EmptyState: Icon `MapPinOff`, tiêu đề `"Không tìm thấy thôn phù hợp"`, mô tả `"Không có thôn nào khớp với từ khóa '${searchTerm}'"`, kèm nút `"Xóa tìm kiếm"`.
  3. *[UI-03] (P1 - High)*: **Thẻ thôn dùng thẻ `<div onClick>` phi ngữ nghĩa, xung đột nút bấm lồng nhau**.
     - *Vị trí*: [VillagesPage.tsx:598-641](file:///c:/Projects/QLHK/QLHK-Client/src/pages/VillagesPage.tsx#L598-L641).
     - *Hiện trạng*: Thẻ thôn là thẻ `<div>` gắn sự kiện `onClick={() => handleVillageClick(village.id)}`. Bên trong thẻ này lại chứa 2 thẻ `<button>` Sửa (`Edit3`) và Xóa (`Trash2`). Dù đã có `e.stopPropagation()`, việc lồng các interactive element vào nhau gây nhiễu cho trợ năng và công cụ kiểm thử tự động.
  4. *[UI-04] (P2 - Medium)*: **Form Thêm Thôn Mới thiếu cơ chế khóa chống bấm nhanh liên tục**.
     - *Vị trí*: [VillagesPage.tsx:248-272](file:///c:/Projects/QLHK/QLHK-Client/src/pages/VillagesPage.tsx#L248-L272), [VillagesPage.tsx:516-520](file:///c:/Projects/QLHK/QLHK-Client/src/pages/VillagesPage.tsx#L516-L520).
     - *Hiện trạng*: Hàm `handleCreate` không có state `isSubmitting`. Nút `"Lưu Thôn Mới"` không bị disabled trong lúc `villageApi.create` đang chạy. Nếu cán bộ nhấn chuột đúp, hệ thống sẽ gửi 2 request tạo thôn trùng lặp.

---

### 2.2. Màn hình Quản Lý Hộ Gia Đình & Nhân Khẩu (`HouseholdsPage.tsx`)
- **Vai trò hành chính**: Không gian làm việc cốt lõi của cán bộ cơ sở và công an xã. Quản lý toàn bộ danh sách hộ khẩu, nhân khẩu thường trú/tạm trú, lọc đa tiêu chí, xuất/nhập Excel.
- **Thanh công cụ lọc Island Bar (`HouseholdFilterBar.tsx`)**:
  - *Điểm sáng*: Thiết kế dạng đảo nổi bo góc `rounded-2xl`, tích hợp ô search có nút Xóa nhanh (`X`) và nút Làm mới (`RefreshCw`). Tích hợp `YearSelector` tối giản và `AgeFilterPopover` 8 mốc tuổi công vụ.
  - *[UI-05] (P2 - Medium) - Rớt dòng vỡ layout trên màn hình 1366x768 DPI 125%*:
    - *Vị trí*: [HouseholdFilterBar.tsx:93-206](file:///c:/Projects/QLHK/QLHK-Client/src/components/households/HouseholdFilterBar.tsx#L93-L206).
    - *Hiện trạng*: Tổng độ rộng tối thiểu của các thành phần con: Ô search `sm:w-80` (320px) + YearSelector (100px) + AgeFilter (110px) + 3 CustomSelect (128px + 144px + 128px) + Nút Xóa lọc (90px) = **1020px**. Khi hiển thị trên màn hình laptop công sở phổ thông (1366x768 đặt phóng to 125% = viewport rộng khoảng 1092px) kèm Sidebar cố định 256px, không gian khả dụng chỉ còn **836px**. Thanh FilterBar bị gãy làm 2 hoặc 3 hàng lộn xộn, đẩy bảng dữ liệu xuống sâu.
    - *Giải pháp*: Sử dụng flex-wrap có kiểm soát, giảm ô search xuống `w-48 sm:w-64`, thu gọn padding của CustomSelect và ẩn bớt chữ "Tất cả" thành placeholder ngắn trên màn hình nhỏ.
  - *[UI-06] (P2 - Medium) - Nút Trigger Lọc Độ Tuổi biến thành `<div>` khi kích hoạt*:
    - *Vị trí*: [AgeFilterPopover.tsx:141-165](file:///c:/Projects/QLHK/QLHK-Client/src/components/households/AgeFilterPopover.tsx#L141-L165).
    - *Hiện trạng*: Khi chưa chọn lọc, trigger là `<button type="button">`. Nhưng khi đã có lọc (ví dụ: `18 - 60 tuổi`), component chuyển sang render thẻ `<div onClick={() => setIsOpen(!isOpen)}>` bao bọc nút `Xóa lọc`. Thẻ `div` này mất khả năng nhận tiêu điểm bàn phím.
    - *Giải pháp*: Luôn duy trì thẻ `<button type="button">` làm vỏ bọc trigger, tách nút Xóa ra ngoài hoặc xử lý riêng biệt.

- **Bảng Danh Sách Hộ Gia Đình & Nhân Khẩu (`HouseholdTable.tsx`)**:
  - *Điểm sáng*:
    - Sử dụng `border-collapse`, cấu trúc cột rõ ràng, bo góc container `rounded-3xl`.
    - Cột STT (`sticky left-0`) và Cột Thao tác (`sticky right-0`) ghim mượt mà kèm bóng đổ `shadow-[4px_0_15px_-3px_rgba(0,0,0,0.05)]`.
    - Nền của các ô sticky đã được xử lý đồng bộ màu hover thông qua biến `stickyBgClass` (dòng 236-240), khắc phục triệt để lỗi đứt gãy nền thường gặp trên Chromium.
    - Font chữ họ tên in đậm, font số liệu (`STT`, `CCCD`, `Ngày sinh`, `Tuổi`) áp dụng chuẩn `font-mono tabular-nums`.
    - Bảo mật CCCD: Mặc định hiển thị `••••••••1234`, click vào icon con mắt để giải mã xem đủ 12 số.
  - *[UI-07] (P2 - Medium) - Nguy cơ suy giảm FPS khi bung mở nhiều Accordion*:
    - *Vị trí*: [HouseholdTable.tsx:362-678](file:///c:/Projects/QLHK/QLHK-Client/src/components/households/HouseholdTable.tsx#L362-L678).
    - *Hiện trạng*: Mỗi hàng accordion khi bung mở sẽ chèn một sub-table độc lập với 11 cột. Nếu người dùng bung mở liên tiếp 10-20 hộ gia đình, DOM sẽ tăng thêm 50-100 hàng kèm hàng trăm icon SVG và nút bấm, gây khựng nhẹ khi cuộn trang trên máy tính cấu hình yếu (Core i3 văn phòng).
    - *Giải pháp*: Thêm tùy chọn "Chỉ mở 1 hộ tại một thời điểm" (Accordion đơn) hoặc ảo hóa hiển thị.

---

### 2.3. Quy Trình Nhập Liệu Hộ & Nhân Khẩu (`HouseholdDrawer.tsx` & `CitizenModal.tsx`)

Đây là khu vực phát hiện **lỗ hổng trải nghiệm nghiêm trọng nhất của toàn bộ hệ thống (P0 Critical)**:

```
[LUỒNG TƯƠNG TÁC GÂY NGUY CƠ MẤT DỮ LIỆU CẤP ĐỘ P0]

  [Cán bộ mở Drawer Thêm Hộ]
             │
             ▼
  [Nhập Địa chỉ, Thôn, Ghi chú]
             │
             ▼
  [Mở Sub-modal Thêm 4 Nhân khẩu] ─── (Mất 10-15 phút kê khai công phu)
             │
             ▼
  [Vô tình chạm tay vào phím ESC hoặc Click trượt chuột ra Backdrop ngoài]
             │
             ▼
  💥 TOÀN BỘ DRAWER ĐÓNG NGAY LẬP TỨC ── KHÔNG CÓ CẢNH BÁO ── MẤT TRẮNG DỮ LIỆU!
```

- **[UI-08] (P0 - CRITICAL BUG) — Đóng mất trắng biểu mẫu do thiếu Dirty Form Confirmation**:
  - *Vị trí chính xác*: [HouseholdDrawer.tsx:96-103](file:///c:/Projects/QLHK/QLHK-Client/src/components/households/HouseholdDrawer.tsx#L96-L103) và [HouseholdDrawer.tsx:259-263](file:///c:/Projects/QLHK/QLHK-Client/src/components/households/HouseholdDrawer.tsx#L259-L263).
  - *Mã nguồn hiện tại*:
    ```tsx
    // Dòng 96-103 HouseholdDrawer.tsx:
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isOpen && !isCitizenModalOpen) {
                onClose(); // ĐÓNG NGAY LẬP TỨC!
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, isCitizenModalOpen, onClose]);

    // Dòng 259-263 HouseholdDrawer.tsx:
    onClick={(e) => {
        if (e.target === e.currentTarget && !isCitizenModalOpen) {
            onClose(); // CLICK BACKDROP ĐÓNG NGAY LẬP TỨC!
        }
    }}
    ```
  - *Bằng chứng tác động (Blast Radius)*: Trong môi trường hành chính, cán bộ nhập hộ khẩu phải vừa hỏi công dân vừa gõ máy. Quá trình nhập một hộ gồm 4-6 người mất từ 10 đến 20 phút. Nếu vô tình bấm phím Escape (thói quen hủy ô gõ) hoặc rê chuột click trượt ra ngoài vùng modal, Drawer lập tức biến mất, toàn bộ danh sách thành viên vừa thêm trong state `members` bị xóa sạch không dấu vết.
  - *Giải pháp triệt để*:
    - Xây dựng cờ kiểm tra sửa đổi `isDirty = members.length > 0 || address !== "Xã Đăk Hà" || notes.trim() !== ""`.
    - Khi người dùng kích hoạt `Escape`, click backdrop hoặc bấm nút `"Hủy / Đóng"`, nếu `isDirty === true`, bắt buộc bật Modal xác nhận cảnh báo:
      > *"Bạn có dữ liệu chưa lưu. Bạn có chắc chắn muốn hủy bỏ và đóng cửa sổ này không?"* kèm 2 lựa chọn: `"Tiếp tục chỉnh sửa"` và `"Rời khỏi & Hủy bỏ"`.

- **[UI-09] (P1 - High) — Thiếu Scroll Lock trên Body khi Drawer mở**:
  - *Vị trí*: [HouseholdDrawer.tsx:254-266](file:///c:/Projects/QLHK/QLHK-Client/src/components/households/HouseholdDrawer.tsx#L254-L266).
  - *Hiện trạng*: Drawer sử dụng `createPortal(..., document.body)`. Tuy nhiên, component không đặt `document.body.style.overflow = "hidden"`. Khi người dùng cuộn con trỏ chuột ở rìa màn hình, bảng dữ liệu ngầm bên dưới (`HouseholdsPage`) vẫn cuộn đồng thời, gây mất phương hướng và cảm giác giao diện rung lắc.
  - *Giải pháp*: Tích hợp effect khóa cuộn body khi `isOpen === true`:
    ```tsx
    useEffect(() => {
        if (isOpen) {
            const originalOverflow = document.body.style.overflow;
            document.body.style.overflow = "hidden";
            return () => { document.body.style.overflow = originalOverflow; };
        }
    }, [isOpen]);
    ```

- **[UI-10] (P2 - Medium) — Thông báo lỗi xác thực của `CitizenModal.tsx` chỉ gom cục bộ trên Banner tổng**:
  - *Vị trí*: [CitizenModal.tsx:236-241](file:///c:/Projects/QLHK/QLHK-Client/src/components/households/CitizenModal.tsx#L236-L241).
  - *Hiện trạng*: Khi kiểm tra ngày sinh sai định dạng hoặc số CCCD không đủ 12 số, component chỉ set `error` và hiển thị một khối Alert nhỏ ở trên cùng của modal. Các ô input bên dưới không đổi viền đỏ và không có dòng lỗi hướng dẫn ngay bên dưới ô nhập (Missing inline field validation error). Người dùng phải cuộn lên trên để đọc thông báo rồi cuộn xuống tìm ô sai.
  - *Giải pháp*: Bổ sung state `fieldErrors: Record<string, string>` và truyền prop `error={fieldErrors.dob}` trực tiếp vào từng ô nhập liệu.

---

### 2.4. Màn hình Báo Cáo Phân Tích Dân Cư & Dân Tộc (`AnalyticsDashboard.tsx`)
- **Vai trò**: Phân tích cơ cấu dân số, tháp tuổi, 14 dân tộc, tỷ lệ giới tính và bảng đối soát quy mô dân cư giữa 7 thôn phục vụ báo cáo lãnh đạo Huyện/Tỉnh.
- **Điểm sáng**:
  - Tối giản hóa tối đa theo chuẩn Ponytail: Không dùng thư viện Chart.js hay Recharts nặng nề (tiết kiệm hơn 300KB bundle size). Sử dụng `MiniDonut` dựng bằng thẻ SVG thuần và `ProgressBar` bằng TailwindCSS.
  - Số liệu được định dạng chuẩn Việt Nam (`toLocaleString("vi-VN")`, font mono tabular).
  - Có hàng `TỔNG CỘNG TOÀN XÃ` ở chân bảng đối soát (`tfoot`), số liệu tính toán chính xác.
- **Khiếm khuyết UX phát hiện**:
  1. *[UI-11] (P2 - Medium)*: **Nuốt lỗi API trong khối try-catch và thiếu Error Banner hiển thị**:
     - *Vị trí*: [AnalyticsDashboard.tsx:290-313](file:///c:/Projects/QLHK/QLHK-Client/src/components/analytics/AnalyticsDashboard.tsx#L290-L313).
     - *Hiện trạng*: Khi gọi API `analyticsApi.getOverview` thất bại và Offline Cache chưa có dữ liệu, khối `catch` chỉ ghi `console.warn` và ngầm tính toán từ context `activeHouseholds`. Nếu context cũng rỗng, toàn bộ màn hình hiển thị 0 mà không có bất kỳ thông báo lỗi hoặc nút "Thử kết nối lại" nào cho cán bộ biết hệ thống đang mất liên lạc với máy chủ.
  2. *[UI-12] (P3 - Low)*: **Dùng hàm `alert()` nguyên thủy của trình duyệt khi xuất file Excel lỗi**:
     - *Vị trí*: [AnalyticsDashboard.tsx:476](file:///c:/Projects/QLHK/QLHK-Client/src/components/analytics/AnalyticsDashboard.tsx#L476).
     - *Hiện trạng*: Gọi `alert("Không thể xuất file Excel thống kê.")`. Hàm native `alert()` này chặn UI thread của Electron, giao diện thô kệch và không đồng bộ với thiết kế `useModal()`.

---

### 2.5. Phân Hệ Xử Lý Excel (`ExcelPage.tsx`, `ImportPreviewModal.tsx`, `ExportSettingsModal.tsx`)
- **Vai trò**: Điểm giao dịch dữ liệu quan trọng nhất. Cho phép nhập file mẫu `Nhân hộ khẩu.xls` (11 cột) thực tế của xã Đăk Hà và xuất báo cáo đối soát.
- **Điểm sáng vượt trội**:
  - `ImportPreviewModal.tsx`:
    - Tự động bắt lỗi ngày sinh tinh chuẩn: phân biệt năm sinh 3 chữ số, tháng sinh vượt quá 12 (ví dụ tháng 17 do gõ nhầm), ngày không hợp lệ.
    - Dòng có lỗi được bọc nền hồng nhạt `bg-rose-50/90 text-rose-900` và gắn badge cảnh báo cụ thể.
    - Cột STT, Hộ Gia Đình, Họ Tên được ghim `sticky` chuẩn chỉ, giúp việc đối soát bảng dài 11 cột rất thuận tiện.
- **Khiếm khuyết UX phát hiện**:
  1. *[UI-13] (P1 - High)*: **`ImportPreviewModal` và `ExportSettingsModal` không đóng được bằng phím Escape**:
     - *Vị trí*: [ImportPreviewModal.tsx:112](file:///c:/Projects/QLHK/QLHK-Client/src/components/excel/ImportPreviewModal.tsx#L112), [ExportSettingsModal.tsx:27](file:///c:/Projects/QLHK/QLHK-Client/src/components/excel/ExportSettingsModal.tsx#L27).
     - *Hiện trạng*: Cả 2 modal đều hoàn toàn không lắng nghe sự kiện phím `Escape`. Cán bộ bấm Escape liên tục nhưng cửa sổ không phản hồi, bắt buộc phải dùng chuột tìm đúng nút "Hủy Bỏ" hoặc icon "X" ở góc trên.
  2. *[UI-14] (P2 - Medium)*: **Nút "Chọn Tệp Excel" trong vùng kéo thả bị lồng click handler**:
     - *Vị trí*: [ExcelPage.tsx:346-384](file:///c:/Projects/QLHK/QLHK-Client/src/pages/ExcelPage.tsx#L346-L384).
     - *Hiện trạng*: Toàn bộ thẻ `div` lớn của dropzone đã có `onClick={handleSelectFile}`. Bên trong thẻ lại có một thẻ `<button>` mang nhãn `"Mở Hộp Thoại Chọn Tệp Windows"`. Khi người dùng click vào button này, sự kiện nổi bọt kích hoạt 2 lần mở dialog chọn tệp trên một số phiên bản Electron.

---

### 2.6. Màn hình Thùng Rác & Khôi Phục (`RecycleBinPage.tsx` & `RecycleBinTable.tsx`)
- **Vai trò**: Quản lý các hộ gia đình bị xóa mềm (Soft Delete), cho phép phục hồi nguyên vẹn thành viên hoặc xóa vĩnh viễn (Hard Delete).
- **Điểm sáng**:
  - Banner tím đỏ trang trọng nêu rõ số lượng hộ đang lưu trữ tạm.
  - Bảng dữ liệu có hiển thị rõ cột "Thời Điểm Xóa" định dạng tiếng Việt.
  - Có đầy đủ trạng thái Loading spinner và Empty State ("Thùng rác hiện đang trống").
- **Khiếm khuyết UX phát hiện**:
  1. *[UI-15] (P1 - High)*: **Thiếu cơ chế vô hiệu hóa nút bấm khi thực hiện thao tác hàng loạt**:
     - *Vị trí*: [RecycleBinPage.tsx:77-115](file:///c:/Projects/QLHK/QLHK-Client/src/pages/RecycleBinPage.tsx#L77-L115), [RecycleBinPage.tsx:152-169](file:///c:/Projects/QLHK/QLHK-Client/src/pages/RecycleBinPage.tsx#L152-L169).
     - *Hiện trạng*: Nút `"Khôi Phục (X)"` và `"Xóa Vĩnh Viễn (X)"` không kiểm tra trạng thái đang xử lý. Khi cán bộ click liên tục nhiều lần, lệnh modal xác nhận bị kích hoạt chồng chéo.
  2. *[UI-16] (P2 - Medium)*: **Hộp thoại xác nhận Xóa vĩnh viễn thiếu cơ chế bảo vệ cấp 2 (Two-Step Safety Gate)**:
     - *Vị trí*: [RecycleBinPage.tsx:97-115](file:///c:/Projects/QLHK/QLHK-Client/src/pages/RecycleBinPage.tsx#L97-L115).
     - *Hiện trạng*: Thao tác xóa vĩnh viễn là hành động không thể hoàn tác (Hard Delete mất dữ liệu vật lý theo Quy tắc 1.2 P0). Tuy nhiên, modal chỉ có nút bấm xác nhận đơn thuần. Khuyến nghị áp dụng cơ chế xác nhận nghiêm ngặt: yêu cầu người dùng gõ từ `"XOA"` hoặc tích chọn checkbox cam kết trước khi nút "Xóa Vĩnh Viễn" sáng lên.

---

### 2.7. Cài Đặt Hệ Thống & Quản Trị Cán Bộ (`SettingsPage.tsx`)
- **Vai trò**: Quản trị tài khoản cá nhân, quản lý tài khoản cán bộ thôn, sao lưu/phục hồi CSDL JSON, thông tin hành chính UBND Xã.
- **Điểm sáng**:
  - Thanh tab điều hướng phân định rõ quyền `admin` (chỉ admin mới thấy tab Quản lý cán bộ và Sao lưu CSDL).
  - Có cơ chế chặn xóa tài khoản `admin` mặc định và chặn tự xóa tài khoản đang đăng nhập hiện tại.
- **Khiếm khuyết UX phát hiện**:
  1. *[UI-17] (P2 - Medium)*: **Mã nguồn rác tồn đọng không được sử dụng tại `src/pages/Settings/`**:
     - *Vị trí*: [src/pages/Settings/ProfileCard.tsx](file:///c:/Projects/QLHK/QLHK-Client/src/pages/Settings/ProfileCard.tsx) (337 dòng) và [src/pages/Settings/TimeCard.tsx](file:///c:/Projects/QLHK/QLHK-Client/src/pages/Settings/TimeCard.tsx) (431 dòng).
     - *Hiện trạng*: Hai tệp này nằm trong thư mục `Settings` nhưng **hoàn toàn không được import ở bất kỳ đâu** trong toàn bộ dự án. Trong khi đó, `SettingsPage.tsx` viết liền một mạch 1227 dòng mã đơn khối (monolith) chứa toàn bộ form profile và form quản lý cán bộ. Điều này gây hiểu lầm cho các kỹ sư bảo trì và làm phình to repository.
  2. *[UI-18] (P2 - Medium)*: **Không nhất quán phiên bản phần mềm hiển thị**:
     - *Vị trí*: [package.json:4](file:///c:/Projects/QLHK/QLHK-Client/package.json#L4) ghi `"version": "1.0.0"`; [Sidebar.tsx:218](file:///c:/Projects/QLHK/QLHK-Client/src/components/layout/Sidebar.tsx#L218) ghi `"QLHK v1.0.0"`; nhưng [SettingsPage.tsx:1192](file:///c:/Projects/QLHK/QLHK-Client/src/pages/SettingsPage.tsx#L1192) lại ghi cứng `"v2.5.0 (Enterprise QLCS Edition)"`. Cần chuẩn hóa đồng bộ lấy biến `version` trực tiếp từ tệp cấu hình trung tâm.
  3. *[UI-19] (P2 - Medium)*: **Màu sắc nút Phục hồi CSDL trong `BackupRestoreTab.tsx` gây nhầm lẫn với hành động Xóa**:
     - *Vị trí*: [BackupRestoreTab.tsx:147-174](file:///c:/Projects/QLHK/QLHK-Client/src/components/settings/BackupRestoreTab.tsx#L147-L174).
     - *Hiện trạng*: Nút "Chọn Tệp Khôi Phục" và toàn bộ khối hành động sử dụng tông màu hồng/đỏ (`bg-rose-50 border-rose-100 text-rose-600`), khiến cán bộ liên tưởng đến hành động xóa dữ liệu nguy hiểm thay vì chức năng nạp phục hồi hệ thống. Cần chuyển sang tông màu Amber/Indigo mang tính nghiệp vụ khôi phục.

---

## 3. ĐÁNH GIÁ CHẤT LƯỢNG TƯƠNG TÁC (INTERACTION QUALITY MATRIX)

| Tiêu chí Kiểm định | Hiện trạng Trên QLHK-Client | Đánh giá & Rủi ro | Đề xuất Chuẩn hóa |
| :--- | :--- | :---: | :--- |
| **Chống bấm đúp (Rapid / Double Click)** | - `LoginView`: Có `disabled={loading}`.<br/>- `HouseholdDrawer`: Có `disabled={loading}`.<br/>- `VillagesPage` (Thêm thôn): **THIẾU**.<br/>- `RecycleBin` (Batch action): **THIẾU**.<br/>- `SettingsPage` (Thêm cán bộ): **THIẾU**. | 🟡 Trung bình | Bổ sung trạng thái `isSubmitting` trên 100% các nút gửi request API để tự động disable và hiển thị mini-spinner. |
| **Phòng chống mất dữ liệu form (Dirty Form Guard)** | - `HouseholdDrawer`: **HOÀN TOÀN THIẾU** (Bấm Esc hoặc click backdrop mất trắng form).<br/>- `CitizenModal`: **THIẾU**.<br/>- `SettingsPage`: Không có cảnh báo rời trang khi đang nhập dở. | 🔴 **NGHIÊM TRỌNG (P0)** | Triển khai hook `useDirtyConfirmation` cho mọi Drawer/Modal nhập liệu. Cảnh báo người dùng trước khi hủy form có dữ liệu. |
| **Thông báo lỗi xác thực (Validation Clarity)** | - Đa số form hiển thị alert banner chung ở đầu trang.<br/>- Thiếu thông báo lỗi nội dòng (inline field error) dưới từng input.<br/>- `CitizenModal`: Báo lỗi ngày sinh chung chung ở banner trên cùng. | 🟡 Trung bình | Bổ sung dòng thông báo lỗi chữ đỏ `text-xs text-rose-500 font-medium` ngay dưới ô input vi phạm. |
| **Phản hồi trạng thái (Feedback States)** | - Loading Spinner: Đã có trên các nút chính.<br/>- Skeleton Loading: **THIẾU** trên `VillagesPage` (KPI & Cards).<br/>- Empty State: **THIẾU** khi tìm kiếm thôn không ra kết quả.<br/>- Offline State: **RẤT TỐT** (Badge vàng nổi bật khi chạy dữ liệu ngoại tuyến). | 🟢 Khá | Bổ sung Skeleton cards cho các màn hình có nạp dữ liệu từ xa và bổ sung Empty State cho ô tìm kiếm thôn. |

---

## 4. TỔNG HỢP DANH MỤC KHIẾM KHUYẾT UI/UX (PRIORITIZED ACTION PLAN)

```
[BẢNG TỔNG HỢP VẤN ĐỀ UI/UX CẦN XỬ LÝ THEO THỨ TỰ ƯU TIÊN]

+------+---------------------+---------------------------------------------------------------+----------------------------------------------------------+
| Mức  | Tệp Nguồn           | Mô tả Khiếm khuyết                                            | Phương án Khắc phục Kỹ thuật                             |
+------+---------------------+---------------------------------------------------------------+----------------------------------------------------------+
| P0   | HouseholdDrawer.tsx | Bấm phím Escape hoặc click backdrop đóng drawer lập tức,      | Bổ sung state isDirty và bật Modal xác nhận trước khi    |
|      |                     | xóa sạch dữ liệu hộ và nhân khẩu người dùng vừa nhập dở.       | đóng nếu form có dữ liệu.                                |
+------+---------------------+---------------------------------------------------------------+----------------------------------------------------------+
| P1   | VillagesPage.tsx    | Thiếu Skeleton Loading cho 4 thẻ KPI và danh sách thôn,       | Khai báo loadingStats và render Skeleton pulse cards khi  |
|      |                     | gây giật nảy số liệu từ 0 sang số thật khi mở trang.         | đang nạp dữ liệu từ backend hoặc cache.                  |
+------+---------------------+---------------------------------------------------------------+----------------------------------------------------------+
| P1   | HouseholdDrawer.tsx | Thiếu Scroll Lock trên body khi mở Drawer, khiến trang ngầm    | Đặt document.body.style.overflow = "hidden" khi drawer   |
|      |                     | bên dưới vẫn cuộn đồng thời khi lăn chuột ở rìa màn hình.    | mở và hoàn trả lại khi đóng.                             |
+------+---------------------+---------------------------------------------------------------+----------------------------------------------------------+
| P1   | ImportPreviewModal  | Không có trình lắng nghe phím Escape để đóng nhanh cửa sổ      | Bổ sung window.addEventListener("keydown") xử lý Escape  |
|      | ExportSettingsModal | xem trước Excel và modal cài đặt xuất Excel.                  | cho cả 2 modal.                                          |
+------+---------------------+---------------------------------------------------------------+----------------------------------------------------------+
| P1   | RecycleBinPage.tsx  | Các nút khôi phục và xóa vĩnh viễn hàng loạt không bị khóa    | Thêm state isProcessing và disabled={isProcessing}      |
|      |                     | khi click, cho phép bấm nhiều lần kích hoạt trùng lệnh.       | trên các nút thao tác hàng loạt.                         |
+------+---------------------+---------------------------------------------------------------+----------------------------------------------------------+
| P1   | VillagesPage.tsx    | Thẻ thôn dùng thẻ div onClick không thể thao tác bằng phím,   | Chuyển sang button hoặc thêm tabIndex={0}, role="button" |
|      |                     | lồng 2 button sửa/xóa bên trong gây nhiễu tương tác.          | và tách riêng vùng click điều hướng với nút hành động.    |
+------+---------------------+---------------------------------------------------------------+----------------------------------------------------------+
| P2   | HouseholdFilterBar  | Thanh công cụ có tổng min-width > 1000px, bị rớt dòng làm 2-3 | Điều chỉnh responsive: co giãn min-width của ô tìm kiếm  |
|      |                     | hàng trên màn hình laptop 1366x768 DPI 125%, che khuất bảng. | và tinh chỉnh padding các CustomSelect.                  |
+------+---------------------+---------------------------------------------------------------+----------------------------------------------------------+
| P2   | CitizenModal.tsx    | Thông báo lỗi validation chỉ hiển thị ở banner trên cùng,     | Bổ sung state fieldErrors và hiển thị text lỗi nội dòng  |
|      |                     | không làm đổi màu viền input và thiếu text lỗi dưới ô nhập.   | ngay dưới ô nhập Ngày sinh, CCCD, Họ tên.                |
+------+---------------------+---------------------------------------------------------------+----------------------------------------------------------+
| P2   | AnalyticsDashboard  | Nuốt lỗi try-catch khi API lỗi và cache rỗng, không hiển thị  | Bổ sung ErrorBanner cảnh báo mất kết nối và nút          |
|      |                     | thông báo hoặc nút thử lại cho cán bộ.                         | "Tải lại dữ liệu" khi gặp lỗi ngoại tuyến.               |
+------+---------------------+---------------------------------------------------------------+----------------------------------------------------------+
| P2   | Settings/ (rác)     | Tệp ProfileCard.tsx (337 dòng) và TimeCard.tsx (431 dòng)     | Dọn dẹp tệp mồ côi hoặc tái cấu trúc phân rã tệp         |
|      |                     | là code chết, không được import ở bất kỳ màn hình nào.        | SettingsPage.tsx (1227 dòng) thành các tab module hóa.   |
+------+---------------------+---------------------------------------------------------------+----------------------------------------------------------+
| P2   | SettingsPage.tsx    | Hiển thị cứng phiên bản "v2.5.0 Enterprise" trong khi toàn bộ | Đồng bộ hiển thị phiên bản lấy trực tiếp từ package.json |
|      | Sidebar.tsx         | hệ thống và package.json là "v1.0.0".                          | để tránh thông tin sai lệch cho người dùng.              |
+------+---------------------+---------------------------------------------------------------+----------------------------------------------------------+
```

---
*Báo cáo được khởi tạo tự động bởi AGENT 4 (UI/UX & Accessibility Auditor) thuộc Master Engineering System của dự án QLHK.*
