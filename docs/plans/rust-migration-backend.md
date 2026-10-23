# KẾ HOẠCH DI CHUYỂN BACKEND QLHK SANG RUST (AXUM + SQLX + TOKIO)

## 1. MỤC TIÊU VÀ PHẠM VI
- Xây dựng dịch vụ Backend Rust hiệu năng cao tại `QLHK/QLHK-Backend-Rust`.
- Chạy thử nghiệm trên cổng **5012** song song với Node.js backend (cổng **5002**).
- Kết nối cùng cơ sở dữ liệu PostgreSQL (schema `qlhk`).
- Đảm bảo 100% tương thích dữ liệu và API Contract với Node.js.

## 2. BẤT BIẾN KỸ THUẬT (P0 INVARIANTS)
- **Crypto Parity Tuyệt đối**:
  - Mã hóa AES-256-GCM định dạng: `<ivHex>:<authTagHex>:<ciphertextHex>` (IV 12 bytes = 24 hex, AuthTag 16 bytes = 32 hex, Ciphertext hex).
  - Key derivation: Nếu chuỗi khóa là 64 ký tự hex -> đọc trực tiếp 32 bytes hex. Nếu khác -> SHA-256 băm chuỗi khóa thành 32 bytes.
  - Băm `cccd_hash`: HMAC-SHA256 với secret pepper `qlhk-dakha-cccd-pepper-secret-2026-v2-production-key`.
  - Khử dấu tiếng Việt: chuyển `đ`/`Đ` -> `d`, chuẩn hóa NFD, loại bỏ dấu thanh, lowercase, trim.
- **Zero Comments in Code**: Tuyệt đối không viết comment trong toàn bộ code Rust (`//`, `/* */`).
- **Data Parity 100%**: Trả về đúng cấu trúc JSON bao gồm trường `dob`, `cccd` đã giải mã (hoặc mã hóa theo role), `citizens[]`, `is_head`, `version`.

## 3. PHÂN CHIA SUBAGENT BACKEND (B1 - B4)
Backend Agent chủ động sinh hoặc điều phối các Subagent sau:

### Subagent B1: CCCD Crypto & Security Core (`crypto`)
- Crate: `aes-gcm`, `hmac`, `sha2`, `hex`, `deunicode`, `jsonwebtoken`.
- Triển khai module `crypto.rs` với:
  - `encrypt_cccd(plain: &str, key: &[u8], pepper: &str) -> (String, String, String)`
  - `decrypt_cccd(encrypted: &str, key: &[u8]) -> Result<String, CryptoError>`
  - `hash_cccd(plain: &str, pepper: &str) -> String`
  - `remove_accents(name: &str) -> String`
- Viết unit test chéo:
  - Giải mã chuỗi mã hóa CCCD do Node.js sinh ra.
  - Mã hóa ở Rust, kiểm tra giải mã thành công ở Node.js.
  - Kiểm tra `cccd_hash` khớp từng ký tự với Node.js HMAC-SHA256.

### Subagent B2: Database Models & Households / Citizens Engine
- Crate: `sqlx` (với `postgres`, `runtime-tokio`, `uuid`, `chrono`, `macros`).
- Cấu hình connection pool tới PostgreSQL schema `qlhk`.
- Endpoint Quản lý Hộ khẩu (`/api/households`):
  - `GET /api/households`: Lọc `village_id`, `status`, `search`, phân trang, kèm danh sách `citizens[]` (sắp xếp `is_head DESC, stt ASC`).
  - `GET /api/households/:id`: Chi tiết hộ và thành viên.
  - `POST /api/households`: Tạo hộ mới + chủ hộ / nhân khẩu trong 1 database transaction.
  - `PUT /api/households/:id`: Cập nhật thông tin hộ, kiểm soát xung đột OCC `version`.
  - `DELETE /api/households/:id`: Xóa mềm hộ và nhân khẩu.
  - `POST /api/households/:id/split`: Tách hộ (giao dịch nguyên tử).
  - `POST /api/households/:id/merge`: Nhập hộ (giao dịch nguyên tử).
  - `POST /api/households/:id/change-head`: Đổi chủ hộ.
- Endpoint Quản lý Nhân khẩu (`/api/citizens`):
  - CRUD nhân khẩu, tự động tính `name_unaccented`, `cccd_hash`, `cccd_last4`, mã hóa `cccd`.

### Subagent B3: Policy Chúc Thọ, HTXH & Analytics Engine
- Quản lý Chúc Thọ (`/api/policies/chuctho`):
  - Lọc công dân >= 60 tuổi, phân loại mốc 5 năm (`age60`..`age_over_100`).
  - Lọc theo ngày sinh (`dob`, `day`, `month`).
  - Cập nhật trạng thái nhận quà `received`.
- Quản lý Hưu Trí Xã Hội (`/api/policies/htxh`):
  - Lọc hồ sơ có `huu_tri = "x"` (nghề nghiệp liên quan đến hưu).
- Đồng bộ Chính sách (`POST /api/policies/sync`):
  - Tự động quét từ `citizens` và upsert vào `chuctho_profiles` và `htxh_profiles`.
- Thống kê Dân số & Chính sách (`/api/analytics/overview`):
  - Thống kê tổng số hộ, nhân khẩu, cơ cấu dân tộc, tôn giáo, tháp tuổi.

### Subagent B4: Shadow Parity Tester
- Viết test suite so khớp:
  - Gửi request song song tới `http://localhost:5002` (Node) và `http://localhost:5012` (Rust).
  - So khớp JSON response cho các trường quan trọng: số lượng bản ghi, mã lỗi, định dạng `cccd`, mảng `citizens`.

## 4. DANH MỤC CRATE KHỞI TẠO (Cargo.toml)
```toml
[package]
name = "qlhk-backend-rust"
version = "0.1.0"
edition = "2024"

[dependencies]
axum = { version = "0.8", features = ["macros"] }
tokio = { version = "1.43", features = ["full"] }
sqlx = { version = "0.8", features = ["runtime-tokio", "postgres", "uuid", "chrono", "macros"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
uuid = { version = "1.13", features = ["v4", "serde"] }
chrono = { version = "0.4", features = ["serde"] }
aes-gcm = "0.10"
hmac = "0.12"
sha2 = "0.10"
hex = "0.4"
jsonwebtoken = "9.3"
dotenvy = "0.15"
tower-http = { version = "0.6", features = ["cors", "trace"] }
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter"] }
```
