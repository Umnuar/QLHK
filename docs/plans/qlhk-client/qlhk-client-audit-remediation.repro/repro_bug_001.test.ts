import { describe, expect, it } from "vitest";
import { parseExcelSheet } from "../../src/utils/excelParser";

describe("repro_bug_001: parseStandard11ColumnsFormat household code collision", () => {
	it("should assign distinct household codes when first household has code and second household has empty code", () => {
		const rawFlatRows = [
			[
				"STT",
				"Mã Hộ",
				"Họ và Tên",
				"Quan Hệ",
				"Ngày Sinh",
				"Giới Tính",
				"Dân Tộc",
				"Tôn Giáo",
				"CCCD",
				"Địa Chỉ",
				"Ghi Chú",
			],
			[
				1,
				"HK-0001",
				"Nguyễn Văn An",
				"Chủ hộ",
				"15/08/1990",
				"Nam",
				"Kinh",
				"Không",
				"",
				"Thôn 1",
				"",
			],
			[
				2,
				"",
				"Lê Thị Bình",
				"Vợ",
				"20/11/1992",
				"Nữ",
				"Kinh",
				"Không",
				"",
				"Thôn 1",
				"",
			],
			[
				3,
				"",
				"Trần Văn Cường",
				"Chủ hộ",
				"10/05/1985",
				"Nam",
				"Kinh",
				"Không",
				"",
				"Thôn 1",
				"",
			],
			[
				4,
				"",
				"Phạm Thị Dung",
				"Vợ",
				"12/08/1988",
				"Nữ",
				"Kinh",
				"Không",
				"",
				"Thôn 1",
				"",
			],
		];

		const parsed = parseExcelSheet(rawFlatRows);

		expect(parsed[0].code).toBe("HK-0001");
		expect(parsed[1].code).toBe("HK-0001");

		expect(parsed[2].code).not.toBe(parsed[0].code);
		expect(parsed[3].code).toBe(parsed[2].code);
	});
});
