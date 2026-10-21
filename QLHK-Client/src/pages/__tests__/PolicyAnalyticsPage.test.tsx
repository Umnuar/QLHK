import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { policyApi } from "../../api/policyApi";
import { PolicyAnalyticsPage } from "../PolicyAnalyticsPage";

vi.mock("../../AppContext", () => ({
	useApp: () => ({
		selectedVillageId: "v-1",
		setSelectedVillageId: vi.fn(),
		villages: [{ id: "v-1", name: "Thôn 1" }],
		user: { role: "admin" },
	}),
}));

vi.mock("../../api/policyApi", () => ({
	policyApi: {
		getAnalytics: vi.fn(),
	},
}));

describe("PolicyAnalyticsPage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders KPI cards, charts, and village breakdown table", async () => {
		const mockSummary = {
			chuctho: { total: 120, received: 60, unreceived: 60, completionRate: 50 },
			htxh: { total: 80, received: 40, unreceived: 40, completionRate: 50 },
			villageBreakdown: [
				{ village_id: "v-1", village_name: "Thôn 1", chuctho_total: 60, chuctho_received: 30, htxh_total: 40, htxh_received: 20 },
			],
		};
		vi.mocked(policyApi.getAnalytics).mockResolvedValueOnce(mockSummary);

		render(<PolicyAnalyticsPage />);

		expect(screen.getByText("Thống Kê Chính Sách Xã Hội")).toBeInTheDocument();
		expect(screen.getByText("Tiến Độ Chúc Thọ")).toBeInTheDocument();
		expect(screen.getByText("Tiến Độ Hỗ Trợ Xã Hội")).toBeInTheDocument();

		expect(await screen.findByText("120")).toBeInTheDocument();
		expect(await screen.findByText("80")).toBeInTheDocument();
		expect(await screen.findByText("Đối Soát Số Liệu Chính Sách Theo Thôn")).toBeInTheDocument();
		expect(screen.getAllByText("Thôn 1").length).toBeGreaterThanOrEqual(1);
	});
});
