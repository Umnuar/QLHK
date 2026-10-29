use axum::{
    extract::{Extension, Path, Query, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::get,
    Json, Router,
};
use chrono::{DateTime, Utc};
use serde_json::json;
use sqlx::QueryBuilder;
use uuid::Uuid;

use crate::{
    middlewares::auth::Claims,
    models::audit::{
        AuditLogFilter, AuditLogRow, AuditLogResponse, PaginatedResponse, PaginationMeta,
    },
    state::AppState,
};

fn parse_date_start(s: &str) -> Option<DateTime<Utc>> {
    let trimmed = s.trim();
    if trimmed.is_empty() {
        return None;
    }
    if let Ok(dt) = DateTime::parse_from_rfc3339(trimmed) {
        return Some(dt.with_timezone(&Utc));
    }
    if let Ok(nd) = chrono::NaiveDate::parse_from_str(trimmed, "%Y-%m-%d") {
        return nd.and_hms_opt(0, 0, 0).map(|ndt| ndt.and_utc());
    }
    None
}

fn parse_date_end(s: &str) -> Option<DateTime<Utc>> {
    let trimmed = s.trim();
    if trimmed.is_empty() {
        return None;
    }
    if let Ok(dt) = DateTime::parse_from_rfc3339(trimmed) {
        return Some(dt.with_timezone(&Utc));
    }
    if let Ok(nd) = chrono::NaiveDate::parse_from_str(trimmed, "%Y-%m-%d") {
        return nd.and_hms_opt(23, 59, 59).map(|ndt| ndt.and_utc());
    }
    None
}

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(get_audit_logs))
        .route("/{id}", get(get_audit_log_by_id))
}

