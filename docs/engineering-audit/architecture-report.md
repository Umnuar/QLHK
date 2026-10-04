# BÁO CÁO KIỂM TOÁN KIẾN TRÚC HỆ THỐNG (SYSTEM ARCHITECTURE AUDIT REPORT)
**Dự án**: Hệ thống Quản lý Hộ khẩu & Nhân khẩu Xã Đăk Hà (`c:\Projects\QLHK`)  
**Phân hệ khảo sát**: `QLHK-Backend`, `QLHK-Client`, `electron/`  
**Vai trò**: Agent 1 — Master Architecture & Code Quality Auditor  
**Thời điểm kiểm toán**: 2026-10-01  
**Quy chế kiểm toán**: READ-ONLY AUDIT (Không sửa đổi mã nguồn ứng dụng)  
**Tiêu chuẩn báo cáo**: Tuân thủ triệt để Meta-Rule 8 Câu Hỏi (Section 31)

---

## TỔNG QUAN ĐÁNH GIÁ KIẾN TRÚC (EXECUTIVE SUMMARY)

Hệ thống QLHK được thiết kế theo mô hình 2 tầng (Desktop Electron Client + Express REST Backend) với CSDL SQLite (Prisma ORM) phục vụ quản lý nhân hộ khẩu cấp xã/thôn. Mặc dù hệ thống có nền tảng phân quyền địa bàn (RBAC Village Scoping) và mã hóa CCCD (AES-256-GCM), quá trình kiểm toán phát hiện **6 đứt gãy kiến trúc nghiêm trọng (Architectural Fractures)**:

1. **Phân rã trạng thái (Split-Brain State) & Mất kết nối Thùng rác (Recycle Bin Disconnect)**: Client duy trì song song 2 nguồn chân lý (`AppContext` + API và `householdStore` + `localStorage`). Các thao tác xóa mềm trên giao diện Hộ khẩu ghi nhận vào Backend CSDL, nhưng trang Thùng rác (`RecycleBinPage`) lại đọc dữ liệu từ `householdStore` (`localStorage`), khiến dữ liệu xóa thực tế hoàn toàn biến mất khỏi Thùng rác.
2. **Bất nhất ranh giới bảo mật CCCD (CCCD Security Boundary Inconsistency)**: Endpoint nhân khẩu (`citizens.controller.ts`) bảo vệ số CCCD nghiêm ngặt sau API `revealCitizenCCCD` kèm ghi vết kiểm toán (Audit Trail), trong khi endpoint hộ khẩu (`households.controller.ts`) tự ý giải mã và trả về toàn bộ CCCD dạng rõ (plaintext) trong danh sách hộ (`getHouseholds`), hoàn toàn vô hiệu hóa cơ chế bảo mật và rò rỉ dữ liệu qua mạng.
3. **Chỉ mục mù không muối (Unsalted Blind Index Vulnerability)**: Hàm băm `hashCCCD` trong `crypto.ts` sử dụng SHA-256 trực tiếp không có muối (salt), khiến số CCCD 12 chữ số dễ dàng bị dịch ngược bằng Rainbow Table.
4. **Cửa hậu xác thực ngoại tuyến (Offline Backdoor & Hardcoded Credentials)**: `authApi.ts` nhúng cứng danh sách tài khoản cùng mật khẩu dạng rõ (`admin123`, `thon123`...) và tự động cấp token giả `offline-token-admin-*` khi gặp lỗi 401 hoặc lỗi mạng, cho phép người dùng chiếm quyền quản trị viên không qua kiểm chứng máy chủ.
5. **Trùng lặp động cơ Excel & Bỏ rơi API Backend**: Cả Client và Backend đều triển khai động cơ bóc tách Excel độc lập (>400 dòng mỗi bên). Client hoàn toàn không sử dụng API `/api/excel/import` nguyên khối của Backend mà gửi lặp hàng trăm HTTP POST tuần tự cho từng hộ dân.
6. **Ô nhiễm Context gốc & Tái dựng cây DOM liên tục (Context Pollution & Render Thrashing)**: `AppContext` chứa giá trị `latency` biến thiên liên tục qua chu kỳ ping 3 giây, ép toàn bộ 32+ component phụ thuộc phải re-render định kỳ dù không có thay đổi dữ liệu nghiệp vụ.

---

## DANH MỤC CÁC PHÁT HIỆN KIẾN TRÚC CHI TIẾT (SECTION 31 META-RULE)

### ARCH-01: Split-Brain State & Phân Ly Kiến Trúc Giữa Quản Lý Hộ Khẩu Và Thùng Rác

#### 1. What did I inspect?
- `c:\Projects\QLHK\QLHK-Client\src\pages\HouseholdsPage.tsx` (dòng 51, 314-365)
- `c:\Projects\QLHK\QLHK-Client\src\pages\RecycleBinPage.tsx` (dòng 11-25, 49, 67, 86, 106)
- `c:\Projects\QLHK\QLHK-Client\src\store\householdStore.ts` (dòng 23-33, 88-95, 335-362)
- `c:\Projects\QLHK\QLHK-Client\src\context\HouseholdContext.tsx` (dòng 3-26)

