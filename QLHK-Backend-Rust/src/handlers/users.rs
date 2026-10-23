use axum::{
    extract::{Extension, Path, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::{get, put},
    Json, Router,
};
use serde_json::json;
use uuid::Uuid;

use crate::{
    middlewares::auth::Claims,
    models::user::{
        CreateUserRequest, UpdatePasswordRequest, UpdateUserRequest, UserDb, UserResponse,
    },
    state::AppState,
};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(get_users).post(create_user))
        .route("/{id}", put(update_user).delete(delete_user))
        .route("/{id}/password", put(update_password))
}

pub async fn get_users(
    State(state): State<AppState>,
) -> Response {
    let rows = sqlx::query_as::<_, UserResponse>(
        r#"
        SELECT 
            u.id, 
            u.username, 
            u.full_name, 
            u.role, 
            u.village_id, 
            v.name AS village_name, 
            COALESCE(u.module_access, 'all') AS module_access, 
            u.created_at, 
            u.updated_at
        FROM qlhk.users u
        LEFT JOIN qlhk.villages v ON u.village_id = v.id
        ORDER BY u.created_at ASC
        "#,
    )
    .fetch_all(&state.pool)
    .await;

    match rows {
        Ok(data) => (
            StatusCode::OK,
            Json(json!({
                "success": true,
                "data": data,
            })),
        )
            .into_response(),
        Err(e) => {
            eprintln!("get_users error: {:?}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "error": "Lỗi máy chủ khi lấy danh sách người dùng"
                })),
            )
                .into_response()
        }
    }
}

pub async fn create_user(
    State(state): State<AppState>,
    Json(payload): Json<CreateUserRequest>,
) -> Response {
    let trimmed_username = payload.username.trim();
    if trimmed_username.len() < 3 {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": "Tên đăng nhập phải có ít nhất 3 ký tự" })),
        )
            .into_response();
    }

    if payload.password.len() < 6 {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": "Mật khẩu phải có ít nhất 6 ký tự" })),
        )
            .into_response();
    }

    let existing: Result<Option<(Uuid,)>, _> = sqlx::query_as(
        "SELECT id FROM qlhk.users WHERE username = $1 LIMIT 1",
    )
    .bind(trimmed_username)
    .fetch_optional(&state.pool)
    .await;

    if let Ok(Some(_)) = existing {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": "Tên đăng nhập đã tồn tại trên hệ thống" })),
        )
            .into_response();
    }

    let password_hash = match bcrypt::hash(&payload.password, 10) {
        Ok(h) => h,
        Err(e) => {
            eprintln!("bcrypt hash error: {:?}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Lỗi máy chủ khi mã hóa mật khẩu" })),
            )
                .into_response();
        }
    };

    let role = match payload.role.as_deref() {
        Some("admin") => "admin",
        _ => "user",
    };

    let village_id = if role == "admin" {
        None
    } else {
        payload.village_id
    };

    let module_access = match payload.module_access.as_deref() {
        Some("qlhk") => "qlhk",
        Some("qlcs") => "qlcs",
        _ => "all",
    };

    let full_name = payload
        .full_name
        .map(|f| f.trim().to_string())
        .filter(|f| !f.is_empty());

    let inserted = sqlx::query_as::<_, UserDb>(
        r#"
        INSERT INTO qlhk.users (username, password_hash, role, village_id, full_name, module_access, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        RETURNING id, username, password_hash, full_name, role, village_id, module_access, created_at, updated_at
        "#,
    )
    .bind(trimmed_username)
    .bind(&password_hash)
    .bind(role)
    .bind(village_id)
    .bind(&full_name)
    .bind(module_access)
    .fetch_one(&state.pool)
    .await;

    match inserted {
        Ok(user) => {
            let village_name: Option<String> = if let Some(vid) = user.village_id {
                sqlx::query_scalar("SELECT name FROM qlhk.villages WHERE id = $1")
                    .bind(vid)
                    .fetch_optional(&state.pool)
                    .await
                    .unwrap_or(None)
            } else {
                None
            };

            let response_data = UserResponse {
                id: user.id,
                username: user.username,
                full_name: user.full_name,
                role: user.role,
                village_id: user.village_id,
                village_name,
                module_access: user.module_access,
                created_at: user.created_at,
                updated_at: user.updated_at,
            };

            (
                StatusCode::CREATED,
                Json(json!({
                    "success": true,
                    "message": "Tạo tài khoản thành công",
                    "data": response_data
                })),
            )
                .into_response()
        }
        Err(e) => {
            eprintln!("create_user error: {:?}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Lỗi máy chủ khi tạo tài khoản" })),
            )
                .into_response()
        }
    }
}

