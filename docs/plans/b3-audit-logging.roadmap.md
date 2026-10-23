# Subagent B3 Roadmap: Audit Logging Engine

## Mục tiêu
Ghi vết thao tác nghiệp vụ hộ tịch, nhân khẩu và cung cấp API truy vấn lịch sử hoạt động có phân trang và bộ lọc linh hoạt.

## Bất biến P0
- Zero comments in code: 0 dòng comment trong bất kỳ file code nào.
- Ghi log bất đồng bộ (async non-blocking) để không làm chậm luồng xử lý chính.

## Chi tiết Triển khai
1. Helper `src/utils/audit.rs`:
   - Hàm `record_audit`:
     ```rust
     pub async fn record_audit(
         pool: &sqlx::PgPool,
         village_id: Option<uuid::Uuid>,
         user_id: Option<uuid::Uuid>,
         action: &str,
         entity_type: &str,
         entity_id: Option<&str>,
         old_values: Option<&str>,
         new_values: Option<&str>,
         ip_address: Option<&str>,
     ) -> Result<(), sqlx::Error>
     ```
   - Insert vào bảng `audit_logs` trong schema `qlhk`.
2. Endpoint `GET /api/audit`:
   - Query Parameters:
     - `page`: default 1
     - `limit`: default 20
     - `village_id`: optional UUID
     - `user_id`: optional UUID
     - `action`: optional String
     - `from_date`: optional String ISO
     - `to_date`: optional String ISO
   - Join với bảng `users` (lấy `username`, `full_name`) và `villages` (lấy `name`).
   - Trả về JSON:
     ```json
     {
       "success": true,
       "data": [
         {
           "id": "uuid",
           "village_id": "uuid",
           "village_name": "...",
           "user_id": "uuid",
           "username": "...",
           "user_full_name": "...",
           "action": "...",
           "entity_type": "...",
           "entity_id": "...",
           "old_values": "...",
           "new_values": "...",
           "ip_address": "...",
           "created_at": "..."
         }
       ],
       "pagination": {
         "page": 1,
         "limit": 20,
         "total": 150,
         "total_pages": 8
       }
     }
     ```

## Kế hoạch kiểm thử
- `cargo check`: Exit code 0.
