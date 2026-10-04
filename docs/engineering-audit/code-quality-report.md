# BÁO CÁO KIỂM TOÁN CHẤT LƯỢNG MÃ NGUỒN (CODE QUALITY AUDIT REPORT)
**Dự án**: Hệ thống Quản lý Hộ khẩu & Nhân khẩu Xã Đăk Hà (`c:\Projects\QLHK`)  
**Phân hệ khảo sát**: `QLHK-Backend`, `QLHK-Client`, `electron/`  
**Vai trò**: Agent 1 — Master Architecture & Code Quality Auditor  
**Thời điểm kiểm toán**: 2026-10-01  
**Quy chế kiểm toán**: READ-ONLY AUDIT (Không sửa đổi mã nguồn ứng dụng)  
**Tiêu chuẩn báo cáo**: Tuân thủ triệt để Meta-Rule 8 Câu Hỏi (Section 31)

---

## TỔNG QUAN ĐÁNH GIÁ CHẤT LƯỢNG MÃ NGUỒN (EXECUTIVE SUMMARY)

Toàn bộ dự án QLHK bao gồm khoảng **12.500 dòng mã** mã nguồn chính (không tính các file thư viện và test), trong đó Frontend chiếm ~8.500 dòng và Backend chiếm ~4.000 dòng. Mặc dù mã nguồn vượt qua khâu biên dịch TypeScript (`tsc --noEmit`), việc kiểm tra chất lượng tĩnh và rà soát thủ công đã phát hiện nhiều vấn đề kỹ thuật tích tụ nghiêm trọng:

1. **Sự bùng nổ các God Components / God Controllers**: Có tới 6 tệp vượt quá 600 dòng mã (đỉnh điểm là `SettingsPage.tsx` với 1.227 dòng và `AuditLogView.tsx` với 976 dòng, `households.controller.ts` với 924 dòng). Các tệp này chứa quá nhiều trạng thái, nhúng trực tiếp hàng loạt modal con và logic xử lý phức tạp trong cùng một khối.
2. **Khối lượng mã chết (Dead Code) khổng lồ**: Tồn tại ít nhất **752 dòng mã chết** hoàn toàn không được import ở bất kỳ đâu trong dự án (`ProfileCard.tsx`, `TimeCard.tsx`, `HouseholdModal.tsx`), cùng 658 dòng dữ liệu giả lập (`seedData.ts`) đang bị đính kèm trực tiếp vào gói phân phối của người dùng cuối.
3. **Cơ chế Khóa Lạc Quan (OCC) bị hổng logic TOCTOU**: Việc kiểm tra `version` được thực hiện thủ công trong bộ nhớ trước khi mở transaction thay vì kiểm tra nguyên tử bằng câu lệnh SQL `WHERE id = ? AND version = ?`, dẫn đến việc hai cập nhật đồng thời vẫn ghi đè lên nhau mà không phát hiện xung đột.
4. **Vô hiệu hóa Middleware xử lý lỗi tập trung**: Mọi controller của Backend đều bắt lỗi bằng khối `catch (error)` cục bộ và trực tiếp trả về `res.status(500)`, khiến middleware `errorHandler` của Express (chứa logic bóc tách `ZodError`, lỗi trùng lặp `P2002` và lỗi OCC `409`) không bao giờ được kích hoạt.
5. **Lạm dụng kiểu `any` và che giấu cảnh báo biên dịch**: Ghi nhận hơn 142 trường hợp sử dụng kiểu `any` không an toàn. Cấu hình `tsconfig.json` của Client chủ động tắt `noUnusedLocals: false` và `noUnusedParameters: false` để che giấu các biến mồ côi và import thừa.
6. **Hardcode dữ liệu môi trường và đường dẫn cá nhân**: Backend hardcode đường dẫn cục bộ máy tính cá nhân `C:\Users\umnuar\Downloads\Nhân hộ khẩu.xls` làm giá trị mặc định cho cấu hình, trực tiếp gây lỗi cho toàn bộ bộ test CI/CD trên máy khác.

---

## DANH MỤC CÁC PHÁT HIỆN CHẤT LƯỢNG MÃ CHI TIẾT (SECTION 31 META-RULE)

### CODE-01: Sự Bùng Nổ Của Các Component Quá Khổ (God Components)

#### 1. What did I inspect?
- `c:\Projects\QLHK\QLHK-Client\src\pages\SettingsPage.tsx` (1.227 dòng)
- `c:\Projects\QLHK\QLHK-Client\src\components\audit\AuditLogView.tsx` (976 dòng)
- `c:\Projects\QLHK\QLHK-Client\src\pages\HouseholdsPage.tsx` (863 dòng)
- `c:\Projects\QLHK\QLHK-Backend\src\controllers\households.controller.ts` (924 dòng)
- `c:\Projects\QLHK\QLHK-Client\src\components\analytics\AnalyticsDashboard.tsx` (770 dòng)
- `c:\Projects\QLHK\QLHK-Client\src\components\households\HouseholdTable.tsx` (671 dòng)

