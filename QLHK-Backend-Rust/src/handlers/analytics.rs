use axum::{
    extract::{Extension, Query, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use chrono::{Datelike, Utc};
use serde::Deserialize;
use serde_json::json;
use sqlx::FromRow;
use std::collections::HashMap;
use uuid::Uuid;

use crate::{
    middlewares::auth::Claims,
    models::{
        analytics::{
            calculate_percentages, AgePyramidStats, AgeStats,
            AnalyticsOverviewData, CountPct, GenderStats, NameCountPct,
            PolicySummaryStats, VillageAnalyticsSummary,
        },
        policy::extract_birth_year,
    },
    state::AppState,
};

const DAKHA_ETHNICITIES: [&str; 15] = [
    "Kinh", "Xơ Đăng", "Giẻ Triêng", "Ba Na", "Gia Rai", "Ê Đê", "Cor", "Cơ Ho",
    "Dao", "Dìu", "Giơ Lâng", "Ha Lăng", "Hoa", "Hrê", "Khách Gia",
];

#[derive(Debug, Deserialize)]
pub struct AnalyticsQueryParams {
    pub village_id: Option<String>,
    #[serde(rename = "villageId")]
    pub village_id_camel: Option<String>,
}

#[derive(FromRow)]
struct GroupCountRow {
    pub name: Option<String>,
    pub count: i64,
}

#[derive(FromRow)]
struct DobRow {
    pub dob: Option<String>,
}

#[derive(FromRow)]
struct PolicyCountRow {
    pub total: i64,
    pub received: i64,
}

#[derive(FromRow)]
struct VillageSummaryRow {
    pub village_id: Uuid,
    pub village_name: String,
    pub village_code: Option<String>,
    pub household_count: i64,
    pub citizen_count: i64,
    pub male_count: i64,
    pub female_count: i64,
}

pub async fn get_overview(
    State(state): State<AppState>,
    Extension(claims): Extension<Claims>,
    Query(params): Query<AnalyticsQueryParams>,
) -> Response {
    let target_village_id = if claims.role != "admin" {
        claims.village_id.and_then(|v| Uuid::parse_str(&v).ok())
    } else {
        params
            .village_id
            .as_deref()
            .or(params.village_id_camel.as_deref())
            .and_then(|v| Uuid::parse_str(v).ok())
    };

    let total_households_res = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM qlhk.households WHERE is_deleted = false AND ($1::uuid IS NULL OR village_id = $1)",
    )
    .bind(target_village_id)
    .fetch_one(&state.pool)
    .await;

    let total_households = match total_households_res {
        Ok(c) => c,
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Lỗi máy chủ khi đếm số hộ gia đình" })),
            )
                .into_response();
        }
    };

    let total_citizens_res = sqlx::query_scalar::<_, i64>(
        r#"
        SELECT COUNT(*)
        FROM qlhk.citizens c
        JOIN qlhk.households h ON c.household_id = h.id
        WHERE c.is_deleted = false AND h.is_deleted = false
          AND ($1::uuid IS NULL OR h.village_id = $1)
        "#,
    )
    .bind(target_village_id)
    .fetch_one(&state.pool)
    .await;

    let total_citizens = match total_citizens_res {
        Ok(c) => c,
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Lỗi máy chủ khi đếm số nhân khẩu" })),
            )
                .into_response();
        }
    };

    let average_household_size = if total_households > 0 {
        ((total_citizens as f64 / total_households as f64) * 100.0).round() / 100.0
    } else {
        0.0
    };

    let gender_rows = sqlx::query_as::<_, GroupCountRow>(
        r#"
        SELECT c.gender as name, COUNT(*) as count
        FROM qlhk.citizens c
        JOIN qlhk.households h ON c.household_id = h.id
        WHERE c.is_deleted = false AND h.is_deleted = false
          AND ($1::uuid IS NULL OR h.village_id = $1)
        GROUP BY c.gender
        "#,
    )
    .bind(target_village_id)
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default();

    let mut male_count = 0i64;
    let mut female_count = 0i64;
    for r in &gender_rows {
        if r.name.as_deref() == Some("Nữ") {
            female_count += r.count;
        } else {
            male_count += r.count;
        }
    }

    let gender_counts = [male_count, female_count];
    let gender_pcts = calculate_percentages(&gender_counts, |&c| c, Some(total_citizens));
    let gender_stats = GenderStats {
        male: CountPct {
            count: male_count,
            percentage: gender_pcts.get(0).copied().unwrap_or(0.0),
        },
        female: CountPct {
            count: female_count,
            percentage: gender_pcts.get(1).copied().unwrap_or(0.0),
        },
    };

    let ethnicity_rows = sqlx::query_as::<_, GroupCountRow>(
        r#"
        SELECT c.ethnicity as name, COUNT(*) as count
        FROM qlhk.citizens c
        JOIN qlhk.households h ON c.household_id = h.id
        WHERE c.is_deleted = false AND h.is_deleted = false
          AND ($1::uuid IS NULL OR h.village_id = $1)
        GROUP BY c.ethnicity
        "#,
    )
    .bind(target_village_id)
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default();

    let mut eth_map: HashMap<String, i64> = HashMap::new();
    for eth in DAKHA_ETHNICITIES {
        eth_map.insert(eth.to_string(), 0);
    }
    for r in ethnicity_rows {
        let name = r
            .name
            .as_deref()
            .map(|s| s.trim())
            .filter(|s| !s.is_empty())
            .unwrap_or("Kinh");
        *eth_map.entry(name.to_string()).or_insert(0) += r.count;
    }

    let mut ethnic_list: Vec<(String, i64)> = eth_map.into_iter().collect();
    ethnic_list.sort_by(|a, b| b.1.cmp(&a.1).then_with(|| a.0.cmp(&b.0)));
    let eth_pcts = calculate_percentages(&ethnic_list, |item| item.1, Some(total_citizens));
    let ethnicities: Vec<NameCountPct> = ethnic_list
        .into_iter()
        .enumerate()
        .map(|(i, (name, count))| NameCountPct {
            name,
            count,
            percentage: eth_pcts.get(i).copied().unwrap_or(0.0),
        })
        .collect();

    let religion_rows = sqlx::query_as::<_, GroupCountRow>(
        r#"
        SELECT COALESCE(NULLIF(TRIM(c.religion), ''), 'Không') as name, COUNT(*) as count
        FROM qlhk.citizens c
        JOIN qlhk.households h ON c.household_id = h.id
        WHERE c.is_deleted = false AND h.is_deleted = false
          AND ($1::uuid IS NULL OR h.village_id = $1)
        GROUP BY 1
        ORDER BY count DESC
        "#,
    )
    .bind(target_village_id)
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default();

    let rel_pcts = calculate_percentages(&religion_rows, |r| r.count, Some(total_citizens));
    let religions: Vec<NameCountPct> = religion_rows
        .into_iter()
        .enumerate()
        .map(|(i, r)| NameCountPct {
            name: r.name.unwrap_or_else(|| "Không".to_string()),
            count: r.count,
            percentage: rel_pcts.get(i).copied().unwrap_or(0.0),
        })
        .collect();

    let dob_rows = sqlx::query_as::<_, DobRow>(
        r#"
        SELECT c.dob
        FROM qlhk.citizens c
        JOIN qlhk.households h ON c.household_id = h.id
        WHERE c.is_deleted = false AND h.is_deleted = false
          AND ($1::uuid IS NULL OR h.village_id = $1)
        "#,
    )
    .bind(target_village_id)
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default();

    let current_year = Utc::now().year();
    let mut under16_count = 0i64;
    let mut youth_count = 0i64;
    let mut adult_count = 0i64;
    let mut over60_count = 0i64;
    let mut unknown_age_count = 0i64;
    let mut working_age_count = 0i64;

    let mut pyramid_children = 0i64;
    let mut pyramid_working = 0i64;
    let mut pyramid_elderly = 0i64;

    for r in &dob_rows {
        if let Some(by) = r.dob.as_deref().and_then(extract_birth_year) {
            let age = current_year - by;
            if age < 16 {
                under16_count += 1;
            } else if age <= 27 {
                youth_count += 1;
            } else if age <= 60 {
                adult_count += 1;
            } else {
                over60_count += 1;
            }

            if (18..=60).contains(&age) {
                working_age_count += 1;
            }

            if age <= 14 {
                pyramid_children += 1;
            } else if age <= 59 {
                pyramid_working += 1;
            } else {
                pyramid_elderly += 1;
            }
        } else {
            unknown_age_count += 1;
        }
    }

    let raw_age_list = [
        under16_count,
        youth_count,
        adult_count,
        over60_count,
        unknown_age_count,
    ];
    let age_pcts = calculate_percentages(&raw_age_list, |&c| c, Some(total_citizens));
    let legal_workforce_pct = if total_citizens > 0 {
        ((working_age_count as f64 / total_citizens as f64) * 1000.0).round() / 10.0
    } else {
        0.0
    };

    let age_stats = AgeStats {
        under16: CountPct {
            count: under16_count,
            percentage: age_pcts.get(0).copied().unwrap_or(0.0),
        },
        youth: CountPct {
            count: youth_count,
            percentage: age_pcts.get(1).copied().unwrap_or(0.0),
        },
        military_age: CountPct {
            count: youth_count,
            percentage: age_pcts.get(1).copied().unwrap_or(0.0),
        },
        adult: CountPct {
            count: adult_count,
            percentage: age_pcts.get(2).copied().unwrap_or(0.0),
        },
        working_age: CountPct {
            count: adult_count,
            percentage: age_pcts.get(2).copied().unwrap_or(0.0),
        },
        over60: CountPct {
            count: over60_count,
            percentage: age_pcts.get(3).copied().unwrap_or(0.0),
        },
        unknown_age: CountPct {
            count: unknown_age_count,
            percentage: age_pcts.get(4).copied().unwrap_or(0.0),
        },
        legal_workforce: CountPct {
            count: working_age_count,
            percentage: legal_workforce_pct,
        },
    };

    let pyramid_counts = [pyramid_children, pyramid_working, pyramid_elderly];
    let pyramid_pcts = calculate_percentages(&pyramid_counts, |&c| c, Some(total_citizens));
    let age_pyramid = AgePyramidStats {
        children: CountPct {
            count: pyramid_children,
            percentage: pyramid_pcts.get(0).copied().unwrap_or(0.0),
        },
        working: CountPct {
            count: pyramid_working,
            percentage: pyramid_pcts.get(1).copied().unwrap_or(0.0),
        },
        elderly: CountPct {
            count: pyramid_elderly,
            percentage: pyramid_pcts.get(2).copied().unwrap_or(0.0),
        },
    };

    let chuctho_policy_res = sqlx::query_as::<_, PolicyCountRow>(
        r#"
        SELECT
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE received = true) as received
        FROM qlhk.chuctho_profiles
        WHERE is_deleted = false AND ($1::uuid IS NULL OR village_id = $1)
        "#,
    )
    .bind(target_village_id)
    .fetch_one(&state.pool)
    .await
    .unwrap_or(PolicyCountRow { total: 0, received: 0 });

    let htxh_policy_res = sqlx::query_as::<_, PolicyCountRow>(
        r#"
        SELECT
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE received = true) as received
        FROM qlhk.htxh_profiles
        WHERE is_deleted = false AND ($1::uuid IS NULL OR village_id = $1)
        "#,
    )
    .bind(target_village_id)
    .fetch_one(&state.pool)
    .await
    .unwrap_or(PolicyCountRow { total: 0, received: 0 });

    let policy_summary = PolicySummaryStats {
        chuctho_total: chuctho_policy_res.total,
        chuctho_received: chuctho_policy_res.received,
        htxh_total: htxh_policy_res.total,
        htxh_received: htxh_policy_res.received,
    };

    let military_rows = sqlx::query_as::<_, GroupCountRow>(
        r#"
        SELECT TRIM(c.military_status) as name, COUNT(*) as count
        FROM qlhk.citizens c
        JOIN qlhk.households h ON c.household_id = h.id
        WHERE c.is_deleted = false AND h.is_deleted = false
          AND c.military_status IS NOT NULL AND TRIM(c.military_status) != ''
          AND ($1::uuid IS NULL OR h.village_id = $1)
        GROUP BY 1
        ORDER BY count DESC
        "#,
    )
    .bind(target_village_id)
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default();

    let mil_total: i64 = military_rows.iter().map(|r| r.count).sum();
    let mil_pcts = calculate_percentages(&military_rows, |r| r.count, Some(mil_total));
    let military: Vec<NameCountPct> = military_rows
        .into_iter()
        .enumerate()
        .map(|(i, r)| NameCountPct {
            name: r.name.unwrap_or_default(),
            count: r.count,
            percentage: mil_pcts.get(i).copied().unwrap_or(0.0),
        })
        .collect();

    let edu_rows = sqlx::query_as::<_, GroupCountRow>(
        r#"
        SELECT TRIM(c.education) as name, COUNT(*) as count
        FROM qlhk.citizens c
        JOIN qlhk.households h ON c.household_id = h.id
        WHERE c.is_deleted = false AND h.is_deleted = false
          AND c.education IS NOT NULL AND TRIM(c.education) != ''
          AND ($1::uuid IS NULL OR h.village_id = $1)
        GROUP BY 1
        ORDER BY count DESC
        "#,
    )
    .bind(target_village_id)
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default();

    let edu_total: i64 = edu_rows.iter().map(|r| r.count).sum();
    let edu_pcts = calculate_percentages(&edu_rows, |r| r.count, Some(edu_total));
    let educations: Vec<NameCountPct> = edu_rows
        .into_iter()
        .enumerate()
        .map(|(i, r)| NameCountPct {
            name: r.name.unwrap_or_default(),
            count: r.count,
            percentage: edu_pcts.get(i).copied().unwrap_or(0.0),
        })
        .collect();

    let occ_rows = sqlx::query_as::<_, GroupCountRow>(
        r#"
        SELECT TRIM(c.occupation) as name, COUNT(*) as count
        FROM qlhk.citizens c
        JOIN qlhk.households h ON c.household_id = h.id
        WHERE c.is_deleted = false AND h.is_deleted = false
          AND c.occupation IS NOT NULL AND TRIM(c.occupation) != ''
          AND ($1::uuid IS NULL OR h.village_id = $1)
        GROUP BY 1
        ORDER BY count DESC
        "#,
    )
    .bind(target_village_id)
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default();

    let occ_total: i64 = occ_rows.iter().map(|r| r.count).sum();
    let occ_pcts = calculate_percentages(&occ_rows, |r| r.count, Some(occ_total));
    let occupations: Vec<NameCountPct> = occ_rows
        .into_iter()
        .enumerate()
        .map(|(i, r)| NameCountPct {
            name: r.name.unwrap_or_default(),
            count: r.count,
            percentage: occ_pcts.get(i).copied().unwrap_or(0.0),
        })
        .collect();

    Json(json!({
        "success": true,
        "data": AnalyticsOverviewData {
            total_households,
            total_citizens,
            average_household_size,
            gender: gender_stats,
            ethnicities,
            religions,
            age_groups: age_stats,
            age_pyramid,
            policy_summary,
            military,
            educations,
            occupations,
        }
    }))
    .into_response()
}

