use serde::{Deserialize, Serialize};
use rayon::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct OfflineCitizenItem {
    pub id: String,
    pub household_id: Option<String>,
    pub household_number: Option<String>,
    pub full_name: String,
    pub relationship: Option<String>,
    pub dob: Option<String>,
    pub gender: Option<String>,
    pub cccd: Option<String>,
    pub phone: Option<String>,
    pub village_name: Option<String>,
    pub address: Option<String>,
}

#[tauri::command]
pub async fn search_citizens_offline(
    query: String,
    items: Vec<OfflineCitizenItem>,
) -> Result<Vec<OfflineCitizenItem>, String> {
    let clean_query = query.trim().to_lowercase();
    if clean_query.is_empty() {
        return Ok(items);
    }

    let unaccented_query = deunicode::deunicode(&clean_query);

    let matched: Vec<OfflineCitizenItem> = items
        .into_par_iter()
        .filter(|item| {
            let name_lower = item.full_name.to_lowercase();
            if name_lower.contains(&clean_query) {
                return true;
            }

            let name_unaccented = deunicode::deunicode(&name_lower);
            if name_unaccented.contains(&unaccented_query) {
                return true;
            }

            if let Some(ref cccd) = item.cccd {
                if cccd.contains(&clean_query) {
                    return true;
                }
            }

            if let Some(ref phone) = item.phone {
                if phone.contains(&clean_query) {
                    return true;
                }
            }

            if let Some(ref hh_num) = item.household_number {
                if hh_num.to_lowercase().contains(&clean_query) {
                    return true;
                }
            }

            if let Some(ref village) = item.village_name {
                let v_lower = village.to_lowercase();
                if v_lower.contains(&clean_query) || deunicode::deunicode(&v_lower).contains(&unaccented_query) {
                    return true;
                }
            }

            if let Some(ref addr) = item.address {
                let a_lower = addr.to_lowercase();
                if a_lower.contains(&clean_query) || deunicode::deunicode(&a_lower).contains(&unaccented_query) {
                    return true;
                }
            }

            false
        })
        .collect();

    Ok(matched)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_sample_dataset() -> Vec<OfflineCitizenItem> {
        vec![
            OfflineCitizenItem {
                id: "1".to_string(),
                household_id: Some("h1".to_string()),
                household_number: Some("HK-01".to_string()),
                full_name: "Nguyễn Văn An".to_string(),
                relationship: Some("Chủ hộ".to_string()),
                dob: Some("1980".to_string()),
                gender: Some("Nam".to_string()),
                cccd: Some("064080001234".to_string()),
                phone: Some("0905123456".to_string()),
                village_name: Some("Thôn 1".to_string()),
                address: Some("Đăk Hà, Kon Tum".to_string()),
            },
            OfflineCitizenItem {
                id: "2".to_string(),
                household_id: Some("h2".to_string()),
                household_number: Some("HK-02".to_string()),
                full_name: "Trần Thị Bình".to_string(),
                relationship: Some("Vợ".to_string()),
                dob: Some("1985".to_string()),
                gender: Some("Nữ".to_string()),
                cccd: Some("064185005678".to_string()),
                phone: None,
                village_name: Some("Thôn 2".to_string()),
                address: Some("Đường Hùng Vương".to_string()),
            },
            OfflineCitizenItem {
                id: "3".to_string(),
                household_id: Some("h3".to_string()),
                household_number: Some("HK-03".to_string()),
                full_name: "Lê Hoàng Đức".to_string(),
                relationship: Some("Con".to_string()),
                dob: Some("2005".to_string()),
                gender: Some("Nam".to_string()),
                cccd: Some("064205009999".to_string()),
                phone: Some("0912999888".to_string()),
                village_name: Some("Làng Kon Trang Long Loi".to_string()),
                address: Some("Xã Đăk Hà".to_string()),
            },
        ]
    }

    #[test]
    fn test_empty_query_returns_all() {
        tauri::async_runtime::block_on(async {
            let items = create_sample_dataset();
            let res = search_citizens_offline("   ".to_string(), items.clone()).await.unwrap();
            assert_eq!(res.len(), 3);
        });
    }

    #[test]
    fn test_search_vietnamese_name_accented_and_unaccented() {
        tauri::async_runtime::block_on(async {
            let items = create_sample_dataset();

            let res1 = search_citizens_offline("nguyen van an".to_string(), items.clone()).await.unwrap();
            assert_eq!(res1.len(), 1);
            assert_eq!(res1[0].id, "1");

            let res2 = search_citizens_offline("BINH".to_string(), items.clone()).await.unwrap();
            assert_eq!(res2.len(), 1);
            assert_eq!(res2[0].id, "2");

            let res3 = search_citizens_offline("hoang duc".to_string(), items.clone()).await.unwrap();
            assert_eq!(res3.len(), 1);
            assert_eq!(res3[0].id, "3");
        });
    }

    #[test]
    fn test_search_cccd_phone_household() {
        tauri::async_runtime::block_on(async {
            let items = create_sample_dataset();

            let res_cccd = search_citizens_offline("005678".to_string(), items.clone()).await.unwrap();
            assert_eq!(res_cccd.len(), 1);
            assert_eq!(res_cccd[0].id, "2");

            let res_phone = search_citizens_offline("0912999".to_string(), items.clone()).await.unwrap();
            assert_eq!(res_phone.len(), 1);
            assert_eq!(res_phone[0].id, "3");

            let res_hh = search_citizens_offline("hk-01".to_string(), items.clone()).await.unwrap();
            assert_eq!(res_hh.len(), 1);
            assert_eq!(res_hh[0].id, "1");
        });
    }

    #[test]
    fn test_search_village_and_address() {
        tauri::async_runtime::block_on(async {
            let items = create_sample_dataset();

            let res_village = search_citizens_offline("kon trang".to_string(), items.clone()).await.unwrap();
            assert_eq!(res_village.len(), 1);
            assert_eq!(res_village[0].id, "3");

            let res_addr = search_citizens_offline("hung vuong".to_string(), items.clone()).await.unwrap();
            assert_eq!(res_addr.len(), 1);
            assert_eq!(res_addr[0].id, "2");
        });
    }

    #[test]
    fn test_search_no_match() {
        tauri::async_runtime::block_on(async {
            let items = create_sample_dataset();
            let res = search_citizens_offline("KhongTimThayNhanKhauNay".to_string(), items).await.unwrap();
            assert_eq!(res.len(), 0);
        });
    }

    #[test]
    fn test_search_benchmark_scale() {
        tauri::async_runtime::block_on(async {
            let mut items = Vec::with_capacity(10_000);
            for i in 0..10_000 {
                items.push(OfflineCitizenItem {
                    id: format!("id-{}", i),
                    household_id: Some(format!("hh-{}", i / 4)),
                    household_number: Some(format!("HK-{:05}", i / 4)),
                    full_name: if i % 100 == 0 {
                        "A Thao".to_string()
                    } else if i % 2 == 0 {
                        format!("Nguyễn Văn Số {}", i)
                    } else {
                        format!("Trần Thị Mẫu {}", i)
                    },
                    relationship: Some("Thành viên".to_string()),
                    dob: Some("1990".to_string()),
                    gender: Some("Nam".to_string()),
                    cccd: Some(format!("064090{:06}", i)),
                    phone: Some(format!("090{:07}", i)),
                    village_name: Some("Thôn Đăk Kơ Mê".to_string()),
                    address: Some("Tổ dân phố 3".to_string()),
                });
            }

            let start = std::time::Instant::now();
            let res = search_citizens_offline("thao".to_string(), items).await.unwrap();
            let duration = start.elapsed();
            assert_eq!(res.len(), 100);
            assert!(duration.as_millis() < 500);
        });
    }
}