pub async fn get_audit_logs(
    State(state): State<AppState>,
    claims_ext: Option<Extension<Claims>>,
    Query(filter): Query<AuditLogFilter>,
) -> Response {
    let claims = claims_ext.map(|Extension(c)| c);
    let limit = filter.limit.unwrap_or(50).clamp(1, 100);
    let page = filter.page.unwrap_or(1).max(1);
    let offset = filter.offset.unwrap_or((page - 1) * limit).max(0);
    let current_page = if filter.offset.is_some() {
        (offset / limit) + 1
    } else {
        page
    };

    let target_village_id = match &claims {
        Some(c) if c.role != "admin" => {
            c.village_id.as_deref().and_then(|v| Uuid::parse_str(v).ok())
        }
        _ => filter.village_id,
    };

    let mut count_builder = QueryBuilder::new(
        "SELECT COUNT(*) FROM qlhk.audit_logs a LEFT JOIN qlhk.users u ON a.user_id = u.id LEFT JOIN qlhk.villages v ON COALESCE(a.village_id, u.village_id) = v.id WHERE 1=1",
    );
    let mut select_builder = QueryBuilder::new(
        "SELECT a.id, COALESCE(a.village_id, u.village_id) AS village_id, v.name AS village_name, a.user_id, u.username, u.full_name AS user_full_name, a.action, a.entity_type, a.entity_id, a.old_values, a.new_values, a.ip_address, a.created_at FROM qlhk.audit_logs a LEFT JOIN qlhk.users u ON a.user_id = u.id LEFT JOIN qlhk.villages v ON COALESCE(a.village_id, u.village_id) = v.id WHERE 1=1",
    );

    if let Some(vid) = target_village_id {
        count_builder.push(" AND (a.village_id = ");
        count_builder.push_bind(vid);
        count_builder.push(" OR u.village_id = ");
        count_builder.push_bind(vid);
        count_builder.push(")");

        select_builder.push(" AND (a.village_id = ");
        select_builder.push_bind(vid);
        select_builder.push(" OR u.village_id = ");
        select_builder.push_bind(vid);
        select_builder.push(")");
    }

    if let Some(uid) = filter.user_id {
        count_builder.push(" AND a.user_id = ");
        count_builder.push_bind(uid);

        select_builder.push(" AND a.user_id = ");
        select_builder.push_bind(uid);
    }

    if let Some(act) = &filter.action {
        let trimmed = act.trim();
        if !trimmed.is_empty() && trimmed != "all" && trimmed != "Tất cả" {
            if trimmed.eq_ignore_ascii_case("DELETE") {
                count_builder.push(" AND a.action IN ('DELETE', 'BULK_DELETE', 'HARD_DELETE')");
                select_builder.push(" AND a.action IN ('DELETE', 'BULK_DELETE', 'HARD_DELETE')");
            } else {
                count_builder.push(" AND a.action = ");
                count_builder.push_bind(trimmed.to_string());

                select_builder.push(" AND a.action = ");
                select_builder.push_bind(trimmed.to_string());
            }
        }
    }

    if let Some(ent) = &filter.entity_type {
        let trimmed = ent.trim();
        if !trimmed.is_empty() && trimmed != "all" && trimmed != "Tất cả" {
            count_builder.push(" AND a.entity_type = ");
            count_builder.push_bind(trimmed.to_string());

            select_builder.push(" AND a.entity_type = ");
            select_builder.push_bind(trimmed.to_string());
        }
    }

    if let Some(eid) = &filter.entity_id {
        let trimmed = eid.trim();
        if !trimmed.is_empty() {
            count_builder.push(" AND a.entity_id = ");
            count_builder.push_bind(trimmed.to_string());

            select_builder.push(" AND a.entity_id = ");
            select_builder.push_bind(trimmed.to_string());
        }
    }

    if let Some(from_s) = &filter.from_date {
        if let Some(dt) = parse_date_start(from_s) {
            count_builder.push(" AND a.created_at >= ");
            count_builder.push_bind(dt);

            select_builder.push(" AND a.created_at >= ");
            select_builder.push_bind(dt);
        }
    }

    if let Some(to_s) = &filter.to_date {
        if let Some(dt) = parse_date_end(to_s) {
            count_builder.push(" AND a.created_at <= ");
            count_builder.push_bind(dt);

            select_builder.push(" AND a.created_at <= ");
            select_builder.push_bind(dt);
        }
    }

    if let Some(q) = &filter.search {
        let trimmed = q.trim();
        if !trimmed.is_empty() {
            let like_q = format!("%{}%", trimmed);

            count_builder.push(" AND (a.entity_id ILIKE ");
            count_builder.push_bind(like_q.clone());
            count_builder.push(" OR a.action ILIKE ");
            count_builder.push_bind(like_q.clone());
            count_builder.push(" OR a.entity_type ILIKE ");
            count_builder.push_bind(like_q.clone());
            count_builder.push(" OR a.old_values ILIKE ");
            count_builder.push_bind(like_q.clone());
            count_builder.push(" OR a.new_values ILIKE ");
            count_builder.push_bind(like_q.clone());
            count_builder.push(" OR a.ip_address ILIKE ");
            count_builder.push_bind(like_q.clone());
            count_builder.push(" OR u.username ILIKE ");
            count_builder.push_bind(like_q.clone());
            count_builder.push(" OR u.full_name ILIKE ");
            count_builder.push_bind(like_q.clone());
            count_builder.push(" OR v.name ILIKE ");
            count_builder.push_bind(like_q.clone());
            count_builder.push(")");

            select_builder.push(" AND (a.entity_id ILIKE ");
            select_builder.push_bind(like_q.clone());
            select_builder.push(" OR a.action ILIKE ");
            select_builder.push_bind(like_q.clone());
            select_builder.push(" OR a.entity_type ILIKE ");
            select_builder.push_bind(like_q.clone());
            select_builder.push(" OR a.old_values ILIKE ");
            select_builder.push_bind(like_q.clone());
            select_builder.push(" OR a.new_values ILIKE ");
            select_builder.push_bind(like_q.clone());
            select_builder.push(" OR a.ip_address ILIKE ");
            select_builder.push_bind(like_q.clone());
            select_builder.push(" OR u.username ILIKE ");
            select_builder.push_bind(like_q.clone());
            select_builder.push(" OR u.full_name ILIKE ");
            select_builder.push_bind(like_q.clone());
            select_builder.push(" OR v.name ILIKE ");
            select_builder.push_bind(like_q);
            select_builder.push(")");
        }
    }

    let total: i64 = match count_builder
        .build_query_scalar::<i64>()
        .fetch_one(&state.pool)
        .await
    {
        Ok(t) => t,
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "success": false,
                    "error": "Lỗi máy chủ khi đếm số nhật ký kiểm toán"
                })),
            )
                .into_response();
        }
    };

    select_builder.push(" ORDER BY a.created_at DESC LIMIT ");
    select_builder.push_bind(limit);
    select_builder.push(" OFFSET ");
    select_builder.push_bind(offset);

    let raw_logs: Vec<AuditLogRow> = match select_builder
        .build_query_as::<AuditLogRow>()
        .fetch_all(&state.pool)
        .await
    {
        Ok(l) => l,
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "success": false,
                    "error": "Lỗi máy chủ khi lấy danh sách nhật ký kiểm toán"
                })),
            )
                .into_response();
        }
    };

    let logs: Vec<AuditLogResponse> = raw_logs.into_iter().map(AuditLogResponse::from).collect();

    let total_pages = if total == 0 {
        1
    } else {
        ((total as f64) / (limit as f64)).ceil() as i64
    };

    Json(PaginatedResponse {
        success: true,
        data: logs,
        pagination: PaginationMeta {
            page: current_page,
            limit,
            offset: Some(offset),
            total,
            total_pages,
            total_pages_camel: Some(total_pages),
        },
    })
    .into_response()
}

