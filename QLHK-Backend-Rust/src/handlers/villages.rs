use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::{get, put},
    Json, Router,
};
use chrono::Utc;
use serde_json::json;
use uuid::Uuid;

use crate::{
    models::village::{
        CreateVillageRequest, UpdateVillageRequest, VillageDb, VillageWithHouseholdCount,
    },
    state::AppState,
};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(get_villages).post(create_village))
        .route("/{id}", put(update_village).delete(delete_village))
}

pub async fn get_villages(
    State(state): State<AppState>,
) -> Response {
    let rows = sqlx::query_as::<_, VillageWithHouseholdCount>(
        r#"
        SELECT 
            v.id, 
            v.name, 
            v.code, 
            COALESCE(COUNT(h.id) FILTER (WHERE h.is_deleted = false), 0)::int8 AS household_count
        FROM qlhk.villages v
        LEFT JOIN qlhk.households h ON h.village_id = v.id
        GROUP BY v.id, v.name, v.code
        ORDER BY v.name ASC
        "#,
    )
    .fetch_all(&state.pool)
    .await;

    match rows {
        Ok(data) => (
            StatusCode::OK,
            Json(json!({
                "success": true,
                "data": data,
            })),
        )
            .into_response(),
        Err(e) => {
            eprintln!("get_villages error: {:?}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "error": "Lỗi máy chủ khi lấy danh sách thôn"
                })),
            )
                .into_response()
        }
    }
}

pub async fn create_village(
    State(state): State<AppState>,
    Json(payload): Json<CreateVillageRequest>,
) -> Response {
    let trimmed_name = payload.name.trim();
    if trimmed_name.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({ "error": "Tên thôn không được để trống" })),
        )
            .into_response();
    }

    let final_code = match payload.code {
        Some(ref c) if !c.trim().is_empty() => c.trim().to_string(),
        _ => format!("THON_{}", Utc::now().timestamp_millis()),
    };

    let existing_name: Result<Option<(Uuid,)>, _> = sqlx::query_as(
        "SELECT id FROM qlhk.villages WHERE name = $1 LIMIT 1",
    )
    .bind(trimmed_name)
    .fetch_optional(&state.pool)
    .await;

    if let Ok(Some(_)) = existing_name {
        return (
            StatusCode::CONFLICT,
            Json(json!({ "error": "Tên thôn đã tồn tại" })),
        )
            .into_response();
    }

    let existing_code: Result<Option<(Uuid,)>, _> = sqlx::query_as(
        "SELECT id FROM qlhk.villages WHERE code = $1 LIMIT 1",
    )
    .bind(&final_code)
    .fetch_optional(&state.pool)
    .await;

    if let Ok(Some(_)) = existing_code {
        return (
            StatusCode::CONFLICT,
            Json(json!({ "error": "Mã thôn đã tồn tại" })),
        )
            .into_response();
    }

    let insert_result = sqlx::query_as::<_, VillageDb>(
        r#"
        INSERT INTO qlhk.villages (name, code, created_at, updated_at)
        VALUES ($1, $2, NOW(), NOW())
        RETURNING id, name, code, created_at, updated_at
        "#,
    )
    .bind(trimmed_name)
    .bind(&final_code)
    .fetch_one(&state.pool)
    .await;

    match insert_result {
        Ok(village) => (
            StatusCode::CREATED,
            Json(json!({
                "success": true,
                "data": village,
                "message": "Tạo thôn mới thành công"
            })),
        )
            .into_response(),
        Err(e) => {
            eprintln!("create_village error: {:?}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Lỗi máy chủ khi tạo thôn" })),
            )
                .into_response()
        }
    }
}

