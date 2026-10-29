use axum::{
    extract::{Extension, Path, State},
    http::{header, HeaderMap, HeaderValue, StatusCode},
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use chrono::{DateTime, Utc};
use serde_json::json;
use uuid::Uuid;

use crate::{
    middlewares::auth::Claims,
    models::backup::{
        BackupFileInfo, BackupListResponse, BackupResponse, RestoreBackupRequest,
        RestoreBackupResponse,
    },
    state::AppState,
};

fn require_admin(claims: &Option<Extension<Claims>>) -> Result<&Claims, (StatusCode, &'static str)> {
    match claims {
        Some(Extension(c)) if c.role == "admin" => Ok(c),
        Some(_) => Err((
            StatusCode::FORBIDDEN,
            "Chỉ có quyền Quản trị viên mới được thực hiện thao tác này",
        )),
        None => Err((
            StatusCode::UNAUTHORIZED,
            "Yêu cầu xác thực tài khoản quản trị viên",
        )),
    }
}

fn validate_backup_filename(fname: &str) -> Result<std::path::PathBuf, (StatusCode, &'static str)> {
    let trimmed = fname.trim();
    if trimmed.is_empty() || trimmed.len() > 255 {
        return Err((StatusCode::BAD_REQUEST, "Tên tệp không hợp lệ"));
    }
    if !trimmed.ends_with(".json") {
        return Err((StatusCode::BAD_REQUEST, "Tệp sao lưu phải có định dạng .json"));
    }
    if trimmed.starts_with('.') {
        return Err((StatusCode::BAD_REQUEST, "Tên tệp không được bắt đầu bằng dấu chấm"));
    }
    if !trimmed
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '-' || c == '.')
    {
        return Err((StatusCode::BAD_REQUEST, "Tên tệp chứa ký tự không hợp lệ"));
    }
    let p = std::path::Path::new(trimmed);
    if p.file_name() != Some(std::ffi::OsStr::new(trimmed)) {
        return Err((StatusCode::BAD_REQUEST, "Tên tệp không được chứa đường dẫn"));
    }
    let base_dir = std::fs::canonicalize("backups")
        .map_err(|_| (StatusCode::INTERNAL_SERVER_ERROR, "Thư mục sao lưu không tồn tại"))?;
    let candidate = base_dir.join(trimmed);
    let resolved = std::fs::canonicalize(&candidate)
        .map_err(|_| (StatusCode::NOT_FOUND, "Tệp sao lưu không tồn tại"))?;
    if !resolved.starts_with(&base_dir) || !resolved.is_file() {
        return Err((StatusCode::BAD_REQUEST, "Đường dẫn tệp không hợp lệ"));
    }
    Ok(resolved)
}

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

