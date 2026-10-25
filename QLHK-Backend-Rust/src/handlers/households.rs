use axum::{
    extract::{Extension, Path, Query, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::{delete, get, post},
    Json, Router,
};
use chrono::Utc;
use serde_json::json;
use sqlx::QueryBuilder;
use std::collections::HashMap;
use uuid::Uuid;

use crate::{
    crypto::{encrypt_cccd, hash_cccd, remove_accents},
    middlewares::auth::Claims,
    models::{
        citizen::{format_citizen, CitizenDb, CitizenResponse},
        household::{
            ChangeHeadRequest, CreateHouseholdRequest, HouseholdDb, HouseholdFilter,
            HouseholdResponse, MergeHouseholdRequest, PaginatedResponse, PaginationMeta,
            SplitHouseholdRequest, UpdateHouseholdRequest, VillageInfo,
        },
    },
    state::AppState,
};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(get_households).post(create_household))
        .route(
            "/export-excel",
            get(crate::handlers::excel::export_excel)
                .post(crate::handlers::excel::export_excel_post),
        )
        .route("/recycle-bin", get(get_recycle_bin))
        .route("/batch-delete", post(batch_delete_households))
        .route(
            "/{id}",
            get(get_household_by_id)
                .put(update_household)
                .patch(update_household)
                .delete(delete_household),
        )
        .route("/{id}/restore", post(restore_household))
        .route("/{id}/hard", delete(hard_delete_household))
        .route("/{id}/split", post(split_household))
        .route("/{id}/merge", post(merge_household))
        .route("/{id}/change-head", post(change_head))
}

pub async fn get_households(
    State(state): State<AppState>,
    claims_ext: Option<Extension<Claims>>,
    Query(filter): Query<HouseholdFilter>,
) -> Response {
    let claims = claims_ext.map(|Extension(c)| c);
    let page = filter.page.unwrap_or(1).max(1);
    let limit = filter.limit.unwrap_or(20).clamp(1, 100);
    let offset = (page - 1) * limit;

    let target_village_id = match &claims {
        Some(c) if c.role != "admin" => c.village_id.as_deref().and_then(|v| Uuid::parse_str(v).ok()),
        _ => filter
            .village_id
            .or(filter.village_id_camel),
    };

    let include_deleted = filter
        .include_deleted
        .unwrap_or_else(|| filter.include_deleted_camel.as_deref() == Some("true"));

    let mut count_builder = QueryBuilder::new("SELECT COUNT(*) FROM qlhk.households h WHERE 1=1");
    let mut select_builder = QueryBuilder::new(
        "SELECT h.id, h.village_id, h.book_number, h.address, h.status, h.version, h.is_deleted, h.deleted_at, h.created_at, h.updated_at FROM qlhk.households h WHERE 1=1",
    );

    if !include_deleted {
        count_builder.push(" AND h.is_deleted = false");
        select_builder.push(" AND h.is_deleted = false");
    }

    if let Some(vid) = target_village_id {
        count_builder.push(" AND h.village_id = ");
        count_builder.push_bind(vid);
        select_builder.push(" AND h.village_id = ");
        select_builder.push_bind(vid);
    }

    if let Some(status_str) = &filter.status {
        let trimmed = status_str.trim();
        if !trimmed.is_empty() && trimmed != "all" && trimmed != "Tất cả" {
            if trimmed == "Thường trú" || trimmed == "active" {
                count_builder.push(" AND h.status IN ('active', 'Thường trú')");
                select_builder.push(" AND h.status IN ('active', 'Thường trú')");
            } else if trimmed == "Tạm trú" || trimmed == "temporary" {
                count_builder.push(" AND h.status IN ('temporary', 'Tạm trú')");
                select_builder.push(" AND h.status IN ('temporary', 'Tạm trú')");
            } else if trimmed == "Tạm vắng" || trimmed == "absent" {
                count_builder.push(" AND h.status IN ('absent', 'Tạm vắng')");
                select_builder.push(" AND h.status IN ('absent', 'Tạm vắng')");
            } else if trimmed == "Đã chuyển đi" || trimmed == "moved" {
                count_builder.push(" AND h.status IN ('moved', 'Đã chuyển đi')");
                select_builder.push(" AND h.status IN ('moved', 'Đã chuyển đi')");
            } else {
                count_builder.push(" AND h.status = ");
                count_builder.push_bind(trimmed.to_string());
                select_builder.push(" AND h.status = ");
                select_builder.push_bind(trimmed.to_string());
            }
        }
    }

    if let Some(q) = &filter.search {
        let trimmed_q = q.trim();
        if !trimmed_q.is_empty() {
            let like_q = format!("%{}%", trimmed_q);
            let unacc = format!("%{}%", remove_accents(trimmed_q));
            let digits: String = trimmed_q.chars().filter(|c| c.is_ascii_digit()).collect();

            let cccd_hash = if digits.len() == 9 || digits.len() == 12 {
                Some(hash_cccd(&digits))
            } else {
                None
            };

            let cccd_l4 = if digits.len() >= 4 {
                Some(format!("%{}%", &digits[digits.len() - 4..]))
            } else {
                None
            };

            let search_clause = " AND (h.book_number ILIKE ";
            count_builder.push(search_clause);
            count_builder.push_bind(like_q.clone());
            count_builder.push(" OR h.address ILIKE ");
            count_builder.push_bind(like_q.clone());
            count_builder.push(" OR EXISTS (SELECT 1 FROM qlhk.citizens c WHERE c.household_id = h.id AND c.is_deleted = false AND (c.full_name ILIKE ");
            count_builder.push_bind(like_q.clone());
            count_builder.push(" OR c.name_unaccented ILIKE ");
            count_builder.push_bind(unacc.clone());

            if let Some(hash) = &cccd_hash {
                count_builder.push(" OR c.cccd_hash = ");
                count_builder.push_bind(hash.clone());
            }

            if let Some(l4) = &cccd_l4 {
                count_builder.push(" OR c.cccd_last4 ILIKE ");
                count_builder.push_bind(l4.clone());
            }

            count_builder.push(")))");

            select_builder.push(search_clause);
            select_builder.push_bind(like_q.clone());
            select_builder.push(" OR h.address ILIKE ");
            select_builder.push_bind(like_q.clone());
            select_builder.push(" OR EXISTS (SELECT 1 FROM qlhk.citizens c WHERE c.household_id = h.id AND c.is_deleted = false AND (c.full_name ILIKE ");
            select_builder.push_bind(like_q.clone());
            select_builder.push(" OR c.name_unaccented ILIKE ");
            select_builder.push_bind(unacc);

            if let Some(hash) = cccd_hash {
                select_builder.push(" OR c.cccd_hash = ");
                select_builder.push_bind(hash);
            }

            if let Some(l4) = cccd_l4 {
                select_builder.push(" OR c.cccd_last4 ILIKE ");
                select_builder.push_bind(l4);
            }

            select_builder.push(")))");
        }
    }

    let total: i64 = match count_builder.build_query_scalar::<i64>().fetch_one(&state.pool).await {
        Ok(t) => t,
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Lỗi máy chủ khi đếm số hộ gia đình" })),
            )
                .into_response();
        }
    };

    select_builder.push(" ORDER BY h.created_at DESC LIMIT ");
    select_builder.push_bind(limit);
    select_builder.push(" OFFSET ");
    select_builder.push_bind(offset);

    let households: Vec<HouseholdDb> = match select_builder.build_query_as::<HouseholdDb>().fetch_all(&state.pool).await {
        Ok(h) => h,
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Lỗi máy chủ khi lấy danh sách hộ khẩu" })),
            )
                .into_response();
        }
    };

    if households.is_empty() {
        return Json(PaginatedResponse {
            data: Vec::<HouseholdResponse>::new(),
            pagination: PaginationMeta {
                page,
                limit,
                total,
                total_pages: ((total as f64) / (limit as f64)).ceil() as i64,
            },
        })
        .into_response();
    }

    let household_ids: Vec<Uuid> = households.iter().map(|h| h.id).collect();
    let village_ids: Vec<Uuid> = households.iter().map(|h| h.village_id).collect();

    let villages = sqlx::query_as::<_, VillageInfo>(
        "SELECT id, name, code FROM qlhk.villages WHERE id = ANY($1)",
    )
    .bind(&village_ids)
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default();

    let village_map: HashMap<Uuid, VillageInfo> = villages.into_iter().map(|v| (v.id, v)).collect();

    let citizens = sqlx::query_as::<_, CitizenDb>(
        "SELECT id, household_id, stt, is_head, relationship, full_name, name_unaccented, dob, gender, cccd, cccd_hash, cccd_last4, ethnicity, religion, education, military_status, occupation, native_place, notes, version, is_deleted, deleted_at, created_at, updated_at FROM qlhk.citizens WHERE household_id = ANY($1) AND is_deleted = false ORDER BY is_head DESC, stt ASC NULLS LAST",
    )
    .bind(&household_ids)
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default();

    let mut citizen_map: HashMap<Uuid, Vec<CitizenResponse>> = HashMap::new();
    for c in citizens {
        let resp = format_citizen(c);
        citizen_map.entry(resp.household_id).or_default().push(resp);
    }

    let data: Vec<HouseholdResponse> = households
        .into_iter()
        .map(|h| {
            let village = village_map.get(&h.village_id).cloned();
            let c_list = citizen_map.remove(&h.id).unwrap_or_default();
            HouseholdResponse {
                id: h.id,
                village_id: h.village_id,
                book_number: h.book_number,
                address: h.address,
                status: h.status,
                version: h.version,
                is_deleted: h.is_deleted,
                deleted_at: h.deleted_at,
                created_at: h.created_at,
                updated_at: h.updated_at,
                village,
                citizens: c_list,
            }
        })
        .collect();

    let total_pages = if total == 0 {
        0
    } else {
        ((total as f64) / (limit as f64)).ceil() as i64
    };

    Json(PaginatedResponse {
        data,
        pagination: PaginationMeta {
            page,
            limit,
            total,
            total_pages,
        },
    })
    .into_response()
}

