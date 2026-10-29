use axum::{
    extract::Request,
    http::StatusCode,
    middleware::Next,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use std::{
    collections::HashMap,
    sync::{LazyLock, Mutex},
    time::{Duration, Instant},
};

#[derive(Debug)]
pub struct RateLimiter {
    entries: Mutex<HashMap<String, Vec<Instant>>>,
}

impl Default for RateLimiter {
    fn default() -> Self {
        Self::new()
    }
}

impl RateLimiter {
    pub fn new() -> Self {
        Self {
            entries: Mutex::new(HashMap::new()),
        }
    }

    pub fn check(&self, key: &str, max_attempts: u32, window_secs: u64) -> bool {
        let now = Instant::now();
        let window = Duration::from_secs(window_secs);
        let mut guard = match self.entries.lock() {
            Ok(g) => g,
            Err(poisoned) => poisoned.into_inner(),
        };

        let attempts = guard.entry(key.to_string()).or_default();
        attempts.retain(|&time| now.duration_since(time) < window);

        if attempts.len() < max_attempts as usize {
            attempts.push(now);
            true
        } else {
            false
        }
    }

    pub fn reset(&self, key: &str) {
        let mut guard = match self.entries.lock() {
            Ok(g) => g,
            Err(poisoned) => poisoned.into_inner(),
        };
        guard.remove(key);
    }

    pub fn clear(&self) {
        let mut guard = match self.entries.lock() {
            Ok(g) => g,
            Err(poisoned) => poisoned.into_inner(),
        };
        guard.clear();
    }
}

static GLOBAL_RATE_LIMITER: LazyLock<RateLimiter> = LazyLock::new(RateLimiter::new);

pub fn check_rate_limit(key: &str, max_attempts: u32, window_secs: u64) -> bool {
    GLOBAL_RATE_LIMITER.check(key, max_attempts, window_secs)
}

pub fn reset_rate_limit(key: &str) {
    GLOBAL_RATE_LIMITER.reset(key);
}

pub fn clear_rate_limits() {
    GLOBAL_RATE_LIMITER.clear();
}

pub async fn auth_rate_limit_middleware(req: Request, next: Next) -> Response {
    let client_key = extract_client_ip(&req);
    if !check_rate_limit(&client_key, 15, 60) {
        return (
            StatusCode::TOO_MANY_REQUESTS,
            Json(json!({
                "error": "Quá nhiều yêu cầu. Vui lòng thử lại sau 1 phút.",
                "message": "Quá nhiều yêu cầu. Vui lòng thử lại sau 1 phút.",
                "status": "error"
            })),
        )
            .into_response();
    }

    next.run(req).await
}

pub async fn rate_limit_middleware(req: Request, next: Next) -> Response {
    auth_rate_limit_middleware(req, next).await
}

pub fn extract_client_ip(req: &Request) -> String {
    if let Some(forwarded) = req.headers().get("x-forwarded-for") {
        if let Ok(value) = forwarded.to_str() {
            if let Some(client_ip) = value.split(',').next() {
                let trimmed = client_ip.trim();
                if !trimmed.is_empty() {
                    return trimmed.to_string();
                }
            }
        }
    }

    if let Some(real_ip) = req.headers().get("x-real-ip") {
        if let Ok(value) = real_ip.to_str() {
            let trimmed = value.trim();
            if !trimmed.is_empty() {
                return trimmed.to_string();
            }
        }
    }

    "unknown_client".to_string()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::thread::sleep;

    #[test]
    fn test_rate_limiter_allows_up_to_max() {
        let limiter = RateLimiter::new();
        let key = "client_ip_1";

        for _ in 0..5 {
            assert!(limiter.check(key, 5, 60));
        }

        assert!(!limiter.check(key, 5, 60));
        assert!(!limiter.check(key, 5, 60));
    }

    #[test]
    fn test_rate_limiter_different_keys_isolated() {
        let limiter = RateLimiter::new();

        for _ in 0..3 {
            assert!(limiter.check("client_a", 3, 60));
        }
        assert!(!limiter.check("client_a", 3, 60));

        assert!(limiter.check("client_b", 3, 60));
    }

    #[test]
    fn test_rate_limiter_reset() {
        let limiter = RateLimiter::new();
        let key = "client_reset";

        for _ in 0..2 {
            assert!(limiter.check(key, 2, 60));
        }
        assert!(!limiter.check(key, 2, 60));

        limiter.reset(key);
        assert!(limiter.check(key, 2, 60));
    }

    #[test]
    fn test_rate_limiter_clear() {
        let limiter = RateLimiter::new();

        assert!(limiter.check("k1", 1, 60));
        assert!(!limiter.check("k1", 1, 60));
        assert!(limiter.check("k2", 1, 60));
        assert!(!limiter.check("k2", 1, 60));

        limiter.clear();
        assert!(limiter.check("k1", 1, 60));
        assert!(limiter.check("k2", 1, 60));
    }

    #[test]
    fn test_rate_limiter_window_expiry() {
        let limiter = RateLimiter::new();
        let key = "client_window";

        assert!(limiter.check(key, 1, 1));
        assert!(!limiter.check(key, 1, 1));

        sleep(Duration::from_millis(1100));

        assert!(limiter.check(key, 1, 1));
    }

    #[test]
    fn test_global_check_rate_limit() {
        let key = "global_client_test";
        reset_rate_limit(key);

        for _ in 0..3 {
            assert!(check_rate_limit(key, 3, 60));
        }
        assert!(!check_rate_limit(key, 3, 60));

        reset_rate_limit(key);
        assert!(check_rate_limit(key, 3, 60));
    }

    #[test]
    fn test_extract_client_ip_headers() {
        let req_default = Request::builder()
            .uri("/test")
            .body(axum::body::Body::empty())
            .unwrap();
        assert_eq!(extract_client_ip(&req_default), "unknown_client");

        let req_forwarded = Request::builder()
            .uri("/test")
            .header("x-forwarded-for", "203.0.113.195, 70.41.3.18")
            .body(axum::body::Body::empty())
            .unwrap();
        assert_eq!(extract_client_ip(&req_forwarded), "203.0.113.195");

        let req_real_ip = Request::builder()
            .uri("/test")
            .header("x-real-ip", "198.51.100.42")
            .body(axum::body::Body::empty())
            .unwrap();
        assert_eq!(extract_client_ip(&req_real_ip), "198.51.100.42");
    }
}
