use axum::{
    extract::State,
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use chrono::{DateTime, Utc};
use serde_json::json;

use crate::{
    models::backup::{
        BackupFileInfo, BackupListResponse, BackupResponse, RestoreBackupRequest,
        RestoreBackupResponse,
    },
    state::AppState,
};

async fn fetch_table_json(
    pool: &sqlx::PgPool,
    table_name: &str,
) -> Result<serde_json::Value, sqlx::Error> {
    let sql = format!(
        "SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)::text FROM {} t",
        table_name
    );
    let res: Option<String> = sqlx::query_scalar(&sql).fetch_one(pool).await?;
    let text = res.unwrap_or_else(|| "[]".to_string());
    let val: serde_json::Value =
        serde_json::from_str(&text).unwrap_or(serde_json::Value::Array(vec![]));
    Ok(val)
}

async fn create_backup(State(state): State<AppState>) -> Response {
    if let Err(err) = tokio::fs::create_dir_all("backups").await {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({
                "success": false,
                "error": err.to_string(),
            })),
        )
            .into_response();
    }

    let villages = match fetch_table_json(&state.pool, "qlhk.villages").await {
        Ok(v) => v,
        Err(err) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "success": false, "error": err.to_string() })),
            )
                .into_response();
        }
    };

    let households = match fetch_table_json(&state.pool, "qlhk.households").await {
        Ok(v) => v,
        Err(err) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "success": false, "error": err.to_string() })),
            )
                .into_response();
        }
    };

    let citizens = match fetch_table_json(&state.pool, "qlhk.citizens").await {
        Ok(v) => v,
        Err(err) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "success": false, "error": err.to_string() })),
            )
                .into_response();
        }
    };

    let settings = match fetch_table_json(&state.pool, "qlhk.settings").await {
        Ok(v) => v,
        Err(err) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "success": false, "error": err.to_string() })),
            )
                .into_response();
        }
    };

    let chuctho_profiles = match fetch_table_json(&state.pool, "qlhk.chuctho_profiles").await {
        Ok(v) => v,
        Err(err) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "success": false, "error": err.to_string() })),
            )
                .into_response();
        }
    };

    let htxh_profiles = match fetch_table_json(&state.pool, "qlhk.htxh_profiles").await {
        Ok(v) => v,
        Err(err) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "success": false, "error": err.to_string() })),
            )
                .into_response();
        }
    };

    let timestamp = Utc::now().format("%Y%m%d_%H%M%S").to_string();
    let filename = format!("backup-{}.json", timestamp);

    let backup_data = json!({
        "metadata": {
            "exported_at": Utc::now().to_rfc3339(),
            "version": "1.0",
            "app": "qlhk-backend-rust",
            "schema": "qlhk"
        },
        "data": {
            "villages": villages,
            "households": households,
            "citizens": citizens,
            "settings": settings,
            "chuctho_profiles": chuctho_profiles,
            "htxh_profiles": htxh_profiles
        }
    });

    let content = match serde_json::to_string_pretty(&backup_data) {
        Ok(c) => c,
        Err(err) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "success": false, "error": err.to_string() })),
            )
                .into_response();
        }
    };

    let file_path = format!("backups/{}", filename);
    if let Err(err) = tokio::fs::write(&file_path, content.as_bytes()).await {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "success": false, "error": err.to_string() })),
        )
            .into_response();
    }

    let size = content.len() as u64;

    Json(BackupResponse {
        success: true,
        filename,
        size,
    })
    .into_response()
}

async fn list_backups() -> Response {
    let _ = tokio::fs::create_dir_all("backups").await;
    let mut files = Vec::new();

    if let Ok(mut entries) = tokio::fs::read_dir("backups").await {
        while let Ok(Some(entry)) = entries.next_entry().await {
            let path = entry.path();
            if path.is_file() {
                if let Some(ext) = path.extension() {
                    if ext == "json" {
                        let filename = entry.file_name().to_string_lossy().to_string();
                        let size = entry.metadata().await.map(|m| m.len()).unwrap_or(0);
                        let created_at = entry
                            .metadata()
                            .await
                            .ok()
                            .and_then(|m| m.created().or_else(|_| m.modified()).ok())
                            .map(DateTime::<Utc>::from);

                        files.push(BackupFileInfo {
                            filename,
                            size,
                            created_at,
                        });
                    }
                }
            }
        }
    }

    files.sort_by(|a, b| b.filename.cmp(&a.filename));

    Json(BackupListResponse {
        success: true,
        data: files,
    })
    .into_response()
}