pub async fn get_audit_log_by_id(
    State(state): State<AppState>,
    claims_ext: Option<Extension<Claims>>,
    Path(id): Path<Uuid>,
) -> Response {
    let claims = claims_ext.map(|Extension(c)| c);
    let target_village_id = match &claims {
        Some(c) if c.role != "admin" => {
            c.village_id.as_deref().and_then(|v| Uuid::parse_str(v).ok())
        }
        _ => None,
    };

    let mut select_builder = QueryBuilder::new(
        "SELECT a.id, COALESCE(a.village_id, u.village_id) AS village_id, v.name AS village_name, a.user_id, u.username, u.full_name AS user_full_name, a.action, a.entity_type, a.entity_id, a.old_values, a.new_values, a.ip_address, a.created_at FROM qlhk.audit_logs a LEFT JOIN qlhk.users u ON a.user_id = u.id LEFT JOIN qlhk.villages v ON COALESCE(a.village_id, u.village_id) = v.id WHERE a.id = ",
    );
    select_builder.push_bind(id);

    if let Some(vid) = target_village_id {
        select_builder.push(" AND (a.village_id = ");
        select_builder.push_bind(vid);
        select_builder.push(" OR u.village_id = ");
        select_builder.push_bind(vid);
        select_builder.push(")");
    }

    match select_builder
        .build_query_as::<AuditLogRow>()
        .fetch_optional(&state.pool)
        .await
    {
        Ok(Some(log)) => Json(json!({
            "success": true,
            "data": AuditLogResponse::from(log)
        }))
        .into_response(),
        Ok(None) => (
            StatusCode::NOT_FOUND,
            Json(json!({
                "success": false,
                "error": "Không tìm thấy nhật ký kiểm toán"
            })),
        )
            .into_response(),
        Err(_) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({
                "success": false,
                "error": "Lỗi máy chủ khi lấy chi tiết nhật ký kiểm toán"
            })),
        )
            .into_response(),
    }
}
