use axum::{
    extract::{Extension, Path, Query, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::get,
    Json, Router,
};
use serde_json::json;
use sqlx::{FromRow, QueryBuilder};
use uuid::Uuid;

use crate::{
    crypto::{decrypt_cccd, encrypt_cccd, hash_cccd, remove_accents},
    middlewares::auth::Claims,
    models::{
        citizen::{
            format_citizen, CitizenDb, CitizenFilter, CitizenHouseholdInfo, CitizenResponse,
            CreateCitizenInput, UpdateCitizenInput,
        },
        household::{PaginatedResponse, PaginationMeta},
    },
    state::AppState,
};

#[derive(FromRow)]
struct CitizenWithHouseholdRow {
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
    pub deleted_at: Option<chrono::DateTime<chrono::Utc>>,
    pub created_at: Option<chrono::DateTime<chrono::Utc>>,
    pub updated_at: Option<chrono::DateTime<chrono::Utc>>,
    pub book_number: String,
    pub address: Option<String>,
    pub village_id: Uuid,
    pub village_name: Option<String>,
}

fn row_to_response(row: CitizenWithHouseholdRow) -> CitizenResponse {
    let decrypted = row.cccd.as_deref().and_then(|enc| {
        if enc.contains(':') {
            decrypt_cccd(enc).ok()
        } else {
            None
        }
    });

    let db = CitizenDb {
        id: row.id,
        household_id: row.household_id,
        stt: row.stt,
        is_head: row.is_head,
        relationship: row.relationship,
        full_name: row.full_name,
        name_unaccented: row.name_unaccented,
        dob: row.dob,
        gender: row.gender,
        cccd: row.cccd,
        cccd_hash: row.cccd_hash,
        cccd_last4: row.cccd_last4,
        ethnicity: row.ethnicity,
        religion: row.religion,
        education: row.education,
        military_status: row.military_status,
        occupation: row.occupation,
        native_place: row.native_place,
        notes: row.notes,
        version: row.version,
        is_deleted: row.is_deleted,
        deleted_at: row.deleted_at,
        created_at: row.created_at,
        updated_at: row.updated_at,
    };

    let mut resp = CitizenResponse::from_db(db, decrypted);
    resp.household = Some(CitizenHouseholdInfo {
        id: row.household_id,
        book_number: row.book_number,
        address: row.address,
        village_id: row.village_id,
        village_name: row.village_name,
    });
    resp
}

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(get_citizens).post(create_citizen))
        .route(
            "/{id}",
            get(get_citizen_by_id)
                .put(update_citizen)
                .patch(update_citizen)
                .delete(delete_citizen),
        )
        .route(
            "/{id}/reveal-cccd",
            get(reveal_cccd).post(reveal_cccd),
        )
}

