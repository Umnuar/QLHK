import { parseAndValidateDob } from "./date";
import { joinFullName } from "./vietnamese";

export interface ParsedExcelRow {
	index: number;
	stt: number | string;
	code: string;
	fullName: string;
	relationship: string;
	dobRaw: string;
	gender: "Nam" | "Nữ";
	ethnicity: string;
	religion: string;
	cccd: string;
	address: string;
	notes: string;
	dobError?: string;
	hasError: boolean;
	rawRow?: any[];
}

export type ExcelFormatType = "dak_ha_merged" | "standard_11_columns";

/**
 * Chuẩn hóa ngày sinh từ dữ liệu thô Excel:
 * - Hỗ trợ Excel serial date number (ví dụ: 37121 -> 18/08/2001)
 * - Tự động chuẩn hóa năm 3 chữ số lỗi gõ phím (ví dụ: 11/01/976 -> 11/01/1976)
 * - Hỗ trợ định dạng M/D/YYYY kiểu Mỹ (ví dụ: 8/18/2001 -> 18/08/2001)
 * - Phát hiện ngày/tháng không hợp lệ (ví dụ: 15/17/1989 có tháng 17)
 */
export function normalizeExcelDob(rawVal: any): {
	dob: string;
	warning?: string;
} {
	if (rawVal === undefined || rawVal === null || rawVal === "") {
		return { dob: "" };
	}

	// Trường hợp 0: Đối tượng Date hợp lệ
	if (rawVal instanceof Date && !isNaN(rawVal.getTime())) {
		const day = String(rawVal.getUTCDate()).padStart(2, "0");
		const month = String(rawVal.getUTCMonth() + 1).padStart(2, "0");
		const year = rawVal.getUTCFullYear();
		return { dob: `${day}/${month}/${year}` };
	}

	// Trường hợp 1: Số nguyên từ 1900 đến 2100 là chỉ có năm sinh
	if (typeof rawVal === "number") {
		if (rawVal >= 1900 && rawVal <= 2100) {
			return { dob: String(rawVal) };
		}
		if (rawVal > 1000 && rawVal < 100000) {
			const utcDays = Math.floor(rawVal - 25569);
			const date = new Date(utcDays * 86400 * 1000);
			const day = String(date.getUTCDate()).padStart(2, "0");
			const month = String(date.getUTCMonth() + 1).padStart(2, "0");
			const year = date.getUTCFullYear();
			return { dob: `${day}/${month}/${year}` };
		}
	}

	const str = String(rawVal)
		.trim()
		.replace(/\s*([/-])\s*/g, "$1");
	if (!str) {
		return { dob: "" };
	}

	// Trường hợp 2: Năm 3 chữ số (ví dụ: 11/01/976 -> 11/01/1976)
	const threeDigitYearMatch = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{3})$/);
	if (threeDigitYearMatch) {
		const d = parseInt(threeDigitYearMatch[1], 10);
		const m = parseInt(threeDigitYearMatch[2], 10);
		let y = parseInt(threeDigitYearMatch[3], 10);
		if (y >= 900 && y <= 999) {
			y += 1000;
		}
		const dayStr = String(d).padStart(2, "0");
		const monthStr = String(m).padStart(2, "0");
		return { dob: `${dayStr}/${monthStr}/${y}` };
	}

	// Trường hợp 3: Chuỗi định dạng ISO YYYY-MM-DD hoặc YYYY/MM/DD
	const isoMatch = str.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
	if (isoMatch) {
		const y = parseInt(isoMatch[1], 10);
		const m = parseInt(isoMatch[2], 10);
		const d = parseInt(isoMatch[3], 10);
		if (m < 1 || m > 12) {
			return {
				dob: str,
				warning: `Ngày sinh không hợp lệ: "${str}" (Tháng ${m} không hợp lệ, phải từ 1-12)`,
			};
		}
		if (d < 1 || d > 31) {
			return {
				dob: str,
				warning: `Ngày sinh không hợp lệ: "${str}" (Ngày ${d} không hợp lệ, phải từ 1-31)`,
			};
		}
		const dayStr = String(d).padStart(2, "0");
		const monthStr = String(m).padStart(2, "0");
		return { dob: `${dayStr}/${monthStr}/${y}` };
	}

	// Trường hợp 4: Chuỗi ngày/tháng/năm
	const dateParts = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
	if (dateParts) {
		const p1 = parseInt(dateParts[1], 10);
		const p2 = parseInt(dateParts[2], 10);
		const y = parseInt(dateParts[3], 10);

		// Cả 2 phần đều > 12 -> Lỗi tháng không hợp lệ (ví dụ: 15/17/1989)
		if (p1 > 12 && p2 > 12) {
			return {
				dob: str,
				warning: `Ngày sinh không hợp lệ: "${str}" (Tháng ${p2} không hợp lệ, phải từ 1-12)`,
			};
		}

		// Nếu phần 2 > 12 và phần 1 <= 12 -> Định dạng M/D/YYYY kiểu Mỹ (ví dụ: 8/18/2001)
		if (p2 > 12 && p1 <= 12) {
			const dayStr = String(p2).padStart(2, "0");
			const monthStr = String(p1).padStart(2, "0");
			return { dob: `${dayStr}/${monthStr}/${y}` };
		}

		// Nếu phần 1 > 12 và phần 2 <= 12 -> Định dạng D/M/YYYY chuẩn Việt Nam (ví dụ: 18/8/2001)
		if (p1 > 12 && p2 <= 12) {
			const dayStr = String(p1).padStart(2, "0");
			const monthStr = String(p2).padStart(2, "0");
			return { dob: `${dayStr}/${monthStr}/${y}` };
		}

		// Cả 2 phần đều <= 12 -> Ưu tiên chuẩn DD/MM/YYYY
		const dayStr = String(p1).padStart(2, "0");
		const monthStr = String(p2).padStart(2, "0");
		return { dob: `${dayStr}/${monthStr}/${y}` };
	}

	// Trường hợp 5: Chỉ có năm dạng "1980"
	if (/^\d{4}$/.test(str)) {
		return { dob: str };
	}

	// Trường hợp 6: Tháng/Năm MM/YYYY
	const myMatch = str.match(/^(\d{1,2})[/-](\d{4})$/);
	if (myMatch) {
		const m = parseInt(myMatch[1], 10);
		const y = parseInt(myMatch[2], 10);
		if (m >= 1 && m <= 12) {
			return { dob: `${String(m).padStart(2, "0")}/${y}` };
		}
	}

	return { dob: str };
}

