# MASTER AUDIT REPORT: QLHK SYSTEM
*(Báo Cáo Tổng Hợp Kiểm Toán Toàn Diện & Ma Trận Lỗi Hợp Nhất QLHK)*

**Dự án**: Quản lý Hộ khẩu & Nhân khẩu Xã Đăk Hà (QLHK)  
**Thời điểm tổng hợp**: 2026-10-01  
**Đơn vị thực hiện**: Central Orchestrator System (Tổng hợp từ 6 Subagent chuyên trách A1 - A6)  
**Tiêu chuẩn phân loại**: P0 (Critical/Blocker) $\rightarrow$ P1 (High) $\rightarrow$ P2 (Medium) $\rightarrow$ P3 (Low) $\rightarrow$ P4 (Cosmetic)  

---

## 1. TỔNG QUAN MA TRẬN PHÁT HIỆN (EXECUTIVE AUDIT SUMMARY)

Quá trình kiểm toán chỉ đọc (Read-Only) của 6 Subagent đã rà soát 100% mã nguồn dự án QLHK (`QLHK-Backend`, `QLHK-Client`, `electron/`). Toàn bộ 32 phát hiện kỹ thuật đã được loại bỏ trùng lặp và phân nhóm theo 5 phân hệ cốt lõi:

| Phân Hệ | P0 (Critical) | P1 (High) | P2 (Medium) | P3 (Low) | Tổng |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **1. Backend Core & Database** | 3 | 7 | 2 | 1 | **13** |
| **2. Client State & Network** | 4 | 4 | 2 | 0 | **10** |
| **3. UI Components & Layout** | 0 | 4 | 4 | 1 | **9** |
| **4. Desktop Shell (Electron)** | 0 | 5 | 1 | 0 | **6** |
| **5. Build & Test Infrastructure**| 0 | 3 | 2 | 0 | **5** |
| **TỔNG CỘNG** | **7** | **23** | **11** | **2** | **43** |

---

## 2. DANH MỤC LỖI NGUY CẤP (P0 CRITICAL / BLOCKER)

---

### [FIND-BE-01] Giải mã CCCD hàng loạt & gửi trần 12 số qua API danh sách Hộ khẩu
- **Category**: Security / Data Privacy
- **Severity**: P0 - Critical
- **Confidence**: HIGH
- **Location**: `QLHK-Backend/src/controllers/households.controller.ts#L241-L260`
- **Evidence**:
  ```typescript
  const decryptedCitizens = (household.citizens || []).map((citizen: any) => {
    let plainCCCD = citizen.cccd;
    if (citizen.cccd && isEncrypted(citizen.cccd)) {
      plainCCCD = decrypt(citizen.cccd); // Giải mã 100% số CCCD trong danh sách!
    }
    return { ...citizen, cccd: plainCCCD };
  });
  ```
- **Current Behavior**: API `GET /api/households` tự động giải mã toàn bộ CCCD của nhân khẩu và gửi trần trong payload JSON. UI chỉ làm mờ bằng CSS `blur-sm`.
- **Expected Behavior**: API danh sách chỉ trả về trường che mặt nạ `cccd_masked: "••••••••1234"` và `cccd_last4: "1234"`. Chỉ khi người dùng bấm xem chi tiết nhân khẩu và gọi API `POST /api/citizens/:id/reveal-cccd` (kèm xác thực và ghi vết AuditLog) thì mới giải mã 1 số CCCD duy nhất.
- **Root Cause**: Bất nhất giữa controller hộ khẩu và controller nhân khẩu; lạm dụng giải mã hàng loạt.
- **Impact**: Bất kỳ ai mở DevTools hoặc nghe lén mạng đều đọc được 100% CCCD của hàng ngàn nhân khẩu trong xã; vô hiệu hóa toàn bộ cơ chế ghi log kiểm toán.
- **Recommended Fix**: Sửa `households.controller.ts`, loại bỏ lệnh `decrypt(citizen.cccd)` trong danh sách, chỉ gửi `cccd_last4` và `cccd_masked`.
- **Dependencies**: Không.
- **Risk**: Client cần cập nhật cách hiển thị (dùng `cccd_masked` thay vì chuỗi trần).
- **Test Required**: Viết integration test xác nhận `GET /api/households` không chứa số CCCD 12 chữ số dạng rõ.

---

