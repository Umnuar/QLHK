import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AgeFilterPopover } from "../AgeFilterPopover";

describe("AgeFilterPopover Component", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("1. Render nút trigger mặc định khi chưa có bộ lọc", () => {
		const handleSelect = vi.fn();
		render(
			<AgeFilterPopover currentFilter={null} onSelectFilter={handleSelect} />,
		);

		const button = screen.getByRole("button", { name: /Lọc Độ Tuổi/i });
		expect(button).toBeDefined();
		expect(button.textContent).toContain("Lọc Độ Tuổi");
	});

	it("2. Mở popover và chọn một preset (ví dụ 18 - 27 tuổi)", () => {
		const handleSelect = vi.fn();
		render(
			<AgeFilterPopover currentFilter={null} onSelectFilter={handleSelect} />,
		);

		const trigger = screen.getByRole("button", { name: /Lọc Độ Tuổi/i });
		fireEvent.click(trigger);

		expect(screen.getByText("Lọc Theo Nhóm Tuổi")).toBeDefined();

		const presetBtn = screen.getByText("18 - 27 tuổi");
		fireEvent.click(presetBtn);

		expect(handleSelect).toHaveBeenCalledWith({
			min: 18,
			max: 27,
			label: "18 - 27 tuổi",
		});
	});

	it("3. Nhập khoảng tuổi tùy chỉnh và bấm Áp dụng", () => {
		const handleSelect = vi.fn();
		render(
			<AgeFilterPopover currentFilter={null} onSelectFilter={handleSelect} />,
		);

		const trigger = screen.getByRole("button", { name: /Lọc Độ Tuổi/i });
		fireEvent.click(trigger);

		const minInput = screen.getByPlaceholderText(/Từ \(ví dụ: 18\)/i);
		const maxInput = screen.getByPlaceholderText(/Đến \(ví dụ: 60\)/i);

		fireEvent.change(minInput, { target: { value: "20" } });
		fireEvent.change(maxInput, { target: { value: "35" } });

		const submitBtn = screen.getByRole("button", { name: /Áp dụng/i });
		fireEvent.click(submitBtn);

		expect(handleSelect).toHaveBeenCalledWith({
			min: 20,
			max: 35,
			label: "20 - 35 tuổi",
		});
	});

	it("4. Hiển thị badge bộ lọc đang chọn và bấm nút Xóa lọc", () => {
		const handleSelect = vi.fn();
		render(
			<AgeFilterPopover
				currentFilter={{ min: 18, max: 60, label: "18 - 60 tuổi" }}
				onSelectFilter={handleSelect}
			/>,
		);

		expect(screen.getByText("18 - 60 tuổi")).toBeDefined();

		const clearBtn = screen.getByRole("button", { name: /Xóa lọc độ tuổi/i });
		fireEvent.click(clearBtn);

		expect(handleSelect).toHaveBeenCalledWith(null);
	});
});