pub async fn get_household_by_id(
    State(state): State<AppState>,
    claims_ext: Option<Extension<Claims>>,
    Path(id): Path<Uuid>,
) -> Response {
    let claims = claims_ext.map(|Extension(c)| c);

    let household = match sqlx::query_as::<_, HouseholdDb>(
        "SELECT id, village_id, book_number, address, status, version, is_deleted, deleted_at, created_at, updated_at FROM qlhk.households WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(Some(h)) => h,
        Ok(None) => {
            return (
                StatusCode::NOT_FOUND,
                Json(json!({ "error": "Không tìm thấy thông tin hộ khẩu" })),
            )
                .into_response();
        }
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Lỗi máy chủ khi tìm kiếm hộ khẩu" })),
            )
                .into_response();
        }
    };

    if household.is_deleted {
        return (
            StatusCode::NOT_FOUND,
            Json(json!({ "error": "Không tìm thấy thông tin hộ khẩu" })),
        )
            .into_response();
    }

    if let Some(c) = &claims {
        if c.role != "admin" {
            if let Some(user_vid) = c.village_id.as_deref().and_then(|v| Uuid::parse_str(v).ok()) {
                if household.village_id != user_vid {
                    return (
                        StatusCode::FORBIDDEN,
                        Json(json!({ "error": "Không có quyền truy cập hộ khẩu của thôn khác" })),
                    )
                        .into_response();
                }
            }
        }
    }

    let village = sqlx::query_as::<_, VillageInfo>(
        "SELECT id, name, code FROM qlhk.villages WHERE id = $1",
    )
    .bind(household.village_id)
    .fetch_optional(&state.pool)
    .await
    .unwrap_or_default();

    let citizens = sqlx::query_as::<_, CitizenDb>(
        "SELECT id, household_id, stt, is_head, relationship, full_name, name_unaccented, dob, gender, cccd, cccd_hash, cccd_last4, ethnicity, religion, education, military_status, occupation, native_place, notes, version, is_deleted, deleted_at, created_at, updated_at FROM qlhk.citizens WHERE household_id = $1 AND is_deleted = false ORDER BY is_head DESC, stt ASC NULLS LAST",
    )
    .bind(household.id)
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default()
    .into_iter()
    .map(format_citizen)
    .collect();

    let response = HouseholdResponse {
        id: household.id,
        village_id: household.village_id,
        book_number: household.book_number,
        address: household.address,
        status: household.status,
        version: household.version,
        is_deleted: household.is_deleted,
        deleted_at: household.deleted_at,
        created_at: household.created_at,
        updated_at: household.updated_at,
        village,
        citizens,
    };

    Json(json!({ "data": response })).into_response()
}

pub async fn create_household(
    State(state): State<AppState>,
    claims_ext: Option<Extension<Claims>>,
    Json(req): Json<CreateHouseholdRequest>,
) -> Response {
    let claims = claims_ext.map(|Extension(c)| c);

    let target_village_id = match &claims {
        Some(c) if c.role != "admin" => c.village_id.as_deref().and_then(|v| Uuid::parse_str(v).ok()),
        _ => req.village_id,
    };

    let village_id = match target_village_id {
        Some(vid) => vid,
        None => {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({ "error": "Vui lòng cung cấp thôn (village_id)" })),
            )
                .into_response();
        }
    };

    let book_number = match req.book_number.as_deref() {
        Some(b) if !b.trim().is_empty() => b.trim().to_string(),
        _ => format!("HGD-{}-{}", Utc::now().timestamp_millis(), rand::random::<u16>()),
    };

    let status = req.status.unwrap_or_else(|| "active".to_string());
    let household_id = Uuid::new_v4();

    let mut tx = match state.pool.begin().await {
        Ok(t) => t,
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Lỗi khởi tạo giao dịch cơ sở dữ liệu" })),
            )
                .into_response();
        }
    };

    let insert_hh_res = sqlx::query_as::<_, HouseholdDb>(
        "INSERT INTO qlhk.households (id, village_id, book_number, address, status, version, is_deleted, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, 1, false, NOW(), NOW()) RETURNING id, village_id, book_number, address, status, version, is_deleted, deleted_at, created_at, updated_at",
    )
    .bind(household_id)
    .bind(village_id)
    .bind(&book_number)
    .bind(req.address.as_deref())
    .bind(&status)
    .fetch_one(&mut *tx)
    .await;

    let household_db = match insert_hh_res {
        Ok(h) => h,
        Err(_) => {
            let _ = tx.rollback().await;
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Lỗi tạo hộ khẩu trong cơ sở dữ liệu" })),
            )
                .into_response();
        }
    };

    let members = req.members.or(req.citizens).unwrap_or_default();
    let mut created_citizens = Vec::new();

    for (idx, m) in members.into_iter().enumerate() {
        let clean_name = m.full_name.trim().to_string();
        if clean_name.is_empty() {
            continue;
        }

        let name_unacc = remove_accents(&clean_name);
        let raw_cccd = m.cccd.as_deref().unwrap_or("").trim();
        let is_valid_cccd = !raw_cccd.is_empty()
            && !raw_cccd.to_lowercase().contains("chưa có")
            && !raw_cccd.contains('•')
            && !raw_cccd.contains('*')
            && raw_cccd.chars().all(|c| c.is_ascii_digit())
            && (raw_cccd.len() == 9 || raw_cccd.len() == 12);

        let (cccd_cipher, cccd_hash_val, cccd_last4_val) = if is_valid_cccd {
            match encrypt_cccd(raw_cccd) {
                Ok(enc) => (Some(enc.encrypted), Some(enc.hash), Some(enc.last4)),
                Err(_) => (None, None, None),
            }
        } else {
            (None, None, None)
        };

        let is_head = m.is_head.unwrap_or(idx == 0);
        let relationship = m.relationship.unwrap_or_else(|| {
            if is_head {
                "Chủ hộ".to_string()
            } else {
                "Thành viên".to_string()
            }
        });
        let stt = m.stt.unwrap_or((idx + 1) as i32);
        let citizen_id = m.id.unwrap_or_else(Uuid::new_v4);

        let citizen_res = sqlx::query_as::<_, CitizenDb>(
            "INSERT INTO qlhk.citizens (id, household_id, stt, is_head, relationship, full_name, name_unaccented, dob, gender, cccd, cccd_hash, cccd_last4, ethnicity, religion, education, military_status, occupation, native_place, notes, version, is_deleted, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, 1, false, NOW(), NOW()) RETURNING id, household_id, stt, is_head, relationship, full_name, name_unaccented, dob, gender, cccd, cccd_hash, cccd_last4, ethnicity, religion, education, military_status, occupation, native_place, notes, version, is_deleted, deleted_at, created_at, updated_at",
        )
        .bind(citizen_id)
        .bind(household_id)
        .bind(stt)
        .bind(is_head)
        .bind(relationship)
        .bind(clean_name)
        .bind(name_unacc)
        .bind(m.dob.as_deref())
        .bind(m.gender.as_deref())
        .bind(cccd_cipher)
        .bind(cccd_hash_val)
        .bind(cccd_last4_val)
        .bind(m.ethnicity.as_deref())
        .bind(m.religion.as_deref())
        .bind(m.education.as_deref())
        .bind(m.military_status.as_deref())
        .bind(m.occupation.as_deref())
        .bind(m.native_place.as_deref())
        .bind(m.notes.as_deref())
        .fetch_one(&mut *tx)
        .await;

        match citizen_res {
            Ok(c) => created_citizens.push(format_citizen(c)),
            Err(_) => {
                let _ = tx.rollback().await;
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(json!({ "error": "Lỗi tạo thành viên hộ khẩu trong cơ sở dữ liệu" })),
                )
                    .into_response();
            }
        }
    }

    if tx.commit().await.is_err() {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": "Lỗi hoàn tất giao dịch tạo hộ khẩu" })),
        )
            .into_response();
    }

    let village = sqlx::query_as::<_, VillageInfo>(
        "SELECT id, name, code FROM qlhk.villages WHERE id = $1",
    )
    .bind(village_id)
    .fetch_optional(&state.pool)
    .await
    .unwrap_or_default();

    let response = HouseholdResponse {
        id: household_db.id,
        village_id: household_db.village_id,
        book_number: household_db.book_number,
        address: household_db.address,
        status: household_db.status,
        version: household_db.version,
        is_deleted: household_db.is_deleted,
        deleted_at: household_db.deleted_at,
        created_at: household_db.created_at,
        updated_at: household_db.updated_at,
        village,
        citizens: created_citizens,
    };

    let audit_pool = state.pool.clone();
    let audit_new = serde_json::to_string(&response).ok();
    let audit_uid = claims.as_ref().and_then(|c| Uuid::parse_str(&c.id).ok());
    tokio::spawn(async move {
        let _ = crate::utils::audit::record_audit(
            &audit_pool,
            Some(village_id),
            audit_uid,
            "CREATE",
            "household",
            Some(&household_id.to_string()),
            None,
            audit_new.as_deref(),
            None,
        )
        .await;
    });

    (
        StatusCode::CREATED,
        Json(json!({
            "message": "Tạo hộ khẩu thành công",
            "data": response
        })),
    )
        .into_response()
}

