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
    #[sqlx(default)]
    pub huu_tri: Option<String>,
    #[sqlx(default)]
    pub age75plus: Option<String>,
    #[sqlx(default)]
    pub age70to74poor: Option<String>,
    #[sqlx(default)]
    pub bao_tro: Option<String>,
    #[sqlx(default)]
    pub huu_tuat_bao_hiem: Option<String>,
    #[sqlx(default)]
    pub nguoi_co_cong: Option<String>,
    #[sqlx(default)]
    pub pension_policies: Option<Vec<String>>,
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
    #[serde(skip_serializing_if = "Option::is_none")]
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
    pub huu_tri: Option<String>,
    pub age75plus: Option<String>,
    pub age70to74poor: Option<String>,
    pub bao_tro: Option<String>,
    pub huu_tuat_bao_hiem: Option<String>,
    pub nguoi_co_cong: Option<String>,
    pub pension_policies: Option<Vec<String>>,
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
        let has_real_cccd = db.cccd.as_ref().map(|s| !s.is_empty()).unwrap_or(false)
            || db.cccd_last4.as_ref().map(|s| !s.is_empty()).unwrap_or(false);
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
            huu_tri: db.huu_tri,
            age75plus: db.age75plus,
            age70to74poor: db.age70to74poor,
            bao_tro: db.bao_tro,
            huu_tuat_bao_hiem: db.huu_tuat_bao_hiem,
            nguoi_co_cong: db.nguoi_co_cong,
            pension_policies: db.pension_policies,
            version: db.version,
            is_deleted: Some(db.is_deleted),
            created_at: db.created_at,
            updated_at: db.updated_at,
            household: None,
        }
    }
}

pub fn format_citizen(c: CitizenDb) -> CitizenResponse {
    let decrypted = c.cccd.as_deref().and_then(|raw| {
        if raw.contains(':') {
            crate::crypto::decrypt_cccd(raw).ok()
        } else {
            Some(raw.to_string())
        }
    });
    CitizenResponse::from_db(c, decrypted)
}

fn deserialize_optional_uuid<'de, D>(deserializer: D) -> Result<Option<Uuid>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    let opt = Option::<serde_json::Value>::deserialize(deserializer)?;
    match opt {
        Some(serde_json::Value::String(s)) => {
            let trimmed = s.trim();
            if trimmed.is_empty() {
                Ok(None)
            } else {
                Ok(Uuid::parse_str(trimmed).ok())
            }
        }
        _ => Ok(None),
    }
}