#### 2. What did I observe?
Các file trên đều vượt xa ngưỡng khuyến nghị tối đa (300-500 dòng cho 1 component React hoặc module Express). Điển hình:
- `SettingsPage.tsx` chứa 1.227 dòng mã, gom toàn bộ 4 tab chức năng (Profile cá nhân, Quản lý tài khoản cán bộ, Sao lưu/Phục hồi, Thông tin đơn vị hành chính) cùng 3 modal độc lập (Modal thêm cán bộ, Modal đặt lại mật khẩu, Modal phân công thôn) vào chung một hàm component duy nhất với hơn 20 `useState`.
- `AuditLogView.tsx` chứa 976 dòng mã, kết hợp bảng danh sách, bộ lọc nâng cao, logic tính toán diff của mảng JSON đối tượng, hiển thị cây thay đổi công dân và ngăn kéo xem chi tiết.
- `households.controller.ts` chứa 924 dòng mã, xử lý từ giải mã crypto, lọc mảng tuổi, transaction, OCC versioning đến tính toán diff audit log.

#### 3. What evidence supports the observation?
- Kích thước dòng đo lường thực tế:
  - `SettingsPage.tsx`: 1.227 dòng, 46.498 bytes.
  - `AuditLogView.tsx`: 976 dòng, 34.787 bytes.
  - `households.controller.ts`: 924 dòng, 24.330 bytes.
- Trong `SettingsPage.tsx`: Các state `isAddUserOpen`, `newUsername`, `newUserPassword`, `resetPwdUser`, `assignUser`, `communeInfo`... đều khai báo ở cấp component cha, gây re-render toàn bộ trang khi người dùng gõ từng ký tự vào modal.

#### 4. What is the root cause?
Xu hướng "tiện tay viết tiếp" (inlining) trong quá trình hoàn thiện tính năng. Thay vì tách các modal và tab thành các component con độc lập có state cục bộ, toàn bộ JSX được viết liền mạch trong component trang.

#### 5. What is the impact?
- **Hiệu năng suy giảm (Unnecessary Re-renders)**: Khi người dùng nhập liệu ở một trường input trong modal đổi mật khẩu, toàn bộ bảng danh sách cán bộ và form thông tin xã đều bị re-render lại.
- **Rủi ro hồi quy (High Regression Risk)**: Bất kỳ sửa đổi nhỏ nào cho Tab 1 cũng có nguy cơ làm lỗi Tab 4 hoặc làm hỏng các modal khác do biến trùng tên hoặc scope chồng chéo.
- **Khó bảo trì và đọc hiểu**: Một kỹ sư mới phải đọc qua hơn 1.200 dòng mã chỉ để sửa một nhãn hiển thị trong modal thêm người dùng.

#### 6. What should change?
- Tách `SettingsPage.tsx` thành thư mục mô-đun:
  - `src/pages/Settings/tabs/ProfileTab.tsx`
  - `src/pages/Settings/tabs/UsersTab.tsx`
  - `src/pages/Settings/tabs/BackupTab.tsx`
  - `src/pages/Settings/tabs/CommuneInfoTab.tsx`
  - `src/pages/Settings/modals/AddUserModal.tsx`
  - `src/pages/Settings/modals/ResetPasswordModal.tsx`
  - `src/pages/Settings/modals/AssignVillageModal.tsx`
- Tương tự, tách `AuditLogView.tsx` thành:
  - `AuditLogFilterBar.tsx`
  - `AuditLogDiffViewer.tsx`
  - `AuditLogDrawer.tsx`

#### 7. What should be tested?
- Test giao diện sau khi tách: Xác minh việc chuyển đổi mượt mà giữa các Tab trong Cài đặt, mở và đóng từng modal độc lập, giữ nguyên trạng thái dữ liệu đã nhập.
- Kiểm tra hiệu năng gõ bàn phím: Giảm thời gian frame lag từ >30ms xuống <5ms khi nhập text vào các form modal.

#### 8. What remains uncertain?
Cần kiểm tra xem có biến hoặc hàm helper nào trong `SettingsPage` đang phụ thuộc ngầm vào closure của component cha hay không.

---

### CODE-02: Tồn Tại Mã Chết (Dead Code), File Mồ Côi & Dữ Liệu Rác Trong Bundle Client

#### 1. What did I inspect?
- `c:\Projects\QLHK\QLHK-Client\src\pages\Settings\ProfileCard.tsx` (308 dòng)
- `c:\Projects\QLHK\QLHK-Client\src\pages\Settings\TimeCard.tsx` (430 dòng)
- `c:\Projects\QLHK\QLHK-Client\src\components\households\HouseholdModal.tsx` (14 dòng)
- `c:\Projects\QLHK\QLHK-Client\src\data\seedData.ts` (658 dòng)

#### 2. What did I observe?
- `ProfileCard.tsx` (308 dòng) và `TimeCard.tsx` (430 dòng) nằm trong thư mục `src/pages/Settings/`, nhưng **HOÀN TOÀN KHÔNG CÓ BẤT KỲ ĐÂU TRONG CODEBASE IMPORT CHÚNG**. Toàn bộ mã quản lý Profile và TimeCard đã được viết đè lại trực tiếp trong `SettingsPage.tsx`. Tổng cộng **738 dòng mã chết hoàn toàn**.
- `HouseholdModal.tsx` (14 dòng) là file wrapper bọc `HouseholdDrawer`, nhưng không có bất kỳ component nào import nó (`HouseholdsPage` import thẳng `HouseholdDrawer`).
- `seedData.ts` chứa 658 dòng dữ liệu giả lập (hàng chục hộ gia đình và nhân khẩu mẫu) được import vào `householdStore.ts` và `HouseholdsPage.tsx` làm dữ liệu mặc định, khiến toàn bộ dữ liệu mẫu này bị đóng gói vào file JavaScript bundle xuất bản cho người dùng thực.

