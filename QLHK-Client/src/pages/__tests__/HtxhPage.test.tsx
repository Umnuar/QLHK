import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { policyApi } from "../../api/policyApi";
import { HtxhPage } from "../HtxhPage";

vi.mock("../../AppContext", () => ({
	useApp: () => ({
		selectedVillageId: "v-1",
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
		const mockProfiles = [{ id: "h-1", name: "Le Thi C", dob: "1940", gender: "Nữ", cccd: "987654321", received: false }];
		vi.mocked(policyApi.getHtxh).mockResolvedValueOnce({ data: mockProfiles, total: 1 });

		render(<HtxhPage />);

		expect(await screen.findByText("Le Thi C")).toBeInTheDocument();
		expect(screen.getByText("1940")).toBeInTheDocument();

		const checkbox = screen.getByRole("checkbox");
		expect(checkbox).not.toBeChecked();

		fireEvent.click(checkbox);
		expect(policyApi.toggleReceived).toHaveBeenCalledWith("htxh", "h-1", true);
	});

	it("filters by category tab", async () => {
		vi.mocked(policyApi.getHtxh).mockResolvedValue({ data: [], total: 0 });

		render(<HtxhPage />);

		const categoryBtn = screen.getByRole("button", { name: "Bảo trợ xã hội" });
		fireEvent.click(categoryBtn);

		await waitFor(() => {
			expect(policyApi.getHtxh).toHaveBeenCalledWith(expect.objectContaining({ category: "baoTro" }));
		});
	});
});