/**
 * Tự động nhận diện định dạng file Excel:
 * - 'dak_ha_merged': Mẫu biểu thực tế xã Đăk Hà (header hành chính 2 tầng, cột Chủ hộ / Thành viên, Họ đệm / Tên, Nữ X)
 * - 'standard_11_columns': Mẫu phẳng 11 cột chuẩn
 */
export function detectExcelFormat(rawRows: any[][]): ExcelFormatType {
	const sampleRows = rawRows.slice(0, 15);
	for (const row of sampleRows) {
		if (!row || !Array.isArray(row)) continue;
		const rowStr = row
			.map((cell) => String(cell || "").toLowerCase())
			.join(" ");

		if (
			rowStr.includes("hộ gia đình") ||
			rowStr.includes("phân tích hộ gia đình") ||
			rowStr.includes("dtts") ||
			(rowStr.includes("chủ hộ") && rowStr.includes("thành viên"))
		) {
			return "dak_ha_merged";
		}
	}
	return "standard_11_columns";
}

/**
 * Phân tích và chuyển đổi dữ liệu thô Excel thành danh sách hàng đối soát 11 cột chuẩn hóa
 */
export function parseExcelSheet(
	rawRows: any[][],
	options?: { defaultVillageName?: string },
): ParsedExcelRow[] {
	if (!rawRows || rawRows.length === 0) return [];

	const format = detectExcelFormat(rawRows);

	if (format === "dak_ha_merged") {
		return parseDakHaMergedFormat(rawRows, options);
	} else {
		return parseStandard11ColumnsFormat(rawRows, options);
	}
}

/**
 * Xử lý định dạng mẫu biểu thực tế xã Đăk Hà (cột gộp nhiều tầng)
 */
