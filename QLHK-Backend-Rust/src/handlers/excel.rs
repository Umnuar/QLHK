use axum::{
    extract::{Extension, Multipart, Query, State},
    http::{header, HeaderMap, HeaderValue, StatusCode},
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use calamine::{open_workbook_from_rs, Data, Reader, Xlsx};
use rust_xlsxwriter::{Color, Format, FormatAlign, FormatBorder, Workbook};
use serde_json::json;
use sqlx::QueryBuilder;
use std::collections::HashMap;
use std::io::Cursor;
use uuid::Uuid;

use crate::{
    crypto::{decrypt_cccd, encrypt_cccd, hash_cccd, remove_accents},
    middlewares::auth::Claims,
    models::excel::{
        ChucthoExportQuery, ExcelCitizenRow, ExportChucthoRow, ExportCitizenRow, ExportQuery,
        ImportQuery,
    },
    state::AppState,
};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/import", post(import_excel))
        .route("/export", get(export_excel))
        .route("/template", get(download_template))
        .route("/export/chuctho", get(export_chuctho))
}

fn cell_to_string(cell: &Data) -> String {
    match cell {
        Data::Empty => String::new(),
        Data::String(s) => s.trim().to_string(),
        Data::Float(f) => {
            if f.fract() == 0.0 {
                format!("{:.0}", f)
            } else {
                format!("{}", f)
            }
        }
        Data::Int(i) => format!("{}", i),
        Data::Bool(b) => format!("{}", b),
        Data::DateTime(dt) => format!("{}", dt),
        Data::DateTimeIso(s) => s.clone(),
        Data::DurationIso(s) => s.clone(),
        Data::Error(e) => format!("{:?}", e),
    }
}