pub async fn get_by_village(
    State(state): State<AppState>,
    Extension(_claims): Extension<Claims>,
) -> Response {
    let query = r#"
        SELECT
            v.id as village_id,
            v.name as village_name,
            v.code as village_code,
            COUNT(DISTINCT h.id) FILTER (WHERE h.is_deleted = false) as household_count,
            COUNT(c.id) FILTER (WHERE c.is_deleted = false AND h.is_deleted = false) as citizen_count,
            COUNT(c.id) FILTER (WHERE c.is_deleted = false AND h.is_deleted = false AND c.gender != 'Nữ') as male_count,
            COUNT(c.id) FILTER (WHERE c.is_deleted = false AND h.is_deleted = false AND c.gender = 'Nữ') as female_count
        FROM qlhk.villages v
        LEFT JOIN qlhk.households h ON v.id = h.village_id AND h.is_deleted = false
        LEFT JOIN qlhk.citizens c ON h.id = c.household_id AND c.is_deleted = false
        GROUP BY v.id, v.name, v.code
        ORDER BY v.name ASC
    "#;

    let rows = sqlx::query_as::<_, VillageSummaryRow>(query)
        .fetch_all(&state.pool)
        .await
        .unwrap_or_default();

    let data: Vec<VillageAnalyticsSummary> = rows
        .into_iter()
        .map(|r| VillageAnalyticsSummary {
            village_id: r.village_id,
            village_name: r.village_name,
            village_code: r.village_code,
            household_count: r.household_count,
            citizen_count: r.citizen_count,
            male_count: r.male_count,
            female_count: r.female_count,
        })
        .collect();

    Json(json!({
        "success": true,
        "data": data,
    }))
    .into_response()
}

pub fn router() -> axum::Router<AppState> {
    axum::Router::new()
        .route("/overview", axum::routing::get(get_overview))
        .route("/by-village", axum::routing::get(get_by_village))
}