function parseDakHaMergedFormat(
	rawRows: any[][],
	options?: { defaultVillageName?: string },
): ParsedExcelRow[] {
	// 1. Quét tìm thông tin thôn nếu có ở các dòng hành chính đầu
	let villageName = "";
	for (let i = 0; i < Math.min(5, rawRows.length); i++) {
		const rowStr = (rawRows[i] || []).join(" ");
		const match = rowStr.match(/THÔN:\s*([^.\n_…]+)/i);
		if (match && match[1]?.trim() && !match[1].includes(".")) {
			villageName = match[1].trim();
		}
	}

	// 2. Tìm dòng bắt đầu dữ liệu (dòng có STT = 1 và có họ tên)
	let dataStartIdx = -1;
	let sttCol = 0;

	for (let i = 0; i < Math.min(15, rawRows.length); i++) {
		const row = rawRows[i];
		if (!row) continue;

		for (let c = 0; c < Math.min(5, row.length); c++) {
			const val = row[c];
			if (val === 1 || String(val).trim() === "1" || val === 1.0) {
				// Kiểm tra xem các cột phía sau có dữ liệu tên hoặc CH không
				const possibleName =
					`${String(row[c + 3] || "")} ${String(row[c + 4] || "")}`.trim();
				const possibleHead = String(row[c + 1] || "")
					.trim()
					.toUpperCase();
				if (possibleName || possibleHead === "CH" || possibleHead === "1") {
					dataStartIdx = i;
					sttCol = c;
					break;
				}
			}
		}
		if (dataStartIdx !== -1) break;
	}

	// Nếu không tìm thấy, mặc định data bắt đầu từ dòng 6, sttCol = 0
	if (dataStartIdx === -1) {
		dataStartIdx = 6;
		sttCol = 0;
	}

	const headCol = sttCol + 1;
	const memberCol = sttCol + 2;
	const hoLotCol = sttCol + 3;
	const tenCol = sttCol + 4;
	const dobCol = sttCol + 5;
	const femaleCol = sttCol + 7;
	const ethnicityCol = sttCol + 8;
	const religionCol = sttCol + 9;
	const notesCol = sttCol + 10;

	const result: ParsedExcelRow[] = [];
	let householdCounter = 0;

	for (let r = dataStartIdx; r < rawRows.length; r++) {
		const row = rawRows[r];
		if (!row || row.length === 0) continue;

		const rawStt = row[sttCol];
		const rawHead = String(row[headCol] || "")
			.trim()
			.toUpperCase();
		const rawMember = row[memberCol];
		const rawHoLot = String(row[hoLotCol] || "").trim();
		const rawTen = String(row[tenCol] || "").trim();
		const rawDob = row[dobCol];
		const rawFemale = String(row[femaleCol] || "")
			.trim()
			.toUpperCase();
		const rawEthnicity = String(row[ethnicityCol] || "").trim();
		const rawReligion = String(row[religionCol] || "").trim();
		const rawNotes = String(row[notesCol] || "").trim();

		// Dừng hoặc bỏ qua nếu không có họ tên và STT
		if (!rawHoLot && !rawTen && !rawStt) {
			continue;
		}

		const fullName =
			joinFullName(rawHoLot, rawTen) || `${rawHoLot} ${rawTen}`.trim();
		if (!fullName) {
			continue;
		}

		// Nhận diện Chủ hộ: Cột CH = 'CH' hoặc nếu member order là 1
		const isHead =
			rawHead === "CH" ||
			rawHead.includes("CHỦ HỘ") ||
			rawMember === 1 ||
			String(rawMember).trim() === "1";
		if (isHead || householdCounter === 0) {
			householdCounter++;
		}

		const code = `HK-${String(householdCounter).padStart(4, "0")}`;
		const relationship = isHead ? "Chủ hộ" : "Thành viên";

		// Giới tính: Cột Nữ có 'X' hoặc 'x' hoặc 'Nữ' -> Nữ, để trống -> Nam
		const isFemale =
			rawFemale === "X" || rawFemale === "NỮ" || rawFemale === "NU";
		const gender: "Nam" | "Nữ" = isFemale ? "Nữ" : "Nam";

		// Chuẩn hóa và kiểm tra ngày sinh
		const normDob = normalizeExcelDob(rawDob);
		const dobRaw =
			normDob.dob ||
			(rawDob !== undefined && rawDob !== null ? String(rawDob).trim() : "");

		let dobError = "";
		if (normDob.warning) {
			dobError = normDob.warning;
		} else if (dobRaw) {
			const dobVal = parseAndValidateDob(dobRaw);
			if (!dobVal.isValid) {
				dobError = dobVal.error || "Ngày sinh không hợp lệ";
			}
		}

		// Tôn giáo
		let religion = "Không";
		if (
			rawNotes &&
			["Công giáo", "Tin lành", "Phật giáo"].some((rel) =>
				rawNotes.includes(rel),
			)
		) {
			religion = rawNotes;
		} else if (rawReligion === "CG") {
			religion = "Công giáo";
		} else if (rawReligion === "TL") {
			religion = "Tin lành";
		} else if (rawReligion === "PG") {
			religion = "Phật giáo";
		} else if (rawReligion) {
			religion = rawReligion;
		}

		const stt =
			typeof rawStt === "number"
				? rawStt
				: parseInt(String(rawStt), 10) || result.length + 1;

		result.push({
			index: result.length + 1,
			stt,
			code,
			fullName,
			relationship,
			dobRaw,
			gender,
			ethnicity: rawEthnicity || "Kinh",
			religion,
			cccd: "",
			address: villageName || options?.defaultVillageName || "Xã Đăk Hà",
			notes: rawNotes,
			dobError: dobError || undefined,
			hasError: !!dobError,
			rawRow: row,
		});
	}

	return result;
}

