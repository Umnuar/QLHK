// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CustomSelect } from "../CustomSelect";

describe("CustomSelect Component", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("1. Render options dạng string và object chuẩn xác", () => {
		const handleChange = vi.fn();
		const stringOptions = ["Nam", "Nữ"];

		const { rerender } = render(
			<CustomSelect
				value="Nam"
				onChange={handleChange}
				options={stringOptions}
				placeholder="Chọn giới tính"
			/>,
		);

		// Kiểm tra trigger hiển thị đúng option string đang chọn
		const trigger = screen.getByRole("button");
		expect(trigger.textContent).toContain("Nam");

		// Mở dropdown để xem danh sách options dạng string
		fireEvent.click(trigger);
		const optionsRendered = screen.getAllByRole("option");
		expect(optionsRendered).toHaveLength(2);
		expect(optionsRendered[0].textContent).toContain("Nam");
		expect(optionsRendered[1].textContent).toContain("Nữ");

		// Rerender với options dạng object có badge và subLabel
		const objectOptions = [
			{ value: "thon1", label: "Thôn 1", badge: "Trung tâm" },
			{ value: "thon2", label: "Thôn 2", subLabel: "Khu vực phía Nam" },
		];

		rerender(
			<CustomSelect
				value="thon1"
				onChange={handleChange}
				options={objectOptions}
				placeholder="Chọn thôn"
			/>,
		);

		expect(screen.getByRole("button").textContent).toContain("Thôn 1");
		expect(screen.getByRole("button").textContent).toContain("Trung tâm");
	});

	it("2. Test trigger mở và đóng dropdown khi click", () => {
		const handleChange = vi.fn();
		const options = ["Thường trú", "Tạm trú", "Tạm vắng"];

		render(
			<CustomSelect
				value="Thường trú"
				onChange={handleChange}
				options={options}
			/>,
		);

		const trigger = screen.getByRole("button");
		expect(screen.queryByRole("listbox")).toBeNull();

		// Click lần 1: Mở dropdown
		fireEvent.click(trigger);
		expect(screen.getByRole("listbox")).toBeTruthy();
		expect(trigger.getAttribute("aria-expanded")).toBe("true");

		// Click lần 2: Đóng dropdown
		fireEvent.click(trigger);
		expect(screen.queryByRole("listbox")).toBeNull();
		expect(trigger.getAttribute("aria-expanded")).toBe("false");
	});

	it("3. Test gọi onChange và đóng dropdown khi chọn mục", () => {
		const handleChange = vi.fn();
		const options = [
			{ value: "user", label: "Trưởng Thôn" },
			{ value: "admin", label: "Cán bộ Xã (Admin)" },
		];

		render(
			<CustomSelect value="user" onChange={handleChange} options={options} />,
		);

		const trigger = screen.getByRole("button");
		fireEvent.click(trigger);

		// Chọn option 'Cán bộ Xã (Admin)'
		const adminOption = screen.getByText("Cán bộ Xã (Admin)");
		fireEvent.click(adminOption);

		// Kiểm tra gọi onChange với đúng value 'admin'
		expect(handleChange).toHaveBeenCalledTimes(1);
		expect(handleChange).toHaveBeenCalledWith("admin");

		// Dropdown tự động đóng sau khi chọn
		expect(screen.queryByRole("listbox")).toBeNull();
	});

	it("4. Test filter tìm kiếm khi searchable={true} hoặc > 8 items", () => {
		const handleChange = vi.fn();
		const ethnicGroups = [
			"Kinh",
			"Xơ Đăng",
			"Gia Rai",
			"Ba Na",
			"Giẻ Triêng",
			"Mơ Nông",
			"Thái",
			"Mường",
			"Tày",
			"Nùng",
		]; // 10 items > 8 => auto hiện search

		render(
			<CustomSelect
				value="Kinh"
				onChange={handleChange}
				options={ethnicGroups}
				searchable={true}
			/>,
		);

		fireEvent.click(screen.getByRole("button"));

		// Tìm input search
		const searchInput = screen.getByPlaceholderText("Tìm kiếm...");
		expect(searchInput).toBeTruthy();

		// Nhập từ khóa 'Xơ Đăng'
		fireEvent.change(searchInput, { target: { value: "Xơ" } });

		// Chỉ còn hiển thị 'Xơ Đăng'
		const visibleOptions = screen.getAllByRole("option");
		expect(visibleOptions).toHaveLength(1);
		expect(visibleOptions[0].textContent).toContain("Xơ Đăng");

		// Tìm từ khóa không tồn tại
		fireEvent.change(searchInput, { target: { value: "KhôngTồnTại" } });
		expect(screen.queryByRole("option")).toBeNull();
		expect(screen.getByText("Không tìm thấy kết quả")).toBeTruthy();
	});

	it("5. Test đóng dropdown khi bấm phím Escape", () => {
		const handleChange = vi.fn();
		const options = ["Mục 1", "Mục 2"];

		render(
			<CustomSelect value="Mục 1" onChange={handleChange} options={options} />,
		);

		fireEvent.click(screen.getByRole("button"));
		expect(screen.getByRole("listbox")).toBeTruthy();

		// Bấm phím Escape
		fireEvent.keyDown(document, { key: "Escape" });
		expect(screen.queryByRole("listbox")).toBeNull();
	});

	it("6. Test đóng dropdown khi click ra ngoài (outside click)", () => {
		const handleChange = vi.fn();
		const options = ["Mục 1", "Mục 2"];

		render(
			<div>
				<div data-testid="outside">Bên ngoài</div>
				<CustomSelect value="Mục 1" onChange={handleChange} options={options} />
			</div>,
		);

		fireEvent.click(screen.getByRole("button"));
		expect(screen.getByRole("listbox")).toBeTruthy();

		// Click ra ngoài container
		fireEvent.mouseDown(screen.getByTestId("outside"));
		expect(screen.queryByRole("listbox")).toBeNull();
	});

	it('7. Hiển thị placeholder dạng font-bold Icon + Text khi value rỗng và có icon hoặc size="sm"', () => {
		const handleChange = vi.fn();
		const options = [
			{ value: "", label: "Tất cả giới tính" },
			{ value: "Nam", label: "Nam" },
			{ value: "Nữ", label: "Nữ" },
		];

		render(
			<CustomSelect
				size="sm"
				value=""
				onChange={handleChange}
				options={options}
				placeholder="Giới tính"
				icon={<span data-testid="test-icon">Icon</span>}
			/>,
		);

		const trigger = screen.getByRole("button");
		expect(screen.getByTestId("test-icon")).toBeTruthy();
		expect(trigger.textContent).toContain("Giới tính");

		// Kiểm tra placeholder có class font-bold khi size="sm" hoặc có icon
		const placeholderSpan = screen.getByText("Giới tính");
		expect(placeholderSpan.className).toContain("font-bold");
	});

	it('8. Test chọn mục rỗng và gọi onChange("")', () => {
		const handleChange = vi.fn();
		const options = [
			{ value: "", label: "Toàn xã (Tất cả thôn)" },
			{ value: "vil-01", label: "Thôn 1" },
		];

		render(
			<CustomSelect
				value="vil-01"
				onChange={handleChange}
				options={options}
				placeholder="Địa bàn thôn"
			/>,
		);

		// Mở dropdown và chọn lại mục rỗng
		const trigger = screen.getByRole("button");
		fireEvent.click(trigger);
		const emptyOption = screen.getByText("Toàn xã (Tất cả thôn)");
		fireEvent.click(emptyOption);

		expect(handleChange).toHaveBeenCalledWith("");
	});
});
