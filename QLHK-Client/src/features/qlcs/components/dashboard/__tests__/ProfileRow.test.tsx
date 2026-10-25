import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProfileRow, type TableProfile } from "../ProfileRow";

describe("ProfileRow residence display", () => {
	afterEach(() => {
		cleanup();
		vi.clearAllMocks();
	});

	const defaultProps = {
		idx: 0,
		currentPage: 1,
		itemsPerPage: 10,
		isSelected: false,
		onToggleSelect: vi.fn(),
		onEdit: vi.fn(),
		onDelete: vi.fn(),
		handleToggleReceived: vi.fn(),
		openPolicyPopover: null,
		setOpenPolicyPopover: vi.fn(),
		isDarkMode: false,
		panelClass: "",
		softTextClass: "",
	};

	it("renders residence without village box in chuctho tab", () => {
		const sampleProfile: TableProfile = {
			id: "ct-1",
			village_id: "v-1",
			name: "Nguyễn Văn A",
			dob: "1940-01-01",
			gender: "Nam",
			cccd: "123456789012",
			ethnicity: "Kinh",
			residence: "Thường trú",
			currentAddress: "Thôn 1",
			received: false,
		};

		render(
			<table>
				<tbody>
					<ProfileRow
						{...defaultProps}
						profile={sampleProfile}
						activeTab="chuctho"
					/>
				</tbody>
			</table>,
		);

		expect(screen.getByText("Thường trú")).toBeTruthy();
		expect(screen.queryByText("Thôn 1")).toBeNull();
	});

	it("renders residence without village box in htxh tab", () => {
		const sampleProfile: TableProfile = {
			id: "ht-1",
			village_id: "v-2",
			name: "Trần Thị B",
			dob: "1950-05-15",
			gender: "Nữ",
			cccd: "987654321098",
			ethnicity: "Kinh",
			residence: "Thường trú",
			currentAddress: "Thôn 2",
			received: false,
		};

		render(
			<table>
				<tbody>
					<ProfileRow
						{...defaultProps}
						profile={sampleProfile}
						activeTab="htxh"
					/>
				</tbody>
			</table>,
		);

		expect(screen.getByText("Thường trú")).toBeTruthy();
		expect(screen.queryByText("Thôn 2")).toBeNull();
	});

	it("renders dash fallback when residence and currentAddress are missing", () => {
		const sampleProfile: TableProfile = {
			id: "ct-2",
			village_id: "v-1",
			name: "Lê Văn C",
			dob: "1945-03-20",
			gender: "Nam",
			cccd: "",
			ethnicity: "Kinh",
			residence: "",
			currentAddress: "",
			received: false,
		};

		render(
			<table>
				<tbody>
					<ProfileRow
						{...defaultProps}
						profile={sampleProfile}
						activeTab="chuctho"
					/>
				</tbody>
			</table>,
		);

		expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(1);
		expect(screen.queryByText("Thôn 1")).toBeNull();
	});
});
