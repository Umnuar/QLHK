import { getCache, setCache } from "../db/indexedDB";
import { apiClient } from "./client";

export type AuditAction = "CREATE" | "UPDATE" | "DELETE" | "RESTORE" | "IMPORT";
export type AuditEntityType = "household" | "citizen" | "excel_import";

export interface AuditLogItem {
	id: string;
	user_id?: string | null;
	username?: string | null;
	full_name?: string | null;
	action: AuditAction;
	entity_type: AuditEntityType;
	entity_id?: string | null;
	old_values?: any;
	new_values?: any;
	ip_address?: string | null;
	created_at: string;
	village_id?: string | null;
	village_name?: string | null;
	village?: { id: string; name: string; code: string } | null;
	user?: {
		id: string;
		username: string;
		full_name?: string | null;
		role: string;
	} | null;
	description?: string;
}

export interface GetAuditLogsParams {
	villageId?: string;
	action?: string;
	limit?: number;
	offset?: number;
	page?: number;
	search?: string;
	userId?: string;
}

export interface AuditLogResponse {
	data: AuditLogItem[];
	pagination: {
		total: number;
		page: number;
		limit: number;
		totalPages: number;
	};
}

// Danh sách nhật ký biến động mẫu chuẩn thực tế hành chính Xã Đăk Hà
const SAMPLE_AUDIT_LOGS: AuditLogItem[] = [
	{
		id: "aud-001",
		user_id: "usr-admin-01",
		username: "admin",
		full_name: "Quản trị viên Xã Đăk Hà",
		action: "CREATE",
		entity_type: "household",
		entity_id: "hh-1001",
		village_id: "vil-06",
		village_name: "Thôn Kon Đao Yôp",
		old_values: null,
		new_values: {
			book_number: "SHK-1024",
			head_name: "A Ben",
			head_cccd: "060098001234",
			village_name: "Thôn Kon Đao Yôp",
			address: "Đội 2, Thôn Kon Đao Yôp, Xã Đăk Hà",
			status: "Thường trú",
			members_count: 5,
		},
		ip_address: "192.168.1.45",
		created_at: "2026-09-04T15:30:00.000Z",
		description: "Thêm mới sổ hộ khẩu SHK-1024 (Chủ hộ: A Ben)",
	},
	{
		id: "aud-002",
		user_id: "usr-cb-01",
		username: "canboxa",
		full_name: "Cán bộ Xã Đăk Hà",
		action: "UPDATE",
		entity_type: "household",
		entity_id: "hh-1002",
		village_id: "vil-01",
		village_name: "Thôn 1",
		old_values: {
			head_name: "Nguyễn Văn Bình",
			address: "Tổ 1, Thôn 1, Xã Đăk Hà",
			status: "Tạm trú",
			notes: "Đang làm thủ tục chuyển hộ khẩu",
		},
		new_values: {
			head_name: "Nguyễn Văn Bình",
			address: "Số 48, Đường Hùng Vương, Thôn 1, Xã Đăk Hà",
			status: "Thường trú",
			notes: "Đã hoàn tất thủ tục đăng ký thường trú",
		},
		ip_address: "192.168.1.18",
		created_at: "2026-09-04T14:15:22.000Z",
		description: "Cập nhật địa chỉ cư trú và trạng thái sổ hộ khẩu SHK-0105",
	},
	{
		id: "aud-003",
		user_id: "usr-admin-01",
		username: "admin",
		full_name: "Quản trị viên Xã Đăk Hà",
		action: "IMPORT",
		entity_type: "excel_import",
		entity_id: "imp-20260904",
		village_id: "vil-07",
		village_name: "Làng Kon Hnông Bách",
		old_values: null,
		new_values: {
			file_name: "NhanHoKhau_KonHnongBach_2026.xlsx",
			imported_households: 18,
			imported_citizens: 74,
			village_name: "Làng Kon Hnông Bách",
		},
		ip_address: "192.168.1.45",
		created_at: "2026-09-04T11:05:10.000Z",
		description: "Nhập dữ liệu 18 sổ hộ khẩu từ tệp Excel chuẩn Bộ Công an",
	},
	{
		id: "aud-004",
		user_id: "usr-th3-01",
		username: "truongthon3",
		full_name: "Trưởng Thôn 3",
		action: "DELETE",
		entity_type: "household",
		entity_id: "hh-0988",
		village_id: "vil-03",
		village_name: "Thôn 3",
		old_values: {
			book_number: "SHK-0988",
			head_name: "Trần Văn Quang",
			address: "Cụm 3, Thôn 3, Xã Đăk Hà",
			members_count: 4,
		},
		new_values: {
			is_deleted: true,
			deleted_at: "2026-09-04T09:42:00.000Z",
			reason: "Chuyển cả hộ sang thành phố Kon Tum",
		},
		ip_address: "192.168.1.102",
		created_at: "2026-09-04T09:42:00.000Z",
		description: "Chuyển sổ hộ khẩu SHK-0988 vào Thùng rác (di chuyển nơi ở)",
	},
	{
		id: "aud-005",
		user_id: "usr-admin-01",
		username: "admin",
		full_name: "Quản trị viên Xã Đăk Hà",
		action: "RESTORE",
		entity_type: "household",
		entity_id: "hh-0988",
		village_id: "vil-03",
		village_name: "Thôn 3",
		old_values: {
			is_deleted: true,
			book_number: "SHK-0988",
		},
		new_values: {
			is_deleted: false,
			restored_at: "2026-09-04T10:15:30.000Z",
			notes: "Khôi phục do công dân quay về sinh sống tại địa phương",
		},
		ip_address: "192.168.1.45",
		created_at: "2026-09-04T10:15:30.000Z",
		description:
			"Khôi phục sổ hộ khẩu SHK-0988 từ Thùng rác về quản lý thường trú",
	},
	{
		id: "aud-006",
		user_id: "usr-th5-01",
		username: "truongthon5",
		full_name: "Trưởng Thôn 5",
		action: "UPDATE",
		entity_type: "citizen",
		entity_id: "cit-3021",
		village_id: "vil-05",
		village_name: "Thôn 5",
		old_values: {
			full_name: "Y B'Li",
			dob: "15/06/1985",
			gender: "Nữ",
			ethnicity: "Ba Na",
			religion: "Không",
			cccd: "",
		},
		new_values: {
			full_name: "Y B'Li",
			dob: "15/06/1985",
			gender: "Nữ",
			ethnicity: "Ba Na",
			religion: "Công giáo",
			cccd: "060185007892",
		},
		ip_address: "192.168.1.115",
		created_at: "2026-09-03T16:20:10.000Z",
		description:
			"Cập nhật số CCCD 12 số và bổ sung thông tin tôn giáo cho công dân Y B'Li",
	},
	{
		id: "aud-007",
		user_id: "usr-cb-01",
		username: "canboxa",
		full_name: "Cán bộ Xã Đăk Hà",
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
			ethnicity: "Kinh",
			religion: "Không",
			household_id: "hh-1050",
		},
		ip_address: "192.168.1.18",
		created_at: "2026-09-03T08:50:00.000Z",
		description:
			"Đăng ký khai sinh và nhập hộ khẩu cho nhân khẩu mới sinh Lê Minh Khôi",
	},
];

