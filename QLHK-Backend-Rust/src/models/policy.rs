use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VillageInfo {
    pub id: Uuid,
    pub name: String,
    pub code: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ChucthoProfileDb {
    pub id: Uuid,
    pub stt: Option<i32>,
    pub name: String,
    pub name_unaccented: Option<String>,
    pub dob: Option<String>,
    pub gender: Option<String>,
    pub cccd: Option<String>,
    pub cccd_hash: Option<String>,
    pub cccd_last4: Option<String>,
    pub ethnicity: Option<String>,
    pub residence: Option<String>,
    pub current_address: Option<String>,
    pub village_id: Option<Uuid>,
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
    pub is_deleted: Option<bool>,
    pub deleted_at: Option<DateTime<Utc>>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
    pub version: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct ChucthoProfileRow {
    pub id: Uuid,
    pub stt: Option<i32>,
    pub name: String,
    pub name_unaccented: Option<String>,
    pub dob: Option<String>,
    pub gender: Option<String>,
    pub cccd: Option<String>,
    pub cccd_hash: Option<String>,
    pub cccd_last4: Option<String>,
    pub ethnicity: Option<String>,
    pub residence: Option<String>,
    pub current_address: Option<String>,
    pub village_id: Option<Uuid>,
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
    pub is_deleted: Option<bool>,
    pub deleted_at: Option<DateTime<Utc>>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
    pub version: Option<i32>,
    pub village_name: Option<String>,
    pub village_code: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChucthoProfileResponse {
    pub id: Uuid,
    pub stt: Option<i32>,
    pub name: String,
    pub name_unaccented: Option<String>,
    pub dob: Option<String>,
    pub age: Option<i32>,
    pub gender: Option<String>,
    pub cccd: Option<String>,
    pub cccd_hash: Option<String>,
    pub cccd_last4: Option<String>,
    pub ethnicity: Option<String>,
    pub residence: Option<String>,
    pub current_address: Option<String>,
    pub village_id: Option<Uuid>,
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
    pub is_deleted: Option<bool>,
    pub deleted_at: Option<DateTime<Utc>>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
    pub version: Option<i32>,
    pub village: Option<VillageInfo>,
}

impl ChucthoProfileRow {
    pub fn into_response(self) -> ChucthoProfileResponse {
        let plain_cccd = match self.cccd.as_deref() {
            Some(c) if c.contains(':') => crate::crypto::decrypt_cccd(c).unwrap_or_else(|_| {
                self.cccd_last4
                    .as_deref()
                    .map(|l4| format!("***{}", l4))
                    .unwrap_or_default()
            }),
            Some(c) => c.to_string(),
            None => String::new(),
        };

        let village = if let (Some(vid), Some(vname)) = (self.village_id, self.village_name) {
            Some(VillageInfo {
                id: vid,
                name: vname,
                code: self.village_code,
            })
        } else {
            None
        };

        ChucthoProfileResponse {
            id: self.id,
            stt: self.stt,
            name: self.name,
            name_unaccented: self.name_unaccented,
            dob: self.dob,
            age: None,
            gender: self.gender,
            cccd: Some(plain_cccd),
            cccd_hash: self.cccd_hash,
            cccd_last4: self.cccd_last4,
            ethnicity: self.ethnicity,
            residence: self.residence,
            current_address: self.current_address,
            village_id: self.village_id,
            age60: self.age60,
            age65: self.age65,
            age70: self.age70,
            age75: self.age75,
            age80: self.age80,
            age85: self.age85,
            age90: self.age90,
            age95: self.age95,
            age100: self.age100,
            age_over_100: self.age_over_100,
            received: self.received,
            calculation_year: self.calculation_year,
            notes: self.notes,
            is_deleted: self.is_deleted,
            deleted_at: self.deleted_at,
            created_at: self.created_at,
            updated_at: self.updated_at,
            version: self.version,
            village,
        }
    }
}

impl ChucthoProfileDb {
    pub fn into_response(self, village: Option<VillageInfo>) -> ChucthoProfileResponse {
        let plain_cccd = match self.cccd.as_deref() {
            Some(c) if c.contains(':') => crate::crypto::decrypt_cccd(c).unwrap_or_else(|_| {
                self.cccd_last4
                    .as_deref()
                    .map(|l4| format!("***{}", l4))
                    .unwrap_or_default()
            }),
            Some(c) => c.to_string(),
            None => String::new(),
        };

        ChucthoProfileResponse {
            id: self.id,
            stt: self.stt,
            name: self.name,
            name_unaccented: self.name_unaccented,
            dob: self.dob,
            age: None,
            gender: self.gender,
            cccd: Some(plain_cccd),
            cccd_hash: self.cccd_hash,
            cccd_last4: self.cccd_last4,
            ethnicity: self.ethnicity,
            residence: self.residence,
            current_address: self.current_address,
            village_id: self.village_id,
            age60: self.age60,
            age65: self.age65,
            age70: self.age70,
            age75: self.age75,
            age80: self.age80,
            age85: self.age85,
            age90: self.age90,
            age95: self.age95,
            age100: self.age100,
            age_over_100: self.age_over_100,
            received: self.received,
            calculation_year: self.calculation_year,
            notes: self.notes,
            is_deleted: self.is_deleted,
            deleted_at: self.deleted_at,
            created_at: self.created_at,
            updated_at: self.updated_at,
            version: self.version,
            village,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct HtxhProfileDb {
    pub id: Uuid,
    pub village_id: Uuid,
    pub stt: Option<i32>,
    pub name: String,
    pub name_unaccented: Option<String>,
    pub dob: Option<String>,
    pub gender: Option<String>,
    pub cccd: Option<String>,
    pub cccd_hash: Option<String>,
    pub cccd_last4: Option<String>,
    pub ethnicity: Option<String>,
    pub residence: Option<String>,
    pub current_address: Option<String>,
    pub age75plus: Option<String>,
    pub age70to74poor: Option<String>,
    pub bao_tro: Option<String>,
    pub huu_tri: Option<String>,
    pub huu_tuat_bao_hiem: Option<String>,
    pub nguoi_co_cong: Option<String>,
    pub received: Option<bool>,
    pub notes: Option<String>,
    pub calculation_year: Option<i32>,
    pub is_deleted: Option<bool>,
    pub deleted_at: Option<DateTime<Utc>>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
    pub version: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct HtxhProfileRow {
    pub id: Uuid,
    pub village_id: Uuid,
    pub stt: Option<i32>,
    pub name: String,
    pub name_unaccented: Option<String>,
    pub dob: Option<String>,
    pub gender: Option<String>,
    pub cccd: Option<String>,
    pub cccd_hash: Option<String>,
    pub cccd_last4: Option<String>,
    pub ethnicity: Option<String>,
    pub residence: Option<String>,
    pub current_address: Option<String>,
    pub age75plus: Option<String>,
    pub age70to74poor: Option<String>,
    pub bao_tro: Option<String>,
    pub huu_tri: Option<String>,
    pub huu_tuat_bao_hiem: Option<String>,
    pub nguoi_co_cong: Option<String>,
    pub received: Option<bool>,
    pub notes: Option<String>,
    pub calculation_year: Option<i32>,
    pub is_deleted: Option<bool>,
    pub deleted_at: Option<DateTime<Utc>>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
    pub version: Option<i32>,
    pub village_name: Option<String>,
    pub village_code: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HtxhProfileResponse {
    pub id: Uuid,
    pub village_id: Uuid,
    pub stt: Option<i32>,
    pub name: String,
    pub name_unaccented: Option<String>,
    pub dob: Option<String>,
    pub age: Option<i32>,
    pub gender: Option<String>,
    pub cccd: Option<String>,
    pub cccd_hash: Option<String>,
    pub cccd_last4: Option<String>,
    pub ethnicity: Option<String>,
    pub residence: Option<String>,
    pub current_address: Option<String>,
    pub age75plus: Option<String>,
    pub age70to74poor: Option<String>,
    pub bao_tro: Option<String>,
    pub huu_tri: Option<String>,
    pub huu_tuat_bao_hiem: Option<String>,
    pub nguoi_co_cong: Option<String>,
    pub received: Option<bool>,
    pub notes: Option<String>,
    pub calculation_year: Option<i32>,
    pub is_deleted: Option<bool>,
    pub deleted_at: Option<DateTime<Utc>>,
    pub created_at: Option<DateTime<Utc>>,
    pub updated_at: Option<DateTime<Utc>>,
    pub version: Option<i32>,
    pub village: Option<VillageInfo>,
}

impl HtxhProfileRow {
    pub fn into_response(self) -> HtxhProfileResponse {
        let plain_cccd = match self.cccd.as_deref() {
            Some(c) if c.contains(':') => crate::crypto::decrypt_cccd(c).unwrap_or_else(|_| {
                self.cccd_last4
                    .as_deref()
                    .map(|l4| format!("***{}", l4))
                    .unwrap_or_default()
            }),
            Some(c) => c.to_string(),
            None => String::new(),
        };

        let village = if let Some(vname) = self.village_name {
            Some(VillageInfo {
                id: self.village_id,
                name: vname,
                code: self.village_code,
            })
        } else {
            None
        };

        HtxhProfileResponse {
            id: self.id,
            village_id: self.village_id,
            stt: self.stt,
            name: self.name,
            name_unaccented: self.name_unaccented,
            dob: self.dob,
            age: None,
            gender: self.gender,
            cccd: Some(plain_cccd),
            cccd_hash: self.cccd_hash,
            cccd_last4: self.cccd_last4,
            ethnicity: self.ethnicity,
            residence: self.residence,
            current_address: self.current_address,
            age75plus: self.age75plus,
            age70to74poor: self.age70to74poor,
            bao_tro: self.bao_tro,
            huu_tri: self.huu_tri,
            huu_tuat_bao_hiem: self.huu_tuat_bao_hiem,
            nguoi_co_cong: self.nguoi_co_cong,
            received: self.received,
            notes: self.notes,
            calculation_year: self.calculation_year,
            is_deleted: self.is_deleted,
            deleted_at: self.deleted_at,
            created_at: self.created_at,
            updated_at: self.updated_at,
            version: self.version,
            village,
        }
    }
}

impl HtxhProfileDb {
    pub fn into_response(self, village: Option<VillageInfo>) -> HtxhProfileResponse {
        let plain_cccd = match self.cccd.as_deref() {
            Some(c) if c.contains(':') => crate::crypto::decrypt_cccd(c).unwrap_or_else(|_| {
                self.cccd_last4
                    .as_deref()
                    .map(|l4| format!("***{}", l4))
                    .unwrap_or_default()
            }),
            Some(c) => c.to_string(),
            None => String::new(),
        };

        HtxhProfileResponse {
            id: self.id,
            village_id: self.village_id,
            stt: self.stt,
            name: self.name,
            name_unaccented: self.name_unaccented,
            dob: self.dob,
            age: None,
            gender: self.gender,
            cccd: Some(plain_cccd),
            cccd_hash: self.cccd_hash,
            cccd_last4: self.cccd_last4,
            ethnicity: self.ethnicity,
            residence: self.residence,
            current_address: self.current_address,
            age75plus: self.age75plus,
            age70to74poor: self.age70to74poor,
            bao_tro: self.bao_tro,
            huu_tri: self.huu_tri,
            huu_tuat_bao_hiem: self.huu_tuat_bao_hiem,
            nguoi_co_cong: self.nguoi_co_cong,
            received: self.received,
            notes: self.notes,
            calculation_year: self.calculation_year,
            is_deleted: self.is_deleted,
            deleted_at: self.deleted_at,
            created_at: self.created_at,
            updated_at: self.updated_at,
            version: self.version,
            village,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ChucthoMilestones {
    pub age60: String,
    pub age65: String,
    pub age70: String,
    pub age75: String,
    pub age80: String,
    pub age85: String,
    pub age90: String,
    pub age95: String,
    pub age100: String,
    pub age_over_100: String,
}

pub fn compute_chuctho_milestones(age: i32) -> ChucthoMilestones {
    ChucthoMilestones {
        age60: if (60..=64).contains(&age) { "x".to_string() } else { String::new() },
        age65: if (65..=69).contains(&age) { "x".to_string() } else { String::new() },
        age70: if (70..=74).contains(&age) { "x".to_string() } else { String::new() },
        age75: if (75..=79).contains(&age) { "x".to_string() } else { String::new() },
        age80: if (80..=84).contains(&age) { "x".to_string() } else { String::new() },
        age85: if (85..=89).contains(&age) { "x".to_string() } else { String::new() },
        age90: if (90..=94).contains(&age) { "x".to_string() } else { String::new() },
        age95: if (95..=99).contains(&age) { "x".to_string() } else { String::new() },
        age100: if age == 100 { "x".to_string() } else { String::new() },
        age_over_100: if age > 100 { "x".to_string() } else { String::new() },
    }
}

pub fn parse_dob_value(raw: &str) -> Option<(String, i32)> {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return None;
    }
    let parts: Vec<&str> = trimmed.split(['/', '-', '.']).collect();
    if parts.len() == 3 {
        let p0 = parts[0].parse::<i32>().ok()?;
        let p1 = parts[1].parse::<u32>().ok()?;
        let p2 = parts[2].parse::<i32>().ok()?;
        let (d, m, y) = if parts[0].len() == 4 || p0 > 31 {
            (p2 as u32, p1, p0)
        } else {
            (p0 as u32, p1, p2)
        };
        if !(1..=31).contains(&d) || !(1..=12).contains(&m) || !(1900..=2100).contains(&y) {
            return None;
        }
        return Some((format!("{:02}/{:02}/{}", d, m, y), y));
    }
    if parts.len() == 2 {
        let p0 = parts[0].parse::<i32>().ok()?;
        let p1 = parts[1].parse::<i32>().ok()?;
        let (m, y) = if parts[0].len() == 4 || p0 > 12 {
            (p1 as u32, p0)
        } else {
            (p0 as u32, p1)
        };
        if !(1..=12).contains(&m) || !(1900..=2100).contains(&y) {
            return None;
        }
        return Some((format!("01/{:02}/{}", m, y), y));
    }
    if parts.len() == 1 && trimmed.len() == 4 {
        let y = trimmed.parse::<i32>().ok()?;
        if (1900..=2100).contains(&y) {
            return Some((format!("01/01/{}", y), y));
        }
    }
    None
}

pub fn extract_birth_year(dob: &str) -> Option<i32> {
    if let Some((_, y)) = parse_dob_value(dob) {
        return Some(y);
    }
    let trimmed = dob.trim();
    if trimmed.len() >= 4 {
        let start = &trimmed[..4];
        if let Ok(y) = start.parse::<i32>() {
            if (1900..=2100).contains(&y) {
                return Some(y);
            }
        }
        let end = &trimmed[trimmed.len() - 4..];
        if let Ok(y) = end.parse::<i32>() {
            if (1900..=2100).contains(&y) {
                return Some(y);
            }
        }
    }
    None
}

pub fn calculate_exact_age(dob: &str, reference_date: chrono::NaiveDate) -> Option<i32> {
    use chrono::Datelike;
    let (formatted, birth_year) = parse_dob_value(dob)?;
    let parts: Vec<&str> = formatted.split('/').collect();
    if parts.len() != 3 {
        return None;
    }
    let birth_day = parts[0].parse::<u32>().ok()?;
    let birth_month = parts[1].parse::<u32>().ok()?;

    let ref_year = reference_date.year();
    let ref_month = reference_date.month();
    let ref_day = reference_date.day();

    let mut age = ref_year - birth_year;
    if ref_month < birth_month || (ref_month == birth_month && ref_day < birth_day) {
        age -= 1;
    }
    Some(age)
}

#[derive(Debug, Deserialize)]
pub struct PolicyQueryParams {
    pub page: Option<i64>,
    pub limit: Option<i64>,
    pub village_id: Option<String>,
    #[serde(rename = "villageId")]
    pub village_id_camel: Option<String>,
    pub search: Option<String>,
    pub milestone: Option<String>,
    #[serde(rename = "ageGroup")]
    pub age_group: Option<String>,
    pub category: Option<String>,
    pub status: Option<String>,
    pub received: Option<String>,
    pub year: Option<i32>,
    pub calculation_year: Option<i32>,
    #[serde(rename = "calculationYear")]
    pub calculation_year_camel: Option<i32>,
    pub gender: Option<String>,
    pub ethnicity: Option<String>,
    pub residence: Option<String>,
    #[serde(rename = "sortKey")]
    pub sort_key: Option<String>,
    #[serde(rename = "sortDirection")]
    pub sort_direction: Option<String>,
    pub day: Option<String>,
    pub month: Option<String>,
    pub dob: Option<String>,
    #[serde(rename = "exact_date")]
    pub exact_date: Option<String>,
    #[serde(rename = "exactDate")]
    pub exact_date_camel: Option<String>,
    #[serde(rename = "date_from")]
    pub date_from: Option<String>,
    #[serde(rename = "dateFrom")]
    pub date_from_camel: Option<String>,
    #[serde(rename = "date_to")]
    pub date_to: Option<String>,
    #[serde(rename = "dateTo")]
    pub date_to_camel: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateChucthoDto {
    pub name: String,
    pub dob: Option<String>,
    pub cccd: Option<String>,
    pub stt: Option<i32>,
    pub gender: Option<String>,
    pub ethnicity: Option<String>,
    pub residence: Option<String>,
    pub current_address: Option<String>,
    #[serde(rename = "currentAddress")]
    pub current_address_camel: Option<String>,
    pub village_id: Option<Uuid>,
    #[serde(rename = "villageId")]
    pub village_id_camel: Option<Uuid>,
    pub calculation_year: Option<i32>,
    #[serde(rename = "calculationYear")]
    pub calculation_year_camel: Option<i32>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateChucthoDto {
    pub name: Option<String>,
    pub dob: Option<String>,
    pub cccd: Option<String>,
    pub stt: Option<i32>,
    pub gender: Option<String>,
    pub ethnicity: Option<String>,
    pub residence: Option<String>,
    pub current_address: Option<String>,
    #[serde(rename = "currentAddress")]
    pub current_address_camel: Option<String>,
    pub village_id: Option<Uuid>,
    #[serde(rename = "villageId")]
    pub village_id_camel: Option<Uuid>,
    pub calculation_year: Option<i32>,
    #[serde(rename = "calculationYear")]
    pub calculation_year_camel: Option<i32>,
    pub notes: Option<String>,
    pub received: Option<bool>,
    pub version: Option<i32>,
}

#[derive(Debug, Deserialize)]
pub struct CreateHtxhDto {
    pub name: String,
    pub dob: Option<String>,
    pub cccd: Option<String>,
    pub stt: Option<i32>,
    pub gender: Option<String>,
    pub ethnicity: Option<String>,
    pub residence: Option<String>,
    pub current_address: Option<String>,
    #[serde(rename = "currentAddress")]
    pub current_address_camel: Option<String>,
    pub village_id: Option<Uuid>,
    #[serde(rename = "villageId")]
    pub village_id_camel: Option<Uuid>,
    pub calculation_year: Option<i32>,
    #[serde(rename = "calculationYear")]
    pub calculation_year_camel: Option<i32>,
    pub notes: Option<String>,
    pub age75plus: Option<String>,
    pub age70to74poor: Option<String>,
    pub bao_tro: Option<String>,
    pub huu_tri: Option<String>,
    pub huu_tuat_bao_hiem: Option<String>,
    pub nguoi_co_cong: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateHtxhDto {
    pub name: Option<String>,
    pub dob: Option<String>,
    pub cccd: Option<String>,
    pub stt: Option<i32>,
    pub gender: Option<String>,
    pub ethnicity: Option<String>,
    pub residence: Option<String>,
    pub current_address: Option<String>,
    #[serde(rename = "currentAddress")]
    pub current_address_camel: Option<String>,
    pub village_id: Option<Uuid>,
    #[serde(rename = "villageId")]
    pub village_id_camel: Option<Uuid>,
    pub calculation_year: Option<i32>,
    #[serde(rename = "calculationYear")]
    pub calculation_year_camel: Option<i32>,
    pub notes: Option<String>,
    pub received: Option<bool>,
    pub version: Option<i32>,
    pub age75plus: Option<String>,
    pub age70to74poor: Option<String>,
    pub bao_tro: Option<String>,
    pub huu_tri: Option<String>,
    pub huu_tuat_bao_hiem: Option<String>,
    pub nguoi_co_cong: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct MarkReceivedDto {
    pub received: Option<bool>,
}

#[derive(Debug, Deserialize)]
pub struct PolicySyncRequest {
    pub calculation_year: Option<i32>,
    #[serde(rename = "calculationYear")]
    pub calculation_year_camel: Option<i32>,
    pub village_id: Option<Uuid>,
    #[serde(rename = "villageId")]
    pub village_id_camel: Option<Uuid>,
}

#[derive(Debug, Serialize)]
pub struct PolicySyncResponse {
    pub success: bool,
    pub chuctho_count: usize,
    pub htxh_count: usize,
    #[serde(rename = "chucthoCount")]
    pub chuctho_count_camel: usize,
    #[serde(rename = "htxhCount")]
    pub htxh_count_camel: usize,
    pub message: String,
}

#[derive(Debug, Serialize)]
pub struct PaginationMeta {
    pub total: i64,
    pub page: i64,
    pub limit: i64,
    #[serde(rename = "totalPages")]
    pub total_pages: i64,
}

#[derive(Debug, Serialize)]
pub struct PaginatedResponse<T> {
    pub success: bool,
    pub data: Vec<T>,
    pub pagination: PaginationMeta,
}

#[derive(Debug, Serialize)]
pub struct SingleResponse<T> {
    pub success: bool,
    pub data: T,
}

#[derive(Debug, Serialize)]
pub struct MessageResponse {
    pub success: bool,
    pub message: String,
}
