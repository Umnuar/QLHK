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
            compute_chuctho_milestones, extract_birth_year, parse_dob_value,
            ChucthoMilestones, ChucthoProfileDb, ChucthoProfileResponse,
            ChucthoProfileRow, CreateChucthoDto, CreateHtxhDto, HtxhProfileDb,
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
    pub household_address: Option<String>,
    pub household_village_id: Uuid,
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

    let mut count_builder = QueryBuilder::new(
        "SELECT COUNT(*) FROM qlhk.chuctho_profiles p WHERE p.is_deleted = false",
    );
    let mut data_builder = QueryBuilder::new(
        "SELECT p.*, v.name as village_name, v.code as village_code FROM qlhk.chuctho_profiles p LEFT JOIN qlhk.villages v ON p.village_id = v.id WHERE p.is_deleted = false",
    );

    let search_unaccented = params
        .search
        .as_deref()
        .map(|s| crate::crypto::remove_accents(s.trim()));
    let search_raw = params.search.as_deref().map(|s| s.trim());
    let status_str = params
        .status
        .as_deref()
        .or(params.received.as_deref())
        .map(|s| s.trim().to_lowercase());
    let received_filter = match status_str.as_deref() {
        Some("received") | Some("true") => Some(true),
        Some("unreceived") | Some("false") => Some(false),
        _ => None,
    };
    let calc_year = params
        .calculation_year
        .or(params.calculation_year_camel);
    let milestone_val = params
        .milestone
        .as_deref()
        .or(params.age_group.as_deref())
        .map(|s| s.trim());

    for builder in [&mut count_builder, &mut data_builder] {
        if let Some(vid) = target_village_id {
            builder.push(" AND p.village_id = ");
            builder.push_bind(vid);
        }
        if let Some(rec) = received_filter {
            builder.push(" AND p.received = ");
            builder.push_bind(rec);
        }
        if let Some(cy) = calc_year {
            builder.push(" AND p.calculation_year = ");
            builder.push_bind(cy);
        }
        if let Some(g) = params.gender.as_deref() {
            if !g.trim().is_empty() {
                builder.push(" AND p.gender = ");
                builder.push_bind(g.trim());
            }
        }
        if let Some(e) = params.ethnicity.as_deref() {
            if !e.trim().is_empty() {
                builder.push(" AND p.ethnicity = ");
                builder.push_bind(e.trim());
            }
        }
        if let Some(r) = params.residence.as_deref() {
            if !r.trim().is_empty() {
                builder.push(" AND p.residence = ");
                builder.push_bind(r.trim());
            }
        }
        if let Some(m) = milestone_val {
            let allowed = [
                "age60", "age65", "age70", "age75", "age80", "age85", "age90",
                "age95", "age100", "age_over_100",
            ];
            if allowed.contains(&m) {
                builder.push(format!(" AND p.{} = 'x'", m));
            }
        }
        if let (Some(u), Some(raw)) = (&search_unaccented, &search_raw) {
            if !u.is_empty() {
                let last4 = if raw.len() >= 4 {
                    &raw[raw.len() - 4..]
                } else {
                    raw
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
            .map(|s| s.trim());

        if let Some(td) = target_dob {
            if !td.is_empty() {
                builder.push(" AND p.dob LIKE ");
                builder.push_bind(format!("%{}%", td));
            }
        } else {
            let df = params
                .date_from
                .as_deref()
                .or(params.date_from_camel.as_deref())
                .map(|s| s.trim());
            let dt = params
                .date_to
                .as_deref()
                .or(params.date_to_camel.as_deref())
                .map(|s| s.trim());

            if let Some(from_val) = df {
                if !from_val.is_empty() {
                    builder.push(" AND p.dob >= ");
                    builder.push_bind(from_val);
                }
            }
            if let Some(to_val) = dt {
                if !to_val.is_empty() {
                    builder.push(" AND p.dob <= ");
                    builder.push_bind(to_val);
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
                Json(json!({ "error": "Lỗi hệ thống khi đếm danh sách chúc thọ" })),
            )
                .into_response();
        }
    };

    let rows_result = data_builder
        .build_query_as::<ChucthoProfileRow>()
        .fetch_all(&state.pool)
        .await;

    let rows = match rows_result {
        Ok(r) => r,
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Lỗi hệ thống khi tải danh sách chúc thọ" })),
            )
                .into_response();
        }
    };

    let items: Vec<ChucthoProfileResponse> =
        rows.into_iter().map(|r| r.into_response()).collect();
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
    Extension(claims): Extension<Claims>,
    Json(dto): Json<CreateChucthoDto>,
) -> Response {
    if dto.name.trim().is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": "Họ và tên là bắt buộc" })),
        )
            .into_response();
    }

    let target_village_id = if claims.role == "admin" {
        dto.village_id
            .or(dto.village_id_camel)
            .or_else(|| claims.village_id.and_then(|v| Uuid::parse_str(&v).ok()))
    } else {
        claims.village_id.and_then(|v| Uuid::parse_str(&v).ok())
    };

    let calc_year = dto
        .calculation_year
        .or(dto.calculation_year_camel)
        .unwrap_or_else(|| Utc::now().year());

    let (dob_val, birth_year) = match dto.dob.as_deref() {
        Some(d) => match parse_dob_value(d) {
            Some((formatted, y)) => (Some(formatted), Some(y)),
            None => (Some(d.trim().to_string()), extract_birth_year(d)),
        },
        None => (None, None),
    };

    let milestones = match birth_year {
        Some(by) => compute_chuctho_milestones(calc_year - by),
        None => Default::default(),
    };

    let (enc_cccd, cccd_hash, cccd_last4) = match dto.cccd.as_deref() {
        Some(c) if !c.trim().is_empty() => match crate::crypto::encrypt_cccd(c) {
            Ok(enc) => (Some(enc.encrypted), Some(enc.hash), Some(enc.last4)),
            Err(_) => (None, None, None),
        },
        _ => (None, None, None),
    };

    let name_unaccented = crate::crypto::remove_accents(dto.name.trim());
    let current_address = dto.current_address.or(dto.current_address_camel);

    let query = r#"
        INSERT INTO qlhk.chuctho_profiles (
            name, name_unaccented, dob, gender, cccd, cccd_hash, cccd_last4,
            ethnicity, residence, current_address, village_id, stt, notes,
            calculation_year, received, is_deleted, version, created_at, updated_at,
            age60, age65, age70, age75, age80, age85, age90, age95, age100, age_over_100
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7,
            $8, $9, $10, $11, $12, $13,
            $14, false, false, 1, NOW(), NOW(),
            $15, $16, $17, $18, $19, $20, $21, $22, $23, $24
        )
        RETURNING *
    "#;

    let row_result = sqlx::query_as::<_, ChucthoProfileDb>(query)
        .bind(dto.name.trim())
        .bind(&name_unaccented)
        .bind(&dob_val)
        .bind(&dto.gender)
        .bind(&enc_cccd)
        .bind(&cccd_hash)
        .bind(&cccd_last4)
        .bind(&dto.ethnicity)
        .bind(&dto.residence)
        .bind(&current_address)
        .bind(target_village_id)
        .bind(dto.stt)
        .bind(&dto.notes)
        .bind(calc_year)
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
        .fetch_one(&state.pool)
        .await;

    match row_result {
        Ok(created) => (
            StatusCode::CREATED,
            Json(SingleResponse {
                success: true,
                data: created.into_response(None),
            }),
        )
            .into_response(),
        Err(_) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": "Lỗi khi tạo hồ sơ chúc thọ" })),
        )
            .into_response(),
    }
}

