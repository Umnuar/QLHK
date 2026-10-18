import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { householdApi } from "../../../api/householdApi";
import type { Person } from "../../../types";
import { CitizenModal } from "../CitizenModal";

// Mock API
vi.mock("../../../api/householdApi", () => ({
	householdApi: {
		revealCitizenCCCD: vi.fn(),
	},
}));

describe("CitizenModal Component", () => {
	const mockOnClose = vi.fn();
	const mockOnSave = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("1. Render modal thêm mới và kiểm tra validation rỗng khi thiếu họ tên", () => {
		render(
			<CitizenModal
				isOpen={true}
				initialMember={null}
				onClose={mockOnClose}
				onSave={mockOnSave}
			/>,
		);

		expect(screen.getByText("Thêm Nhân Khẩu Mới")).toBeInTheDocument();
		expect(
			screen.getByText("Nhập đầy đủ thông tin nhân khẩu thuộc xã Đăk Hà"),
		).toBeInTheDocument();

		// Bấm Lưu nhân khẩu khi form trống họ tên
		const submitBtn = screen.getByRole("button", { name: /Lưu nhân khẩu/i });
		fireEvent.click(submitBtn);

		expect(
			screen.getByText("Vui lòng nhập họ và tên nhân khẩu."),
		).toBeInTheDocument();
		expect(mockOnSave).not.toHaveBeenCalled();
	});

	it("2. Kiểm tra validation ngày sinh (bắt buộc, từ chối định dạng sai, chấp nhận DD/MM/YYYY & YYYY)", () => {
		render(
			<CitizenModal
				isOpen={true}
				initialMember={null}
				onClose={mockOnClose}
				onSave={mockOnSave}
			/>,
		);

		const nameInput = screen.getByLabelText(/Họ và Tên/i);
		const dobInput = screen.getByLabelText(/Ngày sinh/i);
		const submitBtn = screen.getByRole("button", { name: /Lưu nhân khẩu/i });

		// Nhập tên nhưng bỏ trống ngày sinh
		fireEvent.change(nameInput, { target: { value: "A Đôi" } });
		fireEvent.click(submitBtn);

		expect(
			screen.getByText(
				"Vui lòng nhập ngày tháng năm sinh (DD/MM/YYYY, MM/YYYY hoặc YYYY)",
			),
		).toBeInTheDocument();
		expect(mockOnSave).not.toHaveBeenCalled();

		// Nhập ngày sinh sai định dạng (tháng 17)
		fireEvent.change(dobInput, { target: { value: "15/17/1990" } });
		fireEvent.click(submitBtn);

		expect(
			screen.getByText(/Tháng 17 không hợp lệ/i),
		).toBeInTheDocument();
		expect(mockOnSave).not.toHaveBeenCalled();

		// Nhập ngày sinh sai (ngày 35)
		fireEvent.change(dobInput, { target: { value: "35/05/1990" } });
		fireEvent.click(submitBtn);

		expect(
			screen.getByText(/Ngày 35 không hợp lệ/i),
		).toBeInTheDocument();
		expect(mockOnSave).not.toHaveBeenCalled();
	});

	it("3. Kiểm tra validation số CCCD (từ chối nếu không đủ 9 hoặc 12 số, chấp nhận rỗng)", () => {
		render(
			<CitizenModal
				isOpen={true}
				initialMember={null}
				onClose={mockOnClose}
				onSave={mockOnSave}
			/>,
		);

		const nameInput = screen.getByLabelText(/Họ và Tên/i);
		const dobInput = screen.getByLabelText(/Ngày sinh/i);
		const cccdInput = screen.getByLabelText(/Số CCCD/i);
		const submitBtn = screen.getByRole("button", { name: /Lưu nhân khẩu/i });

		fireEvent.change(nameInput, { target: { value: "A Đôi" } });
		fireEvent.change(dobInput, { target: { value: "15/08/1990" } });

		// Nhập CCCD sai độ dài (chỉ có 8 số)
		fireEvent.change(cccdInput, { target: { value: "06009800" } });
		fireEvent.click(submitBtn);

		expect(screen.getByText(/Lỗi số CCCD/i)).toBeInTheDocument();
		expect(mockOnSave).not.toHaveBeenCalled();

		// Sửa thành 12 chữ số hợp lệ
		fireEvent.change(cccdInput, { target: { value: "060098001234" } });
		fireEvent.click(submitBtn);

		expect(mockOnSave).toHaveBeenCalledTimes(1);
	});

	it("4. Kiểm tra ẩn/hiện mã hóa CCCD qua nút Eye toggle và gọi API revealCitizenCCCD", async () => {
		const existingMember: Partial<Person> = {
			id: "cit-real-001",
			full_name: "Y Bluih",
			dob: "1988",
			gender: "Nữ",
			cccd: "••••••••1234",
			cccd_last4: "1234",
			ethnicity: "Xơ Đăng",
			relationship: "Vợ",
		};

		vi.mocked(householdApi.revealCitizenCCCD).mockResolvedValue(
			"060188001234",
		);

		render(
			<CitizenModal
				isOpen={true}
				initialMember={existingMember}
				onClose={mockOnClose}
				onSave={mockOnSave}
			/>,
		);

		expect(screen.getByText("Sửa Thông Tin Nhân Khẩu")).toBeInTheDocument();
		const revealBtn = screen.getByRole("button", { name: /Xem đầy đủ/i });
		expect(revealBtn).toBeInTheDocument();

		// Click Xem đầy đủ
		fireEvent.click(revealBtn);

		await waitFor(() => {
			expect(householdApi.revealCitizenCCCD).toHaveBeenCalledWith(
				"cit-real-001",
			);
		});

		// Sau khi mở khóa thành công, nút chuyển thành Ẩn bớt
		await waitFor(() => {
			expect(
				screen.getByRole("button", { name: /Ẩn bớt/i }),
			).toBeInTheDocument();
		});

		// Click lại để che giấu
		const hideBtn = screen.getByRole("button", { name: /Ẩn bớt/i });
		fireEvent.click(hideBtn);

		// Nút quay lại trạng thái Xem đầy đủ
		expect(
			screen.getByRole("button", { name: /Xem đầy đủ/i }),
		).toBeInTheDocument();
	});

	it("5. Kiểm tra onSave sinh ra dữ liệu chuẩn (splitFullName, birth_year, age, cccd_masked)", () => {
		render(
			<CitizenModal
				isOpen={true}
				initialMember={null}
				onClose={mockOnClose}
				onSave={mockOnSave}
			/>,
		);

		const nameInput = screen.getByLabelText(/Họ và Tên/i);
		const dobInput = screen.getByLabelText(/Ngày sinh/i);
		const cccdInput = screen.getByLabelText(/Số CCCD/i);
		const notesInput = screen.getByLabelText(
			/Ghi chú nhân khẩu \/ Nghề nghiệp/i,
		);
		const submitBtn = screen.getByRole("button", { name: /Lưu nhân khẩu/i });

		fireEvent.change(nameInput, { target: { value: "Trần Văn Nam" } });
		fireEvent.change(dobInput, { target: { value: "10/05/2000" } });
		fireEvent.change(cccdInput, { target: { value: "060200001234" } });
		fireEvent.change(notesInput, { target: { value: "Kỹ sư nông nghiệp" } });

		fireEvent.click(submitBtn);

		expect(mockOnSave).toHaveBeenCalledTimes(1);
		const savedData = mockOnSave.mock.calls[0][0];

		expect(savedData.full_name).toBe("Trần Văn Nam");
		expect(savedData.last_name).toBe("Trần Văn");
		expect(savedData.first_name).toBe("Nam");
		expect(savedData.name_unaccented).toBe("tran van nam");
		expect(savedData.birth_year).toBe(2000);
		expect(savedData.age).toBe(new Date().getFullYear() - 2000);
		expect(savedData.cccd).toBe("060200001234");
		expect(savedData.cccd_last4).toBe("1234");
		expect(savedData.cccd_masked).toBe("••••••••1234");
		expect(savedData.is_head).toBe(false);
		expect(savedData.is_minority).toBe(false); // Dân tộc Kinh
		expect(savedData.notes).toBe("Kỹ sư nông nghiệp");
		expect(mockOnClose).toHaveBeenCalledTimes(1);
	});

	it("6. Tự động nhận diện Chủ hộ và Dân tộc thiểu số (DTTS)", () => {
		render(
			<CitizenModal
				isOpen={true}
				initialMember={{
					id: "cit-head-01",
					full_name: "A Đôi",
					relationship: "Chủ hộ",
					dob: "1975",
					ethnicity: "Xơ Đăng",
				}}
				onClose={mockOnClose}
				onSave={mockOnSave}
			/>,
		);

		const submitBtn = screen.getByRole("button", { name: /Lưu nhân khẩu/i });
		fireEvent.click(submitBtn);

		expect(mockOnSave).toHaveBeenCalledTimes(1);
		const saved = mockOnSave.mock.calls[0][0];

		expect(saved.is_head).toBe(true);
		expect(saved.relationship).toBe("Chủ hộ");
		expect(saved.is_minority).toBe(true);
		expect(saved.birth_year).toBe(1975);
	});

	it("7. Đóng modal khi bấm nút Hủy hoặc nút icon X", () => {
		const { rerender } = render(
			<CitizenModal
				isOpen={true}
				initialMember={null}
				onClose={mockOnClose}
				onSave={mockOnSave}
			/>,
		);

		const cancelBtn = screen.getByRole("button", { name: "Hủy" });
		fireEvent.click(cancelBtn);
		expect(mockOnClose).toHaveBeenCalledTimes(1);

		const closeBtn = screen.getByRole("button", { name: "Đóng cửa sổ" });
		fireEvent.click(closeBtn);
		expect(mockOnClose).toHaveBeenCalledTimes(2);

		// Khi isOpen = false thì không render gì
		rerender(
			<CitizenModal
				isOpen={false}
				initialMember={null}
				onClose={mockOnClose}
				onSave={mockOnSave}
			/>,
		);
		expect(screen.queryByText("Thêm Nhân Khẩu Mới")).toBeNull();
	});

	it("8. Cho phép nhập quan hệ tự do và lưu các trường NVQS, Trình độ, Nghề nghiệp, Quê quán", () => {
		render(
			<CitizenModal
				isOpen={true}
				initialMember={null}
				onClose={mockOnClose}
				onSave={mockOnSave}
			/>,
		);

		const nameInput = screen.getByLabelText(/Họ và Tên/i);
		const relInput = screen.getByLabelText(/Quan hệ với chủ hộ/i);
		const dobInput = screen.getByLabelText(/Ngày sinh/i);
		const milInput = screen.getByLabelText(/Tình hình thực hiện nghĩa vụ quân sự/i);
		const eduInput = screen.getByLabelText(/Trình độ học vấn/i);
		const occInput = screen.getByLabelText(/^Nghề nghiệp/i);
		const placeInput = screen.getByLabelText(/Quê quán/i);
		const submitBtn = screen.getByRole("button", { name: /Lưu nhân khẩu/i });

		fireEvent.change(nameInput, { target: { value: "Nguyễn Văn B" } });
		fireEvent.change(relInput, { target: { value: "Cha ruột" } });
		fireEvent.change(dobInput, { target: { value: "1965" } });
		fireEvent.change(milInput, { target: { value: "Bộ đội xuất ngũ" } });
		fireEvent.change(eduInput, { target: { value: "12/12" } });
		fireEvent.change(occInput, { target: { value: "Làm rẫy" } });
		fireEvent.change(placeInput, { target: { value: "Xã Đăk Hà" } });

		fireEvent.click(submitBtn);

		expect(mockOnSave).toHaveBeenCalledTimes(1);
		const saved = mockOnSave.mock.calls[0][0];
		expect(saved.relationship).toBe("Cha ruột");
		expect(saved.military_status).toBe("Bộ đội xuất ngũ");
		expect(saved.education).toBe("12/12");
		expect(saved.occupation).toBe("Làm rẫy");
		expect(saved.native_place).toBe("Xã Đăk Hà");
		expect(mockOnClose).toHaveBeenCalledTimes(1);
	});

	it("9. Khởi tạo form chuẩn xác khi initialMember chứa các trường bí danh tiếng Việt (BUG-001)", () => {
		const initialMemberWithAliases = {
			id: "mem-alias-01",
			full_name: "Y Thoan",
			relationship: "Con dâu",
			dob: "1998",
			gender: "Nữ" as const,
			hoc_van: "Cao đẳng",
			nvqs: "Không thuộc diện",
			nghe_nghiep: "Y tế thôn bản",
			que_quan: "Xã Đăk Hà",
			ghi_chu: "Đã qua đào tạo",
		};

		render(
			<CitizenModal
				isOpen={true}
				initialMember={initialMemberWithAliases as any}
				onClose={mockOnClose}
				onSave={mockOnSave}
			/>,
		);

		const milInput = screen.getByLabelText(/Tình hình thực hiện nghĩa vụ quân sự/i) as HTMLInputElement;
		const eduInput = screen.getByLabelText(/Trình độ học vấn/i) as HTMLInputElement;
		const occInput = screen.getByLabelText(/^Nghề nghiệp/i) as HTMLInputElement;
		const placeInput = screen.getByLabelText(/Quê quán/i) as HTMLInputElement;
		const notesInput = screen.getByLabelText(/Ghi chú nhân khẩu \/ Nghề nghiệp/i) as HTMLTextAreaElement;

		expect(milInput.value).toBe("Không thuộc diện");
		expect(eduInput.value).toBe("Cao đẳng");
		expect(occInput.value).toBe("Y tế thôn bản");
		expect(placeInput.value).toBe("Xã Đăk Hà");
		expect(notesInput.value).toBe("Đã qua đào tạo");

		const submitBtn = screen.getByRole("button", { name: /Lưu nhân khẩu/i });
		fireEvent.click(submitBtn);

		expect(mockOnSave).toHaveBeenCalledTimes(1);
		const saved = mockOnSave.mock.calls[0][0];
		expect(saved.military_status).toBe("Không thuộc diện");
		expect(saved.education).toBe("Cao đẳng");
		expect(saved.occupation).toBe("Y tế thôn bản");
		expect(saved.native_place).toBe("Xã Đăk Hà");
		expect(saved.notes).toBe("Đã qua đào tạo");
	});
});
