import type { Village } from "../types";
import { apiClient } from "./client";

export function normalizeVillage(item: any): Village {
	return {
		id: item.id,
		name: item.name,
		short_code: item.short_code || item.code || "",
	};
}

export const villageApi = {
	/**
	 * Lấy danh sách thôn từ Backend (GET /villages)
	 */
	async getAll(): Promise<Village[]> {
		const res = await apiClient.get("/villages");
		const list = res.data?.data || res.data || [];
		return Array.isArray(list) ? list.map(normalizeVillage) : [];
	},

	/**
	 * Tạo thôn mới (POST /villages)
	 */
	async create(name: string, code?: string): Promise<Village> {
		const res = await apiClient.post("/villages", { name, code });
		const data = res.data?.data || res.data;
		return normalizeVillage(data);
	},

	/**
	 * Cập nhật thôn (PUT /villages/:id)
	 */
	async update(id: string, name: string, code?: string): Promise<Village> {
		const res = await apiClient.put(`/villages/${id}`, { name, code });
		const data = res.data?.data || res.data;
		return normalizeVillage(data);
	},

	/**
	 * Xóa thôn theo id (DELETE /villages/:id)
	 */
	async delete(id: string): Promise<{
		success: boolean;
		message?: string;
		deletedHouseholdCount?: number;
	}> {
		const res = await apiClient.delete(`/villages/${id}`);
		return res.data;
	},
};
