use axum::{
    extract::{Path, Query},
    http::{header, HeaderMap, HeaderValue},
    response::{IntoResponse, Response},
    routing::get,
    Json, Router,
};
use serde::Deserialize;
use serde_json::json;

use crate::state::AppState;

#[derive(Debug, Deserialize)]
pub struct UpdateQueryParams {
    pub target: Option<String>,
    pub arch: Option<String>,
    pub current_version: Option<String>,
}

async fn get_latest_update(Query(_params): Query<UpdateQueryParams>) -> Response {
    let mut headers = HeaderMap::new();
    headers.insert(
        header::CACHE_CONTROL,
        HeaderValue::from_static("no-store, no-cache, must-revalidate"),
    );

    (
        headers,
        Json(json!({
            "version": "1.5.1",
            "notes": "Bản nâng cấp tối ưu hóa động cơ Rust và công thái học",
            "pub_date": "2026-10-23T12:00:00Z",
            "platforms": {}
        })),
    )
        .into_response()
}

async fn get_latest_update_target(
    Path((_target, _current_version)): Path<(String, String)>,
) -> Response {
    let mut headers = HeaderMap::new();
    headers.insert(
        header::CACHE_CONTROL,
        HeaderValue::from_static("no-store, no-cache, must-revalidate"),
    );

    (
        headers,
        Json(json!({
            "version": "1.5.1",
            "notes": "Bản nâng cấp tối ưu hóa động cơ Rust và công thái học",
            "pub_date": "2026-10-23T12:00:00Z",
            "platforms": {}
        })),
    )
        .into_response()
}

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(get_latest_update))
        .route("/latest", get(get_latest_update))
        .route("/{target}/{current_version}", get(get_latest_update_target))
}