async fn restore_backup(
    State(state): State<AppState>,
    Json(req): Json<RestoreBackupRequest>,
) -> Response {
    let parsed_val: serde_json::Value = if let Some(direct_data) = req.data {
        direct_data
    } else {
        let fname = match &req.filename {
            Some(f) if !f.is_empty() => f,
            _ => {
                return (
                    StatusCode::BAD_REQUEST,
                    Json(json!({ "success": false, "error": "Thiếu tên tệp sao lưu" })),
                )
                    .into_response();
            }
        };

        if fname.contains("..") || fname.contains('/') || fname.contains('\\') {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({ "success": false, "error": "Tên tệp không hợp lệ" })),
            )
                .into_response();
        }

        let file_path = std::path::Path::new("backups").join(fname);
        if !file_path.exists() {
            return (
                StatusCode::NOT_FOUND,
                Json(json!({ "success": false, "error": "Tệp sao lưu không tồn tại" })),
            )
                .into_response();
        }

        let text = match tokio::fs::read_to_string(&file_path).await {
            Ok(t) => t,
            Err(err) => {
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(json!({ "success": false, "error": err.to_string() })),
                )
                    .into_response();
            }
        };

        match serde_json::from_str(&text) {
            Ok(v) => v,
            Err(err) => {
                return (
                    StatusCode::BAD_REQUEST,
                    Json(json!({
                        "success": false,
                        "error": format!("Dữ liệu JSON không hợp lệ: {}", err)
                    })),
                )
                    .into_response();
            }
        }
    };

    let data = if parsed_val.get("data").is_some() {
        &parsed_val["data"]
    } else {
        &parsed_val
    };

    let mut tx = match state.pool.begin().await {
        Ok(tx) => tx,
        Err(err) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "success": false, "error": err.to_string() })),
            )
                .into_response();
        }
    };

    let _ = sqlx::query("DELETE FROM qlhk.profile_audit_log")
        .execute(&mut *tx)
        .await;
    let _ = sqlx::query("DELETE FROM qlhk.audit_logs")
        .execute(&mut *tx)
        .await;
    let _ = sqlx::query("DELETE FROM qlhk.chuctho_profiles")
        .execute(&mut *tx)
        .await;
    let _ = sqlx::query("DELETE FROM qlhk.htxh_profiles")
        .execute(&mut *tx)
        .await;
    let _ = sqlx::query("DELETE FROM qlhk.citizens")
        .execute(&mut *tx)
        .await;
    let _ = sqlx::query("DELETE FROM qlhk.households")
        .execute(&mut *tx)
        .await;
    let _ = sqlx::query("DELETE FROM qlhk.settings")
        .execute(&mut *tx)
        .await;

    if let Some(arr) = data.get("villages").and_then(|v| v.as_array()) {
        if !arr.is_empty() {
            let json_str = serde_json::to_string(arr).unwrap_or_default();
            let _ = sqlx::query(
                r#"
                INSERT INTO qlhk.villages
                SELECT * FROM json_populate_recordset(null::qlhk.villages, $1::json)
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    code = EXCLUDED.code,
                    updated_at = NOW()
                "#,
            )
            .bind(&json_str)
            .execute(&mut *tx)
            .await;
        }
    }

    if let Some(arr) = data.get("settings").and_then(|v| v.as_array()) {
        if !arr.is_empty() {
            let json_str = serde_json::to_string(arr).unwrap_or_default();
            let _ = sqlx::query(
                r#"
                INSERT INTO qlhk.settings
                SELECT * FROM json_populate_recordset(null::qlhk.settings, $1::json)
                ON CONFLICT (key) DO UPDATE SET
                    value = EXCLUDED.value,
                    description = EXCLUDED.description,
                    updated_at = NOW()
                "#,
            )
            .bind(&json_str)
            .execute(&mut *tx)
            .await;
        }
    }

    if let Some(arr) = data.get("households").and_then(|v| v.as_array()) {
        if !arr.is_empty() {
            let json_str = serde_json::to_string(arr).unwrap_or_default();
            let _ = sqlx::query(
                r#"
                INSERT INTO qlhk.households
                SELECT * FROM json_populate_recordset(null::qlhk.households, $1::json)
                ON CONFLICT (id) DO NOTHING
                "#,
            )
            .bind(&json_str)
            .execute(&mut *tx)
            .await;
        }
    }

    if let Some(arr) = data.get("citizens").and_then(|v| v.as_array()) {
        if !arr.is_empty() {
            let json_str = serde_json::to_string(arr).unwrap_or_default();
            let _ = sqlx::query(
                r#"
                INSERT INTO qlhk.citizens
                SELECT * FROM json_populate_recordset(null::qlhk.citizens, $1::json)
                ON CONFLICT (id) DO NOTHING
                "#,
            )
            .bind(&json_str)
            .execute(&mut *tx)
            .await;
        }
    }

    if let Some(arr) = data.get("chuctho_profiles").and_then(|v| v.as_array()) {
        if !arr.is_empty() {
            let json_str = serde_json::to_string(arr).unwrap_or_default();
            let _ = sqlx::query(
                r#"
                INSERT INTO qlhk.chuctho_profiles
                SELECT * FROM json_populate_recordset(null::qlhk.chuctho_profiles, $1::json)
                ON CONFLICT (id) DO NOTHING
                "#,
            )
            .bind(&json_str)
            .execute(&mut *tx)
            .await;
        }
    }

    if let Some(arr) = data.get("htxh_profiles").and_then(|v| v.as_array()) {
        if !arr.is_empty() {
            let json_str = serde_json::to_string(arr).unwrap_or_default();
            let _ = sqlx::query(
                r#"
                INSERT INTO qlhk.htxh_profiles
                SELECT * FROM json_populate_recordset(null::qlhk.htxh_profiles, $1::json)
                ON CONFLICT (id) DO NOTHING
                "#,
            )
            .bind(&json_str)
            .execute(&mut *tx)
            .await;
        }
    }

    if let Err(err) = tx.commit().await {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "success": false, "error": err.to_string() })),
        )
            .into_response();
    }

    Json(RestoreBackupResponse {
        success: true,
        message: "Khôi phục dữ liệu thành công".to_string(),
    })
    .into_response()
}

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", post(create_backup).get(list_backups))
        .route("/list", get(list_backups))
        .route("/restore", post(restore_backup))
}