pub async fn import_excel(
    State(state): State<AppState>,
    claims_ext: Option<Extension<Claims>>,
    Query(query): Query<ImportQuery>,
    mut multipart: Multipart,
) -> Response {
    let claims = claims_ext.map(|Extension(c)| c);
    let mut query_village_id = query.village_id.or(query.village_id_camel);
    let mut file_bytes: Option<Vec<u8>> = None;

    while let Ok(Some(field)) = multipart.next_field().await {
        let name = field.name().unwrap_or_default().to_string();
        if name == "file" || name == "excel" || name == "document" || field.file_name().is_some() {
            if let Ok(bytes) = field.bytes().await {
                file_bytes = Some(bytes.to_vec());
            }
        } else if name == "village_id" || name == "villageId" {
            if let Ok(text) = field.text().await {
                if let Ok(parsed) = Uuid::parse_str(text.trim()) {
                    query_village_id = Some(parsed);
                }
            }
        }
    }

    let bytes = match file_bytes {
        Some(b) if !b.is_empty() => b,
        _ => {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({
                    "success": false,
                    "imported_count": 0,
                    "errors": ["Không tìm thấy tệp dữ liệu Excel tải lên"]
                })),
            )
                .into_response();
        }
    };

    let target_village_id = if let Some(vid) = query_village_id {
        Some(vid)
    } else if let Some(ref c) = claims {
        c.village_id.as_deref().and_then(|v| Uuid::parse_str(v).ok())
    } else {
        None
    };

    let resolved_village_id = match target_village_id {
        Some(v) => v,
        None => {
            let first_village: Option<(Uuid,)> =
                sqlx::query_as("SELECT id FROM qlhk.villages ORDER BY code ASC LIMIT 1")
                    .fetch_optional(&state.pool)
                    .await
                    .unwrap_or(None);
            first_village.map(|(id,)| id).unwrap_or_else(Uuid::new_v4)
        }
    };

    let mut workbook: Xlsx<_> = match open_workbook_from_rs(Cursor::new(bytes)) {
        Ok(wb) => wb,
        Err(e) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({
                    "success": false,
                    "imported_count": 0,
                    "errors": [format!("Không thể đọc tệp Excel: {}", e)]
                })),
            )
                .into_response();
        }
    };

    let sheet_names = workbook.sheet_names();
    if sheet_names.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({
                "success": false,
                "imported_count": 0,
                "errors": ["Tệp Excel không chứa trang tính hợp lệ"]
            })),
        )
            .into_response();
    }

    let range = match workbook.worksheet_range(&sheet_names[0]) {
        Ok(r) => r,
        Err(e) => {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({
                    "success": false,
                    "imported_count": 0,
                    "errors": [format!("Không thể đọc nội dung bảng tính: {}", e)]
                })),
            )
                .into_response();
        }
    };

    let mut header_row_idx = 0;
    let mut col_map: HashMap<String, usize> = HashMap::new();
    let rows_vec: Vec<_> = range.rows().collect();

    for (row_idx, row) in rows_vec.iter().enumerate() {
        let mut found_header = false;
        for cell in row.iter() {
            let val = cell_to_string(cell);
            let unacc = remove_accents(&val);
            if unacc.contains("ho va ten") || unacc.contains("ho ten") {
                found_header = true;
                break;
            }
        }
        if found_header {
            header_row_idx = row_idx;
            for (col_idx, cell) in row.iter().enumerate() {
                let val = cell_to_string(cell);
                let unacc = remove_accents(&val);
                if unacc.contains("stt") {
                    col_map.insert("stt".to_string(), col_idx);
                } else if unacc.contains("so so")
                    || unacc.contains("so ho khau")
                    || unacc.contains("ma ho")
                {
                    col_map.insert("book_number".to_string(), col_idx);
                } else if unacc.contains("ho va ten") || unacc.contains("ho ten") {
                    col_map.insert("full_name".to_string(), col_idx);
                } else if unacc.contains("quan he") {
                    col_map.insert("relationship".to_string(), col_idx);
                } else if unacc.contains("ngay sinh") || unacc.contains("nam sinh") {
                    col_map.insert("dob".to_string(), col_idx);
                } else if unacc.contains("gioi tinh") {
                    col_map.insert("gender".to_string(), col_idx);
                } else if unacc.contains("dan toc") {
                    col_map.insert("ethnicity".to_string(), col_idx);
                } else if unacc.contains("ton giao") {
                    col_map.insert("religion".to_string(), col_idx);
                } else if unacc.contains("cccd")
                    || unacc.contains("cmnd")
                    || unacc.contains("dinh danh")
                {
                    col_map.insert("cccd".to_string(), col_idx);
                } else if unacc.contains("hoc van") || unacc.contains("trinh do") {
                    col_map.insert("education".to_string(), col_idx);
                } else if unacc.contains("nghe nghiep") {
                    col_map.insert("occupation".to_string(), col_idx);
                } else if unacc.contains("noi lam viec") {
                    col_map.insert("workplace".to_string(), col_idx);
                } else if unacc.contains("que quan") {
                    col_map.insert("native_place".to_string(), col_idx);
                } else if unacc.contains("dia chi")
                    || unacc.contains("thuong tru")
                    || unacc.contains("noi o")
                {
                    col_map.insert("address".to_string(), col_idx);
                } else if unacc.contains("ghi chu") {
                    col_map.insert("notes".to_string(), col_idx);
                }
            }
            break;
        }
    }

    if !col_map.contains_key("full_name") {
        col_map.insert("stt".to_string(), 0);
        col_map.insert("book_number".to_string(), 1);
        col_map.insert("full_name".to_string(), 2);
        col_map.insert("relationship".to_string(), 3);
        col_map.insert("dob".to_string(), 4);
        col_map.insert("gender".to_string(), 5);
        col_map.insert("cccd".to_string(), 6);
        col_map.insert("ethnicity".to_string(), 7);
        col_map.insert("religion".to_string(), 8);
        col_map.insert("education".to_string(), 9);
        col_map.insert("occupation".to_string(), 10);
        col_map.insert("workplace".to_string(), 11);
        col_map.insert("native_place".to_string(), 12);
        col_map.insert("address".to_string(), 13);
        col_map.insert("notes".to_string(), 14);
    }

    let mut parsed_rows: Vec<ExcelCitizenRow> = Vec::new();
    let mut last_book_number = String::new();
    let mut last_address = String::new();

    for row in rows_vec.iter().skip(header_row_idx + 1) {
        let get_val = |key: &str| -> String {
            col_map
                .get(key)
                .and_then(|idx| row.get(*idx))
                .map(cell_to_string)
                .unwrap_or_default()
        };

        let full_name = get_val("full_name");
        if full_name.trim().is_empty() {
            continue;
        }

        let stt_raw = get_val("stt");
        let stt = stt_raw.parse::<i32>().ok();

        let mut book_number = get_val("book_number");
        if book_number.trim().is_empty() {
            if !last_book_number.is_empty() {
                book_number = last_book_number.clone();
            } else {
                book_number = format!("HK-{}", &Uuid::new_v4().to_string()[..8].to_uppercase());
            }
        } else {
            last_book_number = book_number.clone();
        }

        let mut address = get_val("address");
        if address.trim().is_empty() {
            address = last_address.clone();
        } else {
            last_address = address.clone();
        }

        let relationship = get_val("relationship");
        let dob = get_val("dob");
        let gender = get_val("gender");
        let ethnicity = get_val("ethnicity");
        let religion = get_val("religion");
        let cccd = get_val("cccd");
        let education = get_val("education");
        let occupation = get_val("occupation");
        let workplace = get_val("workplace");
        let native_place = get_val("native_place");
        let notes = get_val("notes");

        parsed_rows.push(ExcelCitizenRow {
            stt,
            book_number,
            full_name,
            relationship: if relationship.is_empty() {
                None
            } else {
                Some(relationship)
            },
            dob: if dob.is_empty() { None } else { Some(dob) },
            gender: if gender.is_empty() {
                None
            } else {
                Some(gender)
            },
            ethnicity: if ethnicity.is_empty() {
                None
            } else {
                Some(ethnicity)
            },
            religion: if religion.is_empty() {
                None
            } else {
                Some(religion)
            },
            cccd: if cccd.is_empty() { None } else { Some(cccd) },
            education: if education.is_empty() {
                None
            } else {
                Some(education)
            },
            occupation: if occupation.is_empty() {
                None
            } else {
                Some(occupation)
            },
            workplace: if workplace.is_empty() {
                None
            } else {
                Some(workplace)
            },
            native_place: if native_place.is_empty() {
                None
            } else {
                Some(native_place)
            },
            address: if address.is_empty() {
                None
            } else {
                Some(address)
            },
            notes: if notes.is_empty() { None } else { Some(notes) },
        });
    }

    if parsed_rows.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({
                "success": false,
                "imported_count": 0,
                "errors": ["Không tìm thấy dòng dữ liệu nhân khẩu nào trong tệp"]
            })),
        )
            .into_response();
    }

    let mut tx = match state.pool.begin().await {
        Ok(t) => t,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({
                    "success": false,
                    "imported_count": 0,
                    "errors": [format!("Không thể mở giao dịch cơ sở dữ liệu: {}", e)]
                })),
            )
                .into_response();
        }
    };

    let mut imported_count: usize = 0;
    let mut errors: Vec<String> = Vec::new();
    let mut household_cache: HashMap<String, Uuid> = HashMap::new();

    for row in parsed_rows {
        let household_id = if let Some(hid) = household_cache.get(&row.book_number) {
            *hid
        } else {
            let existing: Option<(Uuid,)> = sqlx::query_as(
                "SELECT id FROM qlhk.households WHERE (village_id = $1 AND book_number = $2) OR book_number = $2 LIMIT 1",
            )
            .bind(resolved_village_id)
            .bind(&row.book_number)
            .fetch_optional(&mut *tx)
            .await
            .unwrap_or(None);

            let hid = match existing {
                Some((id,)) => {
                    if let Some(ref addr) = row.address {
                        let _ = sqlx::query(
                            "UPDATE qlhk.households SET address = COALESCE($1, address), updated_at = NOW() WHERE id = $2",
                        )
                        .bind(addr)
                        .bind(id)
                        .execute(&mut *tx)
                        .await;
                    }
                    id
                }
                None => {
                    let new_id = Uuid::new_v4();
                    let res = sqlx::query(
                        "INSERT INTO qlhk.households (id, village_id, book_number, address, status, version, is_deleted, created_at, updated_at) VALUES ($1, $2, $3, $4, 'active', 1, false, NOW(), NOW())",
                    )
                    .bind(new_id)
                    .bind(resolved_village_id)
                    .bind(&row.book_number)
                    .bind(row.address.as_deref())
                    .execute(&mut *tx)
                    .await;

                    if let Err(e) = res {
                        errors.push(format!("Lỗi tạo hộ khẩu {}: {}", row.book_number, e));
                        continue;
                    }
                    new_id
                }
            };
            household_cache.insert(row.book_number.clone(), hid);
            hid
        };

        let name_unaccented = remove_accents(&row.full_name);
        let rel_unaccented = row
            .relationship
            .as_deref()
            .map(|r| remove_accents(&r.to_lowercase()))
            .unwrap_or_default();
        let is_head = rel_unaccented == "chu ho"
            || rel_unaccented == "chu_ho"
            || rel_unaccented.contains("chu ho");

        let (cccd_encrypted, cccd_hash, cccd_last4) = if let Some(ref c_raw) = row.cccd {
            let cleaned = c_raw.trim();
            if cleaned.is_empty() {
                (None, None, None)
            } else {
                match encrypt_cccd(cleaned) {
                    Ok(enc) => (Some(enc.encrypted), Some(enc.hash), Some(enc.last4)),
                    Err(_) => {
                        let h = hash_cccd(cleaned);
                        let l4 = if cleaned.len() >= 4 {
                            cleaned[cleaned.len() - 4..].to_string()
                        } else {
                            cleaned.to_string()
                        };
                        (Some(cleaned.to_string()), Some(h), Some(l4))
                    }
                }
            }
        } else {
            (None, None, None)
        };

        let mut final_notes = row.notes.unwrap_or_default();
        if let Some(ref wp) = row.workplace {
            if !wp.is_empty() {
                if !final_notes.is_empty() {
                    final_notes.push_str("; ");
                }
                final_notes.push_str(&format!("Nơi làm việc: {}", wp));
            }
        }
        let notes_opt = if final_notes.is_empty() {
            None
        } else {
            Some(final_notes)
        };

        let existing_citizen_id: Option<(Uuid,)> = if let Some(ref chash) = cccd_hash {
            sqlx::query_as(
                "SELECT id FROM qlhk.citizens WHERE cccd_hash = $1 AND is_deleted = false LIMIT 1",
            )
            .bind(chash)
            .fetch_optional(&mut *tx)
            .await
            .unwrap_or(None)
        } else {
            sqlx::query_as(
                "SELECT id FROM qlhk.citizens WHERE household_id = $1 AND full_name = $2 AND dob IS NOT DISTINCT FROM $3 AND is_deleted = false LIMIT 1",
            )
            .bind(household_id)
            .bind(&row.full_name)
            .bind(row.dob.as_deref())
            .fetch_optional(&mut *tx)
            .await
            .unwrap_or(None)
        };

        match existing_citizen_id {
            Some((cid,)) => {
                let update_res = sqlx::query(
                    "UPDATE qlhk.citizens SET stt = COALESCE($1, stt), is_head = $2, relationship = COALESCE($3, relationship), full_name = $4, name_unaccented = $5, dob = COALESCE($6, dob), gender = COALESCE($7, gender), cccd = COALESCE($8, cccd), cccd_hash = COALESCE($9, cccd_hash), cccd_last4 = COALESCE($10, cccd_last4), ethnicity = COALESCE($11, ethnicity), religion = COALESCE($12, religion), education = COALESCE($13, education), occupation = COALESCE($14, occupation), native_place = COALESCE($15, native_place), notes = COALESCE($16, notes), updated_at = NOW() WHERE id = $17",
                )
                .bind(row.stt)
                .bind(is_head)
                .bind(row.relationship.as_deref())
                .bind(&row.full_name)
                .bind(&name_unaccented)
                .bind(row.dob.as_deref())
                .bind(row.gender.as_deref())
                .bind(cccd_encrypted.as_deref())
                .bind(cccd_hash.as_deref())
                .bind(cccd_last4.as_deref())
                .bind(row.ethnicity.as_deref())
                .bind(row.religion.as_deref())
                .bind(row.education.as_deref())
                .bind(row.occupation.as_deref())
                .bind(row.native_place.as_deref())
                .bind(notes_opt.as_deref())
                .bind(cid)
                .execute(&mut *tx)
                .await;

                if let Err(e) = update_res {
                    errors.push(format!("Lỗi cập nhật nhân khẩu {}: {}", row.full_name, e));
                } else {
                    imported_count += 1;
                }
            }
            None => {
                let new_cid = Uuid::new_v4();
                let insert_res = sqlx::query(
                    "INSERT INTO qlhk.citizens (id, household_id, stt, is_head, relationship, full_name, name_unaccented, dob, gender, cccd, cccd_hash, cccd_last4, ethnicity, religion, education, military_status, occupation, native_place, notes, version, is_deleted, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NULL, $16, $17, $18, 1, false, NOW(), NOW())",
                )
                .bind(new_cid)
                .bind(household_id)
                .bind(row.stt)
                .bind(is_head)
                .bind(row.relationship.as_deref())
                .bind(&row.full_name)
                .bind(&name_unaccented)
                .bind(row.dob.as_deref())
                .bind(row.gender.as_deref())
                .bind(cccd_encrypted.as_deref())
                .bind(cccd_hash.as_deref())
                .bind(cccd_last4.as_deref())
                .bind(row.ethnicity.as_deref())
                .bind(row.religion.as_deref())
                .bind(row.education.as_deref())
                .bind(row.occupation.as_deref())
                .bind(row.native_place.as_deref())
                .bind(notes_opt.as_deref())
                .execute(&mut *tx)
                .await;

                if let Err(e) = insert_res {
                    errors.push(format!("Lỗi thêm mới nhân khẩu {}: {}", row.full_name, e));
                } else {
                    imported_count += 1;
                }
            }
        }
    }

    if let Err(e) = tx.commit().await {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({
                "success": false,
                "imported_count": 0,
                "errors": [format!("Lỗi xác nhận lưu dữ liệu: {}", e)]
            })),
        )
            .into_response();
    }

    Json(json!({
        "success": true,
        "imported_count": imported_count,
        "errors": errors
    }))
    .into_response()
}