/**
 * Xử lý định dạng 11 cột phẳng tiêu chuẩn
 */
function parseStandard11ColumnsFormat(
	rawRows: any[][],
	options?: { defaultVillageName?: string },
): ParsedExcelRow[] {
	const result: ParsedExcelRow[] = [];

	// Bỏ qua dòng tiêu đề nếu có
	let startIdx = 0;
	if (
		rawRows.length > 0 &&
		typeof rawRows[0][0] === "string" &&
		(rawRows[0][0].toLowerCase().includes("stt") ||
			String(rawRows[0][1] || "")
				.toLowerCase()
				.includes("mã") ||
			String(rawRows[0][2] || "")
				.toLowerCase()
				.includes("họ"))
	) {
		startIdx = 1;
	}

	let householdCounter = 0;
	let lastCode = "";

	for (let r = startIdx; r < rawRows.length; r++) {
		const row = rawRows[r];
		if (!row || row.length === 0) continue;

		const stt = row[0] || result.length + 1;
		let code = String(row[1] || "").trim();
		const fullName = String(row[2] || "").trim();
		const relationship = String(row[3] || "Thành viên").trim();
		const rawDob = row[4];
		const rawGender = String(row[5] || "Nam").trim();
		const ethnicity = String(row[6] || "Kinh").trim();
		const rawReligion = String(row[7] || "Không").trim();
		const cccd = String(row[8] || "").trim();
		const address = String(
			row[9] || options?.defaultVillageName || "Xã Đăk Hà",
		).trim();
		const notes = String(row[10] || "").trim();

		if (!fullName && !code && !stt) continue;
		if (!fullName) continue;

		const isHead = relationship.toLowerCase().includes("chủ hộ");

		if (!code) {
			if (isHead || !lastCode) {
				householdCounter++;
				code = `HK-${String(householdCounter).padStart(4, "0")}`;
			} else {
				code = lastCode;
			}
		}
		lastCode = code;

		// Giới tính
		const gender: "Nam" | "Nữ" = rawGender.toLowerCase().includes("nữ")
			? "Nữ"
			: "Nam";

		// Ngày sinh
		const normDob = normalizeExcelDob(rawDob);
		const dobRaw =
			normDob.dob ||
			(rawDob !== undefined && rawDob !== null ? String(rawDob).trim() : "");

		let dobError = "";
		if (normDob.warning) {
			dobError = normDob.warning;
		} else if (dobRaw) {
			const dobVal = parseAndValidateDob(dobRaw);
			if (!dobVal.isValid) {
				dobError = dobVal.error || "Ngày sinh không hợp lệ";
			}
		}

		// Tôn giáo
		let religion = rawReligion;
		if (rawReligion === "CG") religion = "Công giáo";
		else if (rawReligion === "TL") religion = "Tin lành";
		else if (rawReligion === "PG") religion = "Phật giáo";

		result.push({
			index: result.length + 1,
			stt,
			code,
			fullName,
			relationship,
			dobRaw,
			gender,
			ethnicity,
			religion,
			cccd,
			address,
			notes,
			dobError: dobError || undefined,
			hasError: !!dobError,
			rawRow: row,
		});
	}

	return result;
}

/**
 * Chống tấn công Formula Injection (CSV/Excel Macro Command Injection - CWE-1236).
 * Nếu một ô dữ liệu bắt đầu bằng một trong các ký tự điều khiển công thức (=, +, -, @, \t, \r),
 * thêm tiền tố dấu nháy đơn ' để phần mềm bảng tính (Excel/Calc) hiểu là văn bản thuần túy và không thực thi mã.
 */
export function sanitizeExcelCellValue<T>(val: T): T {
	if (typeof val === "string") {
		const trimmed = val.trimStart();
		if (
			trimmed.startsWith("=") ||
			trimmed.startsWith("+") ||
			trimmed.startsWith("-") ||
			trimmed.startsWith("@") ||
			trimmed.startsWith("\t") ||
			trimmed.startsWith("\r")
		) {
			return `'${val}` as unknown as T;
		}
	}
	return val;
}

/**
 * Làm sạch toàn bộ một hàng dữ liệu bảng tính trước khi xuất (aoa_to_sheet) để chống Formula Injection.
 */
export function sanitizeExcelRow(row: any[]): any[] {
	if (!Array.isArray(row)) return row;
	return row.map((cell) => sanitizeExcelCellValue(cell));
}

