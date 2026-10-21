import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { policyApi } from "../../api/policyApi";
import { ChucThoPage } from "../ChucThoPage";

vi.mock("../../AppContext", () => ({
	useApp: () => ({
		selectedVillageId: "v-1",
		setSelectedVillageId: vi.fn(),
		villages: [{ id: "v-1", name: "Thôn 1" }],
		user: { id: "u-1", role: "admin" },
	}),
}));

vi.mock("../../api/policyApi", () => ({
	policyApi: {
		getChuctho: vi.fn(),
		toggleReceived: vi.fn(),
	},
}));

describe("ChucThoPage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders profile table and toggles received state", async () => {
		const mockProfiles = [{ id: "p-1", name: "Tran Van M", dob: "1954", gender: "Nam", cccd: "123456789012", received: false }];
		vi.mocked(policyApi.getChuctho).mockResolvedValueOnce({ data: mockProfiles, total: 1 });

		render(<ChucThoPage />);

		expect(await screen.findByText("Tran Van M")).toBeInTheDocument();
		expect(screen.getByText("1954")).toBeInTheDocument();

		const checkboxes = screen.getAllByRole("checkbox");
		const receivedCheckbox = checkboxes[checkboxes.length - 1];
		expect(receivedCheckbox).not.toBeChecked();

		fireEvent.click(receivedCheckbox);
		expect(policyApi.toggleReceived).toHaveBeenCalledWith("chuctho", "p-1", true);
	});

	it("filters by milestone tab", async () => {
		vi.mocked(policyApi.getChuctho).mockResolvedValue({ data: [], total: 0 });

		render(<ChucThoPage />);

		const milestoneBtn = screen.getByRole("button", { name: "70 tuổi" });
		fireEvent.click(milestoneBtn);

		await waitFor(() => {
			expect(policyApi.getChuctho).toHaveBeenCalledWith(expect.objectContaining({ milestone: "70" }));
		});
	});

	it("opens drawer when clicking citizen name", async () => {
		const mockProfiles = [{ id: "p-1", name: "Tran Van M", dob: "1954", gender: "Nam", cccd: "123456789012", received: false, milestone: "70" }];
		vi.mocked(policyApi.getChuctho).mockResolvedValueOnce({ data: mockProfiles, total: 1 });

		render(<ChucThoPage />);

		const nameBtn = await screen.findByRole("button", { name: "Tran Van M" });
		fireEvent.click(nameBtn);

		expect(screen.getByText("Hồ sơ người mừng thọ")).toBeInTheDocument();
	});
});