pub async fn update_user(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateUserRequest>,
) -> Response {
    let existing_res: Result<Option<UserDb>, _> = sqlx::query_as(
        "SELECT id, username, password_hash, full_name, role, village_id, module_access, created_at, updated_at FROM qlhk.users WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await;

    let existing = match existing_res {
        Ok(Some(u)) => u,
        Ok(None) => {
            return (
                StatusCode::NOT_FOUND,
                Json(json!({ "error": "Không tìm thấy tài khoản người dùng" })),
            )
                .into_response();
        }
        Err(e) => {
            eprintln!("update_user fetch error: {:?}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Lỗi máy chủ khi tìm tài khoản" })),
            )
                .into_response();
        }
    };

    let updated_role = match payload.role.as_deref() {
        Some("admin") => "admin".to_string(),
        Some("user") => "user".to_string(),
        _ => existing.role,
    };

    let updated_village_id = if updated_role == "admin" {
        None
    } else if payload.village_id.is_some() {
        payload.village_id
    } else {
        existing.village_id
    };

    let updated_module_access = match payload.module_access.as_deref() {
        Some("qlhk") => Some("qlhk".to_string()),
        Some("qlcs") => Some("qlcs".to_string()),
        Some("all") => Some("all".to_string()),
        _ => existing.module_access.or(Some("all".to_string())),
    };

    let updated_full_name = payload
        .full_name
        .map(|f| f.trim().to_string())
        .or(existing.full_name);

    let update_res = sqlx::query_as::<_, UserDb>(
        r#"
        UPDATE qlhk.users
        SET full_name = $1,
            role = $2,
            village_id = $3,
            module_access = $4,
            updated_at = NOW()
        WHERE id = $5
        RETURNING id, username, password_hash, full_name, role, village_id, module_access, created_at, updated_at
        "#,
    )
    .bind(&updated_full_name)
    .bind(&updated_role)
    .bind(updated_village_id)
    .bind(&updated_module_access)
    .bind(id)
    .fetch_one(&state.pool)
    .await;

    match update_res {
        Ok(user) => {
            let village_name: Option<String> = if let Some(vid) = user.village_id {
                sqlx::query_scalar("SELECT name FROM qlhk.villages WHERE id = $1")
                    .bind(vid)
                    .fetch_optional(&state.pool)
                    .await
                    .unwrap_or(None)
            } else {
                None
            };

            let response_data = UserResponse {
                id: user.id,
                username: user.username,
                full_name: user.full_name,
                role: user.role,
                village_id: user.village_id,
                village_name,
                module_access: user.module_access,
                created_at: user.created_at,
                updated_at: user.updated_at,
            };

            (
                StatusCode::OK,
                Json(json!({
                    "success": true,
                    "message": "Cập nhật tài khoản và phân công thôn thành công",
                    "data": response_data
                })),
            )
                .into_response()
        }
        Err(e) => {
            eprintln!("update_user execute error: {:?}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Lỗi máy chủ khi cập nhật tài khoản" })),
            )
                .into_response()
        }
    }
}