pub async fn update_household(
    State(state): State<AppState>,
    claims_ext: Option<Extension<Claims>>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateHouseholdRequest>,
) -> Response {
    let claims = claims_ext.map(|Extension(c)| c);

    let current = match sqlx::query_as::<_, HouseholdDb>(
        "SELECT id, village_id, book_number, address, status, version, is_deleted, deleted_at, created_at, updated_at FROM qlhk.households WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(Some(h)) if !h.is_deleted => h,
        Ok(_) => {
            return (
                StatusCode::NOT_FOUND,
                Json(json!({ "error": "Không tìm thấy hộ khẩu" })),
            )
                .into_response();
        }
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Lỗi máy chủ khi tìm kiếm hộ khẩu" })),
            )
                .into_response();
        }
    };

    if let Some(c) = &claims {
        if c.role != "admin" {
            if let Some(user_vid) = c.village_id.as_deref().and_then(|v| Uuid::parse_str(v).ok()) {
                if current.village_id != user_vid {
                    return (
                        StatusCode::FORBIDDEN,
                        Json(json!({ "error": "Không có quyền cập nhật hộ khẩu của thôn khác" })),
                    )
                        .into_response();
                }
            }
        }
    }

    let expected_version = req.version.unwrap_or(current.version);
    if req.version.is_some() && req.version.unwrap() != current.version {
        return (
            StatusCode::CONFLICT,
            Json(json!({
                "error": "Dữ liệu hộ khẩu đã bị thay đổi bởi người dùng khác. Vui lòng tải lại trang.",
                "currentVersion": current.version,
                "submittedVersion": req.version
            })),
        )
            .into_response();
    }

    let mut tx = match state.pool.begin().await {
        Ok(t) => t,
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Lỗi khởi tạo giao dịch cơ sở dữ liệu" })),
            )
                .into_response();
        }
    };

    let new_book = req.book_number.as_deref().unwrap_or(&current.book_number).trim();
    let new_address = req.address.as_deref().or(current.address.as_deref());
    let new_status = req.status.as_deref().unwrap_or(&current.status).trim();

    let update_res = sqlx::query_as::<_, HouseholdDb>(
        "UPDATE qlhk.households SET book_number = $1, address = $2, status = $3, version = version + 1, updated_at = NOW() WHERE id = $4 AND version = $5 AND is_deleted = false RETURNING id, village_id, book_number, address, status, version, is_deleted, deleted_at, created_at, updated_at",
    )
    .bind(new_book)
    .bind(new_address)
    .bind(new_status)
    .bind(id)
    .bind(expected_version)
    .fetch_optional(&mut *tx)
    .await;

    let updated_hh = match update_res {
        Ok(Some(h)) => h,
        Ok(None) => {
            let _ = tx.rollback().await;
            let latest_version = sqlx::query_scalar::<_, i32>(
                "SELECT version FROM qlhk.households WHERE id = $1",
            )
            .bind(id)
            .fetch_one(&state.pool)
            .await
            .unwrap_or(current.version);

            return (
                StatusCode::CONFLICT,
                Json(json!({
                    "error": "Dữ liệu hộ khẩu đã bị thay đổi bởi người dùng khác. Vui lòng tải lại trang.",
                    "currentVersion": latest_version,
                    "submittedVersion": req.version
                })),
            )
                .into_response();
        }
        Err(_) => {
            let _ = tx.rollback().await;
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Lỗi máy chủ khi cập nhật hộ khẩu" })),
            )
                .into_response();
        }
    };

    if let Some(members) = req.members.or(req.citizens) {
        let existing = sqlx::query_as::<_, CitizenDb>(
            "SELECT id, household_id, stt, is_head, relationship, full_name, name_unaccented, dob, gender, cccd, cccd_hash, cccd_last4, ethnicity, religion, education, military_status, occupation, native_place, notes, version, is_deleted, deleted_at, created_at, updated_at FROM qlhk.citizens WHERE household_id = $1 AND is_deleted = false",
        )
        .bind(id)
        .fetch_all(&mut *tx)
        .await
        .unwrap_or_default();

        let mut processed_ids = Vec::new();

        for (idx, m) in members.into_iter().enumerate() {
            let clean_name = m.full_name.as_deref().unwrap_or("").trim().to_string();
            let name_unacc = if !clean_name.is_empty() {
                Some(remove_accents(&clean_name))
            } else {
                None
            };

            let raw_cccd = m.cccd.as_deref().unwrap_or("").trim();
            let is_invalid = raw_cccd.to_lowercase().contains("chưa có")
                || raw_cccd.contains('—')
                || raw_cccd == "-";
            let is_masked = !is_invalid && (raw_cccd.contains('•') || raw_cccd.contains('*'));
            let is_valid_new_cccd = !is_invalid
                && !is_masked
                && !raw_cccd.is_empty()
                && raw_cccd.chars().all(|c| c.is_ascii_digit())
                && (raw_cccd.len() == 9 || raw_cccd.len() == 12);

            let enc_res = if is_valid_new_cccd {
                encrypt_cccd(raw_cccd).ok()
            } else {
                None
            };

            if let Some(c_id) = m.id {
                if let Some(existing_c) = existing.iter().find(|c| c.id == c_id) {
                    processed_ids.push(c_id);
                    let final_name = if !clean_name.is_empty() {
                        clean_name
                    } else {
                        existing_c.full_name.clone()
                    };
                    let final_unacc = name_unacc.or_else(|| existing_c.name_unaccented.clone());
                    let is_head = m.is_head.unwrap_or(existing_c.is_head);
                    let relationship = m.relationship.unwrap_or_else(|| {
                        if is_head {
                            "Chủ hộ".to_string()
                        } else {
                            existing_c.relationship.clone().unwrap_or_else(|| "Thành viên".to_string())
                        }
                    });

                    let (cccd_cipher, cccd_hash_val, cccd_last4_val) = if let Some(enc) = enc_res {
                        (Some(enc.encrypted), Some(enc.hash), Some(enc.last4))
                    } else if is_masked {
                        (existing_c.cccd.clone(), existing_c.cccd_hash.clone(), existing_c.cccd_last4.clone())
                    } else if raw_cccd.is_empty() || is_invalid {
                        (None, None, None)
                    } else {
                        (existing_c.cccd.clone(), existing_c.cccd_hash.clone(), existing_c.cccd_last4.clone())
                    };

                    let _ = sqlx::query(
                        "UPDATE qlhk.citizens SET full_name = $1, name_unaccented = $2, dob = $3, gender = $4, is_head = $5, relationship = $6, ethnicity = $7, religion = $8, education = $9, military_status = $10, occupation = $11, native_place = $12, notes = $13, stt = $14, cccd = $15, cccd_hash = $16, cccd_last4 = $17, version = version + 1, updated_at = NOW() WHERE id = $18",
                    )
                    .bind(final_name)
                    .bind(final_unacc)
                    .bind(m.dob.as_deref().or(existing_c.dob.as_deref()))
                    .bind(m.gender.as_deref().or(existing_c.gender.as_deref()))
                    .bind(is_head)
                    .bind(relationship)
                    .bind(m.ethnicity.as_deref().or(existing_c.ethnicity.as_deref()))
                    .bind(m.religion.as_deref().or(existing_c.religion.as_deref()))
                    .bind(m.education.as_deref().or(existing_c.education.as_deref()))
                    .bind(m.military_status.as_deref().or(existing_c.military_status.as_deref()))
                    .bind(m.occupation.as_deref().or(existing_c.occupation.as_deref()))
                    .bind(m.native_place.as_deref().or(existing_c.native_place.as_deref()))
                    .bind(m.notes.as_deref().or(existing_c.notes.as_deref()))
                    .bind(m.stt.unwrap_or((idx + 1) as i32))
                    .bind(cccd_cipher)
                    .bind(cccd_hash_val)
                    .bind(cccd_last4_val)
                    .bind(c_id)
                    .execute(&mut *tx)
                    .await;

                    continue;
                }
            }

            if !clean_name.is_empty() {
                let new_cid = Uuid::new_v4();
                processed_ids.push(new_cid);
                let is_head = m.is_head.unwrap_or(false);
                let relationship = m.relationship.unwrap_or_else(|| {
                    if is_head {
                        "Chủ hộ".to_string()
                    } else {
                        "Thành viên".to_string()
                    }
                });
                let (cccd_cipher, cccd_hash_val, cccd_last4_val) = match enc_res {
                    Some(enc) => (Some(enc.encrypted), Some(enc.hash), Some(enc.last4)),
                    None => (None, None, None),
                };

                let _ = sqlx::query(
                    "INSERT INTO qlhk.citizens (id, household_id, stt, is_head, relationship, full_name, name_unaccented, dob, gender, cccd, cccd_hash, cccd_last4, ethnicity, religion, education, military_status, occupation, native_place, notes, version, is_deleted, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, 1, false, NOW(), NOW())",
                )
                .bind(new_cid)
                .bind(id)
                .bind(m.stt.unwrap_or((idx + 1) as i32))
                .bind(is_head)
                .bind(relationship)
                .bind(clean_name)
                .bind(name_unacc)
                .bind(m.dob.as_deref())
                .bind(m.gender.as_deref())
                .bind(cccd_cipher)
                .bind(cccd_hash_val)
                .bind(cccd_last4_val)
                .bind(m.ethnicity.as_deref())
                .bind(m.religion.as_deref())
                .bind(m.education.as_deref())
                .bind(m.military_status.as_deref())
                .bind(m.occupation.as_deref())
                .bind(m.native_place.as_deref())
                .bind(m.notes.as_deref())
                .execute(&mut *tx)
                .await;
            }
        }

        let to_delete: Vec<Uuid> = existing
            .iter()
            .filter(|c| !processed_ids.contains(&c.id))
            .map(|c| c.id)
            .collect();

        if !to_delete.is_empty() {
            let _ = sqlx::query(
                "UPDATE qlhk.citizens SET is_deleted = true, deleted_at = NOW(), version = version + 1, updated_at = NOW() WHERE id = ANY($1)",
            )
            .bind(&to_delete)
            .execute(&mut *tx)
            .await;
        }
    }

    if tx.commit().await.is_err() {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": "Lỗi hoàn tất giao dịch cập nhật hộ khẩu" })),
        )
            .into_response();
    }

    let village = sqlx::query_as::<_, VillageInfo>(
        "SELECT id, name, code FROM qlhk.villages WHERE id = $1",
    )
    .bind(updated_hh.village_id)
    .fetch_optional(&state.pool)
    .await
    .unwrap_or_default();

    let citizens = sqlx::query_as::<_, CitizenDb>(
        "SELECT id, household_id, stt, is_head, relationship, full_name, name_unaccented, dob, gender, cccd, cccd_hash, cccd_last4, ethnicity, religion, education, military_status, occupation, native_place, notes, version, is_deleted, deleted_at, created_at, updated_at FROM qlhk.citizens WHERE household_id = $1 AND is_deleted = false ORDER BY is_head DESC, stt ASC NULLS LAST",
    )
    .bind(updated_hh.id)
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default()
    .into_iter()
    .map(format_citizen)
    .collect();

    let response = HouseholdResponse {
        id: updated_hh.id,
        village_id: updated_hh.village_id,
        book_number: updated_hh.book_number,
        address: updated_hh.address,
        status: updated_hh.status,
        version: updated_hh.version,
        is_deleted: updated_hh.is_deleted,
        deleted_at: updated_hh.deleted_at,
        created_at: updated_hh.created_at,
        updated_at: updated_hh.updated_at,
        village,
        citizens,
    };

    let audit_pool = state.pool.clone();
    let audit_old = serde_json::to_string(&current).ok();
    let audit_new = serde_json::to_string(&response).ok();
    let audit_vid = updated_hh.village_id;
    let audit_uid = claims.as_ref().and_then(|c| Uuid::parse_str(&c.id).ok());
    tokio::spawn(async move {
        let _ = crate::utils::audit::record_audit(
            &audit_pool,
            Some(audit_vid),
            audit_uid,
            "UPDATE",
            "household",
            Some(&id.to_string()),
            audit_old.as_deref(),
            audit_new.as_deref(),
            None,
        )
        .await;
    });

    Json(json!({
        "message": "Cập nhật hộ khẩu thành công",
        "data": response
    }))
    .into_response()
}

