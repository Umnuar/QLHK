# HỆ THỐNG QUẢN LÝ HỘ KHẨU & NHÂN KHẨU XÃ ĐĂK HÀ (QLHK)

> **Cơ quan chủ quản:** Ủy ban nhân dân Xã Đăk Hà, Huyện Đăk Hà, Tỉnh Kon Tum  
> **Phiên bản:** `v1.0.0` (Production Ready)  
> **Giấy phép:** Bản quyền thuộc UBND Xã Đăk Hà — Mọi quyền được bảo lưu (All Rights Reserved — **Không áp dụng giấy phép MIT**)  
> **Chính sách an toàn thông tin:** Xem chi tiết tại [SECURITY.md](SECURITY.md)

---

## 1. TỔNG QUAN HỆ THỐNG

**QLHK** (Quản Lý Hộ Khẩu & Nhân Khẩu) là phân hệ trọng tâm thuộc Hệ sinh thái Số hóa Dữ liệu Công vụ Xã Đăk Hà, phục vụ công tác số hóa, tra cứu, quản lý biến động và thống kê dân cư, hộ khẩu, nhân khẩu và thành phần dân tộc trên địa bàn xã.

Hệ thống vận hành đồng bộ trên hai nền tảng:
- **Web Application** chạy trên trình duyệt hiện đại.
- **Desktop Application (Electron)** trên máy trạm làm việc của cán bộ tại UBND Xã.

Ứng dụng đáp ứng các yêu cầu khắt khe về bảo mật dữ liệu định danh công dân theo Nghị định 13/2023/NĐ-CP, hỗ trợ lưu trữ đệm ngoại tuyến (Offline IndexedDB) và phân quyền kiểm soát theo địa bàn từng thôn.

---

## 2. CÁC TÍNH NĂNG CHÍNH

### 2.1. Quản lý Hộ gia đình & Nhân khẩu Toàn diện
- **Hộ gia đình:** Theo dõi theo định danh chủ hộ, địa bàn thôn quản lý, địa chỉ cư trú, phân loại tình trạng cư trú (*Thường trú*, *Tạm trú*, *Tạm vắng*).
- **Thành viên nhân khẩu:** Quản lý mối quan hệ với chủ hộ (*Chủ hộ, Vợ/Chồng, Con đẻ, Bố/Mẹ, Anh/Chị/Em...*), ngày tháng năm sinh, giới tính, dân tộc, tôn giáo, nơi ở hiện tại và ghi chú.

### 2.2. Bảo vệ Tuyệt đối Số Căn cước công dân (CCCD)
- **Mã hóa tầng lưu trữ:** Số CCCD được mã hóa bằng thuật toán đối xứng **AES-256-GCM** với khóa bảo mật độc lập trước khi ghi vào cơ sở dữ liệu.
- **Băm tra cứu bảo mật (`cccd_hash`):** Tìm kiếm và chống trùng lặp CCCD thông qua mã băm một chiều an toàn mà không cần giải mã dữ liệu thô.
- **Che mờ chống nhìn lén:** Giao diện hiển thị mặc định `••••••••1234`, hỗ trợ cán bộ có thẩm quyền mở xem tạm thời.

### 2.3. Nhập & Xuất Dữ liệu Excel Chuẩn hóa 11 Cột
- **Tự động đối soát 11 cột chuẩn:** Nhận diện và ánh xạ chính xác mẫu biểu nhân hộ khẩu Đăk Hà (*STT, Chủ hộ/Thành viên, Họ và tên, Quan hệ, Ngày sinh, Giới tính, Dân tộc, Tôn giáo, CCCD, Địa chỉ, Ghi chú*).
- **Khung xem trước đối soát (Preview Modal):** Phân tích hợp lệ, phát hiện cảnh báo ngày sinh sai định dạng, thống kê số dòng hợp lệ trước khi bấm xác nhận nhập vào CSDL.
- **Tải biểu mẫu chuẩn (.xlsx):** Cung cấp sẵn file mẫu chuẩn Đăk Hà trực tiếp từ modal nhập liệu.

### 2.4. Khóa Lạc quan & Chống Ghi đè Dữ liệu (OCC 409)
- Quản lý phiên bản bản ghi qua trường số nguyên `version: Int`.
- Tự động phát hiện xung đột khi nhiều cán bộ cùng cập nhật một hộ gia đình hoặc nhân khẩu, ngăn chặn tuyệt đối tình trạng mất dữ liệu do ghi đè ngầm.

### 2.5. Phân quyền Theo Địa bàn Thôn (Village Scoping RBAC)
- **Cán bộ Xã (Admin):** Quản lý toàn bộ các thôn, quản lý tài khoản cán bộ, sao lưu phục hồi CSDL, xóa vĩnh viễn dữ liệu.
- **Cán bộ Cơ sở (Officer):** Chỉ được quản lý dữ liệu hộ gia đình và nhân khẩu thuộc địa bàn thôn được phân công. Mọi thao tác truy cập chéo thôn đều bị chặn từ tầng Backend (`403 Forbidden`).

