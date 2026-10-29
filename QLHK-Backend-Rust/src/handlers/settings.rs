use axum::{
    extract::{Extension, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use chrono::{Datelike, Utc};
use serde_json::json;
use uuid::Uuid;

use crate::{
    middlewares::auth::Claims,
    models::settings::{
        SettingItemDto, SettingRow, SettingsListResponse, UpdateSettingItem,
        UpdateSettingsPayload,
    },
    state::AppState,
};

async fn get_settings(State(state): State<AppState>) -> Response {
    let rows_result = sqlx::query_as::<_, SettingRow>(
        "SELECT id, key, value, description, created_at, updated_at FROM qlhk.settings ORDER BY key ASC",
    )
    .fetch_all(&state.pool)
    .await;

    match rows_result {
        Ok(rows) => {
            let data: Vec<SettingItemDto> = rows
                .into_iter()
                .map(|r| SettingItemDto {
                    key: r.key,
                    value: r.value,
                    description: r.description,
                })
                .collect();

            Json(SettingsListResponse {
                success: true,
                data,
            })
            .into_response()
        }
        Err(err) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({
                "success": false,
                "error": err.to_string(),
            })),
        )
            .into_response(),
    }
}

async fn update_settings(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<UpdateSettingsPayload>,
) -> Response {
    if claims.role != "admin" {
        return (
            StatusCode::FORBIDDEN,
            Json(json!({
                "success": false,
                "error": "Chỉ Quản trị viên mới có quyền cập nhật cấu hình hệ thống"
            })),
        )
            .into_response();
    }

    let mut items_to_upsert: Vec<UpdateSettingItem> = Vec::new();

    match payload {
        UpdateSettingsPayload::Single(item) => {
            items_to_upsert.push(item);
        }
        UpdateSettingsPayload::Batch(items) => {
            items_to_upsert.extend(items);
        }
        UpdateSettingsPayload::Map(map) => {
            for (k, v) in map {
                let val_str = if let Some(s) = v.as_str() {
                    s.to_string()
                } else {
                    v.to_string()
                };
                items_to_upsert.push(UpdateSettingItem {
                    key: k,
                    value: val_str,
                    description: None,
                });
            }
        }
    }

    let mut tx = match state.pool.begin().await {
        Ok(tx) => tx,
        Err(err) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "success": false,
                    "error": err.to_string(),
                })),
            )
                .into_response();
        }
    };

    for item in items_to_upsert {
        let q = sqlx::query(
            r#"
            INSERT INTO qlhk.settings (id, key, value, description, created_at, updated_at)
            VALUES ($1, $2, $3, $4, NOW(), NOW())
            ON CONFLICT (key) DO UPDATE SET
                value = EXCLUDED.value,
                description = COALESCE(EXCLUDED.description, qlhk.settings.description),
                updated_at = NOW()
            "#,
        )
        .bind(Uuid::new_v4())
        .bind(&item.key)
        .bind(&item.value)
        .bind(&item.description);

        if let Err(err) = q.execute(&mut *tx).await {
            let _ = tx.rollback().await;
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "success": false,
                    "error": err.to_string(),
                })),
            )
                .into_response();
        }
    }

    if let Err(err) = tx.commit().await {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({
                "success": false,
                "error": err.to_string(),
            })),
        )
            .into_response();
    }

    Json(json!({ "success": true })).into_response()
}

async fn get_time() -> Response {
    let now = Utc::now();
    let year = now.year();
    Json(json!({
        "isoTime": now.to_rfc3339(),
        "timestamp": now.timestamp_millis(),
        "source": "machine",
        "sourceLabel": "Đồng hồ máy chủ",
        "calculationYear": year,
        "lastSyncedAt": now.to_rfc3339(),
    }))
    .into_response()
}

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(get_settings).put(update_settings))
        .route("/time", get(get_time))
        .route("/time/sync", post(get_time))
}
