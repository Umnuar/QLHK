use axum::{
    extract::{Extension, Path, Query, State},
    http::{header, HeaderMap, HeaderValue, StatusCode},
    response::{IntoResponse, Response},
    Json,
};
use chrono::{Datelike, Utc};
use serde_json::json;
use sqlx::{FromRow, QueryBuilder};
use uuid::Uuid;

use crate::{
    middlewares::auth::Claims,
    models::{
        analytics::{
            PolicyAnalyticsData, PolicyCategoryStats, VillagePolicySummary,
        },
        policy::{
            calculate_exact_age, compute_chuctho_milestones,
            extract_birth_year, ChucthoMilestones,
            ChucthoProfileDb, ChucthoProfileResponse, ChucthoProfileRow, CreateChucthoDto, CreateHtxhDto, HtxhProfileDb,
            HtxhProfileResponse, HtxhProfileRow, MarkReceivedDto,
            MessageResponse, PaginatedResponse, PaginationMeta,
            PolicyQueryParams, PolicySyncRequest, PolicySyncResponse,
            SingleResponse, UpdateChucthoDto, UpdateHtxhDto,
        },
    },
    state::AppState,
};

#[derive(Debug, FromRow)]
struct CitizenSyncRow {
    pub id: Uuid,
    pub full_name: String,
    pub name_unaccented: Option<String>,
    pub dob: Option<String>,
    pub gender: Option<String>,
    pub cccd: Option<String>,
    pub cccd_hash: Option<String>,
    pub cccd_last4: Option<String>,
    pub ethnicity: Option<String>,
    pub occupation: Option<String>,
    pub military_status: Option<String>,
    pub notes: Option<String>,
    pub household_address: Option<String>,
    pub household_village_id: Uuid,
    pub household_status: Option<String>,
}

struct NormalizedField {
    lower: String,
    unacc: String,
}

impl NormalizedField {
    fn new(text: &str) -> Option<Self> {
        let trimmed = text.trim();
        if trimmed.is_empty() {
            None
        } else {
            Some(Self {
                lower: trimmed.to_lowercase(),
                unacc: crate::crypto::remove_accents(trimmed),
            })
        }
    }
}

fn check_field<F>(field: &Option<NormalizedField>, f: F) -> bool
where
    F: Fn(&str, &str) -> bool,
{
    match field {
        Some(nf) => f(&nf.lower, &nf.unacc),
        None => false,
    }
}

fn check_any_field<F>(fields: &[&Option<NormalizedField>], f: F) -> bool
where
    F: Fn(&str, &str) -> bool,
{
    fields.iter().any(|field| match field {
        Some(nf) => f(&nf.lower, &nf.unacc),
        None => false,
    })
}

fn is_retiree_normalized(lower: &str, unacc: &str) -> bool {
    lower.contains("hưu")
        || unacc.contains("huu")
        || lower.contains("mất sức")
        || unacc.contains("mat suc")
        || lower.contains("nghỉ việc")
        || unacc.contains("nghi viec")
        || lower.contains("bhxh")
}

fn is_retiree_text(text: &str) -> bool {
    match NormalizedField::new(text) {
        Some(nf) => is_retiree_normalized(&nf.lower, &nf.unacc),
        None => false,
    }
}

fn is_huu_tuat_normalized(lower: &str, unacc: &str) -> bool {
    lower.contains("tuất")
        || unacc.contains("tuat")
        || lower.contains("tiền tuất")
        || unacc.contains("tien tuat")
        || lower.contains("trợ cấp tuất")
        || unacc.contains("tro cap tuat")
}

fn is_huu_tuat_text(text: &str) -> bool {
    match NormalizedField::new(text) {
        Some(nf) => is_huu_tuat_normalized(&nf.lower, &nf.unacc),
        None => false,
    }
}

fn is_bao_tro_normalized(lower: &str, unacc: &str) -> bool {
    lower.contains("bảo trợ")
        || unacc.contains("bao tro")
        || lower.contains("btxh")
        || lower.contains("khuyết tật")
        || unacc.contains("khuyet tat")
        || lower.contains("tàn tật")
        || unacc.contains("tan tat")
        || lower.contains("trợ cấp xã hội")
        || unacc.contains("tro cap xa hoi")
}

fn is_bao_tro_text(text: &str) -> bool {
    match NormalizedField::new(text) {
        Some(nf) => is_bao_tro_normalized(&nf.lower, &nf.unacc),
        None => false,
    }
}

fn is_nguoi_co_cong_normalized(lower: &str, unacc: &str) -> bool {
    lower.contains("người có công")
        || unacc.contains("nguoi co cong")
        || lower.contains("thương binh")
        || unacc.contains("thuong binh")
        || lower.contains("bệnh binh")
        || unacc.contains("benh binh")
        || lower.contains("liệt sĩ")
        || unacc.contains("liet si")
        || lower.contains("anh hùng")
        || unacc.contains("anh hung")
        || lower.contains("bmvnah")
        || lower.contains("da cam")
        || lower.contains("dioxin")
        || lower.contains("có công")
        || unacc.contains("co cong")
}

fn is_nguoi_co_cong_text(text: &str) -> bool {
    match NormalizedField::new(text) {
        Some(nf) => is_nguoi_co_cong_normalized(&nf.lower, &nf.unacc),
        None => false,
    }
}

fn is_poor_normalized(lower: &str, unacc: &str) -> bool {
    lower.contains("nghèo")
        || unacc.contains("ngheo")
        || lower.contains("poor")
}

fn is_poor_status_or_notes(status: &str, notes: &str) -> bool {
    let s_norm = NormalizedField::new(status);
    let n_norm = NormalizedField::new(notes);
    check_any_field(&[&s_norm, &n_norm], is_poor_normalized)
}

fn normalize_chuctho_milestone(raw: &str) -> Option<&'static str> {
    match raw.to_lowercase().replace([' ', '-', '_'], "").as_str() {
        "age60" | "60" | "6064" => Some("age60"),
        "age65" | "65" | "6569" => Some("age65"),
        "age70" | "70" | "7074" => Some("age70"),
        "age75" | "75" | "7579" => Some("age75"),
        "age80" | "80" | "8084" => Some("age80"),
        "age85" | "85" | "8589" => Some("age85"),
        "age90" | "90" | "9094" => Some("age90"),
        "age95" | "95" | "9599" => Some("age95"),
        "age100" | "100" => Some("age100"),
        "ageover100" | "over100" | "100+" | ">100" | "tren100" => Some("age_over_100"),
        _ => None,
    }
}

fn normalize_htxh_category(raw: &str) -> Option<&'static str> {
    match raw.to_lowercase().replace([' ', '-', '_'], "").as_str() {
        "baotro" => Some("bao_tro"),
        "huutri" => Some("huu_tri"),
        "huutuatbaohiem" | "huutuat" | "tuat" | "bhxh" => Some("huu_tuat_bao_hiem"),
        "nguoicocong" | "cocong" => Some("nguoi_co_cong"),
        "age75plus" | "75plus" | "75+" | ">=75" | "75" => Some("age75plus"),
        "age70to74poor" | "70to74poor" | "7074poor" | "70to74" | "7074" => Some("age70to74poor"),
        _ => None,
    }
}

fn parse_received_filter(params: &PolicyQueryParams) -> Option<bool> {
    let status_str = params
        .status
        .as_deref()
        .or(params.received.as_deref())
        .map(|s| s.trim().to_lowercase());
    match status_str.as_deref() {
        Some("received") | Some("true") | Some("1") | Some("da_nhan") | Some("yes") => Some(true),
        Some("unreceived") | Some("false") | Some("0") | Some("chua_nhan") | Some("no") => Some(false),
        _ => None,
    }
}

fn apply_common_policy_filters(
    builder: &mut QueryBuilder<sqlx::Postgres>,
    params: &PolicyQueryParams,
    target_village_id: Option<Uuid>,
    received_filter: Option<bool>,
    search_unaccented: Option<&str>,
    search_raw: Option<&str>,
) {
    if let Some(vid) = target_village_id {
        builder.push(" AND p.village_id = ");
        builder.push_bind(vid);
    }
    if let Some(rec) = received_filter {
        builder.push(" AND p.received = ");
        builder.push_bind(rec);
    }
    if let Some(g) = params.gender.as_deref() {
        let trimmed = g.trim();
        if !trimmed.is_empty() {
            builder.push(" AND p.gender = ");
            builder.push_bind(trimmed.to_string());
        }
    }
    if let Some(e) = params.ethnicity.as_deref() {
        let trimmed = e.trim();
        if !trimmed.is_empty() {
            builder.push(" AND p.ethnicity = ");
            builder.push_bind(trimmed.to_string());
        }
    }
    if let Some(r) = params.residence.as_deref() {
        let trimmed = r.trim();
        if !trimmed.is_empty() {
            builder.push(" AND p.residence = ");
            builder.push_bind(trimmed.to_string());
        }
    }
    if let (Some(u), Some(raw)) = (search_unaccented, search_raw) {
        if !u.is_empty() {
            let char_count = raw.chars().count();
            let last4: String = if char_count >= 4 {
                raw.chars().skip(char_count - 4).collect()
            } else {
                raw.to_string()
            };
            builder.push(" AND (p.name_unaccented ILIKE ");
            builder.push_bind(format!("%{}%", u));
            builder.push(" OR p.cccd_last4 = ");
            builder.push_bind(last4);
            builder.push(")");
        }
    }

    let target_dob = params
        .exact_date
        .as_deref()
        .or(params.exact_date_camel.as_deref())
        .or(params.dob.as_deref())
        .map(|s| s.trim())
        .filter(|s| !s.is_empty());

    if let Some(td) = target_dob {
        let parts: Vec<&str> = td.split(['/', '-', '.']).collect();
        if parts.len() == 3 {
            let p0 = parts[0].parse::<i32>().ok();
            let p1 = parts[1].parse::<u32>().ok();
            let p2 = parts[2].parse::<i32>().ok();
            if let (Some(n0), Some(m), Some(n2)) = (p0, p1, p2) {
                let (d, y) = if parts[0].len() == 4 || n0 > 31 {
                    (n2 as u32, n0)
                } else {
                    (n0 as u32, n2)
                };
                let padded_vn = format!("{:02}/{:02}/{}", d, m, y);
                let unpadded_vn = format!("{}/{}/{}", d, m, y);
                let padded_iso = format!("{}-{:02}-{:02}", y, m, d);
                let padded_dash = format!("{:02}-{:02}-{}", d, m, y);
                builder.push(" AND (p.dob LIKE ");
                builder.push_bind(format!("%{}%", padded_vn));
                builder.push(" OR p.dob LIKE ");
                builder.push_bind(format!("%{}%", unpadded_vn));
                builder.push(" OR p.dob LIKE ");
                builder.push_bind(format!("%{}%", padded_iso));
                builder.push(" OR p.dob LIKE ");
                builder.push_bind(format!("%{}%", padded_dash));
                builder.push(")");
            } else {
                builder.push(" AND p.dob LIKE ");
                builder.push_bind(format!("%{}%", td));
            }
        } else if parts.len() == 2 {
            let p0 = parts[0].parse::<i32>().ok();
            let p1 = parts[1].parse::<i32>().ok();
            if let (Some(n0), Some(n1)) = (p0, p1) {
                let (m, y) = if parts[0].len() == 4 || n0 > 12 {
                    (n1 as u32, n0)
                } else {
                    (n0 as u32, n1)
                };
                let slash_pattern = format!("/{:02}/{}", m, y);
                let slash_unpadded = format!("/{}/{}", m, y);
                let start_slash = format!("{:02}/{}", m, y);
                let start_unpadded = format!("{}/{}", m, y);
                let iso_pattern = format!("{}-{:02}", y, m);
                builder.push(" AND (p.dob LIKE ");
                builder.push_bind(format!("%{}%", slash_pattern));
                builder.push(" OR p.dob LIKE ");
                builder.push_bind(format!("%{}%", slash_unpadded));
                builder.push(" OR p.dob LIKE ");
                builder.push_bind(format!("{}%", start_slash));
                builder.push(" OR p.dob LIKE ");
                builder.push_bind(format!("{}%", start_unpadded));
                builder.push(" OR p.dob LIKE ");
                builder.push_bind(format!("%{}%", iso_pattern));
                builder.push(")");
            } else {
                builder.push(" AND p.dob LIKE ");
                builder.push_bind(format!("%{}%", td));
            }
        } else if parts.len() == 1 {
            builder.push(" AND p.dob LIKE ");
            builder.push_bind(format!("%{}%", td));
        }
    } else {
        let df = params
            .date_from
            .as_deref()
            .or(params.date_from_camel.as_deref())
            .map(|s| s.trim())
            .filter(|s| !s.is_empty());
        let dt = params
            .date_to
            .as_deref()
            .or(params.date_to_camel.as_deref())
            .map(|s| s.trim())
            .filter(|s| !s.is_empty());

        if let Some(from_val) = df {
            if let Some(by) = extract_birth_year(from_val) {
                builder.push(" AND SUBSTRING(p.dob FROM '\\d{4}')::int >= ");
                builder.push_bind(by);
            } else {
                builder.push(" AND p.dob >= ");
                builder.push_bind(from_val.to_string());
            }
        }
        if let Some(to_val) = dt {
            if let Some(by) = extract_birth_year(to_val) {
                builder.push(" AND SUBSTRING(p.dob FROM '\\d{4}')::int <= ");
                builder.push_bind(by);
            } else {
                builder.push(" AND p.dob <= ");
                builder.push_bind(to_val.to_string());
            }
        }
    }

    if let Some(d) = params.day.as_deref() {
        let d_clean = d.trim();
        if !d_clean.is_empty() {
            if let Ok(d_num) = d_clean.parse::<u32>() {
                let d_str = format!("{:02}", d_num);
                builder.push(" AND (p.dob LIKE ");
                builder.push_bind(format!("{}/%", d_str));
                builder.push(" OR p.dob LIKE ");
                builder.push_bind(format!("{}/%", d_clean));
                builder.push(" OR p.dob LIKE ");
                builder.push_bind(format!("%-{}", d_str));
                builder.push(" OR p.dob LIKE ");
                builder.push_bind(format!("%-{}", d_clean));
                builder.push(")");
            }
        }
    }

    if let Some(m) = params.month.as_deref() {
        let m_clean = m.trim();
        if !m_clean.is_empty() {
            if let Ok(m_num) = m_clean.parse::<u32>() {
                let m_str = format!("{:02}", m_num);
                builder.push(" AND (p.dob LIKE ");
                builder.push_bind(format!("%/{}/%", m_str));
                builder.push(" OR p.dob LIKE ");
                builder.push_bind(format!("%/{}/%", m_clean));
                builder.push(" OR p.dob LIKE ");
                builder.push_bind(format!("%-{}-%", m_str));
                builder.push(" OR p.dob LIKE ");
                builder.push_bind(format!("%-{}-%", m_clean));
                builder.push(")");
            }
        }
    }
}