### 2.6. Thùng rác & Khôi phục Dữ liệu An toàn (Recycle Bin)
- Cơ chế xóa mềm (`is_deleted: true`, `deleted_at`) bảo vệ an toàn trước các thao tác nhầm lẫn.
- Khôi phục hộ gia đình tự động khôi phục toàn bộ nhân khẩu liên kết; hỗ trợ thông báo Toast hoàn tác nhanh.

### 2.7. Báo cáo Thống kê Dân cư & Dân tộc (Analytics Dashboard)
- **4 Thẻ chỉ số tổng quan (KPI):** Tổng hộ gia đình, Tổng nhân khẩu, Cơ cấu giới tính (Nam / Nữ), Tỷ lệ Dân tộc thiểu số (DTTS).
- **Hệ thống biểu đồ phân tích:** Tháp tuổi dân số, cơ cấu dân tộc, cơ cấu tôn giáo, tình trạng cư trú.
- **Bảng tổng hợp so sánh các thôn:** Truy vấn SQL Native Aggregation hiệu năng cao, xuất báo cáo tổng hợp ra tệp Excel.

### 2.8. Nhật ký Hoạt động (Audit Log)
- Ghi vết chi tiết mọi hành vi: Khởi tạo, Cập nhật, Xóa mềm, Khôi phục, Nhập Excel.
- Bộ lọc thông minh theo địa bàn thôn, cán bộ thực hiện và khoảng thời gian.

---

## 3. KIẾN TRÚC KỸ THUẬT

```
+-------------------------------------------------------------------------------+
|                            KIẾN TRÚC HỆ THỐNG QLHK                            |
+-------------------------------------------------------------------------------+
                                        |
          +-----------------------------+-----------------------------+
          |                                                           |
          v                                                           v
+-------------------------------+                           +-------------------------------+
|    QLHK-CLIENT (Desktop/Web)  |                           |     QLHK-BACKEND (REST API)   |
|   Port: 5175 | Electron       |                           |     Port: 5002 | Express TS   |
+-------------------------------+                           +-------------------------------+
| - React 18 + Vite 5           |                           | - Node.js Express TypeScript  |
| - Tailwind CSS v4             |                           | - Prisma ORM                  |
| - Lucide React Icons          |       HTTPS / JSON        | - AES-256-GCM CCCD Crypto     |
| - Electron Main & Preload IPC | <=======================> | - JWT Authentication          |
| - Offline IndexedDB Storage   |      Bearer Token Auth    | - SQLite / PostgreSQL         |
| - Centered Floating Modals    |                           | - Native SQL Aggregations     |
| - Unified Toast Notifications |                           | - OCC Version Check           |
+-------------------------------+                           +-------------------------------+
```

### Chi tiết Ngăn xếp Công nghệ (Tech Stack)

| Thành phần | Công nghệ chính | Ghi chú |
| :--- | :--- | :--- |
| **Backend Runtime** | Node.js (v18+) | Môi trường máy chủ |
| **Backend Framework** | Express.js, TypeScript | Kiến trúc phân tầng Controller - Service |
| **Database & ORM** | Prisma ORM, SQLite / PostgreSQL | Khóa phiên bản OCC, Soft-delete |
| **Bảo mật Dữ liệu** | AES-256-GCM, SHA-256 (`cccd_hash`) | Mã hóa dữ liệu định danh CCCD |
| **Authentication** | JWT (JSON Web Tokens), bcryptjs | Thu hồi phiên `token_version` |
| **Frontend Framework** | React 18, TypeScript | Single Page Application |
| **Build Tool** | Vite 5 | Bundle tốc độ cao, tối ưu chunks |
| **Styling** | Tailwind CSS v4, CSS Variables | Dark / Light mode, lớp phủ solid không blur |
| **Desktop Runtime** | Electron | Desktop Application có menu tối giản |
| **Kiểm thử tự động** | Vitest, Testing Library, Supertest | Độ phủ 131+ test cases tự động |

---

## 4. CẤU TRÚC THƯ MỤC DỰ ÁN

