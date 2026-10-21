import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { policyApi } from "../../api/policyApi";
import { HtxhPage } from "../HtxhPage";

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
		getHtxh: vi.fn(),
		toggleReceived: vi.fn(),
	},
}));

describe("HtxhPage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders profile table and toggles received state", async () => {
		const mockProfiles = [{ id: "h-1", name: "Le Thi C", dob: "1940", gender: "Nữ", cccd: "987654321098", received: false }];
		vi.mocked(policyApi.getHtxh).mockResolvedValueOnce({ data: mockProfiles, total: 1 });

		render(<HtxhPage />);

		expect(await screen.findByText("Le Thi C")).toBeInTheDocument();
		expect(screen.getByText("1940")).toBeInTheDocument();

		const checkboxes = screen.getAllByRole("checkbox");
		const receivedCheckbox = checkboxes[checkboxes.length - 1];
		expect(receivedCheckbox).not.toBeChecked();

		fireEvent.click(receivedCheckbox);
		expect(policyApi.toggleReceived).toHaveBeenCalledWith("htxh", "h-1", true);
	});

	it("filters by category tab", async () => {
		vi.mocked(policyApi.getHtxh).mockResolvedValue({ data: [], total: 0 });

		render(<HtxhPage />);

		const categoryBtn = screen.getByRole("button", { name: "Bảo trợ XH" });
		fireEvent.click(categoryBtn);

		await waitFor(() => {
			expect(policyApi.getHtxh).toHaveBeenCalledWith(expect.objectContaining({ category: "baoTro" }));
		});
	});

	it("opens drawer when clicking citizen name", async () => {
		const mockProfiles = [{ id: "h-1", name: "Le Thi C", dob: "1940", gender: "Nữ", cccd: "987654321098", received: false, baoTro: true }];
		vi.mocked(policyApi.getHtxh).mockResolvedValueOnce({ data: mockProfiles, total: 1 });

		render(<HtxhPage />);

		const nameBtn = await screen.findByRole("button", { name: "Le Thi C" });
		fireEvent.click(nameBtn);

		expect(screen.getByText("Hồ sơ đối tượng hỗ trợ xã hội")).toBeInTheDocument();
	});
});
