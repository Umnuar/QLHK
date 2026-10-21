export interface ParsedProfile {
	stt?: number;
	name: string;
	dob?: string;
	birthYear?: number;
	gender?: string;
	cccd?: string;
	ethnicity?: string;
	residence?: string;
	current_address?: string;
	village_name?: string;
	village_id?: string;
	notes?: string;
	received?: boolean;
	calculationYear?: number;

	age60?: string;
	age65?: string;
	age70?: string;
	age75?: string;
	age80?: string;
	age85?: string;
	age90?: string;
	age95?: string;
	age100?: string;
	age_over_100?: string;

	age75plus?: string;
	age70to74poor?: string;
	bao_tro?: string;
	huu_tri?: string;
	huu_tuat_bao_hiem?: string;
	nguoi_co_cong?: string;

	_rowNum: number;
	_hasWarning?: boolean;
	_warnings?: string[];
}

export interface ParseWarning {
	row: number;
	name?: string;
	message: string;
}

export interface ParsedExcelResult {
	profiles: ParsedProfile[];
	warnings: ParseWarning[];
	stats: {
		totalRows: number;
		validRows: number;
		warningRows: number;
	};
}

export interface SystemField {
	key: string;
	label: string;
	required?: boolean;
	category: "required" | "general" | "chuctho" | "htxh";
	description?: string;
	aliases: string[];
}

export interface ExcelHeaderExtractionResult {
	headers: string[];
	rawRows: Record<string, any>[];
	sampleRows: Record<string, any>[];
	detectedType?: "chuctho" | "htxh";
	headerRowIndex: number;
	hasSubHeader: boolean;
}

export function normalizeColumnKey(str: string): string {
	if (!str) return "";
	return String(str)
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/đ/g, "d")
		.replace(/Đ/g, "D")
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

export function parseExcelDate(raw: any): { dob: string; year?: number } | null {
	if (raw === undefined || raw === null || raw === "") return null;

	if (typeof raw === "number") {
		if (raw >= 1850 && raw <= 2100) {
			return { dob: `01/01/${raw}`, year: raw };
		}

		if (raw > 0 && raw < 2958465) {
			let date = Math.floor(raw);
			if (date > 60) date--;
			const ms = Date.UTC(1900, 0, 1) + (date - 1) * 86400000;
			const d = new Date(ms);
			const day = String(d.getUTCDate()).padStart(2, "0");
			const month = String(d.getUTCMonth() + 1).padStart(2, "0");
			const year = d.getUTCFullYear();
			return { dob: `${day}/${month}/${year}`, year };
		}
	}

	const str = String(raw).trim().replace(/\.0+$/, "");
	if (!str) return null;

	const dmyMatch = str.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
	if (dmyMatch) {
		const day = dmyMatch[1].padStart(2, "0");
		const month = dmyMatch[2].padStart(2, "0");
		const year = parseInt(dmyMatch[3], 10);
		return { dob: `${day}/${month}/${year}`, year };
	}

	const ymdMatch = str.match(/^(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})$/);
	if (ymdMatch) {
		const year = parseInt(ymdMatch[1], 10);
		const month = ymdMatch[2].padStart(2, "0");
		const day = ymdMatch[3].padStart(2, "0");
		return { dob: `${day}/${month}/${year}`, year };
	}

	const myMatch = str.match(/^(\d{1,2})[/.-](\d{4})$/);
	if (myMatch) {
		const month = myMatch[1].padStart(2, "0");
		const year = parseInt(myMatch[2], 10);
		return { dob: `01/${month}/${year}`, year };
	}

	const yearMatch = str.match(/^(\d{4})$/);
	if (yearMatch) {
		const year = parseInt(yearMatch[1], 10);
		return { dob: `01/01/${year}`, year };
	}

	return { dob: str };
}