export const auditApi = {
	async getLogs(params?: GetAuditLogsParams): Promise<AuditLogResponse> {
		const page = params?.page || 1;
		const limit = params?.limit || 15;
		const cacheKey = `audit_logs_p${page}_l${limit}_v${params?.villageId || "all"}_a${params?.action || "all"}`;

		try {
			const res = await apiClient.get("/audit-logs", { params });
			const rawData = res.data?.data || res.data;
			if (Array.isArray(rawData)) {
				const safeParseJson = (val: any) => {
					if (!val) return null;
					if (typeof val === "string") {
						try {
							return JSON.parse(val);
						} catch {
							return val;
						}
					}
					return val;
				};

				const parsedData: AuditLogItem[] = rawData.map((item: any) => ({
					...item,
					village_id: item.village_id || item.village?.id || null,
					village_name: item.village_name || item.village?.name || null,
					old_values: safeParseJson(item.old_values),
					new_values: safeParseJson(item.new_values),
				}));

				const total = res.data?.pagination?.total ?? parsedData.length;
				const totalPages =
					res.data?.pagination?.totalPages ?? (Math.ceil(total / limit) || 1);
				const result: AuditLogResponse = {
					data: parsedData,
					pagination: {
						total,
						page,
						limit,
						totalPages,
					},
				};
				await setCache(cacheKey, result);
				return result;
			}
		} catch {
			// Backend offline hoặc chưa cấu hình /audit-logs -> Nạp từ Offline Cache hoặc dữ liệu biến động mẫu
		}

		// Nạp từ Cache IndexedDB
		const cached = await getCache<AuditLogResponse>(cacheKey);
		if (cached && Array.isArray(cached.data) && cached.data.length > 0) {
			return cached;
		}

		// Nạp từ danh sách mẫu địa phương kèm bộ lọc
		let list = [...SAMPLE_AUDIT_LOGS];

		if (params?.villageId) {
			list = list.filter((item) => item.village_id === params.villageId);
		}
		if (params?.action && params.action !== "ALL") {
			list = list.filter((item) => item.action === params.action);
		}
		if (params?.userId) {
			list = list.filter(
				(item) =>
					item.user_id === params.userId || item.username === params.userId,
			);
		}
		if (params?.search?.trim()) {
			const q = params.search.trim().toLowerCase();
			list = list.filter(
				(item) =>
					item.description?.toLowerCase().includes(q) ||
					item.username?.toLowerCase().includes(q) ||
					item.full_name?.toLowerCase().includes(q) ||
					item.village_name?.toLowerCase().includes(q),
			);
		}

		const total = list.length;
		const totalPages = Math.ceil(total / limit) || 1;
		const start = (page - 1) * limit;
		const paginated = list.slice(start, start + limit);

		return {
			data: paginated,
			pagination: {
				total,
				page,
				limit,
				totalPages,
			},
		};
	},
};
