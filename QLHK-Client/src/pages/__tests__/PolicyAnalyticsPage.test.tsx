import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { policyApi } from "../../api/policyApi";
import { PolicyAnalyticsPage } from "../PolicyAnalyticsPage";

vi.mock("../../AppContext", () => ({
	useApp: () => ({
		selectedVillageId: "v-1",
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

	it("renders KPI cards and completion rates for Chuc Tho and HTXH", async () => {
		const mockSummary = {
			chuctho: { total: 120, received: 60, unreceived: 60, completionRate: 50 },
			htxh: { total: 80, received: 40, unreceived: 40, completionRate: 50 },
		};
		vi.mocked(policyApi.getAnalytics).mockResolvedValueOnce(mockSummary);

		render(<PolicyAnalyticsPage />);

		expect(screen.getByText("Thống Kê Chính Sách Xã Hội")).toBeInTheDocument();
		expect(screen.getByText("Chính Sách Chúc Thọ")).toBeInTheDocument();
		expect(screen.getByText("Hỗ Trợ Xã Hội")).toBeInTheDocument();

		expect(await screen.findByText("120")).toBeInTheDocument();
		expect(await screen.findByText("80")).toBeInTheDocument();
		expect(screen.getAllByText("50%").length).toBeGreaterThan(0);
	});
});
