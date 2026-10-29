use std::env;

#[derive(Clone, Debug)]
pub struct AppConfig {
    pub port: u16,
    pub database_url: String,
    pub jwt_secret: String,
    pub encryption_key: String,
    pub cccd_hash_pepper: String,
    pub cors_origin: String,
}

impl AppConfig {
    pub fn from_env() -> Self {
        dotenvy::dotenv().ok();
        let database_url = match env::var("DATABASE_URL") {
            Ok(url) => {
                if !url.contains("search_path") {
                    let separator = if url.contains('?') { "&" } else { "?" };
                    format!("{url}{separator}options=-c%20search_path=qlhk,public")
                } else {
                    url
                }
            }
            Err(_) => "postgresql://postgres:admin123@localhost:5432/postgres?options=-c%20search_path=qlhk,public".to_string(),
        };
        Self {
            port: env::var("PORT")
                .unwrap_or_else(|_| "5012".to_string())
                .parse::<u16>()
                .unwrap_or(5012),
            database_url,
            jwt_secret: env::var("JWT_SECRET")
                .unwrap_or_else(|_| "qlhk-dakha-jwt-access-secret-32-chars-min".to_string()),
            encryption_key: env::var("ENCRYPTION_KEY")
                .unwrap_or_else(|_| "9e0ec6d63e2a75256378ea59833c454c63681150dd0a02bc6a608c195a66ff57".to_string()),
            cccd_hash_pepper: env::var("CCCD_HASH_PEPPER")
                .unwrap_or_else(|_| "qlhk-dakha-cccd-pepper-secret-2026-v2-production-key".to_string()),
            cors_origin: env::var("CORS_ORIGIN")
                .unwrap_or_else(|_| "http://localhost:5175".to_string()),
        }
    }
}
