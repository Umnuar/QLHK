import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChucThoPage } from "../ChucThoPage";

vi.mock("@/AppContext", () => ({
	useApp: () => ({
		selectedVillageId: "v-1",
		setSelectedVillageId: vi.fn(),
		villages: [{ id: "v-1", name: "Thôn 1" }],
		user: { id: "u-1", role: "admin" },
		activeTab: "chuctho",
		setActiveTab: vi.fn(),
		isDarkMode: false,
	}),
}));

vi.mock("@/api/profiles", () => ({
	profilesApi: {
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

describe("ChucThoPage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders ChucTho dashboard successfully", () => {
		render(<ChucThoPage />);
		expect(screen.getByText(/hồ sơ chúc thọ/i)).toBeInTheDocument();
	});
});
