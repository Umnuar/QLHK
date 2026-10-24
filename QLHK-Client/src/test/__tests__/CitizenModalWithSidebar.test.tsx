import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { householdApi } from "@/api/householdApi";
import type { Person } from "@/types";
import {
	CitizenModalWithSidebar,
	SAMPLE_CITIZEN_FROM_SCREENSHOT,
} from "../index";

vi.mock("@/api/householdApi", () => ({
	householdApi: {
		revealCitizenCCCD: vi.fn(),
	},
}));

describe("CitizenModalWithSidebar Component", () => {
	const mockOnClose = vi.fn();
	const mockOnSave = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("1. Render modal mẫu với sidebar chia đôi 2 mục và nạp dữ liệu từ ảnh chụp", () => {
		render(
			<CitizenModalWithSidebar
				isOpen={true}
				initialMember={SAMPLE_CITIZEN_FROM_SCREENSHOT}
				onClose={mockOnClose}
				onSave={mockOnSave}
			/>,
		);

		expect(screen.getByText("Sửa Thông Tin Nhân Khẩu")).toBeInTheDocument();
		expect(screen.getByText("Thông tin cơ bản")).toBeInTheDocument();
		expect(screen.getByText("Nghề nghiệp & Nghĩa vụ")).toBeInTheDocument();

		expect(screen.getByText("ĐH")).toBeInTheDocument();
		expect(screen.getByText("★ Chủ hộ")).toBeInTheDocument();
		expect(screen.getByText("11 tuổi")).toBeInTheDocument();

		const nameInput = screen.getByDisplayValue("ĐINH THANH HIẾU");
		expect(nameInput).toBeInTheDocument();

		const dobInput = screen.getByDisplayValue("02/05/2015");
		expect(dobInput).toBeInTheDocument();
	});

	it("2. Chuyển đổi mượt mà giữa Tab Thông tin cơ bản và Tab Nghề nghiệp", () => {
		render(
			<CitizenModalWithSidebar
				isOpen={true}
				initialMember={SAMPLE_CITIZEN_FROM_SCREENSHOT}
				onClose={mockOnClose}
				onSave={mockOnSave}
			/>,
		);

		expect(screen.getByText("Mục 1/2: Thông tin cơ bản")).toBeInTheDocument();
		expect(screen.getByText("Mục tiếp theo: Nghề nghiệp")).toBeInTheDocument();

		const careerTabBtn = screen.getByRole("button", {
			name: /Nghề nghiệp & Nghĩa vụ/i,
		});
		fireEvent.click(careerTabBtn);

		expect(
			screen.getByText("Mục 2/2: Nghề nghiệp & Nghĩa vụ"),
		).toBeInTheDocument();
		expect(screen.getByLabelText("Nghề nghiệp")).toBeInTheDocument();
		expect(screen.getByLabelText("Trình độ học vấn")).toBeInTheDocument();
		expect(
			screen.getByLabelText("Tình hình thực hiện nghĩa vụ quân sự"),
		).toBeInTheDocument();
		expect(
			screen.getByLabelText("Ghi chú nhân khẩu / Bổ sung"),
		).toBeInTheDocument();
		expect(
			screen.getByText("← Quay lại: Thông tin cơ bản"),
		).toBeInTheDocument();

		const backBtn = screen.getByText("← Quay lại: Thông tin cơ bản");
		fireEvent.click(backBtn);

		expect(screen.getByText("Mục 1/2: Thông tin cơ bản")).toBeInTheDocument();
	});

	it("3. Nút 'Mục tiếp theo: Nghề nghiệp' điều hướng sang tab nghề nghiệp", () => {
		render(
			<CitizenModalWithSidebar
				isOpen={true}
				initialMember={SAMPLE_CITIZEN_FROM_SCREENSHOT}
				onClose={mockOnClose}
				onSave={mockOnSave}
			/>,
		);

		const nextBtn = screen.getByText("Mục tiếp theo: Nghề nghiệp");
		fireEvent.click(nextBtn);

		expect(
			screen.getByText("Mục 2/2: Nghề nghiệp & Nghĩa vụ"),
		).toBeInTheDocument();
	});

	it("4. Báo lỗi và tự động chuyển về Tab cơ bản khi thiếu họ tên", () => {
		render(
			<CitizenModalWithSidebar
				isOpen={true}
				initialMember={null}
				onClose={mockOnClose}
				onSave={mockOnSave}
			/>,
		);

		const careerTabBtn = screen.getByRole("button", {
			name: /Nghề nghiệp & Nghĩa vụ/i,
		});
		fireEvent.click(careerTabBtn);
		expect(
			screen.getByText("Mục 2/2: Nghề nghiệp & Nghĩa vụ"),
		).toBeInTheDocument();

		const saveBtn = screen.getByRole("button", { name: /Lưu nhân khẩu/i });
		fireEvent.click(saveBtn);

		expect(
			screen.getByText("Vui lòng nhập họ và tên nhân khẩu."),
		).toBeInTheDocument();
		expect(screen.getByText("Mục 1/2: Thông tin cơ bản")).toBeInTheDocument();
		expect(mockOnSave).not.toHaveBeenCalled();
	});

	it("5. Cập nhật và lưu thành công thông tin nhân khẩu", () => {
		render(
			<CitizenModalWithSidebar
				isOpen={true}
				initialMember={SAMPLE_CITIZEN_FROM_SCREENSHOT}
				onClose={mockOnClose}
				onSave={mockOnSave}
			/>,
		);

		const careerTabBtn = screen.getByRole("button", {
			name: /Nghề nghiệp & Nghĩa vụ/i,
		});
		fireEvent.click(careerTabBtn);

		const occupationInput = screen.getByLabelText("Nghề nghiệp");
		fireEvent.change(occupationInput, { target: { value: "Học sinh" } });

		const saveBtn = screen.getByRole("button", { name: /Lưu nhân khẩu/i });
		fireEvent.click(saveBtn);

		expect(mockOnSave).toHaveBeenCalledTimes(1);
		expect(mockOnSave).toHaveBeenCalledWith(
			expect.objectContaining({
				full_name: "ĐINH THANH HIẾU",
				occupation: "Học sinh",
				relationship: "Chủ hộ",
				is_head: true,
				ethnicity: "Giẻ Triêng",
				religion: "Công giáo",
			}),
		);
		expect(mockOnClose).toHaveBeenCalledTimes(1);
	});
});
