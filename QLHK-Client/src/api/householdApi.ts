import type { Household, Person } from "../types";
import { normalizeUnaccented } from "../utils/vietnamese";
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
		name_unaccented: c.name_unaccented || normalizeUnaccented(c.full_name || ""),
		relationship: c.relationship || (c.is_head ? "Chủ hộ" : "Khác"),
		is_head: Boolean(c.is_head),
		gender: c.gender || "Nam",
		dob: c.dob || "",
		dob_raw: c.dob_raw || c.dob || "",
		dob_formatted: c.dob_formatted || c.dob || "",
		birth_year:
			c.birth_year || (c.dob ? parseInt(String(c.dob).slice(-4), 10) || 0 : 0),
		age: c.age || 0,
		cccd: (() => {
			const rawCccd = c.cccd ? String(c.cccd).trim() : "";
			const rawLast4 = c.cccd_last4 ? String(c.cccd_last4).trim() : "";
			const validLast4 = /^\d+$/.test(rawLast4) && rawLast4.length === 4 ? rawLast4 : "";
			if (/^\d{9,12}$/.test(rawCccd)) return rawCccd;
			if ((rawCccd.includes("•") || rawCccd.includes("*")) && /\d/.test(rawCccd) && !rawCccd.toLowerCase().includes("có")) return rawCccd;
			if (validLast4) return `••••••••${validLast4}`;
			return "";
		})(),
		cccd_last4: (() => {
			const rawLast4 = c.cccd_last4 ? String(c.cccd_last4).trim() : "";
			if (/^\d+$/.test(rawLast4) && rawLast4.length === 4) return rawLast4;
			const rawCccd = c.cccd ? String(c.cccd).trim() : "";
			const digitsOnly = rawCccd.replace(/\D/g, "");
			if (digitsOnly.length >= 4) return digitsOnly.slice(-4);
			return "";
		})(),
		cccd_masked: (() => {
			const rawMasked = c.cccd_masked ? String(c.cccd_masked).trim() : "";
			if (rawMasked.includes("•") && /\d/.test(rawMasked) && !rawMasked.toLowerCase().includes("có")) return rawMasked;
			const rawLast4 = c.cccd_last4 ? String(c.cccd_last4).trim() : "";
			if (/^\d+$/.test(rawLast4) && rawLast4.length === 4) return `••••••••${rawLast4}`;
			const rawCccd = c.cccd ? String(c.cccd).trim() : "";
			const digitsOnly = rawCccd.replace(/\D/g, "");
			if (digitsOnly.length >= 4) return `••••••••${digitsOnly.slice(-4)}`;
			return "Chưa có";
		})(),
		ethnicity: c.ethnicity || "Kinh",
		is_minority: c.ethnicity ? c.ethnicity !== "Kinh" : false,
		religion: c.religion || "Không",
		education: c.education ? String(c.education).trim() : (c.hoc_van ? String(c.hoc_van).trim() : ""),
		military_status: c.military_status ? String(c.military_status).trim() : (c.nvqs ? String(c.nvqs).trim() : ""),
		occupation: c.occupation ? String(c.occupation).trim() : (c.nghe_nghiep ? String(c.nghe_nghiep).trim() : ""),
		native_place: c.native_place ? String(c.native_place).trim() : (c.que_quan ? String(c.que_quan).trim() : ""),
		address: c.address || item.address || "",
		notes: c.notes ? String(c.notes).trim() : (c.ghi_chu ? String(c.ghi_chu).trim() : ""),
		pension_policies: Array.isArray(c.pension_policies) && c.pension_policies.length > 0
			? c.pension_policies
			: [
					c.huu_tri === "x" || c.huu_tri === true ? "huu_tri" : null,
					c.bao_tro === "x" || c.bao_tro === true ? "bao_tro" : null,
					c.huu_tuat_bao_hiem === "x" || c.huu_tuat_bao_hiem === true ? "huu_tuat_bao_hiem" : null,
					c.nguoi_co_cong === "x" || c.nguoi_co_cong === true ? "nguoi_co_cong" : null,
					c.age75plus === "x" || c.age75plus === true ? "age75plus" : null,
					c.age70to74poor === "x" || c.age70to74poor === true ? "age70to74poor" : null,
				].filter(Boolean) as string[],
		huu_tri: c.huu_tri === "x" || c.huu_tri === true || (Array.isArray(c.pension_policies) && c.pension_policies.includes("huu_tri")),
		huu_tuat_bao_hiem: c.huu_tuat_bao_hiem === "x" || c.huu_tuat_bao_hiem === true || (Array.isArray(c.pension_policies) && c.pension_policies.includes("huu_tuat_bao_hiem")),
		bao_tro: c.bao_tro === "x" || c.bao_tro === true || (Array.isArray(c.pension_policies) && c.pension_policies.includes("bao_tro")),
		nguoi_co_cong: c.nguoi_co_cong === "x" || c.nguoi_co_cong === true || (Array.isArray(c.pension_policies) && c.pension_policies.includes("nguoi_co_cong")),
		age75plus: c.age75plus === "x" || c.age75plus === true || (Array.isArray(c.pension_policies) && c.pension_policies.includes("age75plus")),
		age70to74poor: c.age70to74poor === "x" || c.age70to74poor === true || (Array.isArray(c.pension_policies) && c.pension_policies.includes("age70to74poor")),
	}));

	const headName = item.head_name || head?.full_name || "Chưa xác định";
	const headCccd = item.head_cccd || head?.cccd || head?.cccd_last4 || "";

	return {
		id: item.id,
		code: item.code || item.book_number || `HK-${String(item.id).slice(-6)}`,
		book_number: item.book_number || item.code || "",
		village_id: item.village_id || item.village?.id || "",
		village_name: item.village_name || item.village?.name || "",
		head_name: headName,
		head_cccd: headCccd,
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
	async getPage(params?: GetHouseholdsParams): Promise<HouseholdsResponse> {
		const page = Math.max(1, params?.page || 1);
		const limit = Math.max(1, params?.limit || 10);
		const res = await apiClient.get("/households", {
			params: {
				villageId: params?.villageId || undefined,
				search: params?.search ? params.search.trim() : undefined,
				status: params?.status || undefined,
				minAge: params?.minAge !== undefined ? params.minAge : undefined,
				maxAge: params?.maxAge !== undefined ? params.maxAge : undefined,
				year: params?.year !== undefined ? params.year : undefined,
				gender: params?.gender || undefined,
				ethnicity: params?.ethnicity || undefined,
				page,
				limit,
				includeDeleted: params?.includeDeleted ? "true" : "false",
			},
		});

		const rawList = res.data?.data || [];
		const normalizedData = rawList.map(normalizeHousehold);
		const rawPagination = res.data?.pagination;
		const total = typeof rawPagination?.total === "number" ? Math.max(0, rawPagination.total) : normalizedData.length;
		const totalPages = typeof rawPagination?.totalPages === "number" && rawPagination.totalPages > 0
			? rawPagination.totalPages
			: Math.max(1, Math.ceil(total / limit));

		return {
			data: normalizedData,
			pagination: {
				page: typeof rawPagination?.page === "number" ? rawPagination.page : page,
				limit: typeof rawPagination?.limit === "number" ? rawPagination.limit : limit,
				total,
				totalPages,
			},
		};
	},

	async getById(id: string): Promise<Household> {
		const res = await apiClient.get(`/households/${id}`);
		const item = res.data?.data || res.data;
		return normalizeHousehold(item);
	},

	async create(data: Partial<Household>): Promise<Household> {
		const payload = {
			village_id: data.village_id,
			book_number: data.book_number || data.code,
			address: data.address,
			status: data.status || "Thường trú",
			members: data.members?.map((m: any) => {
				const isTempId = !m.id || String(m.id).startsWith("mem-") || String(m.id).includes("-hh");
				return {
					...m,
					id: isTempId ? undefined : m.id,
					household_id: undefined,
				};
			}),
		};
		const res = await apiClient.post("/households", payload);
		const item = res.data?.data || res.data;
		return normalizeHousehold(item);
	},

	async update(id: string, data: Partial<Household>): Promise<Household> {
		const payload: any = {
			book_number: data.book_number || data.code,
			address: data.address,
			status: data.status,
			members: data.members?.map((m: any) => {
				const isTempId = !m.id || String(m.id).startsWith("mem-") || String(m.id).includes("-hh");
				return {
					...m,
					id: isTempId ? undefined : m.id,
					household_id: undefined,
				};
			}),
			version: (data as any).version,
		};
		const res = await apiClient.put(`/households/${id}`, payload);
		const item = res.data?.data || res.data;
		return normalizeHousehold(item);
	},

	async delete(id: string): Promise<{ success: boolean; message?: string }> {
		const res = await apiClient.delete(`/households/${id}`);
		return res.data;
	},

	async batchDelete(ids: string[]): Promise<any> {
		try {
			const res = await apiClient.post("/households/batch-delete", { ids });
			return res.data;
		} catch {
			return Promise.all(
				ids.map((id) => apiClient.delete(`/households/${id}`)),
			);
		}
	},

	async restore(id: string): Promise<any> {
		try {
			const res = await apiClient.post(`/households/${id}/restore`);
			return res.data;
		} catch {
			const res = await apiClient.patch(`/households/${id}`, {
				is_deleted: false,
			});
			return res.data;
		}
	},

	async hardDelete(id: string): Promise<any> {
		const res = await apiClient.delete(`/households/${id}/hard`);
		return res.data;
	},

	async getRecycleBin(params?: {
		page?: number;
		limit?: number;
		village_id?: string | null;
		search?: string;
	}): Promise<HouseholdsResponse> {
		const page = Math.max(1, params?.page || 1);
		const limit = Math.max(1, params?.limit || 10);
		try {
			const res = await apiClient.get("/households/recycle-bin", {
				params: {
					...params,
					page,
					limit,
				},
			});
			const rawList = res.data?.data || [];
			const normalizedData = rawList.map(normalizeHousehold);
			const rawPagination = res.data?.pagination;
			const total = typeof rawPagination?.total === "number" ? Math.max(0, rawPagination.total) : normalizedData.length;
			const totalPages = typeof rawPagination?.totalPages === "number" && rawPagination.totalPages > 0
				? rawPagination.totalPages
				: Math.max(1, Math.ceil(total / limit));

			return {
				data: normalizedData,
				pagination: {
					page: typeof rawPagination?.page === "number" ? rawPagination.page : page,
					limit: typeof rawPagination?.limit === "number" ? rawPagination.limit : limit,
					total,
					totalPages,
				},
			};
		} catch {
			const res = await apiClient.get("/households", {
				params: {
					villageId: params?.village_id || undefined,
					includeDeleted: "true",
				},
			});
			const allHouseholds = (res.data?.data || []).map(normalizeHousehold);
			let deletedOnly = allHouseholds.filter((h: Household) => h.is_deleted);
			if (params?.search && params.search.trim()) {
				const q = normalizeUnaccented(params.search);
				const cleanDigits = params.search.replace(/\D/g, "");
				deletedOnly = deletedOnly.filter((h: Household) => {
					if (h.head_name && normalizeUnaccented(h.head_name).includes(q)) return true;
					if (h.book_number && normalizeUnaccented(h.book_number).includes(q)) return true;
					if (h.code && normalizeUnaccented(h.code).includes(q)) return true;
					if (h.address && normalizeUnaccented(h.address).includes(q)) return true;
					if (cleanDigits && h.head_cccd && h.head_cccd.replace(/\D/g, "").includes(cleanDigits)) return true;
					return (h.members || []).some((m) => {
						if (m.full_name && normalizeUnaccented(m.full_name).includes(q)) return true;
						if (m.name_unaccented && normalizeUnaccented(m.name_unaccented).includes(q)) return true;
						if (cleanDigits && m.cccd && m.cccd.replace(/\D/g, "").includes(cleanDigits)) return true;
						return false;
					});
				});
			}
			const total = deletedOnly.length;
			const totalPages = Math.max(1, Math.ceil(total / limit));
			const paginated = deletedOnly.slice((page - 1) * limit, page * limit);
			return {
				data: paginated,
				pagination: {
					page,
					limit,
					total,
					totalPages,
				},
			};
		}
	},

	async exportExcel(params?: {
		village_id?: string;
		status?: string;
		household_ids?: string[];
		search?: string;
		year?: number;
		gender?: string;
		ethnicity?: string;
	}): Promise<Blob> {
		const res = await apiClient.post(
			"/households/export-excel",
			{
				village_id: params?.village_id,
				status: params?.status,
				household_ids: params?.household_ids,
				search: params?.search ? params.search.trim() : undefined,
				year: params?.year,
				gender: params?.gender,
				ethnicity: params?.ethnicity,
			},
			{ responseType: "blob" },
		);
		return res.data;
	},

	async revealCitizenCCCD(citizenId: string): Promise<string | null> {
		if (!citizenId || citizenId.startsWith("mem-")) return null;
		try {
			const res = await apiClient.get(`/citizens/${citizenId}/reveal-cccd`);
			return res.data?.cccd || res.data?.data?.cccd || null;
		} catch {
			try {
				const res = await apiClient.post(`/citizens/${citizenId}/reveal-cccd`);
				return res.data?.cccd || res.data?.data?.cccd || null;
			} catch {
				return null;
			}
		}
	},
};