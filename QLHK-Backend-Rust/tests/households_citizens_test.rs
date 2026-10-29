use qlhk_backend_rust::{
    crypto::{decrypt_cccd, encrypt_cccd, hash_cccd, remove_accents},
    models::{
        citizen::{format_citizen, CitizenDb},
        household::{
            ChangeHeadRequest, MergeHouseholdRequest, SplitHouseholdRequest,
        },
    },
};
use uuid::Uuid;

#[test]
fn test_crypto_roundtrip_and_normalization() {
    let raw_cccd = "064095012345";
    let encrypted = encrypt_cccd(raw_cccd).expect("Encryption failed");
    assert_eq!(encrypted.last4, "2345");
    assert!(!encrypted.encrypted.is_empty());

    let decrypted = decrypt_cccd(&encrypted.encrypted).expect("Decryption failed");
    assert_eq!(decrypted, raw_cccd);

    let hash1 = hash_cccd(raw_cccd);
    let hash2 = hash_cccd(raw_cccd);
    assert_eq!(hash1, hash2);

    let unaccented = remove_accents("Nguyễn Văn A");
    assert_eq!(unaccented, "nguyen van a");

    let unaccented_d = remove_accents("Đinh Thị Điệp");
    assert_eq!(unaccented_d, "dinh thi diep");
}

#[test]
fn test_citizen_format_and_masking() {
    let plain_cccd = "064095009876";
    let encrypted = encrypt_cccd(plain_cccd).expect("Encryption failed");

    let citizen_db = CitizenDb {
        id: Uuid::new_v4(),
        household_id: Uuid::new_v4(),
        stt: Some(1),
        is_head: true,
        relationship: Some("Chủ hộ".to_string()),
        full_name: "Trần Văn Bình".to_string(),
        name_unaccented: Some("tran van binh".to_string()),
        dob: Some("1980-01-01".to_string()),
        gender: Some("Nam".to_string()),
        cccd: Some(encrypted.encrypted),
        cccd_hash: Some(encrypted.hash),
        cccd_last4: Some(encrypted.last4),
        ethnicity: Some("Kinh".to_string()),
        religion: Some("Không".to_string()),
        education: Some("12/12".to_string()),
        military_status: None,
        occupation: Some("Nông dân".to_string()),
        native_place: Some("Đắk Hà".to_string()),
        notes: None,
        huu_tri: None,
        age75plus: None,
        age70to74poor: None,
        bao_tro: None,
        huu_tuat_bao_hiem: None,
        nguoi_co_cong: None,
        pension_policies: None,
        version: 1,
        is_deleted: false,
        deleted_at: None,
        created_at: None,
        updated_at: None,
    };

    let formatted = format_citizen(citizen_db);
    assert!(formatted.has_cccd);
    assert_eq!(formatted.cccd_last4, Some("9876".to_string()));
    assert_eq!(formatted.cccd_masked, Some("••••••••9876".to_string()));
    assert_eq!(formatted.cccd, Some(plain_cccd.to_string()));
    assert_eq!(formatted.full_name, "Trần Văn Bình");
    assert!(formatted.is_head);
}

#[test]
fn test_citizen_format_without_cccd() {
    let citizen_db = CitizenDb {
        id: Uuid::new_v4(),
        household_id: Uuid::new_v4(),
        stt: Some(2),
        is_head: false,
        relationship: Some("Con".to_string()),
        full_name: "Trần Thị Mai".to_string(),
        name_unaccented: Some("tran thi mai".to_string()),
        dob: Some("2015-05-15".to_string()),
        gender: Some("Nữ".to_string()),
        cccd: None,
        cccd_hash: None,
        cccd_last4: None,
        ethnicity: Some("Kinh".to_string()),
        religion: Some("Không".to_string()),
        education: None,
        military_status: None,
        occupation: Some("Học sinh".to_string()),
        native_place: None,
        notes: None,
        huu_tri: None,
        age75plus: None,
        age70to74poor: None,
        bao_tro: None,
        huu_tuat_bao_hiem: None,
        nguoi_co_cong: None,
        pension_policies: None,
        version: 1,
        is_deleted: false,
        deleted_at: None,
        created_at: None,
        updated_at: None,
    };

    let formatted = format_citizen(citizen_db);
    assert!(!formatted.has_cccd);
    assert_eq!(formatted.cccd, None);
    assert_eq!(formatted.cccd_masked, None);
    assert_eq!(formatted.cccd_last4, None);
}

#[test]
fn test_requests_deserialization() {
    let json_split = serde_json::json!({
        "new_head_id": "00000000-0000-0000-0000-000000000001",
        "citizen_ids": [
            "00000000-0000-0000-0000-000000000001",
            "00000000-0000-0000-0000-000000000002"
        ],
        "new_book_number": "HGD-NEW-01",
        "new_address": "Thôn 1"
    });

    let split_req: SplitHouseholdRequest =
        serde_json::from_value(json_split).expect("Failed to deserialize split request");
    assert_eq!(split_req.citizen_ids.len(), 2);
    assert_eq!(split_req.new_book_number, Some("HGD-NEW-01".to_string()));

    let json_merge = serde_json::json!({
        "target_household_id": "00000000-0000-0000-0000-000000000003"
    });
    let merge_req: MergeHouseholdRequest =
        serde_json::from_value(json_merge).expect("Failed to deserialize merge request");
    assert_eq!(
        merge_req.target_household_id,
        Uuid::parse_str("00000000-0000-0000-0000-000000000003").unwrap()
    );

    let json_change_head = serde_json::json!({
        "new_head_id": "00000000-0000-0000-0000-000000000002"
    });
    let change_head_req: ChangeHeadRequest =
        serde_json::from_value(json_change_head).expect("Failed to deserialize change head request");
    assert_eq!(
        change_head_req.new_head_id,
        Uuid::parse_str("00000000-0000-0000-0000-000000000002").unwrap()
    );
}