pub async fn update_chuctho_profile(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
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

    let target_name = dto.name.as_deref().map(|n| n.trim()).unwrap_or(&current.name);
    let name_unaccented = crate::crypto::remove_accents(target_name);

    let calc_year = dto
        .calculation_year
        .or(dto.calculation_year_camel)
        .or(current.calculation_year)
        .unwrap_or_else(|| Utc::now().year());

    let (dob_val, birth_year) = match dto.dob.as_deref() {
        Some(d) => match parse_dob_value(d) {
            Some((formatted, y)) => (Some(formatted), Some(y)),
            None => (Some(d.trim().to_string()), extract_birth_year(d)),
        },
        None => (
            current.dob.clone(),
            current.dob.as_deref().and_then(extract_birth_year),
        ),
    };

    let milestones = match birth_year {
        Some(by) => compute_chuctho_milestones(calc_year - by),
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

    let (enc_cccd, cccd_hash, cccd_last4) = match dto.cccd.as_deref() {
        Some(c) if !c.trim().is_empty() => match crate::crypto::encrypt_cccd(c) {
            Ok(enc) => (Some(enc.encrypted), Some(enc.hash), Some(enc.last4)),
            Err(_) => (None, None, None),
        },
        Some(_) => (None, None, None),
        None => (current.cccd, current.cccd_hash, current.cccd_last4),
    };

    let target_village_id = if claims.role == "admin" {
        dto.village_id
            .or(dto.village_id_camel)
            .or(current.village_id)
    } else {
        current.village_id
    };

    let current_address = dto
        .current_address
        .or(dto.current_address_camel)
        .or(current.current_address);
    let stt = dto.stt.or(current.stt);
    let gender = dto.gender.or(current.gender);
    let ethnicity = dto.ethnicity.or(current.ethnicity);
    let residence = dto.residence.or(current.residence);
    let notes = dto.notes.or(current.notes);
    let received = dto.received.or(current.received);
    let new_version = current.version.unwrap_or(1) + 1;

    let query = r#"
        UPDATE qlhk.chuctho_profiles
        SET name = $1, name_unaccented = $2, dob = $3, gender = $4,
            cccd = $5, cccd_hash = $6, cccd_last4 = $7, ethnicity = $8,
            residence = $9, current_address = $10, village_id = $11, stt = $12,
            notes = $13, calculation_year = $14, received = $15, version = $16,
            updated_at = NOW(),
            age60 = $17, age65 = $18, age70 = $19, age75 = $20, age80 = $21,
            age85 = $22, age90 = $23, age95 = $24, age100 = $25, age_over_100 = $26
        WHERE id = $27 AND is_deleted = false
        RETURNING *
    "#;

    let updated_result = sqlx::query_as::<_, ChucthoProfileDb>(query)
        .bind(target_name)
        .bind(&name_unaccented)
        .bind(&dob_val)
        .bind(&gender)
        .bind(&enc_cccd)
        .bind(&cccd_hash)
        .bind(&cccd_last4)
        .bind(&ethnicity)
        .bind(&residence)
        .bind(&current_address)
        .bind(target_village_id)
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
        Ok(updated) => Json(SingleResponse {
            success: true,
            data: updated.into_response(None),
        })
        .into_response(),
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
    let status_str = params
        .status
        .as_deref()
        .or(params.received.as_deref())
        .map(|s| s.trim().to_lowercase());
    let received_filter = match status_str.as_deref() {
        Some("received") | Some("true") => Some(true),
        Some("unreceived") | Some("false") => Some(false),
        _ => None,
    };
    let calc_year = params
        .calculation_year
        .or(params.calculation_year_camel);
    let category_val = params
        .category
        .as_deref()
        .or(params.age_group.as_deref())
        .or(params.milestone.as_deref())
        .map(|s| s.trim());

    for builder in [&mut count_builder, &mut data_builder] {
        if let Some(vid) = target_village_id {
            builder.push(" AND p.village_id = ");
            builder.push_bind(vid);
        }
        if let Some(rec) = received_filter {
            builder.push(" AND p.received = ");
            builder.push_bind(rec);
        }
        if let Some(cy) = calc_year {
            builder.push(" AND p.calculation_year = ");
            builder.push_bind(cy);
        }
        if let Some(g) = params.gender.as_deref() {
            if !g.trim().is_empty() {
                builder.push(" AND p.gender = ");
                builder.push_bind(g.trim());
            }
        }
        if let Some(e) = params.ethnicity.as_deref() {
            if !e.trim().is_empty() {
                builder.push(" AND p.ethnicity = ");
                builder.push_bind(e.trim());
            }
        }
        if let Some(r) = params.residence.as_deref() {
            if !r.trim().is_empty() {
                builder.push(" AND p.residence = ");
                builder.push_bind(r.trim());
            }
        }
        if let Some(cat) = category_val {
            let allowed = [
                "age75plus",
                "age70to74poor",
                "bao_tro",
                "huu_tri",
                "huu_tuat_bao_hiem",
                "nguoi_co_cong",
            ];
            if allowed.contains(&cat) {
                builder.push(format!(" AND p.{} = 'x'", cat));
            }
        }
        if let (Some(u), Some(raw)) = (&search_unaccented, &search_raw) {
            if !u.is_empty() {
                let last4 = if raw.len() >= 4 {
                    &raw[raw.len() - 4..]
                } else {
                    raw
                };
                builder.push(" AND (p.name_unaccented ILIKE ");
                builder.push_bind(format!("%{}%", u));
                builder.push(" OR p.cccd_last4 = ");
                builder.push_bind(last4);
                builder.push(")");
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

    let items: Vec<HtxhProfileResponse> =
        rows.into_iter().map(|r| r.into_response()).collect();
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
    Extension(claims): Extension<Claims>,
    Json(dto): Json<CreateHtxhDto>,
) -> Response {
    if dto.name.trim().is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": "Họ tên là bắt buộc" })),
        )
            .into_response();
    }

    let target_village_id = if claims.role == "admin" {
        dto.village_id
            .or(dto.village_id_camel)
            .or_else(|| claims.village_id.and_then(|v| Uuid::parse_str(&v).ok()))
    } else {
        claims.village_id.and_then(|v| Uuid::parse_str(&v).ok())
    };

    let village_id = match target_village_id {
        Some(v) => v,
        None => {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({ "error": "Thôn là bắt buộc" })),
            )
                .into_response();
        }
    };

    let calc_year = dto
        .calculation_year
        .or(dto.calculation_year_camel)
        .unwrap_or_else(|| Utc::now().year());

    let (dob_val, birth_year) = match dto.dob.as_deref() {
        Some(d) => match parse_dob_value(d) {
            Some((formatted, y)) => (Some(formatted), Some(y)),
            None => (Some(d.trim().to_string()), extract_birth_year(d)),
        },
        None => (None, None),
    };

    let age = birth_year.map(|by| calc_year - by).unwrap_or(0);
    let age75plus = if age >= 75 {
        "x".to_string()
    } else {
        dto.age75plus.unwrap_or_default()
    };
    let age70to74poor = if (70..=74).contains(&age) {
        dto.age70to74poor.unwrap_or_default()
    } else {
        String::new()
    };
    let bao_tro = dto.bao_tro.unwrap_or_default();
    let huu_tri = dto.huu_tri.unwrap_or_else(|| "x".to_string());
    let huu_tuat_bao_hiem = dto.huu_tuat_bao_hiem.unwrap_or_default();
    let nguoi_co_cong = dto.nguoi_co_cong.unwrap_or_default();

    let (enc_cccd, cccd_hash, cccd_last4) = match dto.cccd.as_deref() {
        Some(c) if !c.trim().is_empty() => match crate::crypto::encrypt_cccd(c) {
            Ok(enc) => (Some(enc.encrypted), Some(enc.hash), Some(enc.last4)),
            Err(_) => (None, None, None),
        },
        _ => (None, None, None),
    };

    let name_unaccented = crate::crypto::remove_accents(dto.name.trim());
    let current_address = dto.current_address.or(dto.current_address_camel);

    let query = r#"
        INSERT INTO qlhk.htxh_profiles (
            name, name_unaccented, dob, gender, cccd, cccd_hash, cccd_last4,
            ethnicity, residence, current_address, village_id, stt, notes,
            calculation_year, received, is_deleted, version, created_at, updated_at,
            age75plus, age70to74poor, bao_tro, huu_tri, huu_tuat_bao_hiem, nguoi_co_cong
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7,
            $8, $9, $10, $11, $12, $13,
            $14, false, false, 1, NOW(), NOW(),
            $15, $16, $17, $18, $19, $20
        )
        RETURNING *
    "#;

    let row_result = sqlx::query_as::<_, HtxhProfileDb>(query)
        .bind(dto.name.trim())
        .bind(&name_unaccented)
        .bind(&dob_val)
        .bind(&dto.gender)
        .bind(&enc_cccd)
        .bind(&cccd_hash)
        .bind(&cccd_last4)
        .bind(&dto.ethnicity)
        .bind(&dto.residence)
        .bind(&current_address)
        .bind(village_id)
        .bind(dto.stt)
        .bind(&dto.notes)
        .bind(calc_year)
        .bind(&age75plus)
        .bind(&age70to74poor)
        .bind(&bao_tro)
        .bind(&huu_tri)
        .bind(&huu_tuat_bao_hiem)
        .bind(&nguoi_co_cong)
        .fetch_one(&state.pool)
        .await;

    match row_result {
        Ok(created) => (
            StatusCode::CREATED,
            Json(SingleResponse {
                success: true,
                data: created.into_response(None),
            }),
        )
            .into_response(),
        Err(_) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": "Lỗi khi tạo hồ sơ HTXH" })),
        )
            .into_response(),
    }
}

