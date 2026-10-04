import { describe, expect, it } from "vitest";
import { maskCccd, validateCccd } from "../cccd";
import { calculateAge, formatDobDisplay, parseAndValidateDob } from "../date";
import {
	joinFullName,
	matchesSearch,
	normalizeUnaccented,
	splitFullName,
} from "../vietnamese";

describe("Vietnamese Utilities", () => {
	describe("normalizeUnaccented", () => {
		it("bỏ dấu tiếng Việt hoa thường và chữ đ/Đ", () => {
			expect(normalizeUnaccented("Đăk Hà")).toBe("dak ha");
			expect(normalizeUnaccented("Nguyễn Văn An")).toBe("nguyen van an");
			expect(normalizeUnaccented("Giẻ Triêng")).toBe("gie trieng");
			expect(normalizeUnaccented("Xơ Đăng")).toBe("xo dang");
			expect(normalizeUnaccented("A Tik")).toBe("a tik");
			expect(normalizeUnaccented("Y Krông")).toBe("y krong");
		});

		it("xử lý chuỗi rỗng hoặc undefined", () => {
			expect(normalizeUnaccented("")).toBe("");
			expect(normalizeUnaccented(null)).toBe("");
			expect(normalizeUnaccented(undefined)).toBe("");
		});
	});

	describe("splitFullName", () => {
		it("tách đúng họ lót và tên cho tên 3 từ", () => {
			const res = splitFullName("Nguyễn Văn An");
			expect(res.lastName).toBe("Nguyễn Văn");
			expect(res.firstName).toBe("An");
		});

		it("tách đúng cho tên 2 từ", () => {
			const res = splitFullName("Trần Nam");
			expect(res.lastName).toBe("Trần");
			expect(res.firstName).toBe("Nam");
		});

		it("tách đúng cho tên dân tộc thiểu số", () => {
			const res1 = splitFullName("A Tik");
			expect(res1.lastName).toBe("A");
			expect(res1.firstName).toBe("Tik");

			const res2 = splitFullName("Y Blơr");
			expect(res2.lastName).toBe("Y");
			expect(res2.firstName).toBe("Blơr");
		});

		it("xử lý tên 1 từ", () => {
			const res = splitFullName("Hùng");
			expect(res.lastName).toBe("");
			expect(res.firstName).toBe("Hùng");
		});

		it("xử lý chuỗi nhiều khoảng trắng thừa", () => {
			const res = splitFullName("   Lê   Thị   Mai   ");
			expect(res.lastName).toBe("Lê Thị");
			expect(res.firstName).toBe("Mai");
		});
	});

	describe("joinFullName", () => {
		it("ghép họ lót và tên chuẩn mực", () => {
			expect(joinFullName("Nguyễn Văn", "An")).toBe("Nguyễn Văn An");
			expect(joinFullName("A", "Tik")).toBe("A Tik");
			expect(joinFullName("", "Thảo")).toBe("Thảo");
			expect(joinFullName("Trần", "")).toBe("Trần");
			expect(joinFullName("", "")).toBe("");
		});
	});

	describe("matchesSearch", () => {
		it("tìm kiếm không phân biệt dấu và hoa thường", () => {
			expect(matchesSearch("nguyen", "Nguyễn Văn An")).toBe(true);
			expect(matchesSearch("AN", "Nguyễn Văn An")).toBe(true);
			expect(matchesSearch("dak ha", "Ủy ban Xã Đăk Hà")).toBe(true);
			expect(matchesSearch("xo dang", "Dân tộc Xơ Đăng")).toBe(true);
			expect(matchesSearch("khong tim thay", "Nguyễn Văn An")).toBe(false);
		});
	});
});

