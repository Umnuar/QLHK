use qlhk_backend_rust::models::{
    analytics::calculate_percentages,
    policy::{compute_chuctho_milestones, extract_birth_year, parse_dob_value},
};

#[test]
fn test_chuctho_milestone_calculation() {
    let m62 = compute_chuctho_milestones(62);
    assert_eq!(m62.age60, "x");
    assert_eq!(m62.age65, "");
    assert_eq!(m62.age100, "");

    let m67 = compute_chuctho_milestones(67);
    assert_eq!(m67.age60, "");
    assert_eq!(m67.age65, "x");
    assert_eq!(m67.age70, "");

    let m72 = compute_chuctho_milestones(72);
    assert_eq!(m72.age70, "x");

    let m77 = compute_chuctho_milestones(77);
    assert_eq!(m77.age75, "x");

    let m83 = compute_chuctho_milestones(83);
    assert_eq!(m83.age80, "x");

    let m88 = compute_chuctho_milestones(88);
    assert_eq!(m88.age85, "x");

    let m91 = compute_chuctho_milestones(91);
    assert_eq!(m91.age90, "x");

    let m98 = compute_chuctho_milestones(98);
    assert_eq!(m98.age95, "x");

    let m100 = compute_chuctho_milestones(100);
    assert_eq!(m100.age100, "x");
    assert_eq!(m100.age_over_100, "");

    let m105 = compute_chuctho_milestones(105);
    assert_eq!(m105.age100, "");
    assert_eq!(m105.age_over_100, "x");

    let m59 = compute_chuctho_milestones(59);
    assert_eq!(m59.age60, "");
    assert_eq!(m59.age_over_100, "");
}

#[test]
fn test_dob_parsing() {
    let parsed1 = parse_dob_value("15/07/1960").unwrap();
    assert_eq!(parsed1.0, "15/07/1960");
    assert_eq!(parsed1.1, 1960);

    let parsed2 = parse_dob_value("5-12-1954").unwrap();
    assert_eq!(parsed2.0, "05/12/1954");
    assert_eq!(parsed2.1, 1954);

    let parsed3 = parse_dob_value("1940").unwrap();
    assert_eq!(parsed3.0, "01/01/1940");
    assert_eq!(parsed3.1, 1940);

    let year = extract_birth_year("20/11/1955").unwrap();
    assert_eq!(year, 1955);
}

#[test]
fn test_largest_remainder_percentages() {
    let counts = [10i64, 10, 10];
    let pcts = calculate_percentages(&counts, |&c| c, Some(30));
    let sum: f64 = pcts.iter().sum();
    assert!((sum - 100.0).abs() < 0.001);

    let counts2 = [333i64, 333, 334];
    let pcts2 = calculate_percentages(&counts2, |&c| c, Some(1000));
    let sum2: f64 = pcts2.iter().sum();
    assert!((sum2 - 100.0).abs() < 0.001);
}

#[test]
fn test_retiree_occupation_matching() {
    let check_retiree = |raw: &str| -> bool {
        let occ_lower = raw.to_lowercase();
        let occ_unacc = qlhk_backend_rust::crypto::remove_accents(raw).to_lowercase();
        occ_lower.contains("hưu") || occ_unacc.contains("huu")
    };

    assert!(check_retiree("Hưu trí"));
    assert!(check_retiree("hưu trí"));
    assert!(check_retiree("Cán bộ hưu trí"));
    assert!(check_retiree("Nghỉ hưu"));
    assert!(check_retiree("Cán bộ nghỉ hưu"));
    assert!(check_retiree("Hưu"));
    assert!(check_retiree("huu tri"));
    assert!(check_retiree("nghi huu"));
    assert!(check_retiree("can bo huu"));

    assert!(!check_retiree("Làm nông"));
    assert!(!check_retiree("Công nhân"));
    assert!(!check_retiree("Buôn bán"));
    assert!(!check_retiree("Giáo viên"));
    assert!(!check_retiree(""));
}

