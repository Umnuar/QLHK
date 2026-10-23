use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImportResult {
    pub success: bool,
    pub imported_count: usize,
    pub errors: Vec<String>,
}

#[derive(Debug, Clone, Deserialize, Default)]
pub struct ImportQuery {
    pub village_id: Option<Uuid>,
    #[serde(rename = "villageId")]
    pub village_id_camel: Option<Uuid>,
}

#[derive(Debug, Clone, Deserialize, Default)]
pub struct ExportQuery {
    pub village_id: Option<Uuid>,
    #[serde(rename = "villageId")]
    pub village_id_camel: Option<Uuid>,
}

#[derive(Debug, Clone, Deserialize, Default)]
pub struct ChucthoExportQuery {
    pub village_id: Option<Uuid>,
    #[serde(rename = "villageId")]
    pub village_id_camel: Option<Uuid>,
    pub year: Option<i32>,
    #[serde(rename = "calculationYear")]
    pub calculation_year: Option<i32>,
}

#[derive(Debug, Clone, Default)]
pub struct ExcelCitizenRow {
    pub stt: Option<i32>,
    pub book_number: String,
    pub full_name: String,
    pub relationship: Option<String>,
    pub dob: Option<String>,
    pub gender: Option<String>,
    pub ethnicity: Option<String>,
    pub religion: Option<String>,
    pub cccd: Option<String>,
    pub education: Option<String>,
    pub occupation: Option<String>,
    pub workplace: Option<String>,
    pub native_place: Option<String>,
    pub address: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, FromRow)]
pub struct ExportCitizenRow {
    pub stt: Option<i32>,
    pub book_number: String,
    pub full_name: String,
    pub relationship: Option<String>,
    pub is_head: bool,
    pub dob: Option<String>,
    pub gender: Option<String>,
    pub cccd: Option<String>,
    pub cccd_last4: Option<String>,
    pub ethnicity: Option<String>,
    pub religion: Option<String>,
    pub education: Option<String>,
    pub occupation: Option<String>,
    pub native_place: Option<String>,
    pub address: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, FromRow)]
pub struct ExportChucthoRow {
    pub stt: Option<i32>,
    pub name: String,
    pub dob: Option<String>,
    pub gender: Option<String>,
    pub cccd: Option<String>,
    pub ethnicity: Option<String>,
    pub residence: Option<String>,
    pub current_address: Option<String>,
    pub village_name: Option<String>,
    pub age60: Option<String>,
    pub age65: Option<String>,
    pub age70: Option<String>,
    pub age75: Option<String>,
    pub age80: Option<String>,
    pub age85: Option<String>,
    pub age90: Option<String>,
    pub age95: Option<String>,
    pub age100: Option<String>,
    pub age_over_100: Option<String>,
    pub received: Option<bool>,
    pub calculation_year: Option<i32>,
    pub notes: Option<String>,
}