```
QLHK/
├── QLHK-Backend/                 # Máy chủ REST API & Cơ sở dữ liệu
│   ├── prisma/                   # Schema Prisma & migrations CSDL
│   ├── src/
│   │   ├── config/               # Cấu hình Prisma, JWT, môi trường
│   │   ├── controllers/          # Households, Citizens, Analytics, Auth, Backup, Excel
│   │   ├── middlewares/          # Xác thực JWT, Scoping thôn, Error Handler
│   │   ├── routes/               # Định tuyến API
│   │   ├── utils/                # Mã hóa AES-256-GCM, băm CCCD, parser Excel
│   │   └── index.ts              # Điểm khởi động Express server & Graceful Shutdown
│   ├── tests/                    # Bộ kiểm thử tích hợp Backend
│   └── package.json
│
├── QLHK-Client/                  # Giao diện Web & Desktop Electron
│   ├── electron/                 # Electron Main Process & Preload IPC
│   ├── src/
│   │   ├── api/                  # Axios API clients & Interceptors
│   │   ├── components/           # Households, Common Modals, FilterBar, Excel, Audit
│   │   ├── pages/                # VillagesPage, HouseholdsPage, AnalyticsPage, Settings
│   │   ├── db/                   # IndexedDB offline storage
│   │   ├── utils/                # Tiện ích định dạng số, ngày sinh, phân tích Excel
│   │   └── App.tsx               # Cấu hình App, Routing & Theme Provider
│   ├── vite.config.ts            # Cấu hình Vite & Alias
│   └── package.json
│
├── docs/                         # Báo cáo kiểm toán kiến trúc, an ninh, CSDL, hiệu năng
├── qlhk_document.md              # Đặc tả chi tiết nghiệp vụ quản lý hộ khẩu
├── SECURITY.md                   # Chính sách an toàn thông tin & tiếp nhận lỗ hổng
└── README.md                     # Tài liệu hướng dẫn sử dụng & triển khai
```

---

## 5. HƯỚNG DẪN CÀI ĐẶT & CHẠY DỰ ÁN

### 5.1. Yêu cầu Tiên quyết (Prerequisites)
- **Node.js**: Phiên bản 18.x hoặc 20.x trở lên
- **npm**: Phiên bản 9.x hoặc 10.x trở lên
- **Hệ điều hành**: Windows 10/11, macOS hoặc Linux

### 5.2. Khởi tạo & Cài đặt Thư viện

```bash
# 1. Cài đặt dependencies cho Backend
cd QLHK-Backend
npm install

# 2. Tạo file cấu hình môi trường Backend
cp .env.example .env

# 3. Khởi tạo cơ sở dữ liệu Prisma
npx prisma generate
npx prisma db push

# 4. Cài đặt dependencies cho Client
cd ../QLHK-Client
npm install
cp .env.example .env
```

### 5.3. Khởi chạy Môi trường Phát triển (Development)

**Khởi động Backend:**
```bash
cd QLHK-Backend
npm run dev
# Máy chủ khởi động tại: http://localhost:5002
```

**Khởi động Client (Web Dev Mode):**
```bash
cd QLHK-Client
npm run dev
# Ứng dụng mở tại: http://localhost:5175
```

**Khởi động Client (Desktop Electron Mode):**
```bash
cd QLHK-Client
npm run electron:dev
```

### 5.4. Chạy Kiểm thử Tự động (Automated Tests)

```bash
# Chạy kiểm thử Backend (Supertest)
cd QLHK-Backend
npm test

# Chạy kiểm thử Frontend (Vitest - 131 tests)
cd QLHK-Client
npm test -- --run
```

### 5.5. Đóng gói Ứng dụng (Production Build)

```bash
# Build Backend
cd QLHK-Backend
npm run build

# Build Frontend Web
cd QLHK-Client
npm run build:vite

# Đóng gói bộ cài đặt Desktop Windows (.exe)
npm run build:win
```

---

## 6. QUY ĐỊNH BẢO MẬT & BÁO CÁO LỖ HỔNG

Hệ thống tuân thủ nghiêm ngặt quy trình tiếp nhận và xử lý sự cố an toàn thông tin:
- Xem chi tiết tại tệp tin [SECURITY.md](SECURITY.md).
- Không công khai lỗi hay kịch bản khai thác lên các diễn đàn công cộng.
- Mọi phát hiện an ninh xin gửi trực tiếp về email phụ trách: `admin@dulieudakha.vn`.

---

## 7. BẢN QUYỀN & ĐIỀU KHOẢN PHÁP LÝ (PROPRIETARY NOTICE)

> ### ⚠️ THÔNG BÁO BẢN QUYỀN ĐỘC QUYỀN (NO MIT LICENSE)
> 
> **Toàn bộ mã nguồn, cấu trúc dữ liệu, tài liệu kỹ thuật và thiết kế giao diện của dự án này thuộc quyền sở hữu trí tuệ của:**  
> **ỦY BAN NHÂN DÂN XÃ ĐĂK HÀ, HUYỆN ĐĂK HÀ, TỈNH KON TUM**  
> 
> **Mọi quyền được bảo lưu (All Rights Reserved).**  
> 
> - **KHÔNG ÁP DỤNG** Giấy phép Mã nguồn Mở MIT (No MIT License), Apache, GPL hoặc bất kỳ giấy phép mở tự do nào khác.
> - **NGHIÊM CẤM** mọi hành vi sao chép, trích xuất, phân phối lại, xuất bản, thương mại hóa hoặc chuyển giao mã nguồn dưới bất kỳ hình thức nào khi chưa có sự chấp thuận bằng văn bản chính thức của UBND Xã Đăk Hà.
> - Dự án được phát triển và lưu trữ phục vụ độc quyền công tác quản lý điều hành nhân hộ khẩu và chuyển đổi số công vụ của địa phương.