pub async fn get_citizens(
    State(state): State<AppState>,
    claims_ext: Option<Extension<Claims>>,
    Query(filter): Query<CitizenFilter>,
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

    let mut count_builder = QueryBuilder::new(
        "SELECT COUNT(*) FROM qlhk.citizens c JOIN qlhk.households h ON c.household_id = h.id WHERE 1=1",
    );
    let mut select_builder = QueryBuilder::new(
        "SELECT c.id, c.household_id, c.stt, c.is_head, c.relationship, c.full_name, c.name_unaccented, c.dob, c.gender, c.cccd, c.cccd_hash, c.cccd_last4, c.ethnicity, c.religion, c.education, c.military_status, c.occupation, c.native_place, c.notes, c.version, c.is_deleted, c.deleted_at, c.created_at, c.updated_at, h.book_number, h.address, h.village_id, v.name as village_name FROM qlhk.citizens c JOIN qlhk.households h ON c.household_id = h.id LEFT JOIN qlhk.villages v ON h.village_id = v.id WHERE 1=1",
    );

    if !include_deleted {
        count_builder.push(" AND c.is_deleted = false AND h.is_deleted = false");
        select_builder.push(" AND c.is_deleted = false AND h.is_deleted = false");
    }

    if let Some(hh_id) = filter.household_id.or(filter.household_id_camel) {
        count_builder.push(" AND c.household_id = ");
        count_builder.push_bind(hh_id);
        select_builder.push(" AND c.household_id = ");
        select_builder.push_bind(hh_id);
    }

    if let Some(vid) = target_village_id {
        count_builder.push(" AND h.village_id = ");
        count_builder.push_bind(vid);
        select_builder.push(" AND h.village_id = ");
        select_builder.push_bind(vid);
    }

    if let Some(gender) = &filter.gender {
        let trimmed = gender.trim();
        if !trimmed.is_empty() {
            count_builder.push(" AND c.gender = ");
            count_builder.push_bind(trimmed.to_string());
            select_builder.push(" AND c.gender = ");
            select_builder.push_bind(trimmed.to_string());
        }
    }

    if let Some(ethnicity) = &filter.ethnicity {
        let trimmed = ethnicity.trim();
        if !trimmed.is_empty() && trimmed != "all" && trimmed != "Tất cả" {
            if trimmed.to_lowercase() == "dtts" {
                count_builder.push(" AND c.ethnicity != 'Kinh'");
                select_builder.push(" AND c.ethnicity != 'Kinh'");
            } else {
                count_builder.push(" AND c.ethnicity = ");
                count_builder.push_bind(trimmed.to_string());
                select_builder.push(" AND c.ethnicity = ");
                select_builder.push_bind(trimmed.to_string());
            }
        }
    }

    if let Some(religion) = &filter.religion {
        let trimmed = religion.trim();
        if !trimmed.is_empty() {
            count_builder.push(" AND c.religion = ");
            count_builder.push_bind(trimmed.to_string());
            select_builder.push(" AND c.religion = ");
            select_builder.push_bind(trimmed.to_string());
        }
    }

    if let Some(is_head) = filter.is_head.or(filter.is_head_camel) {
        count_builder.push(" AND c.is_head = ");
        count_builder.push_bind(is_head);
        select_builder.push(" AND c.is_head = ");
        select_builder.push_bind(is_head);
    }

    if let Some(cccd_query) = &filter.cccd {
        let trimmed = cccd_query.trim();
        if !trimmed.is_empty() {
            let hash = hash_cccd(trimmed);
            count_builder.push(" AND c.cccd_hash = ");
            count_builder.push_bind(hash.clone());
            select_builder.push(" AND c.cccd_hash = ");
            select_builder.push_bind(hash);
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

            count_builder.push(" AND (c.full_name ILIKE ");
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

            count_builder.push(")");

            select_builder.push(" AND (c.full_name ILIKE ");
            select_builder.push_bind(like_q);
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

            select_builder.push(")");
        }
    }

    let total: i64 = match count_builder.build_query_scalar::<i64>().fetch_one(&state.pool).await {
        Ok(t) => t,
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Lỗi máy chủ khi đếm nhân khẩu" })),
            )
                .into_response();
        }
    };

    select_builder.push(" ORDER BY c.created_at DESC LIMIT ");
    select_builder.push_bind(limit);
    select_builder.push(" OFFSET ");
    select_builder.push_bind(offset);

    let rows: Vec<CitizenWithHouseholdRow> = match select_builder.build_query_as::<CitizenWithHouseholdRow>().fetch_all(&state.pool).await {
        Ok(r) => r,
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Lỗi máy chủ khi lấy danh sách nhân khẩu" })),
            )
                .into_response();
        }
    };

    let data: Vec<CitizenResponse> = rows.into_iter().map(row_to_response).collect();
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

