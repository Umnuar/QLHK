import type { Household, Person } from "../types";
import { apiClient } from "./client";

export interface GetHouseholdsParams {
	villageId?: string;
	search?: string;
	page?: number;
	limit?: number;
	status?: string;
	minAge?: number;
	maxAge?: number;
	year?: number;
	gender?: string;
	ethnicity?: string;
	includeDeleted?: boolean;
}

export interface HouseholdsResponse {
	data: Household[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

/**
 * Chuẩn hóa đối tượng Household từ Backend Prisma sang Client Type
 */
export function normalizeHousehold(item: any): Household {
	const citizens = item.citizens || item.members || [];
	const head = citizens.find((c: any) => c.is_head) || citizens[0];
	const members: Person[] = citizens.map((c: any, index: number) => ({
		id: c.id || `person-${index}`,
		household_id: item.id,
		stt: c.stt ?? index + 1,
		full_name: c.full_name || "",
		last_name: c.last_name || "",
		first_name: c.first_name || "",
		name_unaccented: c.name_unaccented || "",
		relationship: c.relationship || (c.is_head ? "Chủ hộ" : "Khác"),
		is_head: Boolean(c.is_head),
		gender: c.gender || "Nam",
		dob: c.dob || "",
		dob_raw: c.dob_raw || c.dob || "",
		dob_formatted: c.dob_formatted || c.dob || "",
		birth_year:
			c.birth_year || (c.dob ? parseInt(String(c.dob).slice(-4), 10) || 0 : 0),
		age: c.age || 0,
		cccd: c.cccd || "",
		cccd_last4: c.cccd_last4 || (c.cccd ? String(c.cccd).slice(-4) : ""),
		cccd_masked:
			c.cccd_masked ||
			(c.cccd_last4 ? `••••••••${c.cccd_last4}` : "••••••••••••"),
		ethnicity: c.ethnicity || "Kinh",
		is_minority: c.ethnicity ? c.ethnicity !== "Kinh" : false,
		religion: c.religion || "Không",
		occupation: c.occupation || "",
		address: c.address || item.address || "",
		notes: c.notes || "",
	}));

	return {
		id: item.id,
		code: item.code || item.book_number || `HK-${String(item.id).slice(-6)}`,
		book_number: item.book_number || item.code || "",
		village_id: item.village_id || item.village?.id || "",
		village_name: item.village_name || item.village?.name || "",
		head_name: item.head_name || head?.full_name || "Chưa xác định",
		head_cccd: item.head_cccd || head?.cccd || head?.cccd_last4 || "",
		address: item.address || "",
		status:
			item.status === "active" ? "Thường trú" : item.status || "Thường trú",
		version: item.version ?? 1,
		members_count: item.members_count ?? members.length,
		members,
		is_deleted: Boolean(item.is_deleted),
		deleted_at: item.deleted_at || null,
		created_at: item.created_at || new Date().toISOString(),
		updated_at: item.updated_at || new Date().toISOString(),
		notes: item.notes || "",
	};
}

export const householdApi = {
	/**
	 * Lấy danh sách hộ khẩu phân trang theo thôn, từ khóa
	 */
	async getPage(params?: GetHouseholdsParams): Promise<HouseholdsResponse> {
		const res = await apiClient.get("/households", {
			params: {
				villageId: params?.villageId || undefined,
				search: params?.search || undefined,
				status: params?.status || undefined,
				minAge: params?.minAge !== undefined ? params.minAge : undefined,
				maxAge: params?.maxAge !== undefined ? params.maxAge : undefined,
				year: params?.year !== undefined ? params.year : undefined,
				gender: params?.gender || undefined,
				ethnicity: params?.ethnicity || undefined,
				page: params?.page || 1,
				limit: params?.limit || 10,
				includeDeleted: params?.includeDeleted ? "true" : "false",
			},
		});

		const rawList = res.data?.data || [];
		const normalizedData = rawList.map(normalizeHousehold);
		const pagination = res.data?.pagination || {
			page: params?.page || 1,
			limit: params?.limit || 10,
			total: normalizedData.length,
			totalPages: Math.ceil(normalizedData.length / (params?.limit || 10)) || 1,
		};

		return {
			data: normalizedData,
			pagination,
		};
	},

	/**
	 * Lấy chi tiết một hộ khẩu theo ID
	 */
	async getById(id: string): Promise<Household> {
		const res = await apiClient.get(`/households/${id}`);
		const item = res.data?.data || res.data;
		return normalizeHousehold(item);
	},

	/**
	 * Tạo mới hộ khẩu
	 */
	async create(data: Partial<Household>): Promise<Household> {
		const payload = {
			village_id: data.village_id,
			book_number: data.book_number || data.code,
			address: data.address,
			status: data.status || "Thường trú",
			members: data.members,
		};
		const res = await apiClient.post("/households", payload);
		const item = res.data?.data || res.data;
		return normalizeHousehold(item);
	},

	/**
	 * Cập nhật thông tin hộ khẩu
	 */
	async update(id: string, data: Partial<Household>): Promise<Household> {
		const payload: any = {
			book_number: data.book_number || data.code,
			address: data.address,
			status: data.status,
			members: data.members,
			version: (data as any).version,
		};
		const res = await apiClient.put(`/households/${id}`, payload);
		const item = res.data?.data || res.data;
		return normalizeHousehold(item);
	},

	/**
	 * Xóa mềm một hộ khẩu vào thùng rác
	 */
	async delete(id: string): Promise<{ success: boolean; message?: string }> {
		const res = await apiClient.delete(`/households/${id}`);
		return res.data;
	},

	/**
	 * Xóa hàng loạt hộ khẩu vào thùng rác
	 */
	async batchDelete(ids: string[]): Promise<any> {
		try {
			const res = await apiClient.post("/households/batch-delete", { ids });
			return res.data;
		} catch {
			// Fallback gọi xóa từng hộ nếu endpoint batch chưa được backend hỗ trợ
			return Promise.all(
				ids.map((id) => apiClient.delete(`/households/${id}`)),
			);
		}
	},

	/**
	 * Khôi phục hộ khẩu từ thùng rác
	 */
	async restore(id: string): Promise<any> {
		try {
			const res = await apiClient.post(`/households/${id}/restore`);
			return res.data;
		} catch {
			// Fallback
			const res = await apiClient.patch(`/households/${id}`, {
				is_deleted: false,
			});
			return res.data;
		}
	},

	/**
	 * Xóa vĩnh viễn hộ khẩu khỏi CSDL (chỉ Admin)
	 */
	async hardDelete(id: string): Promise<any> {
		const res = await apiClient.delete(`/households/${id}/hard`);
		return res.data;
	},

	/**
	 * Lấy danh sách hộ khẩu trong thùng rác
	 */
	async getRecycleBin(params?: {
		page?: number;
		limit?: number;
	}): Promise<HouseholdsResponse> {
		try {
			const res = await apiClient.get("/households/recycle-bin", { params });
			const rawList = res.data?.data || [];
			return {
				data: rawList.map(normalizeHousehold),
				pagination: res.data?.pagination || {
					page: params?.page || 1,
					limit: params?.limit || 10,
					total: rawList.length,
					totalPages: 1,
				},
			};
		} catch {
			// Fallback lọc danh sách đã xóa với includeDeleted=true
			const res = await apiClient.get("/households", {
				params: { ...params, includeDeleted: "true" },
			});
			const allHouseholds = (res.data?.data || []).map(normalizeHousehold);
			const deletedOnly = allHouseholds.filter((h: Household) => h.is_deleted);
			const limit = params?.limit || 10;
			const page = params?.page || 1;
			return {
				data: deletedOnly.slice((page - 1) * limit, page * limit),
				pagination: {
					page,
					limit,
					total: deletedOnly.length,
					totalPages: Math.ceil(deletedOnly.length / limit) || 1,
				},
			};
		}
	},

	/**
	 * Giải mã và hiển thị số CCCD của công dân (ghi log kiểm toán REVEAL_CCCD)
	 */
	async revealCitizenCCCD(citizenId: string): Promise<string | null> {
		const res = await apiClient.post(`/citizens/${citizenId}/reveal-cccd`);
		return res.data?.cccd || null;
	},
};
