use axum::{
    extract::{Path, Query},
    http::{header, HeaderMap, HeaderValue, StatusCode},
    response::{IntoResponse, Response},
    routing::get,
    Json, Router,
};
use serde::Deserialize;
use serde_json::json;

use crate::state::AppState;

const LATEST_VERSION: &str = "1.5.1";
const PUB_DATE: &str = "2026-10-23T12:00:00Z";
const NOTES: &str = "Bản nâng cấp tối ưu hóa động cơ Rust và công thái học";
const SIGNATURE: &str = "dW50cnVzdGVkIGNvbW1lbnQ6IHNpZ25hdHVyZSBmcm9tIHRhdXJpIHNlY3JldCBrZXkKUldScFBGRzhrdlhzVjY0eHJFUnhRNEpLbXNCZlJKa2NVRm9Nc2dzWUV1N3ZrNk5HZkw2SUFmNUIK";
const DOWNLOAD_URL: &str = "http://localhost:5002/releases/qlhk-1.5.1-setup.nsis.zip";

#[derive(Debug, Deserialize)]
pub struct UpdateQueryParams {
    pub target: Option<String>,
    pub arch: Option<String>,
    pub current_version: Option<String>,
}

fn parse_semver(version_str: &str) -> Option<(u64, u64, u64, Option<String>)> {
    let clean = version_str.trim().trim_start_matches(|c| c == 'v' || c == 'V');
    if clean.is_empty() {
        return None;
    }
    let mut main_and_pre = clean.splitn(2, '-');
    let main_part = main_and_pre.next()?;
    let prerelease = main_and_pre.next().map(|s| s.to_string());

    let mut parts = main_part.split('.');
    let major = parts.next()?.parse::<u64>().ok()?;
    let minor = parts.next().unwrap_or("0").parse::<u64>().ok()?;
    let patch = parts.next().unwrap_or("0").parse::<u64>().ok()?;

    Some((major, minor, patch, prerelease))
}

fn is_update_available(current: &str, latest: &str) -> bool {
    let cur_parsed = match parse_semver(current) {
        Some(p) => p,
        None => return true,
    };
    let lat_parsed = match parse_semver(latest) {
        Some(p) => p,
        None => return false,
    };

    let (c_maj, c_min, c_pat, c_pre) = cur_parsed;
    let (l_maj, l_min, l_pat, l_pre) = lat_parsed;

    if (l_maj, l_min, l_pat) > (c_maj, c_min, c_pat) {
        return true;
    }
    if (l_maj, l_min, l_pat) < (c_maj, c_min, c_pat) {
        return false;
    }

    match (c_pre, l_pre) {
        (Some(_), None) => true,
        _ => false,
    }
}

fn cache_headers() -> HeaderMap {
    let mut headers = HeaderMap::new();
    headers.insert(
        header::CACHE_CONTROL,
        HeaderValue::from_static("no-store, no-cache, must-revalidate"),
    );
    headers
}

fn build_update_manifest(target_platform: Option<&str>) -> serde_json::Value {
    let platform_key = target_platform.unwrap_or("windows-x86_64");
    json!({
        "version": LATEST_VERSION,
        "notes": NOTES,
        "pub_date": PUB_DATE,
        "url": DOWNLOAD_URL,
        "signature": SIGNATURE,
        "platforms": {
            platform_key: {
                "signature": SIGNATURE,
                "url": DOWNLOAD_URL
            },
            "windows-x86_64": {
                "signature": SIGNATURE,
                "url": DOWNLOAD_URL
            }
        }
    })
}

async fn get_latest_update(Query(params): Query<UpdateQueryParams>) -> Response {
    if let Some(ref cur) = params.current_version {
        let trimmed = cur.trim();
        if !trimmed.is_empty() && !is_update_available(trimmed, LATEST_VERSION) {
            return (cache_headers(), StatusCode::NO_CONTENT).into_response();
        }
    }

    let target_ref = params.target.as_deref();
    (cache_headers(), Json(build_update_manifest(target_ref))).into_response()
}

async fn get_latest_update_target(
    Path((target, current_version)): Path<(String, String)>,
) -> Response {
    let trimmed = current_version.trim();
    if !trimmed.is_empty() && !is_update_available(trimmed, LATEST_VERSION) {
        return (cache_headers(), StatusCode::NO_CONTENT).into_response();
    }

    (cache_headers(), Json(build_update_manifest(Some(&target)))).into_response()
}

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(get_latest_update))
        .route("/latest", get(get_latest_update))
        .route("/{target}/{current_version}", get(get_latest_update_target))
}