pub async fn get_citizen_by_id(
    State(state): State<AppState>,
    claims_ext: Option<Extension<Claims>>,
    Path(id): Path<Uuid>,
) -> Response {
    let claims = claims_ext.map(|Extension(c)| c);

    let row = match sqlx::query_as::<_, CitizenWithHouseholdRow>(
        "SELECT c.id, c.household_id, c.stt, c.is_head, c.relationship, c.full_name, c.name_unaccented, c.dob, c.gender, c.cccd, c.cccd_hash, c.cccd_last4, c.ethnicity, c.religion, c.education, c.military_status, c.occupation, c.native_place, c.notes, c.version, c.is_deleted, c.deleted_at, c.created_at, c.updated_at, h.book_number, h.address, h.village_id, v.name as village_name FROM qlhk.citizens c JOIN qlhk.households h ON c.household_id = h.id LEFT JOIN qlhk.villages v ON h.village_id = v.id WHERE c.id = $1",
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(Some(r)) => r,
        Ok(None) => {
            return (
                StatusCode::NOT_FOUND,
                Json(json!({ "error": "Không tìm thấy thông tin nhân khẩu" })),
            )
                .into_response();
        }
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Lỗi máy chủ khi tìm kiếm nhân khẩu" })),
            )
                .into_response();
        }
    };

    if row.is_deleted {
        return (
            StatusCode::NOT_FOUND,
            Json(json!({ "error": "Không tìm thấy thông tin nhân khẩu" })),
        )
            .into_response();
    }

    if let Some(c) = &claims {
        if c.role != "admin" {
            if let Some(user_vid) = c.village_id.as_deref().and_then(|v| Uuid::parse_str(v).ok()) {
                if row.village_id != user_vid {
                    return (
                        StatusCode::FORBIDDEN,
                        Json(json!({ "error": "Không có quyền truy cập nhân khẩu của thôn khác" })),
                    )
                        .into_response();
                }
            }
        }
    }

    let resp = row_to_response(row);
    Json(json!({ "data": resp })).into_response()
}

pub async fn reveal_cccd(
    State(state): State<AppState>,
    claims_ext: Option<Extension<Claims>>,
    Path(id): Path<Uuid>,
) -> Response {
    let claims = claims_ext.map(|Extension(c)| c);

    let row = match sqlx::query_as::<_, CitizenWithHouseholdRow>(
        "SELECT c.id, c.household_id, c.stt, c.is_head, c.relationship, c.full_name, c.name_unaccented, c.dob, c.gender, c.cccd, c.cccd_hash, c.cccd_last4, c.ethnicity, c.religion, c.education, c.military_status, c.occupation, c.native_place, c.notes, c.version, c.is_deleted, c.deleted_at, c.created_at, c.updated_at, h.book_number, h.address, h.village_id, v.name as village_name FROM qlhk.citizens c JOIN qlhk.households h ON c.household_id = h.id LEFT JOIN qlhk.villages v ON h.village_id = v.id WHERE c.id = $1 AND c.is_deleted = false",
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(Some(r)) => r,
        Ok(None) => {
            return (
                StatusCode::NOT_FOUND,
                Json(json!({ "error": "Không tìm thấy nhân khẩu" })),
            )
                .into_response();
        }
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Lỗi máy chủ khi truy vấn nhân khẩu" })),
            )
                .into_response();
        }
    };

    if let Some(c) = &claims {
        if c.role != "admin" {
            if let Some(user_vid) = c.village_id.as_deref().and_then(|v| Uuid::parse_str(v).ok()) {
                if row.village_id != user_vid {
                    return (
                        StatusCode::FORBIDDEN,
                        Json(json!({ "error": "Không có quyền giải mã CCCD của thôn khác" })),
                    )
                        .into_response();
                }
            }
        }
    }

    let plain = match row.cccd.as_deref() {
        Some(enc) if enc.contains(':') => decrypt_cccd(enc).ok(),
        Some(plain) if !plain.is_empty() => Some(plain.to_string()),
        _ => None,
    };

    Json(json!({ "cccd": plain })).into_response()
}

