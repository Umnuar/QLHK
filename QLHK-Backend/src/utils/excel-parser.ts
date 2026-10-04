import * as xlsx from "xlsx";
import { removeAccents } from "./crypto";

export interface ParsedCitizen {
	stt: number;
	is_head: boolean;
	relationship: string;
	member_order?: number;
	full_name: string;
	name_unaccented: string;
	dob: string;
	age?: number | null;
	gender: "Nam" | "Nữ";
	ethnicity: string;
	religion: string;
	notes: string;
	warnings: string[];
}

export interface ParsedHousehold {
	temp_id: string;
	book_number: string;
	head_name: string;
	member_count: number;
	members: ParsedCitizen[];
	address?: string | null;
	status?: string | null;
}

export interface ExcelParseResult {
	village_name?: string;
	sheet_name: string;
	total_households: number;
	total_citizens: number;
	households: ParsedHousehold[];
	warnings: Array<{
		row: number;
		citizen_name?: string;
		warning: string;
	}>;
	errors: Array<{
		row: number;
		error: string;
	}>;
}

/**
 * Chuẩn hóa ngày tháng năm sinh:
 * - Xử lý Excel serial date number -> DD/MM/YYYY
 * - Nhận diện năm 3 chữ số như "11/01/976" -> "11/01/1976"
 * - Kiểm tra tính hợp lệ ngày/tháng (ví dụ 15/17/1989 sẽ cảnh báo lỗi)
 */
export function normalizeDob(rawVal: any): {
	dob: string;
	age?: number | null;
	warning?: string;
} {
	if (rawVal === undefined || rawVal === null || rawVal === "") {
		return { dob: "", age: null };
	}

	// Trường hợp 0: Đối tượng Date hợp lệ
	if (rawVal instanceof Date && !isNaN(rawVal.getTime())) {
		const day = String(rawVal.getUTCDate()).padStart(2, "0");
		const month = String(rawVal.getUTCMonth() + 1).padStart(2, "0");
		const year = rawVal.getUTCFullYear();
		const currentYear = new Date().getFullYear();
		const age = currentYear >= year ? currentYear - year : null;
		return { dob: `${day}/${month}/${year}`, age };
	}

	// Trường hợp 1: Số nguyên từ 1900 đến 2100 là chỉ có năm sinh
	if (typeof rawVal === "number") {
		if (rawVal >= 1900 && rawVal <= 2100) {
			const currentYear = new Date().getFullYear();
			return { dob: String(rawVal), age: currentYear - rawVal };
		} else if (rawVal > 1000 && rawVal < 100000) {
			// Excel epoch: 1899-12-30 (due to 1900 leap year bug)
			// 25569 is 1970-01-01 in Excel serial
			const utcDays = Math.floor(rawVal - 25569);
			const date = new Date(utcDays * 86400 * 1000);
			const day = String(date.getUTCDate()).padStart(2, "0");
			const month = String(date.getUTCMonth() + 1).padStart(2, "0");
			const year = date.getUTCFullYear();
			const currentYear = new Date().getFullYear();
			const age = currentYear >= year ? currentYear - year : null;
			return { dob: `${day}/${month}/${year}`, age };
		}
	}

	const str = String(rawVal)
		.trim()
		.replace(/\s*([/-])\s*/g, "$1");
	if (!str) {
		return { dob: "", age: null };
	}

	// Trường hợp 2: Năm 3 chữ số ví dụ "11/01/976" -> "11/01/1976"
	const threeDigitYearMatch = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{3})$/);
	if (threeDigitYearMatch) {
		const d = parseInt(threeDigitYearMatch[1], 10);
		const m = parseInt(threeDigitYearMatch[2], 10);
		let y = parseInt(threeDigitYearMatch[3], 10);
		// Chuẩn hóa 9xx thành 19xx
		if (y >= 900 && y <= 999) {
			y += 1000;
		}
		const dayStr = String(d).padStart(2, "0");
		const monthStr = String(m).padStart(2, "0");
		const currentYear = new Date().getFullYear();
		const age = currentYear >= y ? currentYear - y : null;
		return { dob: `${dayStr}/${monthStr}/${y}`, age };
	}

	// Trường hợp 3: Chuỗi ISO YYYY-MM-DD hoặc YYYY/MM/DD
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
		const currentYear = new Date().getFullYear();
		const age = currentYear >= y ? currentYear - y : null;
		return { dob: `${dayStr}/${monthStr}/${y}`, age };
	}

	// Trường hợp 4: Chuỗi ngày tháng năm DD/MM/YYYY hoặc M/D/YYYY
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

		let d = p1;
		let m = p2;
		// Nếu phần 2 > 12 và phần 1 <= 12 -> Định dạng M/D/YYYY kiểu Mỹ (ví dụ: 8/18/2001)
		if (p2 > 12 && p1 <= 12) {
			d = p2;
			m = p1;
		}

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
		const currentYear = new Date().getFullYear();
		const age = currentYear >= y ? currentYear - y : null;
		return { dob: `${dayStr}/${monthStr}/${y}`, age };
	}

	// Trường hợp 5: Chỉ có năm dạng "1980"
	if (/^\d{4}$/.test(str)) {
		const y = parseInt(str, 10);
		const currentYear = new Date().getFullYear();
		return { dob: str, age: currentYear >= y ? currentYear - y : null };
	}

	// Không khớp bất kỳ mẫu hợp lệ nào
	return {
		dob: str,
		warning: `Định dạng ngày sinh không chuẩn: "${str}"`,
	};
}