describe("Date & Age Utilities", () => {
	describe("parseAndValidateDob", () => {
		it("hợp lệ: ngày đầy đủ DD/MM/YYYY", () => {
			const res = parseAndValidateDob("15/08/1990");
			expect(res.isValid).toBe(true);
			expect(res.birthYear).toBe(1990);
			expect(res.formatted).toBe("15/08/1990");
			expect(res.type).toBe("full");
		});

		it("hợp lệ: tháng/năm MM/YYYY", () => {
			const res = parseAndValidateDob("05/1985");
			expect(res.isValid).toBe(true);
			expect(res.birthYear).toBe(1985);
			expect(res.formatted).toBe("05/1985");
			expect(res.type).toBe("month_year");
		});

		it("hợp lệ: chỉ năm sinh YYYY", () => {
			const res = parseAndValidateDob("1960");
			expect(res.isValid).toBe(true);
			expect(res.birthYear).toBe(1960);
			expect(res.formatted).toBe("1960");
			expect(res.type).toBe("year_only");
		});

		it("lỗi: năm sinh thiếu số (ví dụ đề bài: 11/01/976)", () => {
			const res = parseAndValidateDob("11/01/976");
			expect(res.isValid).toBe(false);
			expect(res.error).toContain("phải đủ 4 chữ số");
		});

		it("lỗi: tháng sai (ví dụ đề bài: 15/17/1989 có tháng 17)", () => {
			const res = parseAndValidateDob("15/17/1989");
			expect(res.isValid).toBe(false);
			expect(res.error).toContain("Tháng 17 không hợp lệ");
		});

		it("lỗi: ngày sai so với số ngày trong tháng (ví dụ: 32/01/2000, 31/04/1995)", () => {
			const res1 = parseAndValidateDob("32/01/2000");
			expect(res1.isValid).toBe(false);
			expect(res1.error).toContain("Ngày 32 không hợp lệ");

			const res2 = parseAndValidateDob("31/04/1995");
			expect(res2.isValid).toBe(false);
			expect(res2.error).toContain("chỉ có 30 ngày");
		});

		it("lỗi: năm sinh vượt quá năm hiện tại", () => {
			const res = parseAndValidateDob("2099");
			expect(res.isValid).toBe(false);
			expect(res.error).toContain("phải từ 1900 đến 2026");
		});
	});

	describe("calculateAge", () => {
		it("tính tuổi chính xác đến năm hiện hành 2026", () => {
			expect(calculateAge("15/08/1990", 2026)).toBe(36);
			expect(calculateAge("05/1985", 2026)).toBe(41);
			expect(calculateAge("1960", 2026)).toBe(66);
			expect(calculateAge(2000, 2026)).toBe(26);
		});

		it("trả về 0 cho ngày sinh không hợp lệ", () => {
			expect(calculateAge("invalid-date")).toBe(0);
			expect(calculateAge("")).toBe(0);
		});
	});

	describe("formatDobDisplay", () => {
		it("định dạng hiển thị chuẩn", () => {
			expect(formatDobDisplay("5/8/1990")).toBe("05/08/1990");
			expect(formatDobDisplay("6/1980")).toBe("06/1980");
			expect(formatDobDisplay("1975")).toBe("1975");
		});
	});
});

describe("CCCD Utilities", () => {
	describe("maskCccd", () => {
		it("ẩn các số đầu và chỉ hiển thị 4 số cuối", () => {
			expect(maskCccd("060098001234")).toBe("••••••••1234");
			expect(maskCccd("230123456")).toBe("•••••3456");
		});

		it("hiển thị đầy đủ khi bật cờ showFull (quyền Admin)", () => {
			expect(maskCccd("060098001234", true)).toBe("060098001234");
		});

		it("xử lý giá trị trống", () => {
			expect(maskCccd("")).toBe("Chưa có");
			expect(maskCccd(null)).toBe("Chưa có");
		});
	});

	describe("validateCccd", () => {
		it("hợp lệ: 12 số CCCD mới", () => {
			expect(validateCccd("060098001234").isValid).toBe(true);
		});

		it("hợp lệ: 9 số CMND cũ", () => {
			expect(validateCccd("230987654").isValid).toBe(true);
		});

		it("lỗi: chứa ký tự chữ cái", () => {
			const res = validateCccd("06009800123A");
			expect(res.isValid).toBe(false);
			expect(res.error).toContain("chỉ được chứa các chữ số");
		});

		it("lỗi: sai độ dài (ví dụ 10 số)", () => {
			const res = validateCccd("1234567890");
			expect(res.isValid).toBe(false);
			expect(res.error).toContain("phải gồm 12 chữ số");
		});
	});
});