pub async fn create_citizen(
    State(state): State<AppState>,
    claims_ext: Option<Extension<Claims>>,
    Json(req): Json<CreateCitizenInput>,
) -> Response {
    let claims = claims_ext.map(|Extension(c)| c);

    let household_id = match req.household_id {
        Some(hid) => hid,
        None => {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({ "error": "Vui lòng cung cấp mã hộ gia đình (household_id)" })),
            )
                .into_response();
        }
    };

    let clean_name = req.full_name.trim().to_string();
    if clean_name.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": "Vui lòng cung cấp họ và tên nhân khẩu" })),
        )
            .into_response();
    }

    let household = match sqlx::query_as::<_, crate::models::household::HouseholdDb>(
        "SELECT id, village_id, book_number, address, status, version, is_deleted, deleted_at, created_at, updated_at FROM qlhk.households WHERE id = $1 AND is_deleted = false",
    )
    .bind(household_id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(Some(h)) => h,
        Ok(None) => {
            return (
                StatusCode::NOT_FOUND,
                Json(json!({ "error": "Hộ gia đình không tồn tại hoặc đã bị xóa" })),
            )
                .into_response();
        }
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Lỗi máy chủ khi kiểm tra hộ gia đình" })),
            )
                .into_response();
        }
    };

    if let Some(c) = &claims {
        if c.role != "admin" {
            if let Some(user_vid) = c.village_id.as_deref().and_then(|v| Uuid::parse_str(v).ok()) {
                if household.village_id != user_vid {
                    return (
                        StatusCode::FORBIDDEN,
                        Json(json!({ "error": "Không có quyền thêm nhân khẩu vào hộ của thôn khác" })),
                    )
                        .into_response();
                }
            }
        }
    }

    let raw_cccd = req.cccd.as_deref().unwrap_or("").trim();
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

    let is_head = req.is_head.unwrap_or(false);
    let relationship = req.relationship.unwrap_or_else(|| {
        if is_head {
            "Chủ hộ".to_string()
        } else {
            "Thành viên".to_string()
        }
    });
    let name_unacc = remove_accents(&clean_name);
    let citizen_id = req.id.unwrap_or_else(Uuid::new_v4);

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

    if is_head {
        let _ = sqlx::query(
            "UPDATE qlhk.citizens SET is_head = false, version = version + 1, updated_at = NOW() WHERE household_id = $1 AND is_head = true AND is_deleted = false",
        )
        .bind(household_id)
        .execute(&mut *tx)
        .await;
    }

    let inserted = sqlx::query_as::<_, CitizenDb>(
        "INSERT INTO qlhk.citizens (id, household_id, stt, is_head, relationship, full_name, name_unaccented, dob, gender, cccd, cccd_hash, cccd_last4, ethnicity, religion, education, military_status, occupation, native_place, notes, version, is_deleted, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, 1, false, NOW(), NOW()) RETURNING id, household_id, stt, is_head, relationship, full_name, name_unaccented, dob, gender, cccd, cccd_hash, cccd_last4, ethnicity, religion, education, military_status, occupation, native_place, notes, version, is_deleted, deleted_at, created_at, updated_at",
    )
    .bind(citizen_id)
    .bind(household_id)
    .bind(req.stt)
    .bind(is_head)
    .bind(relationship)
    .bind(clean_name)
    .bind(name_unacc)
    .bind(req.dob.as_deref())
    .bind(req.gender.as_deref())
    .bind(cccd_cipher)
    .bind(cccd_hash_val)
    .bind(cccd_last4_val)
    .bind(req.ethnicity.as_deref())
    .bind(req.religion.as_deref())
    .bind(req.education.as_deref())
    .bind(req.military_status.as_deref())
    .bind(req.occupation.as_deref())
    .bind(req.native_place.as_deref())
    .bind(req.notes.as_deref())
    .fetch_one(&mut *tx)
    .await;

    let created_db = match inserted {
        Ok(c) => c,
        Err(_) => {
            let _ = tx.rollback().await;
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Lỗi thêm nhân khẩu vào cơ sở dữ liệu" })),
            )
                .into_response();
        }
    };

    if tx.commit().await.is_err() {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": "Lỗi hoàn tất giao dịch thêm nhân khẩu" })),
        )
            .into_response();
    }

    let sync_pool = state.pool.clone();
    tokio::spawn(async move {
        let _ = crate::handlers::policies::sync_single_citizen_to_policies(&sync_pool, citizen_id).await;
    });

    let resp = format_citizen(created_db);
    (
        StatusCode::CREATED,
        Json(json!({
            "message": "Thêm nhân khẩu thành công",
            "data": resp
        })),
    )
        .into_response()
}