pub async fn delete_household(
    State(state): State<AppState>,
    claims_ext: Option<Extension<Claims>>,
    Path(id): Path<Uuid>,
) -> Response {
    let claims = claims_ext.map(|Extension(c)| c);

    let current = match sqlx::query_as::<_, HouseholdDb>(
        "SELECT id, village_id, book_number, address, status, version, is_deleted, deleted_at, created_at, updated_at FROM qlhk.households WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(Some(h)) if !h.is_deleted => h,
        Ok(_) => {
            return (
                StatusCode::NOT_FOUND,
                Json(json!({ "error": "Không tìm thấy hộ khẩu" })),
            )
                .into_response();
        }
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Lỗi máy chủ khi tìm kiếm hộ khẩu" })),
            )
                .into_response();
        }
    };

    if let Some(c) = &claims {
        if c.role != "admin" {
            if let Some(user_vid) = c.village_id.as_deref().and_then(|v| Uuid::parse_str(v).ok()) {
                if current.village_id != user_vid {
                    return (
                        StatusCode::FORBIDDEN,
                        Json(json!({ "error": "Không có quyền xóa hộ khẩu của thôn khác" })),
                    )
                        .into_response();
                }
            }
        }
    }

    let mut tx = match state.pool.begin().await {
        Ok(t) => t,
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Lỗi khởi tạo giao dịch cơ sở dữ liệu" })),
            )
                .into_response();
        }
    };

    let hh_delete = sqlx::query(
        "UPDATE qlhk.households SET is_deleted = true, deleted_at = NOW(), version = version + 1, updated_at = NOW() WHERE id = $1 AND is_deleted = false",
    )
    .bind(id)
    .execute(&mut *tx)
    .await;

    if hh_delete.is_err() {
        let _ = tx.rollback().await;
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": "Lỗi khi xóa mềm hộ khẩu" })),
        )
            .into_response();
    }

    let citizens_delete = sqlx::query(
        "UPDATE qlhk.citizens SET is_deleted = true, deleted_at = NOW(), updated_at = NOW() WHERE household_id = $1 AND is_deleted = false",
    )
    .bind(id)
    .execute(&mut *tx)
    .await;

    if citizens_delete.is_err() {
        let _ = tx.rollback().await;
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": "Lỗi khi xóa mềm nhân khẩu trong hộ" })),
        )
            .into_response();
    }

    if tx.commit().await.is_err() {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": "Lỗi hoàn tất giao dịch xóa hộ khẩu" })),
        )
            .into_response();
    }

    let sync_pool = state.pool.clone();
    tokio::spawn(async move {
        let citizen_ids = sqlx::query_scalar::<_, Uuid>(
            "SELECT id FROM qlhk.citizens WHERE household_id = $1",
        )
        .bind(id)
        .fetch_all(&sync_pool)
        .await
        .unwrap_or_default();

        for cid in citizen_ids {
            let _ = crate::handlers::policies::sync_single_citizen_to_policies(&sync_pool, cid).await;
        }
    });

    let audit_pool = state.pool.clone();
    let audit_old = serde_json::to_string(&current).ok();
    let audit_vid = current.village_id;
    let audit_uid = claims.as_ref().and_then(|c| Uuid::parse_str(&c.id).ok());
    tokio::spawn(async move {
        let _ = crate::utils::audit::record_audit(
            &audit_pool,
            Some(audit_vid),
            audit_uid,
            "DELETE",
            "household",
            Some(&id.to_string()),
            audit_old.as_deref(),
            None,
            None,
        )
        .await;
    });

    Json(json!({ "message": "Xóa mềm hộ khẩu thành công" })).into_response()
}

