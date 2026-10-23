use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CountPct {
    pub count: i64,
    pub percentage: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NameCountPct {
    pub name: String,
    pub count: i64,
    pub percentage: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenderStats {
    pub male: CountPct,
    pub female: CountPct,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgeStats {
    pub under16: CountPct,
    pub youth: CountPct,
    #[serde(rename = "militaryAge")]
    pub military_age: CountPct,
    pub adult: CountPct,
    #[serde(rename = "workingAge")]
    pub working_age: CountPct,
    pub over60: CountPct,
    #[serde(rename = "unknownAge")]
    pub unknown_age: CountPct,
    #[serde(rename = "legalWorkforce")]
    pub legal_workforce: CountPct,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgePyramidStats {
    pub children: CountPct,
    pub working: CountPct,
    pub elderly: CountPct,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PolicySummaryStats {
    #[serde(rename = "chucthoTotal")]
    pub chuctho_total: i64,
    #[serde(rename = "chucthoReceived")]
    pub chuctho_received: i64,
    #[serde(rename = "htxhTotal")]
    pub htxh_total: i64,
    #[serde(rename = "htxhReceived")]
    pub htxh_received: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnalyticsOverviewData {
    #[serde(rename = "totalHouseholds")]
    pub total_households: i64,
    #[serde(rename = "totalCitizens")]
    pub total_citizens: i64,
    #[serde(rename = "averageHouseholdSize")]
    pub average_household_size: f64,
    pub gender: GenderStats,
    pub ethnicities: Vec<NameCountPct>,
    pub religions: Vec<NameCountPct>,
    #[serde(rename = "ageGroups")]
    pub age_groups: AgeStats,
    #[serde(rename = "agePyramid")]
    pub age_pyramid: AgePyramidStats,
    #[serde(rename = "policySummary")]
    pub policy_summary: PolicySummaryStats,
    pub military: Vec<NameCountPct>,
    pub educations: Vec<NameCountPct>,
    pub occupations: Vec<NameCountPct>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PolicyCategoryStats {
    pub total: i64,
    pub received: i64,
    pub unreceived: i64,
    pub pending: i64,
    pub rate: String,
    #[serde(rename = "byMilestone", skip_serializing_if = "Option::is_none")]
    pub by_milestone: Option<HashMap<String, i64>>,
    #[serde(rename = "byCategory", skip_serializing_if = "Option::is_none")]
    pub by_category: Option<HashMap<String, i64>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VillagePolicySummary {
    pub village_id: Uuid,
    pub village_name: String,
    #[serde(rename = "chucthoCount")]
    pub chuctho_count: i64,
    #[serde(rename = "htxhCount")]
    pub htxh_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PolicyAnalyticsData {
    pub chuctho: PolicyCategoryStats,
    pub htxh: PolicyCategoryStats,
    #[serde(rename = "byVillage")]
    pub by_village: Vec<VillagePolicySummary>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VillageAnalyticsSummary {
    pub village_id: Uuid,
    pub village_name: String,
    pub village_code: Option<String>,
    pub household_count: i64,
    pub citizen_count: i64,
    pub male_count: i64,
    pub female_count: i64,
}

pub fn calculate_percentages<T, F>(
    items: &[T],
    get_count: F,
    total_override: Option<i64>,
) -> Vec<f64>
where
    F: Fn(&T) -> i64,
{
    let len = items.len();
    if len == 0 {
        return Vec::new();
    }
    let total = total_override.unwrap_or_else(|| items.iter().map(&get_count).sum());
    if total <= 0 {
        return vec![0.0; len];
    }
    let target_sum = 1000i64;
    let mut current_sum = 0i64;
    let mut floor_tenths = vec![0i64; len];
    let mut remainders = vec![0.0f64; len];
    let mut eligible_indices = Vec::new();

    for (i, item) in items.iter().enumerate() {
        let count = get_count(item);
        if count > 0 {
            let raw_tenths = (count as f64 / total as f64) * target_sum as f64;
            let f = raw_tenths.floor() as i64;
            floor_tenths[i] = f;
            remainders[i] = raw_tenths - f as f64;
            current_sum += f;
            eligible_indices.push(i);
        }
    }
    let diff = target_sum - current_sum;
    if diff > 0 && (diff as usize) < len && !eligible_indices.is_empty() {
        eligible_indices.sort_by(|&a, &b| {
            remainders[b]
                .partial_cmp(&remainders[a])
                .unwrap_or(std::cmp::Ordering::Equal)
        });
        let limit = (diff as usize).min(eligible_indices.len());
        for &idx in &eligible_indices[..limit] {
            floor_tenths[idx] += 1;
        }
    }
    floor_tenths
        .into_iter()
        .map(|t| (t as f64 / 10.0 * 10.0).round() / 10.0)
        .collect()
}