#### 3. What evidence supports the observation?
- Kết quả quét grep toàn bộ project:
  - `Select-String "ProfileCard"`: Chỉ xuất hiện đúng tại file định nghĩa của nó (`ProfileCard.tsx:18, 23`). Không có bất kỳ dòng `import { ProfileCard }` nào trong toàn bộ dự án.
  - `Select-String "TimeCard"`: Chỉ xuất hiện đúng tại file định nghĩa của nó (`TimeCard.tsx:15, 430`).
  - `Select-String "HouseholdModal"`: Chỉ xuất hiện tại file định nghĩa của nó (`HouseholdModal.tsx:4, 9, 13`).
- File `seedData.ts` có kích thước 16.156 bytes, chứa dữ liệu JSON cứng.

#### 4. What is the root cause?
- Quá trình tái cấu trúc giao diện Tab Cài Đặt (chuẩn hóa theo QLCS) đã tạo ra hai component `ProfileCard` và `TimeCard`, nhưng sau đó lập trình viên quyết định gộp toàn bộ vào `SettingsPage.tsx` mà quên xóa 2 tệp ban đầu.
- `seedData.ts` được giữ lại từ giai đoạn ban đầu chưa có Backend, sau đó được dùng làm fallback khi mất mạng thay vì hiển thị trạng thái offline chuẩn hóa.

#### 5. What is the impact?
- **Tăng dung lượng tải ứng dụng**: Tăng kích thước gói cài đặt Electron và tài nguyên nạp trang của Client không cần thiết.
- **Gây nhầm lẫn nghiêm trọng cho kỹ sư bảo trì**: Kỹ sư bảo trì khi thấy thư mục `src/pages/Settings/` sẽ tưởng rằng `TimeCard.tsx` và `ProfileCard.tsx` đang chạy thật, thực hiện sửa lỗi vào 2 file này nhưng trên giao diện thực tế không có bất kỳ thay đổi nào.

#### 6. What should change?
- Xóa bỏ ngay lập tức 3 tệp mồ côi:
  - `c:\Projects\QLHK\QLHK-Client\src\pages\Settings\ProfileCard.tsx`
  - `c:\Projects\QLHK\QLHK-Client\src\pages\Settings\TimeCard.tsx`
  - `c:\Projects\QLHK\QLHK-Client\src\components\households\HouseholdModal.tsx`
- Tách `seedData.ts` sang môi trường test/mock riêng biệt (`src/__mocks__/seedData.ts`), tuyệt đối không import vào mã chạy thực tế của `HouseholdsPage.tsx`.

#### 7. What should be tested?
- Chạy `npx tsc --noEmit` và `npm run build` trên `QLHK-Client` sau khi xóa 3 tệp để đảm bảo 0 lỗi biên dịch.
- Xác minh bundle size của Client giảm tương ứng.

#### 8. What remains uncertain?
Liệu logic tính toán TimeCard trong `TimeCard.tsx` (chỉnh thời gian giả lập) có tính năng nào ưu việt hơn logic thời gian hiện tại trong `SettingsPage.tsx` cần được trích xuất lại trước khi xóa hay không.

---

### CODE-03: Lỗi Khóa Lạc Quan (OCC) Do Hiện Tượng TOCTOU Trong Cập Nhật Hộ Khẩu

#### 1. What did I inspect?
- `c:\Projects\QLHK\QLHK-Backend\src\controllers\households.controller.ts` (dòng 400-450)
- `c:\Projects\QLHK\QLHK-Backend\src\controllers\citizens.controller.ts` (dòng 374-410)
- `c:\Projects\QLHK\QLHK-Backend\prisma\schema.prisma` (dòng 50, 78)

#### 2. What did I observe?
Cơ chế Khóa Lạc Quan (Optimistic Concurrency Control - OCC) được thiết kế dựa trên cột `version` kiểu số nguyên tăng dần. Tuy nhiên, cách triển khai trong Backend mắc lỗi kinh điển **TOCTOU (Time-of-Check to Time-of-Use)**:
1. Backend thực hiện truy vấn `findUnique` lấy dữ liệu hiện tại (`current`).
2. Kiểm tra `version` gửi lên từ Client: `if (Number(version) !== current.version)`.
3. Sau đó, trong khối `prisma.$transaction`, Backend thực thi cập nhật:
   ```typescript
   await tx.households.update({
     where: { id }, // LỖI: Chỉ dùng 'id', không có điều kiện 'version'!
     data: {
       ...
       version: current.version + 1,
     },
   });
   ```

#### 3. What evidence supports the observation?
- Trong `households.controller.ts` dòng 423-448:
  ```typescript
  // Kiểm tra ngoài transaction
  if (version !== undefined && version !== null) {
    if (Number(version) !== current.version) {
      res.status(409).json({ error: "Dữ liệu hộ khẩu đã bị thay đổi bởi người dùng khác..." });
      return;
    }
  }
  ...
  // Cập nhật trong transaction
  await tx.households.update({
    where: { id }, // Câu lệnh SQL sinh ra là: UPDATE households SET version = version + 1 WHERE id = ?
    data: { ... , version: current.version + 1 }
  });
  ```
- Hoàn toàn thiếu mệnh đề so khớp điều kiện `where: { id, version: current.version }`.

#### 4. What is the root cause?
Sự ngộ nhận rằng việc kiểm tra bằng lệnh `if` trong JavaScript trước khi chạy transaction là đủ để bảo vệ tính toàn vẹn đồng thời. Trong môi trường Node.js đa luồng I/O bất đồng bộ, giữa thời điểm hàm `findUnique` hoàn tất và thời điểm `update` được gửi xuống SQLite, một request khác có thể xen vào giữa và cập nhật thành công.