pub async fn get_chuctho_profiles(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<PolicyQueryParams>,
) -> Response {
    let page = params.page.unwrap_or(1).max(1);
    let limit = params.limit.unwrap_or(20).clamp(1, 100);
    let offset = (page - 1) * limit;

    let target_village_id = if claims.role != "admin" {
        claims.village_id.and_then(|v| Uuid::parse_str(&v).ok())
    } else {
        params
            .village_id
            .as_deref()
            .or(params.village_id_camel.as_deref())
            .and_then(|v| Uuid::parse_str(v).ok())
    };

    let target_year = params
        .year
        .or(params.calculation_year)
        .or(params.calculation_year_camel)
        .unwrap_or_else(|| Utc::now().year());
    let ref_date = chrono::NaiveDate::from_ymd_opt(target_year, 12, 31)
        .unwrap_or_else(|| Utc::now().date_naive());

    let sync_pool = state.pool.clone();
    tokio::spawn(async move {
        let missing_candidate_ids = sqlx::query_scalar::<_, Uuid>(
            r#"
            SELECT c.id
            FROM qlhk.citizens c
            JOIN qlhk.households h ON c.household_id = h.id
            WHERE c.is_deleted = false
              AND h.is_deleted = false
              AND ($1::uuid IS NULL OR h.village_id = $1)
              AND c.dob ~ '\d{4}'
              AND SUBSTRING(c.dob FROM '\d{4}')::int <= $2
              AND NOT EXISTS (
                  SELECT 1 FROM qlhk.chuctho_profiles p
                  WHERE p.notes = c.id::text AND p.is_deleted = false
              )
            LIMIT 20
            "#,
        )
        .bind(target_village_id)
        .bind(target_year - 60)
        .fetch_all(&sync_pool)
        .await
        .unwrap_or_default();

        for cid in missing_candidate_ids {
            let _ = sync_single_citizen_to_policies(&sync_pool, cid).await;
        }
    });

    let mut data_builder = QueryBuilder::new(
        "SELECT p.*, v.name as village_name, v.code as village_code FROM qlhk.chuctho_profiles p LEFT JOIN qlhk.villages v ON p.village_id = v.id WHERE p.is_deleted = false",
    );

    let search_unaccented = params
        .search
        .as_deref()
        .map(|s| crate::crypto::remove_accents(s.trim()));
    let search_raw = params.search.as_deref().map(|s| s.trim());
    let received_filter = parse_received_filter(&params);

    let raw_milestone = params
        .milestone
        .as_deref()
        .or(params.age_group.as_deref())
        .map(|s| s.trim())
        .filter(|s| !s.is_empty() && *s != "all");
    let normalized_milestone = raw_milestone.and_then(normalize_chuctho_milestone);

    apply_common_policy_filters(
        &mut data_builder,
        &params,
        target_village_id,
        received_filter,
        search_unaccented.as_deref(),
        search_raw,
    );

    let sort_field = match params.sort_key.as_deref().unwrap_or("stt") {
        "name" => "p.name",
        "dob" => "p.dob",
        "gender" => "p.gender",
        "cccd" => "p.cccd_last4",
        "ethnicity" => "p.ethnicity",
        "residence" => "p.residence",
        "currentAddress" | "current_address" => "p.current_address",
        "received" => "p.received",
        "calculationYear" | "calculation_year" => "p.calculation_year",
        "createdAt" | "created_at" => "p.created_at",
        _ => "p.stt",
    };
    let sort_dir = if params
        .sort_direction
        .as_deref()
        .map(|s| s.to_lowercase())
        .as_deref()
        == Some("desc")
    {
        "DESC"
    } else {
        "ASC"
    };

    data_builder.push(format!(" ORDER BY {} {} NULLS LAST", sort_field, sort_dir));
    let rows = match data_builder
        .build_query_as::<ChucthoProfileRow>()
        .fetch_all(&state.pool)
        .await
    {
        Ok(r) => r,
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Lỗi hệ thống khi tải danh sách chúc thọ" })),
            )
                .into_response();
        }
    };

    let mut filtered = Vec::new();
    for r in rows {
        let mut res = r.into_response();
        res.calculation_year = Some(target_year);
        let age = res
            .dob
            .as_deref()
            .and_then(|d| calculate_exact_age(d, ref_date))
            .or_else(|| {
                res.dob
                    .as_deref()
                    .and_then(extract_birth_year)
                    .map(|by| target_year - by)
            });
        res.age = age;
        if let Some(a) = age {
            if a >= 60 {
                let ms = compute_chuctho_milestones(a);
                let matches_milestone = match normalized_milestone {
                    Some("age60") => ms.age60 == "x",
                    Some("age65") => ms.age65 == "x",
                    Some("age70") => ms.age70 == "x",
                    Some("age75") => ms.age75 == "x",
                    Some("age80") => ms.age80 == "x",
                    Some("age85") => ms.age85 == "x",
                    Some("age90") => ms.age90 == "x",
                    Some("age95") => ms.age95 == "x",
                    Some("age100") => ms.age100 == "x",
                    Some("age_over_100") => ms.age_over_100 == "x",
                    Some(_) => false,
                    None => true,
                };
                if matches_milestone {
                    res.age60 = Some(ms.age60);
                    res.age65 = Some(ms.age65);
                    res.age70 = Some(ms.age70);
                    res.age75 = Some(ms.age75);
                    res.age80 = Some(ms.age80);
                    res.age85 = Some(ms.age85);
                    res.age90 = Some(ms.age90);
                    res.age95 = Some(ms.age95);
                    res.age100 = Some(ms.age100);
                    res.age_over_100 = Some(ms.age_over_100);
                    filtered.push(res);
                }
            }
        }
    }
    let total = filtered.len() as i64;
    let items: Vec<ChucthoProfileResponse> = filtered
        .into_iter()
        .skip(offset as usize)
        .take(limit as usize)
        .collect();

    let total_pages = (total + limit - 1) / limit;

    Json(PaginatedResponse {
        success: true,
        data: items,
        pagination: PaginationMeta {
            total,
            page,
            limit,
            total_pages,
        },
    })
    .into_response()
}

pub async fn create_chuctho_profile(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Json(dto): Json<CreateChucthoDto>,
) -> Response {
    if dto.name.trim().is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": "Họ và tên là bắt buộc" })),
        )
            .into_response();
    }

    let citizen = if let Some(ref c) = dto.cccd {
        if let Ok(enc) = crate::crypto::encrypt_cccd(c.trim()) {
            sqlx::query_scalar::<_, Uuid>(
                "SELECT id FROM qlhk.citizens WHERE cccd_hash = $1 AND is_deleted = false LIMIT 1",
            )
            .bind(&enc.hash)
            .fetch_optional(&state.pool)
            .await
            .ok()
            .flatten()
        } else {
            None
        }
    } else {
        None
    };

    let citizen_id = match citizen {
        Some(cid) => Some(cid),
        None => {
            let unacc = crate::crypto::remove_accents(dto.name.trim());
            sqlx::query_scalar::<_, Uuid>(
                "SELECT id FROM qlhk.citizens WHERE name_unaccented ILIKE $1 AND is_deleted = false ORDER BY created_at DESC LIMIT 1",
            )
            .bind(&unacc)
            .fetch_optional(&state.pool)
            .await
            .ok()
            .flatten()
        }
    };

    let cid = match citizen_id {
        Some(id) => id,
        None => {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({
                    "error": "Không tìm thấy công dân trong Sổ hộ khẩu gốc. Vui lòng đăng ký nhân khẩu vào sổ hộ khẩu trước khi đưa vào diện chính sách."
                })),
            )
                .into_response();
        }
    };

    if let Err(_) = sync_single_citizen_to_policies(&state.pool, cid).await {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": "Lỗi đồng bộ công dân vào danh sách chúc thọ" })),
        )
            .into_response();
    }

    let note_id = cid.to_string();
    let profile = sqlx::query_as::<_, ChucthoProfileDb>(
        "SELECT * FROM qlhk.chuctho_profiles WHERE notes = $1 AND is_deleted = false LIMIT 1",
    )
    .bind(&note_id)
    .fetch_optional(&state.pool)
    .await
    .ok()
    .flatten();

    match profile {
        Some(p) => (
            StatusCode::CREATED,
            Json(SingleResponse {
                success: true,
                data: p.into_response(None),
            }),
        )
            .into_response(),
        None => (
            StatusCode::BAD_REQUEST,
            Json(json!({
                "error": "Công dân chưa đủ điều kiện chúc thọ (độ tuổi phải từ đủ 60 tuổi trở lên)."
            })),
        )
            .into_response(),
    }
}

pub async fn update_chuctho_profile(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(id): Path<String>,
    Json(dto): Json<UpdateChucthoDto>,
) -> Response {
    let profile_id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({ "error": "Mã định danh hồ sơ không hợp lệ (yêu cầu định dạng UUID)" })),
            )
                .into_response();
        }
    };

    let current = match sqlx::query_as::<_, ChucthoProfileDb>(
        "SELECT * FROM qlhk.chuctho_profiles WHERE id = $1 AND is_deleted = false",
    )
    .bind(profile_id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(Some(p)) => p,
        Ok(None) => {
            return (
                StatusCode::NOT_FOUND,
                Json(json!({ "error": "Không tìm thấy hồ sơ" })),
            )
                .into_response();
        }
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Lỗi kiểm tra hồ sơ" })),
            )
                .into_response();
        }
    };

    if let Some(req_version) = dto.version {
        if current.version != Some(req_version) {
            return (
                StatusCode::CONFLICT,
                Json(json!({
                    "error": "OCC_CONFLICT",
                    "message": "Bản ghi đã bị thay đổi bởi phiên khác"
                })),
            )
                .into_response();
        }
    }

    if let Some(ref note_str) = current.notes {
        if let Ok(cid) = Uuid::parse_str(note_str) {
            let citizen_active = sqlx::query_scalar::<_, bool>(
                "SELECT EXISTS(SELECT 1 FROM qlhk.citizens WHERE id = $1 AND is_deleted = false)",
            )
            .bind(cid)
            .fetch_one(&state.pool)
            .await
            .unwrap_or(false);

            if citizen_active {
                if let Some(ref req_name) = dto.name {
                    if req_name.trim() != current.name.trim() {
                        return (
                            StatusCode::BAD_REQUEST,
                            Json(json!({
                                "error": "Không được phép thay đổi họ tên từ phân hệ Chính sách. Mọi biến động nhân thân phải thực hiện trực tiếp từ Sổ hộ khẩu gốc."
                            })),
                        )
                            .into_response();
                    }
                }
                if let Some(ref req_dob) = dto.dob {
                    if let Some(ref cur_dob) = current.dob {
                        if req_dob.trim() != cur_dob.trim() {
                            return (
                                StatusCode::BAD_REQUEST,
                                Json(json!({
                                    "error": "Không được phép thay đổi ngày sinh từ phân hệ Chính sách. Mọi biến động nhân thân phải thực hiện trực tiếp từ Sổ hộ khẩu gốc."
                                })),
                            )
                                .into_response();
                        }
                    }
                }
            }
        }
    }

    let calc_year = dto
        .calculation_year
        .or(dto.calculation_year_camel)
        .or(current.calculation_year)
        .unwrap_or_else(|| Utc::now().year());

    let ref_date = chrono::NaiveDate::from_ymd_opt(calc_year, 12, 31)
        .unwrap_or_else(|| Utc::now().date_naive());

    let age = current
        .dob
        .as_deref()
        .and_then(|d| calculate_exact_age(d, ref_date))
        .or_else(|| {
            current
                .dob
                .as_deref()
                .and_then(extract_birth_year)
                .map(|by| calc_year - by)
        });

    let milestones = match age {
        Some(a) => compute_chuctho_milestones(a),
        None => ChucthoMilestones {
            age60: current.age60.unwrap_or_default(),
            age65: current.age65.unwrap_or_default(),
            age70: current.age70.unwrap_or_default(),
            age75: current.age75.unwrap_or_default(),
            age80: current.age80.unwrap_or_default(),
            age85: current.age85.unwrap_or_default(),
            age90: current.age90.unwrap_or_default(),
            age95: current.age95.unwrap_or_default(),
            age100: current.age100.unwrap_or_default(),
            age_over_100: current.age_over_100.unwrap_or_default(),
        },
    };

    let stt = dto.stt.or(current.stt);
    let notes = dto.notes.or(current.notes);
    let received = dto.received.or(current.received);
    let new_version = current.version.unwrap_or(1) + 1;

    let query = r#"
        UPDATE qlhk.chuctho_profiles
        SET stt = $1, notes = $2, calculation_year = $3, received = $4, version = $5,
            updated_at = NOW(),
            age60 = $6, age65 = $7, age70 = $8, age75 = $9, age80 = $10,
            age85 = $11, age90 = $12, age95 = $13, age100 = $14, age_over_100 = $15
        WHERE id = $16 AND is_deleted = false
        RETURNING *
    "#;

    let updated_result = sqlx::query_as::<_, ChucthoProfileDb>(query)
        .bind(stt)
        .bind(&notes)
        .bind(calc_year)
        .bind(received)
        .bind(new_version)
        .bind(&milestones.age60)
        .bind(&milestones.age65)
        .bind(&milestones.age70)
        .bind(&milestones.age75)
        .bind(&milestones.age80)
        .bind(&milestones.age85)
        .bind(&milestones.age90)
        .bind(&milestones.age95)
        .bind(&milestones.age100)
        .bind(&milestones.age_over_100)
        .bind(profile_id)
        .fetch_one(&state.pool)
        .await;

    match updated_result {
        Ok(updated) => {
            let mut resp = updated.into_response(None);
            resp.age = age;
            Json(SingleResponse {
                success: true,
                data: resp,
            })
            .into_response()
        }
        Err(_) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": "Lỗi khi cập nhật hồ sơ" })),
        )
            .into_response(),
    }
}

