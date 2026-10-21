import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Sidebar } from "../Sidebar";

const mockSetActiveTab = vi.fn();
const mockSetSelectedVillageId = vi.fn();
const mockToggleSidebar = vi.fn();
const mockSetSidebarCollapsed = vi.fn();

const mockUseApp = vi.fn();
vi.mock("../../../AppContext", () => ({
	useApp: () => mockUseApp(),
}));

describe("Sidebar Policy Navigation", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders policy navigation tabs for admin user and handles tab clicks", () => {
		mockUseApp.mockReturnValue({
			activeTab: "households",
			setActiveTab: mockSetActiveTab,
			user: { id: "u-1", username: "admin", role: "admin" },
			isSidebarCollapsed: false,
			toggleSidebar: mockToggleSidebar,
			setSidebarCollapsed: mockSetSidebarCollapsed,
			setSelectedVillageId: mockSetSelectedVillageId,
			selectedVillageId: "",
		});

		render(<Sidebar />);

		const chucthoBtn = screen.getByRole("button", { name: /chúc thọ/i });
		const htxhBtn = screen.getByRole("button", { name: /hỗ trợ xã hội/i });
		const policyAnalyticsBtn = screen.getByRole("button", { name: /tk chính sách/i });

		expect(chucthoBtn).toBeInTheDocument();
		expect(htxhBtn).toBeInTheDocument();
		expect(policyAnalyticsBtn).toBeInTheDocument();

		fireEvent.click(chucthoBtn);
		expect(mockSetActiveTab).toHaveBeenCalledWith("chuctho");

		fireEvent.click(htxhBtn);
		expect(mockSetActiveTab).toHaveBeenCalledWith("htxh");

		fireEvent.click(policyAnalyticsBtn);
		expect(mockSetActiveTab).toHaveBeenCalledWith("policy-analytics");
	});

	it("shows active indicator styling when policy tab is active", () => {
		mockUseApp.mockReturnValue({
			activeTab: "chuctho",
			setActiveTab: mockSetActiveTab,
			user: { id: "u-2", username: "thon1", role: "user" },
			isSidebarCollapsed: false,
			toggleSidebar: mockToggleSidebar,
			setSidebarCollapsed: mockSetSidebarCollapsed,
			setSelectedVillageId: mockSetSelectedVillageId,
			selectedVillageId: "v-1",
		});

		render(<Sidebar />);

		const chucthoBtn = screen.getByRole("button", { name: /chúc thọ/i });
		expect(chucthoBtn.className).toContain("bg-emerald-600");
	});
});