#### 5. What is the impact?
- **Mất mát dữ liệu do ghi đè ngầm (Lost Updates)**: Khi hai cán bộ cùng mở một hộ gia đình trên hai máy trạm và cùng bấm "Lưu":
  - Cán bộ A gửi request với version = 1.
  - Cán bộ B gửi request với version = 1.
  - Cả hai request đều vượt qua lệnh `if (Number(version) !== current.version)`.
  - Cả hai đều thực thi lệnh `update`. Request đến sau sẽ ghi đè toàn bộ thay đổi của request đến trước, và `version` bị nhảy số sai lệch mà không có bất kỳ thông báo lỗi 409 nào được trả về cho Client.

#### 6. What should change?
- Cập nhật câu lệnh update của Prisma sử dụng điều kiện nguyên tử:
  ```typescript
  const result = await tx.households.updateMany({
    where: { id, version: Number(version) },
    data: {
      ...updateFields,
      version: { increment: 1 },
    },
  });
  if (result.count === 0) {
    throw new Error("OCC_CONFLICT");
  }
  ```
- Đồng thời áp dụng cơ chế tương tự cho bảng `citizens`.

#### 7. What should be tested?
- Test chạy 2 request `PUT /api/households/:id` song song cùng gửi `version: 1`: Request thứ nhất phải trả về `200 OK` (version nâng lên 2), request thứ hai bắt buộc phải nhận lỗi `409 Conflict`.

#### 8. What remains uncertain?
Prisma SQLite có hỗ trợ `updateMany` trả về số bản ghi thay đổi một cách nhất quán trên tất cả phiên bản SQLite hay không. (Đã xác minh Prisma `updateMany` trả về `{ count: number }`).

---

### CODE-04: Đứt Gãy Kiến Trúc Xử Lý Lỗi & Nuốt Lỗi Hệ Thống Thành Generic 500

#### 1. What did I inspect?
- `c:\Projects\QLHK\QLHK-Backend\src\middlewares\error.middleware.ts` (dòng 4-55)
- `c:\Projects\QLHK\QLHK-Backend\src\controllers\households.controller.ts` (dòng 233, 271, 385, 674, 746, 809, 878, 919)
- `c:\Projects\QLHK\QLHK-Backend\src\controllers\citizens.controller.ts` (dòng 137, 182, 231, 348, 476, 530)
- `c:\Projects\QLHK\QLHK-Backend\src\controllers\users.controller.ts` (dòng 38, 116, 171, 226, 300)
- `c:\Projects\QLHK\QLHK-Backend\src\controllers\villages.controller.ts` (dòng 39, 92, 161, 227)

#### 2. What did I observe?
- Backend đã xây dựng sẵn một middleware xử lý lỗi tập trung rất chi tiết tại `error.middleware.ts`: Tự động nhận diện lỗi xác thực `ZodError` trả về 400 kèm chi tiết trường lỗi; nhận diện lỗi OCC trả về 409; nhận diện lỗi vi phạm ràng buộc duy nhất của Prisma `P2002` trả về 409; nhận diện `P2025` trả về 404.
- **TUY NHIÊN, MIDDLEWARE NÀY KHÔNG BAO GIỜ ĐƯỢC CHẠY CHO CÁC CONTROLLER CHÍNH**: 100% các hàm trong `households.controller.ts`, `citizens.controller.ts`, `users.controller.ts`, `villages.controller.ts` đều bọc toàn bộ mã trong `try/catch` cục bộ, và trong khối `catch`, lập trình viên gọi:
  ```typescript
  console.error("Lỗi ...:", error);
  res.status(500).json({ error: "Lỗi máy chủ khi..." });
  ```
  hoàn toàn không gọi `next(error)`!

#### 3. What evidence supports the observation?
- Toàn bộ 24 hàm handler trong 4 controller trên đều kết thúc bằng:
  `res.status(500).json({ error: "..." })`
- Không có bất kỳ dòng nào gọi `next(error)`.
- Kết quả kiểm tra test: Khi xảy ra lỗi trùng mã định danh hộ hoặc lỗi validation, client luôn nhận về mã HTTP 500 mơ hồ thay vì mã 400 hoặc 409 chuẩn REST.

#### 4. What is the root cause?
Thói quen lập trình phòng thủ sai cách (Defensive catch-all anti-pattern). Lập trình viên cố gắng bắt lỗi cục bộ để tránh crash tiến trình nhưng lại vô tình nuốt mất kiểu lỗi gốc và triệt tiêu tầng xử lý lỗi tập trung của Express framework.

#### 5. What is the impact?
- **Khó khăn cho Frontend xử lý lỗi**: Khi cán bộ nhập một tên đăng nhập đã tồn tại hoặc mã hộ đã trùng trong CSDL, backend trả về 500 "Lỗi máy chủ nội bộ" thay vì 409 "Dữ liệu đã tồn tại". Frontend không thể hiển thị thông báo chính xác cho người dùng mà chỉ hiện "Lỗi hệ thống".
- **Làm tê liệt khả năng giám sát (Observability Blindspot)**: Mọi lỗi nghiệp vụ (như trùng lặp, sai định dạng) đều bị quy thành lỗi 500, làm sai lệch các chỉ số đo lường độ tin cậy và báo động sai cho đội ngũ vận hành.

#### 6. What should change?
- Thay thế các khối `catch` cục bộ trong toàn bộ controllers:
  Chuyển từ `res.status(500).json(...)` sang `next(error)`.