#### 2. What did I observe?
Hệ thống tồn tại hai mô hình quản lý dữ liệu độc lập và mâu thuẫn trực tiếp với nhau:
- `HouseholdsPage.tsx` quản lý dữ liệu thông qua HTTP API trực tiếp (`householdApi.getPage`, `householdApi.delete`, `householdApi.batchDelete`) và lưu cache vào IndexedDB (`localStorage` wrapper).
- `RecycleBinPage.tsx` không hề gọi `householdApi` để lấy danh sách hộ đã xóa từ backend CSDL (`is_deleted = true`), mà gọi hook `useHouseholds()` từ `HouseholdContext`, đọc danh sách `deletedHouseholds` từ `householdStore.ts` (vốn được khởi tạo bằng `INITIAL_HOUSEHOLDS` trong `localStorage`).

#### 3. What evidence supports the observation?
- Trong `HouseholdsPage.tsx` (dòng 324, 355):
  ```typescript
  await householdApi.delete(hh.id);
  // Không hề gọi softDeleteHousehold của householdStore
  ```
- Trong `RecycleBinPage.tsx` (dòng 11-12, 20-25):
  ```typescript
  const { deletedHouseholds, restoreHousehold, hardDeleteHousehold, loading } = useHouseholds();
  const total = deletedHouseholds.length;
  const paginatedDeleted = deletedHouseholds.slice((page - 1) * limit, page * limit);
  ```
- Không có bất kỳ dòng mã nào trong `RecycleBinPage.tsx` gọi `apiClient` hoặc `householdApi.getPage({ includeDeleted: true })`.

#### 4. What is the root cause?
Kiến trúc ban đầu được xây dựng dưới dạng Mock Client-only Store (`householdStore.ts` lưu `localStorage` từ `seedData.ts`). Khi chuyển đổi sang Backend REST API, màn hình `HouseholdsPage` đã được nối API thực, nhưng `RecycleBinPage` bị bỏ quên và tiếp tục dùng store cũ. Đồng thời, `HouseholdContext` không phản ánh dữ liệu từ máy chủ.

#### 5. What is the impact?
- **Mất liên kết nghiệp vụ (Broken Business Flow)**: Khi cán bộ xóa 1 hộ dân tại trang Hộ gia đình, hộ dân đó biến mất khỏi bảng và chuyển cờ `is_deleted = true` trong SQLite Backend. Tuy nhiên, khi cán bộ mở trang Thùng rác (`RecycleBinPage`), hộ dân vừa xóa hoàn toàn không xuất hiện.
- **Dữ liệu ma**: Thùng rác chỉ hiển thị các hộ dân mẫu từ `INITIAL_HOUSEHOLDS` nếu trong `localStorage` từng có cờ xóa của dữ liệu mẫu.
- Thao tác "Khôi phục" hoặc "Xóa vĩnh viễn" trong Thùng rác chỉ sửa đổi `localStorage`, không đồng bộ hoặc sinh lỗi khi gọi API với ID không tồn tại trên server.

#### 6. What should change?
- Loại bỏ hoàn toàn sự phụ thuộc của `RecycleBinPage` vào `householdStore`.
- Bổ sung hàm API chuyên biệt: `householdApi.getTrash({ page, limit, search, villageId })` gọi endpoint `GET /api/households?includeDeleted=true`.
- Tái cấu trúc `RecycleBinPage` để fetch dữ liệu từ Backend API tương tự `HouseholdsPage`, thống nhất cơ chế phân trang server-side.
- Loại bỏ `householdStore.ts` hoặc thu gọn nó thành client state cache thực thụ thay vì một Mock DB thứ hai.

#### 7. What should be tested?
- Test luồng E2E: Tạo hộ mới -> Gọi Xóa hộ trên UI -> Chuyển sang Thùng rác -> Xác minh hộ vừa xóa xuất hiện tại Thùng rác -> Bấm Khôi phục -> Xác minh hộ quay lại trang Hộ gia đình.
- Unit test: `householdApi.getTrash` truyền đúng tham số `includeDeleted=true` và xử lý phân trang chính xác.

#### 8. What remains uncertain?
Liệu việc giữ lại `householdStore.ts` có nhằm phục vụ mục đích ngoại tuyến hoàn toàn (offline-first PWA) hay chỉ là tàn dư kỹ thuật chưa dọn sạch khi tích hợp Backend.

---

### ARCH-02: Bất Nhất Ranh Giới Bảo Mật CCCD & Rò Rỉ Dữ Liệu Qua Endpoint Danh Sách Hộ

