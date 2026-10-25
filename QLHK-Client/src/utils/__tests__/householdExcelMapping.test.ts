import { describe, expect, it } from "vitest";
import { suggestHouseholdColumnMapping } from "../householdExcelMapping";
import { parseExcelWithHouseholdMapping } from "../householdExcelParser";

describe("householdExcelMapping", () => {
	it("suggests 100% correct mapping for standard 11 columns", () => {
		const standardHeaders = [
			"STT",
			"Mã hộ",
			"Chủ hộ / Thành viên",
			"Họ và tên",
			"Quan hệ với chủ hộ",
			"Ngày tháng năm sinh",
			"Giới tính",
			"Dân tộc",
			"Tôn giáo",
			"Số CCCD / CMND",
			"Địa chỉ",
			"Ghi chú",
		];

		const mapping = suggestHouseholdColumnMapping(standardHeaders);

		expect(mapping.fullName).toBe("Họ và tên");
		expect(mapping.dob).toBe("Ngày tháng năm sinh");
		expect(mapping.relationship).toBe("Quan hệ với chủ hộ");
		expect(mapping.gender).toBe("Giới tính");
		expect(mapping.ethnicity).toBe("Dân tộc");
		expect(mapping.cccd).toBe("Số CCCD / CMND");
		expect(mapping.address).toBe("Địa chỉ");
	});

	it("correctly maps arbitrary police export columns", () => {
		const policeHeaders = [
			"so_thu_tu",
			"ho_ten",
			"ngay_sinh",
			"gioi_tinh",
			"so_dinh_danh",
			"quan_he",
			"dan_toc",
			"thuong_tru",
		];

		const mapping = suggestHouseholdColumnMapping(policeHeaders);

		expect(mapping.fullName).toBe("ho_ten");
		expect(mapping.dob).toBe("ngay_sinh");
		expect(mapping.gender).toBe("gioi_tinh");
		expect(mapping.cccd).toBe("so_dinh_danh");
		expect(mapping.relationship).toBe("quan_he");
		expect(mapping.ethnicity).toBe("dan_toc");
		expect(mapping.address).toBe("thuong_tru");
	});

	it("transforms records and groups households when code is missing", () => {
		const rawRecords = [
			{
				"Họ và tên": "A Tèo",
				"Ngày sinh": "15/03/1980",
				"Quan hệ": "Chủ hộ",
				"Giới tính": "Nam",
				"CCCD": "064080123456",
			},
			{
				"Họ và tên": "Y Mơ",
				"Ngày sinh": "20/05/1985",
				"Quan hệ": "Vợ",
				"Giới tính": "Nữ",
				"CCCD": "064085654321",
			},
			{
				"Họ và tên": "A Dũng",
				"Ngày sinh": "01/01/1970",
				"Quan hệ": "Chủ hộ",
				"Giới tính": "Nam",
				"CCCD": "064070987654",
			},
		];

		const mapping = {
			fullName: "Họ và tên",
			dob: "Ngày sinh",
			relationship: "Quan hệ",
			gender: "Giới tính",
			cccd: "CCCD",
		};

		const result = parseExcelWithHouseholdMapping(rawRecords, mapping);
		expect(result.rows).toHaveLength(3);
		expect(result.rows[0].fullName).toBe("A Tèo");
		expect(result.rows[0].code).toBe("HK-0001");
		expect(result.rows[1].code).toBe("HK-0001");
		expect(result.rows[2].fullName).toBe("A Dũng");
		expect(result.rows[2].code).toBe("HK-0002");
		expect(result.stats.total).toBe(3);
		expect(result.stats.valid).toBe(3);
	});
});
