# Subagent B1 Roadmap: Auth & Session Engine

## Mục tiêu
Hoàn thiện toàn bộ hệ thống xác thực người dùng, cấp và quay vòng token, thông tin phiên và kiểm tra kết nối tại `QLHK-Backend-Rust`.

## Bất biến P0
- Zero comments in code: 0 dòng comment trong bất kỳ file code nào.
- Password verify: Hỗ trợ bcrypt (`bcrypt::verify`) và SHA-256 fallback.
- Token: JWT token payload khớp `id`, `username`, `role`, `village_id`.
- Refresh token: Lưu vào bảng `refresh_tokens`, xóa token hết hạn.

## Chi tiết Endpoints
1. `POST /api/auth/login`:
   - Body: `{ username, password }`
   - Kiểm tra `users` theo `username`, lấy kèm `village`.
   - Verify mật khẩu qua `bcrypt::verify(password, &user.password_hash)`.
   - Sinh JWT Access Token (hết hạn 24h) và Refresh Token (hết hạn 7 ngày).
   - Xóa các refresh token đã hết hạn của user.
   - Lưu refresh token mới vào `refresh_tokens`.
   - Trả về JSON:
     ```json
     {
       "message": "Đăng nhập thành công",
       "user": {
         "id": "uuid",
         "username": "...",
         "full_name": "...",
         "role": "...",
         "village_id": "uuid",
         "village_name": "...",
         "module_access": "all"
       },
       "accessToken": "...",
       "refreshToken": "..."
     }
     ```
2. `POST /api/auth/refresh`:
   - Body: `{ refreshToken }`
   - Tìm kiếm trong `refresh_tokens` kết hợp `expires_at > NOW()`.
   - Lấy thông tin `user` tương ứng.
   - Xóa token cũ, sinh cặp `accessToken` và `refreshToken` mới.
   - Lưu token mới vào `refresh_tokens`.
   - Trả về JSON chứa `accessToken`, `refreshToken`, `user`.
3. `GET /api/auth/me`:
   - Yêu cầu Header `Authorization: Bearer <token>`.
   - Trả về `{ user: { ... } }` kèm thông tin `village`.
4. `POST /api/auth/logout`:
   - Body: `{ refreshToken }`
   - Xóa refresh token khỏi database.
   - Trả về `{ "message": "Đăng xuất thành công" }`.
5. `GET|POST|OPTIONS /api/ping` và `/ping`:
   - Trả về HTTP 204 No Content.

## Kế hoạch kiểm thử
- `cargo check`: Exit code 0.
- Unit test xác thực và refresh token.