#### 1. What did I inspect?
- `c:\Projects\QLHK\QLHK-Backend\src\controllers\households.controller.ts` (dòng 7-39, 220-222, 270)
- `c:\Projects\QLHK\QLHK-Backend\src\controllers\citizens.controller.ts` (dòng 107-126, 175-181, 188-235)
- `c:\Projects\QLHK\QLHK-Backend\src\routes\citizens.routes.ts` (dòng 22)
- `c:\Projects\QLHK\docs\engineering-audit\behavior-baseline.md` (dòng 49, 71)

#### 2. What did I observe?
Có sự mâu thuẫn trực tiếp và phá vỡ kiến trúc bảo vệ dữ liệu cá nhân giữa hai controller:
- `citizens.controller.ts` tuân thủ nghiêm ngặt nguyên tắc bảo mật: hàm `getCitizens` và `getCitizenById` ẩn số CCCD thật, chỉ trả về `cccd_last4` và cờ boolean `has_cccd`. Khi cần xem số đầy đủ, Client bắt buộc phải gọi endpoint riêng `GET /api/citizens/:id/reveal-cccd`, và hành động này được ghi vết kiểm toán (`action: "UPDATE", entityType: "citizen", newValues: { action: "REVEAL_CCCD" }`).
- Ngược lại, `households.controller.ts` tại hàm `formatHouseholdWithDecryptedCitizens` tự động chạy vòng lặp giải mã toàn bộ CCCD của tất cả nhân khẩu bằng `decryptCCCD(c.cccd)` và đính kèm trực tiếp chuỗi CCCD dạng rõ vào JSON payload trả về cho mọi request `GET /api/households` và `GET /api/households/:id`.

#### 3. What evidence supports the observation?
- `households.controller.ts` (dòng 9-33):
  ```typescript
  const formattedCitizens = (household.citizens || []).map((c: any) => {
    let plainCCCD = "";
    if (c.cccd) {
      try { plainCCCD = decryptCCCD(c.cccd); } catch (err) { plainCCCD = ""; }
    }
    return { ...c, cccd: plainCCCD, cccd_masked };
  });
  ```
- `citizens.controller.ts` (dòng 108-119):
  ```typescript
  const sanitized = citizens.map((c) => ({
    ...
    cccd_last4: c.cccd_last4,
    has_cccd: !!c.cccd,
    // cccd plaintext bị loại bỏ hoàn toàn
  }));
  ```

#### 4. What is the root cause?
Sự thiếu vắng tầng Data Transfer Object (DTO) hoặc Serialization Layer chung ở Backend. Mỗi controller tự định nghĩa định dạng trả về dẫn đến sự phân mảnh: lập trình viên viết `households.controller.ts` muốn tiện cho Client hiển thị nên giải mã hàng loạt, vô tình phá bỏ toàn bộ cơ chế bảo mật của phân hệ `citizens`.

#### 5. What is the impact?
- **Rò rỉ dữ liệu nhạy cảm**: Số CCCD của hàng trăm công dân được gửi dạng rõ qua mạng trong các phản hồi danh sách thông thường.
- **Vô hiệu hóa Audit Log**: Toàn bộ mục tiêu ghi vết kiểm tra ai đã xem CCCD tại `revealCitizenCCCD` trở nên vô nghĩa, vì bất kỳ client nào cũng có thể đọc CCCD rõ thông qua API `/api/households`.
- **Suy giảm hiệu năng**: Với trang danh sách gồm 20 hộ, mỗi hộ 5 nhân khẩu, backend phải thực hiện 100 phép giải mã AES-256-GCM trong bộ nhớ trên mỗi request phân trang, gây nghẽn CPU khi tải cao.

#### 6. What should change?
- Xóa bỏ việc gọi `decryptCCCD` bên trong `formatHouseholdWithDecryptedCitizens` trong `households.controller.ts`.
- Chuẩn hóa payload của `citizens` trong `households`: Chỉ trả về `cccd_last4` và `cccd_masked` (tận dụng trường `cccd_last4` đã lưu trong database mà không cần giải mã).
- Bắt buộc mọi yêu cầu giải mã xem đầy đủ CCCD phải đi qua `GET /api/citizens/:id/reveal-cccd` để kiểm soát quyền và ghi log kiểm toán.

#### 7. What should be tested?
- Kiểm tra kết quả trả về của `GET /api/households`: Trường `cccd` phải là `undefined` hoặc masked, không chứa 12 số thực tế.
- Kiểm tra hiệu năng backend: Thời gian phản hồi của `getHouseholds` khi nạp 100 hộ phải giảm đáng kể do không phải giải mã AES.
- Kiểm tra tính năng toggle xem CCCD trên Client: Phải gọi đúng endpoint `reveal-cccd` và ghi nhận bản ghi trong bảng `audit_logs`.

#### 8. What remains uncertain?
Client hiện tại có thành phần nào (như xuất Excel client-side) đang ỷ lại vào việc `GET /api/households` trả về sẵn CCCD giải mã hay không. (Cần kiểm tra `ExportSettingsModal.tsx`).

---