- Áp dụng các thư viện tiện ích như `express-async-handler` hoặc middleware bọc bất đồng bộ để tự động đẩy ngoại lệ về `error.middleware.ts`.
- Bổ sung định nghĩa các Custom Error Classes (`AppError`, `NotFoundError`, `ConflictError`, `ValidationError`).

#### 7. What should be tested?
- Test gửi dữ liệu trùng `username` lên `POST /api/users`: Phải nhận về HTTP 409 kèm mã `P2002` qua `errorHandler`.
- Test gửi dữ liệu không hợp lệ: Phải nhận về HTTP 400 với cấu trúc `details` rõ ràng.

#### 8. What remains uncertain?
Liệu có endpoint nào đang cố tình dựa vào thông báo lỗi tiếng Việt được hardcode trong controller hay không.

---

### CODE-05: Lạm Dụng Kiểu `any` & Triệt Tiêu Cảnh Báo TypeScript

#### 1. What did I inspect?
- `c:\Projects\QLHK\QLHK-Client\tsconfig.json` (dòng 14-15)
- `c:\Projects\QLHK\QLHK-Client\src` (103 vị trí sử dụng `any`)
- `c:\Projects\QLHK\QLHK-Backend\src` (39 vị trí sử dụng `any`)

#### 2. What did I observe?
- Trong `QLHK-Client/tsconfig.json`:
  ```json
  "noUnusedLocals": false,
  "noUnusedParameters": false,
  ```
  Hai cờ này bị tắt có chủ đích để trình biên dịch không báo lỗi khi có biến mồ côi, import thừa hoặc tham số không dùng.
- Có tổng cộng **142 vị trí sử dụng kiểu `any`** trong mã nguồn thực tế (chưa tính thư mục test):
  - Ép kiểu không an toàn khi lọc: `relationship as any`, `gender as any`.
  - Định nghĩa state lỏng lẻo: `const [parsedRows, setParsedRows] = useState<any[]>([]);`.
  - Tham số hàm: `function formatHouseholdWithDecryptedCitizens(household: any)`.
  - Ép kiểu đối tượng Prisma: `const where: any = {};`, `const updateData: any = {};`.
  - Sử dụng non-null assertion nguy hiểm: `targetYear - maxA!`, `targetYear - minA!`.

#### 3. What evidence supports the observation?
- Kết quả lệnh đếm tự động:
  - Backend: 39 trường hợp `any`.
  - Client: 103 trường hợp `any`.
- Các file có mật độ `any` dày đặc nhất: `households.controller.ts`, `excelParser.ts`, `HouseholdDrawer.tsx`, `HouseholdsPage.tsx`.

#### 4. What is the root cause?
Lập trình viên sử dụng `any` để giải quyết nhanh các xung đột kiểu dữ liệu giữa Prisma generated types (vốn sử dụng nullability chặt chẽ) và Client custom types, thay vì xây dựng các interface mapping hoặc DTO rõ ràng.

#### 5. What is the impact?
- **Mất tính an toàn kiểu (Type Safety Illusion)**: Mặc dù lệnh `tsc --noEmit` báo 0 lỗi, ứng dụng vẫn có thể gặp lỗi runtime `TypeError: Cannot read properties of undefined` khi dữ liệu thực tế từ CSDL hoặc Excel thiếu một số trường mà `any` đã che giấu.
- Trình soạn thảo (IDE) không thể hỗ trợ autocomplete, gợi ý tham số hay tự động đổi tên biểu tượng (refactoring).

#### 6. What should change?
- Bật lại tính nghiêm ngặt trong `QLHK-Client/tsconfig.json`:
  `"noUnusedLocals": true`, `"noUnusedParameters": true`.
- Thay thế các kiểu `any` bằng kiểu chính xác:
  - Dùng `Prisma.householdsWhereInput` thay cho `where: any`.
  - Dùng `ParsedExcelRow[]` thay cho `any[]` trong state import Excel.
  - Sử dụng Type Narrowing / Type Guards thay vì ép kiểu `as any`.
  - Loại bỏ các dấu chấm than `!` (non-null assertion), thay bằng việc kiểm tra `if (minA !== undefined)`.

#### 7. What should be tested?
- Chạy `npx tsc --noEmit` sau khi bật `noUnusedLocals: true`: Xác định và dọn dẹp sạch toàn bộ các import và biến mồ côi phát sinh.

#### 8. What remains uncertain?
Mức độ phức tạp khi gõ kiểu đầy đủ cho các cấu trúc query lồng nhau của Prisma trong `households.controller.ts`.

---

### CODE-06: N+1 Database Queries & Thuật Toán Lọc Tuổi Không Dùng Index

#### 1. What did I inspect?
- `c:\Projects\QLHK\QLHK-Backend\src\controllers\households.controller.ts` (dòng 138-165, 551-564, 861-871)
- `c:\Projects\QLHK\QLHK-Backend\src\utils\audit.ts` (dòng 23-32)

#### 2. What did I observe?
- **Lọc tuổi tạo câu truy vấn khổng lồ**: Để lọc hộ dân theo độ tuổi (ví dụ: tuổi lao động từ 18 đến 60), mã nguồn sinh ra một mảng gồm 42 mệnh đề `OR` chứa chuỗi ký tự năm sinh:
  ```typescript
  citizenSomeConditions.OR = validYears.map((y) => ({
    dob: { contains: String(y) },
  }));
  ```
  Vì trường `dob` là kiểu chuỗi (`String?`) và mệnh đề sử dụng `contains` (tương đương `LIKE '%YYYY%'` trong SQL), SQLite buộc phải thực hiện quét toàn bộ bảng (Full Table Scan), không thể sử dụng index.
