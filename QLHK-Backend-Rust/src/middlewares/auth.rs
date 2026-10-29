use axum::{
    extract::Request,
    http::{header, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
    Json,
};
use jsonwebtoken::{decode, DecodingKey, Validation};
use serde::{Deserialize, Serialize};
use serde_json::json;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq)]
pub struct Claims {
    pub id: String,
    pub username: String,
    pub role: String,
    pub village_id: Option<String>,
    #[serde(default)]
    pub exp: Option<usize>,
    #[serde(default)]
    pub iat: Option<usize>,
}

impl Claims {
    pub fn is_admin(&self) -> bool {
        self.role == "admin"
    }

    pub fn get_user_uuid(&self) -> Option<Uuid> {
        Uuid::parse_str(&self.id).ok()
    }

    pub fn get_village_uuid(&self) -> Option<Uuid> {
        self.village_id.as_deref().and_then(|v| Uuid::parse_str(v).ok())
    }

    pub fn has_village_permission(&self, target_village: Uuid) -> bool {
        if self.is_admin() {
            return true;
        }
        match self.get_village_uuid() {
            Some(user_vid) => user_vid == target_village,
            None => false,
        }
    }

    pub fn validate_village_access(&self, target_village: Uuid) -> Result<(), Response> {
        if self.has_village_permission(target_village) {
            Ok(())
        } else {
            Err((
                StatusCode::FORBIDDEN,
                Json(json!({
                    "error": "Không có quyền truy cập hoặc thao tác trên dữ liệu của thôn khác"
                })),
            )
                .into_response())
        }
    }

    pub fn enforce_village_scope(
        &self,
        requested_village_id: Option<Uuid>,
    ) -> Result<Option<Uuid>, Response> {
        if self.is_admin() {
            return Ok(requested_village_id);
        }

        let user_vid = match self.get_village_uuid() {
            Some(vid) => vid,
            None => {
                return Err((
                    StatusCode::FORBIDDEN,
                    Json(json!({
                        "error": "Tài khoản người dùng chưa được phân công thôn quản lý"
                    })),
                )
                    .into_response());
            }
        };

        if let Some(req_vid) = requested_village_id {
            if req_vid != user_vid {
                return Err((
                    StatusCode::FORBIDDEN,
                    Json(json!({
                        "error": "Không có quyền truy cập dữ liệu của thôn khác"
                    })),
                )
                    .into_response());
            }
        }

        Ok(Some(user_vid))
    }

    pub fn require_admin(&self) -> Result<(), Response> {
        if self.is_admin() {
            Ok(())
        } else {
            Err((
                StatusCode::FORBIDDEN,
                Json(json!({ "error": "Yêu cầu quyền quản trị viên" })),
            )
                .into_response())
        }
    }
}

pub async fn auth_middleware(
    mut req: Request,
    next: Next,
) -> Response {
    let auth_header = req
        .headers()
        .get(header::AUTHORIZATION)
        .and_then(|h| h.to_str().ok());

    let token = match auth_header {
        Some(header_val) => {
            let trimmed = header_val.trim();
            let token_str = if let Some(t) = trimmed.strip_prefix("Bearer ") {
                t.trim()
            } else if let Some(t) = trimmed.strip_prefix("bearer ") {
                t.trim()
            } else {
                return (
                    StatusCode::UNAUTHORIZED,
                    Json(json!({ "error": "Token không đúng định dạng Bearer" })),
                )
                    .into_response();
            };

            if token_str.is_empty() {
                return (
                    StatusCode::UNAUTHORIZED,
                    Json(json!({ "error": "Token không được để trống" })),
                )
                    .into_response();
            }
            token_str
        }
        None => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(json!({ "error": "Token không được cung cấp" })),
            )
                .into_response();
        }
    };

    let secret = std::env::var("JWT_SECRET")
        .unwrap_or_else(|_| "qlhk-dakha-jwt-access-secret-32-chars-min".to_string());

    let mut validation = Validation::default();
    validation.validate_exp = true;

    let token_data = match decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &validation,
    ) {
        Ok(data) => data,
        Err(err) => {
            let error_message = match err.kind() {
                jsonwebtoken::errors::ErrorKind::ExpiredSignature => "Token đã hết hạn",
                _ => "Token không hợp lệ",
            };
            return (
                StatusCode::UNAUTHORIZED,
                Json(json!({ "error": error_message })),
            )
                .into_response();
        }
    };

    if let Some(exp) = token_data.claims.exp {
        let now = chrono::Utc::now().timestamp() as usize;
        if exp <= now {
            return (
                StatusCode::UNAUTHORIZED,
                Json(json!({ "error": "Token đã hết hạn" })),
            )
                .into_response();
        }
    }

    if token_data.claims.id.trim().is_empty() || token_data.claims.role.trim().is_empty() {
        return (
            StatusCode::UNAUTHORIZED,
            Json(json!({ "error": "Token chứa thông tin người dùng không hợp lệ" })),
        )
            .into_response();
    }

    req.extensions_mut().insert(token_data.claims);
    next.run(req).await
}

pub async fn require_admin_middleware(req: Request, next: Next) -> Response {
    match req.extensions().get::<Claims>() {
        Some(claims) if claims.is_admin() => next.run(req).await,
        Some(_) => (
            StatusCode::FORBIDDEN,
            Json(json!({ "error": "Truy cập bị từ chối: Yêu cầu quyền quản trị viên" })),
        )
            .into_response(),
        None => (
            StatusCode::UNAUTHORIZED,
            Json(json!({ "error": "Yêu cầu xác thực tài khoản" })),
        )
            .into_response(),
    }
}