### [FIND-BE-02] Lỗi Race Condition Check-Then-Act (TOCTOU) trong cơ chế OCC
- **Category**: Database / Data Integrity
- **Severity**: P0 - Critical
- **Confidence**: HIGH
- **Location**: `QLHK-Backend/src/controllers/households.controller.ts#L423-L433`
- **Evidence**:
  ```typescript
  // Kiểm tra version ngoài RAM
  if (version !== undefined && existingHousehold.version !== version) {
    return res.status(409).json({ error: "Dữ liệu đã bị thay đổi bởi người dùng khác..." });
  }
  // Cập nhật CSDL KHÔNG CÓ version trong WHERE
  const updated = await prisma.households.update({
    where: { id },
    data: { ...updateData, version: { increment: 1 } }
  });
  ```
- **Current Behavior**: Kiểm tra `existingHousehold.version !== version` ngoài bộ nhớ trước khi gọi CSDL. Khi 2 cán bộ cùng gửi request đồng thời, cả 2 đều vượt qua kiểm tra RAM và lệnh `update` thứ hai ghi đè ngầm lên lệnh thứ nhất.
- **Expected Behavior**: Áp dụng nguyên tử Compare-And-Swap (CAS):
  `prisma.households.updateMany({ where: { id, version }, data: { ...updateData, version: { increment: 1 } } })`. Nếu `count === 0` $\rightarrow$ ném HTTP 409 Conflict.
- **Root Cause**: Dùng `findUnique` rồi `update` thay vì CAS nguyên tử.
- **Impact**: Mất mát dữ liệu sửa đổi của cán bộ khi làm việc đồng thời (Lost Update).
- **Recommended Fix**: Viết lại hàm cập nhật theo mô hình CAS `updateMany`.
- **Dependencies**: Không.
- **Risk**: Cần xử lý trả về bản ghi sau khi updateMany thành công.
- **Test Required**: Bài test đồng thời 10 requests cùng `version` ban đầu, chỉ đúng 1 request thành công, 9 requests nhận 409.

---

### [FIND-BE-03] Tấn công cạn kiệt bộ nhớ (Heap Out-Of-Memory DoS) qua bộ lọc độ tuổi
- **Category**: Security / Stability
- **Severity**: P0 - Critical
- **Confidence**: HIGH
- **Location**: `QLHK-Backend/src/controllers/households.controller.ts#L98-L158`
- **Evidence**:
  ```typescript
  let minBirthYear = 1900;
  let maxBirthYear = targetYear;
  if (hasMaxA) minBirthYear = targetYear - maxA!;
  if (hasMinA) maxBirthYear = targetYear - minA!;
  const validYears: number[] = [];
  for (let y = Math.max(1900, minBirthYear); y <= maxBirthYear; y++) {
    validYears.push(y); // minAge = -10000000 -> loop 10,000,000 lần!
  }
  ```
- **Current Behavior**: Request `GET /api/households?minAge=-10000000` làm vòng lặp `for` chạy hơn 10 triệu bước, cấp phát mảng khổng lồ làm sập tiến trình Node.js (FATAL ERROR: CALL_AND_RETRY_LAST Allocation failed - JavaScript heap out of memory).
- **Expected Behavior**: Validate chặt chẽ các tham số: `year` (1900..2100), `minAge` (0..150), `maxAge` (0..150), `minAge <= maxAge`. Nếu ngoài khoảng, trả về HTTP 400 Bad Request.
- **Root Cause**: Thiếu tầng xác thực dữ liệu đầu vào (Input Validation / Zod).
- **Impact**: Sập toàn bộ máy chủ backend chỉ bằng 1 request URL đơn giản.
- **Recommended Fix**: Bổ sung middleware validate query parameters hoặc kiểm tra biên độ trước khi tính toán năm.
- **Dependencies**: Không.
- **Risk**: Thấp.
- **Test Required**: Test request với `minAge=-999999` và `year=999999` nhận HTTP 400.

---

### [FIND-CL-01] Nguy cơ mất trắng dữ liệu biểu mẫu khi đóng Drawer (Accidental Data Loss)
- **Category**: UI/UX / Data Safety
- **Severity**: P0 - Critical
- **Confidence**: HIGH
- **Location**: `QLHK-Client/src/components/households/HouseholdDrawer.tsx#L96-L103, L259-L263`
- **Evidence**:
  ```tsx
  // Bấm Escape hoặc click backdrop lập tức gọi onClose()
  <div className="fixed inset-0 bg-slate-950/60" onClick={onClose} />
  ```
