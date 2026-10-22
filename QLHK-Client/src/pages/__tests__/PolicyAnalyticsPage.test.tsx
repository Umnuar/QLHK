import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PolicyAnalyticsPage } from "../PolicyAnalyticsPage";

vi.mock("@/AppContext", () => ({
	useApp: () => ({
		selectedVillageId: "v-1",
		setSelectedVillageId: vi.fn(),
		villages: [{ id: "v-1", name: "Thôn 1" }],
		user: { role: "admin" },
		activeTab: "analytics",
		setActiveTab: vi.fn(),
		isDarkMode: false,
	}),
}));

vi.mock("@/api/analyticsApi", () => ({
	analyticsApi: {
		getOverview: vi.fn().mockResolvedValue({}),
		getByVillage: vi.fn().mockResolvedValue({ data: [] }),
		getMonthlyFluctuations: vi.fn().mockResolvedValue({}),
	},
}));

describe("PolicyAnalyticsPage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders PolicyAnalyticsPage successfully", () => {
		render(<PolicyAnalyticsPage />);
		expect(
			screen.getByText(/Thống Kê Báo Cáo & Đối Soát Chính Sách/i),
		).toBeInTheDocument();
	});
});
