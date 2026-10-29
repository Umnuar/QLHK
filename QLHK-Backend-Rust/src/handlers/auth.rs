use axum::{
    extract::{Extension, State},
    http::StatusCode,
    middleware::from_fn,
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use serde_json::json;
use sha2::{Digest, Sha256};
use sqlx::FromRow;
use uuid::Uuid;

use crate::{
    middlewares::auth::{auth_middleware, Claims},
    models::auth::{
        AuthUser, LoginInput, LoginResponse, LogoutInput, MeResponse, MessageResponse,
        RefreshInput, RefreshResponse, UserWithPasswordRow,
    },
    state::AppState,
};

#[derive(Debug, Serialize, Deserialize)]
pub struct RefreshClaims {
    pub id: String,
    pub username: String,
    pub role: String,
    pub village_id: Option<String>,
    pub exp: usize,
    pub iat: usize,
    pub jti: String,
}

#[derive(Debug, FromRow)]
struct RefreshTokenRecord {
    pub id: Uuid,
    pub user_id: Uuid,
    pub expires_at: chrono::DateTime<chrono::Utc>,
    pub username: String,
    pub full_name: Option<String>,
    pub role: String,
    pub village_id: Option<Uuid>,
    pub village_name: Option<String>,
    pub module_access: Option<String>,
}

fn get_refresh_secret(state: &AppState) -> String {
    std::env::var("JWT_REFRESH_SECRET").unwrap_or_else(|_| state.config.jwt_secret.clone())
}

pub fn verify_password(password: &str, password_hash: &str) -> bool {
    if let Ok(matched) = bcrypt::verify(password, password_hash) {
        if matched {
            return true;
        }
    }
    let mut hasher = Sha256::new();
    hasher.update(password.as_bytes());
    let sha256_hex = hex::encode(hasher.finalize());
    let a = sha256_hex.as_bytes();
    let b = password_hash.as_bytes();
    if a.len() != b.len() {
        return false;
    }
    let mut diff = 0u8;
    for (x, y) in a.iter().zip(b.iter()) {
        diff |= x.to_ascii_lowercase() ^ y.to_ascii_lowercase();
    }
    diff == 0
}

pub async fn login(
    State(state): State<AppState>,
    Json(payload): Json<LoginInput>,
) -> Response {
    let username = payload.username.trim();
    let password = &payload.password;

    if username.is_empty() || password.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": "Vui lòng cung cấp đầy đủ tên đăng nhập và mật khẩu" })),
        )
            .into_response();
    }

    let user_row = match sqlx::query_as::<_, UserWithPasswordRow>(
        "SELECT u.id, u.username, u.password_hash, u.full_name, u.role, u.village_id, v.name AS village_name, u.module_access \
         FROM qlhk.users u \
         LEFT JOIN qlhk.villages v ON u.village_id = v.id \
         WHERE u.username = $1",
    )
    .bind(username)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(row) => row,
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Lỗi máy chủ khi đăng nhập" })),
            )
                .into_response();
        }
    };

    let user = match user_row {
        Some(u) => u,
        None => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(json!({ "error": "Tên đăng nhập hoặc mật khẩu không chính xác" })),
            )
                .into_response();
        }
    };

    let is_bcrypt = match bcrypt::verify(password, &user.password_hash) {
        Ok(matched) => matched,
        Err(_) => false,
    };

    let authenticated = if is_bcrypt {
        true
    } else {
        verify_password(password, &user.password_hash)
    };

    if !authenticated {
        return (
            StatusCode::UNAUTHORIZED,
            Json(json!({ "error": "Tên đăng nhập hoặc mật khẩu không chính xác" })),
        )
            .into_response();
    }

    if !is_bcrypt {
        if let Ok(new_hash) = bcrypt::hash(password, 10) {
            let _ = sqlx::query("UPDATE qlhk.users SET password_hash = $1 WHERE id = $2")
                .bind(new_hash)
                .bind(user.id)
                .execute(&state.pool)
                .await;
        }
    }

    let now = chrono::Utc::now().timestamp() as usize;
    let access_claims = Claims {
        id: user.id.to_string(),
        username: user.username.clone(),
        role: user.role.clone(),
        village_id: user.village_id.map(|v| v.to_string()),
        exp: Some(now + 24 * 3600),
        iat: Some(now),
    };
    let access_token = match jsonwebtoken::encode(
        &jsonwebtoken::Header::default(),
        &access_claims,
        &jsonwebtoken::EncodingKey::from_secret(state.config.jwt_secret.as_bytes()),
    ) {
        Ok(t) => t,
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Lỗi tạo token xác thực" })),
            )
                .into_response();
        }
    };

    let refresh_secret = get_refresh_secret(&state);
    let refresh_claims = RefreshClaims {
        id: user.id.to_string(),
        username: user.username.clone(),
        role: user.role.clone(),
        village_id: user.village_id.map(|v| v.to_string()),
        exp: now + 7 * 86400,
        iat: now,
        jti: Uuid::new_v4().to_string(),
    };
    let refresh_token = match jsonwebtoken::encode(
        &jsonwebtoken::Header::default(),
        &refresh_claims,
        &jsonwebtoken::EncodingKey::from_secret(refresh_secret.as_bytes()),
    ) {
        Ok(t) => t,
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Lỗi tạo refresh token" })),
            )
                .into_response();
        }
    };

    let _ = sqlx::query("DELETE FROM qlhk.refresh_tokens WHERE user_id = $1 AND expires_at <= NOW()")
        .bind(user.id)
        .execute(&state.pool)
        .await;

    let expires_at = chrono::Utc::now() + chrono::Duration::days(7);
    let new_token_id = Uuid::new_v4();
    if let Err(_) = sqlx::query(
        "INSERT INTO qlhk.refresh_tokens (id, user_id, token, expires_at, created_at) VALUES ($1, $2, $3, $4, NOW())",
    )
    .bind(new_token_id)
    .bind(user.id)
    .bind(&refresh_token)
    .bind(expires_at)
    .execute(&state.pool)
    .await
    {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": "Lỗi lưu refresh token" })),
        )
            .into_response();
        }

    let auth_user = user.into_auth_user();

    (
        StatusCode::OK,
        Json(LoginResponse {
            message: "Đăng nhập thành công".to_string(),
            user: auth_user,
            access_token,
            refresh_token,
        }),
    )
        .into_response()
}

