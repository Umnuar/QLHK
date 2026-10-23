import { invoke, isTauri } from "@tauri-apps/api/core";

export interface ExportCitizenRow {
	stt: number;
	household_number: string;
	village_name: string;
	full_name: string;
	relationship: string;
	dob: string;
	gender: string;
	ethnicity: string;
	religion: string;
	cccd: string;
	education: string;
	occupation: string;
	permanent_address: string;
	current_address: string;
	notes: string;
}

export interface ExportResult {
	success: boolean;
	file_path: string;
	row_count: number;
	error?: string;
}

export interface ParseRowItem {
	line_number: number;
	household_number: string;
	full_name: string;
	relationship: string;
	dob: string;
	gender: string;
	cccd: string;
	ethnicity: string;
	religion: string;
	village_name?: string;
	education?: string;
	occupation?: string;
	permanent_address?: string;
	current_address?: string;
	notes?: string;
	is_valid: boolean;
	warning?: string | null;
}

export interface ParseResult {
	success: boolean;
	total_rows: number;
	valid_rows: number;
	rows: ParseRowItem[];
	warnings: string[];
	error?: string;
}

export function isTauriEnvironment(): boolean {
	return typeof window !== "undefined" && isTauri();
}

export async function exportHouseholdExcelTauri(
	filePath: string,
	rows: ExportCitizenRow[],
): Promise<ExportResult> {
	if (isTauriEnvironment()) {
		try {
			return await invoke<ExportResult>("export_households_excel", {
				filePath,
				rows,
			});
		} catch (error: any) {
			return {
				success: false,
				file_path: filePath,
				row_count: 0,
				error: error?.message || String(error),
			};
		}
	}

	try {
		const XLSX = await import("xlsx");
		const titleHeader = [
			"UBND HUYỆN ĐĂK HÀ",
			"",
			"",
			"",
			"",
			"",
			"CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM",
		];
		const subHeader = [
			"CÔNG AN XÃ ĐĂK HÀ",
			"",
			"",
			"",
			"",
			"",
			"Độc lập - Tự do - Hạnh phúc",
		];
		const title = ["DANH SÁCH HỘ GIA ĐÌNH VÀ NHÂN KHẨU"];
		const columns = [
			"STT",
			"Số sổ hộ",
			"Thôn/Xóm",
			"Họ và tên",
			"Quan hệ với chủ hộ",
			"Ngày sinh",
			"Giới tính",
			"Dân tộc",
			"Tôn giáo",
			"Số CCCD",
			"Trình độ",
			"Nghề nghiệp",
			"Nơi thường trú",
			"Nơi ở hiện nay",
			"Ghi chú",
		];
		const data = rows.map((r) => [
			r.stt,
			r.household_number,
			r.village_name,
			r.full_name,
			r.relationship,
			r.dob,
			r.gender,
			r.ethnicity,
			r.religion,
			r.cccd,
			r.education,
			r.occupation,
			r.permanent_address,
			r.current_address,
			r.notes,
		]);
		const ws = XLSX.utils.aoa_to_sheet([
			titleHeader,
			subHeader,
			[],
			title,
			[],
			columns,
			...data,
		]);
		const wb = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(wb, ws, "Nhân khẩu");
		const targetName =
			filePath.split(/[/\\]/).pop() || "DanhSach_NhanHoKhau_DakHa.xlsx";
		XLSX.writeFile(wb, targetName);
		return {
			success: true,
			file_path: filePath,
			row_count: rows.length,
		};
	} catch (error: any) {
		return {
			success: false,
			file_path: filePath,
			row_count: 0,
			error: error?.message || String(error),
		};
	}
}

export async function parsePopulationExcelTauri(
	filePath: string,
): Promise<ParseResult> {
	if (isTauriEnvironment()) {
		try {
			return await invoke<ParseResult>("parse_excel_population", {
				filePath,
			});
		} catch (error: any) {
			return {
				success: false,
				total_rows: 0,
				valid_rows: 0,
				rows: [],
				warnings: [error?.message || String(error)],
				error: error?.message || String(error),
			};
		}
	}

	return {
		success: false,
		total_rows: 0,
		valid_rows: 0,
		rows: [],
		warnings: [
			"Trình duyệt web không hỗ trợ đọc file trực tiếp theo đường dẫn ổ đĩa.",
		],
		error: "Direct file path read is only supported in Tauri desktop application",
	};
}

export async function saveHouseholdExcelWithDialog(
	defaultFileName: string,
	rows: ExportCitizenRow[],
): Promise<ExportResult> {
	if (isTauriEnvironment()) {
		try {
			const { save } = await import("@tauri-apps/plugin-dialog");
			const selectedPath = await save({
				defaultPath: defaultFileName,
				filters: [
					{ name: "File Excel (*.xlsx)", extensions: ["xlsx"] },
					{ name: "Tất cả các tệp", extensions: ["*"] },
				],
			});
			if (!selectedPath) {
				return {
					success: false,
					file_path: "",
					row_count: 0,
					error: "Người dùng đã hủy lưu tệp",
				};
			}
			return await exportHouseholdExcelTauri(selectedPath, rows);
		} catch {
			return await exportHouseholdExcelTauri(defaultFileName, rows);
		}
	}

	return await exportHouseholdExcelTauri(defaultFileName, rows);
}

export async function openAndParsePopulationExcel(): Promise<ParseResult | null> {
	if (!isTauriEnvironment()) {
		return null;
	}
	try {
		const { open } = await import("@tauri-apps/plugin-dialog");
		const selected = await open({
			multiple: false,
			filters: [
				{
					name: "File Excel (*.xlsx, *.xls)",
					extensions: ["xlsx", "xls", "xlsm", "xlsb"],
				},
				{ name: "Tất cả các tệp", extensions: ["*"] },
			],
		});
		if (!selected || typeof selected !== "string") {
			return null;
		}
		return await parsePopulationExcelTauri(selected);
	} catch (error: any) {
		return {
			success: false,
			total_rows: 0,
			valid_rows: 0,
			rows: [],
			warnings: [error?.message || String(error)],
			error: error?.message || String(error),
		};
	}
}