### ARCH-03: Lỗ Hổng Blind Index Không Muối (Unsalted Hash) Trong Mã Hóa CCCD

#### 1. What did I inspect?
- `c:\Projects\QLHK\QLHK-Backend\src\utils\crypto.ts` (dòng 75-78)
- `c:\Projects\QLHK\QLHK-Backend\prisma\schema.prisma` (dòng 73, 88)
- `c:\Projects\QLHK\docs\engineering-audit\behavior-baseline.md` (dòng 49)

#### 2. What did I observe?
Tài liệu kiến trúc baseline quy định: `Tạo hàm băm SHA-256(cccd + salt) lưu tại cccd_hash để phục vụ tìm kiếm chính xác (Blind Indexing)`.  
Tuy nhiên, triển khai thực tế trong `crypto.ts` là:
```typescript
export function hashCCCD(plainCCCD: string): string {
  const cleaned = plainCCCD.trim();
  return crypto.createHash("sha256").update(cleaned).digest("hex");
}
```
Hoàn toàn không có muối (`salt`) hoặc HMAC key nào được sử dụng.

#### 3. What evidence supports the observation?
- Toàn bộ hàm `hashCCCD` chỉ nhận 1 tham số `plainCCCD`, băm trực tiếp qua `sha256`.
- Bảng `citizens` trong `schema.prisma` có trường `cccd_hash String?` và index `@@index([cccd_hash])`.

#### 4. What is the root cause?
Lập trình viên đơn giản hóa hàm băm trong giai đoạn prototype mà không bổ sung khóa bí mật (Secret Salt / Pepper) cho Blind Indexing trước khi đưa vào kiểm thử.

#### 5. What is the impact?
- **Nguy cơ bảo mật nghiêm trọng**: Số CCCD Việt Nam có cấu trúc xác định gồm 12 số (3 số mã tỉnh/thành, 1 số thế kỷ/giới tính, 2 số năm sinh, 6 số ngẫu nhiên). Không gian số CCCD thực tế của 1 xã như Đăk Hà chỉ có tối đa vài chục ngàn biến thể.
- Một kẻ tấn công trích xuất được CSDL SQLite (`dev.db`) có thể sử dụng bảng tính toán trước (Rainbow Table) hoặc chạy brute-force SHA-256 trên GPU trong vài giây để phục hồi 100% số CCCD từ cột `cccd_hash`, biến việc mã hóa AES-256-GCM ở cột `cccd` thành vô ích.

#### 6. What should change?
- Cập nhật hàm `hashCCCD` sử dụng HMAC-SHA256 kết hợp với khóa bí mật từ cấu hình môi trường:
  ```typescript
  export function hashCCCD(plainCCCD: string): string {
    const cleaned = plainCCCD.trim();
    return crypto.createHmac("sha256", config.blindIndexSecret).update(cleaned).digest("hex");
  }
  ```
- Bổ sung biến môi trường `BLIND_INDEX_SECRET` vào `.env.example` và kiểm tra tính bắt buộc trong môi trường production tại `env.ts`.

#### 7. What should be tested?
- Unit test xác minh hai chuỗi CCCD giống nhau sinh ra cùng một mã băm khi có khóa, nhưng không thể đoán được nếu không có khóa.
- Test tìm kiếm công dân theo số CCCD (`GET /api/citizens?cccd=064...`) vẫn hoạt động chính xác sau khi áp dụng HMAC.

#### 8. What remains uncertain?
Nếu đã có dữ liệu CCCD tồn tại trong CSDL cũ, việc đổi hàm băm sang HMAC sẽ yêu cầu một migration script để tính lại toàn bộ `cccd_hash`.

---

### ARCH-04: Cửa Hậu Xác Thực Ngoại Tuyến (Offline Backdoor) & Mật Khẩu Nhúng Cứng Client

#### 1. What did I inspect?
- `c:\Projects\QLHK\QLHK-Client\src\api\authApi.ts` (dòng 18-145, 186-236)
- `c:\Projects\QLHK\QLHK-Client\src\AppContext.tsx` (dòng 350-447)

#### 2. What did I observe?
Tệp `authApi.ts` chứa danh sách 11 tài khoản mặc định kèm mật khẩu dạng rõ (`admin123`, `thon123`, `canbo123`...). Khi phương thức `login` gọi API máy chủ thất bại (do mạng hoặc do server trả về 401), mã nguồn tự động rơi vào khối `catch`, kiểm tra xem thông tin đăng nhập có trùng với danh sách mặc định hay không. Nếu trùng, client tự sinh token giả:
```typescript
accessToken: `offline-token-${isAdm ? "admin" : "user"}-${matched.id}`
```
và cấp quyền truy cập đầy đủ vào giao diện quản trị!

#### 3. What evidence supports the observation?
- `authApi.ts` (dòng 204-218):
  ```typescript
  if (matched && matched.password === credentials.password) {
    const isAdm = matched.role === "admin";
    return {
      accessToken: `offline-token-${isAdm ? "admin" : "user"}-${matched.id}`,
      refreshToken: `offline-refresh-${matched.id}`,
      user: { id: matched.id, username: matched.username, role: matched.role, ... }
    };
  }
  ```