#[test]
fn test_all_ages_over_60_have_milestone() {
    for age in 60..=120 {
        let m = compute_chuctho_milestones(age);
        let has_milestone = !m.age60.is_empty()
            || !m.age65.is_empty()
            || !m.age70.is_empty()
            || !m.age75.is_empty()
            || !m.age80.is_empty()
            || !m.age85.is_empty()
            || !m.age90.is_empty()
            || !m.age95.is_empty()
            || !m.age100.is_empty()
            || !m.age_over_100.is_empty();
        assert!(has_milestone, "Age {} must have a milestone marked", age);
    }

    for age in 0..60 {
        let m = compute_chuctho_milestones(age);
        let has_milestone = !m.age60.is_empty()
            || !m.age65.is_empty()
            || !m.age70.is_empty()
            || !m.age75.is_empty()
            || !m.age80.is_empty()
            || !m.age85.is_empty()
            || !m.age90.is_empty()
            || !m.age95.is_empty()
            || !m.age100.is_empty()
            || !m.age_over_100.is_empty();
        assert!(!has_milestone, "Age {} under 60 must not have any milestone", age);
    }
}

#[test]
fn test_policy_handler_retiree_occupation() {
    use qlhk_backend_rust::handlers::policies::is_retiree_occupation;

    assert!(is_retiree_occupation("Hưu trí"));
    assert!(is_retiree_occupation("hưu trí"));
    assert!(is_retiree_occupation("Cán bộ hưu"));
    assert!(is_retiree_occupation("Nghỉ hưu"));
    assert!(is_retiree_occupation("huu tri"));
    assert!(is_retiree_occupation("nghi huu"));
    assert!(is_retiree_occupation("Lương hưu BHXH"));
    assert!(is_retiree_occupation("Nghỉ mất sức"));

    assert!(!is_retiree_occupation("Nông nghiệp"));
    assert!(!is_retiree_occupation("Học sinh"));
    assert!(!is_retiree_occupation("Buôn bán"));
}

#[test]
fn test_extract_occupation_from_json() {
    use qlhk_backend_rust::handlers::policies::extract_occupation_from_json;

    let json1 = r#"{"occupation":"Hưu trí","full_name":"Nguyen Van A"}"#;
    assert_eq!(extract_occupation_from_json(json1).as_deref(), Some("Hưu trí"));

    let json2 = r#"{"nghe_nghiep":"Nghỉ hưu","full_name":"Nguyen Van B"}"#;
    assert_eq!(extract_occupation_from_json(json2).as_deref(), Some("Nghỉ hưu"));

    let json3 = r#"{"ngheNghiep":"huu tri","full_name":"Nguyen Van C"}"#;
    assert_eq!(extract_occupation_from_json(json3).as_deref(), Some("huu tri"));

    let json4 = r#"{"citizen":{"occupation":"Cán bộ hưu"}}"#;
    assert_eq!(extract_occupation_from_json(json4).as_deref(), Some("Cán bộ hưu"));

    let json5 = r#"{"full_name":"Nguyen Van D"}"#;
    assert_eq!(extract_occupation_from_json(json5), None);

    let json_invalid = "invalid json";
    assert_eq!(extract_occupation_from_json(json_invalid), None);
}

#[test]
fn test_retiree_audit_transition_detection() {
    use qlhk_backend_rust::handlers::policies::{extract_occupation_from_json, is_retiree_occupation};

    let check_transition = |old_json: Option<&str>, new_json: Option<&str>| -> bool {
        let old_occ = old_json.and_then(extract_occupation_from_json);
        let new_occ = new_json.and_then(extract_occupation_from_json);

        let old_is_retiree = old_occ.as_deref().map(is_retiree_occupation).unwrap_or(false);
        let new_is_retiree = new_occ.as_deref().map(is_retiree_occupation).unwrap_or(false);

        new_is_retiree != old_is_retiree
    };

    let farmer = r#"{"occupation":"Làm nông"}"#;
    let retiree = r#"{"occupation":"Hưu trí"}"#;
    let teacher = r#"{"occupation":"Giáo viên"}"#;

    assert!(check_transition(Some(farmer), Some(retiree)));
    assert!(check_transition(None, Some(retiree)));
    assert!(check_transition(Some(retiree), Some(teacher)));
    assert!(check_transition(Some(retiree), None));

    assert!(!check_transition(Some(farmer), Some(teacher)));
    assert!(!check_transition(Some(retiree), Some(r#"{"occupation":"Nghỉ hưu"}"#)));
    assert!(!check_transition(None, Some(farmer)));
}