pub async fn mark_chuctho_received(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(dto): Json<MarkReceivedDto>,
) -> Response {
    let profile_id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({ "error": "Mã định danh hồ sơ không hợp lệ (yêu cầu định dạng UUID)" })),
            )
                .into_response();
        }
    };

    let received = dto.received.unwrap_or(true);

    let updated_result = sqlx::query_as::<_, ChucthoProfileDb>(
        "UPDATE qlhk.chuctho_profiles SET received = $1, updated_at = NOW() WHERE id = $2 AND is_deleted = false RETURNING *",
    )
    .bind(received)
    .bind(profile_id)
    .fetch_optional(&state.pool)
    .await;

    match updated_result {
        Ok(Some(updated)) => Json(SingleResponse {
            success: true,
            data: updated.into_response(None),
        })
        .into_response(),
        Ok(None) => (
            StatusCode::NOT_FOUND,
            Json(json!({ "error": "Hồ sơ không tồn tại" })),
        )
            .into_response(),
        Err(_) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": "Lỗi cập nhật trạng thái nhận quà" })),
        )
            .into_response(),
    }
}

pub async fn delete_chuctho_profile(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Response {
    let profile_id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({ "error": "Mã định danh hồ sơ không hợp lệ (yêu cầu định dạng UUID)" })),
            )
                .into_response();
        }
    };

    let existing = match sqlx::query_as::<_, ChucthoProfileDb>(
        "SELECT * FROM qlhk.chuctho_profiles WHERE id = $1 AND is_deleted = false",
    )
    .bind(profile_id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(Some(p)) => p,
        Ok(None) => {
            return (
                StatusCode::NOT_FOUND,
                Json(json!({ "error": "Hồ sơ không tồn tại" })),
            )
                .into_response();
        }
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Lỗi kiểm tra hồ sơ" })),
            )
                .into_response();
        }
    };

    if let Some(ref note_str) = existing.notes {
        if let Ok(cid) = Uuid::parse_str(note_str) {
            let citizen_active = sqlx::query_scalar::<_, bool>(
                "SELECT EXISTS(SELECT 1 FROM qlhk.citizens WHERE id = $1 AND is_deleted = false)",
            )
            .bind(cid)
            .fetch_one(&state.pool)
            .await
            .unwrap_or(false);

            if citizen_active {
                return (
                    StatusCode::BAD_REQUEST,
                    Json(json!({
                        "error": "Không được phép xóa trực tiếp hồ sơ chính sách của công dân đang có trong Sổ hộ khẩu gốc. Mọi biến động nhân thân phải thực hiện trực tiếp từ Sổ hộ khẩu gốc."
                    })),
                )
                    .into_response();
            }
        }
    }

    let result = sqlx::query(
        "UPDATE qlhk.chuctho_profiles SET is_deleted = true, deleted_at = NOW() WHERE id = $1 AND is_deleted = false",
    )
    .bind(profile_id)
    .execute(&state.pool)
    .await;

    match result {
        Ok(res) if res.rows_affected() > 0 => Json(MessageResponse {
            success: true,
            message: "Đã xóa hồ sơ thành công".to_string(),
        })
        .into_response(),
        Ok(_) => (
            StatusCode::NOT_FOUND,
            Json(json!({ "error": "Hồ sơ không tồn tại" })),
        )
            .into_response(),
        Err(_) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": "Lỗi khi xóa hồ sơ" })),
        )
            .into_response(),
    }
}

pub async fn get_htxh_profiles(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<PolicyQueryParams>,
) -> Response {
    let page = params.page.unwrap_or(1).max(1);
    let limit = params.limit.unwrap_or(20).clamp(1, 100);
    let offset = (page - 1) * limit;

    let target_village_id = if claims.role != "admin" {
        claims.village_id.and_then(|v| Uuid::parse_str(&v).ok())
    } else {
        params
            .village_id
            .as_deref()
            .or(params.village_id_camel.as_deref())
            .and_then(|v| Uuid::parse_str(v).ok())
    };

    let target_year = params
        .year
        .or(params.calculation_year)
        .or(params.calculation_year_camel)
        .unwrap_or_else(|| Utc::now().year());
    let ref_date = chrono::NaiveDate::from_ymd_opt(target_year, 12, 31)
        .unwrap_or_else(|| Utc::now().date_naive());

    let sync_pool = state.pool.clone();
    tokio::spawn(async move {
        let missing_candidate_ids = sqlx::query_scalar::<_, Uuid>(
            r#"
            SELECT c.id
            FROM qlhk.citizens c
            JOIN qlhk.households h ON c.household_id = h.id
            WHERE c.is_deleted = false
              AND h.is_deleted = false
              AND ($1::uuid IS NULL OR h.village_id = $1)
              AND (
                  c.occupation ILIKE '%hưu%' OR c.occupation ILIKE '%huu%' OR c.occupation ILIKE '%tuất%' OR c.occupation ILIKE '%tuat%'
                  OR c.occupation ILIKE '%bảo trợ%' OR c.occupation ILIKE '%bao tro%'
                  OR c.military_status ILIKE '%thương binh%' OR c.military_status ILIKE '%người có công%'
                  OR c.notes ILIKE '%bảo trợ%' OR c.notes ILIKE '%người có công%' OR c.notes ILIKE '%hộ nghèo%'
                  OR (SUBSTRING(c.dob FROM '\d{4}')::int <= $2)
              )
              AND NOT EXISTS (
                  SELECT 1 FROM qlhk.htxh_profiles p
                  WHERE p.notes = c.id::text AND p.is_deleted = false
              )
            LIMIT 20
            "#,
        )
        .bind(target_village_id)
        .bind(target_year - 70)
        .fetch_all(&sync_pool)
        .await
        .unwrap_or_default();

        for cid in missing_candidate_ids {
            let _ = sync_single_citizen_to_policies(&sync_pool, cid).await;
        }
    });

    let mut count_builder = QueryBuilder::new(
        "SELECT COUNT(*) FROM qlhk.htxh_profiles p WHERE p.is_deleted = false",
    );
    let mut data_builder = QueryBuilder::new(
        "SELECT p.*, v.name as village_name, v.code as village_code FROM qlhk.htxh_profiles p LEFT JOIN qlhk.villages v ON p.village_id = v.id WHERE p.is_deleted = false",
    );

    let search_unaccented = params
        .search
        .as_deref()
        .map(|s| crate::crypto::remove_accents(s.trim()));
    let search_raw = params.search.as_deref().map(|s| s.trim());
    let received_filter = parse_received_filter(&params);

    let raw_category = params
        .category
        .as_deref()
        .or(params.age_group.as_deref())
        .or(params.milestone.as_deref())
        .map(|s| s.trim())
        .filter(|s| !s.is_empty() && *s != "all");
    let normalized_category = raw_category.and_then(normalize_htxh_category);

    for builder in [&mut count_builder, &mut data_builder] {
        apply_common_policy_filters(
            builder,
            &params,
            target_village_id,
            received_filter,
            search_unaccented.as_deref(),
            search_raw,
        );

        if let Some(cat) = normalized_category {
            let static_allowed = [
                "bao_tro",
                "huu_tri",
                "huu_tuat_bao_hiem",
                "nguoi_co_cong",
            ];
            if static_allowed.contains(&cat) {
                builder.push(format!(" AND p.{} = 'x'", cat));
            }
        }
    }

    let sort_field = match params.sort_key.as_deref().unwrap_or("stt") {
        "name" => "p.name",
        "dob" => "p.dob",
        "gender" => "p.gender",
        "cccd" => "p.cccd_last4",
        "ethnicity" => "p.ethnicity",
        "residence" => "p.residence",
        "currentAddress" | "current_address" => "p.current_address",
        "received" => "p.received",
        "calculationYear" | "calculation_year" => "p.calculation_year",
        "createdAt" | "created_at" => "p.created_at",
        _ => "p.stt",
    };
    let sort_dir = if params
        .sort_direction
        .as_deref()
        .map(|s| s.to_lowercase())
        .as_deref()
        == Some("desc")
    {
        "DESC"
    } else {
        "ASC"
    };

    let is_age_category = match normalized_category {
        Some("age75plus") | Some("age70to74poor") => true,
        _ => false,
    };

    let (items, total) = if is_age_category {
        let cat = normalized_category.unwrap_or_default();
        data_builder.push(format!(" ORDER BY {} {} NULLS LAST", sort_field, sort_dir));
        let rows = match data_builder
            .build_query_as::<HtxhProfileRow>()
            .fetch_all(&state.pool)
            .await
        {
            Ok(r) => r,
            Err(_) => {
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(json!({ "error": "Lỗi hệ thống khi tải danh sách HTXH" })),
                )
                    .into_response();
            }
        };

        let mut filtered = Vec::new();
        for r in rows {
            let mut res = r.into_response();
            res.calculation_year = Some(target_year);
            let age = res
                .dob
                .as_deref()
                .and_then(|d| calculate_exact_age(d, ref_date))
                .or_else(|| {
                    res.dob
                        .as_deref()
                        .and_then(extract_birth_year)
                        .map(|by| target_year - by)
                });
            res.age = age;
            if let Some(a) = age {
                if a >= 75 {
                    res.age75plus = Some("x".to_string());
                    res.age70to74poor = Some("".to_string());
                } else if (70..=74).contains(&a) {
                    if res.age70to74poor.as_deref() == Some("x") || res.age75plus.as_deref() == Some("x") {
                        res.age70to74poor = Some("x".to_string());
                    } else {
                        res.age70to74poor = Some("".to_string());
                    }
                    res.age75plus = Some("".to_string());
                } else {
                    res.age75plus = Some("".to_string());
                    res.age70to74poor = Some("".to_string());
                }

                let matches_cat = match cat {
                    "age75plus" => res.age75plus.as_deref() == Some("x"),
                    "age70to74poor" => res.age70to74poor.as_deref() == Some("x"),
                    _ => false,
                };
                if matches_cat {
                    filtered.push(res);
                }
            }
        }
        let total = filtered.len() as i64;
        let paged_items: Vec<HtxhProfileResponse> = filtered
            .into_iter()
            .skip(offset as usize)
            .take(limit as usize)
            .collect();
        (paged_items, total)
    } else {
        data_builder.push(format!(" ORDER BY {} {} NULLS LAST LIMIT ", sort_field, sort_dir));
        data_builder.push_bind(limit);
        data_builder.push(" OFFSET ");
        data_builder.push_bind(offset);

        let total_result = count_builder
            .build_query_as::<(i64,)>()
            .fetch_one(&state.pool)
            .await;

        let total = match total_result {
            Ok((cnt,)) => cnt,
            Err(_) => {
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(json!({ "error": "Lỗi hệ thống khi đếm danh sách HTXH" })),
                )
                    .into_response();
            }
        };

        let rows_result = data_builder
            .build_query_as::<HtxhProfileRow>()
            .fetch_all(&state.pool)
            .await;

        let rows = match rows_result {
            Ok(r) => r,
            Err(_) => {
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(json!({ "error": "Lỗi hệ thống khi tải danh sách HTXH" })),
                )
                    .into_response();
            }
        };

        let paged_items: Vec<HtxhProfileResponse> = rows
            .into_iter()
            .map(|r| {
                let mut res = r.into_response();
                res.calculation_year = Some(target_year);
                let age = res
                    .dob
                    .as_deref()
                    .and_then(|d| calculate_exact_age(d, ref_date))
                    .or_else(|| {
                        res.dob
                            .as_deref()
                            .and_then(extract_birth_year)
                            .map(|by| target_year - by)
                    });
                res.age = age;
                if let Some(a) = age {
                    if a >= 75 {
                        res.age75plus = Some("x".to_string());
                        res.age70to74poor = Some("".to_string());
                    } else if (70..=74).contains(&a) {
                        if res.age70to74poor.as_deref() == Some("x") || res.age75plus.as_deref() == Some("x") {
                            res.age70to74poor = Some("x".to_string());
                        } else {
                            res.age70to74poor = Some("".to_string());
                        }
                        res.age75plus = Some("".to_string());
                    } else {
                        res.age75plus = Some("".to_string());
                        res.age70to74poor = Some("".to_string());
                    }
                }
                res
            })
            .collect();
        (paged_items, total)
    };

    let total_pages = (total + limit - 1) / limit;

    Json(PaginatedResponse {
        success: true,
        data: items,
        pagination: PaginationMeta {
            total,
            page,
            limit,
            total_pages,
        },
    })
    .into_response()
}

