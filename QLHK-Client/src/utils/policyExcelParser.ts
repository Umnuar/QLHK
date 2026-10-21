import type { ParsedExcelResult, ParsedProfile, ParseWarning } from "./policyExcelTypes";
import { normalizeColumnKey, parseExcelDate } from "./policyExcelTypes";
import { extractExcelHeaders } from "./policyExcelHeaders";
import { suggestColumnMapping } from "./policyExcelMapping";

export function parseExcelWithMapping(
	rawRows: Record<string, any>[],
	mapping: Record<string, string>,
	type: "chuctho" | "htxh",
	calculationYear: number = new Date().getFullYear(),
): ParsedExcelResult {
	const profiles: ParsedProfile[] = [];
	const warnings: ParseWarning[] = [];

	const isMarked = (val: any): string => {
		if (val === undefined || val === null) return "";
		const s = String(val).trim().toLowerCase();
		return s && s !== "0" && s !== "false" ? "x" : "";
	};

	rawRows.forEach((row, idx) => {
		const rowNum = (row._rowIndex as number) || idx + 1;

		const nameCol = mapping.name;
		const rawName = nameCol ? row[nameCol] : "";
		const name = String(rawName || "").trim();

		if (!name) return;
		const normName = normalizeColumnKey(name);
		if (normName.startsWith("tong") || normName.startsWith("cong") || normName.includes("tong so") || normName.includes("nguoi lap")) {
			return;
		}

		const rowWarnings: string[] = [];

		const dobCol = mapping.dob;
		const rawDob = dobCol ? row[dobCol] : "";
		const parsedDate = parseExcelDate(rawDob);
		if (!parsedDate || !parsedDate.dob) {
			rowWarnings.push("Thiếu ngày sinh hoặc định dạng ngày sinh chưa rõ.");
		}

		let gender = "";
		if (mapping.gender && row[mapping.gender]) {
			gender = String(row[mapping.gender]).trim();
		} else {
			const namVal = mapping.genderNam ? String(row[mapping.genderNam] || "").trim() : "";
			const nuVal = mapping.genderNu ? String(row[mapping.genderNu] || "").trim() : "";
			if (namVal && !nuVal) gender = "Nam";
			else if (nuVal && !namVal) gender = "Nữ";
			else if (namVal.toLowerCase() === "x" || namVal === "1") gender = "Nam";
			else if (nuVal.toLowerCase() === "x" || nuVal === "1") gender = "Nữ";
		}

		if (gender.toLowerCase().includes("nam")) gender = "Nam";
		else if (gender.toLowerCase().includes("nu") || gender.toLowerCase().includes("nữ")) {
			gender = "Nữ";
		} else {
			gender = "Nam";
		}

		const cccdCol = mapping.cccd;
		let cleanCccd = cccdCol ? String(row[cccdCol] || "").trim().replace(/\s+/g, "") : "";
		if (cleanCccd) {
			cleanCccd = cleanCccd.replace(/\D/g, "");
			if (cleanCccd.length !== 9 && cleanCccd.length !== 12) {
				rowWarnings.push(`Số CCCD (${cleanCccd}) không đủ 9 hoặc 12 chữ số.`);
			}
		}

		const ethnicity = mapping.ethnicity ? String(row[mapping.ethnicity] || "").trim() || "Kinh" : "Kinh";
		const residence = mapping.residence ? String(row[mapping.residence] || "").trim() : "";
		const currentAddress = mapping.current_address ? String(row[mapping.current_address] || "").trim() : "";
		const villageName = mapping.village_name ? String(row[mapping.village_name] || "").trim() : "";
		const notes = mapping.notes ? String(row[mapping.notes] || "").trim() : "";

		const recCol = mapping.received;
		const recStr = recCol ? String(row[recCol] || "").trim().toLowerCase() : "";
		const received = recStr === "x" || recStr === "1" || recStr.includes("da") || recStr.includes("roi") || recStr === "true";

		const sttCol = mapping.stt;
		const rawStt = sttCol ? row[sttCol] : null;
		const stt = parseInt(String(rawStt), 10) || profiles.length + 1;

		const profile: ParsedProfile = {
			stt,
			name,
			dob: parsedDate?.dob || String(rawDob || "").trim(),
			birthYear: parsedDate?.year,
			gender,
			cccd: cleanCccd,
			ethnicity,
			residence,
			current_address: currentAddress,
			village_name: villageName,
			notes,
			received,

			age60: isMarked(mapping.age60 ? row[mapping.age60] : ""),
			age65: isMarked(mapping.age65 ? row[mapping.age65] : ""),
			age70: isMarked(mapping.age70 ? row[mapping.age70] : ""),
			age75: isMarked(mapping.age75 ? row[mapping.age75] : ""),
			age80: isMarked(mapping.age80 ? row[mapping.age80] : ""),
			age85: isMarked(mapping.age85 ? row[mapping.age85] : ""),
			age90: isMarked(mapping.age90 ? row[mapping.age90] : ""),
			age95: isMarked(mapping.age95 ? row[mapping.age95] : ""),
			age100: isMarked(mapping.age100 ? row[mapping.age100] : ""),
			age_over_100: isMarked(mapping.age_over_100 ? row[mapping.age_over_100] : ""),

			age75plus: isMarked(mapping.age75plus ? row[mapping.age75plus] : ""),
			age70to74poor: isMarked(mapping.age70to74poor ? row[mapping.age70to74poor] : ""),
			bao_tro: isMarked(mapping.bao_tro ? row[mapping.bao_tro] : ""),
			huu_tri: isMarked(mapping.huu_tri ? row[mapping.huu_tri] : ""),
			huu_tuat_bao_hiem: isMarked(
				mapping.huu_tuat_bao_hiem ? row[mapping.huu_tuat_bao_hiem] : "",
			),
			nguoi_co_cong: isMarked(mapping.nguoi_co_cong ? row[mapping.nguoi_co_cong] : ""),

			_rowNum: rowNum,
			_hasWarning: rowWarnings.length > 0,
			_warnings: rowWarnings,
		};

		if (profile.birthYear && calculationYear) {
			const age = calculationYear - profile.birthYear;
			if (type === "chuctho") {
				if (!profile.age60 && age === 60) profile.age60 = "x";
				if (!profile.age65 && age === 65) profile.age65 = "x";
				if (!profile.age70 && age === 70) profile.age70 = "x";
				if (!profile.age75 && age === 75) profile.age75 = "x";
				if (!profile.age80 && age === 80) profile.age80 = "x";
				if (!profile.age85 && age === 85) profile.age85 = "x";
				if (!profile.age90 && age === 90) profile.age90 = "x";
				if (!profile.age95 && age === 95) profile.age95 = "x";
				if (!profile.age100 && age === 100) profile.age100 = "x";
				if (!profile.age_over_100 && age > 100) profile.age_over_100 = "x";
			} else if (type === "htxh") {
				if (!profile.age75plus && age >= 75) profile.age75plus = "x";
				if (
					!profile.age70to74poor &&
					age >= 70 &&
					age <= 74 &&
					mapping.age70to74poor &&
					isMarked(row[mapping.age70to74poor])
				) {
					profile.age70to74poor = "x";
				}
			}
		}

		if (rowWarnings.length > 0) {
			warnings.push({
				row: rowNum,
				name,
				message: rowWarnings.join(" | "),
			});
		}

		profiles.push(profile);
	});

	return {
		profiles,
		warnings,
		stats: {
			totalRows: profiles.length,
			validRows: profiles.filter((p) => !p._hasWarning).length,
			warningRows: warnings.length,
		},
	};
}

export async function parseExcelFile(
	file: File,
	type: "chuctho" | "htxh",
	calculationYear: number = new Date().getFullYear(),
): Promise<ParsedExcelResult> {
	const extracted = await extractExcelHeaders(file);
	const targetType = type || extracted.detectedType || "chuctho";
	const mapping = suggestColumnMapping(extracted.headers, targetType);

	if (!mapping.name) {
		throw new Error(
			"Không tìm thấy cột Họ và tên trong bảng tính Excel. Vui lòng kiểm tra lại cấu trúc file.",
		);
	}

	return parseExcelWithMapping(
		extracted.rawRows,
		mapping,
		targetType,
		calculationYear,
	);
}

