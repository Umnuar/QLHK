// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import type { ParsedExcelRow } from "../../../utils/excelParser";
import { ImportPreviewModal } from "../ImportPreviewModal";

describe("ImportPreviewModal Component", () => {
	it("1. Render null khi isOpen = false mà không gây lỗi Hooks", () => {
		const { container } = render(
			<ImportPreviewModal isOpen={false} onClose={vi.fn()} />,
		);
		expect(container.firstChild).toBeNull();
	});

	it("2. Chuyển đổi trạng thái từ isOpen = false sang isOpen = true mà không vi phạm Rules of Hooks", () => {
		// Đây là kịch bản trực tiếp gây ra lỗi "Rendered more hooks than during the previous render"
		const { container, rerender } = render(
			<ImportPreviewModal isOpen={false} onClose={vi.fn()} />,
		);
		expect(container.firstChild).toBeNull();

		// Rerender với isOpen = true
		rerender(<ImportPreviewModal isOpen={true} onClose={vi.fn()} />);

		// Modal phải hiển thị tiêu đề chính xác
		expect(
			screen.getByText(/Nhập dữ liệu Excel — Hộ gia đình/i),
		).toBeDefined();
		expect(
			screen.getByText(/Chọn tệp Excel để bắt đầu đối soát dữ liệu/i),
		).toBeDefined();

		// Rerender lại về isOpen = false
		rerender(<ImportPreviewModal isOpen={false} onClose={vi.fn()} />);
		expect(container.firstChild).toBeNull();
	});

	it("3. Hiển thị dữ liệu parsedData và gọi onConfirm với các dòng hợp lệ khi có file", () => {
		const handleConfirm = vi.fn();
		const handleClose = vi.fn();

		const mockRows: ParsedExcelRow[] = [
			{
				index: 0,
				stt: "1",
				code: "HK-001",
				fullName: "Nguyễn Văn A",
				relationship: "Chủ hộ",
				dobRaw: "01/01/1980",
				gender: "Nam",
				ethnicity: "Kinh",
				religion: "Không",
				cccd: "123456789012",
				address: "Thôn 1",
				notes: "",
				hasError: false,
			},
			{
				index: 1,
				stt: "2",
				code: "HK-001",
				fullName: "Trần Thị B",
				relationship: "Vợ",
				dobRaw: "32/13/1985",
				gender: "Nữ",
				ethnicity: "Kinh",
				religion: "Không",
				cccd: "",
				address: "Thôn 1",
				notes: "",
				hasError: true,
				dobError: "Ngày sinh không hợp lệ",
			},
		];

		const mockFile = new File([""], "test_nhan_khau.xlsx");

		render(
			<ImportPreviewModal
				isOpen={true}
				file={mockFile}
				onClose={handleClose}
				parsedData={mockRows}
				onConfirm={handleConfirm}
			/>,
		);

		// Kiểm tra hiển thị số lượng hợp lệ và thông báo lỗi
		expect(screen.getByText(/Hợp lệ: 1 nhân khẩu/i)).toBeDefined();
		expect(
			screen.getByText(/Phát hiện 1 dòng có lỗi ngày sinh/i),
		).toBeDefined();

		// Kiểm tra hiển thị tên nhân khẩu trong bảng
		expect(screen.getByText("Nguyễn Văn A")).toBeDefined();
		expect(screen.getByText("Trần Thị B")).toBeDefined();

		// Bấm nút Xác Nhận Nhập
		const confirmBtn = screen.getByRole("button", {
			name: /Xác Nhận Nhập \(1 Hợp Lệ\)/i,
		});
		fireEvent.click(confirmBtn);
		expect(handleConfirm).toHaveBeenCalledTimes(1);
		expect(handleConfirm).toHaveBeenCalledWith([mockRows[0]]);

		// Bấm nút Hủy Bỏ
		const cancelBtn = screen.getByRole("button", { name: /Hủy Bỏ/i });
		fireEvent.click(cancelBtn);
		expect(handleClose).toHaveBeenCalledTimes(1);
	});

	it("4. Gọi onClose khi bấm nút X ở header lúc chưa chọn file", () => {
		const handleClose = vi.fn();

		render(<ImportPreviewModal isOpen={true} onClose={handleClose} />);

		// Nút đóng modal ở header có icon X
		const closeButtons = screen.getAllByRole("button");
		// Button đầu tiên trong header là nút X (hoặc chứa svg lucide-x)
		const xButton = closeButtons.find((btn) =>
			btn.querySelector("svg.lucide-x"),
		);
		expect(xButton).toBeDefined();
		if (xButton) {
			fireEvent.click(xButton);
			expect(handleClose).toHaveBeenCalledTimes(1);
		}
	});

	it("5. Xử lý parsedData dạng mảng 2 chiều thô (raw 2D array) và chuẩn hóa qua useMemo", () => {
		const raw2DData = [
			[
				"STT",
				"Mã sổ",
				"Họ và tên",
				"Quan hệ",
				"Ngày sinh",
				"Giới tính",
				"Dân tộc",
				"Tôn giáo",
				"Số CCCD",
				"Nơi thường trú",
				"Ghi chú",
			],
			[
				1,
				"HK-002",
				"Lê Văn C",
				"Chủ hộ",
				"15/05/1990",
				"Nam",
				"Kinh",
				"Không",
				"012345678901",
				"Thôn 2",
				"",
			],
			[
				2,
				"HK-002",
				"Phạm Thị D",
				"Vợ",
				"20/10/1992",
				"Nữ",
				"Kinh",
				"Không",
				"012345678902",
				"Thôn 2",
				"",
			],
		];

		const mockFile = new File([""], "raw_data.xlsx");

		render(
			<ImportPreviewModal
				isOpen={true}
				file={mockFile}
				onClose={vi.fn()}
				parsedData={raw2DData}
			/>,
		);

		// Kiểm tra đã chuẩn hóa thành công từ mảng thô
		expect(screen.getByText("Lê Văn C")).toBeDefined();
		expect(screen.getByText("Phạm Thị D")).toBeDefined();
		expect(screen.getByText(/Hợp lệ: 2 nhân khẩu/i)).toBeDefined();
	});

	it("6. Vô hiệu hóa nút Xác Nhận Nhập khi không có dòng hợp lệ nào", () => {
		const mockInvalidRows: ParsedExcelRow[] = [
			{
				index: 0,
				stt: "1",
				code: "HK-003",
				fullName: "Lỗi Toàn Bộ",
				relationship: "Chủ hộ",
				dobRaw: "99/99/9999",
				gender: "Nam",
				ethnicity: "Kinh",
				religion: "Không",
				cccd: "",
				address: "Thôn 3",
				notes: "",
				hasError: true,
				dobError: "Ngày sinh sai",
			},
		];

		const mockFile = new File([""], "invalid.xlsx");

		render(
			<ImportPreviewModal
				isOpen={true}
				file={mockFile}
				onClose={vi.fn()}
				parsedData={mockInvalidRows}
			/>,
		);

		const confirmBtn = screen.getByRole("button", {
			name: /Xác Nhận Nhập \(0 Hợp Lệ\)/i,
		});
		expect(confirmBtn).toBeDefined();
		expect((confirmBtn as HTMLButtonElement).disabled).toBe(true);
	});

	it("7. Hiển thị trạng thái đang nhập và vô hiệu hóa nút khi importing = true", () => {
		const mockRows: ParsedExcelRow[] = [
			{
				index: 0,
				stt: "1",
				code: "HK-001",
				fullName: "Nguyễn Văn A",
				relationship: "Chủ hộ",
				dobRaw: "01/01/1980",
				gender: "Nam",
				ethnicity: "Kinh",
				religion: "Không",
				cccd: "123456789012",
				address: "Thôn 1",
				notes: "",
				hasError: false,
			},
		];

		const mockFile = new File([""], "test.xlsx");

		render(
			<ImportPreviewModal
				isOpen={true}
				file={mockFile}
				onClose={vi.fn()}
				parsedData={mockRows}
				importing={true}
			/>,
		);

		const importingBtn = screen.getByRole("button", {
			name: /Đang nhập\.\.\./i,
		});
		expect(importingBtn).toBeDefined();
		expect((importingBtn as HTMLButtonElement).disabled).toBe(true);
	});

	it("8. Xử lý phân trang khi số lượng dòng vượt quá limit hiển thị", () => {
		// Tạo 25 dòng
		const manyRows: ParsedExcelRow[] = Array.from({ length: 25 }, (_, i) => ({
			index: i,
			stt: `${i + 1}`,
			code: `HK-${i + 1}`,
			fullName: `Người Thứ ${i + 1}`,
			relationship: i === 0 ? "Chủ hộ" : "Con",
			dobRaw: "01/01/1990",
			gender: "Nam",
			ethnicity: "Kinh",
			religion: "Không",
			cccd: "",
			address: "Thôn 1",
			notes: "",
			hasError: false,
		}));

		const mockFile = new File([""], "many.xlsx");

		render(
			<ImportPreviewModal
				isOpen={true}
				file={mockFile}
				onClose={vi.fn()}
				parsedData={manyRows}
			/>,
		);

		// Trang 1: Người Thứ 1 đến Người Thứ 20
		expect(screen.getByText("Người Thứ 1")).toBeDefined();
		expect(screen.queryByText("Người Thứ 25")).toBeNull();
		expect(screen.getByText("1 / 2")).toBeDefined();

		// Nút Trước phải bị disable ở trang 1
		const prevBtn = screen.getByRole("button", {
			name: "Trước",
		}) as HTMLButtonElement;
		const nextBtn = screen.getByRole("button", {
			name: "Sau",
		}) as HTMLButtonElement;
		expect(prevBtn.disabled).toBe(true);
		expect(nextBtn.disabled).toBe(false);

		// Bấm Sau để sang trang 2
		fireEvent.click(nextBtn);
		expect(screen.getByText("2 / 2")).toBeDefined();
		expect(screen.getByText("Người Thứ 25")).toBeDefined();
		expect(screen.queryByText("Người Thứ 1")).toBeNull();
	});

	it("9. Hỗ trợ sự kiện kéo thả file (drag & drop)", () => {
		render(<ImportPreviewModal isOpen={true} onClose={vi.fn()} />);

		const dropArea = screen
			.getByText(/Kéo thả tệp Excel vào đây/i)
			.closest("div");
		expect(dropArea).toBeDefined();

		if (dropArea) {
			fireEvent.dragOver(dropArea);
			fireEvent.dragLeave(dropArea);
		}
	});

	it('10. Hiển thị cột "2. Hộ Gia Đình", badge [Chủ Hộ] và "Thành viên" thay vì mã sổ lặp lại', () => {
		const mockRows: ParsedExcelRow[] = [
			{
				index: 0,
				stt: "1",
				code: "HK-001",
				fullName: "Chủ Hộ Test",
				relationship: "Chủ hộ",
				dobRaw: "01/01/1980",
				gender: "Nam",
				ethnicity: "Kinh",
				religion: "Không",
				cccd: "",
				address: "Thôn 1",
				notes: "",
				hasError: false,
			},
			{
				index: 1,
				stt: "2",
				code: "HK-001",
				fullName: "Thành Viên Test",
				relationship: "Con đẻ",
				dobRaw: "01/01/2010",
				gender: "Nữ",
				ethnicity: "Kinh",
				religion: "Không",
				cccd: "",
				address: "Thôn 1",
				notes: "",
				hasError: false,
			},
		];

		const mockFile = new File([""], "test.xlsx");

		render(
			<ImportPreviewModal
				isOpen={true}
				file={mockFile}
				onClose={vi.fn()}
				parsedData={mockRows}
			/>,
		);

		// Kiểm tra tiêu đề cột 2 đã đổi thành "2. Hộ Gia Đình"
		expect(screen.getByText("2. Hộ Gia Đình")).toBeDefined();
		expect(screen.queryByText("2. Mã Sổ / Hộ")).toBeNull();

		// Dòng chủ hộ hiển thị badge [Chủ Hộ]
		const headBadge = screen.getByText("[Chủ Hộ]");
		expect(headBadge).toBeDefined();

		// Dòng chủ hộ có border phân tách ranh giới hộ gia đình
		const headCell = headBadge.closest("td");
		expect(headCell?.className).toContain("border-t-2");
		expect(headCell?.className).toContain("border-emerald-500/30");

		// Dòng thành viên hiển thị Thành viên và không có border-t-2
		const memberText = screen.getByText("Thành viên");
		expect(memberText).toBeDefined();
		const memberCell = memberText.closest("td");
		expect(memberCell?.className).not.toContain("border-t-2");
	});

	it('11. Nhận diện chính xác quan hệ viết tắt "CH" và không dấu "chu ho" là Chủ Hộ', () => {
		const mockRows: ParsedExcelRow[] = [
			{
				index: 0,
				stt: "1",
				code: "HK-002",
				fullName: "Chủ Hộ Viết Tắt CH",
				relationship: "CH",
				dobRaw: "05/05/1975",
				gender: "Nam",
				ethnicity: "Kinh",
				religion: "Không",
				cccd: "",
				address: "Thôn 2",
				notes: "",
				hasError: false,
			},
			{
				index: 1,
				stt: "2",
				code: "HK-003",
				fullName: "Chủ Hộ Không Dấu",
				relationship: "chu ho",
				dobRaw: "10/10/1982",
				gender: "Nữ",
				ethnicity: "Kinh",
				religion: "Không",
				cccd: "",
				address: "Thôn 3",
				notes: "",
				hasError: false,
			},
		];

		render(
			<ImportPreviewModal
				isOpen={true}
				file={new File([""], "test_ch.xlsx")}
				onClose={vi.fn()}
				parsedData={mockRows}
			/>,
		);

		// Cả 2 dòng đều phải hiển thị badge [Chủ Hộ]
		const headBadges = screen.getAllByText("[Chủ Hộ]");
		expect(headBadges).toHaveLength(2);
	});
});
