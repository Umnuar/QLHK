import { describe, expect, it } from "vitest";
import { ETHNIC_GROUPS, RELIGIONS, VILLAGES } from "../data/constants";
import { maskCccd, validateCccd } from "../utils/cccd";
import {
	calculateAge,
	formatDobDisplay,
	parseAndValidateDob,
} from "../utils/date";
import { normalizeUnaccented, splitFullName } from "../utils/vietnamese";

describe("Đồng bộ dữ liệu chuẩn Thôn & 14 Dân Tộc Xã Đăk Hà", () => {
	it("đúng danh mục thôn thuộc Xã Đăk Hà", () => {
		expect(VILLAGES.length).toBeGreaterThan(0);
		const names = VILLAGES.map((v) => v.name);
		expect(names).toContain("Thôn 1");
		expect(names).toContain("Thôn 2");
		expect(names).toContain("Thôn 3");
		expect(names).toContain("Thôn 4");
		expect(names).toContain("Thôn 5");
		expect(names).toContain("Thôn Kon Đao Yôp");
		expect(names).toContain("Làng Kon Hnông Bách");
	});

	it("đúng danh mục 14 dân tộc chuẩn", () => {
		expect(ETHNIC_GROUPS.length).toBe(14);
		expect(ETHNIC_GROUPS).toContain("Kinh");
		expect(ETHNIC_GROUPS).toContain("Xơ Đăng");
		expect(ETHNIC_GROUPS).toContain("Gia Rai");
		expect(ETHNIC_GROUPS).toContain("Giẻ Triêng");
		expect(ETHNIC_GROUPS).toContain("Khách Gia");
		expect(ETHNIC_GROUPS).toContain("Cor");
	});
});

describe("Kiểm thử nghiệp vụ ngày sinh và phát hiện lỗi Excel (Nhân hộ khẩu.xls)", () => {
	it("phát hiện đúng lỗi năm sinh dưới 4 chữ số (ví dụ: 11/01/976)", () => {
		const res = parseAndValidateDob("11/01/976");
		expect(res.isValid).toBe(false);
		expect(res.error).toBeDefined();
	});

	it("phát hiện đúng lỗi tháng sinh vượt quá 12 (ví dụ: 15/17/1989)", () => {
		const res = parseAndValidateDob("15/17/1989");
		expect(res.isValid).toBe(false);
		expect(res.error).toBeDefined();
	});

	it("chấp nhận ngày sinh chuẩn DD/MM/YYYY hợp lệ", () => {
		const res = parseAndValidateDob("15/04/1975");
		expect(res.isValid).toBe(true);
		expect(res.birthYear).toBe(1975);
		expect(formatDobDisplay(res.formatted!)).toBe("15/04/1975");
	});

	it("chấp nhận định dạng chỉ có năm sinh YYYY", () => {
		const res = parseAndValidateDob("1982");
		expect(res.isValid).toBe(true);
		expect(res.birthYear).toBe(1982);
	});
});

describe("Kiểm thử bảo mật CCCD và ẩn số dạng ••••••••1234", () => {
	it("che 8 số đầu của CCCD chuẩn", () => {
		const masked = maskCccd("060075001234", false);
		expect(masked).toBe("••••••••1234");
	});

	it("kiểm tra hợp lệ độ dài CCCD 12 số", () => {
		expect(validateCccd("060075001234").isValid).toBe(true);
		expect(validateCccd("12345").isValid).toBe(false);
	});
});

describe("Kiểm thử tìm kiếm tiếng Việt không dấu", () => {
	it("chuẩn hóa không dấu cho tên người có dấu", () => {
		expect(normalizeUnaccented("Nguyễn Văn An")).toBe("nguyen van an");
		expect(normalizeUnaccented("A Đôi")).toBe("a doi");
		expect(normalizeUnaccented("Y Ble")).toBe("y ble");
	});

	it("tách đúng họ và tên", () => {
		const { lastName, firstName } = splitFullName("Nguyễn Văn Minh");
		expect(lastName).toBe("Nguyễn Văn");
		expect(firstName).toBe("Minh");
	});
});

