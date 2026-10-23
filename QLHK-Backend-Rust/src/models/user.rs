use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct UserDb {
    pub id: Uuid,
    pub username: String,
    pub password_hash: String,
    pub full_name: Option<String>,
    pub role: String,
    pub village_id: Option<Uuid>,
    pub module_access: Option<String>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct UserResponse {
    pub id: Uuid,
    pub username: String,
    pub full_name: Option<String>,
    pub role: String,
    pub village_id: Option<Uuid>,
    pub village_name: Option<String>,
    pub module_access: Option<String>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateUserRequest {
    pub username: String,
    pub password: String,
    pub role: Option<String>,
    pub village_id: Option<Uuid>,
    pub full_name: Option<String>,
    pub module_access: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateUserRequest {
    pub full_name: Option<String>,
    pub role: Option<String>,
    pub village_id: Option<Uuid>,
    pub module_access: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdatePasswordRequest {
    pub password: Option<String>,
    #[serde(rename = "newPassword", alias = "new_password")]
    pub new_password: Option<String>,
}