- `AppContext.tsx` (dòng 355, 412-430): Thừa nhận và chấp nhận token `offline-token-*` để khởi tạo phiên đăng nhập.

#### 4. What is the root cause?
Cơ chế "Offline Demo / Fallback" được code trực tiếp vào tầng API sản phẩm mà không có cờ phân tách môi trường (`import.meta.env.DEV`), dẫn đến việc mã giả lập lọt vào luồng xác thực chính.

#### 5. What is the impact?
- **Vi phạm toàn bộ nguyên tắc bảo mật**: Bất kỳ người nào mở ứng dụng Desktop hoặc bản dựng web khi máy chủ ngắt kết nối đều có thể đăng nhập quyền Admin cấp Xã bằng mật khẩu `admin` / `admin123`.
- Khi máy chủ đổi mật khẩu của tài khoản `admin` thành mật khẩu an toàn, nếu kẻ tấn công nhập `admin` / `admin123`, máy chủ trả về 401, client bắt lỗi 401 này và **vẫn cho phép đăng nhập offline** với quyền Admin!

#### 6. What should change?
- Xóa bỏ hoàn toàn mảng `DEFAULT_ACCOUNTS` chứa mật khẩu dạng rõ khỏi bundle của Client.
- Nghiêm cấm client tự ý đúc `offline-token-*`.
- Nếu ứng dụng cần hỗ trợ đăng nhập ngoại tuyến, phải sử dụng cơ chế bảo mật tiêu chuẩn: Chỉ cho phép người dùng đã từng đăng nhập trực tuyến thành công trên thiết bị đó được xác thực lại qua khóa băm bảo mật lưu trong Electron Secure Store (AES encrypted), có thời hạn hết hạn cục bộ rõ ràng.

#### 7. What should be tested?
- Test nhập mật khẩu sai khi offline -> Hệ thống phải từ chối đăng nhập.
- Test đóng gói ứng dụng production -> Bundle không được chứa chuỗi ký tự mật khẩu mặc định.

#### 8. What remains uncertain?
Mục đích ban đầu của việc nhúng tài khoản có phải để vượt qua các bài kiểm thử tự động (Vitest) hay không. Cần kiểm tra xem có test suite nào đang dựa vào các tài khoản offline này không.

---

### ARCH-05: Đứt Gãy Động Cơ Nhập Excel & Bỏ Rơi API Giao Dịch Backend

#### 1. What did I inspect?
- `c:\Projects\QLHK\QLHK-Backend\src\controllers\excel.controller.ts` (dòng 38-199)
- `c:\Projects\QLHK\QLHK-Backend\src\utils\excel-parser.ts` (536 dòng)
- `c:\Projects\QLHK\QLHK-Client\src\utils\excelParser.ts` (484 dòng)
- `c:\Projects\QLHK\QLHK-Client\src\pages\ExcelPage.tsx` (dòng 57-84, 115-257)

#### 2. What did I observe?
- Hệ thống bị phân đôi logic nghiệp vụ xử lý Excel: Cả Backend (`excel-parser.ts`) và Client (`excelParser.ts`) đều viết riêng logic đọc file Excel, nhận diện năm 3 chữ số, chuyển đổi ngày epoch Excel, chuẩn hóa mối quan hệ gia đình.
- Backend cung cấp 2 API chuẩn hóa: `POST /api/excel/preview` và `POST /api/excel/import` (chạy trong `prisma.$transaction` đảm bảo tính nguyên tử ACID).
- Tuy nhiên, Client (`ExcelPage.tsx`) hoàn toàn không gọi `POST /api/excel/import`. Thay vào đó, sau khi parse file trên trình duyệt, Client chạy vòng lặp `for`:
  ```typescript
  for (const group of Object.values(householdMap)) {
    await householdApi.create({...});
  }
  ```
  tạo từng hộ gia đình một cách tuần tự qua hàng trăm HTTP request riêng lẻ.

#### 3. What evidence supports the observation?
- Trong thư mục `QLHK-Client/src/api`, không hề có tệp `excelApi.ts`.
- `ExcelPage.tsx` (dòng 196-238):
  ```typescript
  for (const group of Object.values(householdMap)) {
    ...
    await householdApi.create({
      village_id: targetVillageId,
      book_number: group.code,
      ...
    });
    addedCount++;
  }
  ```

#### 4. What is the root cause?
Thiếu sự đồng bộ trong thiết kế hợp đồng API giữa nhóm phát triển Frontend và Backend. Backend thiết kế luồng Import nguyên khối (Batch Transaction), trong khi Frontend tận dụng hàm `create` đơn lẻ đã có sẵn để ghép nối nhanh chóng.

