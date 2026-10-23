use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupFileInfo {
    pub filename: String,
    pub size: u64,
    pub created_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupResponse {
    pub success: bool,
    pub filename: String,
    pub size: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupListResponse {
    pub success: bool,
    pub data: Vec<BackupFileInfo>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct RestoreBackupRequest {
    pub filename: Option<String>,
    pub data: Option<serde_json::Value>,
    pub admin_password: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RestoreBackupResponse {
    pub success: bool,
    pub message: String,
}