- **N+1 Queries trong Ghi Log & Bulk Action**:
  - Khi xóa hàng loạt hộ gia đình (`batchDeleteHouseholds`): Mã nguồn chạy vòng lặp tuần tự gọi `await logAudit(...)` cho từng hộ một (dòng 861-871).
  - Bên trong `logAudit` (dòng 25-28): Mỗi lần ghi log lại thực hiện thêm một câu truy vấn `prisma.users.findUnique` để kiểm tra `validUserId`.
  - Khi xóa 50 hộ dân, hệ thống thực hiện 100 câu truy vấn CSDL tuần tự riêng rẽ!
  - Trong `updateHousehold` (dòng 551-564): Xóa các nhân khẩu không còn trong hộ bằng vòng lặp `for (const c of citizensToDelete) { await tx.citizens.update(...) }` thay vì một lệnh `updateMany`.

#### 3. What evidence supports the observation?
- Đoạn mã thực tế tại `households.controller.ts`:
  ```typescript
  // Lọc tuổi: Sinh 80 mệnh đề LIKE nếu khoảng tuổi từ 0 đến 80!
  for (let y = Math.max(1900, minBirthYear); y <= maxBirthYear; y++) {
    validYears.push(y);
  }
  citizenSomeConditions.OR = validYears.map((y) => ({ dob: { contains: String(y) } }));
  ```
  ```typescript
  // N+1 Sequential Audit Logging:
  for (const h of households) {
    await logAudit({...}); // Mỗi lần gọi lại query users.findUnique!
  }
  ```

#### 4. What is the root cause?
- Trường ngày sinh `dob` được thiết kế dưới dạng chuỗi tự do (nhận cả `15/08/1990`, `05/1985`, `1960`) mà không có cột số nguyên phụ trợ `birth_year` để đánh chỉ mục.
- Thiếu kiến thức về tối ưu hóa truy vấn hàng loạt (Batch Operations) trong ORM.

#### 5. What is the impact?
- **Suy giảm hiệu năng nghiêm trọng khi dữ liệu lớn**: Với 23.000+ nhân khẩu (quy mô thực tế của xã Đăk Hà), một câu truy vấn có 40 mệnh đề `LIKE '%YYYY%'` lồng trong subquery `EXISTS` sẽ tiêu tốn hàng trăm milliseconds CPU và khóa database SQLite, làm đơ các thao tác ghi khác.
- Thao tác xóa hàng loạt hoặc cập nhật hộ dân đông nhân khẩu bị chậm rõ rệt (có thể mất 1-3 giây cho mỗi thao tác lưu).

#### 6. What should change?
- Bổ sung trường `birth_year Int?` vào model `citizens` trong `schema.prisma` và đánh chỉ mục `@@index([birth_year])`. Khi đó, câu lệnh lọc tuổi chỉ còn là một biểu thức đơn giản và cực nhanh:
  `where: { birth_year: { gte: minBirthYear, lte: maxBirthYear } }`.
- Thay thế vòng lặp ghi audit log tuần tự bằng `prisma.audit_logs.createMany`.
- Thay thế vòng lặp cập nhật nhân khẩu bằng `prisma.citizens.updateMany`.

#### 7. What should be tested?
- Chạy benchmark đo thời gian thực thi của `getHouseholds` với bộ lọc tuổi 18-60 trên bộ dữ liệu giả lập 20.000 bản ghi trước và sau khi bổ sung cột `birth_year`.
- Đo thời gian hoàn tất của thao tác xóa 50 hộ: Phải hoàn thành dưới 50ms thay vì hàng giây.

#### 8. What remains uncertain?
Nếu cập nhật `schema.prisma` để thêm cột `birth_year`, cần có script trích xuất năm sinh từ chuỗi `dob` hiện có để cập nhật dữ liệu lịch sử.

---

### CODE-07: Hardcoded Magic Numbers, Năm Tính Toán & Đường Dẫn Cục Bộ Windows

#### 1. What did I inspect?
- `c:\Projects\QLHK\QLHK-Backend\src\config\env.ts` (dòng 17-19)
- `c:\Projects\QLHK\QLHK-Client\src\pages\ExcelPage.tsx` (dòng 151)
- `c:\Projects\QLHK\QLHK-Client\src\pages\HouseholdsPage.tsx` (dòng 597)
- `c:\Projects\QLHK\QLHK-Client\src\components\households\HouseholdTable.tsx` (dòng 474, 544)
- `c:\Projects\QLHK\QLHK-Client\src\store\householdStore.ts` (dòng 248, 266, 379)
- `c:\Projects\QLHK\QLHK-Client\src\utils\date.ts` (dòng 172)

#### 2. What did I observe?
- **Đường dẫn cá nhân hardcoded trong Backend**:
  ```typescript
  excelSamplePath:
    process.env.EXCEL_SAMPLE_PATH ||
    "C:\\Users\\umnuar\\Downloads\\Nhân hộ khẩu.xls",
  ```
  Đây là nguyên nhân trực tiếp khiến 6 bài kiểm thử tại `tests/api.test.ts` và `tests/excel-parser.test.ts` bị thất bại khi chạy trên bất kỳ môi trường nào không có đúng đường dẫn file này.