#### 5. What is the impact?
- **Nguy cơ lỗi tính toàn vẹn dữ liệu (Data Integrity Collapse)**: Nếu một tệp Excel có 500 hộ gia đình, Client sẽ phát ra 500 HTTP request liên tiếp. Nếu xảy ra sự cố mạng ở hộ thứ 250, quá trình nhập bị dừng lại giữa chừng, tạo ra trạng thái dữ liệu dở dang (partial import) không thể tự động rollback.
- **Tải máy chủ cực lớn**: 500 request riêng lẻ kích hoạt 500 transaction nhỏ, 500 bản ghi audit log đơn lẻ, gây nghẽn kết nối SQLite vốn chỉ hỗ trợ 1 tiến trình ghi tại một thời điểm (database is locked error).
- **Trùng lặp mã nguồn**: 1.000 dòng mã logic xử lý Excel được duy trì song song ở 2 nơi, dễ dẫn đến lệch chuẩn (logic drift) khi một bên cập nhật quy tắc ngày sinh hoặc quan hệ gia đình mà bên kia không cập nhật.

#### 6. What should change?
- Thống nhất luồng nghiệp vụ: Chuyển toàn bộ tác vụ phân tích và nhập file Excel sang Backend API.
- Tạo `excelApi.ts` ở Client với các hàm: `preview(file: File)` và `import(file: File, villageId: string)`.
- Giao diện `ExcelPage.tsx` chỉ gửi tệp Excel lên `POST /api/excel/preview` để nhận dữ liệu xem trước, và khi xác nhận thì gọi `POST /api/excel/import` một lần duy nhất.
- Xóa bỏ thư viện `xlsx` và logic phân tích Excel khỏi Client bundle để giảm kích thước ứng dụng desktop.

#### 7. What should be tested?
- Test nhập file Excel mẫu 4 hộ 14 nhân khẩu qua 1 request duy nhất.
- Test kịch bản file Excel có lỗi ở dòng cuối: Toàn bộ quá trình phải rollback sạch sẽ, không có hộ nào bị lưu sót vào database.

#### 8. What remains uncertain?
Liệu có yêu cầu người dùng phải chỉnh sửa trực tiếp dữ liệu trên bảng preview trước khi bấm "Lưu vào CSDL" hay không. Nếu có, Backend cần hỗ trợ nhận payload `households` đã chỉnh sửa thay vì chỉ nhận file thô.

---

### ARCH-06: Ô Nhiễm AppContext & Rung Lắc Hiển Thị (Render Thrashing) Do Polling Ping 3s

#### 1. What did I inspect?
- `c:\Projects\QLHK\QLHK-Client\src\AppContext.tsx` (dòng 23-59, 311-348, 480-493)
- `c:\Projects\QLHK\graphify-out\GRAPH_REPORT.md` (dòng 56, 115-118)

#### 2. What did I observe?
- `AppContext` là một Mega-God-Object tập trung quản lý hơn 18 trạng thái và hàm điều khiển: từ thông tin người dùng (`user`), danh mục thôn (`villages`), giao diện (`theme`, `zoomLevel`, `isSidebarCollapsed`) đến trạng thái mạng thời gian thực (`isOnline`, `isBackendHealthy`, `latency`).
- Đồ thị GitNexus / Graphify xác nhận `useApp()` là một God Node với 32 cạnh kết nối trực tiếp đến hầu hết các màn hình và thành phần trong dự án.
- Cứ mỗi 3 giây, hàm `checkServerHealth()` gửi yêu cầu `fetch('/ping')`, tính toán độ trễ `emaLatency` và gọi `setLatency(emaLatency)`.
- Việc gọi `setLatency` làm biến đổi giá trị Context Value của `AppContext`, dẫn đến toàn bộ cây component đăng ký `useApp()` bị re-render cưỡng bức mỗi 3 giây.

#### 3. What evidence supports the observation?
- `AppContext.tsx` (dòng 323-330):
  ```typescript
  if (emaLatency === null) {
    emaLatency = rawLat;
  } else {
    emaLatency = Math.round(EMA_ALPHA * rawLat + (1 - EMA_ALPHA) * emaLatency);
  }
  setLatency(emaLatency); // Kích hoạt re-render toàn app mỗi 3 giây!
  ```
- `AppContext.tsx` (dòng 480-485):
  ```typescript
  const interval = setInterval(() => {
    if (navigator.onLine) {
      checkServerHealth();
    }
  }, 3000);
  ```

#### 4. What is the root cause?
Vi phạm nguyên tắc phân tách trách nhiệm (Single Responsibility Principle) trong React Context. Trạng thái đo lường mạng biến thiên nhanh (High-frequency transient state) bị đặt chung vào Context chứa dữ liệu cấu hình tĩnh và xác thực người dùng (Low-frequency persistent state).

