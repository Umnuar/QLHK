use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct AuditLogDb {
    pub id: Uuid,
    pub village_id: Option<Uuid>,
    pub user_id: Option<Uuid>,
    pub action: String,
    pub entity_type: String,
    pub entity_id: Option<String>,
    pub old_values: Option<String>,
    pub new_values: Option<String>,
    pub ip_address: Option<String>,
    pub created_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct AuditLogResponse {
    pub id: Uuid,
    pub village_id: Option<Uuid>,
    pub village_name: Option<String>,
    pub user_id: Option<Uuid>,
    pub username: Option<String>,
    pub user_full_name: Option<String>,
    pub action: String,
    pub entity_type: String,
    pub entity_id: Option<String>,
    pub old_values: Option<String>,
    pub new_values: Option<String>,
    pub ip_address: Option<String>,
    pub created_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AuditLogFilter {
    pub page: Option<i64>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
    #[serde(alias = "villageId")]
    pub village_id: Option<Uuid>,
    #[serde(alias = "userId")]
    pub user_id: Option<Uuid>,
    pub action: Option<String>,
    #[serde(alias = "entityType")]
    pub entity_type: Option<String>,
    #[serde(alias = "entityId")]
    pub entity_id: Option<String>,
    pub search: Option<String>,
    #[serde(alias = "fromDate")]
    pub from_date: Option<String>,
    #[serde(alias = "toDate")]
    pub to_date: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaginationMeta {
    pub page: i64,
    pub limit: i64,
    pub total: i64,
    pub total_pages: i64,
    #[serde(rename = "totalPages", skip_serializing_if = "Option::is_none")]
    pub total_pages_camel: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaginatedResponse<T> {
    pub success: bool,
    pub data: Vec<T>,
    pub pagination: PaginationMeta,
}