describe("Kiểm thử ánh xạ thống kê thời gian thực các thôn (VillagesPage)", () => {
	it("khớp chính xác ID Thôn 1 với CSDL backend", () => {
		const thon1 = VILLAGES.find((v) => v.name === "Thôn 1");
		expect(thon1).toBeDefined();
		expect(thon1?.id).toBe("5769de47-c24c-476e-9620-cd741c40fcee");
	});

	it("ánh xạ chính xác số liệu thống kê thôn theo ID, mã và tên không dấu", () => {
		const mockRows = [
			{
				village_id: "5769de47-c24c-476e-9620-cd741c40fcee",
				village_name: "Thôn 1",
				village_code: "THON_1",
				household_count: 36,
				citizen_count: 126,
				male_count: 90,
				female_count: 36,
				dtts_count: 117,
				dtts_percentage: 92.9,
				top_ethnicity: "Cor",
				top_religion: "Không",
			},
		];

		const statsMap: Record<string, (typeof mockRows)[0]> = {};
		mockRows.forEach((row) => {
			if (row.village_id) statsMap[row.village_id] = row;
			if (row.village_code) statsMap[row.village_code] = row;
			if (row.village_name) {
				statsMap[row.village_name] = row;
				statsMap[row.village_name.toLowerCase().trim()] = row;
				statsMap[normalizeUnaccented(row.village_name.toLowerCase().trim())] =
					row;
			}
		});

		const village = VILLAGES[0];
		const stat =
			statsMap[village.id] ||
			statsMap[village.short_code] ||
			statsMap[village.name] ||
			statsMap[normalizeUnaccented(village.name.toLowerCase().trim())];

		expect(stat).toBeDefined();
		expect(stat?.household_count).toBe(36);
		expect(stat?.citizen_count).toBe(126);
		expect(stat?.dtts_count).toBe(117);
	});

	it("tính toán chính xác số lượng và tỷ lệ DTTS (dân tộc thiểu số) từ mảng ethnicities", () => {
		const mockEthnicities = [
			{ name: "Kinh", count: 50 },
			{ name: "Xơ Đăng", count: 120 },
			{ name: "Gia Rai", count: 30 },
			{ name: "kinh ", count: 10 },
		];
		const totalCitizens = 210;

		const dttsCount = mockEthnicities
			? mockEthnicities
					.filter((e) => e.name.toLowerCase().trim() !== "kinh")
					.reduce((sum, e) => sum + e.count, 0)
			: 0;
		const dttsPercentage =
			totalCitizens > 0
				? ((dttsCount / totalCitizens) * 100).toFixed(1)
				: "0.0";

		expect(dttsCount).toBe(150);
		expect(dttsPercentage).toBe("71.4");

		// Trường hợp totalCitizens = 0
		const zeroCitizens = 0;
		const emptyPct =
			zeroCitizens > 0 ? ((dttsCount / zeroCitizens) * 100).toFixed(1) : "0.0";
		expect(emptyPct).toBe("0.0");

		// Trường hợp chỉ có dân tộc Kinh
		const onlyKinh = [{ name: "Kinh", count: 100 }];
		const dttsZero = onlyKinh
			.filter((e) => e.name.toLowerCase().trim() !== "kinh")
			.reduce((sum, e) => sum + e.count, 0);
		expect(dttsZero).toBe(0);
	});
});

describe("Kiểm thử tích hợp Slide-over Drawer & Sub-modal CitizenModal", () => {
	it("export hợp lệ CitizenModal, HouseholdDrawer và HouseholdModal", async () => {
		const { CitizenModal } = await import(
			"../components/households/CitizenModal"
		);
		const { HouseholdDrawer } = await import(
			"../components/households/HouseholdDrawer"
		);
		const { HouseholdModal } = await import(
			"../components/households/HouseholdModal"
		);

		expect(typeof CitizenModal).toBe("function");
		expect(typeof HouseholdDrawer).toBe("function");
		expect(typeof HouseholdModal).toBe("function");
	}, 30000);
});
