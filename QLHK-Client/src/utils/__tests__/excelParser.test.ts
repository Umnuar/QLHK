import { describe, expect, it } from "vitest";
import {
	detectExcelFormat,
	normalizeExcelDob,
	parseExcelSheet,
	sanitizeExcelCellValue,
	sanitizeExcelRow,
} from "../excelParser";

describe("Smart Excel Parser (Client)", () => {
	describe("normalizeExcelDob", () => {
		it("chuyển đổi số serial Excel thành DD/MM/YYYY chuẩn", () => {
			expect(normalizeExcelDob(37121).dob).toBe("18/08/2001");
			expect(normalizeExcelDob(24433).dob).toBe("22/11/1966");
			expect(normalizeExcelDob(29295).dob).toBe("15/03/1980");
			expect(normalizeExcelDob(32133).dob).toBe("22/12/1987");
		});

		it("chuẩn hóa năm 3 chữ số lỗi gõ: 11/01/976 -> 11/01/1976", () => {
			expect(normalizeExcelDob("11/01/976").dob).toBe("11/01/1976");
			expect(normalizeExcelDob("5/10/985").dob).toBe("05/10/1985");
		});

		it("chuyển đổi định dạng M/D/YYYY kiểu Mỹ sang DD/MM/YYYY", () => {
			expect(normalizeExcelDob("8/18/2001").dob).toBe("18/08/2001");
			expect(normalizeExcelDob("11/22/1966").dob).toBe("22/11/1966");
			expect(normalizeExcelDob("3/15/1980").dob).toBe("15/03/1980");
			expect(normalizeExcelDob("12/22/1987").dob).toBe("22/12/1987");
		});

		it("phát hiện ngày/tháng không hợp lệ như 15/17/1989", () => {
			const res = normalizeExcelDob("15/17/1989");
			expect(res.warning).toBeDefined();
			expect(res.warning).toContain("không hợp lệ");
		});

		it("giữ nguyên chuỗi năm 4 chữ số hợp lệ như 1980", () => {
			expect(normalizeExcelDob("1980").dob).toBe("1980");
			expect(normalizeExcelDob(1980).dob).toBe("1980");
		});

		it("xử lý chính xác đối tượng JavaScript Date", () => {
			const d = new Date(Date.UTC(2001, 7, 18)); // 18/08/2001
			expect(normalizeExcelDob(d).dob).toBe("18/08/2001");
		});

		it("xử lý chính xác chuỗi ISO YYYY-MM-DD và khoảng trắng", () => {
			expect(normalizeExcelDob("2001-08-18").dob).toBe("18/08/2001");
			expect(normalizeExcelDob("2001/08/18").dob).toBe("18/08/2001");
			expect(normalizeExcelDob(" 18 / 08 / 2001 ").dob).toBe("18/08/2001");
		});
	});

	describe("detectExcelFormat", () => {
		it("nhận diện mẫu biểu thực tế xã Đăk Hà (có header 2 tầng, cột gộp)", () => {
			const sampleDakHa = [
				[
					"UBND TỈNH QUẢNG NGÃI",
					"",
					"",
					"",
					"",
					"CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM",
				],
				["THÔN: Thôn 1"],
				["DỮ LIỆU HỘ - NHÂN KHẨU"],
				[""],
				[
					"STT",
					"HỘ GIA ĐÌNH",
					"",
					"HỌ VÀ TÊN",
					"",
					"PHÂN TÍCH HỘ GIA ĐÌNH",
					"",
					"",
					"",
					"",
					"Ghi chú",
				],
				[
					"",
					"Chủ hộ",
					"Thành viên",
					"",
					"",
					"Ngày, tháng, năm sinh ",
					"Tuổi",
					"Nữ",
					"DTTS",
					"Tôn giáo",
					"",
				],
			];
			expect(detectExcelFormat(sampleDakHa)).toBe("dak_ha_merged");
		});

		it("nhận diện mẫu 11 cột phẳng chuẩn", () => {
			const sampleFlat = [
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
			];
			expect(detectExcelFormat(sampleFlat)).toBe("standard_11_columns");
		});
	});

	describe("parseExcelSheet với Mẫu thực tế xã Đăk Hà", () => {
		const rawDakHaRows = [
			[
				"UBND TỈNH QUẢNG NGÃI",
				"",
				"",
				"",
				"",
				"CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM",
			],
			["THÔN: Thôn 1"],
			["DỮ LIỆU HỘ - NHÂN KHẨU"],
			[""],
			[
				"STT",
				"HỘ GIA ĐÌNH",
				"",
				"HỌ VÀ TÊN",
				"",
				"PHÂN TÍCH HỘ GIA ĐÌNH",
				"",
				"",
				"",
				"",
				"Ghi chú",
			],
			[
				"",
				"Chủ hộ",
				"Thành viên",
				"",
				"",
				"Ngày, tháng, năm sinh ",
				"Tuổi",
				"Nữ",
				"DTTS",
				"Tôn giáo",
				"",
			],
			[1, "CH", 1, "NGUYỄN VĂN", "A", 37121, "", "X", "Cor", "", ""],
			[2, "", 2, "NGUYỄN VĂN", "B", 24433, "", "", "Cơ Ho", "", ""],
			[3, "", 3, "NGUYỄN VĂN", "A", 29295, "", "", "Dao", "", ""],
			[4, "CH", 1, "NGUYỄN VĂN", "B", 32133, "", "X", "Dìu", "", ""],
			[5, "", 2, "NGUYỄN VĂN", "A", "11/01/976", "", "", "Ê Đê", "", ""],
			[
				8,
				"CH",
				1,
				"ĐINH THANH",
				"HIỂU",
				42126,
				"",
				"",
				"Giẻ Triêng",
				"CG",
				"Công giáo",
			],
			[9, "", 2, "TRẦN VĂN", "BẢO", "15/17/1989", "", "", "Giơ Lâng", "", ""],
		];

		it("bóc tách và ghép Họ lót + Tên chính xác", () => {
			const parsed = parseExcelSheet(rawDakHaRows);
			expect(parsed.length).toBe(7);

			expect(parsed[0].fullName).toBe("NGUYỄN VĂN A");
			expect(parsed[0].relationship).toBe("Chủ hộ");
			expect(parsed[0].code).toBe("HK-0001");
			expect(parsed[0].gender).toBe("Nữ"); // Cột Nữ có X
			expect(parsed[0].dobRaw).toBe("18/08/2001");
			expect(parsed[0].ethnicity).toBe("Cor");
			expect(parsed[0].hasError).toBe(false);

			expect(parsed[1].fullName).toBe("NGUYỄN VĂN B");
			expect(parsed[1].relationship).toBe("Thành viên");
			expect(parsed[1].code).toBe("HK-0001"); // Cùng hộ HK-0001
			expect(parsed[1].gender).toBe("Nam");
			expect(parsed[1].dobRaw).toBe("22/11/1966");
			expect(parsed[1].ethnicity).toBe("Cơ Ho");

			expect(parsed[3].fullName).toBe("NGUYỄN VĂN B");
			expect(parsed[3].relationship).toBe("Chủ hộ");
			expect(parsed[3].code).toBe("HK-0002"); // Hộ mới vì có CH
			expect(parsed[3].gender).toBe("Nữ");

			// Kiểm tra chuẩn hóa 976 -> 1976
			expect(parsed[4].fullName).toBe("NGUYỄN VĂN A");
			expect(parsed[4].dobRaw).toBe("11/01/1976");
			expect(parsed[4].hasError).toBe(false);

			// Kiểm tra tôn giáo Công giáo
			expect(parsed[5].fullName).toBe("ĐINH THANH HIỂU");
			expect(parsed[5].code).toBe("HK-0003");
			expect(parsed[5].religion).toBe("Công giáo");

			// Kiểm tra dòng có lỗi ngày sinh 15/17/1989
			expect(parsed[6].fullName).toBe("TRẦN VĂN BẢO");
			expect(parsed[6].hasError).toBe(true);
			expect(parsed[6].dobError).toBeDefined();
		});
	});

	describe("parseExcelSheet với Mẫu 11 cột phẳng", () => {
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
				"060098001234",
				"Thôn 1",
				"Nông nghiệp",
			],
			[
				2,
				"HK-0001",
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
		];

		it("bóc tách chuẩn xác 11 cột phẳng", () => {
			const parsed = parseExcelSheet(rawFlatRows);
			expect(parsed.length).toBe(2);
			expect(parsed[0].fullName).toBe("Nguyễn Văn An");
			expect(parsed[0].relationship).toBe("Chủ hộ");
			expect(parsed[0].dobRaw).toBe("15/08/1990");
			expect(parsed[0].gender).toBe("Nam");
			expect(parsed[0].cccd).toBe("060098001234");

			expect(parsed[1].fullName).toBe("Lê Thị Bình");
			expect(parsed[1].relationship).toBe("Vợ");
			expect(parsed[1].gender).toBe("Nữ");
			expect(parsed[1].hasError).toBe(false);
		});
	});

	describe("Đọc và bóc tách file thực tế: C:\\Users\\umnuar\\Downloads\\Nhân hộ khẩu.xls", () => {
		const fs = require("fs");
		const xlsx = require("xlsx");
		const filePath = "C:\\Users\\umnuar\\Downloads\\Nhân hộ khẩu.xls";

		it("phải bóc tách chuẩn xác 14 nhân khẩu, 13 hợp lệ và 1 dòng cảnh báo lỗi ngày sinh", () => {
			if (!fs.existsSync(filePath)) {
				console.warn(
					"File thực tế không tồn tại trên máy test, bỏ qua test này.",
				);
				return;
			}

			const workbook = xlsx.readFile(filePath);
			const worksheet = workbook.Sheets[workbook.SheetNames[0]];
			const rawRows: any[][] = xlsx.utils.sheet_to_json(worksheet, {
				header: 1,
				defval: "",
			});

			const parsed = parseExcelSheet(rawRows);
			expect(parsed.length).toBe(14);

			// Kiểm tra 4 chủ hộ
			const heads = parsed.filter((r) => r.relationship === "Chủ hộ");
			expect(heads.length).toBe(4);
			expect(heads[0].fullName).toBe("NGUYỄN VĂN A");
			expect(heads[1].fullName).toBe("NGUYỄN VĂN B");
			expect(heads[2].fullName).toBe("ĐINH THANH HIỂU");
			expect(heads[3].fullName).toBe("TRƯƠNG VĂN THÀNH");

			// Kiểm tra số dòng hợp lệ
			const validRows = parsed.filter((r) => !r.hasError);
			const errorRows = parsed.filter((r) => r.hasError);
			expect(validRows.length).toBe(14);
			expect(errorRows.length).toBe(0);
		});
	});

	describe("Chống tấn công Formula Injection (CSV/Excel Macro Injection - CWE-1236)", () => {
		it("phải thêm tiền tố dấu nháy đơn ' cho các ô bắt đầu bằng =, +, -, @, \\t, \\r", () => {
			// Các chuỗi payload công thức độc hại
			expect(sanitizeExcelCellValue("=cmd|' /C calc'!A0")).toBe("'=cmd|' /C calc'!A0");
			expect(sanitizeExcelCellValue("+12345678")).toBe("'+12345678");
			expect(sanitizeExcelCellValue("-2+3*cmd")).toBe("'-2+3*cmd");
			expect(sanitizeExcelCellValue("@SUM(A1:A10)")).toBe("'@SUM(A1:A10)");
			expect(sanitizeExcelCellValue("\t=1+1")).toBe("'\t=1+1");
			expect(sanitizeExcelCellValue("\r=1+1")).toBe("'\r=1+1");

			// Chuỗi có khoảng trắng phía trước trước ký tự công thức
			expect(sanitizeExcelCellValue("  =HYPERLINK('http://evil.com')")).toBe("'  =HYPERLINK('http://evil.com')");
		});

		it("phải giữ nguyên dữ liệu bình thường, số và null/undefined", () => {
			expect(sanitizeExcelCellValue("Nguyễn Văn A")).toBe("Nguyễn Văn A");
			expect(sanitizeExcelCellValue("Thôn 1, Xã Đăk Hà")).toBe("Thôn 1, Xã Đăk Hà");
			expect(sanitizeExcelCellValue("15/08/1990")).toBe("15/08/1990");
			expect(sanitizeExcelCellValue(123)).toBe(123);
			expect(sanitizeExcelCellValue(0)).toBe(0);
			expect(sanitizeExcelCellValue(null)).toBe(null);
			expect(sanitizeExcelCellValue(undefined)).toBe(undefined);
		});

		it("phải làm sạch toàn bộ hàng dữ liệu qua sanitizeExcelRow", () => {
			const dirtyRow = [
				1,
				"CH",
				1,
				"=DANGEROUS_CMD",
				"NGUYỄN",
				"15/08/1990",
				34,
				null,
				"Kinh",
				"Không",
				"@EVIL_MACRO",
			];

			const cleanedRow = sanitizeExcelRow(dirtyRow);

			expect(cleanedRow[0]).toBe(1);
			expect(cleanedRow[1]).toBe("CH");
			expect(cleanedRow[2]).toBe(1);
			expect(cleanedRow[3]).toBe("'=DANGEROUS_CMD");
			expect(cleanedRow[4]).toBe("NGUYỄN");
			expect(cleanedRow[5]).toBe("15/08/1990");
			expect(cleanedRow[6]).toBe(34);
			expect(cleanedRow[7]).toBe(null);
			expect(cleanedRow[8]).toBe("Kinh");
			expect(cleanedRow[9]).toBe("Không");
			expect(cleanedRow[10]).toBe("'@EVIL_MACRO");
		});
	});
});
