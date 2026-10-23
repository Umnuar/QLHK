use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct VillageDb {
    pub id: Uuid,
    pub name: String,
    pub code: Option<String>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct VillageWithHouseholdCount {
    pub id: Uuid,
    pub name: String,
    pub code: Option<String>,
    pub household_count: i64,
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateVillageRequest {
    pub name: String,
    pub code: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateVillageRequest {
    pub name: Option<String>,
    pub code: Option<String>,
}