#### 5. What is the impact?
- **Hiệu năng suy giảm nghiêm trọng**: Toàn bộ ứng dụng chịu tải CPU liên tục ngay cả khi người dùng không tương tác.
- **Mất tiêu điểm và giật lag (Input Lag / Focus Loss)**: Người dùng đang gõ tìm kiếm hoặc chỉnh sửa dữ liệu trong bảng lớn (`HouseholdTable`) có thể bị mất trạng thái gõ hoặc giật khung hình do chu kỳ render 3s.
- **Gánh nặng mạng**: 1 client phát ra 1.200 request `/ping` mỗi giờ. 20 máy trạm cán bộ hoạt động cùng lúc sẽ tạo ra 24.000 request/giờ chỉ để kiểm tra độ trễ hiển thị một con số ms trên thanh tiêu đề.

#### 6. What should change?
- Tách `AppContext` thành các Context chuyên biệt:
  1. `AuthContext`: Quản lý `user`, `login`, `logout`.
  2. `UIPreferencesContext`: Quản lý `theme`, `zoomLevel`, `isSidebarCollapsed`.
  3. `NetworkStatusContext`: Quản lý `latency`, `isBackendHealthy`, `isOnline`.
- Nâng chu kỳ kiểm tra sức khỏe máy chủ từ 3 giây lên 15–30 giây, hoặc chỉ ping khi có tương tác lỗi (Error-triggered health check).
- Chỉ các component thực sự hiển thị widget trạng thái mạng (như `ConnectionBanner` hoặc `ServerStatusModal`) mới đăng ký lắng nghe `NetworkStatusContext`.

#### 7. What should be tested?
- Sử dụng React Profiler đo số lượng component bị re-render khi `setLatency` được gọi: Sau khi tách, chỉ có icon mạng trên Header được render lại.
- Đo tải CPU máy trạm ở chế độ nghỉ (idle): Mức chiếm dụng CPU của Electron Renderer phải về mức xấp xỉ 0%.

#### 8. What remains uncertain?
Liệu việc giữ chu kỳ ping 3 giây có phải để phục vụ việc phát hiện sự cố máy chủ cục bộ ngay lập tức cho môi trường demo hay không.

---

### ARCH-07: Thiếu Vắng Tầng Service / Repository & Khớp Nối Chặt Với Prisma Trong Controllers

#### 1. What did I inspect?
- `c:\Projects\QLHK\QLHK-Backend\src\controllers\households.controller.ts` (924 dòng)
- `c:\Projects\QLHK\QLHK-Backend\src\controllers\citizens.controller.ts` (535 dòng)
- `c:\Projects\QLHK\QLHK-Backend\src\controllers\villages.controller.ts` (235 dòng)
- `c:\Projects\QLHK\QLHK-Backend\src\controllers\users.controller.ts` (305 dòng)

#### 2. What did I observe?
- Cấu trúc thư mục của `QLHK-Backend/src` hoàn toàn không có thư mục `services/` hoặc `repositories/`.
- Toàn bộ các controller đều trực tiếp nhập thể hiện `prisma` từ `config/prisma` và thực hiện đồng thời 5 trách nhiệm trong cùng một hàm handler:
  1. Nhận và trích xuất HTTP Request params/body/query.
  2. Kiểm tra phân quyền RBAC và logic nghiệp vụ thôn xã.
  3. Lắp ráp câu lệnh truy vấn phức tạp của Prisma ORM.
  4. Thực thi các phép biến đổi dữ liệu (mã hóa, giải mã CCCD, xóa dấu tiếng Việt).
  5. Tính toán diff thay đổi và ghi audit log.
  6. Định dạng và gửi HTTP Response.

#### 3. What evidence supports the observation?
- Ví dụ hàm `updateHousehold` trong `households.controller.ts` kéo dài từ dòng 391 đến dòng 678 (gần 300 dòng mã trong một hàm duy nhất!).
- Hàm này tự tay so sánh từng trường dữ liệu cũ và mới (`compareFields = ["full_name", "relationship", ...]`) để phục vụ ghi log, đan xen giữa transaction CSDL và mã hóa crypto.

#### 4. What is the root cause?
Lối kiến trúc Smart Controller / Fat Controller thường gặp trong các dự án Express sơ khai, bỏ qua mô hình phân tầng tiêu chuẩn (Layered Architecture: Route -> Controller -> Service -> Repository).

#### 5. What is the impact?
- **Khó kiểm thử đơn vị (Low Testability)**: Không thể kiểm thử logic nghiệp vụ (như tính toán tuổi, phân quyền thôn, mã hóa CCCD) nếu không chạy toàn bộ máy chủ Express và CSDL SQLite thực tế.
- **Khó tái sử dụng**: Logic tìm kiếm hộ khẩu theo độ tuổi hoặc tên không dấu không thể được tái sử dụng ở các module khác (ví dụ: module báo cáo thống kê hoặc module xuất Excel) mà phải copy-paste lại.
- **Nguy cơ lỗi cao khi thay đổi**: Bất kỳ thay đổi nhỏ nào ở tầng CSDL đều ảnh hưởng trực tiếp đến controller và ngược lại.

