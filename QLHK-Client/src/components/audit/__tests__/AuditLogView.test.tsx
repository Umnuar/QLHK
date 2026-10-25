import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuditLogItem } from "../../../api/auditApi";
import { AuditLogView } from "../AuditLogView";

const MOCK_LOGS: AuditLogItem[] = [
	{
		id: "aud-001",
		user_id: "usr-admin-01",
		username: "admin",
		full_name: "Quản trị viên Xã",
		action: "UPDATE",
		entity_type: "household",
		entity_id: "hh-1002",
		village_id: "vil-01",
		village_name: "Thôn 1",
		old_values: {
			head_name: "Nguyễn Văn Bình",
			address: "Tổ 1, Thôn 1",
			status: "Tạm trú",
		},
		new_values: {
			head_name: "Nguyễn Văn Bình",
			address: "Số 48 Đường Hùng Vương, Thôn 1",
			status: "Thường trú",
		},
		ip_address: "192.168.1.18",
		created_at: new Date().toISOString(),
		description: "Cập nhật địa chỉ cư trú và trạng thái sổ hộ khẩu SHK-0105",
	},
	{
		id: "aud-002",
		user_id: "usr-cb-01",
		username: "canboxa",
		full_name: "Cán bộ Xã",
		action: "CREATE",
		entity_type: "citizen",
		entity_id: "cit-3055",
		village_id: "vil-02",
		village_name: "Thôn 2",
		old_values: null,
		new_values: {
			full_name: "Lê Minh Khôi",
			relationship: "Con đẻ",
			gender: "Nam",
			dob: "20/08/2026",
		},
		ip_address: "192.168.1.18",
		created_at: new Date(Date.now() - 86400000).toISOString(),
		description: "Đăng ký nhân khẩu mới Lê Minh Khôi",
	},
	{
		id: "aud-003",
		user_id: "usr-admin-01",
		username: "admin",
		full_name: "Quản trị viên Xã",
		action: "DELETE",
		entity_type: "household",
		entity_id: "hh-0988",
		village_id: "vil-03",
		village_name: "Thôn 3",
		old_values: {
			head_name: "Trần Văn Quang",
		},
		new_values: {
			is_deleted: true,
			reason: "Chuyển cả hộ sang TP Kon Tum",
		},
		ip_address: "192.168.1.45",
		created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
		description: "Chuyển sổ hộ khẩu SHK-0988 vào Thùng rác",
	},
];

vi.mock("../../../AppContext", () => ({
	useApp: () => ({
		user: { username: "admin", role: "admin", full_name: "Quản trị viên Xã" },
		villages: [
			{ id: "vil-01", name: "Thôn 1" },
			{ id: "vil-02", name: "Thôn 2" },
			{ id: "vil-03", name: "Thôn 3" },
		],
		selectedVillageId: "",
		setSelectedVillageId: vi.fn(),
	}),
}));

vi.mock("../../../api/auditApi", () => ({
	auditApi: {
		getLogs: vi.fn().mockImplementation(() =>
			Promise.resolve({
				data: MOCK_LOGS,
				pagination: {
					total: 3,
					page: 1,
					limit: 50,
					totalPages: 1,
				},
			}),
		),
	},
}));

vi.mock("../../../api/authApi", () => ({
	authApi: {
		getUsers: vi.fn().mockResolvedValue([
			{ username: "admin", full_name: "Quản trị viên Xã" },
			{ username: "canboxa", full_name: "Cán bộ Xã" },
		]),
	},
}));

describe("AuditLogView Component", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("1. Render đúng tiêu đề và thống kê KPI", async () => {
		render(<AuditLogView />);

		expect(
			screen.getByText("Nhật Ký Hoạt Động & Kiểm Soát"),
		).toBeInTheDocument();

		await waitFor(() => {
			expect(screen.getByText("Tổng sự kiện")).toBeInTheDocument();
			expect(screen.getByText("Lượt cập nhật")).toBeInTheDocument();
			expect(screen.getAllByText("Thêm mới").length).toBeGreaterThanOrEqual(1);
			expect(screen.getByText("Xóa / Khôi phục")).toBeInTheDocument();
		});

		expect(screen.getByText(/Hộ Nguyễn Văn Bình/i)).toBeInTheDocument();
		expect(screen.getByText(/Nhân khẩu Lê Minh Khôi/i)).toBeInTheDocument();
	});

	it("2. Nhóm sự kiện theo ngày rõ ràng (Hôm nay, Hôm qua)", async () => {
		render(<AuditLogView />);

		await waitFor(() => {
			expect(screen.getByText(/Hôm nay •/i)).toBeInTheDocument();
			expect(screen.getByText(/Hôm qua •/i)).toBeInTheDocument();
		});
	});

	it("3. Bấm vào dòng sự kiện Cập nhật để mở chi tiết diff thay đổi", async () => {
		render(<AuditLogView />);

		await waitFor(() => {
			expect(screen.getByText(/Hộ Nguyễn Văn Bình/i)).toBeInTheDocument();
		});

		expect(screen.queryByText("Trước khi sửa (Cũ)")).toBeNull();

		const updateRow = screen.getByText(/Hộ Nguyễn Văn Bình/i);
		fireEvent.click(updateRow);

		expect(screen.getByText("Trước khi sửa (Cũ)")).toBeInTheDocument();
		expect(screen.getByText("Sau khi sửa (Mới)")).toBeInTheDocument();

		expect(screen.getByText("Địa chỉ thường trú")).toBeInTheDocument();
		expect(screen.getByText("Tổ 1, Thôn 1")).toBeInTheDocument();
		expect(screen.getByText("Số 48 Đường Hùng Vương, Thôn 1")).toBeInTheDocument();

		expect(screen.getByText("Trạng thái cư trú")).toBeInTheDocument();
		expect(screen.getByText("Tạm trú")).toBeInTheDocument();
		expect(screen.getByText("Thường trú")).toBeInTheDocument();
	});

	it("4. Hoạt động của nút Bung mở tất cả và Thu gọn tất cả", async () => {
		render(<AuditLogView />);

		await waitFor(() => {
			expect(screen.getByText(/Hộ Nguyễn Văn Bình/i)).toBeInTheDocument();
		});

		const expandAllBtn = screen.getByText("Bung mở tất cả");
		fireEvent.click(expandAllBtn);

		expect(screen.getByText("Trước khi sửa (Cũ)")).toBeInTheDocument();
		expect(screen.getByText("Sau khi sửa (Mới)")).toBeInTheDocument();

		const collapseAllBtn = screen.getByText("Thu gọn tất cả");
		fireEvent.click(collapseAllBtn);

		expect(screen.queryByText("Trước khi sửa (Cũ)")).toBeNull();
	});

	it("5. Lọc thời gian theo preset Hôm nay", async () => {
		render(<AuditLogView />);

		await waitFor(() => {
			expect(screen.getByText(/Hôm nay •/i)).toBeInTheDocument();
		});

		const todayBtn = screen.getByRole("button", { name: "Hôm nay" });
		fireEvent.click(todayBtn);

		expect(screen.getByText(/Hộ Nguyễn Văn Bình/i)).toBeInTheDocument();
		expect(screen.queryByText(/Hôm qua •/i)).toBeNull();
	});
});
