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
            calculate_percentages, AgePyramidStats, AgeStats, AnalyticsOverviewData, CountPct,
            GenderStats, NameCountPct, PolicySummaryStats, VillageAnalyticsSummary,
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
struct VillageBaseRow {
    pub id: Uuid,
    pub name: String,
    pub code: Option<String>,
    pub household_count: i64,
}

#[derive(FromRow)]
struct CitizenGroupRow {
    pub village_id: Uuid,
    pub gender: Option<String>,
    pub ethnicity: Option<String>,
    pub religion: Option<String>,
    pub count: i64,
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
    let gender_total = male_count + female_count;
    let gender_pcts = calculate_percentages(&gender_counts, |&c| c, Some(gender_total));
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
    let eth_total: i64 = ethnic_list.iter().map(|item| item.1).sum();
    let eth_pcts = calculate_percentages(&ethnic_list, |item| item.1, Some(eth_total));
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

    let rel_total: i64 = religion_rows.iter().map(|r| r.count).sum();
    let rel_pcts = calculate_percentages(&religion_rows, |r| r.count, Some(rel_total));
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
    let age_total: i64 = raw_age_list.iter().copied().sum();
    let age_pcts = calculate_percentages(&raw_age_list, |&c| c, Some(age_total));
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
    let pyramid_total = pyramid_children + pyramid_working + pyramid_elderly;
    let pyramid_pcts = calculate_percentages(&pyramid_counts, |&c| c, Some(pyramid_total));
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
    Extension(claims): Extension<Claims>,
) -> Response {
    let target_village_id = if claims.role != "admin" {
        claims.village_id.and_then(|v| Uuid::parse_str(&v).ok())
    } else {
        None
    };

    let village_rows = sqlx::query_as::<_, VillageBaseRow>(
        r#"
        SELECT
            v.id,
            v.name,
            v.code,
            COUNT(DISTINCT h.id) FILTER (WHERE h.is_deleted = false) as household_count
        FROM qlhk.villages v
        LEFT JOIN qlhk.households h ON v.id = h.village_id AND h.is_deleted = false
        WHERE ($1::uuid IS NULL OR v.id = $1)
        GROUP BY v.id, v.name, v.code
        ORDER BY v.name ASC
        "#,
    )
    .bind(target_village_id)
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default();

    let group_rows = sqlx::query_as::<_, CitizenGroupRow>(
        r#"
        SELECT
            h.village_id,
            COALESCE(c.gender, 'Khác') as gender,
            COALESCE(NULLIF(TRIM(c.ethnicity), ''), 'Kinh') as ethnicity,
            COALESCE(NULLIF(TRIM(c.religion), ''), 'Không') as religion,
            COUNT(*) as count
        FROM qlhk.citizens c
        JOIN qlhk.households h ON c.household_id = h.id
        WHERE c.is_deleted = false AND h.is_deleted = false
          AND ($1::uuid IS NULL OR h.village_id = $1)
        GROUP BY h.village_id, 2, 3, 4
        "#,
    )
    .bind(target_village_id)
    .fetch_all(&state.pool)
    .await
    .unwrap_or_default();

    let mut groups_by_village: HashMap<Uuid, Vec<CitizenGroupRow>> = HashMap::new();
    for r in group_rows {
        groups_by_village.entry(r.village_id).or_default().push(r);
    }

    let data: Vec<VillageAnalyticsSummary> = village_rows
        .into_iter()
        .map(|v| {
            let rows = groups_by_village.remove(&v.id).unwrap_or_default();
            let mut citizen_count = 0i64;
            let mut male_count = 0i64;
            let mut female_count = 0i64;
            let mut dtts_count = 0i64;
            let mut eth_map: HashMap<String, i64> = HashMap::new();
            let mut rel_map: HashMap<String, i64> = HashMap::new();

            for r in rows {
                citizen_count += r.count;
                if r.gender.as_deref() == Some("Nữ") {
                    female_count += r.count;
                } else {
                    male_count += r.count;
                }

                let eth = r.ethnicity.unwrap_or_else(|| "Kinh".to_string());
                if eth != "Kinh" {
                    dtts_count += r.count;
                }
                *eth_map.entry(eth).or_insert(0) += r.count;

                let rel = r.religion.unwrap_or_else(|| "Không".to_string());
                *rel_map.entry(rel).or_insert(0) += r.count;
            }

            let mut eth_sorted: Vec<(String, i64)> = eth_map.into_iter().collect();
            eth_sorted.sort_by(|a, b| b.1.cmp(&a.1).then_with(|| a.0.cmp(&b.0)));
            let top_ethnicity = eth_sorted
                .into_iter()
                .next()
                .map(|(name, _)| name)
                .unwrap_or_else(|| "Kinh".to_string());

            let mut rel_sorted: Vec<(String, i64)> = rel_map.into_iter().collect();
            rel_sorted.sort_by(|a, b| b.1.cmp(&a.1).then_with(|| a.0.cmp(&b.0)));
            let top_religion = rel_sorted
                .into_iter()
                .next()
                .map(|(name, _)| name)
                .unwrap_or_else(|| "Không".to_string());

            let dtts_percentage = if citizen_count > 0 {
                ((dtts_count as f64 / citizen_count as f64) * 1000.0).round() / 10.0
            } else {
                0.0
            };

            VillageAnalyticsSummary {
                village_id: v.id,
                village_name: v.name,
                village_code: v.code,
                household_count: v.household_count,
                citizen_count,
                male_count,
                female_count,
                dtts_count,
                dtts_percentage,
                top_ethnicity,
                top_religion,
            }
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
