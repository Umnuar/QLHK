use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct CitizenDb {
    pub id: Uuid,
    pub household_id: Uuid,
    pub stt: Option<i32>,
    pub is_head: bool,
    pub relationship: Option<String>,
    pub full_name: String,
    pub name_unaccented: Option<String>,
    pub dob: Option<String>,
    pub gender: Option<String>,
    pub cccd: Option<String>,
    pub cccd_hash: Option<String>,
    pub cccd_last4: Option<String>,
    pub ethnicity: Option<String>,
    pub religion: Option<String>,
    pub education: Option<String>,
    pub military_status: Option<String>,
    pub occupation: Option<String>,
    pub native_place: Option<String>,
    pub notes: Option<String>,
    pub version: i32,
    pub is_deleted: bool,
    pub deleted_at: Option<DateTime<Utc>>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CitizenResponse {
    pub id: Uuid,
    pub household_id: Uuid,
    pub stt: Option<i32>,
    pub is_head: bool,
    pub relationship: Option<String>,
    pub full_name: String,
    pub name_unaccented: Option<String>,
    pub dob: Option<String>,
    pub gender: Option<String>,
    pub cccd: Option<String>,
    pub cccd_masked: Option<String>,
    pub cccd_last4: Option<String>,
    pub has_cccd: bool,
    pub ethnicity: Option<String>,
    pub religion: Option<String>,
    pub education: Option<String>,
    pub military_status: Option<String>,
    pub occupation: Option<String>,
    pub native_place: Option<String>,
    pub notes: Option<String>,
    pub version: i32,
    pub is_deleted: Option<bool>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
    pub household: Option<CitizenHouseholdInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct CitizenHouseholdInfo {
    pub id: Uuid,
    pub book_number: String,
    pub address: Option<String>,
    pub village_id: Uuid,
    pub village_name: Option<String>,
}

impl CitizenResponse {
    pub fn from_db(db: CitizenDb, decrypted_cccd: Option<String>) -> Self {
        let has_real_cccd = db.cccd.as_ref().map(|s| !s.is_empty()).unwrap_or(false);
        let final_last4 = db.cccd_last4.clone().or_else(|| {
            decrypted_cccd.as_ref().and_then(|plain| {
                if plain.len() >= 4 {
                    Some(plain[plain.len() - 4..].to_string())
                } else {
                    None
                }
            })
        });

        let masked = final_last4
            .as_ref()
            .map(|l4| format!("••••••••{}", l4));

        Self {
            id: db.id,
            household_id: db.household_id,
            stt: db.stt,
            is_head: db.is_head,
            relationship: db.relationship,
            full_name: db.full_name,
            name_unaccented: db.name_unaccented,
            dob: db.dob,
            gender: db.gender,
            cccd: decrypted_cccd.or_else(|| masked.clone()),
            cccd_masked: masked,
            cccd_last4: final_last4,
            has_cccd: has_real_cccd,
            ethnicity: db.ethnicity,
            religion: db.religion,
            education: db.education,
            military_status: db.military_status,
            occupation: db.occupation,
            native_place: db.native_place,
            notes: db.notes,
            version: db.version,
            is_deleted: Some(db.is_deleted),
            created_at: db.created_at,
            updated_at: db.updated_at,
            household: None,
        }
    }
}

pub fn format_citizen(c: CitizenDb) -> CitizenResponse {
    let decrypted = c.cccd.as_deref().and_then(|enc| {
        if enc.contains(':') {
            crate::crypto::decrypt_cccd(enc).ok()
        } else {
            None
        }
    });
    CitizenResponse::from_db(c, decrypted)
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateCitizenInput {
    pub id: Option<Uuid>,
    pub household_id: Option<Uuid>,
    pub stt: Option<i32>,
    pub is_head: Option<bool>,
    pub relationship: Option<String>,
    pub full_name: String,
    pub dob: Option<String>,
    pub gender: Option<String>,
    pub cccd: Option<String>,
    pub ethnicity: Option<String>,
    pub religion: Option<String>,
    pub education: Option<String>,
    pub military_status: Option<String>,
    pub occupation: Option<String>,
    pub native_place: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateCitizenInput {
    pub id: Option<Uuid>,
    pub stt: Option<i32>,
    pub is_head: Option<bool>,
    pub relationship: Option<String>,
    pub full_name: Option<String>,
    pub dob: Option<String>,
    pub gender: Option<String>,
    pub cccd: Option<String>,
    pub ethnicity: Option<String>,
    pub religion: Option<String>,
    pub education: Option<String>,
    pub military_status: Option<String>,
    pub occupation: Option<String>,
    pub native_place: Option<String>,
    pub notes: Option<String>,
    pub version: Option<i32>,
}

#[derive(Debug, Clone, Deserialize, Default)]
pub struct CitizenFilter {
    pub page: Option<i64>,
    pub limit: Option<i64>,
    pub household_id: Option<Uuid>,
    #[serde(rename = "householdId")]
    pub household_id_camel: Option<Uuid>,
    pub village_id: Option<Uuid>,
    #[serde(rename = "villageId")]
    pub village_id_camel: Option<Uuid>,
    pub search: Option<String>,
    pub cccd: Option<String>,
    pub gender: Option<String>,
    pub ethnicity: Option<String>,
    pub religion: Option<String>,
    pub is_head: Option<bool>,
    #[serde(rename = "isHead")]
    pub is_head_camel: Option<bool>,
    pub include_deleted: Option<bool>,
    #[serde(rename = "includeDeleted")]
    pub include_deleted_camel: Option<String>,
}
