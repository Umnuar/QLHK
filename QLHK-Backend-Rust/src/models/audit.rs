use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

fn normalize_audit_val(val: serde_json::Value) -> serde_json::Value {
    match val {
        serde_json::Value::Object(mut map) => {
            for key in ["added_members", "updated_members", "removed_members"] {
                if let Some(v) = map.get(key) {
                    if let serde_json::Value::String(s) = v {
                        let trimmed = s.trim();
                        if (trimmed.starts_with('[') && trimmed.ends_with(']'))
                            || (trimmed.starts_with('{') && trimmed.ends_with('}'))
                        {
                            if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(trimmed) {
                                map.insert(key.to_string(), normalize_audit_val(parsed));
                            }
                        }
                    }
                }
            }
            if let Some(serde_json::Value::Array(members)) = map.get_mut("updated_members") {
                for member in members.iter_mut() {
                    if let serde_json::Value::Object(m_map) = member {
                        if let Some(serde_json::Value::String(changes_str)) = m_map.get("changes") {
                            let trimmed = changes_str.trim();
                            if trimmed.starts_with('{') && trimmed.ends_with('}') {
                                if let Ok(parsed_changes) =
                                    serde_json::from_str::<serde_json::Value>(trimmed)
                                {
                                    m_map.insert("changes".to_string(), parsed_changes);
                                }
                            }
                        }
                    }
                }
            }
            serde_json::Value::Object(map)
        }
        other => other,
    }
}

pub fn parse_audit_json(opt: Option<String>) -> Option<serde_json::Value> {
    opt.and_then(|s| {
        let trimmed = s.trim();
        if trimmed.is_empty() || trimmed == "null" {
            None
        } else {
            let parsed = match serde_json::from_str::<serde_json::Value>(trimmed) {
                Ok(serde_json::Value::String(inner)) => {
                    let inner_trimmed = inner.trim();
                    if (inner_trimmed.starts_with('{') && inner_trimmed.ends_with('}'))
                        || (inner_trimmed.starts_with('[') && inner_trimmed.ends_with(']'))
                    {
                        serde_json::from_str::<serde_json::Value>(inner_trimmed)
                            .ok()
                            .or_else(|| Some(serde_json::Value::String(inner)))
                    } else {
                        Some(serde_json::Value::String(inner))
                    }
                }
                Ok(serde_json::Value::Null) => None,
                Ok(v) => Some(v),
                Err(_) => Some(serde_json::Value::String(s)),
            };
            parsed.map(normalize_audit_val)
        }
    })
}

#[derive(Debug, Clone, FromRow)]
pub struct AuditLogRow {
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

#[derive(Debug, Clone, Serialize, Deserialize)]
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
    pub old_values: Option<serde_json::Value>,
    pub new_values: Option<serde_json::Value>,
    pub ip_address: Option<String>,
    pub created_at: Option<DateTime<Utc>>,
}

impl From<AuditLogRow> for AuditLogResponse {
    fn from(row: AuditLogRow) -> Self {
        AuditLogResponse {
            id: row.id,
            village_id: row.village_id,
            village_name: row.village_name,
            user_id: row.user_id,
            username: row.username,
            user_full_name: row.user_full_name,
            action: row.action,
            entity_type: row.entity_type,
            entity_id: row.entity_id,
            old_values: parse_audit_json(row.old_values),
            new_values: parse_audit_json(row.new_values),
            ip_address: row.ip_address,
            created_at: row.created_at,
        }
    }
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
    #[serde(skip_serializing_if = "Option::is_none")]
    pub offset: Option<i64>,
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