pub async fn get_recycle_bin(
    State(state): State<AppState>,
    claims_ext: Option<Extension<Claims>>,
    Query(mut filter): Query<HouseholdFilter>,
) -> Response {
    filter.include_deleted = Some(true);
    get_households(State(state), claims_ext, Query(filter)).await
}

pub async fn restore_household(
    State(state): State<AppState>,
    claims_ext: Option<Extension<Claims>>,
    Path(id): Path<Uuid>,
) -> Response {
    let claims = claims_ext.map(|Extension(c)| c);
    let current = match sqlx::query_as::<_, HouseholdDb>(
        "SELECT id, village_id, book_number, address, status, version, is_deleted, deleted_at, created_at, updated_at FROM qlhk.households WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(Some(h)) if h.is_deleted => h,
        Ok(Some(_)) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({ "error": "Hộ khẩu không nằm trong thùng rác" })),
            )
                .into_response();
        }
        _ => {
            return (
                StatusCode::NOT_FOUND,
                Json(json!({ "error": "Không tìm thấy hộ khẩu trong thùng rác" })),
            )
                .into_response();
        }
    };

    if let Some(c) = &claims {
        if c.role != "admin" {
            if let Some(user_vid) = c.village_id.as_deref().and_then(|v| Uuid::parse_str(v).ok()) {
                if current.village_id != user_vid {
                    return (
                        StatusCode::FORBIDDEN,
                        Json(json!({ "error": "Không có quyền khôi phục hộ khẩu của thôn khác" })),
                    )
                        .into_response();
                }
            }
        }
    }

    let mut tx = match state.pool.begin().await {
        Ok(t) => t,
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Lỗi khởi tạo giao dịch cơ sở dữ liệu" })),
            )
                .into_response();
        }
    };

    let hh_restore = sqlx::query(
        "UPDATE qlhk.households SET is_deleted = false, deleted_at = NULL, version = version + 1, updated_at = NOW() WHERE id = $1",
    )
    .bind(id)
    .execute(&mut *tx)
    .await;

    if hh_restore.is_err() {
        let _ = tx.rollback().await;
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": "Lỗi khi khôi phục hộ khẩu" })),
        )
            .into_response();
    }

    let citizens_restore = sqlx::query(
        "UPDATE qlhk.citizens SET is_deleted = false, deleted_at = NULL, updated_at = NOW() WHERE household_id = $1 AND is_deleted = true",
    )
    .bind(id)
    .execute(&mut *tx)
    .await;

    if citizens_restore.is_err() {
        let _ = tx.rollback().await;
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": "Lỗi khi khôi phục nhân khẩu" })),
        )
            .into_response();
    }

    if tx.commit().await.is_err() {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": "Lỗi hoàn tất giao dịch khôi phục hộ khẩu" })),
        )
            .into_response();
    }

    let sync_pool = state.pool.clone();
    tokio::spawn(async move {
        let citizen_ids = sqlx::query_scalar::<_, Uuid>(
            "SELECT id FROM qlhk.citizens WHERE household_id = $1 AND is_deleted = false",
        )
        .bind(id)
        .fetch_all(&sync_pool)
        .await
        .unwrap_or_default();

        for cid in citizen_ids {
            let _ = crate::handlers::policies::sync_single_citizen_to_policies(&sync_pool, cid).await;
        }
    });

    let audit_pool = state.pool.clone();
    let audit_old = serde_json::to_string(&current).ok();
    let audit_vid = current.village_id;
    let audit_uid = claims.as_ref().and_then(|c| Uuid::parse_str(&c.id).ok());
    tokio::spawn(async move {
        let _ = crate::utils::audit::record_audit(
            &audit_pool,
            Some(audit_vid),
            audit_uid,
            "RESTORE",
            "household",
            Some(&id.to_string()),
            audit_old.as_deref(),
            Some(r#"{"is_deleted":false}"#),
            None,
        )
        .await;
    });

    Json(json!({
        "message": "Khôi phục hộ khẩu thành công",
        "data": { "id": id, "is_deleted": false }
    }))
    .into_response()
}

pub async fn hard_delete_household(
    State(state): State<AppState>,
    claims_ext: Option<Extension<Claims>>,
    Path(id): Path<Uuid>,
) -> Response {
    let claims = claims_ext.map(|Extension(c)| c);
    if let Some(c) = &claims {
        if c.role != "admin" {
            return (
                StatusCode::FORBIDDEN,
                Json(json!({ "error": "Chỉ Admin mới có quyền xóa vĩnh viễn" })),
            )
                .into_response();
        }
    }

    let _current = match sqlx::query_as::<_, HouseholdDb>(
        "SELECT id, village_id, book_number, address, status, version, is_deleted, deleted_at, created_at, updated_at FROM qlhk.households WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(Some(h)) => h,
        _ => {
            return (
                StatusCode::NOT_FOUND,
                Json(json!({ "error": "Không tìm thấy hộ khẩu" })),
            )
                .into_response();
        }
    };

    let mut tx = match state.pool.begin().await {
        Ok(t) => t,
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Lỗi khởi tạo giao dịch cơ sở dữ liệu" })),
            )
                .into_response();
        }
    };

    let _ = sqlx::query("DELETE FROM qlhk.citizens WHERE household_id = $1")
        .bind(id)
        .execute(&mut *tx)
        .await;

    let _ = sqlx::query("DELETE FROM qlhk.households WHERE id = $1")
        .bind(id)
        .execute(&mut *tx)
        .await;

    if tx.commit().await.is_err() {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": "Lỗi xóa vĩnh viễn hộ khẩu" })),
        )
            .into_response();
    }

    let audit_pool = state.pool.clone();
    let audit_vid = _current.village_id;
    let audit_uid = claims.as_ref().and_then(|c| Uuid::parse_str(&c.id).ok());
    let audit_old = serde_json::to_string(&_current).ok();
    tokio::spawn(async move {
        let _ = crate::utils::audit::record_audit(
            &audit_pool,
            Some(audit_vid),
            audit_uid,
            "DELETE",
            "household",
            Some(&id.to_string()),
            audit_old.as_deref(),
            None,
            None,
        )
        .await;
    });

    Json(json!({
        "message": "Đã xóa vĩnh viễn hộ khẩu",
        "data": { "id": id }
    }))
    .into_response()
}