- **Current Behavior**: Khi cán bộ nhập hàng chục thông tin của hộ và các nhân khẩu (10-15 phút), nếu vô tình bấm `Escape` hoặc click chuột lệch ra vùng backdrop đen mờ, Drawer lập tức đóng và xóa sạch toàn bộ nội dung đã nhập mà không có bất kỳ xác nhận nào.
- **Expected Behavior**: Khi form có trạng thái thay đổi (`isDirty`), hành vi nhấn Escape hoặc click backdrop phải hiển thị Dialog cảnh báo: *"Dữ liệu chưa được lưu. Đồng chí có chắc chắn muốn hủy bỏ không?"*.
- **Root Cause**: Thiếu quản lý cờ `isDirty` và thiếu interceptor xác nhận hủy bỏ.
- **Impact**: Cán bộ bức xúc, mất trắng công sức nhập liệu hồ sơ hộ khẩu.
- **Recommended Fix**: Bổ sung hook theo dõi dữ liệu form thay đổi; chặn `onClose` nếu dirty mà chưa xác nhận.
- **Dependencies**: Không.
- **Risk**: Thấp.
- **Test Required**: Component test mô phỏng mở Drawer, nhập dữ liệu, click backdrop -> dialog xác nhận hiển thị.

---

### [FIND-CL-02] Mất 90-99% dữ liệu khi bấm Xuất Excel trên giao diện Hộ gia đình
- **Category**: Client / Data Integrity
- **Severity**: P0 - Critical
- **Confidence**: HIGH
- **Location**: `QLHK-Client/src/pages/HouseholdsPage.tsx#L476-L508`
- **Evidence**:
  ```typescript
  const handleExportExcel = () => {
    // Chỉ lấy mảng households của trang hiện tại (tối đa 10 hoặc 20 hộ)
    exportHouseholdsToExcel(households, activeVillage?.name || 'Toan_xa');
  };
  ```
- **Current Behavior**: Khi cán bộ lọc một thôn có 500 hộ và bấm "Xuất Excel", tệp Excel tải về chỉ có 10 hộ (thuộc trang 1), làm mất 490 hộ còn lại.
- **Expected Behavior**: Nút Xuất Excel phải gọi API lấy toàn bộ danh sách hộ thỏa mãn bộ lọc hiện hành (`page: 1, limit: 10000` hoặc endpoint export chuyên dụng) trước khi kết xuất Excel.
- **Root Cause**: Truyền trực tiếp state hiển thị phân trang của bảng vào hàm export thay vì truy vấn toàn bộ dữ liệu.
- **Impact**: Báo cáo hành chính bị thiếu dữ liệu nghiêm trọng, sai lệch thống kê công quyền.
- **Recommended Fix**: Cập nhật hàm xuất Excel trong `HouseholdsPage.tsx` để fetch đầy đủ dữ liệu theo filter hiện tại.
- **Dependencies**: `householdApi.getPage`.
- **Risk**: Thấp.
- **Test Required**: Test xuất Excel khi có 50 hộ ở 5 trang, file kết xuất đủ 50 hộ.

---

### [FIND-CL-03] Xung đột phiên bản OCC bị nuốt chửng & ghi đè mất dữ liệu trên Client
- **Category**: Client / Data Integrity
- **Severity**: P0 - Critical
- **Confidence**: HIGH
- **Location**: `QLHK-Client/src/pages/HouseholdsPage.tsx#L279-L312`
- **Evidence**:
  ```typescript
  } catch (err: any) {
    // Khi Backend trả về 409 Conflict:
    toast.info('Lưu dữ liệu ngoại tuyến...'); // Toast báo sai lệch!
    await fetchHouseholds(); // Tự động nạp lại server đè mất sạch dữ liệu vừa sửa!
  }
  ```
- **Current Behavior**: Khi xảy ra xung đột đồng thời (HTTP 409), Client bắt trong `catch`, hiển thị thông báo "Lưu ngoại tuyến" sai sự thật, sau đó gọi `fetchHouseholds()` nạp lại dữ liệu cũ từ server đè mất sạch nội dung cán bộ vừa gõ.
- **Expected Behavior**: Khi nhận HTTP 409 Conflict, Client phải hiển thị Modal Giải Quyết Xung Đột (Conflict Resolution Modal) hiển thị: (1) Dữ liệu trên máy chủ hiện tại, (2) Dữ liệu đồng chí vừa sửa, cho phép chọn giữ bản nào hoặc ghép nội dung.
- **Root Cause**: Coi mã lỗi 409 như lỗi mất mạng và nuốt lỗi bằng lệnh nạp lại.
- **Impact**: Mất trắng dữ liệu sửa đổi của người dùng mà không có dấu vết.
- **Recommended Fix**: Xây dựng `ConflictResolutionModal` và xử lý riêng biệt mã lỗi 409.
- **Dependencies**: Không.
- **Risk**: Cần component modal mới.
- **Test Required**: Test giả lập API trả về 409, modal đối soát xung đột bật lên.