pub async fn export_excel(
    State(state): State<AppState>,
    claims_ext: Option<Extension<Claims>>,
    Query(query): Query<ExportQuery>,
) -> Response {
    let claims = claims_ext.map(|Extension(c)| c);
    let target_village_id = if let Some(ref c) = claims {
        if c.role != "admin" {
            c.village_id.as_deref().and_then(|v| Uuid::parse_str(v).ok())
        } else {
            query.village_id.or(query.village_id_camel)
        }
    } else {
        query.village_id.or(query.village_id_camel)
    };

    let mut query_builder = QueryBuilder::new(
        "SELECT c.stt, h.book_number, c.full_name, c.relationship, c.is_head, c.dob, c.gender, c.cccd, c.cccd_last4, c.ethnicity, c.religion, c.education, c.occupation, c.native_place, h.address, c.notes FROM qlhk.citizens c JOIN qlhk.households h ON c.household_id = h.id WHERE c.is_deleted = false AND h.is_deleted = false",
    );

    if let Some(vid) = target_village_id {
        query_builder.push(" AND h.village_id = ");
        query_builder.push_bind(vid);
    }

    query_builder.push(
        " ORDER BY h.book_number ASC, c.is_head DESC, c.stt ASC NULLS LAST, c.created_at ASC",
    );

    let rows: Vec<ExportCitizenRow> = match query_builder
        .build_query_as::<ExportCitizenRow>()
        .fetch_all(&state.pool)
        .await
    {
        Ok(r) => r,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": format!("Lỗi truy vấn danh sách nhân khẩu: {}", e) })),
            )
                .into_response();
        }
    };

    let mut workbook = Workbook::new();
    let worksheet = workbook.add_worksheet();

    let header_format = Format::new()
        .set_bold()
        .set_align(FormatAlign::Center)
        .set_align(FormatAlign::VerticalCenter)
        .set_background_color(Color::RGB(0xE0F2FE))
        .set_border(FormatBorder::Thin)
        .set_font_name("Times New Roman")
        .set_font_size(11);

    let data_format = Format::new()
        .set_border(FormatBorder::Thin)
        .set_font_name("Times New Roman")
        .set_font_size(11);

    let center_format = Format::new()
        .set_align(FormatAlign::Center)
        .set_border(FormatBorder::Thin)
        .set_font_name("Times New Roman")
        .set_font_size(11);

    let headers = [
        "STT",
        "Số sổ hộ khẩu",
        "Họ và tên",
        "Quan hệ với chủ hộ",
        "Ngày sinh",
        "Giới tính",
        "Số CCCD",
        "Dân tộc",
        "Tôn giáo",
        "Trình độ học vấn",
        "Nghề nghiệp",
        "Nơi làm việc",
        "Quê quán",
        "Địa chỉ thường trú",
        "Ghi chú",
    ];

    for (col_idx, header_title) in headers.iter().enumerate() {
        if worksheet
            .write_with_format(0, col_idx as u16, *header_title, &header_format)
            .is_err()
        {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Lỗi định dạng tiêu đề Excel" })),
            )
                .into_response();
        }
    }

    for (idx, row) in rows.iter().enumerate() {
        let r = (idx + 1) as u32;
        let stt_val = row.stt.unwrap_or((idx + 1) as i32);
        let rel_str = if row.is_head {
            "Chủ hộ".to_string()
        } else {
            row.relationship.clone().unwrap_or_default()
        };

        let plain_cccd = row
            .cccd
            .as_deref()
            .map(|enc| {
                if enc.contains(':') {
                    decrypt_cccd(enc).unwrap_or_else(|_| enc.to_string())
                } else {
                    enc.to_string()
                }
            })
            .unwrap_or_default();

        let _ = worksheet.write_with_format(r, 0, stt_val, &center_format);
        let _ = worksheet.write_with_format(r, 1, &row.book_number, &center_format);
        let _ = worksheet.write_with_format(r, 2, &row.full_name, &data_format);
        let _ = worksheet.write_with_format(r, 3, &rel_str, &data_format);
        let _ = worksheet.write_with_format(r, 4, row.dob.as_deref().unwrap_or(""), &center_format);
        let _ =
            worksheet.write_with_format(r, 5, row.gender.as_deref().unwrap_or(""), &center_format);
        let _ = worksheet.write_with_format(r, 6, &plain_cccd, &center_format);
        let _ = worksheet.write_with_format(
            r,
            7,
            row.ethnicity.as_deref().unwrap_or(""),
            &center_format,
        );
        let _ = worksheet.write_with_format(
            r,
            8,
            row.religion.as_deref().unwrap_or(""),
            &center_format,
        );
        let _ = worksheet.write_with_format(
            r,
            9,
            row.education.as_deref().unwrap_or(""),
            &data_format,
        );
        let _ = worksheet.write_with_format(
            r,
            10,
            row.occupation.as_deref().unwrap_or(""),
            &data_format,
        );
        let _ = worksheet.write_with_format(r, 11, "", &data_format);
        let _ = worksheet.write_with_format(
            r,
            12,
            row.native_place.as_deref().unwrap_or(""),
            &data_format,
        );
        let _ =
            worksheet.write_with_format(r, 13, row.address.as_deref().unwrap_or(""), &data_format);
        let _ = worksheet.write_with_format(r, 14, row.notes.as_deref().unwrap_or(""), &data_format);
    }

    let _ = worksheet.set_column_width(0, 6);
    let _ = worksheet.set_column_width(1, 16);
    let _ = worksheet.set_column_width(2, 24);
    let _ = worksheet.set_column_width(3, 18);
    let _ = worksheet.set_column_width(4, 14);
    let _ = worksheet.set_column_width(5, 10);
    let _ = worksheet.set_column_width(6, 18);
    let _ = worksheet.set_column_width(7, 12);
    let _ = worksheet.set_column_width(8, 12);
    let _ = worksheet.set_column_width(9, 16);
    let _ = worksheet.set_column_width(10, 18);
    let _ = worksheet.set_column_width(11, 20);
    let _ = worksheet.set_column_width(12, 24);
    let _ = worksheet.set_column_width(13, 30);
    let _ = worksheet.set_column_width(14, 20);

    let buf = match workbook.save_to_buffer() {
        Ok(b) => b,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": format!("Lỗi xuất tệp Excel: {}", e) })),
            )
                .into_response();
        }
    };

    let mut headers_map = HeaderMap::new();
    headers_map.insert(
        header::CONTENT_TYPE,
        HeaderValue::from_static(
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ),
    );
    headers_map.insert(
        header::CONTENT_DISPOSITION,
        HeaderValue::from_static("attachment; filename=\"Danh_sach_nhan_ho_khau.xlsx\""),
    );

    (StatusCode::OK, headers_map, buf).into_response()
}

