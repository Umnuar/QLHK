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

export function normalizeExcelDob(rawVal: any): {
	dob: string;
	warning?: string;
} {
	if (rawVal === undefined || rawVal === null || rawVal === "") {
		return { dob: "" };
	}

	if (rawVal instanceof Date && !isNaN(rawVal.getTime())) {
		const day = String(rawVal.getUTCDate()).padStart(2, "0");
		const month = String(rawVal.getUTCMonth() + 1).padStart(2, "0");
		const year = rawVal.getUTCFullYear();
		return { dob: `${day}/${month}/${year}` };
	}

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

	const dateParts = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
	if (dateParts) {
		const p1 = parseInt(dateParts[1], 10);
		const p2 = parseInt(dateParts[2], 10);
		const y = parseInt(dateParts[3], 10);

		if (p1 > 12 && p2 > 12) {
			return {
				dob: str,
				warning: `Ngày sinh không hợp lệ: "${str}" (Tháng ${p2} không hợp lệ, phải từ 1-12)`,
			};
		}

		if (p2 > 12 && p1 <= 12) {
			const dayStr = String(p2).padStart(2, "0");
			const monthStr = String(p1).padStart(2, "0");
			return { dob: `${dayStr}/${monthStr}/${y}` };
		}

		if (p1 > 12 && p2 <= 12) {
			const dayStr = String(p1).padStart(2, "0");
			const monthStr = String(p2).padStart(2, "0");
			return { dob: `${dayStr}/${monthStr}/${y}` };
		}

		const dayStr = String(p1).padStart(2, "0");
		const monthStr = String(p2).padStart(2, "0");
		return { dob: `${dayStr}/${monthStr}/${y}` };
	}

	if (/^\d{4}$/.test(str)) {
		return { dob: str };
	}

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

function parseDakHaMergedFormat(
	rawRows: any[][],
	options?: { defaultVillageName?: string },
): ParsedExcelRow[] {
	let villageName = "";
	for (let i = 0; i < Math.min(5, rawRows.length); i++) {
		const rowStr = (rawRows[i] || []).join(" ");
		const match = rowStr.match(/THÔN:\s*([^.\n_…]+)/i);
		if (match && match[1]?.trim() && !match[1].includes(".")) {
			villageName = match[1].trim();
		}
	}

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

		if (!rawHoLot && !rawTen && !rawStt) {
			continue;
		}

		const fullName =
			joinFullName(rawHoLot, rawTen) || `${rawHoLot} ${rawTen}`.trim();
		if (!fullName) {
			continue;
		}

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

		const isFemale =
			rawFemale === "X" || rawFemale === "NỮ" || rawFemale === "NU";
		const gender: "Nam" | "Nữ" = isFemale ? "Nữ" : "Nam";

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

function parseStandard11ColumnsFormat(
	rawRows: any[][],
	options?: { defaultVillageName?: string },
): ParsedExcelRow[] {
	const result: ParsedExcelRow[] = [];

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

	const allocatedCodes = new Set<string>();
	for (let r = startIdx; r < rawRows.length; r++) {
		const row = rawRows[r];
		if (!row || row.length === 0) continue;
		const rowCode = String(row[1] || "").trim();
		if (rowCode) {
			allocatedCodes.add(rowCode);
		}
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

		const relLower = relationship.toLowerCase().trim();
		const isHead = relLower.includes("chủ hộ") || relLower === "chu ho" || relLower === "ch";

		if (!code) {
			if (isHead || !lastCode) {
				do {
					householdCounter++;
					code = `HK-${String(householdCounter).padStart(4, "0")}`;
				} while (allocatedCodes.has(code));
				allocatedCodes.add(code);
			} else {
				code = lastCode;
			}
		} else {
			allocatedCodes.add(code);
		}
		lastCode = code;

		const gender: "Nam" | "Nữ" = rawGender.toLowerCase().includes("nữ")
			? "Nữ"
			: "Nam";

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

export function sanitizeExcelRow(row: any[]): any[] {
	if (!Array.isArray(row)) return row;
	return row.map((cell) => sanitizeExcelCellValue(cell));
}

export * from "./policyExcelTypes";
export * from "./policyExcelFields";
export * from "./policyExcelHeaders";
export * from "./policyExcelMapping";
export * from "./policyExcelParser";
export * from "./householdExcelFields";
export * from "./householdExcelMapping";
export * from "./householdExcelParser";