pub async fn create_htxh_profile(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Json(dto): Json<CreateHtxhDto>,
) -> Response {
    if dto.name.trim().is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": "Họ tên là bắt buộc" })),
        )
            .into_response();
    }

    let citizen = if let Some(ref c) = dto.cccd {
        if let Ok(enc) = crate::crypto::encrypt_cccd(c.trim()) {
            sqlx::query_scalar::<_, Uuid>(
                "SELECT id FROM qlhk.citizens WHERE cccd_hash = $1 AND is_deleted = false LIMIT 1",
            )
            .bind(&enc.hash)
            .fetch_optional(&state.pool)
            .await
            .ok()
            .flatten()
        } else {
            None
        }
    } else {
        None
    };

    let citizen_id = match citizen {
        Some(cid) => Some(cid),
        None => {
            let unacc = crate::crypto::remove_accents(dto.name.trim());
            sqlx::query_scalar::<_, Uuid>(
                "SELECT id FROM qlhk.citizens WHERE name_unaccented ILIKE $1 AND is_deleted = false ORDER BY created_at DESC LIMIT 1",
            )
            .bind(&unacc)
            .fetch_optional(&state.pool)
            .await
            .ok()
            .flatten()
        }
    };

    let cid = match citizen_id {
        Some(id) => id,
        None => {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({
                    "error": "Không tìm thấy công dân trong Sổ hộ khẩu gốc. Vui lòng đăng ký nhân khẩu vào sổ hộ khẩu trước khi đưa vào diện bảo trợ xã hội."
                })),
            )
                .into_response();
        }
    };

    if let Err(_) = sync_single_citizen_to_policies(&state.pool, cid).await {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": "Lỗi đồng bộ công dân vào danh sách HTXH" })),
        )
            .into_response();
    }

    let note_id = cid.to_string();
    let profile = sqlx::query_as::<_, HtxhProfileDb>(
        "SELECT * FROM qlhk.htxh_profiles WHERE notes = $1 AND is_deleted = false LIMIT 1",
    )
    .bind(&note_id)
    .fetch_optional(&state.pool)
    .await
    .ok()
    .flatten();

    match profile {
        Some(p) => (
            StatusCode::CREATED,
            Json(SingleResponse {
                success: true,
                data: p.into_response(None),
            }),
        )
            .into_response(),
        None => (
            StatusCode::BAD_REQUEST,
            Json(json!({
                "error": "Công dân chưa đủ tiêu chuẩn hưởng hỗ trợ xã hội (phải thuộc diện Hưu trí, Tuất, Bảo trợ, Người có công, hoặc từ 75 tuổi trở lên)."
            })),
        )
            .into_response(),
    }
}

pub async fn update_htxh_profile(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
    Path(id): Path<String>,
    Json(dto): Json<UpdateHtxhDto>,
) -> Response {
    let profile_id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({ "error": "Mã định danh hồ sơ không hợp lệ (yêu cầu định dạng UUID)" })),
            )
                .into_response();
        }
    };

    let current = match sqlx::query_as::<_, HtxhProfileDb>(
        "SELECT * FROM qlhk.htxh_profiles WHERE id = $1 AND is_deleted = false",
    )
    .bind(profile_id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(Some(p)) => p,
        Ok(None) => {
            return (
                StatusCode::NOT_FOUND,
                Json(json!({ "error": "Không tìm thấy hồ sơ HTXH" })),
            )
                .into_response();
        }
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Lỗi kiểm tra hồ sơ HTXH" })),
            )
                .into_response();
        }
    };

    if let Some(req_version) = dto.version {
        if current.version != Some(req_version) {
            return (
                StatusCode::CONFLICT,
                Json(json!({
                    "error": "OCC_CONFLICT",
                    "message": "Bản ghi đã bị thay đổi bởi phiên khác"
                })),
            )
                .into_response();
        }
    }

    if let Some(ref note_str) = current.notes {
        if let Ok(cid) = Uuid::parse_str(note_str) {
            let citizen_active = sqlx::query_scalar::<_, bool>(
                "SELECT EXISTS(SELECT 1 FROM qlhk.citizens WHERE id = $1 AND is_deleted = false)",
            )
            .bind(cid)
            .fetch_one(&state.pool)
            .await
            .unwrap_or(false);

            if citizen_active {
                if let Some(ref req_name) = dto.name {
                    if req_name.trim() != current.name.trim() {
                        return (
                            StatusCode::BAD_REQUEST,
                            Json(json!({
                                "error": "Không được phép thay đổi họ tên từ phân hệ Chính sách. Mọi biến động nhân thân phải thực hiện trực tiếp từ Sổ hộ khẩu gốc."
                            })),
                        )
                            .into_response();
                    }
                }
                if let Some(ref req_dob) = dto.dob {
                    if let Some(ref cur_dob) = current.dob {
                        if req_dob.trim() != cur_dob.trim() {
                            return (
                                StatusCode::BAD_REQUEST,
                                Json(json!({
                                    "error": "Không được phép thay đổi ngày sinh từ phân hệ Chính sách. Mọi biến động nhân thân phải thực hiện trực tiếp từ Sổ hộ khẩu gốc."
                                })),
                            )
                                .into_response();
                        }
                    }
                }
            }
        }
    }

    let calc_year = dto
        .calculation_year
        .or(dto.calculation_year_camel)
        .or(current.calculation_year)
        .unwrap_or_else(|| Utc::now().year());

    let ref_date = chrono::NaiveDate::from_ymd_opt(calc_year, 12, 31)
        .unwrap_or_else(|| Utc::now().date_naive());

    let age = current
        .dob
        .as_deref()
        .and_then(|d| calculate_exact_age(d, ref_date))
        .or_else(|| {
            current
                .dob
                .as_deref()
                .and_then(extract_birth_year)
                .map(|by| calc_year - by)
        });

    let age_val = age.unwrap_or(0);
    let age75plus = if age_val >= 75 {
        "x".to_string()
    } else {
        dto.age75plus.or(current.age75plus).unwrap_or_default()
    };
    let age70to74poor = if (70..=74).contains(&age_val) {
        dto.age70to74poor
            .or(current.age70to74poor)
            .unwrap_or_default()
    } else {
        String::new()
    };
    let bao_tro = dto.bao_tro.or(current.bao_tro).unwrap_or_default();
    let huu_tri = dto.huu_tri.or(current.huu_tri).unwrap_or_default();
    let huu_tuat_bao_hiem = dto
        .huu_tuat_bao_hiem
        .or(current.huu_tuat_bao_hiem)
        .unwrap_or_default();
    let nguoi_co_cong = dto
        .nguoi_co_cong
        .or(current.nguoi_co_cong)
        .unwrap_or_default();

    let stt = dto.stt.or(current.stt);
    let notes = dto.notes.or(current.notes);
    let received = dto.received.or(current.received);
    let new_version = current.version.unwrap_or(1) + 1;

    let query = r#"
        UPDATE qlhk.htxh_profiles
        SET stt = $1, notes = $2, calculation_year = $3, received = $4, version = $5,
            updated_at = NOW(),
            age75plus = $6, age70to74poor = $7, bao_tro = $8, huu_tri = $9,
            huu_tuat_bao_hiem = $10, nguoi_co_cong = $11
        WHERE id = $12 AND is_deleted = false
        RETURNING *
    "#;

    let updated_result = sqlx::query_as::<_, HtxhProfileDb>(query)
        .bind(stt)
        .bind(&notes)
        .bind(calc_year)
        .bind(received)
        .bind(new_version)
        .bind(&age75plus)
        .bind(&age70to74poor)
        .bind(&bao_tro)
        .bind(&huu_tri)
        .bind(&huu_tuat_bao_hiem)
        .bind(&nguoi_co_cong)
        .bind(profile_id)
        .fetch_one(&state.pool)
        .await;

    match updated_result {
        Ok(updated) => {
            let mut resp = updated.into_response(None);
            resp.age = age;
            Json(SingleResponse {
                success: true,
                data: resp,
            })
            .into_response()
        }
        Err(_) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": "Lỗi khi cập nhật hồ sơ HTXH" })),
        )
            .into_response(),
    }
}

pub async fn mark_htxh_received(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(dto): Json<MarkReceivedDto>,
) -> Response {
    let profile_id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({ "error": "Mã định danh hồ sơ không hợp lệ (yêu cầu định dạng UUID)" })),
            )
                .into_response();
        }
    };

    let received = dto.received.unwrap_or(true);

    let updated_result = sqlx::query_as::<_, HtxhProfileDb>(
        "UPDATE qlhk.htxh_profiles SET received = $1, updated_at = NOW() WHERE id = $2 AND is_deleted = false RETURNING *",
    )
    .bind(received)
    .bind(profile_id)
    .fetch_optional(&state.pool)
    .await;

    match updated_result {
        Ok(Some(updated)) => Json(SingleResponse {
            success: true,
            data: updated.into_response(None),
        })
        .into_response(),
        Ok(None) => (
            StatusCode::NOT_FOUND,
            Json(json!({ "error": "Hồ sơ không tồn tại" })),
        )
            .into_response(),
        Err(_) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": "Lỗi cập nhật trạng thái nhận HTXH" })),
        )
            .into_response(),
    }
}

pub async fn delete_htxh_profile(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Response {
    let profile_id = match Uuid::parse_str(&id) {
        Ok(u) => u,
        Err(_) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({ "error": "Mã định danh hồ sơ không hợp lệ (yêu cầu định dạng UUID)" })),
            )
                .into_response();
        }
    };

    let existing = match sqlx::query_as::<_, HtxhProfileDb>(
        "SELECT * FROM qlhk.htxh_profiles WHERE id = $1 AND is_deleted = false",
    )
    .bind(profile_id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(Some(p)) => p,
        Ok(None) => {
            return (
                StatusCode::NOT_FOUND,
                Json(json!({ "error": "Hồ sơ không tồn tại" })),
            )
                .into_response();
        }
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Lỗi kiểm tra hồ sơ HTXH" })),
            )
                .into_response();
        }
    };

    if let Some(ref note_str) = existing.notes {
        if let Ok(cid) = Uuid::parse_str(note_str) {
            let citizen_active = sqlx::query_scalar::<_, bool>(
                "SELECT EXISTS(SELECT 1 FROM qlhk.citizens WHERE id = $1 AND is_deleted = false)",
            )
            .bind(cid)
            .fetch_one(&state.pool)
            .await
            .unwrap_or(false);

            if citizen_active {
                return (
                    StatusCode::BAD_REQUEST,
                    Json(json!({
                        "error": "Không được phép xóa trực tiếp hồ sơ chính sách của công dân đang có trong Sổ hộ khẩu gốc. Mọi biến động nhân thân phải thực hiện trực tiếp từ Sổ hộ khẩu gốc."
                    })),
                )
                    .into_response();
            }
        }
    }

    let result = sqlx::query(
        "UPDATE qlhk.htxh_profiles SET is_deleted = true, deleted_at = NOW() WHERE id = $1 AND is_deleted = false",
    )
    .bind(profile_id)
    .execute(&state.pool)
    .await;

    match result {
        Ok(res) if res.rows_affected() > 0 => Json(MessageResponse {
            success: true,
            message: "Đã xóa hồ sơ HTXH thành công".to_string(),
        })
        .into_response(),
        Ok(_) => (
            StatusCode::NOT_FOUND,
            Json(json!({ "error": "Hồ sơ không tồn tại" })),
        )
            .into_response(),
        Err(_) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": "Lỗi khi xóa hồ sơ HTXH" })),
        )
            .into_response(),
    }
}

