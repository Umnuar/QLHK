use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

use crate::models::citizen::{CitizenResponse, CreateCitizenInput, UpdateCitizenInput};

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct HouseholdDb {
    pub id: Uuid,
    pub village_id: Uuid,
    pub book_number: String,
    pub address: Option<String>,
    pub status: String,
    pub version: i32,
    pub is_deleted: bool,
    pub deleted_at: Option<DateTime<Utc>>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct VillageInfo {
    pub id: Uuid,
    pub name: String,
    pub code: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HouseholdResponse {
    pub id: Uuid,
    pub village_id: Uuid,
    pub book_number: String,
    pub address: Option<String>,
    pub status: String,
    pub version: i32,
    pub is_deleted: bool,
    pub deleted_at: Option<DateTime<Utc>>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
    pub village: Option<VillageInfo>,
    pub citizens: Vec<CitizenResponse>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateHouseholdRequest {
    pub village_id: Option<Uuid>,
    pub book_number: Option<String>,
    pub address: Option<String>,
    pub status: Option<String>,
    pub members: Option<Vec<CreateCitizenInput>>,
    pub citizens: Option<Vec<CreateCitizenInput>>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateHouseholdRequest {
    pub book_number: Option<String>,
    pub address: Option<String>,
    pub status: Option<String>,
    pub version: Option<i32>,
    pub members: Option<Vec<UpdateCitizenInput>>,
    pub citizens: Option<Vec<UpdateCitizenInput>>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct SplitHouseholdRequest {
    pub new_book_number: Option<String>,
    pub new_address: Option<String>,
    pub new_village_id: Option<Uuid>,
    pub new_head_id: Uuid,
    pub citizen_ids: Vec<Uuid>,
    pub remaining_head_id: Option<Uuid>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct MergeHouseholdRequest {
    pub target_household_id: Uuid,
}

#[derive(Debug, Clone, Deserialize)]
pub struct ChangeHeadRequest {
    pub new_head_id: Uuid,
}

#[derive(Debug, Clone, Deserialize, Default)]
pub struct HouseholdFilter {
    pub page: Option<i64>,
    pub limit: Option<i64>,
    pub village_id: Option<Uuid>,
    #[serde(rename = "villageId")]
    pub village_id_camel: Option<Uuid>,
    pub status: Option<String>,
    pub search: Option<String>,
    pub include_deleted: Option<bool>,
    #[serde(rename = "includeDeleted")]
    pub include_deleted_camel: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaginationMeta {
    pub page: i64,
    pub limit: i64,
    pub total: i64,
    #[serde(rename = "totalPages")]
    pub total_pages: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaginatedResponse<T> {
    pub data: Vec<T>,
    pub pagination: PaginationMeta,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiResponse<T> {
    pub message: Option<String>,
    pub data: T,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MessageResponse {
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OccConflictResponse {
    pub error: String,
    #[serde(rename = "currentVersion")]
    pub current_version: i32,
    #[serde(rename = "submittedVersion")]
    pub submitted_version: Option<i32>,
}