- **Năm tính toán bị hardcode thành con số 2026**:
  Mặc dù hệ thống đã có tính năng chọn năm tính toán `calculationYear` trong `AppContext`, rất nhiều nơi trong mã nguồn vẫn hardcode số `2026`:
  - `ExcelPage.tsx`: `age = calculateAge(dobFormatted, 2026);`
  - `HouseholdsPage.tsx`: `age = calculateAge(dobFormatted, 2026);`
  - `householdStore.ts`: `const age = calculateAge(dobRaw, 2026);`
  - `date.ts`: Tham số mặc định của hàm tính tuổi là `targetYear = 2026`.

#### 3. What evidence supports the observation?
- Kết quả chạy `npm test` ở Backend: Lỗi `ENOENT: no such file or directory, open 'C:\Users\umnuar\Downloads\Nhân hộ khẩu.xls'`.
- Kết quả tìm kiếm chuỗi `2026` trong Client: Xuất hiện tại hơn 25 vị trí trong các hàm tính toán nghiệp vụ.

#### 4. What is the root cause?
- Lập trình viên lấy nhanh file từ thư mục Downloads cá nhân để test cục bộ rồi commit thẳng vào code.
- Tính năng `calculationYear` được đưa vào sau, nhưng các hàm tính toán cũ chưa được refactor để nhận tham số năm động từ context.

#### 5. What is the impact?
- Bộ test suite Backend bị gãy trên CI/CD hoặc máy của kỹ sư khác.
- Khi người dùng sử dụng bộ chọn năm `YearSelector` để dự phóng tương lai (ví dụ chọn năm 2028 để rà soát tuổi NVQS hoặc tuổi bầu cử), các thành phần ở `ExcelPage` hoặc `HouseholdDrawer` vẫn tính toán tuổi theo năm 2026, dẫn đến sai lệch số liệu nghiệp vụ.

#### 6. What should change?
- Chuyển file `Nhân hộ khẩu.xls` vào thư mục `QLHK-Backend/tests/fixtures/sample.xls` và cấu hình đường dẫn tương đối trong `env.ts`.
- Chuẩn hóa hàm `calculateAge`: Nếu không truyền `targetYear`, mặc định lấy `new Date().getFullYear()`, không được gán cứng bất kỳ năm nào.
- Truyền đúng `calculationYear` từ `useApp()` vào toàn bộ các lời gọi tính tuổi trên giao diện.

#### 7. What should be tested?
- Chạy lại test suite Backend: 6 bài test lỗi phải chuyển sang màu xanh (PASS) khi dùng fixture đường dẫn tương đối.
- Test đổi năm tính toán sang 2030: Xác minh độ tuổi của công dân sinh năm 2012 hiển thị đúng 18 tuổi trên toàn bộ các màn hình.

#### 8. What remains uncertain?
Liệu có tài liệu quy chuẩn nào của cơ quan quản lý yêu cầu cố định mốc thời gian năm 2026 hay không.

---

### CODE-08: Rung Lắc & Cắt Cụt Menu Thả Xuống (Dropdown Clipping) Trong CustomSelect

#### 1. What did I inspect?
- `c:\Projects\QLHK\QLHK-Client\src\components\common\CustomSelect.tsx` (dòng 58, 103-109, 308-313)
- `c:\Projects\QLHK\QLHK-Client\src\components\households\HouseholdTable.tsx` (dòng 230-260)
- `c:\Projects\QLHK\QLHK-Client\src\components\households\HouseholdDrawer.tsx` (dòng 300-380)

#### 2. What did I observe?
- Component `CustomSelect` hiển thị menu thả xuống (dropdown listbox) bằng định vị tương đối/tuyệt đối cục bộ:
  ```tsx
  <div className={`relative w-full ${containerClassName}`} ref={containerRef}>
    ...
    {isOpen && (
      <div className={`absolute left-0 right-0 z-[120] ${openUpward ? "bottom-full mb-1.5" : "top-full mt-1.5"} ...`}>
    )}
  </div>
  ```
- Component hoàn toàn **không sử dụng React Portal (`createPortal`)** để render dropdown ra ngoài cây DOM chính (`document.body`).
- Logic tự động lật hướng `openUpward` chỉ tính toán dựa trên chiều cao cửa sổ trình duyệt (`spaceBelow < 240`), hoàn toàn không tính toán giới hạn cuộn (bounding box) của container cha.

#### 3. What evidence supports the observation?
- Trong `HouseholdDrawer.tsx`, nội dung form được bọc trong một container cuộn:
  `overflow-y-auto max-h-[calc(100vh-...)]`.
- Trong `HouseholdTable.tsx`, bảng dữ liệu được bọc trong container cuộn ngang:
  `overflow-x-auto`.
- Khi `CustomSelect` mở ra gần cạnh dưới của Drawer hoặc trong ô của Table, menu thả xuống bị cắt cụt (clipped) bởi đường biên `overflow: hidden` / `overflow: auto` của thẻ cha, hoặc gây xuất hiện thanh cuộn phụ không mong muốn.

#### 4. What is the root cause?
Không sử dụng kỹ thuật Floating UI / React Portal cho các thành phần popover/dropdown có mức độ phân cấp DOM sâu.

#### 5. What is the impact?
- **Trải nghiệm người dùng bị hỏng (Broken UX)**: Cán bộ không thể nhìn thấy hoặc không thể bấm chọn các mục nằm ở phía dưới của danh sách chọn dân tộc hoặc thôn trong Drawer do bị container cha che khuất.
- Giao diện bị méo mó, giật thanh cuộn khi người dùng click mở dropdown.