async fn create_backup(
    State(state): State<AppState>,
    claims: Option<Extension<Claims>>,
) -> Response {
    if let Err((code, msg)) = require_admin(&claims) {
        return (code, Json(json!({ "success": false, "error": msg }))).into_response();
    }

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

    let file_path = std::path::Path::new("backups").join(&filename);
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

async fn list_backups(claims: Option<Extension<Claims>>) -> Response {
    if let Err((code, msg)) = require_admin(&claims) {
        return (code, Json(json!({ "success": false, "error": msg }))).into_response();
    }

    let _ = tokio::fs::create_dir_all("backups").await;
    let mut files = Vec::new();

    if let Ok(mut entries) = tokio::fs::read_dir("backups").await {
        while let Ok(Some(entry)) = entries.next_entry().await {
            let path = entry.path();
            if path.is_file() {
                if let Some(ext) = path.extension() {
                    if ext == "json" {
                        let filename = entry.file_name().to_string_lossy().to_string();
                        if !filename.starts_with('.') {
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
    }

    files.sort_by(|a, b| b.filename.cmp(&a.filename));

    Json(BackupListResponse {
        success: true,
        data: files,
    })
    .into_response()
}

async fn download_backup(
    claims: Option<Extension<Claims>>,
    Path(filename): Path<String>,
) -> Response {
    if let Err((code, msg)) = require_admin(&claims) {
        return (code, Json(json!({ "success": false, "error": msg }))).into_response();
    }

    let file_path = match validate_backup_filename(&filename) {
        Ok(p) => p,
        Err((code, msg)) => {
            return (code, Json(json!({ "success": false, "error": msg }))).into_response();
        }
    };

    let content = match tokio::fs::read(&file_path).await {
        Ok(c) => c,
        Err(err) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "success": false, "error": format!("Không thể đọc tệp: {}", err) })),
            )
                .into_response();
        }
    };

    let mut headers = HeaderMap::new();
    headers.insert(
        header::CONTENT_TYPE,
        HeaderValue::from_static("application/json"),
    );
    headers.insert(
        header::CONTENT_DISPOSITION,
        HeaderValue::from_str(&format!("attachment; filename=\"{}\"", filename))
            .unwrap_or(HeaderValue::from_static("attachment; filename=\"backup.json\"")),
    );

    (headers, content).into_response()
}

async fn restore_backup(
    State(state): State<AppState>,
    claims: Option<Extension<Claims>>,
    Json(req): Json<RestoreBackupRequest>,
) -> Response {
    let admin_claim = match require_admin(&claims) {
        Ok(c) => c,
        Err((code, msg)) => {
            return (code, Json(json!({ "success": false, "error": msg }))).into_response();
        }
    };

    if let Some(ref admin_pwd) = req.admin_password {
        let trimmed_pwd = admin_pwd.trim();
        if !trimmed_pwd.is_empty() {
            let admin_uuid = Uuid::parse_str(&admin_claim.id).unwrap_or_default();
            let row: Option<(String,)> = sqlx::query_as(
                "SELECT password_hash FROM qlhk.users WHERE id = $1 AND role = 'admin'",
            )
            .bind(admin_uuid)
            .fetch_optional(&state.pool)
            .await
            .unwrap_or(None);

            if let Some((hash,)) = row {
                if !crate::handlers::auth::verify_password(trimmed_pwd, &hash) {
                    return (
                        StatusCode::UNAUTHORIZED,
                        Json(json!({ "success": false, "error": "Mật khẩu quản trị viên không chính xác" })),
                    )
                        .into_response();
                }
            }
        }
    }

    let parsed_val: serde_json::Value = if let Some(direct_data) = req.data {
        direct_data
    } else {
        let fname = match &req.filename {
            Some(f) if !f.trim().is_empty() => f.trim(),
            _ => {
                return (
                    StatusCode::BAD_REQUEST,
                    Json(json!({ "success": false, "error": "Thiếu tên tệp sao lưu hoặc dữ liệu khôi phục" })),
                )
                    .into_response();
            }
        };

        let file_path = match validate_backup_filename(fname) {
            Ok(p) => p,
            Err((code, msg)) => {
                return (code, Json(json!({ "success": false, "error": msg }))).into_response();
            }
        };

        let text = match tokio::fs::read_to_string(&file_path).await {
            Ok(t) => t,
            Err(err) => {
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(json!({ "success": false, "error": format!("Không thể đọc tệp sao lưu: {}", err) })),
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

    if !parsed_val.is_object() {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({ "success": false, "error": "Cấu trúc bản sao lưu không đúng định dạng đối tượng JSON" })),
        )
            .into_response();
    }

    let data = if parsed_val.get("data").map(|d| d.is_object()).unwrap_or(false) {
        &parsed_val["data"]
    } else {
        &parsed_val
    };

    let has_villages = data.get("villages").and_then(|v| v.as_array()).map(|a| !a.is_empty()).unwrap_or(false);
    let has_households = data.get("households").and_then(|v| v.as_array()).map(|a| !a.is_empty()).unwrap_or(false);
    let has_citizens = data.get("citizens").and_then(|v| v.as_array()).map(|a| !a.is_empty()).unwrap_or(false);
    let has_settings = data.get("settings").and_then(|v| v.as_array()).map(|a| !a.is_empty()).unwrap_or(false);
    let has_chuctho = data.get("chuctho_profiles").and_then(|v| v.as_array()).map(|a| !a.is_empty()).unwrap_or(false);
    let has_htxh = data.get("htxh_profiles").and_then(|v| v.as_array()).map(|a| !a.is_empty()).unwrap_or(false);

    if !has_villages && !has_households && !has_citizens && !has_settings && !has_chuctho && !has_htxh {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({
                "success": false,
                "error": "Bản sao lưu không chứa dữ liệu hợp lệ để phục hồi"
            })),
        )
            .into_response();
    }

    let mut tx = match state.pool.begin().await {
        Ok(t) => t,
        Err(err) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "success": false, "error": format!("Không thể khởi tạo giao dịch: {}", err) })),
            )
                .into_response();
        }
    };

    let delete_queries = [
        "DELETE FROM qlhk.profile_audit_log",
        "DELETE FROM qlhk.audit_logs",
        "DELETE FROM qlhk.chuctho_profiles",
        "DELETE FROM qlhk.htxh_profiles",
        "DELETE FROM qlhk.citizens",
        "DELETE FROM qlhk.households",
        "DELETE FROM qlhk.settings",
    ];

    for delete_sql in delete_queries {
        if let Err(err) = sqlx::query(delete_sql).execute(&mut *tx).await {
            let _ = tx.rollback().await;
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "success": false, "error": format!("Lỗi xóa dữ liệu cũ: {}", err) })),
            )
                .into_response();
        }
    }

    if let Some(arr) = data.get("villages").and_then(|v| v.as_array()) {
        if !arr.is_empty() {
            let json_str = match serde_json::to_string(arr) {
                Ok(s) => s,
                Err(err) => {
                    let _ = tx.rollback().await;
                    return (
                        StatusCode::BAD_REQUEST,
                        Json(json!({ "success": false, "error": format!("Lỗi định dạng thôn/tổ: {}", err) })),
                    )
                        .into_response();
                }
            };
            if let Err(err) = sqlx::query(
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
            .await {
                let _ = tx.rollback().await;
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(json!({ "success": false, "error": format!("Lỗi khôi phục thôn/tổ: {}", err) })),
                )
                    .into_response();
            }
        }
    }

    if let Some(arr) = data.get("settings").and_then(|v| v.as_array()) {
        if !arr.is_empty() {
            let json_str = match serde_json::to_string(arr) {
                Ok(s) => s,
                Err(err) => {
                    let _ = tx.rollback().await;
                    return (
                        StatusCode::BAD_REQUEST,
                        Json(json!({ "success": false, "error": format!("Lỗi định dạng cấu hình: {}", err) })),
                    )
                        .into_response();
                }
            };
            if let Err(err) = sqlx::query(
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
            .await {
                let _ = tx.rollback().await;
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(json!({ "success": false, "error": format!("Lỗi khôi phục cấu hình: {}", err) })),
                )
                    .into_response();
            }
        }
    }

    if let Some(arr) = data.get("households").and_then(|v| v.as_array()) {
        if !arr.is_empty() {
            let json_str = match serde_json::to_string(arr) {
                Ok(s) => s,
                Err(err) => {
                    let _ = tx.rollback().await;
                    return (
                        StatusCode::BAD_REQUEST,
                        Json(json!({ "success": false, "error": format!("Lỗi định dạng hộ khẩu: {}", err) })),
                    )
                        .into_response();
                }
            };
            if let Err(err) = sqlx::query(
                r#"
                INSERT INTO qlhk.households
                SELECT * FROM json_populate_recordset(null::qlhk.households, $1::json)
                ON CONFLICT (id) DO NOTHING
                "#,
            )
            .bind(&json_str)
            .execute(&mut *tx)
            .await {
                let _ = tx.rollback().await;
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(json!({ "success": false, "error": format!("Lỗi khôi phục hộ khẩu: {}", err) })),
                )
                    .into_response();
            }
        }
    }

    if let Some(arr) = data.get("citizens").and_then(|v| v.as_array()) {
        if !arr.is_empty() {
            let json_str = match serde_json::to_string(arr) {
                Ok(s) => s,
                Err(err) => {
                    let _ = tx.rollback().await;
                    return (
                        StatusCode::BAD_REQUEST,
                        Json(json!({ "success": false, "error": format!("Lỗi định dạng nhân khẩu: {}", err) })),
                    )
                        .into_response();
                }
            };
            if let Err(err) = sqlx::query(
                r#"
                INSERT INTO qlhk.citizens
                SELECT * FROM json_populate_recordset(null::qlhk.citizens, $1::json)
                ON CONFLICT (id) DO NOTHING
                "#,
            )
            .bind(&json_str)
            .execute(&mut *tx)
            .await {
                let _ = tx.rollback().await;
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(json!({ "success": false, "error": format!("Lỗi khôi phục nhân khẩu: {}", err) })),
                )
                    .into_response();
            }
        }
    }

    if let Some(arr) = data.get("chuctho_profiles").and_then(|v| v.as_array()) {
        if !arr.is_empty() {
            let json_str = match serde_json::to_string(arr) {
                Ok(s) => s,
                Err(err) => {
                    let _ = tx.rollback().await;
                    return (
                        StatusCode::BAD_REQUEST,
                        Json(json!({ "success": false, "error": format!("Lỗi định dạng hồ sơ chúc thọ: {}", err) })),
                    )
                        .into_response();
                }
            };
            if let Err(err) = sqlx::query(
                r#"
                INSERT INTO qlhk.chuctho_profiles
                SELECT * FROM json_populate_recordset(null::qlhk.chuctho_profiles, $1::json)
                ON CONFLICT (id) DO NOTHING
                "#,
            )
            .bind(&json_str)
            .execute(&mut *tx)
            .await {
                let _ = tx.rollback().await;
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(json!({ "success": false, "error": format!("Lỗi khôi phục hồ sơ chúc thọ: {}", err) })),
                )
                    .into_response();
            }
        }
    }

    if let Some(arr) = data.get("htxh_profiles").and_then(|v| v.as_array()) {
        if !arr.is_empty() {
            let json_str = match serde_json::to_string(arr) {
                Ok(s) => s,
                Err(err) => {
                    let _ = tx.rollback().await;
                    return (
                        StatusCode::BAD_REQUEST,
                        Json(json!({ "success": false, "error": format!("Lỗi định dạng hồ sơ bảo trợ xã hội: {}", err) })),
                    )
                        .into_response();
                }
            };
            if let Err(err) = sqlx::query(
                r#"
                INSERT INTO qlhk.htxh_profiles
                SELECT * FROM json_populate_recordset(null::qlhk.htxh_profiles, $1::json)
                ON CONFLICT (id) DO NOTHING
                "#,
            )
            .bind(&json_str)
            .execute(&mut *tx)
            .await {
                let _ = tx.rollback().await;
                return (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    Json(json!({ "success": false, "error": format!("Lỗi khôi phục hồ sơ bảo trợ xã hội: {}", err) })),
                )
                    .into_response();
            }
        }
    }

    if let Err(err) = tx.commit().await {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "success": false, "error": format!("Không thể hoàn tất giao dịch: {}", err) })),
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
        .route("/export", get(create_backup))
        .route("/list", get(list_backups))
        .route("/restore", post(restore_backup))
        .route("/download/{filename}", get(download_backup))
}
