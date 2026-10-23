# Task Progress Tracker: Hoàn thiện 100% QLHK-Backend-Rust

- **Project**: Hoàn thiện 100% QLHK-Backend-Rust
- **Base Branch**: `feat/rust-migration`
- **Branch**: `feat/rust-migration`
- **Plan Reference**: `QLHK/docs/plans/qlhk-rust-backend-complete.task.md`
- **Status Legend**:
  - `[ ]` Pending
  - `[/]` In Progress
  - `[x]` Completed
  - `[!]` Blocked (Circuit Breaker Tripped)

## Execution Checklist

- [x] Step 1: Subagent B1 - Auth & Session Engine (`/api/auth/login`, `/me`, `/refresh`, `/logout`, `/ping`)
  - Target Files: `QLHK/QLHK-Backend-Rust/src/handlers/auth.rs`, `QLHK/QLHK-Backend-Rust/src/models/auth.rs`
  - Scope: Login với bcrypt/sha256 verify, sinh JWT accessToken + refreshToken, lưu `refresh_tokens`, refresh rotate, me endpoint, logout, ping endpoint
  - Verification: `cargo test --test auth_test` hoặc curl tests
  - Compiler Gate: `cargo check` 0 errors
- [x] Step 2: Subagent B2 - Quản lý Danh mục Thôn & Tài khoản (`/api/villages`, `/api/users`)
  - Target Files: `QLHK/QLHK-Backend-Rust/src/handlers/villages.rs`, `QLHK/QLHK-Backend-Rust/src/models/village.rs`, `QLHK/QLHK-Backend-Rust/src/handlers/users.rs`, `QLHK/QLHK-Backend-Rust/src/models/user.rs`
  - Scope: CRUD thôn kèm count hộ khẩu/nhân khẩu, CRUD users kèm bcrypt hash, đổi mật khẩu, phân quyền role/module_access
  - Verification: `cargo check` 0 errors
- [x] Step 3: Subagent B3 - Audit Logging Engine (`/api/audit` & helper `record_audit`)
  - Target Files: `QLHK/QLHK-Backend-Rust/src/handlers/audit.rs`, `QLHK/QLHK-Backend-Rust/src/models/audit.rs`, `QLHK/QLHK-Backend-Rust/src/utils/audit.rs`
  - Scope: Phân trang lọc nhật ký theo thôn/user/action/ngày, hàm tiện ích bất đồng bộ `record_audit` ghi vào `audit_logs`
  - Verification: `cargo check` 0 errors
- [x] Step 4: Subagent B4 - Động cơ Excel Streaming (`/api/excel/import`, `/api/excel/export`, `/template`, `/export/chuctho`)
  - Target Files: `QLHK/QLHK-Backend-Rust/src/handlers/excel.rs`, `QLHK/QLHK-Backend-Rust/src/models/excel.rs`
  - Scope: Import parse excel đa luồng, tự động mã hóa CCCD bằng `src/crypto.rs`, export danh sách nhân khẩu chuẩn thể thức hành chính, export chúc thọ, tải template mẫu
  - Verification: `cargo check` 0 errors
- [x] Step 5: Subagent B5 - Sao lưu, Cấu hình & Updater (`/api/backup`, `/api/settings`, `/api/updates`)
  - Target Files: `QLHK/QLHK-Backend-Rust/src/handlers/backup.rs`, `QLHK/QLHK-Backend-Rust/src/handlers/settings.rs`, `QLHK/QLHK-Backend-Rust/src/handlers/updates.rs`, `QLHK/QLHK-Backend-Rust/src/models/settings.rs`, `QLHK/QLHK-Backend-Rust/src/models/backup.rs`
  - Scope: Export/import schema & data backup dump, get/put cài đặt hệ thống key-value, updater endpoint cho Tauri Desktop
  - Verification: `cargo check` 0 errors
- [x] Step 6: Tổng Chỉ Huy - Tích hợp Router vào `main.rs`, Self-Healing Compile & E2E Verification
  - Target Files: `QLHK/QLHK-Backend-Rust/src/main.rs`, `QLHK/QLHK-Backend-Rust/src/lib.rs`
  - Scope: Lắp ráp các router công khai và router bảo vệ qua auth_middleware, self-healing compile, Shadow Parity Test E2E 100% không còn lỗi 404
  - Verification: `cargo test` + `powershell -File tests/shadow_parity_test.ps1` + E2E cURL

## Project Gotchas & Learned Invariants
- P0: Zero comments in all new and edited code.
- CCCD Security: Mọi mã hóa/giải mã và hash CCCD phải dùng `src/crypto.rs` khớp tuyệt đối với Node.js.
- Postgres Schema: Luôn set search_path `qlhk,public`.
- Password verification: Hỗ trợ cả bcrypt ($2a$, $2b$, $2y$) và SHA-256 fallback nếu có user cũ.

## Verification Gate Results (100% Passed)
- `cargo check`: 0 errors, 0 warnings.
- `cargo test`: 22/22 tests passed (lib, crypto, auth, households, policies).
- `Zero Comments`: 0 comment lines in `src/**/*.rs`.
- `Shadow Parity Test` (Port 5002 vs Port 5012): 18/18 passed:
  1. Health Check (200, ok)
  2. Unauthorized Access Gate (401)
  3. Households List Total Parity (562 total)
  4. Citizen CCCD Decryption Parity (060088001122, Decrypted=True)
  5. Chuc Tho Policy List Parity (92 total)
  6. HTXH Policy List Parity (1 total, HuuTri=x)
  7. Analytics Overview Parity (562 households, 1382 citizens, male 1053, female 329)
  8. Villages List Parity (7 villages)
  9. Users List Parity (9 users)
  10. Audit Logs List Parity (1222 logs)
  11. Audit Logs Alias Parity (1222 logs)
  12. Settings List Parity (3 settings)
  13. Backup List Parity (Success=True)
  14. Desktop Updates Latest Parity (Version 1.5.1)
  15. Root Ping Parity (204)
  16. API Ping Parity (204)
  17. Excel Template Download Parity (200 binary stream)
  18. Excel ChucTho Export Parity (200 binary stream)

