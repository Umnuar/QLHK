import { describe, expect, it, vi } from "vitest";
import {
	exportHouseholdExcelTauri,
	isTauriEnvironment,
	parsePopulationExcelTauri,
	saveHouseholdExcelWithDialog,
	type ExportCitizenRow,
} from "../tauriExcel";

describe("tauriExcel bridge", () => {
	const sampleRows: ExportCitizenRow[] = [
		{
			stt: 1,
			household_number: "HK-01",
			village_name: "Thôn 1",
			full_name: "Nguyễn Văn Test",
			relationship: "Chủ hộ",
			dob: "1980",
			gender: "Nam",
			ethnicity: "Kinh",
			religion: "Không",
			cccd: "064080001234",
			education: "12/12",
			occupation: "Nông nghiệp",
			permanent_address: "Thôn 1",
			current_address: "Thôn 1",
			notes: "",
		},
	];

	it("identifies non-tauri environment in standard test runtime", () => {
		expect(isTauriEnvironment()).toBe(false);
	});

	it("handles parsePopulationExcelTauri fallback in web environment safely", async () => {
		const res = await parsePopulationExcelTauri("C:/dummy/test.xlsx");
		expect(res.success).toBe(false);
		expect(res.rows.length).toBe(0);
		expect(res.warnings.length).toBeGreaterThan(0);
	});

	it("handles exportHouseholdExcelTauri in fallback environment without crashing", async () => {
		const res = await exportHouseholdExcelTauri("test_export.xlsx", sampleRows);
		expect(res.success).toBe(true);
		expect(res.row_count).toBe(1);
	});

	it("handles saveHouseholdExcelWithDialog in fallback environment", async () => {
		const res = await saveHouseholdExcelWithDialog("test_dialog.xlsx", sampleRows);
		expect(res.success).toBe(true);
		expect(res.row_count).toBe(1);
	});
});