pub async fn delete_user(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
) -> Response {
    if claims.id == id.to_string() {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": "Không thể xóa tài khoản đang đăng nhập hiện tại" })),
        )
            .into_response();
    }

    let existing_res: Result<Option<UserDb>, _> = sqlx::query_as(
        "SELECT id, username, password_hash, full_name, role, village_id, module_access, created_at, updated_at FROM qlhk.users WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await;

    let existing = match existing_res {
        Ok(Some(u)) => u,
        Ok(None) => {
            return (
                StatusCode::NOT_FOUND,
                Json(json!({ "error": "Không tìm thấy tài khoản cần xóa" })),
            )
                .into_response();
        }
        Err(e) => {
            eprintln!("delete_user fetch error: {:?}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Lỗi máy chủ khi tìm tài khoản" })),
            )
                .into_response();
        }
    };

    if existing.username == "admin" {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": "Không thể xóa tài khoản Quản trị viên mặc định (admin)" })),
        )
            .into_response();
    }

    if existing.role == "admin" {
        let admin_count: Result<i64, _> = sqlx::query_scalar(
            "SELECT COUNT(*) FROM qlhk.users WHERE role = 'admin'",
        )
        .fetch_one(&state.pool)
        .await;

        match admin_count {
            Ok(c) if c <= 1 => {
                return (
                    StatusCode::BAD_REQUEST,
                    Json(json!({ "error": "Không thể xóa tài khoản Quản trị viên duy nhất" })),
                )
                    .into_response();
            }
            Err(e) => {
                eprintln!("count admin error: {:?}", e);
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(json!({ "error": "Lỗi máy chủ khi kiểm tra quyền quản trị" })),
                )
                    .into_response();
            }
            _ => {}
        }
    }

    let mut tx = match state.pool.begin().await {
        Ok(t) => t,
        Err(e) => {
            eprintln!("delete_user tx begin error: {:?}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Lỗi máy chủ khi bắt đầu giao dịch" })),
            )
                .into_response();
        }
    };

    let _ = sqlx::query("DELETE FROM qlhk.refresh_tokens WHERE user_id = $1")
        .bind(id)
        .execute(&mut *tx)
        .await;

    let _ = sqlx::query("UPDATE qlhk.audit_logs SET user_id = NULL WHERE user_id = $1")
        .bind(id)
        .execute(&mut *tx)
        .await;

    let del_res = sqlx::query("DELETE FROM qlhk.users WHERE id = $1")
        .bind(id)
        .execute(&mut *tx)
        .await;

    if let Err(e) = del_res {
        eprintln!("delete user execute error: {:?}", e);
        let _ = tx.rollback().await;
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": "Lỗi máy chủ khi xóa tài khoản" })),
        )
            .into_response();
        }

    if let Err(e) = tx.commit().await {
        eprintln!("delete user tx commit error: {:?}", e);
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": "Lỗi máy chủ khi xác nhận xóa tài khoản" })),
        )
            .into_response();
    }

    (
        StatusCode::OK,
        Json(json!({
            "success": true,
            "message": "Xóa tài khoản thành công"
        })),
    )
        .into_response()
}

pub async fn update_password(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdatePasswordRequest>,
) -> Response {
    let new_pwd = payload
        .password
        .or(payload.new_password)
        .unwrap_or_default();

    let trimmed_pwd = new_pwd.trim();
    if trimmed_pwd.len() < 6 {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": "Mật khẩu mới phải có ít nhất 6 ký tự" })),
        )
            .into_response();
    }

    if claims.role != "admin" && claims.id != id.to_string() {
        return (
            StatusCode::FORBIDDEN,
            Json(json!({ "error": "Bạn không có quyền đổi mật khẩu cho tài khoản này" })),
        )
            .into_response();
    }

    let existing: Result<Option<(Uuid,)>, _> = sqlx::query_as(
        "SELECT id FROM qlhk.users WHERE id = $1 LIMIT 1",
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await;

    match existing {
        Ok(Some(_)) => {}
        Ok(None) => {
            return (
                StatusCode::NOT_FOUND,
                Json(json!({ "error": "Không tìm thấy tài khoản người dùng" })),
            )
                .into_response();
        }
        Err(e) => {
            eprintln!("update_password fetch error: {:?}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Lỗi máy chủ khi kiểm tra tài khoản" })),
            )
                .into_response();
        }
    }

    let password_hash = match bcrypt::hash(trimmed_pwd, 10) {
        Ok(h) => h,
        Err(e) => {
            eprintln!("bcrypt hash error: {:?}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Lỗi máy chủ khi mã hóa mật khẩu mới" })),
            )
                .into_response();
        }
    };

    let mut tx = match state.pool.begin().await {
        Ok(t) => t,
        Err(e) => {
            eprintln!("update_password tx begin error: {:?}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Lỗi máy chủ khi bắt đầu giao dịch" })),
            )
                .into_response();
        }
    };

    let update_res = sqlx::query(
        "UPDATE qlhk.users SET password_hash = $1, updated_at = NOW() WHERE id = $2",
    )
    .bind(&password_hash)
    .bind(id)
    .execute(&mut *tx)
    .await;

    if let Err(e) = update_res {
        eprintln!("update password execute error: {:?}", e);
        let _ = tx.rollback().await;
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": "Lỗi máy chủ khi cập nhật mật khẩu" })),
        )
            .into_response();
    }

    let _ = sqlx::query("DELETE FROM qlhk.refresh_tokens WHERE user_id = $1")
        .bind(id)
        .execute(&mut *tx)
        .await;

    if let Err(e) = tx.commit().await {
        eprintln!("update password tx commit error: {:?}", e);
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": "Lỗi máy chủ khi xác nhận đổi mật khẩu" })),
        )
            .into_response();
    }

    (
        StatusCode::OK,
        Json(json!({
            "success": true,
            "message": "Đổi mật khẩu thành công"
        })),
    )
        .into_response()
}
