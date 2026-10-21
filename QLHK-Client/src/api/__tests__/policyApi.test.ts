import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "../client";
import { policyApi } from "../policyApi";

vi.mock("../client", () => ({
	apiClient: {
		get: vi.fn(),
		patch: vi.fn(),
		post: vi.fn(),
	},
}));

describe("policyApi", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("calls getChuctho with correct endpoint and params", async () => {
		const mockData = { data: [{ id: "1", name: "Nguyen Van A", received: false }], total: 1 };
		vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockData });
		const result = await policyApi.getChuctho({ villageId: "v1" });
		expect(apiClient.get).toHaveBeenCalledWith("/policies/chuctho", { params: { villageId: "v1" } });
		expect(result).toEqual(mockData);
	});

	it("calls getHtxh with correct endpoint and params", async () => {
		const mockData = { data: [{ id: "2", name: "Tran Thi B", received: true }], total: 1 };
		vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockData });
		const result = await policyApi.getHtxh({ category: "75plus" });
		expect(apiClient.get).toHaveBeenCalledWith("/policies/htxh", { params: { category: "75plus" } });
		expect(result).toEqual(mockData);
	});

	it("calls toggleReceived with correct method and payload", async () => {
		const mockData = { id: "1", received: true };
		vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: mockData });
		const result = await policyApi.toggleReceived("chuctho", "1", true);
		expect(apiClient.patch).toHaveBeenCalledWith("/policies/chuctho/1/toggle", { received: true });
		expect(result).toEqual(mockData);
	});

	it("calls getAnalytics with villageId and calculationYear", async () => {
		const mockSummary = { chuctho: { total: 10, received: 5, unreceived: 5, completionRate: 50 }, htxh: { total: 20, received: 10, unreceived: 10, completionRate: 50 } };
		vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockSummary });
		const result = await policyApi.getAnalytics("v1", 2026);
		expect(apiClient.get).toHaveBeenCalledWith("/policies/analytics", { params: { villageId: "v1", calculationYear: 2026 } });
		expect(result).toEqual(mockSummary);
	});

	it("calls importExcel and exportExcel endpoints", async () => {
		vi.mocked(apiClient.post).mockResolvedValueOnce({ data: { success: true, count: 5 } });
		const formData = new FormData();
		const importRes = await policyApi.importExcel("chuctho", formData);
		expect(apiClient.post).toHaveBeenCalledWith("/policies/chuctho/import", formData, { headers: { "Content-Type": "multipart/form-data" } });
		expect(importRes.count).toBe(5);

		const mockBlob = new Blob();
		vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockBlob });
		const exportRes = await policyApi.exportExcel("htxh", { calculationYear: 2026 });
		expect(apiClient.get).toHaveBeenCalledWith("/policies/htxh/export", { params: { calculationYear: 2026 }, responseType: "blob" });
		expect(exportRes).toBe(mockBlob);
	});
});