#[derive(Debug, serde::Deserialize)]
pub struct BatchDeleteRequest {
    pub ids: Vec<Uuid>,
}

pub async fn batch_delete_households(
    State(state): State<AppState>,
    claims_ext: Option<Extension<Claims>>,
    Json(req): Json<BatchDeleteRequest>,
) -> Response {
    let claims = claims_ext.map(|Extension(c)| c);
    if req.ids.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": "Danh sách ID không hợp lệ" })),
        )
            .into_response();
    }

    let mut tx = match state.pool.begin().await {
        Ok(t) => t,
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Lỗi khởi tạo giao dịch cơ sở dữ liệu" })),
            )
                .into_response();
        }
    };

    let _ = sqlx::query(
        "UPDATE qlhk.households SET is_deleted = true, deleted_at = NOW(), version = version + 1, updated_at = NOW() WHERE id = ANY($1)",
    )
    .bind(&req.ids)
    .execute(&mut *tx)
    .await;

    let _ = sqlx::query(
        "UPDATE qlhk.citizens SET is_deleted = true, deleted_at = NOW(), updated_at = NOW() WHERE household_id = ANY($1)",
    )
    .bind(&req.ids)
    .execute(&mut *tx)
    .await;

    if tx.commit().await.is_err() {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": "Lỗi xóa hàng loạt hộ khẩu" })),
        )
            .into_response();
    }

    let audit_pool = state.pool.clone();
    let audit_ids = req.ids.clone();
    let audit_uid = claims.as_ref().and_then(|c| Uuid::parse_str(&c.id).ok());
    tokio::spawn(async move {
        for hid in audit_ids {
            let _ = crate::utils::audit::record_audit(
                &audit_pool,
                None,
                audit_uid,
                "DELETE",
                "household",
                Some(&hid.to_string()),
                None,
                None,
                None,
            )
            .await;
        }
    });

    Json(json!({
        "message": "Đã chuyển vào thùng rác thành công",
        "count": req.ids.len()
    }))
    .into_response()
}

pub async fn split_household(
    State(state): State<AppState>,
    claims_ext: Option<Extension<Claims>>,
    Path(id): Path<Uuid>,
    Json(req): Json<SplitHouseholdRequest>,
) -> Response {
    let claims = claims_ext.map(|Extension(c)| c);

    if req.citizen_ids.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": "Danh sách nhân khẩu tách không được để trống" })),
        )
            .into_response();
    }

    if !req.citizen_ids.contains(&req.new_head_id) {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": "Chủ hộ mới phải nằm trong danh sách nhân khẩu tách" })),
        )
            .into_response();
    }

    let mut tx = match state.pool.begin().await {
        Ok(t) => t,
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Lỗi khởi tạo giao dịch cơ sở dữ liệu" })),
            )
                .into_response();
        }
    };

    let source = match sqlx::query_as::<_, HouseholdDb>(
        "SELECT id, village_id, book_number, address, status, version, is_deleted, deleted_at, created_at, updated_at FROM qlhk.households WHERE id = $1 AND is_deleted = false FOR UPDATE",
    )
    .bind(id)
    .fetch_optional(&mut *tx)
    .await
    {
        Ok(Some(h)) => h,
        Ok(None) => {
            let _ = tx.rollback().await;
            return (
                StatusCode::NOT_FOUND,
                Json(json!({ "error": "Hộ khẩu gốc không tồn tại hoặc đã bị xóa" })),
            )
                .into_response();
        }
        Err(_) => {
            let _ = tx.rollback().await;
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Lỗi kiểm tra hộ khẩu gốc" })),
            )
                .into_response();
        }
    };

    if let Some(c) = &claims {
        if c.role != "admin" {
            if let Some(user_vid) = c.village_id.as_deref().and_then(|v| Uuid::parse_str(v).ok()) {
                if source.village_id != user_vid {
                    let _ = tx.rollback().await;
                    return (
                        StatusCode::FORBIDDEN,
                        Json(json!({ "error": "Không có quyền tách hộ khẩu của thôn khác" })),
                    )
                        .into_response();
                }
            }
        }
    }

    let moving_citizens = match sqlx::query_as::<_, CitizenDb>(
        "SELECT id, household_id, stt, is_head, relationship, full_name, name_unaccented, dob, gender, cccd, cccd_hash, cccd_last4, ethnicity, religion, education, military_status, occupation, native_place, notes, version, is_deleted, deleted_at, created_at, updated_at FROM qlhk.citizens WHERE household_id = $1 AND id = ANY($2) AND is_deleted = false FOR UPDATE",
    )
    .bind(id)
    .bind(&req.citizen_ids)
    .fetch_all(&mut *tx)
    .await
    {
        Ok(list) => list,
        Err(_) => {
            let _ = tx.rollback().await;
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Lỗi truy vấn nhân khẩu tách" })),
            )
                .into_response();
        }
    };

    if moving_citizens.len() != req.citizen_ids.len() {
        let _ = tx.rollback().await;
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": "Một hoặc nhiều nhân khẩu không thuộc hộ này hoặc đã bị xóa" })),
        )
            .into_response();
    }

    let new_hh_id = Uuid::new_v4();
    let target_village_id = req.new_village_id.unwrap_or(source.village_id);
    let target_book = match req.new_book_number.as_deref() {
        Some(b) if !b.trim().is_empty() => b.trim().to_string(),
        _ => format!("HGD-{}-{}", Utc::now().timestamp_millis(), rand::random::<u16>()),
    };
    let target_address = req.new_address.as_deref().or(source.address.as_deref());

    let new_hh_res = sqlx::query_as::<_, HouseholdDb>(
        "INSERT INTO qlhk.households (id, village_id, book_number, address, status, version, is_deleted, created_at, updated_at) VALUES ($1, $2, $3, $4, 'active', 1, false, NOW(), NOW()) RETURNING id, village_id, book_number, address, status, version, is_deleted, deleted_at, created_at, updated_at",
    )
    .bind(new_hh_id)
    .bind(target_village_id)
    .bind(&target_book)
    .bind(target_address)
    .fetch_one(&mut *tx)
    .await;

    let new_hh = match new_hh_res {
        Ok(h) => h,
        Err(_) => {
            let _ = tx.rollback().await;
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Lỗi tạo hộ khẩu mới" })),
            )
                .into_response();
        }
    };

    for c_id in &req.citizen_ids {
        let is_head = *c_id == req.new_head_id;
        let relationship = if is_head { "Chủ hộ" } else { "Thành viên" };
        let move_res = sqlx::query(
            "UPDATE qlhk.citizens SET household_id = $1, is_head = $2, relationship = $3, version = version + 1, updated_at = NOW() WHERE id = $4",
        )
        .bind(new_hh_id)
        .bind(is_head)
        .bind(relationship)
        .bind(c_id)
        .execute(&mut *tx)
        .await;

        if move_res.is_err() {
            let _ = tx.rollback().await;
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Lỗi chuyển nhân khẩu sang hộ mới" })),
            )
                .into_response();
        }
    }

    let remaining_citizens = sqlx::query_as::<_, CitizenDb>(
        "SELECT id, household_id, stt, is_head, relationship, full_name, name_unaccented, dob, gender, cccd, cccd_hash, cccd_last4, ethnicity, religion, education, military_status, occupation, native_place, notes, version, is_deleted, deleted_at, created_at, updated_at FROM qlhk.citizens WHERE household_id = $1 AND is_deleted = false FOR UPDATE",
    )
    .bind(id)
    .fetch_all(&mut *tx)
    .await
    .unwrap_or_default();

    let old_head_moved = moving_citizens.iter().any(|c| c.is_head);
    if old_head_moved && !remaining_citizens.is_empty() {
        let new_source_head_id = req
            .remaining_head_id
            .filter(|hid| remaining_citizens.iter().any(|rc| rc.id == *hid))
            .unwrap_or(remaining_citizens[0].id);

        let _ = sqlx::query(
            "UPDATE qlhk.citizens SET is_head = false, version = version + 1, updated_at = NOW() WHERE household_id = $1 AND is_head = true",
        )
        .bind(id)
        .execute(&mut *tx)
        .await;

        let _ = sqlx::query(
            "UPDATE qlhk.citizens SET is_head = true, relationship = 'Chủ hộ', version = version + 1, updated_at = NOW() WHERE id = $1",
        )
        .bind(new_source_head_id)
        .execute(&mut *tx)
        .await;
    }

    let _ = sqlx::query(
        "UPDATE qlhk.households SET version = version + 1, updated_at = NOW() WHERE id = $1",
    )
    .bind(id)
    .execute(&mut *tx)
    .await;

    if tx.commit().await.is_err() {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": "Lỗi hoàn tất giao dịch tách hộ khẩu" })),
        )
            .into_response();
    }

    let village = sqlx::query_as::<_, VillageInfo>(
        "SELECT id, name, code FROM qlhk.villages WHERE id = $1",
    )
    .bind(new_hh.village_id)
    .fetch_optional(&state.pool)
    .await
    .unwrap_or_default();

    let new_citizens = sqlx::query_as::<_, CitizenDb>(
        "SELECT id, household_id, stt, is_head, relationship, full_name, name_unaccented, dob, gender, cccd, cccd_hash, cccd_last4, ethnicity, religion, education, military_status, occupation, native_place, notes, version, is_deleted, deleted_at, created_at, updated_at FROM qlhk.citizens WHERE household_id = $1 AND is_deleted = false ORDER BY is_head DESC, stt ASC NULLS LAST",
    )
    .bind(new_hh.id)
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default()
    .into_iter()
    .map(format_citizen)
    .collect();

    let response = HouseholdResponse {
        id: new_hh.id,
        village_id: new_hh.village_id,
        book_number: new_hh.book_number,
        address: new_hh.address,
        status: new_hh.status,
        version: new_hh.version,
        is_deleted: new_hh.is_deleted,
        deleted_at: new_hh.deleted_at,
        created_at: new_hh.created_at,
        updated_at: new_hh.updated_at,
        village,
        citizens: new_citizens,
    };

    let audit_pool = state.pool.clone();
    let audit_new = serde_json::to_string(&response).ok();
    let audit_uid = claims.as_ref().and_then(|c| Uuid::parse_str(&c.id).ok());
    let audit_vid = new_hh.village_id;
    let audit_nid = new_hh.id;
    tokio::spawn(async move {
        let _ = crate::utils::audit::record_audit(
            &audit_pool,
            Some(audit_vid),
            audit_uid,
            "CREATE",
            "household",
            Some(&audit_nid.to_string()),
            None,
            audit_new.as_deref(),
            None,
        )
        .await;
    });

    (
        StatusCode::CREATED,
        Json(json!({
            "message": "Tách hộ khẩu thành công",
            "data": response
        })),
    )
        .into_response()
}