fn deserialize_string_or_bool<'de, D>(deserializer: D) -> Result<Option<String>, D::Error>
where
    D: serde::Deserializer<'de>,
{
    let opt = Option::<serde_json::Value>::deserialize(deserializer)?;
    match opt {
        Some(serde_json::Value::Bool(b)) => {
            if b {
                Ok(Some("x".to_string()))
            } else {
                Ok(Some(String::new()))
            }
        }
        Some(serde_json::Value::String(s)) => {
            let trimmed = s.trim();
            if trimmed.is_empty() {
                Ok(Some(String::new()))
            } else {
                Ok(Some(trimmed.to_string()))
            }
        }
        _ => Ok(None),
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct CreateCitizenInput {
    #[serde(default, deserialize_with = "deserialize_optional_uuid")]
    pub id: Option<Uuid>,
    #[serde(default, deserialize_with = "deserialize_optional_uuid")]
    pub household_id: Option<Uuid>,
    #[serde(rename = "householdId", default, deserialize_with = "deserialize_optional_uuid")]
    pub household_id_camel: Option<Uuid>,
    pub stt: Option<i32>,
    pub is_head: Option<bool>,
    #[serde(rename = "isHead")]
    pub is_head_camel: Option<bool>,
    pub relationship: Option<String>,
    pub full_name: String,
    #[serde(rename = "fullName")]
    pub full_name_camel: Option<String>,
    pub dob: Option<String>,
    pub gender: Option<String>,
    pub cccd: Option<String>,
    pub ethnicity: Option<String>,
    pub religion: Option<String>,
    pub education: Option<String>,
    pub military_status: Option<String>,
    #[serde(rename = "militaryStatus")]
    pub military_status_camel: Option<String>,
    pub occupation: Option<String>,
    pub native_place: Option<String>,
    #[serde(rename = "nativePlace")]
    pub native_place_camel: Option<String>,
    pub notes: Option<String>,
    #[serde(default, deserialize_with = "deserialize_string_or_bool")]
    pub huu_tri: Option<String>,
    #[serde(rename = "huuTri", default, deserialize_with = "deserialize_string_or_bool")]
    pub huu_tri_camel: Option<String>,
    #[serde(default, deserialize_with = "deserialize_string_or_bool")]
    pub age75plus: Option<String>,
    #[serde(rename = "age75Plus", default, deserialize_with = "deserialize_string_or_bool")]
    pub age75plus_camel: Option<String>,
    #[serde(default, deserialize_with = "deserialize_string_or_bool")]
    pub age70to74poor: Option<String>,
    #[serde(rename = "age70To74Poor", default, deserialize_with = "deserialize_string_or_bool")]
    pub age70to74poor_camel: Option<String>,
    #[serde(default, deserialize_with = "deserialize_string_or_bool")]
    pub bao_tro: Option<String>,
    #[serde(rename = "baoTro", default, deserialize_with = "deserialize_string_or_bool")]
    pub bao_tro_camel: Option<String>,
    #[serde(default, deserialize_with = "deserialize_string_or_bool")]
    pub huu_tuat_bao_hiem: Option<String>,
    #[serde(rename = "huuTuatBaoHiem", default, deserialize_with = "deserialize_string_or_bool")]
    pub huu_tuat_bao_hiem_camel: Option<String>,
    #[serde(default, deserialize_with = "deserialize_string_or_bool")]
    pub nguoi_co_cong: Option<String>,
    #[serde(rename = "nguoiCoCong", default, deserialize_with = "deserialize_string_or_bool")]
    pub nguoi_co_cong_camel: Option<String>,
    pub pension_policies: Option<Vec<String>>,
    #[serde(rename = "pensionPolicies")]
    pub pension_policies_camel: Option<Vec<String>>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateCitizenInput {
    #[serde(default, deserialize_with = "deserialize_optional_uuid")]
    pub id: Option<Uuid>,
    pub stt: Option<i32>,
    pub is_head: Option<bool>,
    #[serde(rename = "isHead")]
    pub is_head_camel: Option<bool>,
    pub relationship: Option<String>,
    pub full_name: Option<String>,
    #[serde(rename = "fullName")]
    pub full_name_camel: Option<String>,
    pub dob: Option<String>,
    pub gender: Option<String>,
    pub cccd: Option<String>,
    pub ethnicity: Option<String>,
    pub religion: Option<String>,
    pub education: Option<String>,
    pub military_status: Option<String>,
    #[serde(rename = "militaryStatus")]
    pub military_status_camel: Option<String>,
    pub occupation: Option<String>,
    pub native_place: Option<String>,
    #[serde(rename = "nativePlace")]
    pub native_place_camel: Option<String>,
    pub notes: Option<String>,
    #[serde(default, deserialize_with = "deserialize_string_or_bool")]
    pub huu_tri: Option<String>,
    #[serde(rename = "huuTri", default, deserialize_with = "deserialize_string_or_bool")]
    pub huu_tri_camel: Option<String>,
    #[serde(default, deserialize_with = "deserialize_string_or_bool")]
    pub age75plus: Option<String>,
    #[serde(rename = "age75Plus", default, deserialize_with = "deserialize_string_or_bool")]
    pub age75plus_camel: Option<String>,
    #[serde(default, deserialize_with = "deserialize_string_or_bool")]
    pub age70to74poor: Option<String>,
    #[serde(rename = "age70To74Poor", default, deserialize_with = "deserialize_string_or_bool")]
    pub age70to74poor_camel: Option<String>,
    #[serde(default, deserialize_with = "deserialize_string_or_bool")]
    pub bao_tro: Option<String>,
    #[serde(rename = "baoTro", default, deserialize_with = "deserialize_string_or_bool")]
    pub bao_tro_camel: Option<String>,
    #[serde(default, deserialize_with = "deserialize_string_or_bool")]
    pub huu_tuat_bao_hiem: Option<String>,
    #[serde(rename = "huuTuatBaoHiem", default, deserialize_with = "deserialize_string_or_bool")]
    pub huu_tuat_bao_hiem_camel: Option<String>,
    #[serde(default, deserialize_with = "deserialize_string_or_bool")]
    pub nguoi_co_cong: Option<String>,
    #[serde(rename = "nguoiCoCong", default, deserialize_with = "deserialize_string_or_bool")]
    pub nguoi_co_cong_camel: Option<String>,
    pub pension_policies: Option<Vec<String>>,
    #[serde(rename = "pensionPolicies")]
    pub pension_policies_camel: Option<Vec<String>>,
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
    pub dob: Option<String>,
    pub birth_year: Option<i32>,
    #[serde(rename = "birthYear")]
    pub birth_year_camel: Option<i32>,
    pub min_age: Option<i32>,
    #[serde(rename = "minAge")]
    pub min_age_camel: Option<i32>,
    pub max_age: Option<i32>,
    #[serde(rename = "maxAge")]
    pub max_age_camel: Option<i32>,
    pub include_deleted: Option<bool>,
    #[serde(rename = "includeDeleted")]
    pub include_deleted_camel: Option<String>,
}