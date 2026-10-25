import { normalizeExcelDob, type ParsedExcelRow } from "./excelParser";
import { parseAndValidateDob } from "./date";
import { normalizeColumnKey } from "./policyExcelTypes";

export interface MappedHouseholdParseResult {
	rows: ParsedExcelRow[];
	stats: { total: number; valid: number; warnings: number; errors: number };
}

export function parseExcelWithHouseholdMapping(
	rawRows: Record<string, any>[] | any[][],
	mapping: Record<string, string>,
	defaultVillageName?: string,
): MappedHouseholdParseResult {
	let records: Record<string, any>[] = [];
	if (rawRows.length > 0 && Array.isArray(rawRows[0])) {
		const headerRow = (rawRows[0] as any[]).map((c) => String(c || "").trim());
		for (let i = 1; i < rawRows.length; i++) {
			const rowArr = rawRows[i] as any[];
			if (!rowArr || rowArr.length === 0) continue;
			const obj: Record<string, any> = {};
			headerRow.forEach((h, colIdx) => {
				if (h) obj[h] = rowArr[colIdx];
			});
			records.push(obj);
		}
	} else {
		records = rawRows as Record<string, any>[];
	}

	const rows: ParsedExcelRow[] = [];
	let householdIndex = 0;
	let currentHouseholdCode = "";
	let totalWarnings = 0;

	for (let i = 0; i < records.length; i++) {
		const row = records[i];
		const rawName = mapping.fullName ? row[mapping.fullName] : "";
		const fullName = String(rawName || "").trim();
		if (!fullName) continue;

		const normName = normalizeColumnKey(fullName);
		if (
			normName.startsWith("tong") ||
			normName.startsWith("cong") ||
			normName.includes("tong cong") ||
			normName.includes("nguoi lap") ||
			normName.includes("ngay thang")
		) {
			continue;
		}

		let hasError = false;
		let dobError: string | undefined;

		const rawDob = mapping.dob ? row[mapping.dob] : "";
		const normDob = normalizeExcelDob(rawDob);
		const dobRaw =
			normDob.dob ||
			(rawDob !== undefined && rawDob !== null ? String(rawDob).trim() : "");
		if (!dobRaw) {
			dobError = "Thiếu ngày tháng năm sinh";
			hasError = true;
		} else if (normDob.warning) {
			dobError = normDob.warning;
			totalWarnings++;
		} else {
			const dobValidation = parseAndValidateDob(dobRaw);
			if (!dobValidation.isValid) {
				dobError = dobValidation.error || "Ngày sinh không hợp lệ";
				hasError = true;
			}
		}

		const rawHead = mapping.household_head
			? String(row[mapping.household_head] || "").trim()
			: "";
		const rawRel = mapping.relationship
			? String(row[mapping.relationship] || "").trim()
			: "";
		const normRel = normalizeColumnKey(rawRel);
		const normHead = normalizeColumnKey(rawHead);
		const isHead =
			normHead === "ch" ||
			normHead === "chu ho" ||
			normHead === "x" ||
			normHead === "1" ||
			normRel === "chu ho" ||
			normRel.includes("chu ho") ||
			normHead.includes("chu ho");

		const rawCode = mapping.code ? String(row[mapping.code] || "").trim() : "";
		if (rawCode) {
			currentHouseholdCode = rawCode;
		} else if (isHead || householdIndex === 0) {
			householdIndex++;
			currentHouseholdCode = `HK-${String(householdIndex).padStart(4, "0")}`;
		}

		const relationship = isHead ? "Chủ hộ" : rawRel || "Thành viên";

		const rawGender = mapping.gender
			? String(row[mapping.gender] || "").trim()
			: "";
		const normGender = normalizeColumnKey(rawGender);
		const gender: "Nam" | "Nữ" =
			normGender === "nu" || normGender.includes("nu") ? "Nữ" : "Nam";

		const rawCccd = mapping.cccd ? String(row[mapping.cccd] || "").trim() : "";
		const cccd = rawCccd.replace(/\D/g, "");
		if (cccd && cccd.length !== 9 && cccd.length !== 12) {
			totalWarnings++;
		}

		const rawEthnicity = mapping.ethnicity
			? String(row[mapping.ethnicity] || "").trim()
			: "";
		const ethnicity = rawEthnicity || "Xơ Đăng";

		const rawReligion = mapping.religion
			? String(row[mapping.religion] || "").trim()
			: "";
		const religion = rawReligion || "Không";

		const rawAddress = mapping.address
			? String(row[mapping.address] || "").trim()
			: "";
		const address = rawAddress || defaultVillageName || "";

		const rawNotes = mapping.notes
			? String(row[mapping.notes] || "").trim()
			: "";

		const rawStt = mapping.stt ? row[mapping.stt] : null;
		const stt =
			rawStt !== null &&
			rawStt !== undefined &&
			String(rawStt).trim() !== ""
				? String(rawStt).trim()
				: rows.length + 1;

		rows.push({
			index: rows.length,
			stt,
			code: currentHouseholdCode,
			fullName,
			relationship,
			dobRaw,
			gender,
			ethnicity,
			religion,
			cccd,
			address,
			notes: rawNotes,
			dobError,
			hasError,
		});
	}

	const errors = rows.filter((r) => r.hasError).length;
	return {
		rows,
		stats: {
			total: rows.length,
			valid: rows.length - errors,
			warnings: totalWarnings,
			errors,
		},
	};
}
