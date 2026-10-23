use axum::{
    middleware::from_fn,
    response::Json,
    routing::get,
    Router,
};
use qlhk_backend_rust::{
    config::AppConfig,
    handlers::{analytics, citizens, households, policies},
    middlewares::auth::auth_middleware,
    state::AppState,
};
use serde_json::json;
use sqlx::postgres::PgPoolOptions;
use std::net::SocketAddr;
use tower_http::{
    cors::{Any, CorsLayer},
    trace::TraceLayer,
};
use tracing::info;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

async fn health_check() -> Json<serde_json::Value> {
    Json(json!({
        "status": "ok",
        "service": "qlhk-backend-rust",
        "version": "0.1.0"
    }))
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info,qlhk_backend_rust=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    let config = AppConfig::from_env();
    info!("Starting QLHK Backend Rust on port {}", config.port);

    let pool = PgPoolOptions::new()
        .max_connections(20)
        .connect(&config.database_url)
        .await?;

    let state = AppState {
        pool,
        config: config.clone(),
    };

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let protected_routes = Router::new()
        .nest("/households", households::router())
        .nest("/citizens", citizens::router())
        .nest("/policies", policies::router())
        .nest("/analytics", analytics::router())
        .layer(from_fn(auth_middleware));

    let app = Router::new()
        .route("/health", get(health_check))
        .route("/api/health", get(health_check))
        .nest("/api", protected_routes)
        .layer(cors)
        .layer(TraceLayer::new_for_http())
        .with_state(state);

    let addr = SocketAddr::from(([0, 0, 0, 0], config.port));
    info!("Listening on {}", addr);
    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
