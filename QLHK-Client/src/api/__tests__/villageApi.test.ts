import { describe, expect, it, vi } from "vitest";
import { apiClient } from "../client";
import { normalizeVillage, villageApi } from "../villageApi";

vi.mock("../client", () => ({
	apiClient: {
		get: vi.fn(),
		post: vi.fn(),
		put: vi.fn(),
		delete: vi.fn(),
	},
}));

describe("villageApi - Chuẩn hóa và API Thôn", () => {
	it("normalizeVillage chuẩn hóa từ backend object có code", () => {
		const backendData = {
			id: "vil-01",
			name: "Thôn 1",
			code: "TH1",
		};
		const res = normalizeVillage(backendData);
		expect(res.id).toBe("vil-01");
		expect(res.name).toBe("Thôn 1");
		expect(res.short_code).toBe("TH1");
	});

	it("normalizeVillage chuẩn hóa từ backend object có short_code", () => {
		const backendData = {
			id: "vil-02",
			name: "Thôn 2",
			short_code: "TH2",
		};
		const res = normalizeVillage(backendData);
		expect(res.id).toBe("vil-02");
		expect(res.name).toBe("Thôn 2");
		expect(res.short_code).toBe("TH2");
	});

	it("villageApi.getAll() gọi GET /villages và trả về danh sách chuẩn hóa", async () => {
		vi.mocked(apiClient.get).mockResolvedValueOnce({
			data: {
				success: true,
				data: [
					{ id: "1", name: "Thôn 1", code: "TH1" },
					{ id: "2", name: "Thôn 2", code: "TH2" },
				],
			},
		} as any);

		const villages = await villageApi.getAll();
		expect(apiClient.get).toHaveBeenCalledWith("/villages");
		expect(villages.length).toBe(2);
		expect(villages[0].name).toBe("Thôn 1");
		expect(villages[0].short_code).toBe("TH1");
	});

	it("villageApi.create() gọi POST /villages và trả về thôn mới", async () => {
		vi.mocked(apiClient.post).mockResolvedValueOnce({
			data: {
				success: true,
				data: { id: "3", name: "Thôn 3", code: "TH3" },
			},
		} as any);

		const created = await villageApi.create("Thôn 3", "TH3");
		expect(apiClient.post).toHaveBeenCalledWith("/villages", {
			name: "Thôn 3",
			code: "TH3",
		});
		expect(created.id).toBe("3");
		expect(created.name).toBe("Thôn 3");
	});

	it("villageApi.update() gọi PUT /villages/:id", async () => {
		vi.mocked(apiClient.put).mockResolvedValueOnce({
			data: {
				success: true,
				data: { id: "3", name: "Thôn 3 Mới", code: "TH3" },
			},
		} as any);

		const updated = await villageApi.update("3", "Thôn 3 Mới");
		expect(apiClient.put).toHaveBeenCalledWith("/villages/3", {
			name: "Thôn 3 Mới",
			code: undefined,
		});
		expect(updated.name).toBe("Thôn 3 Mới");
	});

	it("villageApi.delete() gọi DELETE /villages/:id", async () => {
		vi.mocked(apiClient.delete).mockResolvedValueOnce({
			data: {
				success: true,
				message: "Xóa thôn thành công",
			},
		} as any);

		const res = await villageApi.delete("3");
		expect(apiClient.delete).toHaveBeenCalledWith("/villages/3");
		expect(res.success).toBe(true);
	});
});