pub async fn sync_single_citizen_to_policies(
    pool: &sqlx::PgPool,
    citizen_id: Uuid,
) -> Result<(), sqlx::Error> {
    #[derive(FromRow)]
    struct SingleCitizenRow {
        pub full_name: String,
        pub name_unaccented: Option<String>,
        pub dob: Option<String>,
        pub gender: Option<String>,
        pub cccd: Option<String>,
        pub cccd_hash: Option<String>,
        pub cccd_last4: Option<String>,
        pub ethnicity: Option<String>,
        pub occupation: Option<String>,
        pub military_status: Option<String>,
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
        pub is_deleted: bool,
        pub household_address: Option<String>,
        pub household_village_id: Uuid,
        pub household_status: Option<String>,
        pub household_deleted: bool,
    }

    let citizen = sqlx::query_as::<_, SingleCitizenRow>(
        r#"
        SELECT c.full_name, c.name_unaccented, c.dob, c.gender,
               c.cccd, c.cccd_hash, c.cccd_last4, c.ethnicity, c.occupation,
               c.military_status, c.notes,
               c.huu_tri, c.age75plus, c.age70to74poor, c.bao_tro, c.huu_tuat_bao_hiem, c.nguoi_co_cong, c.pension_policies,
               c.is_deleted,
               h.address as household_address, h.village_id as household_village_id,
               h.status as household_status, h.is_deleted as household_deleted
        FROM qlhk.citizens c
        JOIN qlhk.households h ON c.household_id = h.id
        WHERE c.id = $1
        "#,
    )
    .bind(citizen_id)
    .fetch_optional(pool)
    .await?;

    let note_id = citizen_id.to_string();

    let citizen = match citizen {
        Some(c) => c,
        None => return Ok(()),
    };

    if citizen.is_deleted || citizen.household_deleted {
        let _ = sqlx::query(
            "UPDATE qlhk.chuctho_profiles SET is_deleted = true, deleted_at = NOW() WHERE notes = $1 AND is_deleted = false",
        )
        .bind(&note_id)
        .execute(pool)
        .await;

        let _ = sqlx::query(
            "UPDATE qlhk.htxh_profiles SET is_deleted = true, deleted_at = NOW() WHERE notes = $1 AND is_deleted = false",
        )
        .bind(&note_id)
        .execute(pool)
        .await;

        return Ok(());
    }

    let today = chrono::Utc::now().date_naive();
    let current_year = today.year();
    let ref_date = chrono::NaiveDate::from_ymd_opt(current_year, 12, 31)
        .unwrap_or(today);
    let target_year = current_year;

    let exact_age_today = citizen
        .dob
        .as_deref()
        .and_then(|d| calculate_exact_age(d, today));

    let age_in_target_year = citizen
        .dob
        .as_deref()
        .and_then(|d| calculate_exact_age(d, ref_date))
        .or_else(|| {
            citizen
                .dob
                .as_deref()
                .and_then(extract_birth_year)
                .map(|by| target_year - by)
        });

    let effective_age = exact_age_today.or(age_in_target_year);

    let is_chuctho_eligible = effective_age.map(|a| a >= 60).unwrap_or(false)
        || age_in_target_year.map(|a| a >= 60).unwrap_or(false);

    if is_chuctho_eligible {
        let age_for_milestones = age_in_target_year.unwrap_or_else(|| effective_age.unwrap_or(60));
        let milestones = compute_chuctho_milestones(age_for_milestones);

        let existing_chuctho = match sqlx::query_as::<_, ChucthoProfileDb>(
            "SELECT * FROM qlhk.chuctho_profiles WHERE notes = $1 LIMIT 1",
        )
        .bind(&note_id)
        .fetch_optional(pool)
        .await
        {
            Ok(Some(p)) => Some(p),
            _ => {
                if let Some(ref chash) = citizen.cccd_hash {
                    if !chash.is_empty() {
                        sqlx::query_as::<_, ChucthoProfileDb>(
                            "SELECT * FROM qlhk.chuctho_profiles WHERE cccd_hash = $1 LIMIT 1",
                        )
                        .bind(chash)
                        .fetch_optional(pool)
                        .await
                        .ok()
                        .flatten()
                    } else {
                        None
                    }
                } else {
                    None
                }
            }
        };

        let existing_chuctho = match existing_chuctho {
            Some(p) => Some(p),
            None => {
                if let (Some(u), Some(d)) = (&citizen.name_unaccented, &citizen.dob) {
                    sqlx::query_as::<_, ChucthoProfileDb>(
                        "SELECT * FROM qlhk.chuctho_profiles WHERE name_unaccented = $1 AND dob = $2 AND village_id = $3 LIMIT 1",
                    )
                    .bind(u)
                    .bind(d)
                    .bind(citizen.household_village_id)
                    .fetch_optional(pool)
                    .await
                    .ok()
                    .flatten()
                } else {
                    None
                }
            }
        };

        if let Some(existing) = existing_chuctho {
            let _ = sqlx::query(
                r#"
                UPDATE qlhk.chuctho_profiles
                SET name = $1, name_unaccented = $2, dob = $3, gender = $4,
                    cccd = $5, cccd_hash = $6, cccd_last4 = $7, ethnicity = $8,
                    residence = $9, current_address = $10, village_id = $11,
                    calculation_year = $12, notes = $13, is_deleted = false, deleted_at = NULL, updated_at = NOW(),
                    age60 = $14, age65 = $15, age70 = $16, age75 = $17, age80 = $18,
                    age85 = $19, age90 = $20, age95 = $21, age100 = $22, age_over_100 = $23
                WHERE id = $24
                "#,
            )
            .bind(&citizen.full_name)
            .bind(&citizen.name_unaccented)
            .bind(&citizen.dob)
            .bind(&citizen.gender)
            .bind(&citizen.cccd)
            .bind(&citizen.cccd_hash)
            .bind(&citizen.cccd_last4)
            .bind(&citizen.ethnicity)
            .bind(&citizen.household_address)
            .bind(&citizen.household_address)
            .bind(citizen.household_village_id)
            .bind(target_year)
            .bind(&note_id)
            .bind(&milestones.age60)
            .bind(&milestones.age65)
            .bind(&milestones.age70)
            .bind(&milestones.age75)
            .bind(&milestones.age80)
            .bind(&milestones.age85)
            .bind(&milestones.age90)
            .bind(&milestones.age95)
            .bind(&milestones.age100)
            .bind(&milestones.age_over_100)
            .bind(existing.id)
            .execute(pool)
            .await;
        } else {
            let max_stt = sqlx::query_scalar::<_, Option<i32>>(
                "SELECT MAX(stt) FROM qlhk.chuctho_profiles WHERE village_id = $1",
            )
            .bind(citizen.household_village_id)
            .fetch_one(pool)
            .await
            .ok()
            .flatten()
            .unwrap_or(0);

            let _ = sqlx::query(
                r#"
                INSERT INTO qlhk.chuctho_profiles (
                    id, name, name_unaccented, dob, gender, cccd, cccd_hash, cccd_last4,
                    ethnicity, residence, current_address, village_id, stt, notes,
                    calculation_year, received, is_deleted, version, created_at, updated_at,
                    age60, age65, age70, age75, age80, age85, age90, age95, age100, age_over_100
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8,
                    $9, $10, $11, $12, $13, $14,
                    $15, false, false, 1, NOW(), NOW(),
                    $16, $17, $18, $19, $20, $21, $22, $23, $24, $25
                )
                "#,
            )
            .bind(Uuid::new_v4())
            .bind(&citizen.full_name)
            .bind(&citizen.name_unaccented)
            .bind(&citizen.dob)
            .bind(&citizen.gender)
            .bind(&citizen.cccd)
            .bind(&citizen.cccd_hash)
            .bind(&citizen.cccd_last4)
            .bind(&citizen.ethnicity)
            .bind(&citizen.household_address)
            .bind(&citizen.household_address)
            .bind(citizen.household_village_id)
            .bind(max_stt + 1)
            .bind(&note_id)
            .bind(target_year)
            .bind(&milestones.age60)
            .bind(&milestones.age65)
            .bind(&milestones.age70)
            .bind(&milestones.age75)
            .bind(&milestones.age80)
            .bind(&milestones.age85)
            .bind(&milestones.age90)
            .bind(&milestones.age95)
            .bind(&milestones.age100)
            .bind(&milestones.age_over_100)
            .execute(pool)
            .await;
        }
    } else {
        let _ = sqlx::query(
            "UPDATE qlhk.chuctho_profiles SET is_deleted = true, deleted_at = NOW() WHERE notes = $1 AND is_deleted = false",
        )
        .bind(&note_id)
        .execute(pool)
        .await;
    }

    let occ = citizen.occupation.as_deref().unwrap_or("");
    let mil = citizen.military_status.as_deref().unwrap_or("");
    let not = citizen.notes.as_deref().unwrap_or("");
    let h_status = citizen.household_status.as_deref().unwrap_or("");

    let occ_and_notes = format!("{} {}", occ, not);
    let mil_and_notes = format!("{} {} {}", occ, mil, not);

    let explicit_retiree = citizen.huu_tri.as_deref() == Some("x")
        || citizen.pension_policies.as_ref().map(|p| p.iter().any(|s| s == "huu_tri")).unwrap_or(false);
    let explicit_huu_tuat = citizen.huu_tuat_bao_hiem.as_deref() == Some("x")
        || citizen.pension_policies.as_ref().map(|p| p.iter().any(|s| s == "huu_tuat_bao_hiem")).unwrap_or(false);
    let explicit_bao_tro = citizen.bao_tro.as_deref() == Some("x")
        || citizen.pension_policies.as_ref().map(|p| p.iter().any(|s| s == "bao_tro")).unwrap_or(false);
    let explicit_nguoi_co_cong = citizen.nguoi_co_cong.as_deref() == Some("x")
        || citizen.pension_policies.as_ref().map(|p| p.iter().any(|s| s == "nguoi_co_cong")).unwrap_or(false);
    let explicit_75plus = citizen.age75plus.as_deref() == Some("x")
        || citizen.pension_policies.as_ref().map(|p| p.iter().any(|s| s == "age75plus")).unwrap_or(false);
    let explicit_70to74poor = citizen.age70to74poor.as_deref() == Some("x")
        || citizen.pension_policies.as_ref().map(|p| p.iter().any(|s| s == "age70to74poor")).unwrap_or(false);

    let is_retiree = explicit_retiree || is_retiree_text(&occ_and_notes);
    let is_huu_tuat = explicit_huu_tuat || is_huu_tuat_text(&occ_and_notes);
    let is_bao_tro = explicit_bao_tro || is_bao_tro_text(&occ_and_notes);
    let is_nguoi_co_cong = explicit_nguoi_co_cong || is_nguoi_co_cong_text(&mil_and_notes);

    let htxh_age = age_in_target_year.or(effective_age);
    let is_75plus = explicit_75plus || htxh_age.map(|a| a >= 75).unwrap_or(false);
    let is_70to74poor = explicit_70to74poor || htxh_age
        .map(|a| (70..=74).contains(&a) && is_poor_status_or_notes(h_status, not))
        .unwrap_or(false);

    let is_htxh_eligible = is_retiree || is_huu_tuat || is_bao_tro || is_nguoi_co_cong || is_75plus || is_70to74poor;

    if is_htxh_eligible {
        let existing_htxh = match sqlx::query_as::<_, HtxhProfileDb>(
            "SELECT * FROM qlhk.htxh_profiles WHERE notes = $1 LIMIT 1",
        )
        .bind(&note_id)
        .fetch_optional(pool)
        .await
        {
            Ok(Some(p)) => Some(p),
            _ => {
                if let Some(ref chash) = citizen.cccd_hash {
                    if !chash.is_empty() {
                        sqlx::query_as::<_, HtxhProfileDb>(
                            "SELECT * FROM qlhk.htxh_profiles WHERE cccd_hash = $1 LIMIT 1",
                        )
                        .bind(chash)
                        .fetch_optional(pool)
                        .await
                        .ok()
                        .flatten()
                    } else {
                        None
                    }
                } else {
                    None
                }
            }
        };

        let existing_htxh = match existing_htxh {
            Some(p) => Some(p),
            None => {
                if let (Some(u), Some(d)) = (&citizen.name_unaccented, &citizen.dob) {
                    sqlx::query_as::<_, HtxhProfileDb>(
                        "SELECT * FROM qlhk.htxh_profiles WHERE name_unaccented = $1 AND dob = $2 AND village_id = $3 LIMIT 1",
                    )
                    .bind(u)
                    .bind(d)
                    .bind(citizen.household_village_id)
                    .fetch_optional(pool)
                    .await
                    .ok()
                    .flatten()
                } else {
                    None
                }
            }
        };

        if let Some(existing) = existing_htxh {
            let final_retiree = if is_retiree { "x".to_string() } else { String::new() };
            let final_75plus = if is_75plus { "x".to_string() } else { String::new() };
            let final_70to74poor = if is_70to74poor { "x".to_string() } else { String::new() };
            let final_bao_tro = if is_bao_tro { "x".to_string() } else { String::new() };
            let final_huu_tuat = if is_huu_tuat { "x".to_string() } else { String::new() };
            let final_nguoi_co_cong = if is_nguoi_co_cong { "x".to_string() } else { String::new() };

            let _ = sqlx::query(
                r#"
                UPDATE qlhk.htxh_profiles
                SET name = $1, name_unaccented = $2, dob = $3, gender = $4,
                    cccd = $5, cccd_hash = $6, cccd_last4 = $7, ethnicity = $8,
                    residence = $9, current_address = $10, village_id = $11,
                    calculation_year = $12, notes = $13, is_deleted = false, deleted_at = NULL, updated_at = NOW(),
                    huu_tri = $14, age75plus = $15, age70to74poor = $16, bao_tro = $17,
                    huu_tuat_bao_hiem = $18, nguoi_co_cong = $19
                WHERE id = $20
                "#,
            )
            .bind(&citizen.full_name)
            .bind(&citizen.name_unaccented)
            .bind(&citizen.dob)
            .bind(&citizen.gender)
            .bind(&citizen.cccd)
            .bind(&citizen.cccd_hash)
            .bind(&citizen.cccd_last4)
            .bind(&citizen.ethnicity)
            .bind(&citizen.household_address)
            .bind(&citizen.household_address)
            .bind(citizen.household_village_id)
            .bind(target_year)
            .bind(&note_id)
            .bind(final_retiree)
            .bind(final_75plus)
            .bind(final_70to74poor)
            .bind(final_bao_tro)
            .bind(final_huu_tuat)
            .bind(final_nguoi_co_cong)
            .bind(existing.id)
            .execute(pool)
            .await;
        } else {
            let max_stt = sqlx::query_scalar::<_, Option<i32>>(
                "SELECT MAX(stt) FROM qlhk.htxh_profiles WHERE village_id = $1",
            )
            .bind(citizen.household_village_id)
            .fetch_one(pool)
            .await
            .ok()
            .flatten()
            .unwrap_or(0);

            let val_retiree = if is_retiree { "x" } else { "" };
            let val_75plus = if is_75plus { "x" } else { "" };
            let val_70to74poor = if is_70to74poor { "x" } else { "" };
            let val_bao_tro = if is_bao_tro { "x" } else { "" };
            let val_huu_tuat = if is_huu_tuat { "x" } else { "" };
            let val_nguoi_co_cong = if is_nguoi_co_cong { "x" } else { "" };

            let _ = sqlx::query(
                r#"
                INSERT INTO qlhk.htxh_profiles (
                    id, name, name_unaccented, dob, gender, cccd, cccd_hash, cccd_last4,
                    ethnicity, residence, current_address, village_id, stt, notes,
                    calculation_year, huu_tri, age75plus, age70to74poor, bao_tro,
                    huu_tuat_bao_hiem, nguoi_co_cong, received, is_deleted, version, created_at, updated_at
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8,
                    $9, $10, $11, $12, $13, $14,
                    $15, $16, $17, $18, $19, $20, $21, false, false, 1, NOW(), NOW()
                )
                "#,
            )
            .bind(Uuid::new_v4())
            .bind(&citizen.full_name)
            .bind(&citizen.name_unaccented)
            .bind(&citizen.dob)
            .bind(&citizen.gender)
            .bind(&citizen.cccd)
            .bind(&citizen.cccd_hash)
            .bind(&citizen.cccd_last4)
            .bind(&citizen.ethnicity)
            .bind(&citizen.household_address)
            .bind(&citizen.household_address)
            .bind(citizen.household_village_id)
            .bind(max_stt + 1)
            .bind(&note_id)
            .bind(target_year)
            .bind(val_retiree)
            .bind(val_75plus)
            .bind(val_70to74poor)
            .bind(val_bao_tro)
            .bind(val_huu_tuat)
            .bind(val_nguoi_co_cong)
            .execute(pool)
            .await;
        }
    } else {
        let existing_htxh = sqlx::query_as::<_, HtxhProfileDb>(
            "SELECT * FROM qlhk.htxh_profiles WHERE notes = $1 AND is_deleted = false LIMIT 1",
        )
        .bind(&note_id)
        .fetch_optional(pool)
        .await
        .ok()
        .flatten();

        if let Some(existing) = existing_htxh {
            let has_manual_flags = existing.bao_tro.as_deref() == Some("x")
                || existing.age70to74poor.as_deref() == Some("x")
                || existing.huu_tuat_bao_hiem.as_deref() == Some("x")
                || existing.nguoi_co_cong.as_deref() == Some("x");

            if has_manual_flags {
                let _ = sqlx::query(
                    "UPDATE qlhk.htxh_profiles SET huu_tri = '', age75plus = '', updated_at = NOW() WHERE id = $1",
                )
                .bind(existing.id)
                .execute(pool)
                .await;
            } else {
                let _ = sqlx::query(
                    "UPDATE qlhk.htxh_profiles SET is_deleted = true, deleted_at = NOW() WHERE id = $1",
                )
                .bind(existing.id)
                .execute(pool)
                .await;
            }
        }
    }

    Ok(())
}