pub async fn update_citizen(
    State(state): State<AppState>,
    claims_ext: Option<Extension<Claims>>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateCitizenInput>,
) -> Response {
    let claims = claims_ext.map(|Extension(c)| c);

    let current = match sqlx::query_as::<_, CitizenWithHouseholdRow>(
        "SELECT c.id, c.household_id, c.stt, c.is_head, c.relationship, c.full_name, c.name_unaccented, c.dob, c.gender, c.cccd, c.cccd_hash, c.cccd_last4, c.ethnicity, c.religion, c.education, c.military_status, c.occupation, c.native_place, c.notes, c.version, c.is_deleted, c.deleted_at, c.created_at, c.updated_at, h.book_number, h.address, h.village_id, v.name as village_name FROM qlhk.citizens c JOIN qlhk.households h ON c.household_id = h.id LEFT JOIN qlhk.villages v ON h.village_id = v.id WHERE c.id = $1 AND c.is_deleted = false",
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(Some(r)) => r,
        Ok(None) => {
            return (
                StatusCode::NOT_FOUND,
                Json(json!({ "error": "Không tìm thấy nhân khẩu" })),
            )
                .into_response();
        }
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Lỗi máy chủ khi truy vấn nhân khẩu" })),
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
                        Json(json!({ "error": "Không có quyền cập nhật nhân khẩu thuộc thôn khác" })),
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
                "error": "Dữ liệu nhân khẩu đã bị thay đổi bởi người dùng khác. Vui lòng tải lại trang.",
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

    if req.is_head == Some(true) {
        let _ = sqlx::query(
            "UPDATE qlhk.citizens SET is_head = false, version = version + 1, updated_at = NOW() WHERE household_id = $1 AND is_head = true AND id != $2 AND is_deleted = false",
        )
        .bind(current.household_id)
        .bind(id)
        .execute(&mut *tx)
        .await;
    }

    let clean_name = req.full_name.as_deref().unwrap_or(&current.full_name).trim().to_string();
    let name_unacc = remove_accents(&clean_name);

    let (final_cccd, final_hash, final_last4) = match req.cccd.as_deref() {
        Some(raw) => {
            let trimmed = raw.trim();
            let is_invalid = trimmed.to_lowercase().contains("chưa có") || trimmed.contains('—') || trimmed == "-";
            let is_masked = !is_invalid && (trimmed.contains('•') || trimmed.contains('*'));
            if !is_invalid && !is_masked && trimmed.chars().all(|c| c.is_ascii_digit()) && (trimmed.len() == 9 || trimmed.len() == 12) {
                match encrypt_cccd(trimmed) {
                    Ok(enc) => (Some(enc.encrypted), Some(enc.hash), Some(enc.last4)),
                    Err(_) => (None, None, None),
                }
            } else if is_masked {
                (current.cccd.clone(), current.cccd_hash.clone(), current.cccd_last4.clone())
            } else {
                (None, None, None)
            }
        }
        None => (current.cccd.clone(), current.cccd_hash.clone(), current.cccd_last4.clone()),
    };

    let is_head = req.is_head.unwrap_or(current.is_head);
    let relationship = req.relationship.as_deref().unwrap_or_else(|| {
        current.relationship.as_deref().unwrap_or(if is_head { "Chủ hộ" } else { "Thành viên" })
    });

    let update_res = sqlx::query_as::<_, CitizenDb>(
        "UPDATE qlhk.citizens SET full_name = $1, name_unaccented = $2, dob = $3, gender = $4, is_head = $5, relationship = $6, ethnicity = $7, religion = $8, education = $9, military_status = $10, occupation = $11, native_place = $12, notes = $13, stt = $14, cccd = $15, cccd_hash = $16, cccd_last4 = $17, version = version + 1, updated_at = NOW() WHERE id = $18 AND version = $19 AND is_deleted = false RETURNING id, household_id, stt, is_head, relationship, full_name, name_unaccented, dob, gender, cccd, cccd_hash, cccd_last4, ethnicity, religion, education, military_status, occupation, native_place, notes, version, is_deleted, deleted_at, created_at, updated_at",
    )
    .bind(clean_name)
    .bind(name_unacc)
    .bind(req.dob.as_deref().or(current.dob.as_deref()))
    .bind(req.gender.as_deref().or(current.gender.as_deref()))
    .bind(is_head)
    .bind(relationship)
    .bind(req.ethnicity.as_deref().or(current.ethnicity.as_deref()))
    .bind(req.religion.as_deref().or(current.religion.as_deref()))
    .bind(req.education.as_deref().or(current.education.as_deref()))
    .bind(req.military_status.as_deref().or(current.military_status.as_deref()))
    .bind(req.occupation.as_deref().or(current.occupation.as_deref()))
    .bind(req.native_place.as_deref().or(current.native_place.as_deref()))
    .bind(req.notes.as_deref().or(current.notes.as_deref()))
    .bind(req.stt.or(current.stt))
    .bind(final_cccd)
    .bind(final_hash)
    .bind(final_last4)
    .bind(id)
    .bind(expected_version)
    .fetch_optional(&mut *tx)
    .await;

    let updated_db = match update_res {
        Ok(Some(c)) => c,
        Ok(None) => {
            let _ = tx.rollback().await;
            let latest_version = sqlx::query_scalar::<_, i32>(
                "SELECT version FROM qlhk.citizens WHERE id = $1",
            )
            .bind(id)
            .fetch_one(&state.pool)
            .await
            .unwrap_or(current.version);

            return (
                StatusCode::CONFLICT,
                Json(json!({
                    "error": "Dữ liệu nhân khẩu đã bị thay đổi bởi người dùng khác. Vui lòng tải lại trang.",
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
                Json(json!({ "error": "Lỗi máy chủ khi cập nhật nhân khẩu" })),
            )
                .into_response();
        }
    };

    if tx.commit().await.is_err() {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": "Lỗi hoàn tất giao dịch cập nhật nhân khẩu" })),
        )
            .into_response();
    }

    let sync_pool = state.pool.clone();
    tokio::spawn(async move {
        let _ = crate::handlers::policies::sync_single_citizen_to_policies(&sync_pool, id).await;
    });

    let resp = format_citizen(updated_db);
    Json(json!({
        "message": "Cập nhật nhân khẩu thành công",
        "data": resp
    }))
    .into_response()
}

pub async fn delete_citizen(
    State(state): State<AppState>,
    claims_ext: Option<Extension<Claims>>,
    Path(id): Path<Uuid>,
) -> Response {
    let claims = claims_ext.map(|Extension(c)| c);

    let current = match sqlx::query_as::<_, CitizenWithHouseholdRow>(
        "SELECT c.id, c.household_id, c.stt, c.is_head, c.relationship, c.full_name, c.name_unaccented, c.dob, c.gender, c.cccd, c.cccd_hash, c.cccd_last4, c.ethnicity, c.religion, c.education, c.military_status, c.occupation, c.native_place, c.notes, c.version, c.is_deleted, c.deleted_at, c.created_at, c.updated_at, h.book_number, h.address, h.village_id, v.name as village_name FROM qlhk.citizens c JOIN qlhk.households h ON c.household_id = h.id LEFT JOIN qlhk.villages v ON h.village_id = v.id WHERE c.id = $1 AND c.is_deleted = false",
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await
    {
        Ok(Some(r)) => r,
        Ok(None) => {
            return (
                StatusCode::NOT_FOUND,
                Json(json!({ "error": "Không tìm thấy nhân khẩu" })),
            )
                .into_response();
        }
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Lỗi máy chủ khi tìm kiếm nhân khẩu" })),
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
                        Json(json!({ "error": "Không có quyền xóa nhân khẩu thuộc thôn khác" })),
                    )
                        .into_response();
                }
            }
        }
    }

    let delete_res = sqlx::query(
        "UPDATE qlhk.citizens SET is_deleted = true, deleted_at = NOW(), version = version + 1, updated_at = NOW() WHERE id = $1 AND is_deleted = false",
    )
    .bind(id)
    .execute(&state.pool)
    .await;

    if delete_res.is_err() {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": "Lỗi máy chủ khi xóa nhân khẩu" })),
        )
            .into_response();
    }

    let sync_pool = state.pool.clone();
    tokio::spawn(async move {
        let _ = crate::handlers::policies::sync_single_citizen_to_policies(&sync_pool, id).await;
    });

    Json(json!({ "message": "Xóa mềm nhân khẩu thành công" })).into_response()
}