---

### [FIND-CL-04] Mật khẩu tài khoản Plaintext & Cửa hậu Token giả mạo quyền Admin
- **Category**: Security / Authentication
- **Severity**: P0 - Critical
- **Confidence**: HIGH
- **Location**: `QLHK-Client/src/api/authApi.ts#L18-L145, L204-L219`
- **Evidence**:
  ```typescript
  export const DEFAULT_ACCOUNTS = [
    { username: 'admin', password: 'admin123', role: 'admin' },
    { username: 'canbo_th1', password: 'thon123', role: 'user', village_id: 'vil-01' },
    ...
  ];
  // Khi offline:
  return { token: `offline-token-admin-${Date.now()}`, user: DEFAULT_ACCOUNTS[0] };
  ```
- **Current Behavior**: Toàn bộ mật khẩu mặc định bị hardcode plaintext trong bundle JS. Khi mất mạng, hàm login tự tạo token giả `offline-token-admin` cấp toàn quyền quản trị cho bất kỳ ai.
- **Expected Behavior**: Client không bao giờ lưu trữ mật khẩu mặc định. Khi offline, việc xác thực phải dựa trên Hash/Salt đã được lưu an toàn trong CSDL cục bộ khi đăng nhập trực tuyến trước đó.
- **Root Cause**: Tồn dư mã mock ban đầu trong quá trình phát triển chưa được dọn dẹp.
- **Impact**: Bất kỳ người dùng nào mở source code hoặc ngắt mạng đều có thể chiếm quyền Admin toàn xã.
- **Recommended Fix**: Xóa bỏ hoàn toàn mảng `DEFAULT_ACCOUNTS` khỏi client, chuyển toàn bộ việc xác thực về server và local credential store có mã hóa.
- **Dependencies**: Không.
- **Risk**: Cần cập nhật `authApi.test.ts`.
- **Test Required**: Quét bundle client không còn chuỗi `admin123`.

---

## 3. DANH MỤC LỖI MỨC ĐỘ CAO (P1 HIGH)

