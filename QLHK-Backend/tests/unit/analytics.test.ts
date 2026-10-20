import { describe, it, expect } from "vitest";
import {
  calculatePercentagesWithLargestRemainder,
  extractBirthYear,
} from "../../src/controllers/analytics.controller";

describe("Analytics Unit Tests - Hare-Niemeyer Algorithm", () => {
  it("phân bổ tỷ lệ chính xác tổng 100.0% trên dữ liệu đa dân tộc", () => {
    const ethnicities = [
      { name: "Kinh", count: 8524 },
      { name: "Xơ Đăng", count: 1245 },
      { name: "Ba Na", count: 542 },
      { name: "Gia Rai", count: 321 },
      { name: "Tày", count: 154 },
      { name: "Nùng", count: 98 },
      { name: "Mường", count: 45 },
      { name: "Thái", count: 32 },
      { name: "Dao", count: 21 },
      { name: "H'Mông", count: 15 },
      { name: "Ê Đê", count: 11 },
      { name: "Khác", count: 8 },
    ];

    const result = calculatePercentagesWithLargestRemainder(ethnicities);

    expect(result.length).toBe(12);
    expect(result[0].name).toBe("Kinh");
    expect(result[0].count).toBe(8524);
    expect(result[0].percentage).toBeGreaterThan(0);

    const sum = Number(
      result.reduce((acc, item) => acc + item.percentage, 0).toFixed(1),
    );
    expect(sum).toBe(100.0);
  });

  it("xử lý mảng rỗng trả về mảng rỗng", () => {
    const result = calculatePercentagesWithLargestRemainder([]);
    expect(result).toEqual([]);
  });

  it("xử lý tổng số lượng bằng 0 hoặc âm", () => {
    const items = [
      { id: "a", count: 0 },
      { id: "b", count: 0 },
    ];
    const result = calculatePercentagesWithLargestRemainder(items);
    expect(result[0].percentage).toBe(0);
    expect(result[1].percentage).toBe(0);
  });

  it("xử lý một danh mục duy nhất đạt chính xác 100.0%", () => {
    const items = [{ id: "single", count: 150 }];
    const result = calculatePercentagesWithLargestRemainder(items);
    expect(result[0].percentage).toBe(100.0);
  });

  it("bảo toàn thuộc tính mở rộng của các phần tử gốc", () => {
    const items = [
      { id: "x", label: "Nhóm X", code: 101, count: 50 },
      { id: "y", label: "Nhóm Y", code: 102, count: 50 },
    ];
    const result = calculatePercentagesWithLargestRemainder(items);
    expect(result[0].id).toBe("x");
    expect(result[0].label).toBe("Nhóm X");
    expect(result[0].code).toBe(101);
    expect(result[0].percentage).toBe(50.0);
    expect(result[1].percentage).toBe(50.0);
  });
});

describe("Analytics Unit Tests - Zero-Allocation Birth Year Parsing", () => {
  it("bóc tách chính xác năm sinh từ chuỗi ngày tháng năm chuẩn", () => {
    expect(extractBirthYear("15/08/1995")).toBe(1995);
    expect(extractBirthYear("01-01-2000")).toBe(2000);
    expect(extractBirthYear("1988")).toBe(1988);
  });

  it("xử lý khoảng trắng thừa ở cuối chuỗi", () => {
    expect(extractBirthYear("20/11/2005   ")).toBe(2005);
    expect(extractBirthYear("1970 \t \n")).toBe(1970);
  });

  it("trả về null cho chuỗi không hợp lệ hoặc thiếu dữ liệu", () => {
    expect(extractBirthYear(null)).toBeNull();
    expect(extractBirthYear(undefined)).toBeNull();
    expect(extractBirthYear("")).toBeNull();
    expect(extractBirthYear("   ")).toBeNull();
    expect(extractBirthYear("không rõ")).toBeNull();
    expect(extractBirthYear("123")).toBeNull();
    expect(extractBirthYear("199a")).toBeNull();
  });
});