#### 6. What should change?
- Nâng cấp `CustomSelect` sử dụng `createPortal` để đưa menu dropdown ra ngoài thẻ `document.body` (hoặc sử dụng thư viện chuẩn nhẹ như `@floating-ui/react` hoặc tính toán tọa độ `fixed`).
- Tính toán tọa độ hiển thị qua `getBoundingClientRect()` của nút trigger để đặt vị trí chính xác không phụ thuộc vào `overflow` của component cha.

#### 7. What should be tested?
- Test mở dropdown dân tộc tại mục nhân khẩu cuối cùng trong `HouseholdDrawer`: Toàn bộ danh sách 14 dân tộc phải hiển thị nổi trọn vẹn lên trên màn hình mà không làm xuất hiện thanh cuộn dọc phụ.

#### 8. What remains uncertain?
Việc chuyển sang Portal có ảnh hưởng đến khả năng điều hướng bàn phím (Tab/Arrow keys) trong các bài test hiện có của `CustomSelect.test.tsx` hay không.

---

## BẢNG TỔNG HỢP MỨC ĐỘ NGHIÊM TRỌNG (DEFECT SEVERITY MATRIX)

| Mã Phát Hiện | Lĩnh Vực / Tệp Tin | Vấn Đề Trọng Tâm | Mức Độ | Trách Nhiệm Phân Công |
| :--- | :--- | :--- | :---: | :--- |
| **CODE-01** | `SettingsPage.tsx`, `AuditLogView.tsx` | God Component quá khổ (>1.000 dòng), nhúng modal, re-render tràn lan. | 🟠 **HIGH** | Agent 1 & Agent 4 (UI/UX) |
| **CODE-02** | `ProfileCard.tsx`, `TimeCard.tsx`, `seedData.ts` | 738 dòng mã chết mồ côi; 658 dòng dữ liệu rác đính kèm bundle client. | 🟠 **HIGH** | Agent 1 (Cleanup) |
| **CODE-03** | `households.controller.ts`, `citizens.controller.ts` | Khóa lạc quan (OCC) bị hổng TOCTOU, ghi đè ngầm mất dữ liệu khi sửa đồng thời. | 🔴 **CRITICAL** | Agent 3 (Database) |
| **CODE-04** | Toàn bộ Controllers Backend, `error.middleware.ts` | Nuốt lỗi thành 500 cục bộ, triệt tiêu tầng xử lý lỗi tập trung của Express. | 🟠 **HIGH** | Agent 1 & Agent 5 (Reliability) |
| **CODE-05** | `tsconfig.json`, toàn bộ codebase | 142 vị trí kiểu `any`, tắt cờ cảnh báo biên dịch `noUnusedLocals: false`. | 🟡 **MEDIUM** | Agent 1 (Refactor) |
| **CODE-06** | `households.controller.ts`, `crypto.ts` | Lọc tuổi sinh 80 mệnh đề LIKE un-indexed; N+1 query tuần tự khi xóa và ghi log. | 🔴 **CRITICAL** | Agent 3 (Database & Perf) |
| **CODE-07** | `env.ts`, `date.ts`, các màn hình client | Hardcode path cá nhân làm gãy CI/CD; hardcode năm 2026 làm sai dự báo. | 🟠 **HIGH** | Agent 6 (Test & Release) |
| **CODE-08** | `CustomSelect.tsx`, `HouseholdDrawer.tsx` | Menu dropdown bị container cha cắt cụt do thiếu React Portal. | 🟡 **MEDIUM** | Agent 4 (UI/UX) |

---

## HUY HIỆU ĐÁNH GIÁ CHẤT LƯỢNG (QUALITY GATE STATUS)

```markdown
[Quality Gate Status]
• Docs Verified: ["qlhk_document.md", "behavior-baseline.md", "GRAPH_REPORT.md"]
• Code Intelligence: [GitNexus graph analysis + Graphify community analysis]
• LSP Diagnostics: [PASS: 0 compiler errors (Nhưng do tsconfig tắt noUnusedLocals)]
• Linter & Format: [142 'any' warnings, 738 LOC dead code identified]
• Test / Visual: [FAIL: 6 backend tests (path issue), 5 client suites (vitest config issue)]
```

---

## LỘ TRÌNH TỐI ƯU HÓA MÃ NGUỒN ĐỀ XUẤT (ACTIONABLE REFACTORING ROADMAP)

1. **Giai đoạn 1 — Dọn dẹp & Khắc phục Test (Day 1)**:
   - Di dời file mẫu Excel vào thư mục `tests/fixtures/` tương đối, sửa `env.ts` để đưa toàn bộ 77 bài test Backend về trạng thái XANH (100% Pass).
   - Xóa bỏ 738 dòng mã chết (`ProfileCard.tsx`, `TimeCard.tsx`, `HouseholdModal.tsx`).
2. **Giai đoạn 2 — Sửa lỗi tính toàn vẹn dữ liệu & Lỗi OCC (Day 2)**:
   - Sửa câu lệnh cập nhật của `households.controller.ts` thành câu lệnh so khớp nguyên tử `WHERE id = ? AND version = ?`.
   - Chuẩn hóa lỗi trả về trong controllers: Chuyển sang `next(error)` để kích hoạt `errorHandler` tập trung.
3. **Giai đoạn 3 — Phân tách God Components & Tối ưu hiệu năng (Day 3)**:
   - Tách `SettingsPage.tsx` thành 4 tab độc lập và các modal con.
   - Thêm cột `birth_year` có index vào database để thay thế thuật toán lọc tuổi bằng mảng LIKE chuỗi.
   - Bổ sung `createPortal` cho `CustomSelect.tsx`.