pub async fn download_template() -> Response {
    let mut workbook = Workbook::new();
    let worksheet = workbook.add_worksheet();

    let header_format = Format::new()
        .set_bold()
        .set_align(FormatAlign::Center)
        .set_align(FormatAlign::VerticalCenter)
        .set_background_color(Color::RGB(0xE0F2FE))
        .set_border(FormatBorder::Thin)
        .set_font_name("Times New Roman")
        .set_font_size(11);

    let data_format = Format::new()
        .set_border(FormatBorder::Thin)
        .set_font_name("Times New Roman")
        .set_font_size(11);

    let center_format = Format::new()
        .set_align(FormatAlign::Center)
        .set_border(FormatBorder::Thin)
        .set_font_name("Times New Roman")
        .set_font_size(11);

    let headers = [
        "STT",
        "Số sổ hộ khẩu",
        "Họ và tên",
        "Quan hệ với chủ hộ",
        "Ngày sinh",
        "Giới tính",
        "Số CCCD",
        "Dân tộc",
        "Tôn giáo",
        "Trình độ học vấn",
        "Nghề nghiệp",
        "Nơi làm việc",
        "Quê quán",
        "Địa chỉ thường trú",
        "Ghi chú",
    ];

    for (col_idx, header_title) in headers.iter().enumerate() {
        let _ = worksheet.write_with_format(0, col_idx as u16, *header_title, &header_format);
    }

    let _ = worksheet.write_with_format(1, 0, 1, &center_format);
    let _ = worksheet.write_with_format(1, 1, "HK-0001", &center_format);
    let _ = worksheet.write_with_format(1, 2, "Nguyễn Văn An", &data_format);
    let _ = worksheet.write_with_format(1, 3, "Chủ hộ", &data_format);
    let _ = worksheet.write_with_format(1, 4, "15/05/1975", &center_format);
    let _ = worksheet.write_with_format(1, 5, "Nam", &center_format);
    let _ = worksheet.write_with_format(1, 6, "064075000123", &center_format);
    let _ = worksheet.write_with_format(1, 7, "Kinh", &center_format);
    let _ = worksheet.write_with_format(1, 8, "Không", &center_format);
    let _ = worksheet.write_with_format(1, 9, "12/12", &data_format);
    let _ = worksheet.write_with_format(1, 10, "Làm nông", &data_format);
    let _ = worksheet.write_with_format(1, 11, "Tại nhà", &data_format);
    let _ = worksheet.write_with_format(1, 12, "Xã Đắk Hring", &data_format);
    let _ = worksheet.write_with_format(1, 13, "Thôn Kon Hring", &data_format);
    let _ = worksheet.write_with_format(1, 14, "Mẫu nhập liệu", &data_format);

    let _ = worksheet.set_column_width(0, 6);
    let _ = worksheet.set_column_width(1, 16);
    let _ = worksheet.set_column_width(2, 24);
    let _ = worksheet.set_column_width(3, 18);
    let _ = worksheet.set_column_width(4, 14);
    let _ = worksheet.set_column_width(5, 10);
    let _ = worksheet.set_column_width(6, 18);
    let _ = worksheet.set_column_width(7, 12);
    let _ = worksheet.set_column_width(8, 12);
    let _ = worksheet.set_column_width(9, 16);
    let _ = worksheet.set_column_width(10, 18);
    let _ = worksheet.set_column_width(11, 20);
    let _ = worksheet.set_column_width(12, 24);
    let _ = worksheet.set_column_width(13, 30);
    let _ = worksheet.set_column_width(14, 20);

    let buf = match workbook.save_to_buffer() {
        Ok(b) => b,
        Err(_) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": "Lỗi tạo mẫu Excel" })),
            )
                .into_response();
        }
    };

    let mut headers_map = HeaderMap::new();
    headers_map.insert(
        header::CONTENT_TYPE,
        HeaderValue::from_static(
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ),
    );
    headers_map.insert(
        header::CONTENT_DISPOSITION,
        HeaderValue::from_static("attachment; filename=\"Mau_nhap_lieu_nhan_ho_khau.xlsx\""),
    );

    (StatusCode::OK, headers_map, buf).into_response()
}

