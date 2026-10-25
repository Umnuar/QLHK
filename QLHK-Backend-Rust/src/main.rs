use axum::{
    middleware::from_fn,
    response::Json,
    routing::get,
    Router,
};
use qlhk_backend_rust::{
    config::AppConfig,
    handlers::{
        analytics, audit, auth, backup, citizens, excel, households, policies, settings, updates,
        users, villages,
    },
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
        "app": "qlhk-backend-rust",
        "service": "qlhk-backend-rust",
        "version": "1.5.1"
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
        pool: pool.clone(),
        config: config.clone(),
    };

    let startup_pool = pool.clone();
    tokio::spawn(async move {
        let _ = qlhk_backend_rust::handlers::policies::sync_all_citizens_to_policies(
            &startup_pool,
            None,
            None,
        )
        .await;
    });

    let watcher_pool = pool.clone();
    tokio::spawn(async move {
        qlhk_backend_rust::handlers::policies::start_audit_retiree_watcher(watcher_pool).await;
    });

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let protected_routes = Router::new()
        .nest("/households", households::router())
        .nest("/citizens", citizens::router())
        .nest("/policies", policies::router())
        .nest("/analytics", analytics::router())
        .nest("/villages", villages::router())
        .nest("/users", users::router())
        .nest("/audit", audit::router())
        .nest("/audit-logs", audit::router())
        .nest("/excel", excel::router())
        .nest("/backup", backup::router())
        .nest("/settings", settings::router())
        .layer(from_fn(auth_middleware));

    let public_api_routes = Router::new()
        .nest("/auth", auth::router())
        .nest("/updates", updates::router())
        .route("/health", get(health_check))
        .route("/ping", get(auth::ping).post(auth::ping).options(auth::ping));

    let app = Router::new()
        .route("/health", get(health_check))
        .route("/ping", get(auth::ping).post(auth::ping).options(auth::ping))
        .nest("/updates", updates::router())
        .nest("/api", public_api_routes.merge(protected_routes))
        .layer(cors)
        .layer(TraceLayer::new_for_http())
        .with_state(state);

    let addr = SocketAddr::from(([0, 0, 0, 0], config.port));
    info!("Listening on {}", addr);
    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