pub async fn require_village_scope_middleware(req: Request, next: Next) -> Response {
    match req.extensions().get::<Claims>() {
        Some(claims) if claims.is_admin() || claims.get_village_uuid().is_some() => {
            next.run(req).await
        }
        Some(_) => (
            StatusCode::FORBIDDEN,
            Json(json!({ "error": "Tài khoản chưa được phân công thôn quản lý" })),
        )
            .into_response(),
        None => (
            StatusCode::UNAUTHORIZED,
            Json(json!({ "error": "Yêu cầu xác thực tài khoản" })),
        )
            .into_response(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use jsonwebtoken::{encode, EncodingKey, Header};

    #[test]
    fn test_claims_admin_role_and_permissions() {
        let admin_claims = Claims {
            id: Uuid::new_v4().to_string(),
            username: "admin".to_string(),
            role: "admin".to_string(),
            village_id: None,
            exp: None,
            iat: None,
        };
        assert!(admin_claims.is_admin());
        assert!(admin_claims.require_admin().is_ok());

        let target_village = Uuid::new_v4();
        assert!(admin_claims.has_village_permission(target_village));
        assert!(admin_claims.validate_village_access(target_village).is_ok());

        let scoped_none = admin_claims.enforce_village_scope(None).unwrap();
        assert_eq!(scoped_none, None);

        let scoped_some = admin_claims.enforce_village_scope(Some(target_village)).unwrap();
        assert_eq!(scoped_some, Some(target_village));
    }

    #[test]
    fn test_claims_user_village_scoping() {
        let user_village = Uuid::new_v4();
        let other_village = Uuid::new_v4();

        let user_claims = Claims {
            id: Uuid::new_v4().to_string(),
            username: "canbo_thon1".to_string(),
            role: "user".to_string(),
            village_id: Some(user_village.to_string()),
            exp: None,
            iat: None,
        };

        assert!(!user_claims.is_admin());
        assert!(user_claims.require_admin().is_err());
        assert_eq!(user_claims.get_village_uuid(), Some(user_village));

        assert!(user_claims.has_village_permission(user_village));
        assert!(!user_claims.has_village_permission(other_village));

        assert!(user_claims.validate_village_access(user_village).is_ok());
        assert!(user_claims.validate_village_access(other_village).is_err());

        let enforced_default = user_claims.enforce_village_scope(None).unwrap();
        assert_eq!(enforced_default, Some(user_village));

        let enforced_match = user_claims.enforce_village_scope(Some(user_village)).unwrap();
        assert_eq!(enforced_match, Some(user_village));

        assert!(user_claims.enforce_village_scope(Some(other_village)).is_err());
    }

    #[test]
    fn test_claims_user_without_village_forbidden() {
        let unassigned_user = Claims {
            id: Uuid::new_v4().to_string(),
            username: "unassigned".to_string(),
            role: "user".to_string(),
            village_id: None,
            exp: None,
            iat: None,
        };

        let target_village = Uuid::new_v4();
        assert!(!unassigned_user.has_village_permission(target_village));
        assert!(unassigned_user.validate_village_access(target_village).is_err());
        assert!(unassigned_user.enforce_village_scope(None).is_err());
        assert!(unassigned_user.enforce_village_scope(Some(target_village)).is_err());
    }

    #[test]
    fn test_jwt_token_validation_and_expiration() {
        let secret = "test-secret-must-be-long-enough-32-bytes";
        let now = chrono::Utc::now().timestamp() as usize;

        let valid_claims = Claims {
            id: Uuid::new_v4().to_string(),
            username: "tester".to_string(),
            role: "user".to_string(),
            village_id: None,
            exp: Some(now + 3600),
            iat: Some(now),
        };

        let valid_token = encode(
            &Header::default(),
            &valid_claims,
            &EncodingKey::from_secret(secret.as_bytes()),
        )
        .unwrap();

        let decoded = decode::<Claims>(
            &valid_token,
            &DecodingKey::from_secret(secret.as_bytes()),
            &Validation::default(),
        );
        assert!(decoded.is_ok());

        let expired_claims = Claims {
            id: Uuid::new_v4().to_string(),
            username: "expired_tester".to_string(),
            role: "user".to_string(),
            village_id: None,
            exp: Some(now - 3600),
            iat: Some(now - 7200),
        };

        let expired_token = encode(
            &Header::default(),
            &expired_claims,
            &EncodingKey::from_secret(secret.as_bytes()),
        )
        .unwrap();

        let mut expired_validation = Validation::default();
        expired_validation.validate_exp = true;
        let expired_result = decode::<Claims>(
            &expired_token,
            &DecodingKey::from_secret(secret.as_bytes()),
            &expired_validation,
        );
        assert!(expired_result.is_err());
    }

    #[test]
    fn test_reject_static_backdoor_tokens() {
        let secret = "qlhk-dakha-jwt-access-secret-32-chars-min";
        let validation = Validation::default();
        let decode_test_admin = decode::<Claims>(
            "test-admin",
            &DecodingKey::from_secret(secret.as_bytes()),
            &validation,
        );
        assert!(decode_test_admin.is_err());

        let decode_dev_token = decode::<Claims>(
            "dev-token",
            &DecodingKey::from_secret(secret.as_bytes()),
            &validation,
        );
        assert!(decode_dev_token.is_err());
    }
}