pub async fn merge_household(
    State(state): State<AppState>,
    claims_ext: Option<Extension<Claims>>,
    Path(id): Path<Uuid>,
    Json(req): Json<MergeHouseholdRequest>,
) -> Response {
    let claims = claims_ext.map(|Extension(c)| c);

    if id == req.target_household_id {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": "Không thể nhập hộ khẩu vào chính nó" })),
        )
            .into_response();
    }

    let mut tx = match state.pool.begin().await {
        Ok(t) => t,
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Lỗi khởi tạo giao dịch cơ sở dữ liệu" })),
            )
                .into_response();
        }
    };

    let source = match sqlx::query_as::<_, HouseholdDb>(
        "SELECT id, village_id, book_number, address, status, version, is_deleted, deleted_at, created_at, updated_at FROM qlhk.households WHERE id = $1 AND is_deleted = false FOR UPDATE",
    )
    .bind(id)
    .fetch_optional(&mut *tx)
    .await
    {
        Ok(Some(h)) => h,
        Ok(None) => {
            let _ = tx.rollback().await;
            return (
                StatusCode::NOT_FOUND,
                Json(json!({ "error": "Hộ khẩu nguồn không tồn tại hoặc đã bị xóa" })),
            )
                .into_response();
        }
        Err(_) => {
            let _ = tx.rollback().await;
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Lỗi truy vấn hộ khẩu nguồn" })),
            )
                .into_response();
        }
    };

    let target = match sqlx::query_as::<_, HouseholdDb>(
        "SELECT id, village_id, book_number, address, status, version, is_deleted, deleted_at, created_at, updated_at FROM qlhk.households WHERE id = $1 AND is_deleted = false FOR UPDATE",
    )
    .bind(req.target_household_id)
    .fetch_optional(&mut *tx)
    .await
    {
        Ok(Some(h)) => h,
        Ok(None) => {
            let _ = tx.rollback().await;
            return (
                StatusCode::NOT_FOUND,
                Json(json!({ "error": "Hộ khẩu đích không tồn tại hoặc đã bị xóa" })),
            )
                .into_response();
        }
        Err(_) => {
            let _ = tx.rollback().await;
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Lỗi truy vấn hộ khẩu đích" })),
            )
                .into_response();
        }
    };

    if let Some(c) = &claims {
        if c.role != "admin" {
            if let Some(user_vid) = c.village_id.as_deref().and_then(|v| Uuid::parse_str(v).ok()) {
                if source.village_id != user_vid || target.village_id != user_vid {
                    let _ = tx.rollback().await;
                    return (
                        StatusCode::FORBIDDEN,
                        Json(json!({ "error": "Không có quyền nhập hộ khẩu thuộc thôn khác" })),
                    )
                        .into_response();
                }
            }
        }
    }

    let move_res = sqlx::query(
        "UPDATE qlhk.citizens SET household_id = $1, is_head = false, relationship = 'Thành viên', version = version + 1, updated_at = NOW() WHERE household_id = $2 AND is_deleted = false",
    )
    .bind(req.target_household_id)
    .bind(id)
    .execute(&mut *tx)
    .await;

    if move_res.is_err() {
        let _ = tx.rollback().await;
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": "Lỗi chuyển nhân khẩu sang hộ đích" })),
        )
            .into_response();
    }

    let delete_source = sqlx::query(
        "UPDATE qlhk.households SET is_deleted = true, deleted_at = NOW(), version = version + 1, updated_at = NOW() WHERE id = $1",
    )
    .bind(id)
    .execute(&mut *tx)
    .await;

    if delete_source.is_err() {
        let _ = tx.rollback().await;
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": "Lỗi xóa mềm hộ khẩu nguồn" })),
        )
            .into_response();
    }

    let update_target = sqlx::query(
        "UPDATE qlhk.households SET version = version + 1, updated_at = NOW() WHERE id = $1",
    )
    .bind(req.target_household_id)
    .execute(&mut *tx)
    .await;

    if update_target.is_err() {
        let _ = tx.rollback().await;
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": "Lỗi cập nhật phiên bản hộ khẩu đích" })),
        )
            .into_response();
    }

    if tx.commit().await.is_err() {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": "Lỗi hoàn tất giao dịch nhập hộ khẩu" })),
        )
            .into_response();
    }

    let village = sqlx::query_as::<_, VillageInfo>(
        "SELECT id, name, code FROM qlhk.villages WHERE id = $1",
    )
    .bind(target.village_id)
    .fetch_optional(&state.pool)
    .await
    .unwrap_or_default();

    let target_citizens = sqlx::query_as::<_, CitizenDb>(
        "SELECT id, household_id, stt, is_head, relationship, full_name, name_unaccented, dob, gender, cccd, cccd_hash, cccd_last4, ethnicity, religion, education, military_status, occupation, native_place, notes, version, is_deleted, deleted_at, created_at, updated_at FROM qlhk.citizens WHERE household_id = $1 AND is_deleted = false ORDER BY is_head DESC, stt ASC NULLS LAST",
    )
    .bind(req.target_household_id)
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default()
    .into_iter()
    .map(format_citizen)
    .collect();

    let updated_target_hh = sqlx::query_as::<_, HouseholdDb>(
        "SELECT id, village_id, book_number, address, status, version, is_deleted, deleted_at, created_at, updated_at FROM qlhk.households WHERE id = $1",
    )
    .bind(req.target_household_id)
    .fetch_one(&state.pool)
    .await
    .unwrap_or(target);

    let response = HouseholdResponse {
        id: updated_target_hh.id,
        village_id: updated_target_hh.village_id,
        book_number: updated_target_hh.book_number,
        address: updated_target_hh.address,
        status: updated_target_hh.status,
        version: updated_target_hh.version,
        is_deleted: updated_target_hh.is_deleted,
        deleted_at: updated_target_hh.deleted_at,
        created_at: updated_target_hh.created_at,
        updated_at: updated_target_hh.updated_at,
        village,
        citizens: target_citizens,
    };

    let audit_pool = state.pool.clone();
    let audit_uid = claims.as_ref().and_then(|c| Uuid::parse_str(&c.id).ok());
    let audit_src_vid = source.village_id;
    let audit_old_src = serde_json::to_string(&source).ok();
    let audit_tgt_id = req.target_household_id;
    let audit_new_tgt = serde_json::to_string(&response).ok();
    let audit_tgt_vid = updated_target_hh.village_id;
    tokio::spawn(async move {
        let _ = crate::utils::audit::record_audit(
            &audit_pool,
            Some(audit_src_vid),
            audit_uid,
            "DELETE",
            "household",
            Some(&id.to_string()),
            audit_old_src.as_deref(),
            None,
            None,
        )
        .await;

        let _ = crate::utils::audit::record_audit(
            &audit_pool,
            Some(audit_tgt_vid),
            audit_uid,
            "UPDATE",
            "household",
            Some(&audit_tgt_id.to_string()),
            None,
            audit_new_tgt.as_deref(),
            None,
        )
        .await;
    });

    Json(json!({
        "message": "Nhập hộ khẩu thành công",
        "data": response
    }))
    .into_response()
}