pub async fn sync_all_citizens_to_policies(
    pool: &sqlx::PgPool,
    village_id: Option<Uuid>,
    calculation_year: Option<i32>,
) -> Result<(usize, usize), sqlx::Error> {
    let current_year = chrono::Utc::now().year();
    let target_year = calculation_year.unwrap_or(current_year);
    let ref_date = chrono::NaiveDate::from_ymd_opt(target_year, 12, 31)
        .unwrap_or_else(|| chrono::Utc::now().date_naive());

    let query_citizens = r#"
        SELECT c.id, c.full_name, c.name_unaccented, c.dob, c.gender,
               c.cccd, c.cccd_hash, c.cccd_last4, c.ethnicity, c.occupation,
               c.military_status, c.notes,
               h.address as household_address, h.village_id as household_village_id,
               h.status as household_status
        FROM qlhk.citizens c
        JOIN qlhk.households h ON c.household_id = h.id
        WHERE c.is_deleted = false
          AND h.is_deleted = false
          AND ($1::uuid IS NULL OR h.village_id = $1)
        ORDER BY c.created_at ASC
    "#;

    let citizens = sqlx::query_as::<_, CitizenSyncRow>(query_citizens)
        .bind(village_id)
        .fetch_all(pool)
        .await?;

    let mut chuctho_count = 0usize;
    let mut htxh_count = 0usize;

    for chunk in citizens.chunks(100) {
        let mut evaluated = Vec::with_capacity(chunk.len());
        let mut chuctho_notes = Vec::new();
        let mut htxh_notes = Vec::new();

        for citizen in chunk {
            let note_id = citizen.id.to_string();
            let age = citizen
                .dob
                .as_deref()
                .and_then(|d| calculate_exact_age(d, ref_date))
                .or_else(|| {
                    citizen
                        .dob
                        .as_deref()
                        .and_then(extract_birth_year)
                        .map(|by| target_year - by)
                });

            let is_chuctho_eligible = age.map(|a| a >= 60).unwrap_or(false);
            if is_chuctho_eligible {
                chuctho_notes.push(note_id.clone());
            }

            let occ_norm = NormalizedField::new(citizen.occupation.as_deref().unwrap_or(""));
            let mil_norm = NormalizedField::new(citizen.military_status.as_deref().unwrap_or(""));
            let not_norm = NormalizedField::new(citizen.notes.as_deref().unwrap_or(""));

            let is_retiree = check_any_field(&[&occ_norm, &not_norm], is_retiree_normalized);
            let is_huu_tuat = check_any_field(&[&occ_norm, &not_norm], is_huu_tuat_normalized);
            let is_bao_tro = check_any_field(&[&occ_norm, &not_norm], is_bao_tro_normalized);
            let is_nguoi_co_cong = check_any_field(&[&occ_norm, &mil_norm, &not_norm], is_nguoi_co_cong_normalized);
            let is_75plus = age.map(|a| a >= 75).unwrap_or(false);
            let is_70to74poor = age
                .map(|a| {
                    (70..=74).contains(&a)
                        && (check_field(
                            &NormalizedField::new(citizen.household_status.as_deref().unwrap_or("")),
                            is_poor_normalized,
                        ) || check_field(&not_norm, is_poor_normalized))
                })
                .unwrap_or(false);

            let is_htxh_eligible = is_retiree
                || is_huu_tuat
                || is_bao_tro
                || is_nguoi_co_cong
                || is_75plus
                || is_70to74poor;

            if is_htxh_eligible {
                htxh_notes.push(note_id.clone());
            }

            evaluated.push((
                citizen,
                note_id,
                age,
                is_retiree,
                is_huu_tuat,
                is_bao_tro,
                is_nguoi_co_cong,
                is_75plus,
                is_70to74poor,
                is_htxh_eligible,
            ));
        }

        let mut tx = pool.begin().await?;

        let mut chuctho_map = std::collections::HashMap::new();
        if !chuctho_notes.is_empty() {
            let existing = sqlx::query_as::<_, ChucthoProfileDb>(
                "SELECT * FROM qlhk.chuctho_profiles WHERE notes = ANY($1::text[])",
            )
            .bind(&chuctho_notes)
            .fetch_all(&mut *tx)
            .await?;

            for profile in existing {
                if let Some(ref note) = profile.notes {
                    chuctho_map.entry(note.clone()).or_insert(profile);
                }
            }
        }

        let mut htxh_map = std::collections::HashMap::new();
        if !htxh_notes.is_empty() {
            let existing = sqlx::query_as::<_, HtxhProfileDb>(
                "SELECT * FROM qlhk.htxh_profiles WHERE notes = ANY($1::text[])",
            )
            .bind(&htxh_notes)
            .fetch_all(&mut *tx)
            .await?;

            for profile in existing {
                if let Some(ref note) = profile.notes {
                    htxh_map.entry(note.clone()).or_insert(profile);
                }
            }
        }

        for (
            citizen,
            note_id,
            age,
            is_retiree,
            is_huu_tuat,
            is_bao_tro,
            is_nguoi_co_cong,
            is_75plus,
            is_70to74poor,
            is_htxh_eligible,
        ) in evaluated
        {
            if let Some(age_val) = age {
                if age_val >= 60 {
                    let milestones = compute_chuctho_milestones(age_val);

                    if let Some(ext) = chuctho_map.get(&note_id) {
                        let _ = sqlx::query(
                            r#"
                            UPDATE qlhk.chuctho_profiles
                            SET name = $1, name_unaccented = $2, dob = $3, gender = $4,
                                cccd = $5, cccd_hash = $6, cccd_last4 = $7, ethnicity = $8,
                                residence = $9, current_address = $10, village_id = $11,
                                calculation_year = $12, notes = $13, is_deleted = false, deleted_at = NULL, updated_at = NOW(),
                                age60 = $14, age65 = $15, age70 = $16, age75 = $17, age80 = $18,
                                age85 = $19, age90 = $20, age95 = $21, age100 = $22, age_over_100 = $23
                            WHERE id = $24
                            "#,
                        )
                        .bind(&citizen.full_name)
                        .bind(&citizen.name_unaccented)
                        .bind(&citizen.dob)
                        .bind(&citizen.gender)
                        .bind(&citizen.cccd)
                        .bind(&citizen.cccd_hash)
                        .bind(&citizen.cccd_last4)
                        .bind(&citizen.ethnicity)
                        .bind(&citizen.household_address)
                        .bind(&citizen.household_address)
                        .bind(citizen.household_village_id)
                        .bind(target_year)
                        .bind(&note_id)
                        .bind(&milestones.age60)
                        .bind(&milestones.age65)
                        .bind(&milestones.age70)
                        .bind(&milestones.age75)
                        .bind(&milestones.age80)
                        .bind(&milestones.age85)
                        .bind(&milestones.age90)
                        .bind(&milestones.age95)
                        .bind(&milestones.age100)
                        .bind(&milestones.age_over_100)
                        .bind(ext.id)
                        .execute(&mut *tx)
                        .await;
                    } else {
                        let _ = sqlx::query(
                            r#"
                            INSERT INTO qlhk.chuctho_profiles (
                                id, name, name_unaccented, dob, gender, cccd, cccd_hash, cccd_last4,
                                ethnicity, residence, current_address, village_id, stt, notes,
                                calculation_year, received, is_deleted, version, created_at, updated_at,
                                age60, age65, age70, age75, age80, age85, age90, age95, age100, age_over_100
                            ) VALUES (
                                $1, $2, $3, $4, $5, $6, $7, $8,
                                $9, $10, $11, $12, $13, $14,
                                $15, false, false, 1, NOW(), NOW(),
                                $16, $17, $18, $19, $20, $21, $22, $23, $24, $25
                            )
                            "#,
                        )
                        .bind(Uuid::new_v4())
                        .bind(&citizen.full_name)
                        .bind(&citizen.name_unaccented)
                        .bind(&citizen.dob)
                        .bind(&citizen.gender)
                        .bind(&citizen.cccd)
                        .bind(&citizen.cccd_hash)
                        .bind(&citizen.cccd_last4)
                        .bind(&citizen.ethnicity)
                        .bind(&citizen.household_address)
                        .bind(&citizen.household_address)
                        .bind(citizen.household_village_id)
                        .bind((chuctho_count + 1) as i32)
                        .bind(&note_id)
                        .bind(target_year)
                        .bind(&milestones.age60)
                        .bind(&milestones.age65)
                        .bind(&milestones.age70)
                        .bind(&milestones.age75)
                        .bind(&milestones.age80)
                        .bind(&milestones.age85)
                        .bind(&milestones.age90)
                        .bind(&milestones.age95)
                        .bind(&milestones.age100)
                        .bind(&milestones.age_over_100)
                        .execute(&mut *tx)
                        .await;
                    }
                    chuctho_count += 1;
                }
            }

            if is_htxh_eligible {
                let val_retiree = if is_retiree { "x" } else { "" };
                let val_75plus = if is_75plus { "x" } else { "" };
                let val_70to74poor = if is_70to74poor { "x" } else { "" };
                let val_bao_tro = if is_bao_tro { "x" } else { "" };
                let val_huu_tuat = if is_huu_tuat { "x" } else { "" };
                let val_nguoi_co_cong = if is_nguoi_co_cong { "x" } else { "" };

                if let Some(ext) = htxh_map.get(&note_id) {
                    let final_retiree = if is_retiree {
                        "x".to_string()
                    } else {
                        ext.huu_tri.clone().unwrap_or_default()
                    };
                    let final_75plus = if is_75plus {
                        "x".to_string()
                    } else {
                        ext.age75plus.clone().unwrap_or_default()
                    };
                    let final_70to74poor = if is_70to74poor {
                        "x".to_string()
                    } else {
                        ext.age70to74poor.clone().unwrap_or_default()
                    };
                    let final_bao_tro = if is_bao_tro {
                        "x".to_string()
                    } else {
                        ext.bao_tro.clone().unwrap_or_default()
                    };
                    let final_huu_tuat = if is_huu_tuat {
                        "x".to_string()
                    } else {
                        ext.huu_tuat_bao_hiem.clone().unwrap_or_default()
                    };
                    let final_nguoi_co_cong = if is_nguoi_co_cong {
                        "x".to_string()
                    } else {
                        ext.nguoi_co_cong.clone().unwrap_or_default()
                    };

                    let _ = sqlx::query(
                        r#"
                        UPDATE qlhk.htxh_profiles
                        SET name = $1, name_unaccented = $2, dob = $3, gender = $4,
                            cccd = $5, cccd_hash = $6, cccd_last4 = $7, ethnicity = $8,
                            residence = $9, current_address = $10, village_id = $11,
                            calculation_year = $12, notes = $13, is_deleted = false, deleted_at = NULL, updated_at = NOW(),
                            huu_tri = $14, age75plus = $15, age70to74poor = $16, bao_tro = $17,
                            huu_tuat_bao_hiem = $18, nguoi_co_cong = $19
                        WHERE id = $20
                        "#,
                    )
                    .bind(&citizen.full_name)
                    .bind(&citizen.name_unaccented)
                    .bind(&citizen.dob)
                    .bind(&citizen.gender)
                    .bind(&citizen.cccd)
                    .bind(&citizen.cccd_hash)
                    .bind(&citizen.cccd_last4)
                    .bind(&citizen.ethnicity)
                    .bind(&citizen.household_address)
                    .bind(&citizen.household_address)
                    .bind(citizen.household_village_id)
                    .bind(target_year)
                    .bind(&note_id)
                    .bind(final_retiree)
                    .bind(final_75plus)
                    .bind(final_70to74poor)
                    .bind(final_bao_tro)
                    .bind(final_huu_tuat)
                    .bind(final_nguoi_co_cong)
                    .bind(ext.id)
                    .execute(&mut *tx)
                    .await;
                } else {
                    let _ = sqlx::query(
                        r#"
                        INSERT INTO qlhk.htxh_profiles (
                            id, name, name_unaccented, dob, gender, cccd, cccd_hash, cccd_last4,
                            ethnicity, residence, current_address, village_id, stt, notes,
                            calculation_year, huu_tri, age75plus, age70to74poor, bao_tro,
                            huu_tuat_bao_hiem, nguoi_co_cong, received, is_deleted, version, created_at, updated_at
                        ) VALUES (
                            $1, $2, $3, $4, $5, $6, $7, $8,
                            $9, $10, $11, $12, $13, $14,
                            $15, $16, $17, $18, $19, $20, $21, false, false, 1, NOW(), NOW()
                        )
                        "#,
                    )
                    .bind(Uuid::new_v4())
                    .bind(&citizen.full_name)
                    .bind(&citizen.name_unaccented)
                    .bind(&citizen.dob)
                    .bind(&citizen.gender)
                    .bind(&citizen.cccd)
                    .bind(&citizen.cccd_hash)
                    .bind(&citizen.cccd_last4)
                    .bind(&citizen.ethnicity)
                    .bind(&citizen.household_address)
                    .bind(&citizen.household_address)
                    .bind(citizen.household_village_id)
                    .bind((htxh_count + 1) as i32)
                    .bind(&note_id)
                    .bind(target_year)
                    .bind(val_retiree)
                    .bind(val_75plus)
                    .bind(val_70to74poor)
                    .bind(val_bao_tro)
                    .bind(val_huu_tuat)
                    .bind(val_nguoi_co_cong)
                    .execute(&mut *tx)
                    .await;
                }
                htxh_count += 1;
            }
        }

        tx.commit().await?;
    }

    Ok((chuctho_count, htxh_count))
}

