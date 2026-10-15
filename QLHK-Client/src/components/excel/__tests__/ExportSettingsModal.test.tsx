import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import {
	EXPORT_COLUMNS,
	type ExportConfig,
	ExportSettingsModal,
} from "../ExportSettingsModal";

describe("ExportSettingsModal Component", () => {
	it("1. Render null khi isOpen = false mà không vi phạm Rules of Hooks", () => {
		const { container } = render(
			<ExportSettingsModal
				isOpen={false}
				onClose={vi.fn()}
				onExport={vi.fn()}
				exporting={false}
			/>,
		);
		expect(container.firstChild).toBeNull();
	});

	it("2. Hiển thị đúng Tab 1 'Biểu mẫu 11 cột Đăk Hà' theo mặc định", () => {
		render(
			<ExportSettingsModal
				isOpen={true}
				onClose={vi.fn()}
				onExport={vi.fn()}
				exporting={false}
				villageName="Thôn 1"
			/>,
		);

		expect(screen.getByText(/Cài Đặt Xuất File Excel/i)).toBeDefined();
		expect(screen.getByText(/Biểu mẫu 11 cột Đăk Hà/i)).toBeDefined();
		expect(screen.getByText(/Báo cáo chuyên đề tùy chọn/i)).toBeDefined();
		expect(screen.getByText(/Toàn bộ Sổ Hộ Khẩu/i)).toBeDefined();
	});

	it("3. Chuyển sang Tab 2 và hiển thị đầy đủ bộ lọc tuổi, tiêu chí và 16 cột", () => {
		render(
			<ExportSettingsModal
				isOpen={true}
				onClose={vi.fn()}
				onExport={vi.fn()}
				exporting={false}
			/>,
		);

		// Chuyển sang Tab 2
		const customTabBtn = screen.getByRole("tab", {
			name: /Báo cáo chuyên đề tùy chọn/i,
		});
		fireEvent.click(customTabBtn);

		// Kiểm tra phần lọc tuổi
		expect(screen.getByText(/1\. Lọc theo độ tuổi/i)).toBeDefined();
		expect(screen.getByLabelText(/Từ tuổi/i)).toBeDefined();
		expect(screen.getByLabelText(/Đến tuổi/i)).toBeDefined();

		// Kiểm tra tiêu chí chuyên đề qua placeholder
		expect(screen.getByText(/2\. Tiêu chí chuyên đề/i)).toBeDefined();
		expect(screen.getByPlaceholderText(/VD: Đủ điều kiện, Xuất ngũ/i)).toBeDefined();
		expect(screen.getByPlaceholderText(/VD: Đại học, 12\/12/i)).toBeDefined();
		expect(screen.getByPlaceholderText(/VD: Làm nông, Công nhân/i)).toBeDefined();

		// Kiểm tra 16 cột
		expect(
			screen.getByText(new RegExp(`3\\. Tùy biến cột xuất \\(16\\/${EXPORT_COLUMNS.length} cột\\)`)),
		).toBeDefined();
	});

	it("4. Hoạt động của nút 'Bỏ chọn tất cả' và 'Chọn tất cả' cột xuất", () => {
		render(
			<ExportSettingsModal
				isOpen={true}
				onClose={vi.fn()}
				onExport={vi.fn()}
				exporting={false}
			/>,
		);

		fireEvent.click(
			screen.getByRole("tab", { name: /Báo cáo chuyên đề tùy chọn/i }),
		);

		const deselectAllBtn = screen.getByRole("button", {
			name: /^Bỏ chọn tất cả$/i,
		});
		fireEvent.click(deselectAllBtn);

		expect(screen.getByText(/3\. Tùy biến cột xuất \(0\/16 cột\)/i)).toBeDefined();
		expect(
			screen.getByText(/\* Vui lòng chọn ít nhất 1 cột để xuất dữ liệu\./i),
		).toBeDefined();

		const selectAllBtn = screen.getByRole("button", {
			name: /^Chọn tất cả$/i,
		});
		fireEvent.click(selectAllBtn);

		expect(screen.getByText(/3\. Tùy biến cột xuất \(16\/16 cột\)/i)).toBeDefined();
	});

	it("5. Gửi đúng ExportConfig khi bấm 'Xuất tệp Excel'", () => {
		const handleExport = vi.fn();
		render(
			<ExportSettingsModal
				isOpen={true}
				onClose={vi.fn()}
				onExport={handleExport}
				exporting={false}
			/>,
		);

		// Tab 2
		fireEvent.click(
			screen.getByRole("tab", { name: /Báo cáo chuyên đề tùy chọn/i }),
		);

		// Nhập tuổi
		fireEvent.change(screen.getByLabelText(/Từ tuổi/i), {
			target: { value: "18" },
		});
		fireEvent.change(screen.getByLabelText(/Đến tuổi/i), {
			target: { value: "27" },
		});

		// Nhập từ khóa NVQS
		fireEvent.change(
			screen.getByPlaceholderText(/VD: Đủ điều kiện, Xuất ngũ/i),
			{
				target: { value: "Đủ điều kiện" },
			},
		);

		// Bấm xuất
		const exportBtn = screen.getByRole("button", { name: /Xuất tệp Excel/i });
		fireEvent.click(exportBtn);

		expect(handleExport).toHaveBeenCalledTimes(1);
		const config: ExportConfig = handleExport.mock.calls[0][0];
		expect(config.tab).toBe("custom");
		expect(config.minAge).toBe(18);
		expect(config.maxAge).toBe(27);
		expect(config.militaryKeyword).toBe("Đủ điều kiện");
		expect(config.selectedColumns.length).toBe(16);
	});
});