pub async fn change_head(
    State(state): State<AppState>,
    claims_ext: Option<Extension<Claims>>,
    Path(id): Path<Uuid>,
    Json(req): Json<ChangeHeadRequest>,
) -> Response {
    let claims = claims_ext.map(|Extension(c)| c);

    let mut tx = match state.pool.begin().await {
        Ok(t) => t,
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Lỗi khởi tạo giao dịch cơ sở dữ liệu" })),
            )
                .into_response();
        }
    };

    let household = match sqlx::query_as::<_, HouseholdDb>(
        "SELECT id, village_id, book_number, address, status, version, is_deleted, deleted_at, created_at, updated_at FROM qlhk.households WHERE id = $1 AND is_deleted = false FOR UPDATE",
    )
    .bind(id)
    .fetch_optional(&mut *tx)
    .await
    {
        Ok(Some(h)) => h,
        Ok(None) => {
            let _ = tx.rollback().await;
            return (
                StatusCode::NOT_FOUND,
                Json(json!({ "error": "Không tìm thấy thông tin hộ khẩu" })),
            )
                .into_response();
        }
        Err(_) => {
            let _ = tx.rollback().await;
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Lỗi truy vấn hộ khẩu" })),
            )
                .into_response();
        }
    };

    if let Some(c) = &claims {
        if c.role != "admin" {
            if let Some(user_vid) = c.village_id.as_deref().and_then(|v| Uuid::parse_str(v).ok()) {
                if household.village_id != user_vid {
                    let _ = tx.rollback().await;
                    return (
                        StatusCode::FORBIDDEN,
                        Json(json!({ "error": "Không có quyền thay đổi chủ hộ của thôn khác" })),
                    )
                        .into_response();
                }
            }
        }
    }

    let citizen = match sqlx::query_as::<_, CitizenDb>(
        "SELECT id, household_id, stt, is_head, relationship, full_name, name_unaccented, dob, gender, cccd, cccd_hash, cccd_last4, ethnicity, religion, education, military_status, occupation, native_place, notes, version, is_deleted, deleted_at, created_at, updated_at FROM qlhk.citizens WHERE id = $1 AND household_id = $2 AND is_deleted = false FOR UPDATE",
    )
    .bind(req.new_head_id)
    .bind(id)
    .fetch_optional(&mut *tx)
    .await
    {
        Ok(Some(c)) => c,
        Ok(None) => {
            let _ = tx.rollback().await;
            return (
                StatusCode::NOT_FOUND,
                Json(json!({ "error": "Nhân khẩu không tồn tại trong hộ này" })),
            )
                .into_response();
        }
        Err(_) => {
            let _ = tx.rollback().await;
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Lỗi truy vấn nhân khẩu" })),
            )
                .into_response();
        }
    };

    let unset_old = sqlx::query(
        "UPDATE qlhk.citizens SET is_head = false, relationship = 'Thành viên', version = version + 1, updated_at = NOW() WHERE household_id = $1 AND is_head = true AND id != $2 AND is_deleted = false",
    )
    .bind(id)
    .bind(citizen.id)
    .execute(&mut *tx)
    .await;

    if unset_old.is_err() {
        let _ = tx.rollback().await;
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": "Lỗi cập nhật chủ hộ cũ" })),
        )
            .into_response();
    }

    let set_new = sqlx::query(
        "UPDATE qlhk.citizens SET is_head = true, relationship = 'Chủ hộ', version = version + 1, updated_at = NOW() WHERE id = $1",
    )
    .bind(citizen.id)
    .execute(&mut *tx)
    .await;

    if set_new.is_err() {
        let _ = tx.rollback().await;
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": "Lỗi cập nhật chủ hộ mới" })),
        )
            .into_response();
    }

    let update_hh = sqlx::query(
        "UPDATE qlhk.households SET version = version + 1, updated_at = NOW() WHERE id = $1",
    )
    .bind(id)
    .execute(&mut *tx)
    .await;

    if update_hh.is_err() {
        let _ = tx.rollback().await;
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": "Lỗi cập nhật phiên bản hộ khẩu" })),
        )
            .into_response();
    }

    if tx.commit().await.is_err() {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": "Lỗi hoàn tất giao dịch thay đổi chủ hộ" })),
        )
            .into_response();
    }

    let village = sqlx::query_as::<_, VillageInfo>(
        "SELECT id, name, code FROM qlhk.villages WHERE id = $1",
    )
    .bind(household.village_id)
    .fetch_optional(&state.pool)
    .await
    .unwrap_or_default();

    let citizens = sqlx::query_as::<_, CitizenDb>(
        "SELECT id, household_id, stt, is_head, relationship, full_name, name_unaccented, dob, gender, cccd, cccd_hash, cccd_last4, ethnicity, religion, education, military_status, occupation, native_place, notes, version, is_deleted, deleted_at, created_at, updated_at FROM qlhk.citizens WHERE household_id = $1 AND is_deleted = false ORDER BY is_head DESC, stt ASC NULLS LAST",
    )
    .bind(id)
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default()
    .into_iter()
    .map(format_citizen)
    .collect();

    let updated_household = sqlx::query_as::<_, HouseholdDb>(
        "SELECT id, village_id, book_number, address, status, version, is_deleted, deleted_at, created_at, updated_at FROM qlhk.households WHERE id = $1",
    )
    .bind(id)
    .fetch_one(&state.pool)
    .await
    .unwrap_or(household);

    let response = HouseholdResponse {
        id: updated_household.id,
        village_id: updated_household.village_id,
        book_number: updated_household.book_number,
        address: updated_household.address,
        status: updated_household.status,
        version: updated_household.version,
        is_deleted: updated_household.is_deleted,
        deleted_at: updated_household.deleted_at,
        created_at: updated_household.created_at,
        updated_at: updated_household.updated_at,
        village,
        citizens,
    };

    let audit_pool = state.pool.clone();
    let audit_vid = updated_household.village_id;
    let audit_uid = claims.as_ref().and_then(|c| Uuid::parse_str(&c.id).ok());
    let audit_new = serde_json::to_string(&response).ok();
    tokio::spawn(async move {
        let _ = crate::utils::audit::record_audit(
            &audit_pool,
            Some(audit_vid),
            audit_uid,
            "UPDATE",
            "household",
            Some(&id.to_string()),
            None,
            audit_new.as_deref(),
            None,
        )
        .await;
    });

    Json(json!({
        "message": "Thay đổi chủ hộ thành công",
        "data": response
    }))
    .into_response()
}