pub async fn sync_policy_data(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    body: Option<Json<PolicySyncRequest>>,
) -> Response {
    let req_data = body.map(|b| b.0).unwrap_or(PolicySyncRequest {
        calculation_year: None,
        calculation_year_camel: None,
        village_id: None,
        village_id_camel: None,
    });

    let target_year = req_data
        .calculation_year
        .or(req_data.calculation_year_camel)
        .unwrap_or_else(|| Utc::now().year());

    let target_village_id = if claims.role == "admin" {
        req_data
            .village_id
            .or(req_data.village_id_camel)
            .or_else(|| claims.village_id.and_then(|v| Uuid::parse_str(&v).ok()))
    } else {
        claims.village_id.and_then(|v| Uuid::parse_str(&v).ok())
    };

    match sync_all_citizens_to_policies(&state.pool, target_village_id, Some(target_year)).await {
        Ok((chuctho_count, htxh_count)) => Json(PolicySyncResponse {
            success: true,
            chuctho_count,
            htxh_count,
            chuctho_count_camel: chuctho_count,
            htxh_count_camel: htxh_count,
            message: "Đồng bộ dữ liệu chính sách thành công".to_string(),
        })
        .into_response(),
        Err(_) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": "Lỗi hệ thống khi đồng bộ dữ liệu chính sách" })),
        )
            .into_response(),
    }
}

pub fn extract_occupation_from_json(json_str: &str) -> Option<String> {
    let parsed: serde_json::Value = serde_json::from_str(json_str).ok()?;
    if let Some(occ) = parsed.get("occupation").and_then(|v| v.as_str()) {
        return Some(occ.to_string());
    }
    if let Some(occ) = parsed.get("nghe_nghiep").and_then(|v| v.as_str()) {
        return Some(occ.to_string());
    }
    if let Some(occ) = parsed.get("ngheNghiep").and_then(|v| v.as_str()) {
        return Some(occ.to_string());
    }
    if let Some(citizen) = parsed.get("citizen") {
        if let Some(occ) = citizen.get("occupation").and_then(|v| v.as_str()) {
            return Some(occ.to_string());
        }
        if let Some(occ) = citizen.get("nghe_nghiep").and_then(|v| v.as_str()) {
            return Some(occ.to_string());
        }
        if let Some(occ) = citizen.get("ngheNghiep").and_then(|v| v.as_str()) {
            return Some(occ.to_string());
        }
    }
    None
}

pub fn is_retiree_occupation(occ: &str) -> bool {
    is_retiree_text(occ)
}

#[derive(FromRow)]
pub struct AuditSyncCandidate {
    pub id: Uuid,
    pub entity_id: Option<String>,
    pub action: String,
    pub old_values: Option<String>,
    pub new_values: Option<String>,
    pub created_at: Option<chrono::DateTime<chrono::Utc>>,
}

pub async fn check_and_sync_recent_audit_retirees(
    pool: &sqlx::PgPool,
    last_checked_at: chrono::DateTime<chrono::Utc>,
) -> Result<chrono::DateTime<chrono::Utc>, sqlx::Error> {
    let logs = sqlx::query_as::<_, AuditSyncCandidate>(
        r#"
        SELECT id, entity_id, action, old_values, new_values, created_at
        FROM qlhk.audit_logs
        WHERE entity_type = 'citizen'
          AND created_at > $1
          AND action IN ('CREATE', 'UPDATE', 'DELETE')
        ORDER BY created_at ASC
        LIMIT 100
        "#,
    )
    .bind(last_checked_at)
    .fetch_all(pool)
    .await?;

    let mut newest_time = last_checked_at;

    for log in logs {
        if let Some(created) = log.created_at {
            if created > newest_time {
                newest_time = created;
            }
        }

        let cid = log
            .entity_id
            .as_deref()
            .and_then(|s| Uuid::parse_str(s).ok())
            .or_else(|| {
                log.new_values.as_deref().and_then(|s| {
                    let val: serde_json::Value = serde_json::from_str(s).ok()?;
                    val.get("id").and_then(|v| v.as_str()).and_then(|s| Uuid::parse_str(s).ok())
                })
            })
            .or_else(|| {
                log.old_values.as_deref().and_then(|s| {
                    let val: serde_json::Value = serde_json::from_str(s).ok()?;
                    val.get("id").and_then(|v| v.as_str()).and_then(|s| Uuid::parse_str(s).ok())
                })
            });

        if let Some(citizen_id) = cid {
            let _ = sync_single_citizen_to_policies(pool, citizen_id).await;
        }
    }

    Ok(newest_time)
}

pub async fn start_audit_retiree_watcher(pool: sqlx::PgPool) {
    let _ = sqlx::query(
        "CREATE INDEX IF NOT EXISTS idx_audit_logs_citizen_watcher ON qlhk.audit_logs (created_at ASC) WHERE entity_type = 'citizen'",
    )
    .execute(&pool)
    .await;

    let mut last_checked = chrono::Utc::now() - chrono::Duration::minutes(1);
    loop {
        tokio::time::sleep(tokio::time::Duration::from_secs(3)).await;
        match check_and_sync_recent_audit_retirees(&pool, last_checked).await {
            Ok(new_time) => {
                last_checked = new_time;
            }
            Err(_) => {}
        }
    }
}

pub async fn get_policy_analytics(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<PolicyQueryParams>,
) -> Response {
    let target_village_id = if claims.role != "admin" {
        claims.village_id.and_then(|v| Uuid::parse_str(&v).ok())
    } else {
        params
            .village_id
            .as_deref()
            .or(params.village_id_camel.as_deref())
            .and_then(|v| Uuid::parse_str(v).ok())
    };

    let calc_year = params
        .year
        .or(params.calculation_year)
        .or(params.calculation_year_camel)
        .unwrap_or_else(|| Utc::now().year());

    #[derive(FromRow)]
    struct ChucthoAnalyticsRow {
        pub village_id: Option<Uuid>,
        pub received: Option<bool>,
        pub dob: Option<String>,
    }

    #[derive(FromRow)]
    struct HtxhAnalyticsRow {
        pub village_id: Uuid,
        pub received: Option<bool>,
        pub dob: Option<String>,
        pub age75plus: Option<String>,
        pub age70to74poor: Option<String>,
        pub bao_tro: Option<String>,
        pub huu_tri: Option<String>,
        pub huu_tuat_bao_hiem: Option<String>,
        pub nguoi_co_cong: Option<String>,
    }

    #[derive(FromRow)]
    struct VillageRow {
        pub id: Uuid,
        pub name: String,
    }

    let chuctho_rows = sqlx::query_as::<_, ChucthoAnalyticsRow>(
        r#"
        SELECT village_id, received, dob
        FROM qlhk.chuctho_profiles
        WHERE is_deleted = false AND ($1::uuid IS NULL OR village_id = $1)
        "#,
    )
    .bind(target_village_id)
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default();

    let htxh_rows = sqlx::query_as::<_, HtxhAnalyticsRow>(
        r#"
        SELECT village_id, received, dob, age75plus, age70to74poor, bao_tro, huu_tri, huu_tuat_bao_hiem, nguoi_co_cong
        FROM qlhk.htxh_profiles
        WHERE is_deleted = false AND ($1::uuid IS NULL OR village_id = $1)
        "#,
    )
    .bind(target_village_id)
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default();

    let villages = sqlx::query_as::<_, VillageRow>(
        "SELECT id, name FROM qlhk.villages ORDER BY name ASC",
    )
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default();

    let ref_date = chrono::NaiveDate::from_ymd_opt(calc_year, 12, 31)
        .unwrap_or_else(|| Utc::now().date_naive());

    let eligible_chuctho: Vec<(&ChucthoAnalyticsRow, ChucthoMilestones)> = chuctho_rows
        .iter()
        .filter_map(|c| {
            let age = c
                .dob
                .as_deref()
                .and_then(|d| calculate_exact_age(d, ref_date))
                .or_else(|| {
                    c.dob
                        .as_deref()
                        .and_then(extract_birth_year)
                        .map(|by| calc_year - by)
                });
            if let Some(a) = age {
                if a >= 60 {
                    let ms = compute_chuctho_milestones(a);
                    return Some((c, ms));
                }
            }
            None
        })
        .collect();

    let chuctho_total = eligible_chuctho.len() as i64;
    let chuctho_received = eligible_chuctho
        .iter()
        .filter(|(c, _)| c.received == Some(true))
        .count() as i64;
    let chuctho_unreceived = chuctho_total - chuctho_received;
    let chuctho_rate = if chuctho_total > 0 {
        format!("{:.1}", (chuctho_received as f64 / chuctho_total as f64) * 100.0)
    } else {
        "0.0".to_string()
    };

    let mut chuctho_milestones_map = std::collections::HashMap::new();
    let milestones = [
        "age60", "age65", "age70", "age75", "age80", "age85", "age90", "age95",
        "age100", "age_over_100",
    ];
    for m in milestones {
        let count = eligible_chuctho
            .iter()
            .filter(|(_, ms)| match m {
                "age60" => ms.age60 == "x",
                "age65" => ms.age65 == "x",
                "age70" => ms.age70 == "x",
                "age75" => ms.age75 == "x",
                "age80" => ms.age80 == "x",
                "age85" => ms.age85 == "x",
                "age90" => ms.age90 == "x",
                "age95" => ms.age95 == "x",
                "age100" => ms.age100 == "x",
                "age_over_100" => ms.age_over_100 == "x",
                _ => false,
            })
            .count() as i64;
        chuctho_milestones_map.insert(m.to_string(), count);
    }

    let htxh_total = htxh_rows.len() as i64;
    let htxh_received = htxh_rows
        .iter()
        .filter(|h| h.received == Some(true))
        .count() as i64;
    let htxh_unreceived = htxh_total - htxh_received;
    let htxh_rate = if htxh_total > 0 {
        format!("{:.1}", (htxh_received as f64 / htxh_total as f64) * 100.0)
    } else {
        "0.0".to_string()
    };

    let mut htxh_categories_map = std::collections::HashMap::new();
    let categories = [
        "age75plus",
        "age70to74poor",
        "bao_tro",
        "huu_tri",
        "huu_tuat_bao_hiem",
        "nguoi_co_cong",
    ];
    for cat in categories {
        let count = htxh_rows
            .iter()
            .filter(|h| {
                let age = h
                    .dob
                    .as_deref()
                    .and_then(|d| calculate_exact_age(d, ref_date))
                    .or_else(|| {
                        h.dob
                            .as_deref()
                            .and_then(extract_birth_year)
                            .map(|by| calc_year - by)
                    });
                match cat {
                    "age75plus" => {
                        if let Some(a) = age {
                            a >= 75
                        } else {
                            h.age75plus.as_deref() == Some("x")
                        }
                    }
                    "age70to74poor" => {
                        if let Some(a) = age {
                            (70..=74).contains(&a)
                                && (h.age70to74poor.as_deref() == Some("x")
                                    || h.age75plus.as_deref() == Some("x"))
                        } else {
                            h.age70to74poor.as_deref() == Some("x")
                        }
                    }
                    "bao_tro" => h.bao_tro.as_deref() == Some("x"),
                    "huu_tri" => h.huu_tri.as_deref() == Some("x"),
                    "huu_tuat_bao_hiem" => h.huu_tuat_bao_hiem.as_deref() == Some("x"),
                    "nguoi_co_cong" => h.nguoi_co_cong.as_deref() == Some("x"),
                    _ => false,
                }
            })
            .count() as i64;
        htxh_categories_map.insert(cat.to_string(), count);
    }

    let by_village = villages
        .into_iter()
        .map(|v| {
            let c_cnt = eligible_chuctho
                .iter()
                .filter(|(c, _)| c.village_id == Some(v.id))
                .count() as i64;
            let h_cnt = htxh_rows
                .iter()
                .filter(|h| h.village_id == v.id)
                .count() as i64;
            VillagePolicySummary {
                village_id: v.id,
                village_name: v.name,
                chuctho_count: c_cnt,
                htxh_count: h_cnt,
            }
        })
        .collect();

    Json(json!({
        "success": true,
        "data": PolicyAnalyticsData {
            chuctho: PolicyCategoryStats {
                total: chuctho_total,
                received: chuctho_received,
                unreceived: chuctho_unreceived,
                pending: chuctho_unreceived,
                rate: chuctho_rate,
                by_milestone: Some(chuctho_milestones_map),
                by_category: None,
            },
            htxh: PolicyCategoryStats {
                total: htxh_total,
                received: htxh_received,
                unreceived: htxh_unreceived,
                pending: htxh_unreceived,
                rate: htxh_rate,
                by_milestone: None,
                by_category: Some(htxh_categories_map),
            },
            by_village,
        }
    }))
    .into_response()
}

