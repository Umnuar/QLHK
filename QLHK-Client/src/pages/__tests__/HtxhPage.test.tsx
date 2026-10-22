import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HtxhPage } from "../HtxhPage";

vi.mock("@/AppContext", () => ({
	useApp: () => ({
		selectedVillageId: "v-1",
		setSelectedVillageId: vi.fn(),
		villages: [{ id: "v-1", name: "Thôn 1" }],
		user: { id: "u-1", role: "admin" },
		activeTab: "htxh",
		setActiveTab: vi.fn(),
		isDarkMode: false,
	}),
}));

vi.mock("@/api/htxh", () => ({
	htxhApi: {
		getProfiles: vi.fn().mockResolvedValue({ data: [], pagination: { total: 0 } }),
		getProfileStats: vi.fn().mockResolvedValue({ total: 0, received: 0, unreceived: 0, rate: "0.0" }),
		toggleReceived: vi.fn(),
		recalculate: vi.fn(),
	},
}));

vi.mock("@/api/settings", () => ({
	settingsApi: {
		getSettings: vi.fn().mockResolvedValue({}),
		updateSettings: vi.fn(),
	},
}));

describe("HtxhPage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders Htxh dashboard successfully", () => {
		render(<HtxhPage />);
		expect(screen.getAllByText(/hưu trí xã hội/i).length).toBeGreaterThanOrEqual(1);
	});
});