pub async fn export_chuctho(
    State(state): State<AppState>,
    claims_ext: Option<Extension<Claims>>,
    Query(query): Query<ChucthoExportQuery>,
) -> Response {
    let claims = claims_ext.map(|Extension(c)| c);
    let target_village_id = if let Some(ref c) = claims {
        if c.role != "admin" {
            c.village_id.as_deref().and_then(|v| Uuid::parse_str(v).ok())
        } else {
            query.village_id.or(query.village_id_camel)
        }
    } else {
        query.village_id.or(query.village_id_camel)
    };

    let target_year = query.year.or(query.calculation_year);

    let mut query_builder = QueryBuilder::new(
        "SELECT p.stt, p.name, p.dob, p.gender, p.cccd, p.ethnicity, p.residence, p.current_address, v.name as village_name, p.age60, p.age65, p.age70, p.age75, p.age80, p.age85, p.age90, p.age95, p.age100, p.age_over_100, p.received, p.calculation_year, p.notes FROM qlhk.chuctho_profiles p LEFT JOIN qlhk.villages v ON p.village_id = v.id WHERE p.is_deleted = false",
    );

    if let Some(vid) = target_village_id {
        query_builder.push(" AND p.village_id = ");
        query_builder.push_bind(vid);
    }

    if let Some(y) = target_year {
        query_builder.push(" AND p.calculation_year = ");
        query_builder.push_bind(y);
    }

    query_builder.push(" ORDER BY p.stt ASC NULLS LAST, p.created_at ASC");

    let rows: Vec<ExportChucthoRow> = match query_builder
        .build_query_as::<ExportChucthoRow>()
        .fetch_all(&state.pool)
        .await
    {
        Ok(r) => r,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": format!("Lỗi truy vấn danh sách chúc thọ: {}", e) })),
            )
                .into_response();
        }
    };

    let mut workbook = Workbook::new();
    let worksheet = workbook.add_worksheet();

    let header_format = Format::new()
        .set_bold()
        .set_align(FormatAlign::Center)
        .set_align(FormatAlign::VerticalCenter)
        .set_background_color(Color::RGB(0xE0F2FE))
        .set_border(FormatBorder::Thin)
        .set_font_name("Times New Roman")
        .set_font_size(11);

    let data_format = Format::new()
        .set_border(FormatBorder::Thin)
        .set_font_name("Times New Roman")
        .set_font_size(11);

    let center_format = Format::new()
        .set_align(FormatAlign::Center)
        .set_border(FormatBorder::Thin)
        .set_font_name("Times New Roman")
        .set_font_size(11);

    let headers = [
        "STT",
        "Họ và tên",
        "Ngày sinh",
        "Giới tính",
        "Số CCCD",
        "Dân tộc",
        "Nơi cư trú",
        "Địa chỉ hiện tại",
        "Thôn / Làng",
        "60T",
        "65T",
        "70T",
        "75T",
        "80T",
        "85T",
        "90T",
        "95T",
        "100T",
        ">100T",
        "Đã nhận quà",
        "Năm chúc thọ",
        "Ghi chú",
    ];

    for (col_idx, header_title) in headers.iter().enumerate() {
        let _ = worksheet.write_with_format(0, col_idx as u16, *header_title, &header_format);
    }

    for (idx, row) in rows.iter().enumerate() {
        let r = (idx + 1) as u32;
        let stt_val = row.stt.unwrap_or((idx + 1) as i32);

        let plain_cccd = row
            .cccd
            .as_deref()
            .map(|enc| {
                if enc.contains(':') {
                    decrypt_cccd(enc).unwrap_or_else(|_| enc.to_string())
                } else {
                    enc.to_string()
                }
            })
            .unwrap_or_default();

        let received_str = match row.received {
            Some(true) => "Đã nhận",
            Some(false) => "Chưa nhận",
            None => "",
        };

        let calc_year_str = row
            .calculation_year
            .map(|y| y.to_string())
            .unwrap_or_default();

        let _ = worksheet.write_with_format(r, 0, stt_val, &center_format);
        let _ = worksheet.write_with_format(r, 1, &row.name, &data_format);
        let _ = worksheet.write_with_format(r, 2, row.dob.as_deref().unwrap_or(""), &center_format);
        let _ =
            worksheet.write_with_format(r, 3, row.gender.as_deref().unwrap_or(""), &center_format);
        let _ = worksheet.write_with_format(r, 4, &plain_cccd, &center_format);
        let _ = worksheet.write_with_format(
            r,
            5,
            row.ethnicity.as_deref().unwrap_or(""),
            &center_format,
        );
        let _ = worksheet.write_with_format(
            r,
            6,
            row.residence.as_deref().unwrap_or(""),
            &data_format,
        );
        let _ = worksheet.write_with_format(
            r,
            7,
            row.current_address.as_deref().unwrap_or(""),
            &data_format,
        );
        let _ = worksheet.write_with_format(
            r,
            8,
            row.village_name.as_deref().unwrap_or(""),
            &data_format,
        );
        let _ = worksheet.write_with_format(r, 9, row.age60.as_deref().unwrap_or(""), &center_format);
        let _ =
            worksheet.write_with_format(r, 10, row.age65.as_deref().unwrap_or(""), &center_format);
        let _ =
            worksheet.write_with_format(r, 11, row.age70.as_deref().unwrap_or(""), &center_format);
        let _ =
            worksheet.write_with_format(r, 12, row.age75.as_deref().unwrap_or(""), &center_format);
        let _ =
            worksheet.write_with_format(r, 13, row.age80.as_deref().unwrap_or(""), &center_format);
        let _ =
            worksheet.write_with_format(r, 14, row.age85.as_deref().unwrap_or(""), &center_format);
        let _ =
            worksheet.write_with_format(r, 15, row.age90.as_deref().unwrap_or(""), &center_format);
        let _ =
            worksheet.write_with_format(r, 16, row.age95.as_deref().unwrap_or(""), &center_format);
        let _ = worksheet.write_with_format(
            r,
            17,
            row.age100.as_deref().unwrap_or(""),
            &center_format,
        );
        let _ = worksheet.write_with_format(
            r,
            18,
            row.age_over_100.as_deref().unwrap_or(""),
            &center_format,
        );
        let _ = worksheet.write_with_format(r, 19, received_str, &center_format);
        let _ = worksheet.write_with_format(r, 20, &calc_year_str, &center_format);
        let _ = worksheet.write_with_format(r, 21, row.notes.as_deref().unwrap_or(""), &data_format);
    }

    let _ = worksheet.set_column_width(0, 6);
    let _ = worksheet.set_column_width(1, 24);
    let _ = worksheet.set_column_width(2, 14);
    let _ = worksheet.set_column_width(3, 10);
    let _ = worksheet.set_column_width(4, 18);
    let _ = worksheet.set_column_width(5, 12);
    let _ = worksheet.set_column_width(6, 20);
    let _ = worksheet.set_column_width(7, 24);
    let _ = worksheet.set_column_width(8, 18);
    for col in 9..=18 {
        let _ = worksheet.set_column_width(col, 8);
    }
    let _ = worksheet.set_column_width(19, 14);
    let _ = worksheet.set_column_width(20, 14);
    let _ = worksheet.set_column_width(21, 20);

    let buf = match workbook.save_to_buffer() {
        Ok(b) => b,
        Err(e) => {
            return (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({ "error": format!("Lỗi xuất tệp Excel mừng thọ: {}", e) })),
            )
                .into_response();
        }
    };

    let mut headers_map = HeaderMap::new();
    headers_map.insert(
        header::CONTENT_TYPE,
        HeaderValue::from_static(
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ),
    );
    headers_map.insert(
        header::CONTENT_DISPOSITION,
        HeaderValue::from_static("attachment; filename=\"Danh_sach_mung_tho.xlsx\""),
    );

    (StatusCode::OK, headers_map, buf).into_response()
}