#### 6. What should change?
- Tái cấu trúc Backend theo kiến trúc 3 tầng chuẩn:
  1. `controllers/`: Chỉ tiếp nhận HTTP request, validate dữ liệu đầu vào qua Zod schema, gọi service tương ứng và trả response.
  2. `services/`: Chứa toàn bộ logic nghiệp vụ (RBAC verification, crypto orchestration, OCC version checking, audit diff generation).
  3. `repositories/` (hoặc Prisma models wrapper): Đóng gói các câu truy vấn CSDL phức tạp.

#### 7. What should be tested?
- Viết unit test độc lập cho `HouseholdService` sử dụng mock Prisma Client, xác minh toàn bộ các quy tắc nghiệp vụ mà không cần chạy máy chủ HTTP.

#### 8. What remains uncertain?
Khối lượng công việc refactor sang mô hình phân tầng có thể lớn; cần thực hiện từng bước (bắt đầu từ `HouseholdService`).

---

## MA TRẬN ĐÁNH GIÁ RANH GIỚI HỆ THỐNG (SYSTEM BOUNDARIES MATRIX)

| Tiêu Chí Đánh Giá | Hiện Trạng Thực Tế | Đánh Giá Rủi Ro | Hướng Khắc Phục Bắt Buộc |
| :--- | :--- | :---: | :--- |
| **Ranh giới Client vs Backend** | Logic bóc tách Excel bị trùng lặp 100% ở cả 2 phía; Client gọi POST tuần tự thay vì dùng API Batch Import. | 🔴 **CRITICAL** | Chuyển toàn bộ việc xử lý file Excel sang Backend API; xóa thư viện `xlsx` khỏi Client. |
| **Ranh giới CSDL vs Business** | Controller gọi trực tiếp Prisma ORM; không có Service Layer; logic nghiệp vụ lẫn lộn trong HTTP handler. | 🟠 **HIGH** | Thiết lập tầng `services/` độc lập để tách biệt nghiệp vụ khỏi giao thức HTTP và CSDL. |
| **Ranh giới Bảo Mật & Crypto** | CCCD bị giải mã hàng loạt trong API Hộ khẩu; Blind index không dùng salt; Client chứa mật khẩu mặc định dạng rõ. | 🔴 **CRITICAL** | Ẩn CCCD khỏi API hộ khẩu; đổi sang HMAC-SHA256 có khóa; loại bỏ hoàn toàn mật khẩu nhúng cứng. |
| **Ranh giới Electron vs Web** | Mã Electron Main được cô lập tốt qua `contextBridge` và `secureStore`, nhưng CSP còn cho phép `'unsafe-eval'`. | 🟡 **MEDIUM** | Loại bỏ `'unsafe-eval'` khỏi CSP trong `index.html`; siết chặt sandbox của Electron BrowserWindow. |
| **Ranh giới State Management** | `AppContext` bị ô nhiễm bởi polling ping 3s; `householdStore` và `HouseholdsPage` phân ly làm hỏng Thùng rác. | 🔴 **CRITICAL** | Tách nhỏ Context theo tần suất thay đổi; đồng bộ `RecycleBinPage` với Backend API thực. |
| **Ranh giới Offline vs Online** | Giả lập lưu trữ `indexedDB.ts` thực chất là gọi `localStorage` 5MB; nguy cơ tràn bộ nhớ khi lưu dữ liệu lớn. | 🟠 **HIGH** | Viết lại `indexedDB.ts` sử dụng IndexedDB API thực thụ (IDB-Keyval hoặc Dexie) để lưu trữ không giới hạn. |

---

## KẾT LUẬN & ĐỀ XUẤT LỘ TRÌNH KIẾN TRÚC

Kiến trúc hiện tại của QLHK có nền móng ý tưởng tốt (cô lập phân hệ, phân quyền địa bàn, mã hóa dữ liệu công dân). Tuy nhiên, do tàn dư của giai đoạn phát triển nhanh (mock-first, demo-first), hệ thống đang mang nhiều vết nứt nghiêm trọng về phân định trách nhiệm, tính toàn vẹn trạng thái và bảo mật dữ liệu.

**3 Ưu tiên hành động kiến trúc cao nhất (Top 3 P0 Architectural Priorities):**
1. **Khắc phục ngay lập tức lỗ hổng bảo mật xác thực**: Gỡ bỏ danh sách tài khoản nhúng cứng và cơ chế đúc token giả `offline-token-*` trong `authApi.ts`.
2. **Hàn gắn đứt gãy Thùng rác (Recycle Bin)**: Đưa `RecycleBinPage` về kết nối trực tiếp với Backend API `includeDeleted=true`, loại bỏ hoàn toàn sự phụ thuộc vào `householdStore` trong `localStorage`.
3. **Bịt lỗ rò rỉ CCCD**: Dừng việc giải mã hàng loạt CCCD trong `getHouseholds` của `households.controller.ts`, trả lại quyền kiểm soát duy nhất cho API `reveal-cccd`.