pub async fn update_village(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateVillageRequest>,
) -> Response {
    let current_res: Result<Option<VillageDb>, _> = sqlx::query_as(
        "SELECT id, name, code, created_at, updated_at FROM qlhk.villages WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await;

    let current = match current_res {
        Ok(Some(v)) => v,
        Ok(None) => {
            return (
                StatusCode::NOT_FOUND,
                Json(json!({ "error": "Không tìm thấy thôn" })),
            )
                .into_response();
        }
        Err(e) => {
            eprintln!("update_village fetch error: {:?}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Lỗi máy chủ khi kiểm tra thôn" })),
            )
                .into_response();
        }
    };

    let trimmed_name = match payload.name {
        Some(ref n) => {
            let t = n.trim();
            if t.is_empty() {
                return (
                    StatusCode::BAD_REQUEST,
                    Json(json!({ "error": "Tên thôn không được để trống" })),
                )
                    .into_response();
            }
            if t != current.name {
                let dup_name: Result<Option<(Uuid,)>, _> = sqlx::query_as(
                    "SELECT id FROM qlhk.villages WHERE name = $1 AND id != $2 LIMIT 1",
                )
                .bind(t)
                .bind(id)
                .fetch_optional(&state.pool)
                .await;

                if let Ok(Some(_)) = dup_name {
                    return (
                        StatusCode::CONFLICT,
                        Json(json!({ "error": "Tên thôn đã tồn tại" })),
                    )
                        .into_response();
                }
            }
            Some(t.to_string())
        }
        None => None,
    };

    let trimmed_code = match payload.code {
        Some(ref c) => {
            let t = c.trim();
            if t.is_empty() {
                return (
                    StatusCode::BAD_REQUEST,
                    Json(json!({ "error": "Mã thôn không được để trống" })),
                )
                    .into_response();
            }
            if current.code.as_deref() != Some(t) {
                let dup_code: Result<Option<(Uuid,)>, _> = sqlx::query_as(
                    "SELECT id FROM qlhk.villages WHERE code = $1 AND id != $2 LIMIT 1",
                )
                .bind(t)
                .bind(id)
                .fetch_optional(&state.pool)
                .await;

                if let Ok(Some(_)) = dup_code {
                    return (
                        StatusCode::CONFLICT,
                        Json(json!({ "error": "Mã thôn đã tồn tại" })),
                    )
                        .into_response();
                }
            }
            Some(t.to_string())
        }
        None => None,
    };

    let update_res = sqlx::query_as::<_, VillageDb>(
        r#"
        UPDATE qlhk.villages
        SET name = COALESCE($1, name),
            code = COALESCE($2, code),
            updated_at = NOW()
        WHERE id = $3
        RETURNING id, name, code, created_at, updated_at
        "#,
    )
    .bind(trimmed_name)
    .bind(trimmed_code)
    .bind(id)
    .fetch_one(&state.pool)
    .await;

    match update_res {
        Ok(updated) => (
            StatusCode::OK,
            Json(json!({
                "success": true,
                "data": updated,
                "message": "Cập nhật thôn thành công"
            })),
        )
            .into_response(),
        Err(e) => {
            eprintln!("update_village error: {:?}", e);
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Lỗi máy chủ khi cập nhật thôn" })),
            )
                .into_response()
        }
    }
}

pub async fn delete_village(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Response {
    let current_res: Result<Option<VillageDb>, _> = sqlx::query_as(
        "SELECT id, name, code, created_at, updated_at FROM qlhk.villages WHERE id = $1",
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await;

    let current = match current_res {
        Ok(Some(v)) => v,
        Ok(None) => {
            return (
                StatusCode::NOT_FOUND,
                Json(json!({ "error": "Không tìm thấy thôn" })),
            )
                .into_response();
        }
        Err(e) => {
            eprintln!("delete_village fetch error: {:?}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Lỗi máy chủ khi tìm thôn" })),
            )
                .into_response();
        }
    };

    let active_households: Result<i64, _> = sqlx::query_scalar(
        "SELECT COUNT(*) FROM qlhk.households WHERE village_id = $1 AND is_deleted = false",
    )
    .bind(current.id)
    .fetch_one(&state.pool)
    .await;

    match active_households {
        Ok(count) if count > 0 => {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({ "error": "Không thể xóa thôn đang có hộ khẩu hoạt động" })),
            )
                .into_response();
        }
        Err(e) => {
            eprintln!("check active households error: {:?}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Lỗi máy chủ khi kiểm tra hộ khẩu thôn" })),
            )
                .into_response();
        }
        _ => {}
    }

    let mut tx = match state.pool.begin().await {
        Ok(t) => t,
        Err(e) => {
            eprintln!("delete_village tx begin error: {:?}", e);
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Lỗi máy chủ khi bắt đầu giao dịch" })),
            )
                .into_response();
        }
    };

    let _ = sqlx::query("UPDATE qlhk.users SET village_id = NULL WHERE village_id = $1")
        .bind(current.id)
        .execute(&mut *tx)
        .await;

    let _ = sqlx::query("UPDATE qlhk.audit_logs SET village_id = NULL WHERE village_id = $1")
        .bind(current.id)
        .execute(&mut *tx)
        .await;

    let _ = sqlx::query("DELETE FROM qlhk.citizens WHERE household_id IN (SELECT id FROM qlhk.households WHERE village_id = $1)")
        .bind(current.id)
        .execute(&mut *tx)
        .await;

    let _ = sqlx::query("DELETE FROM qlhk.households WHERE village_id = $1")
        .bind(current.id)
        .execute(&mut *tx)
        .await;

    let del_res = sqlx::query("DELETE FROM qlhk.villages WHERE id = $1")
        .bind(current.id)
        .execute(&mut *tx)
        .await;

    if let Err(e) = del_res {
        eprintln!("delete village execute error: {:?}", e);
        let _ = tx.rollback().await;
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": "Lỗi máy chủ khi xóa thôn" })),
        )
            .into_response();
    }

    if let Err(e) = tx.commit().await {
        eprintln!("delete village tx commit error: {:?}", e);
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "error": "Lỗi máy chủ khi xác nhận xóa thôn" })),
        )
            .into_response();
    }

    (
        StatusCode::OK,
        Json(json!({
            "success": true,
            "message": "Xóa thôn thành công"
        })),
    )
        .into_response()
}
