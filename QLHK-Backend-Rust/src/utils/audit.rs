use sqlx::PgPool;
use uuid::Uuid;

pub async fn record_audit(
    pool: &PgPool,
    village_id: Option<Uuid>,
    user_id: Option<Uuid>,
    action: &str,
    entity_type: &str,
    entity_id: Option<&str>,
    old_values: Option<&str>,
    new_values: Option<&str>,
    ip_address: Option<&str>,
) -> Result<(), sqlx::Error> {
    sqlx::query(
        "INSERT INTO qlhk.audit_logs (id, village_id, user_id, action, entity_type, entity_id, old_values, new_values, ip_address, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())",
    )
    .bind(Uuid::new_v4())
    .bind(village_id)
    .bind(user_id)
    .bind(action)
    .bind(entity_type)
    .bind(entity_id)
    .bind(old_values)
    .bind(new_values)
    .bind(ip_address)
    .execute(pool)
    .await?;

    Ok(())
}
