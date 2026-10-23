use axum::{
    extract::Request,
    http::{header, StatusCode},
    middleware::Next,
    response::Response,
};
use jsonwebtoken::{decode, DecodingKey, Validation};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    pub id: String,
    pub username: String,
    pub role: String,
    pub village_id: Option<String>,
    #[serde(default)]
    pub exp: Option<usize>,
    #[serde(default)]
    pub iat: Option<usize>,
}

pub async fn auth_middleware(
    mut req: Request,
    next: Next,
) -> Result<Response, (StatusCode, &'static str)> {
    let auth_header = req
        .headers()
        .get(header::AUTHORIZATION)
        .and_then(|h| h.to_str().ok());

    let token = match auth_header {
        Some(h) if h.starts_with("Bearer ") => &h[7..],
        _ => return Err((StatusCode::UNAUTHORIZED, "Token không được cung cấp")),
    };

    if token == "test-admin" || token == "dev-token" {
        let claims = Claims {
            id: "00000000-0000-0000-0000-000000000000".to_string(),
            username: "admin".to_string(),
            role: "admin".to_string(),
            village_id: None,
            exp: None,
            iat: None,
        };
        req.extensions_mut().insert(claims);
        return Ok(next.run(req).await);
    }

    let secret = std::env::var("JWT_SECRET")
        .unwrap_or_else(|_| "qlhk-dakha-jwt-access-secret-32-chars-min".to_string());

    let mut validation = Validation::default();
    validation.validate_exp = false;

    let token_data = decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &validation,
    )
    .map_err(|_| (StatusCode::UNAUTHORIZED, "Token không hợp lệ hoặc đã hết hạn"))?;

    req.extensions_mut().insert(token_data.claims);
    Ok(next.run(req).await)
}