pub async fn get_chuctho_stream(
    State(state): State<AppState>,
    claims_ext: Option<Extension<Claims>>,
    Query(params): Query<PolicyQueryParams>,
) -> Response {
    let claims = claims_ext.map(|Extension(c)| c);
    let target_village_id = if let Some(ref c) = claims {
        if c.role != "admin" {
            c.village_id.as_deref().and_then(|v| Uuid::parse_str(v).ok())
        } else {
            params.village_id.as_deref().or(params.village_id_camel.as_deref()).and_then(|v| Uuid::parse_str(v).ok())
        }
    } else {
        params.village_id.as_deref().or(params.village_id_camel.as_deref()).and_then(|v| Uuid::parse_str(v).ok())
    };

    let target_year = params
        .year
        .or(params.calculation_year)
        .or(params.calculation_year_camel)
        .unwrap_or_else(|| Utc::now().year());
    let ref_date = chrono::NaiveDate::from_ymd_opt(target_year, 12, 31)
        .unwrap_or_else(|| Utc::now().date_naive());

    let mut qb = QueryBuilder::new(
        "SELECT p.*, v.name as village_name, v.code as village_code FROM qlhk.chuctho_profiles p LEFT JOIN qlhk.villages v ON p.village_id = v.id WHERE p.is_deleted = false",
    );
    if let Some(vid) = target_village_id {
        qb.push(" AND p.village_id = ").push_bind(vid);
    }
    qb.push(" ORDER BY p.stt ASC NULLS LAST, p.created_at ASC");

    let rows: Vec<ChucthoProfileRow> = match qb.build_query_as::<ChucthoProfileRow>().fetch_all(&state.pool).await {
        Ok(r) => r,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, "Database error").into_response(),
    };

    let mut body = String::new();
    for r in rows {
        let mut resp = r.into_response();
        resp.calculation_year = Some(target_year);
        let age = resp
            .dob
            .as_deref()
            .and_then(|d| calculate_exact_age(d, ref_date))
            .or_else(|| {
                resp.dob
                    .as_deref()
                    .and_then(extract_birth_year)
                    .map(|by| target_year - by)
            });
        resp.age = age;
        if let Some(a) = age {
            let ms = compute_chuctho_milestones(a);
            resp.age60 = Some(ms.age60);
            resp.age65 = Some(ms.age65);
            resp.age70 = Some(ms.age70);
            resp.age75 = Some(ms.age75);
            resp.age80 = Some(ms.age80);
            resp.age85 = Some(ms.age85);
            resp.age90 = Some(ms.age90);
            resp.age95 = Some(ms.age95);
            resp.age100 = Some(ms.age100);
            resp.age_over_100 = Some(ms.age_over_100);
        }
        if let Ok(line) = serde_json::to_string(&resp) {
            body.push_str(&line);
            body.push('\n');
        }
    }

    (
        StatusCode::OK,
        [(header::CONTENT_TYPE, "application/x-ndjson")],
        body,
    )
        .into_response()
}

pub async fn get_htxh_stream(
    State(state): State<AppState>,
    claims_ext: Option<Extension<Claims>>,
    Query(params): Query<PolicyQueryParams>,
) -> Response {
    let claims = claims_ext.map(|Extension(c)| c);
    let target_village_id = if let Some(ref c) = claims {
        if c.role != "admin" {
            c.village_id.as_deref().and_then(|v| Uuid::parse_str(v).ok())
        } else {
            params.village_id.as_deref().or(params.village_id_camel.as_deref()).and_then(|v| Uuid::parse_str(v).ok())
        }
    } else {
        params.village_id.as_deref().or(params.village_id_camel.as_deref()).and_then(|v| Uuid::parse_str(v).ok())
    };

    let target_year = params
        .year
        .or(params.calculation_year)
        .or(params.calculation_year_camel)
        .unwrap_or_else(|| Utc::now().year());
    let ref_date = chrono::NaiveDate::from_ymd_opt(target_year, 12, 31)
        .unwrap_or_else(|| Utc::now().date_naive());

    let mut qb = QueryBuilder::new(
        "SELECT p.*, v.name as village_name, v.code as village_code FROM qlhk.htxh_profiles p LEFT JOIN qlhk.villages v ON p.village_id = v.id WHERE p.is_deleted = false",
    );
    if let Some(vid) = target_village_id {
        qb.push(" AND p.village_id = ").push_bind(vid);
    }
    qb.push(" ORDER BY p.stt ASC NULLS LAST, p.created_at ASC");

    let rows: Vec<HtxhProfileRow> = match qb.build_query_as::<HtxhProfileRow>().fetch_all(&state.pool).await {
        Ok(r) => r,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, "Database error").into_response(),
    };

    let mut body = String::new();
    for r in rows {
        let mut resp = r.into_response();
        resp.calculation_year = Some(target_year);
        let age = resp
            .dob
            .as_deref()
            .and_then(|d| calculate_exact_age(d, ref_date))
            .or_else(|| {
                resp.dob
                    .as_deref()
                    .and_then(extract_birth_year)
                    .map(|by| target_year - by)
            });
        resp.age = age;
        if let Some(a) = age {
            if a >= 75 {
                resp.age75plus = Some("x".to_string());
                resp.age70to74poor = Some("".to_string());
            } else if (70..=74).contains(&a) {
                if resp.age70to74poor.as_deref() == Some("x") || resp.age75plus.as_deref() == Some("x") {
                    resp.age70to74poor = Some("x".to_string());
                } else {
                    resp.age70to74poor = Some("".to_string());
                }
                resp.age75plus = Some("".to_string());
            } else {
                resp.age75plus = Some("".to_string());
                resp.age70to74poor = Some("".to_string());
            }
        }
        if let Ok(line) = serde_json::to_string(&resp) {
            body.push_str(&line);
            body.push('\n');
        }
    }

    (
        StatusCode::OK,
        [(header::CONTENT_TYPE, "application/x-ndjson")],
        body,
    )
        .into_response()
}

pub async fn export_policy_excel(
    state: State<AppState>,
    claims: Option<Extension<Claims>>,
    uri: axum::http::Uri,
    Query(params): Query<crate::models::excel::ChucthoExportQuery>,
) -> Response {
    let path = uri.path();
    let query_str = uri.query().unwrap_or_default();
    let is_htxh = path.contains("/htxh") || query_str.contains("type=htxh");
    if is_htxh {
        crate::handlers::excel::export_htxh(state, claims, Query(params)).await
    } else {
        crate::handlers::excel::export_chuctho(state, claims, Query(params)).await
    }
}

pub async fn import_policy_excel() -> Response {
    (
        StatusCode::GONE,
        Json(json!({
            "error": "Chức năng nhập Excel trực tiếp vào chính sách đã dừng hoạt động. Dữ liệu chính sách được đồng bộ tự động từ hộ khẩu và nhân khẩu."
        })),
    )
        .into_response()
}

pub async fn download_policy_template(
    Query(query): Query<std::collections::HashMap<String, String>>,
) -> Response {
    let policy_type = query.get("type").map(|s| s.as_str()).unwrap_or("chuctho");
    let mut workbook = rust_xlsxwriter::Workbook::new();
    let worksheet = workbook.add_worksheet();

    let header_format = rust_xlsxwriter::Format::new()
        .set_bold()
        .set_align(rust_xlsxwriter::FormatAlign::Center)
        .set_align(rust_xlsxwriter::FormatAlign::VerticalCenter)
        .set_background_color(rust_xlsxwriter::Color::RGB(0xE0F2FE))
        .set_border(rust_xlsxwriter::FormatBorder::Thin)
        .set_font_name("Times New Roman")
        .set_font_size(11);

    let data_format = rust_xlsxwriter::Format::new()
        .set_border(rust_xlsxwriter::FormatBorder::Thin)
        .set_font_name("Times New Roman")
        .set_font_size(11);

    let center_format = rust_xlsxwriter::Format::new()
        .set_align(rust_xlsxwriter::FormatAlign::Center)
        .set_border(rust_xlsxwriter::FormatBorder::Thin)
        .set_font_name("Times New Roman")
        .set_font_size(11);

    let is_htxh = policy_type == "htxh";
    let headers: Vec<&str> = if is_htxh {
        vec!["STT", "Họ và tên", "Ngày sinh", "Số CCCD", "Dân tộc", "Nơi thường trú", "Nơi ở hiện nay", "Đối tượng HTXH", "Ghi chú"]
    } else {
        vec!["STT", "Họ và tên", "Ngày sinh", "Số CCCD", "Dân tộc", "Nơi thường trú", "Nơi ở hiện nay", "Ghi chú"]
    };

    for (col_idx, h) in headers.iter().enumerate() {
        let _ = worksheet.write_with_format(0, col_idx as u16, *h, &header_format);
    }

    let _ = worksheet.write_with_format(1, 0, 1, &center_format);
    let _ = worksheet.write_with_format(1, 1, "Nguyễn Văn Mẫu", &data_format);
    let _ = worksheet.write_with_format(1, 2, "1954", &center_format);
    let _ = worksheet.write_with_format(1, 3, "064054000999", &center_format);
    let _ = worksheet.write_with_format(1, 4, "Kinh", &center_format);
    let _ = worksheet.write_with_format(1, 5, "Thôn 1, Xã Đăk Hà", &data_format);
    let _ = worksheet.write_with_format(1, 6, "Thôn 1, Xã Đăk Hà", &data_format);
    if is_htxh {
        let _ = worksheet.write_with_format(1, 7, "Hưu trí", &center_format);
        let _ = worksheet.write_with_format(1, 8, "Mẫu dữ liệu", &data_format);
    } else {
        let _ = worksheet.write_with_format(1, 7, "Mẫu dữ liệu", &data_format);
    }

    for col in 0..headers.len() {
        let _ = worksheet.set_column_width(col as u16, 20);
    }

    let buf = match workbook.save_to_buffer() {
        Ok(b) => b,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, "Lỗi tạo mẫu Excel").into_response(),
    };

    let disposition = if is_htxh {
        HeaderValue::from_static("attachment; filename=\"Mau_nhap_lieu_HTXH.xlsx\"")
    } else {
        HeaderValue::from_static("attachment; filename=\"Mau_nhap_lieu_chuc_tho.xlsx\"")
    };
    let mut headers_map = HeaderMap::new();
    headers_map.insert(
        header::CONTENT_TYPE,
        HeaderValue::from_static("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
    );
    headers_map.insert(header::CONTENT_DISPOSITION, disposition);

    (StatusCode::OK, headers_map, buf).into_response()
}

#[derive(Debug, serde::Deserialize)]
pub struct RecalculatePolicyDto {
    pub year: Option<i32>,
    pub calculation_year: Option<i32>,
    #[serde(rename = "calculationYear")]
    pub calculation_year_camel: Option<i32>,
    pub village_id: Option<String>,
    #[serde(rename = "villageId")]
    pub village_id_camel: Option<String>,
}

pub async fn recalculate_policies(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    body: Option<Json<RecalculatePolicyDto>>,
) -> Response {
    let dto = body.map(|Json(d)| d).unwrap_or(RecalculatePolicyDto {
        year: None,
        calculation_year: None,
        calculation_year_camel: None,
        village_id: None,
        village_id_camel: None,
    });
    let target_year = dto
        .year
        .or(dto.calculation_year)
        .or(dto.calculation_year_camel)
        .unwrap_or_else(|| Utc::now().year());
    let target_village_id = if claims.role == "admin" {
        dto.village_id
            .or(dto.village_id_camel)
            .as_deref()
            .and_then(|v| Uuid::parse_str(v).ok())
            .or_else(|| claims.village_id.and_then(|v| Uuid::parse_str(&v).ok()))
    } else {
        claims.village_id.and_then(|v| Uuid::parse_str(&v).ok())
    };

    let _ = sync_all_citizens_to_policies(&state.pool, target_village_id, Some(target_year)).await;

    Json(json!({
        "success": true,
        "year": target_year,
        "message": "Tính toán lại thành công"
    }))
    .into_response()
}

pub fn router() -> axum::Router<AppState> {
    axum::Router::new()
        .route("/sync", axum::routing::post(sync_policy_data))
        .route("/recalculate", axum::routing::post(recalculate_policies))
        .route(
            "/chuctho",
            axum::routing::get(get_chuctho_profiles).post(create_chuctho_profile),
        )
        .route("/chuctho/stream", axum::routing::get(get_chuctho_stream))
        .route("/chuctho/export", axum::routing::get(export_policy_excel))
        .route("/chuctho/import", axum::routing::post(import_policy_excel))
        .route(
            "/chuctho/{id}",
            axum::routing::put(update_chuctho_profile).delete(delete_chuctho_profile),
        )
        .route(
            "/chuctho/{id}/received",
            axum::routing::patch(mark_chuctho_received),
        )
        .route(
            "/chuctho/{id}/toggle",
            axum::routing::patch(mark_chuctho_received),
        )
        .route(
            "/htxh",
            axum::routing::get(get_htxh_profiles).post(create_htxh_profile),
        )
        .route("/htxh/stream", axum::routing::get(get_htxh_stream))
        .route("/htxh/export", axum::routing::get(export_policy_excel))
        .route("/htxh/import", axum::routing::post(import_policy_excel))
        .route(
            "/htxh/{id}",
            axum::routing::put(update_htxh_profile).delete(delete_htxh_profile),
        )
        .route(
            "/htxh/{id}/received",
            axum::routing::patch(mark_htxh_received),
        )
        .route(
            "/htxh/{id}/toggle",
            axum::routing::patch(mark_htxh_received),
        )
        .route("/analytics", axum::routing::get(get_policy_analytics))
        .route("/excel/import", axum::routing::post(import_policy_excel))
        .route("/excel/export", axum::routing::get(export_policy_excel))
        .route("/excel/template", axum::routing::get(download_policy_template))
}
