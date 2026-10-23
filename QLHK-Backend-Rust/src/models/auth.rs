use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Deserialize)]
pub struct LoginInput {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Deserialize)]
pub struct RefreshInput {
    #[serde(alias = "refreshToken", alias = "refresh_token")]
    pub refresh_token: String,
}

#[derive(Debug, Deserialize, Default)]
pub struct LogoutInput {
    #[serde(default, alias = "refreshToken", alias = "refresh_token")]
    pub refresh_token: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
pub struct AuthUser {
    pub id: Uuid,
    pub username: String,
    pub full_name: Option<String>,
    pub role: String,
    pub village_id: Option<Uuid>,
    pub village_name: Option<String>,
    pub module_access: Option<String>,
}

#[derive(Debug, FromRow)]
pub struct UserWithPasswordRow {
    pub id: Uuid,
    pub username: String,
    pub password_hash: String,
    pub full_name: Option<String>,
    pub role: String,
    pub village_id: Option<Uuid>,
    pub village_name: Option<String>,
    pub module_access: Option<String>,
}

impl UserWithPasswordRow {
    pub fn into_auth_user(self) -> AuthUser {
        AuthUser {
            id: self.id,
            username: self.username,
            full_name: self.full_name,
            role: self.role,
            village_id: self.village_id,
            village_name: self.village_name,
            module_access: Some(self.module_access.unwrap_or_else(|| "all".to_string())),
        }
    }
}

#[derive(Debug, Serialize)]
pub struct LoginResponse {
    pub message: String,
    pub user: AuthUser,
    #[serde(rename = "accessToken")]
    pub access_token: String,
    #[serde(rename = "refreshToken")]
    pub refresh_token: String,
}

#[derive(Debug, Serialize)]
pub struct RefreshResponse {
    #[serde(rename = "accessToken")]
    pub access_token: String,
    #[serde(rename = "refreshToken")]
    pub refresh_token: String,
    pub user: AuthUser,
}

#[derive(Debug, Serialize)]
pub struct MeResponse {
    pub user: AuthUser,
}

#[derive(Debug, Serialize)]
pub struct MessageResponse {
    pub message: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_login_input_deserialization() {
        let raw = r#"{"username":"admin","password":"password123"}"#;
        let parsed: LoginInput = serde_json::from_str(raw).unwrap();
        assert_eq!(parsed.username, "admin");
        assert_eq!(parsed.password, "password123");
    }

    #[test]
    fn test_refresh_input_camel_case() {
        let raw = r#"{"refreshToken":"sample-refresh-token"}"#;
        let parsed: RefreshInput = serde_json::from_str(raw).unwrap();
        assert_eq!(parsed.refresh_token, "sample-refresh-token");

        let raw_snake = r#"{"refresh_token":"sample-refresh-token-2"}"#;
        let parsed_snake: RefreshInput = serde_json::from_str(raw_snake).unwrap();
        assert_eq!(parsed_snake.refresh_token, "sample-refresh-token-2");
    }

    #[test]
    fn test_logout_input_optional() {
        let raw_empty = "{}";
        let parsed: LogoutInput = serde_json::from_str(raw_empty).unwrap();
        assert!(parsed.refresh_token.is_none());

        let raw_with_token = r#"{"refreshToken":"token-xyz"}"#;
        let parsed_with: LogoutInput = serde_json::from_str(raw_with_token).unwrap();
        assert_eq!(parsed_with.refresh_token.as_deref(), Some("token-xyz"));
    }

    #[test]
    fn test_into_auth_user_fallback() {
        let uid = Uuid::new_v4();
        let row = UserWithPasswordRow {
            id: uid,
            username: "user1".to_string(),
            password_hash: "hash".to_string(),
            full_name: Some("User One".to_string()),
            role: "user".to_string(),
            village_id: None,
            village_name: None,
            module_access: None,
        };
        let user = row.into_auth_user();
        assert_eq!(user.id, uid);
        assert_eq!(user.module_access.as_deref(), Some("all"));
    }
}