pub async fn update_htxh_profile(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
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

    let target_name = dto.name.as_deref().map(|n| n.trim()).unwrap_or(&current.name);
    let name_unaccented = crate::crypto::remove_accents(target_name);

    let calc_year = dto
        .calculation_year
        .or(dto.calculation_year_camel)
        .or(current.calculation_year)
        .unwrap_or_else(|| Utc::now().year());

    let (dob_val, birth_year) = match dto.dob.as_deref() {
        Some(d) => match parse_dob_value(d) {
            Some((formatted, y)) => (Some(formatted), Some(y)),
            None => (Some(d.trim().to_string()), extract_birth_year(d)),
        },
        None => (
            current.dob.clone(),
            current.dob.as_deref().and_then(extract_birth_year),
        ),
    };

    let age = birth_year.map(|by| calc_year - by).unwrap_or(0);
    let age75plus = if age >= 75 {
        "x".to_string()
    } else {
        dto.age75plus.or(current.age75plus).unwrap_or_default()
    };
    let age70to74poor = if (70..=74).contains(&age) {
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

    let (enc_cccd, cccd_hash, cccd_last4) = match dto.cccd.as_deref() {
        Some(c) if !c.trim().is_empty() => match crate::crypto::encrypt_cccd(c) {
            Ok(enc) => (Some(enc.encrypted), Some(enc.hash), Some(enc.last4)),
            Err(_) => (None, None, None),
        },
        Some(_) => (None, None, None),
        None => (current.cccd, current.cccd_hash, current.cccd_last4),
    };

    let target_village_id = if claims.role == "admin" {
        dto.village_id
            .or(dto.village_id_camel)
            .unwrap_or(current.village_id)
    } else {
        current.village_id
    };

    let current_address = dto
        .current_address
        .or(dto.current_address_camel)
        .or(current.current_address);
    let stt = dto.stt.or(current.stt);
    let gender = dto.gender.or(current.gender);
    let ethnicity = dto.ethnicity.or(current.ethnicity);
    let residence = dto.residence.or(current.residence);
    let notes = dto.notes.or(current.notes);
    let received = dto.received.or(current.received);
    let new_version = current.version.unwrap_or(1) + 1;

    let query = r#"
        UPDATE qlhk.htxh_profiles
        SET name = $1, name_unaccented = $2, dob = $3, gender = $4,
            cccd = $5, cccd_hash = $6, cccd_last4 = $7, ethnicity = $8,
            residence = $9, current_address = $10, village_id = $11, stt = $12,
            notes = $13, calculation_year = $14, received = $15, version = $16,
            updated_at = NOW(),
            age75plus = $17, age70to74poor = $18, bao_tro = $19, huu_tri = $20,
            huu_tuat_bao_hiem = $21, nguoi_co_cong = $22
        WHERE id = $23 AND is_deleted = false
        RETURNING *
    "#;

    let updated_result = sqlx::query_as::<_, HtxhProfileDb>(query)
        .bind(target_name)
        .bind(&name_unaccented)
        .bind(&dob_val)
        .bind(&gender)
        .bind(&enc_cccd)
        .bind(&cccd_hash)
        .bind(&cccd_last4)
        .bind(&ethnicity)
        .bind(&residence)
        .bind(&current_address)
        .bind(target_village_id)
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
        Ok(updated) => Json(SingleResponse {
            success: true,
            data: updated.into_response(None),
        })
        .into_response(),
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
    #[allow(dead_code)]
    struct SingleCitizenRow {
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
        pub is_deleted: bool,
        pub household_address: Option<String>,
        pub household_village_id: Uuid,
        pub household_deleted: bool,
    }

    let citizen = sqlx::query_as::<_, SingleCitizenRow>(
        r#"
        SELECT c.id, c.full_name, c.name_unaccented, c.dob, c.gender,
               c.cccd, c.cccd_hash, c.cccd_last4, c.ethnicity, c.occupation, c.is_deleted,
               h.address as household_address, h.village_id as household_village_id, h.is_deleted as household_deleted
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

    let target_year = chrono::Utc::now().year();
    let birth_year = citizen.dob.as_deref().and_then(extract_birth_year);
    let age = birth_year.map(|by| target_year - by);

    if let Some(age_val) = age {
        if age_val >= 60 {
            let milestones = compute_chuctho_milestones(age_val);

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
    }

    let occ_raw = citizen.occupation.as_deref().unwrap_or("");
    let is_retiree = is_retiree_occupation(occ_raw);
    let is_75plus = age.map(|a| a >= 75).unwrap_or(false);

    if is_retiree || is_75plus {
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

        let retiree_val = if is_retiree { "x".to_string() } else { String::new() };
        let age75_val = if is_75plus { "x".to_string() } else { String::new() };

        if let Some(existing) = existing_htxh {
            let final_retiree = if is_retiree { "x".to_string() } else { existing.huu_tri.unwrap_or_default() };
            let final_75plus = if is_75plus { "x".to_string() } else { existing.age75plus.unwrap_or_default() };

            let _ = sqlx::query(
                r#"
                UPDATE qlhk.htxh_profiles
                SET name = $1, name_unaccented = $2, dob = $3, gender = $4,
                    cccd = $5, cccd_hash = $6, cccd_last4 = $7, ethnicity = $8,
                    residence = $9, current_address = $10, village_id = $11,
                    calculation_year = $12, notes = $13, is_deleted = false, deleted_at = NULL, updated_at = NOW(),
                    huu_tri = $14, age75plus = $15
                WHERE id = $16
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
                    $15, $16, $17, '', '', '', '', false, false, 1, NOW(), NOW()
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
            .bind(retiree_val)
            .bind(age75_val)
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
            let has_other = existing.bao_tro.as_deref() == Some("x")
                || existing.age70to74poor.as_deref() == Some("x")
                || existing.huu_tuat_bao_hiem.as_deref() == Some("x")
                || existing.nguoi_co_cong.as_deref() == Some("x");

            if has_other {
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
    let target_year = calculation_year.unwrap_or_else(|| chrono::Utc::now().year());

    let query_citizens = r#"
        SELECT c.id, c.full_name, c.name_unaccented, c.dob, c.gender,
               c.cccd, c.cccd_hash, c.cccd_last4, c.ethnicity, c.occupation,
               h.address as household_address, h.village_id as household_village_id
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

    for citizen in &citizens {
        let note_id = citizen.id.to_string();
        let birth_year = citizen.dob.as_deref().and_then(extract_birth_year);
        let age = birth_year.map(|by| target_year - by);

        if let Some(age_val) = age {
            if age_val >= 60 {
                let milestones = compute_chuctho_milestones(age_val);

                let existing = sqlx::query_as::<_, ChucthoProfileDb>(
                    "SELECT * FROM qlhk.chuctho_profiles WHERE notes = $1 LIMIT 1",
                )
                .bind(&note_id)
                .fetch_optional(pool)
                .await
                .ok()
                .flatten();

                if let Some(ext) = existing {
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
                    .execute(pool)
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
                    .execute(pool)
                    .await;
                }
                chuctho_count += 1;
            }
        }

        let occ_raw = citizen.occupation.as_deref().unwrap_or("");
        let is_retiree = is_retiree_occupation(occ_raw);
        let is_75plus = age.map(|a| a >= 75).unwrap_or(false);

        if is_retiree || is_75plus {
            let existing = sqlx::query_as::<_, HtxhProfileDb>(
                "SELECT * FROM qlhk.htxh_profiles WHERE notes = $1 LIMIT 1",
            )
            .bind(&note_id)
            .fetch_optional(pool)
            .await
            .ok()
            .flatten();

            let retiree_val = if is_retiree { "x".to_string() } else { String::new() };
            let age75_val = if is_75plus { "x".to_string() } else { String::new() };

            if let Some(ext) = existing {
                let final_retiree = if is_retiree { "x".to_string() } else { ext.huu_tri.unwrap_or_default() };
                let final_75plus = if is_75plus { "x".to_string() } else { ext.age75plus.unwrap_or_default() };

                let _ = sqlx::query(
                    r#"
                    UPDATE qlhk.htxh_profiles
                    SET name = $1, name_unaccented = $2, dob = $3, gender = $4,
                        cccd = $5, cccd_hash = $6, cccd_last4 = $7, ethnicity = $8,
                        residence = $9, current_address = $10, village_id = $11,
                        calculation_year = $12, notes = $13, is_deleted = false, deleted_at = NULL, updated_at = NOW(),
                        huu_tri = $14, age75plus = $15
                    WHERE id = $16
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
                .bind(ext.id)
                .execute(pool)
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
                        $15, $16, $17, '', '', '', '', false, false, 1, NOW(), NOW()
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
                .bind(retiree_val)
                .bind(age75_val)
                .execute(pool)
                .await;
            }
            htxh_count += 1;
        }
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

pub fn is_retiree_occupation(occ: &str) -> bool {
    let lower = occ.to_lowercase();
    let unacc = crate::crypto::remove_accents(occ).to_lowercase();
    lower.contains("hưu")
        || unacc.contains("huu")
        || lower.contains("mất sức")
        || unacc.contains("mat suc")
        || lower.contains("bhxh")
}

pub fn extract_occupation_from_json(json_str: &str) -> Option<String> {
    let val: serde_json::Value = serde_json::from_str(json_str).ok()?;
    if let Some(occ) = val.get("occupation").and_then(|v| v.as_str()) {
        return Some(occ.trim().to_string());
    }
    if let Some(occ) = val.get("nghe_nghiep").and_then(|v| v.as_str()) {
        return Some(occ.trim().to_string());
    }
    if let Some(occ) = val.get("ngheNghiep").and_then(|v| v.as_str()) {
        return Some(occ.trim().to_string());
    }
    if let Some(c) = val.get("citizen") {
        if let Some(occ) = c.get("occupation").and_then(|v| v.as_str()) {
            return Some(occ.trim().to_string());
        }
        if let Some(occ) = c.get("nghe_nghiep").and_then(|v| v.as_str()) {
            return Some(occ.trim().to_string());
        }
        if let Some(occ) = c.get("ngheNghiep").and_then(|v| v.as_str()) {
            return Some(occ.trim().to_string());
        }
    }
    None
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

        let citizen_id = match cid {
            Some(id) => id,
            None => continue,
        };

        let old_occ = log.old_values.as_deref().and_then(extract_occupation_from_json);
        let new_occ = log.new_values.as_deref().and_then(extract_occupation_from_json);

        let old_is_retiree = old_occ.as_deref().map(is_retiree_occupation).unwrap_or(false);
        let new_is_retiree = new_occ.as_deref().map(is_retiree_occupation).unwrap_or(false);

        if new_is_retiree != old_is_retiree || log.action == "DELETE" {
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
        .calculation_year
        .or(params.calculation_year_camel)
        .unwrap_or_else(|| Utc::now().year());

    #[derive(FromRow)]
    struct ChucthoAnalyticsRow {
        pub village_id: Option<Uuid>,
        pub received: Option<bool>,
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
    }

    #[derive(FromRow)]
    struct HtxhAnalyticsRow {
        pub village_id: Uuid,
        pub received: Option<bool>,
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
        SELECT village_id, received, age60, age65, age70, age75, age80, age85, age90, age95, age100, age_over_100
        FROM qlhk.chuctho_profiles
        WHERE is_deleted = false AND calculation_year = $1 AND ($2::uuid IS NULL OR village_id = $2)
        "#,
    )
    .bind(calc_year)
    .bind(target_village_id)
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default();

    let htxh_rows = sqlx::query_as::<_, HtxhAnalyticsRow>(
        r#"
        SELECT village_id, received, age75plus, age70to74poor, bao_tro, huu_tri, huu_tuat_bao_hiem, nguoi_co_cong
        FROM qlhk.htxh_profiles
        WHERE is_deleted = false AND calculation_year = $1 AND ($2::uuid IS NULL OR village_id = $2)
        "#,
    )
    .bind(calc_year)
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

    let chuctho_total = chuctho_rows.len() as i64;
    let chuctho_received = chuctho_rows
        .iter()
        .filter(|c| c.received == Some(true))
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
        let count = chuctho_rows
            .iter()
            .filter(|c| match m {
                "age60" => c.age60.as_deref() == Some("x"),
                "age65" => c.age65.as_deref() == Some("x"),
                "age70" => c.age70.as_deref() == Some("x"),
                "age75" => c.age75.as_deref() == Some("x"),
                "age80" => c.age80.as_deref() == Some("x"),
                "age85" => c.age85.as_deref() == Some("x"),
                "age90" => c.age90.as_deref() == Some("x"),
                "age95" => c.age95.as_deref() == Some("x"),
                "age100" => c.age100.as_deref() == Some("x"),
                "age_over_100" => c.age_over_100.as_deref() == Some("x"),
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
            .filter(|h| match cat {
                "age75plus" => h.age75plus.as_deref() == Some("x"),
                "age70to74poor" => h.age70to74poor.as_deref() == Some("x"),
                "bao_tro" => h.bao_tro.as_deref() == Some("x"),
                "huu_tri" => h.huu_tri.as_deref() == Some("x"),
                "huu_tuat_bao_hiem" => h.huu_tuat_bao_hiem.as_deref() == Some("x"),
                "nguoi_co_cong" => h.nguoi_co_cong.as_deref() == Some("x"),
                _ => false,
            })
            .count() as i64;
        htxh_categories_map.insert(cat.to_string(), count);
    }

    let by_village = villages
        .into_iter()
        .map(|v| {
            let c_cnt = chuctho_rows
                .iter()
                .filter(|c| c.village_id == Some(v.id))
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

    let target_year = params.year.or(params.calculation_year).or(params.calculation_year_camel);
    let mut qb = QueryBuilder::new(
        "SELECT p.*, v.name as village_name, v.code as village_code FROM qlhk.chuctho_profiles p LEFT JOIN qlhk.villages v ON p.village_id = v.id WHERE p.is_deleted = false",
    );
    if let Some(vid) = target_village_id {
        qb.push(" AND p.village_id = ").push_bind(vid);
    }
    if let Some(y) = target_year {
        qb.push(" AND p.calculation_year = ").push_bind(y);
    }
    qb.push(" ORDER BY p.stt ASC NULLS LAST, p.created_at ASC");

    let rows: Vec<ChucthoProfileRow> = match qb.build_query_as::<ChucthoProfileRow>().fetch_all(&state.pool).await {
        Ok(r) => r,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, "Database error").into_response(),
    };

    let mut body = String::new();
    for r in rows {
        let resp = r.into_response();
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

    let target_year = params.year.or(params.calculation_year).or(params.calculation_year_camel);
    let mut qb = QueryBuilder::new(
        "SELECT p.*, v.name as village_name, v.code as village_code FROM qlhk.htxh_profiles p LEFT JOIN qlhk.villages v ON p.village_id = v.id WHERE p.is_deleted = false",
    );
    if let Some(vid) = target_village_id {
        qb.push(" AND p.village_id = ").push_bind(vid);
    }
    if let Some(y) = target_year {
        qb.push(" AND p.calculation_year = ").push_bind(y);
    }
    qb.push(" ORDER BY p.stt ASC NULLS LAST, p.created_at ASC");

    let rows: Vec<HtxhProfileRow> = match qb.build_query_as::<HtxhProfileRow>().fetch_all(&state.pool).await {
        Ok(r) => r,
        Err(_) => return (StatusCode::INTERNAL_SERVER_ERROR, "Database error").into_response(),
    };

    let mut body = String::new();
    for r in rows {
        let resp = r.into_response();
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

pub async fn import_policy_excel(
    State(state): State<AppState>,
    claims_ext: Option<Extension<Claims>>,
    uri: axum::http::Uri,
    body: axum::body::Bytes,
) -> Response {
    let claims = claims_ext.map(|Extension(c)| c);
    let payload: Result<crate::models::excel::PolicyImportPayload, _> = serde_json::from_slice(&body);
    if let Ok(p) = payload {
        let is_htxh = uri.path().contains("/htxh") || p.r#type.as_deref() == Some("htxh");
        let target_village_id = if let Some(ref c) = claims {
            if c.role != "admin" {
                c.village_id.as_deref().and_then(|v| Uuid::parse_str(v).ok())
            } else {
                p.village_id.or(p.village_id_camel)
            }
        } else {
            p.village_id.or(p.village_id_camel)
        };

        let calc_year = p.calculation_year.or(p.calculation_year_camel).unwrap_or_else(|| Utc::now().year());
        let profiles = p.profiles.unwrap_or_default();
        let mut inserted = 0;

        for item in profiles {
            let name = item.get("name").and_then(|v| v.as_str()).map(|s| s.trim()).unwrap_or_default();
            if name.is_empty() {
                continue;
            }
            let item_village_id = item.get("village_id")
                .or_else(|| item.get("villageId"))
                .and_then(|v| v.as_str())
                .and_then(|s| Uuid::parse_str(s).ok())
                .or(target_village_id);

            let vid = match item_village_id {
                Some(v) => v,
                None => continue,
            };

            let dob = item.get("dob").and_then(|v| v.as_str()).unwrap_or_default();
            let parsed = parse_dob_value(dob);
            let dob_clean = parsed.as_ref().map(|p| p.0.clone()).unwrap_or_else(|| dob.to_string());
            let birth_year = parsed.as_ref().map(|p| p.1);

            let cccd_raw = item.get("cccd").and_then(|v| v.as_str()).map(|s| s.trim()).unwrap_or_default();
            let (enc_cccd, cccd_hash, cccd_last4) = if !cccd_raw.is_empty() {
                match crate::crypto::encrypt_cccd(cccd_raw) {
                    Ok(enc) => (Some(enc.encrypted), Some(enc.hash), Some(enc.last4)),
                    Err(_) => (None, None, None),
                }
            } else {
                (None, None, None)
            };

            let name_unaccented = crate::crypto::remove_accents(name);
            let gender = item.get("gender").and_then(|v| v.as_str());
            let ethnicity = item.get("ethnicity").and_then(|v| v.as_str());
            let residence = item.get("residence").and_then(|v| v.as_str());
            let current_address = item.get("current_address").or_else(|| item.get("currentAddress")).and_then(|v| v.as_str());
            let notes = item.get("notes").and_then(|v| v.as_str());
            let received = item.get("received").and_then(|v| v.as_bool()).unwrap_or(false);
            let stt = item.get("stt").and_then(|v| v.as_i64()).map(|n| n as i32);

            if is_htxh {
                let mut m75plus = item.get("age75plus").and_then(|v| v.as_str()).unwrap_or_default().to_string();
                let mut m70to74 = item.get("age70to74poor").and_then(|v| v.as_str()).unwrap_or_default().to_string();
                let bao_tro = item.get("bao_tro").and_then(|v| v.as_str()).unwrap_or_default();
                let huu_tri = item.get("huu_tri").and_then(|v| v.as_str()).unwrap_or_default();
                let huu_tuat = item.get("huu_tuat_bao_hiem").and_then(|v| v.as_str()).unwrap_or_default();
                let nguoi_co_cong = item.get("nguoi_co_cong").and_then(|v| v.as_str()).unwrap_or_default();

                if let Some(by) = birth_year {
                    let age = calc_year - by;
                    if age >= 75 {
                        m75plus = "x".to_string();
                    } else if age >= 70 {
                        m70to74 = "x".to_string();
                    }
                }

                let _ = sqlx::query(
                    r#"INSERT INTO qlhk.htxh_profiles (
                        name, name_unaccented, dob, gender, cccd, cccd_hash, cccd_last4,
                        ethnicity, residence, current_address, village_id, stt, notes,
                        calculation_year, received, is_deleted, version, created_at, updated_at,
                        age75plus, age70to74poor, bao_tro, huu_tri, huu_tuat_bao_hiem, nguoi_co_cong
                    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,false,1,NOW(),NOW(),$16,$17,$18,$19,$20,$21)"#
                )
                .bind(name)
                .bind(&name_unaccented)
                .bind(&dob_clean)
                .bind(gender)
                .bind(&enc_cccd)
                .bind(&cccd_hash)
                .bind(&cccd_last4)
                .bind(ethnicity)
                .bind(residence)
                .bind(current_address)
                .bind(vid)
                .bind(stt)
                .bind(notes)
                .bind(calc_year)
                .bind(received)
                .bind(&m75plus)
                .bind(&m70to74)
                .bind(bao_tro)
                .bind(huu_tri)
                .bind(huu_tuat)
                .bind(nguoi_co_cong)
                .execute(&state.pool)
                .await;
            } else {
                let milestones = match birth_year {
                    Some(by) => compute_chuctho_milestones(calc_year - by),
                    None => Default::default(),
                };

                let _ = sqlx::query(
                    r#"INSERT INTO qlhk.chuctho_profiles (
                        name, name_unaccented, dob, gender, cccd, cccd_hash, cccd_last4,
                        ethnicity, residence, current_address, village_id, stt, notes,
                        calculation_year, received, is_deleted, version, created_at, updated_at,
                        age60, age65, age70, age75, age80, age85, age90, age95, age100, age_over_100
                    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,false,1,NOW(),NOW(),$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)"#
                )
                .bind(name)
                .bind(&name_unaccented)
                .bind(&dob_clean)
                .bind(gender)
                .bind(&enc_cccd)
                .bind(&cccd_hash)
                .bind(&cccd_last4)
                .bind(ethnicity)
                .bind(residence)
                .bind(current_address)
                .bind(vid)
                .bind(stt)
                .bind(notes)
                .bind(calc_year)
                .bind(received)
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
                .execute(&state.pool)
                .await;
            }
            inserted += 1;
        }

        return Json(json!({
            "success": true,
            "inserted": inserted,
            "count": inserted,
            "updated": 0,
            "failed": 0,
            "errorDetails": []
        })).into_response();
    }

    (
        StatusCode::BAD_REQUEST,
        Json(json!({ "error": "Định dạng tải lên không hợp lệ" })),
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

    let filename = if is_htxh { "Mau_nhap_lieu_HTXH.xlsx" } else { "Mau_nhap_lieu_chuc_tho.xlsx" };
    let mut headers_map = HeaderMap::new();
    headers_map.insert(
        header::CONTENT_TYPE,
        HeaderValue::from_static("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
    );
    headers_map.insert(
        header::CONTENT_DISPOSITION,
        HeaderValue::from_str(&format!("attachment; filename=\"{}\"", filename)).unwrap(),
    );

    (StatusCode::OK, headers_map, buf).into_response()
}

pub fn router() -> axum::Router<AppState> {
    axum::Router::new()
        .route("/sync", axum::routing::post(sync_policy_data))
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

