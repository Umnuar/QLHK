use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportCitizenRow {
    pub stt: usize,
    pub household_number: String,
    pub village_name: String,
    pub full_name: String,
    pub relationship: String,
    pub dob: String,
    pub gender: String,
    pub ethnicity: String,
    pub religion: String,
    pub cccd: String,
    pub education: String,
    pub occupation: String,
    pub permanent_address: String,
    pub current_address: String,
    pub notes: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportResult {
    pub success: bool,
    pub file_path: String,
    pub row_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParseRowItem {
    pub line_number: usize,
    pub household_number: String,
    pub full_name: String,
    pub relationship: String,
    pub dob: String,
    pub gender: String,
    pub cccd: String,
    pub ethnicity: String,
    pub religion: String,
    #[serde(default)]
    pub village_name: String,
    #[serde(default)]
    pub education: String,
    #[serde(default)]
    pub occupation: String,
    #[serde(default)]
    pub permanent_address: String,
    #[serde(default)]
    pub current_address: String,
    #[serde(default)]
    pub notes: String,
    pub is_valid: bool,
    pub warning: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParseResult {
    pub success: bool,
    pub total_rows: usize,
    pub valid_rows: usize,
    pub rows: Vec<ParseRowItem>,
    pub warnings: Vec<String>,
}

#[tauri::command]
pub async fn export_households_excel(
    file_path: String,
    rows: Vec<ExportCitizenRow>,
) -> Result<ExportResult, String> {
    use rust_xlsxwriter::*;

    if let Some(parent) = std::path::Path::new(&file_path).parent() {
        if !parent.as_os_str().is_empty() {
            let _ = std::fs::create_dir_all(parent);
        }
    }

    let mut workbook = Workbook::new();
    let worksheet = workbook.add_worksheet();

    let font_family = "Times New Roman";

    let title_format = Format::new()
        .set_font_name(font_family)
        .set_font_size(13.0)
        .set_bold()
        .set_align(FormatAlign::Center)
        .set_align(FormatAlign::VerticalCenter);

    let sub_format = Format::new()
        .set_font_name(font_family)
        .set_font_size(11.0)
        .set_bold()
        .set_align(FormatAlign::Center)
        .set_align(FormatAlign::VerticalCenter);

    let header_format = Format::new()
        .set_font_name(font_family)
        .set_font_size(11.0)
        .set_bold()
        .set_background_color(Color::RGB(0xE0F2FE))
        .set_border(FormatBorder::Thin)
        .set_align(FormatAlign::Center)
        .set_align(FormatAlign::VerticalCenter);

    let data_format = Format::new()
        .set_font_name(font_family)
        .set_font_size(11.0)
        .set_border(FormatBorder::Thin)
        .set_align(FormatAlign::Left)
        .set_align(FormatAlign::VerticalCenter);

    let center_format = Format::new()
        .set_font_name(font_family)
        .set_font_size(11.0)
        .set_border(FormatBorder::Thin)
        .set_align(FormatAlign::Center)
        .set_align(FormatAlign::VerticalCenter);

    worksheet.merge_range(0, 0, 0, 4, "UBND HUYỆN ĐĂK HÀ", &sub_format).map_err(|e| e.to_string())?;
    worksheet.merge_range(1, 0, 1, 4, "CÔNG AN XÃ ĐĂK HÀ", &sub_format).map_err(|e| e.to_string())?;

    worksheet.merge_range(0, 6, 0, 14, "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", &sub_format).map_err(|e| e.to_string())?;
    worksheet.merge_range(1, 6, 1, 14, "Độc lập - Tự do - Hạnh phúc", &sub_format).map_err(|e| e.to_string())?;

    worksheet.merge_range(3, 0, 3, 14, "DANH SÁCH HỘ GIA ĐÌNH VÀ NHÂN KHẨU", &title_format).map_err(|e| e.to_string())?;

    let headers = [
        ("STT", 6.0),
        ("Số sổ hộ", 14.0),
        ("Thôn/Xóm", 16.0),
        ("Họ và tên", 24.0),
        ("Quan hệ với chủ hộ", 18.0),
        ("Ngày sinh", 14.0),
        ("Giới tính", 10.0),
        ("Dân tộc", 12.0),
        ("Tôn giáo", 12.0),
        ("Số CCCD", 16.0),
        ("Trình độ", 14.0),
        ("Nghề nghiệp", 18.0),
        ("Nơi thường trú", 26.0),
        ("Nơi ở hiện nay", 26.0),
        ("Ghi chú", 20.0),
    ];

    for (col_idx, (header, width)) in headers.iter().enumerate() {
        worksheet.write_string_with_format(5, col_idx as u16, *header, &header_format).map_err(|e| e.to_string())?;
        worksheet.set_column_width(col_idx as u16, *width).map_err(|e| e.to_string())?;
    }

    for (row_idx, row) in rows.iter().enumerate() {
        let excel_row = (6 + row_idx) as u32;
        worksheet.write_number_with_format(excel_row, 0, row.stt as f64, &center_format).map_err(|e| e.to_string())?;
        worksheet.write_string_with_format(excel_row, 1, &row.household_number, &center_format).map_err(|e| e.to_string())?;
        worksheet.write_string_with_format(excel_row, 2, &row.village_name, &data_format).map_err(|e| e.to_string())?;
        worksheet.write_string_with_format(excel_row, 3, &row.full_name, &data_format).map_err(|e| e.to_string())?;
        worksheet.write_string_with_format(excel_row, 4, &row.relationship, &center_format).map_err(|e| e.to_string())?;
        worksheet.write_string_with_format(excel_row, 5, &row.dob, &center_format).map_err(|e| e.to_string())?;
        worksheet.write_string_with_format(excel_row, 6, &row.gender, &center_format).map_err(|e| e.to_string())?;
        worksheet.write_string_with_format(excel_row, 7, &row.ethnicity, &center_format).map_err(|e| e.to_string())?;
        worksheet.write_string_with_format(excel_row, 8, &row.religion, &center_format).map_err(|e| e.to_string())?;
        worksheet.write_string_with_format(excel_row, 9, &row.cccd, &center_format).map_err(|e| e.to_string())?;
        worksheet.write_string_with_format(excel_row, 10, &row.education, &data_format).map_err(|e| e.to_string())?;
        worksheet.write_string_with_format(excel_row, 11, &row.occupation, &data_format).map_err(|e| e.to_string())?;
        worksheet.write_string_with_format(excel_row, 12, &row.permanent_address, &data_format).map_err(|e| e.to_string())?;
        worksheet.write_string_with_format(excel_row, 13, &row.current_address, &data_format).map_err(|e| e.to_string())?;
        worksheet.write_string_with_format(excel_row, 14, &row.notes, &data_format).map_err(|e| e.to_string())?;
    }

    workbook.save(&file_path).map_err(|e| e.to_string())?;

    Ok(ExportResult {
        success: true,
        file_path,
        row_count: rows.len(),
    })
}

#[tauri::command]
pub async fn parse_excel_population(file_path: String) -> Result<ParseResult, String> {
    use calamine::{open_workbook_auto, Data, Reader};
    use rayon::prelude::*;

    let mut workbook = open_workbook_auto(&file_path).map_err(|e| e.to_string())?;
    let sheet_names = workbook.sheet_names().to_vec();
    if sheet_names.is_empty() {
        return Err("File Excel không có sheet nào".to_string());
    }

    let range = match workbook.worksheet_range(&sheet_names[0]) {
        Ok(r) => r,
        Err(e) => return Err(e.to_string()),
    };

    let all_rows: Vec<Vec<String>> = range
        .rows()
        .map(|row| {
            row.iter()
                .map(|cell| match cell {
                    Data::String(s) => s.trim().to_string(),
                    Data::Float(f) => {
                        if f.fract() == 0.0 {
                            format!("{:.0}", f)
                        } else {
                            format!("{}", f)
                        }
                    }
                    Data::Int(i) => i.to_string(),
                    Data::DateTime(d) => d.to_string(),
                    Data::Bool(b) => b.to_string(),
                    _ => String::new(),
                })
                .collect()
        })
        .collect();

    let mut header_index = 0;
    for (i, row) in all_rows.iter().take(20).enumerate() {
        let row_str = row.join(" ").to_lowercase();
        if row_str.contains("họ và tên")
            || row_str.contains("họ tên")
            || row_str.contains("họ tên khai sinh")
            || (row_str.contains("quan hệ") && row_str.contains("ngày sinh"))
        {
            header_index = i;
            break;
        }
    }

    let mut col_household: Option<usize> = None;
    let mut col_village: Option<usize> = None;
    let mut col_name: Option<usize> = None;
    let mut col_relationship: Option<usize> = None;
    let mut col_dob: Option<usize> = None;
    let mut col_gender: Option<usize> = None;
    let mut col_ethnicity: Option<usize> = None;
    let mut col_religion: Option<usize> = None;
    let mut col_cccd: Option<usize> = None;
    let mut col_education: Option<usize> = None;
    let mut col_occupation: Option<usize> = None;
    let mut col_permanent: Option<usize> = None;
    let mut col_current: Option<usize> = None;
    let mut col_notes: Option<usize> = None;

    if let Some(header_row) = all_rows.get(header_index) {
        for (idx, cell) in header_row.iter().enumerate() {
            let lower = cell.to_lowercase();
            if lower.contains("số hộ") || lower.contains("sổ hộ") || lower.contains("mã hộ") {
                col_household = Some(idx);
            } else if lower.contains("thôn") || lower.contains("xóm") || lower.contains("bản") || lower.contains("tổ dân phố") {
                col_village = Some(idx);
            } else if lower.contains("họ và tên") || lower.contains("họ tên") || lower.contains("tên khai sinh") {
                col_name = Some(idx);
            } else if lower.contains("quan hệ") || lower.contains("chủ hộ") {
                col_relationship = Some(idx);
            } else if lower.contains("ngày sinh") || lower.contains("năm sinh") || lower.contains("tháng năm sinh") {
                col_dob = Some(idx);
            } else if lower.contains("giới tính") || lower == "nam" || lower == "nữ" {
                col_gender = Some(idx);
            } else if lower.contains("dân tộc") {
                col_ethnicity = Some(idx);
            } else if lower.contains("tôn giáo") {
                col_religion = Some(idx);
            } else if lower.contains("cccd") || lower.contains("cmnd") || lower.contains("căn cước") || lower.contains("định danh") {
                col_cccd = Some(idx);
            } else if lower.contains("trình độ") || lower.contains("học vấn") {
                col_education = Some(idx);
            } else if lower.contains("nghề nghiệp") || lower.contains("công việc") {
                col_occupation = Some(idx);
            } else if lower.contains("thường trú") {
                col_permanent = Some(idx);
            } else if lower.contains("hiện nay") || lower.contains("tạm trú") || lower.contains("chỗ ở") {
                col_current = Some(idx);
            } else if lower.contains("ghi chú") {
                col_notes = Some(idx);
            }
        }
    }

    let data_rows = if all_rows.len() > header_index + 1 {
        &all_rows[header_index + 1..]
    } else {
        &[]
    };

    let parsed_items: Vec<ParseRowItem> = data_rows
        .par_iter()
        .enumerate()
        .filter_map(|(idx, row)| {
            if row.iter().all(|c| c.trim().is_empty()) {
                return None;
            }

            let get_value = |detected: Option<usize>, fallback: usize| -> String {
                let col = detected.unwrap_or(fallback);
                row.get(col).cloned().unwrap_or_default()
            };

            let line_number = header_index + 2 + idx;
            let household_number = get_value(col_household, 1);
            let village_name = get_value(col_village, 2);
            let full_name = get_value(col_name, 3);
            let relationship = get_value(col_relationship, 4);
            let dob = get_value(col_dob, 5);
            let gender = get_value(col_gender, 6);
            let ethnicity = get_value(col_ethnicity, 7);
            let religion = get_value(col_religion, 8);
            let raw_cccd = get_value(col_cccd, 9);
            let education = get_value(col_education, 10);
            let occupation = get_value(col_occupation, 11);
            let permanent_address = get_value(col_permanent, 12);
            let current_address = get_value(col_current, 13);
            let notes = get_value(col_notes, 14);

            let clean_name = full_name.trim().to_string();
            let clean_cccd: String = raw_cccd
                .chars()
                .filter(|c| !c.is_whitespace() && *c != '-' && *c != '.')
                .collect();

            let mut warnings_for_row = Vec::new();
            let mut is_valid = true;

            if clean_name.is_empty() {
                is_valid = false;
                warnings_for_row.push("Thiếu họ và tên".to_string());
            }

            if !clean_cccd.is_empty() {
                if clean_cccd.len() != 12 && clean_cccd.len() != 9 {
                    warnings_for_row.push(format!(
                        "Số CCCD không đúng độ dài ({} số, yêu cầu 12 chữ số)",
                        clean_cccd.len()
                    ));
                } else if !clean_cccd.chars().all(|c| c.is_ascii_digit()) {
                    warnings_for_row.push("Số CCCD chứa ký tự không hợp lệ".to_string());
                }
            }

            let warning = if warnings_for_row.is_empty() {
                None
            } else {
                Some(warnings_for_row.join("; "))
            };

            Some(ParseRowItem {
                line_number,
                household_number,
                full_name: clean_name,
                relationship,
                dob,
                gender,
                cccd: clean_cccd,
                ethnicity,
                religion,
                village_name,
                education,
                occupation,
                permanent_address,
                current_address,
                notes,
                is_valid,
                warning,
            })
        })
        .collect();

    let valid_count = parsed_items.iter().filter(|r| r.is_valid).count();
    let warnings: Vec<String> = parsed_items
        .iter()
        .filter_map(|r| r.warning.as_ref().map(|w| format!("Dòng {}: {}", r.line_number, w)))
        .collect();

    Ok(ParseResult {
        success: true,
        total_rows: parsed_items.len(),
        valid_rows: valid_count,
        rows: parsed_items,
        warnings,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_export_and_parse_excel() {
        tauri::async_runtime::block_on(async {
            let temp_dir = std::env::temp_dir();
            let file_path = temp_dir
                .join("test_qlhk_export_standard.xlsx")
                .to_string_lossy()
                .to_string();

            let rows = vec![
                ExportCitizenRow {
                    stt: 1,
                    household_number: "HK-001".to_string(),
                    village_name: "Thôn 1".to_string(),
                    full_name: "Nguyễn Văn An".to_string(),
                    relationship: "Chủ hộ".to_string(),
                    dob: "15/08/1980".to_string(),
                    gender: "Nam".to_string(),
                    ethnicity: "Kinh".to_string(),
                    religion: "Không".to_string(),
                    cccd: "064080001234".to_string(),
                    education: "12/12".to_string(),
                    occupation: "Nông nghiệp".to_string(),
                    permanent_address: "Thôn 1, Đăk Hà".to_string(),
                    current_address: "Thôn 1, Đăk Hà".to_string(),
                    notes: "Chính sách".to_string(),
                },
                ExportCitizenRow {
                    stt: 2,
                    household_number: "HK-001".to_string(),
                    village_name: "Thôn 1".to_string(),
                    full_name: "Trần Thị Bình".to_string(),
                    relationship: "Vợ".to_string(),
                    dob: "20/10/1982".to_string(),
                    gender: "Nữ".to_string(),
                    ethnicity: "Kinh".to_string(),
                    religion: "Không".to_string(),
                    cccd: "064082005678".to_string(),
                    education: "Đại học".to_string(),
                    occupation: "Giáo viên".to_string(),
                    permanent_address: "Thôn 1, Đăk Hà".to_string(),
                    current_address: "Thôn 1, Đăk Hà".to_string(),
                    notes: "".to_string(),
                },
            ];

            let export_res = export_households_excel(file_path.clone(), rows).await.unwrap();
            assert!(export_res.success);
            assert_eq!(export_res.row_count, 2);

            let parse_res = parse_excel_population(file_path.clone()).await.unwrap();
            assert!(parse_res.success);
            assert_eq!(parse_res.total_rows, 2);
            assert_eq!(parse_res.valid_rows, 2);
            assert_eq!(parse_res.warnings.len(), 0);

            assert_eq!(parse_res.rows[0].full_name, "Nguyễn Văn An");
            assert_eq!(parse_res.rows[0].cccd, "064080001234");
            assert_eq!(parse_res.rows[1].full_name, "Trần Thị Bình");
            assert_eq!(parse_res.rows[1].cccd, "064082005678");

            let _ = std::fs::remove_file(file_path);
        });
    }

    #[test]
    fn test_parse_detects_warnings() {
        tauri::async_runtime::block_on(async {
            let temp_dir = std::env::temp_dir();
            let file_path = temp_dir
                .join("test_qlhk_export_warnings.xlsx")
                .to_string_lossy()
                .to_string();

            let rows = vec![
                ExportCitizenRow {
                    stt: 1,
                    household_number: "HK-002".to_string(),
                    village_name: "Thôn 2".to_string(),
                    full_name: "".to_string(),
                    relationship: "Chủ hộ".to_string(),
                    dob: "1975".to_string(),
                    gender: "Nam".to_string(),
                    ethnicity: "Kinh".to_string(),
                    religion: "Không".to_string(),
                    cccd: "064075001122".to_string(),
                    education: "".to_string(),
                    occupation: "".to_string(),
                    permanent_address: "".to_string(),
                    current_address: "".to_string(),
                    notes: "".to_string(),
                },
                ExportCitizenRow {
                    stt: 2,
                    household_number: "HK-002".to_string(),
                    village_name: "Thôn 2".to_string(),
                    full_name: "Lê Văn Cường".to_string(),
                    relationship: "Con".to_string(),
                    dob: "2005".to_string(),
                    gender: "Nam".to_string(),
                    ethnicity: "Kinh".to_string(),
                    religion: "Không".to_string(),
                    cccd: "12345".to_string(),
                    education: "".to_string(),
                    occupation: "".to_string(),
                    permanent_address: "".to_string(),
                    current_address: "".to_string(),
                    notes: "".to_string(),
                },
            ];

            let export_res = export_households_excel(file_path.clone(), rows).await.unwrap();
            assert!(export_res.success);

            let parse_res = parse_excel_population(file_path.clone()).await.unwrap();
            assert!(parse_res.success);
            assert_eq!(parse_res.total_rows, 2);
            assert_eq!(parse_res.valid_rows, 1);
            assert_eq!(parse_res.warnings.len(), 2);

            assert!(!parse_res.rows[0].is_valid);
            assert!(parse_res.rows[0].warning.as_ref().unwrap().contains("Thiếu họ và tên"));

            assert!(parse_res.rows[1].is_valid);
            assert!(parse_res.rows[1].warning.as_ref().unwrap().contains("Số CCCD không đúng độ dài"));

            let _ = std::fs::remove_file(file_path);
        });
    }

    #[test]
    fn test_parse_rayon_multiple_rows() {
        tauri::async_runtime::block_on(async {
            let temp_dir = std::env::temp_dir();
            let file_path = temp_dir
                .join("test_qlhk_export_scale.xlsx")
                .to_string_lossy()
                .to_string();

            let mut rows = Vec::with_capacity(100);
            for i in 0..100 {
                rows.push(ExportCitizenRow {
                    stt: i + 1,
                    household_number: format!("HK-{:03}", i / 4),
                    village_name: "Thôn 3".to_string(),
                    full_name: format!("Công Dân Số {}", i + 1),
                    relationship: if i % 4 == 0 { "Chủ hộ".to_string() } else { "Thành viên".to_string() },
                    dob: "1990".to_string(),
                    gender: if i % 2 == 0 { "Nam".to_string() } else { "Nữ".to_string() },
                    ethnicity: "Kinh".to_string(),
                    religion: "Không".to_string(),
                    cccd: format!("064090{:06}", i),
                    education: "12/12".to_string(),
                    occupation: "Tự do".to_string(),
                    permanent_address: "Thôn 3".to_string(),
                    current_address: "Thôn 3".to_string(),
                    notes: "".to_string(),
                });
            }

            let export_res = export_households_excel(file_path.clone(), rows).await.unwrap();
            assert_eq!(export_res.row_count, 100);

            let parse_res = parse_excel_population(file_path.clone()).await.unwrap();
            assert_eq!(parse_res.total_rows, 100);
            assert_eq!(parse_res.valid_rows, 100);
            assert_eq!(parse_res.warnings.len(), 0);

            let _ = std::fs::remove_file(file_path);
        });
    }
}