pub async fn refresh(
    State(state): State<AppState>,
    Json(payload): Json<RefreshInput>,
) -> Response {
    let token = payload.refresh_token.trim();
    if token.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": "Thiếu refresh token" })),
        )
            .into_response();
    }

    let refresh_secret = get_refresh_secret(&state);
    let mut validation = jsonwebtoken::Validation::default();
    validation.validate_exp = true;

    let decoded = jsonwebtoken::decode::<RefreshClaims>(
        token,
        &jsonwebtoken::DecodingKey::from_secret(refresh_secret.as_bytes()),
        &validation,
    )
    .or_else(|_| {
        jsonwebtoken::decode::<RefreshClaims>(
            token,
            &jsonwebtoken::DecodingKey::from_secret(state.config.jwt_secret.as_bytes()),
            &validation,
        )
    });

    let claims = match decoded {
        Ok(c) => c.claims,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(json!({ "error": "Refresh token không hợp lệ hoặc đã hết hạn" })),
            )
                .into_response();
        }
    };

    let user_id = match Uuid::parse_str(&claims.id) {
        Ok(uid) => uid,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(json!({ "error": "Refresh token không hợp lệ" })),
            )
                .into_response();
        }
    };

    let record = match sqlx::query_as::<_, RefreshTokenRecord>(
        "SELECT r.id, r.user_id, r.expires_at, \
         u.username, u.full_name, u.role, u.village_id, v.name AS village_name, u.module_access \
         FROM qlhk.refresh_tokens r \
         JOIN qlhk.users u ON r.user_id = u.id \
         LEFT JOIN qlhk.villages v ON u.village_id = v.id \
         WHERE r.token = $1",
    )
    .bind(token)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(r) => r,
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Lỗi máy chủ khi làm mới token" })),
            )
                .into_response();
        }
    };

    let row = match record {
        Some(r) => {
            if r.user_id != user_id || r.expires_at <= chrono::Utc::now() {
                let _ = sqlx::query("DELETE FROM qlhk.refresh_tokens WHERE id = $1")
                    .bind(r.id)
                    .execute(&state.pool)
                    .await;
                return (
                    StatusCode::UNAUTHORIZED,
                    Json(json!({ "error": "Refresh token đã bị thu hồi hoặc hết hạn" })),
                )
                    .into_response();
            }
            r
        }
        None => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(json!({ "error": "Refresh token đã bị thu hồi hoặc hết hạn" })),
            )
                .into_response();
        }
    };

    let now = chrono::Utc::now().timestamp() as usize;
    let access_claims = Claims {
        id: row.user_id.to_string(),
        username: row.username.clone(),
        role: row.role.clone(),
        village_id: row.village_id.map(|v| v.to_string()),
        exp: Some(now + 24 * 3600),
        iat: Some(now),
    };
    let new_access_token = match jsonwebtoken::encode(
        &jsonwebtoken::Header::default(),
        &access_claims,
        &jsonwebtoken::EncodingKey::from_secret(state.config.jwt_secret.as_bytes()),
    ) {
        Ok(t) => t,
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Lỗi tạo token xác thực" })),
            )
                .into_response();
        }
    };

    let new_refresh_claims = RefreshClaims {
        id: row.user_id.to_string(),
        username: row.username.clone(),
        role: row.role.clone(),
        village_id: row.village_id.map(|v| v.to_string()),
        exp: now + 7 * 86400,
        iat: now,
        jti: Uuid::new_v4().to_string(),
    };
    let new_refresh_token = match jsonwebtoken::encode(
        &jsonwebtoken::Header::default(),
        &new_refresh_claims,
        &jsonwebtoken::EncodingKey::from_secret(refresh_secret.as_bytes()),
    ) {
        Ok(t) => t,
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Lỗi tạo refresh token" })),
            )
                .into_response();
        }
    };

    let mut tx = match state.pool.begin().await {
        Ok(t) => t,
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Lỗi máy chủ khi làm mới token" })),
            )
                .into_response();
        }
    };

    let delete_result = sqlx::query("DELETE FROM qlhk.refresh_tokens WHERE id = $1")
        .bind(row.id)
        .execute(&mut *tx)
        .await;

    let rows_affected = match delete_result {
        Ok(res) => res.rows_affected(),
        Err(_) => {
            let _ = tx.rollback().await;
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Lỗi cập nhật token" })),
            )
                .into_response();
        }
    };

    if rows_affected == 0 {
        let _ = tx.rollback().await;
        return (
            StatusCode::UNAUTHORIZED,
            Json(json!({ "error": "Refresh token đã bị thu hồi hoặc hết hạn" })),
        )
            .into_response();
    }

    let expires_at = chrono::Utc::now() + chrono::Duration::days(7);
    let new_token_id = Uuid::new_v4();
    if let Err(_) = sqlx::query(
        "INSERT INTO qlhk.refresh_tokens (id, user_id, token, expires_at, created_at) VALUES ($1, $2, $3, $4, NOW())",
    )
    .bind(new_token_id)
    .bind(row.user_id)
    .bind(&new_refresh_token)
    .bind(expires_at)
    .execute(&mut *tx)
    .await
    {
        let _ = tx.rollback().await;
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": "Lỗi lưu refresh token mới" })),
        )
            .into_response();
    }

    if let Err(_) = tx.commit().await {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": "Lỗi xác nhận cập nhật token" })),
        )
            .into_response();
    }

    let user = AuthUser {
        id: row.user_id,
        username: row.username,
        full_name: row.full_name,
        role: row.role,
        village_id: row.village_id,
        village_name: row.village_name,
        module_access: Some(row.module_access.unwrap_or_else(|| "all".to_string())),
    };

    (
        StatusCode::OK,
        Json(RefreshResponse {
            access_token: new_access_token,
            refresh_token: new_refresh_token,
            user,
        }),
    )
        .into_response()
}