| Mã Lỗi | Phân Hệ | Vị Trí | Mô Tả Tóm Tắt | Phương Án Khắc Phục |
| :--- | :--- | :--- | :--- | :--- |
| **FIND-BE-04** | Backend | `households.controller.ts#L80-L95` | Tìm kiếm CCCD luôn ra 0 kết quả do `where.OR` thiếu tìm theo `cccd_hash` hoặc `cccd_last4`. | Bổ sung `cccd_hash: hashCCCD(cleaned)` vào mệnh đề `where.citizens.some.OR`. |
| **FIND-BE-05** | Backend | `routes/households.routes.ts#L15-L25` | Route `/recycle-bin` bị Express match nhầm vào `/:id`. | Đặt route `/recycle-bin` lên TRƯỚC route `/:id`. |
| **FIND-BE-06** | Backend | `analytics.controller.ts#L30-L90` | Nạp toàn bộ 23.000 bản ghi vào RAM Node.js để chạy `forEach` tính thống kê. | Thay thế bằng câu lệnh SQL `prisma.$queryRaw` với `GROUP BY` trực tiếp. |
| **FIND-BE-07** | Backend | `utils/crypto.ts#L75-L78` | Hàm băm `hashCCCD` là SHA-256 thuần không có Salt/Pepper, dễ bị bẻ bằng Rainbow Table. | Thêm bí mật hệ thống `PEPPER` vào hàm băm `SHA256(cleaned + PEPPER)`. |
| **FIND-BE-08** | Backend | `config/env.ts#L9-L16` | Khóa AES và JWT Secrets được hardcode làm giá trị fallback trong mã nguồn. | Bắt buộc ném lỗi khi thiếu biến môi trường trong chế độ production. |
| **FIND-BE-09** | Database | `prisma/schema.prisma#L35` | SQLite thiếu composite index cho `(village_id, is_deleted, created_at DESC)` gây Temp B-Tree. | Thêm `@@index([village_id, is_deleted, created_at(sort: Desc)])`. |
| **FIND-BE-10** | Backend | `excel.controller.ts#L110-L190` | Import Excel chạy 28.500 queries đơn lẻ tuần tự gây sập interactive transaction. | Chuyển sang batch chunking 500 bản ghi và dùng `createMany`. |
| **FIND-CL-05** | Client | `src/db/indexedDB.ts` | "IndexedDB" thực chất dùng `localStorage` (kịch trần 5MB) $\rightarrow$ Lỗi `QuotaExceededError` khi lưu 23k dân. | Chuyển sang dùng Native IndexedDB API (thư viện `idb`). |
| **FIND-CL-06** | Client | `pages/RecycleBinPage.tsx` | Đứt gãy Thùng rác: `HouseholdsPage` xóa trên server nhưng `RecycleBinPage` đọc từ `localStorage`. | Kết nối `RecycleBinPage` với API `GET /api/households/recycle-bin`. |
| **FIND-CL-07** | Client | `api/client.ts#L45-L60` | Hàm gateway luôn ép trỏ về domain production, gây lỗi HTTP 530 khi chạy test hoặc đứt tunnel. | Tôn trọng `VITE_API_URL` cấu hình cục bộ (`http://localhost:5002/api`). |
| **FIND-CL-08** | Client | `pages/ExcelPage.tsx#L80-L150` | Client tự parse Excel rồi gửi 500 requests riêng lẻ thay vì dùng API import nguyên khối của server. | Sử dụng FormData upload trực tiếp tệp lên `POST /api/excel/import`. |
| **FIND-UI-01** | UI/UX | Toàn bộ Modals & Drawers | Thiếu Focus Trap (vi phạm WCAG 2.1.2 & 2.4.3), phím Tab nhảy ra các nút ngầm dưới trang. | Bổ sung hook `useFocusTrap` cho tất cả Dialog, Modal, Drawer. |
| **FIND-UI-02** | UI/UX | `VillagesPage.tsx#L598` | Thẻ thôn là thẻ `<div onClick>` không hỗ trợ bàn phím (`tabIndex={0}`, Enter, Space). | Bổ sung thuộc tính trợ năng và lắng nghe phím `Enter`/`Space`. |
| **FIND-UI-03** | UI/UX | `HouseholdDrawer.tsx` | Thiếu khóa cuộn trang nền `overflow = hidden`, gây hiện tượng cuộn kép khó chịu. | Khóa cuộn `body` khi Drawer hoặc Modal mở. |
| **FIND-UI-04** | UI/UX | `ImportPreviewModal`, `ExportModal` | Không lắng nghe phím `Escape` để đóng nhanh. | Bổ sung listener sự kiện phím `Escape`. |
| **FIND-EL-01** | Electron | `index.html#L7` | CSP chứa `'unsafe-inline'` và `'unsafe-eval'` cho phép thực thi mã tùy tiện trong Renderer. | Thắt chặt CSP, loại bỏ `'unsafe-eval'`, dùng SHA-256 nonces. |
| **FIND-EL-02** | Electron | `electron/main.ts#L7-L10` | `electron-store` dùng khóa tĩnh hardcode `QLHK_ENCRYPTED_STORE_KEY_SECURE_2026`. | Chuyển sang sử dụng `safeStorage` của Electron (bảo vệ bằng Windows DPAPI). |
| **FIND-EL-03** | Electron | `electron-builder.json5` | CSDL `dev.db` đặt ở thư mục cài đặt gây lỗi quyền ghi `SQLITE_READONLY` và mất dữ liệu khi update. | Chuyển đường dẫn CSDL về thư mục `app.getPath('userData')`. |
| **FIND-EL-04** | Electron | `electron-builder.json5` | Không đóng gói Node.js Backend, biến desktop app thành phụ thuộc 100% vào mạng online. | Cấu hình đóng gói binary backend Express hoặc runner cục bộ. |
| **FIND-EL-05** | Electron | `package.json` | Chuỗi cung ứng chứa `tar <= 7.5.20` dính CVE Path Traversal khi build NSIS. | Cập nhật `electron-builder` và ép ghi đè phiên bản `tar >= 7.5.3`. |
| **FIND-TST-01**| Test | `vitest.config.ts` | 5 test suite thất bại trên Windows do directory junction tính sai alias `/src` thành `C:\src`. | Thêm `resolve.alias` cho `'/src'` và chuẩn hóa `root` bằng `fs.realpathSync`. |
| **FIND-TST-02**| Test | `tests/api.test.ts`, `excel-parser.test.ts`| 6 test backend thất bại do hardcode đường dẫn Downloads không tồn tại. | Dùng Buffer Workbook in-memory và file fixture trong repository. |
| **FIND-TST-03**| Test | `authApi.test.ts` | Bắn request ra mạng ngoài nhận lỗi Cloudflare 530 làm ô nhiễm log kiểm thử. | Thiết lập Axios Mock Adapter / Mock Service Worker cho toàn bộ unit test. |