/**
 * Bóc tách nội dung file Excel Nhân hộ khẩu (.xls hoặc .xlsx)
 * Hỗ trợ cả 2 định dạng:
 * 1. Mẫu thực tế xã Đăk Hà (cột gộp nhiều tầng)
 * 2. Mẫu 11 cột phẳng tiêu chuẩn
 */
export function parseNhanHoKhauExcel(
	bufferOrPath: Buffer | string,
): ExcelParseResult {
	const workbook =
		typeof bufferOrPath === "string"
			? xlsx.readFile(bufferOrPath, { cellDates: false })
			: xlsx.read(bufferOrPath, { type: "buffer", cellDates: false });

	const sheetName = workbook.SheetNames[0] || "Dl Hộ";
	const worksheet = workbook.Sheets[sheetName];
	if (!worksheet) {
		throw new Error(
			`Không tìm thấy sheet dữ liệu trong file Excel: ${sheetName}`,
		);
	}

	// Chuyển đổi thành mảng 2 chiều
	const rawRows: any[][] = xlsx.utils.sheet_to_json(worksheet, {
		header: 1,
		defval: "",
	});

	let villageName = "";
	// Quét các dòng đầu để lấy thông tin Thôn nếu có
	for (let i = 0; i < Math.min(5, rawRows.length); i++) {
		const rowStr = rawRows[i].join(" ");
		const match = rowStr.match(/THÔN:\s*([^.\n_…]+)/i);
		if (match && match[1]?.trim() && !match[1].includes(".")) {
			villageName = match[1].trim();
		}
	}

	// Nhận diện định dạng file
	let isDakHaMerged = false;
	for (let i = 0; i < Math.min(15, rawRows.length); i++) {
		const rowStr = (rawRows[i] || [])
			.map((c) => String(c || "").toLowerCase())
			.join(" ");
		if (
			rowStr.includes("hộ gia đình") ||
			rowStr.includes("phân tích hộ gia đình") ||
			rowStr.includes("dtts") ||
			(rowStr.includes("chủ hộ") && rowStr.includes("thành viên"))
		) {
			isDakHaMerged = true;
			break;
		}
	}

	const households: ParsedHousehold[] = [];
	const warnings: Array<{
		row: number;
		citizen_name?: string;
		warning: string;
	}> = [];
	const errors: Array<{ row: number; error: string }> = [];

	let currentHousehold: ParsedHousehold | null = null;
	let householdCounter = 0;

	if (isDakHaMerged) {
		// Xử lý mẫu biểu thực tế xã Đăk Hà (cột gộp)
		let dataStartIdx = -1;
		let sttCol = 0;

		for (let i = 0; i < Math.min(15, rawRows.length); i++) {
			const row = rawRows[i];
			if (!row) continue;

			for (let c = 0; c < Math.min(5, row.length); c++) {
				const val = row[c];
				if (val === 1 || String(val).trim() === "1" || val === 1.0) {
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

		if (dataStartIdx === -1) {
			dataStartIdx = 6;
			sttCol = 0;
		}

		const headCol = sttCol + 1;
		const memberCol = sttCol + 2;
		const hoLotCol = sttCol + 3;
		const tenCol = sttCol + 4;
		const dobCol = sttCol + 5;
		const ageCol = sttCol + 6;
		const femaleCol = sttCol + 7;
		const ethnicityCol = sttCol + 8;
		const religionCol = sttCol + 9;
		const notesCol = sttCol + 10;

		for (let r = dataStartIdx; r < rawRows.length; r++) {
			const row = rawRows[r];
			if (!row || row.length === 0) continue;

			const rawStt = row[sttCol];
			const rawHead = String(row[headCol] || "")
				.trim()
				.toUpperCase();
			const rawMemberOrder = row[memberCol];
			const rawHoLot = String(row[hoLotCol] || "").trim();
			const rawTen = String(row[tenCol] || "").trim();
			const rawDob = row[dobCol];
			const rawAge = row[ageCol];
			const rawFemale = String(row[femaleCol] || "")
				.trim()
				.toUpperCase();
			const rawEthnicity = String(row[ethnicityCol] || "").trim();
			const rawReligion = String(row[religionCol] || "").trim();
			const rawNotes = String(row[notesCol] || "").trim();

			// Dừng nếu không có tên hoặc STT
			if (!rawHoLot && !rawTen && !rawStt) {
				continue;
			}

			const fullName = `${rawHoLot} ${rawTen}`.trim();
			if (!fullName) {
				warnings.push({ row: r + 1, warning: "Bỏ qua dòng không có họ tên" });
				continue;
			}

			const isHead =
				rawHead === "CH" ||
				rawHead.includes("CHỦ HỘ") ||
				rawMemberOrder === 1 ||
				String(rawMemberOrder).trim() === "1";
			const citizenWarnings: string[] = [];

			// Chuẩn hóa ngày sinh
			const dobResult = normalizeDob(rawDob);
			if (dobResult.warning) {
				citizenWarnings.push(dobResult.warning);
				warnings.push({
					row: r + 1,
					citizen_name: fullName,
					warning: dobResult.warning,
				});
			}

			// Giới tính
			const isFemale =
				rawFemale === "X" || rawFemale === "NỮ" || rawFemale === "NU";
			const gender: "Nam" | "Nữ" = isFemale ? "Nữ" : "Nam";

			// Tuổi
			let age: number | null = dobResult.age || null;
			if (typeof rawAge === "number" && rawAge > 0) {
				age = Math.round(rawAge);
			}

			// Tôn giáo
			let religion = rawReligion;
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
			}

			const sttVal =
				typeof rawStt === "number"
					? Math.round(rawStt)
					: parseInt(rawStt, 10) || r;
			const memberOrderVal =
				typeof rawMemberOrder === "number"
					? Math.round(rawMemberOrder)
					: parseInt(rawMemberOrder, 10) || 1;

			const citizen: ParsedCitizen = {
				stt: sttVal,
				is_head: isHead,
				relationship: isHead ? "Chủ hộ" : "Thành viên",
				member_order: memberOrderVal,
				full_name: fullName,
				name_unaccented: removeAccents(fullName),
				dob: dobResult.dob,
				age,
				gender,
				ethnicity: rawEthnicity || "Kinh",
				religion: religion || "Không",
				notes: rawNotes,
				warnings: citizenWarnings,
			};

			if (isHead || !currentHousehold) {
				householdCounter++;
				const bookNumber = `HK-${String(householdCounter).padStart(4, "0")}`;
				currentHousehold = {
					temp_id: `hh_${householdCounter}`,
					book_number: bookNumber,
					head_name: fullName,
					member_count: 0,
					members: [],
				};
				households.push(currentHousehold);
			}

			currentHousehold.members.push(citizen);
			currentHousehold.member_count = currentHousehold.members.length;
		}
	} else {
		// Xử lý mẫu 11 cột phẳng tiêu chuẩn
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

		for (let r = startIdx; r < rawRows.length; r++) {
			const row = rawRows[r];
			if (!row || row.length === 0) continue;

			const rawStt = row[0];
			const rawCode = String(row[1] || "").trim();
			const rawFullName = String(row[2] || "").trim();
			const rawRel = String(row[3] || "Thành viên").trim();
			const rawDob = row[4];
			const rawGender = String(row[5] || "Nam").trim();
			const rawEthnicity = String(row[6] || "Kinh").trim();
			const rawReligion = String(row[7] || "Không").trim();
			const rawNotes = String(row[10] || "").trim();

			if (!rawFullName && !rawCode && !rawStt) continue;
			if (!rawFullName) continue;

			const isHead = rawRel.toLowerCase().includes("chủ hộ");
			const citizenWarnings: string[] = [];

			const dobResult = normalizeDob(rawDob);
			if (dobResult.warning) {
				citizenWarnings.push(dobResult.warning);
				warnings.push({
					row: r + 1,
					citizen_name: rawFullName,
					warning: dobResult.warning,
				});
			}

			const gender: "Nam" | "Nữ" = rawGender.toLowerCase().includes("nữ")
				? "Nữ"
				: "Nam";

			let religion = rawReligion;
			if (rawReligion === "CG") religion = "Công giáo";
			else if (rawReligion === "TL") religion = "Tin lành";
			else if (rawReligion === "PG") religion = "Phật giáo";

			const sttVal =
				typeof rawStt === "number"
					? Math.round(rawStt)
					: parseInt(rawStt, 10) || r;

			const citizen: ParsedCitizen = {
				stt: sttVal,
				is_head: isHead,
				relationship: rawRel,
				full_name: rawFullName,
				name_unaccented: removeAccents(rawFullName),
				dob: dobResult.dob,
				age: dobResult.age || null,
				gender,
				ethnicity: rawEthnicity || "Kinh",
				religion,
				notes: rawNotes,
				warnings: citizenWarnings,
			};

			const bookNumber =
				rawCode || `HK-${String(householdCounter + 1).padStart(4, "0")}`;
			if (
				isHead ||
				!currentHousehold ||
				(rawCode && currentHousehold.book_number !== rawCode)
			) {
				householdCounter++;
				currentHousehold = {
					temp_id: `hh_${householdCounter}`,
					book_number: bookNumber,
					head_name: rawFullName,
					member_count: 0,
					members: [],
				};
				households.push(currentHousehold);
			}

			currentHousehold.members.push(citizen);
			currentHousehold.member_count = currentHousehold.members.length;
		}
	}

	const totalCitizens = households.reduce(
		(sum, h) => sum + h.members.length,
		0,
	);

	return {
		village_name: villageName,
		sheet_name: sheetName,
		total_households: households.length,
		total_citizens: totalCitizens,
		households,
		warnings,
		errors,
	};
}