pub async fn get_me(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
) -> Response {
    let user_id = match Uuid::parse_str(&claims.id) {
        Ok(uid) => uid,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(json!({ "error": "Token không hợp lệ" })),
            )
                .into_response();
        }
    };

    let user_res = sqlx::query_as::<_, AuthUser>(
        "SELECT u.id, u.username, u.full_name, u.role, u.village_id, v.name AS village_name, COALESCE(u.module_access, 'all') AS module_access \
         FROM qlhk.users u \
         LEFT JOIN qlhk.villages v ON u.village_id = v.id \
         WHERE u.id = $1",
    )
    .bind(user_id)
    .fetch_optional(&state.pool)
    .await;

    match user_res {
        Ok(Some(user)) => (
            StatusCode::OK,
            Json(MeResponse { user }),
        )
            .into_response(),
        Ok(None) => (
            StatusCode::NOT_FOUND,
            Json(json!({ "error": "Không tìm thấy người dùng" })),
        )
            .into_response(),
        Err(_) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": "Lỗi máy chủ khi lấy thông tin người dùng" })),
        )
            .into_response(),
    }
}

pub async fn logout(
    State(state): State<AppState>,
    payload: Option<Json<LogoutInput>>,
) -> Response {
    if let Some(Json(body)) = payload {
        if let Some(token) = body.refresh_token {
            let trimmed = token.trim();
            if !trimmed.is_empty() {
                let _ = sqlx::query("DELETE FROM qlhk.refresh_tokens WHERE token = $1")
                    .bind(trimmed)
                    .execute(&state.pool)
                    .await;
            }
        }
    }

    (
        StatusCode::OK,
        Json(MessageResponse {
            message: "Đăng xuất thành công".to_string(),
        }),
    )
        .into_response()
}

pub async fn ping() -> StatusCode {
    StatusCode::NO_CONTENT
}

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/login", post(login))
        .route("/refresh", post(refresh))
        .route("/logout", post(logout))
        .route("/me", get(get_me).layer(from_fn(auth_middleware)))
        .route("/ping", get(ping).post(ping).options(ping))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_verify_password_bcrypt_match() {
        let plain = "admin123";
        let hashed = bcrypt::hash(plain, 4).unwrap();
        assert!(verify_password(plain, &hashed));
        assert!(!verify_password("wrongpassword", &hashed));
    }

    #[test]
    fn test_verify_password_sha256_fallback() {
        let plain = "admin123";
        let sha256_hash = "240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9";
        assert!(verify_password(plain, sha256_hash));
        assert!(verify_password(plain, &sha256_hash.to_uppercase()));
        assert!(!verify_password("wrongpassword", sha256_hash));
    }

    #[test]
    fn test_verify_password_length_mismatch() {
        assert!(!verify_password("admin123", "short_hash"));
        assert!(!verify_password("admin123", ""));
    }
}