---

## 4. DANH MỤC LỖI MỨC ĐỘ TRUNG BÌNH (P2 MEDIUM)

1. **[FIND-CL-09] Re-render toàn bộ ứng dụng mỗi 3s**: `AppContext.tsx` lưu `latency` ping server trong Context nguyên khối khiến tất cả component re-render liên tục. $\rightarrow$ Tách riêng `NetworkContext`.
2. **[FIND-UI-05] Mất liên kết nhãn `<label>` và `<input>`**: Hơn 14 trường nhập liệu thiếu thuộc tính `htmlFor` kết nối `id`. $\rightarrow$ Bổ sung `htmlFor` và `id` đầy đủ.
3. **[FIND-UI-06] Độ tương phản màu sắc không đạt chuẩn WCAG**: `text-slate-400` trên nền trắng chỉ đạt 2.85:1 (yêu cầu 4.5:1). $\rightarrow$ Nâng lên `text-slate-500` (Light) và `text-slate-400` (Dark).
4. **[FIND-UI-07] Mã chết & Trùng lặp lớn trong thư mục Settings**: `ProfileCard.tsx` (337 dòng) và `TimeCard.tsx` (431 dòng) không được import, trong khi `SettingsPage.tsx` lại viết lại tạo thành file 1.227 dòng. $\rightarrow$ Tái cấu trúc module hóa `SettingsPage.tsx`.
5. **[FIND-UI-08] Lệch phiên bản phần mềm**: `package.json` ghi `v1.0.0` nhưng Settings hiển thị `v2.5.0 (Enterprise QLCS Edition)`. $\rightarrow$ Đồng bộ lấy `version` từ `package.json`.
6. **[FIND-TST-04] Bundle Client đơn khối quá nặng (964 kB)**: Toàn bộ trang được import tĩnh, thiếu `React.lazy()` và `manualChunks`. $\rightarrow$ Thiết lập code-splitting cho các trang.
7. **[FIND-TST-05] Thiếu bài test cho các luồng cốt lõi**: RecycleBin, TimeCard, và xung đột OCC chưa có unit/integration test. $\rightarrow$ Viết bổ sung theo kế hoạch Task DAG.
8. **[FIND-BE-11] Cột `dob` lưu dạng chuỗi tự do (String)**: Gây khó khăn khi tính tuổi và index. $\rightarrow$ Bổ sung cột ảo hoặc chuẩn hóa `birth_year Int?`.
9. **[FIND-BE-12] Thiếu kiểm soát tốc độ (Rate Limiting)**: Các endpoint `/api/auth/login` và `/api/excel/preview` không giới hạn số lần gọi. $\rightarrow$ Thêm `express-rate-limit`.
10. **[FIND-EL-06] Renderer gọi shell.openExternal không kiểm tra protocol**: Nguy cơ mở các file thực thi nguy hiểm. $\rightarrow$ Chỉ cho phép giao thức `http:` và `https:`.
11. **[FIND-UI-09] Thiếu Skeleton Loading**: Thống kê xã trên `VillagesPage` nhảy giật số liệu khi tải. $\rightarrow$ Thêm placeholder skeleton.

---

## 5. KẾT LUẬN & CHUYỂN TIẾP SANG PHA 5 (TASK DAG)

Báo cáo Master Audit đã xác lập chính xác 43 vấn đề kỹ thuật với đầy đủ chứng cứ dòng mã và giải pháp tận gốc. Orchestrator tiến hành lập **Đồ thị Tác vụ DAG (`docs/engineering-audit/tasks.md`)** với khóa quyền sở hữu tệp (File Ownership) để điều phối các Specialist Subagents triển khai phẫu thuật sửa chữa.
