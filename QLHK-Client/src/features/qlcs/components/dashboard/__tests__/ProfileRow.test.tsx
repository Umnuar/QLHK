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

	it("updates chuctho milestone text dynamically based on calculationYear", () => {
		const sampleProfile: TableProfile = {
			id: "ct-3",
			village_id: "v-1",
			name: "Phạm Văn D",
			dob: "1957-01-01",
			gender: "Nam",
			cccd: "123456789012",
			ethnicity: "Kinh",
			residence: "Thường trú",
			currentAddress: "Thường trú",
			received: false,
		};

		const { rerender } = render(
			<table>
				<tbody>
					<ProfileRow
						{...defaultProps}
						profile={sampleProfile}
						activeTab="chuctho"
						calculationYear={2026}
					/>
				</tbody>
			</table>,
		);

		expect(screen.getAllByText("69 tuổi (Mốc 65)").length).toBeGreaterThanOrEqual(1);

		rerender(
			<table>
				<tbody>
					<ProfileRow
						{...defaultProps}
						profile={sampleProfile}
						activeTab="chuctho"
						calculationYear={2027}
					/>
				</tbody>
			</table>,
		);

		expect(screen.getAllByText("Tròn 70 tuổi").length).toBeGreaterThanOrEqual(1);

		rerender(
			<table>
				<tbody>
					<ProfileRow
						{...defaultProps}
						profile={sampleProfile}
						activeTab="chuctho"
						calculationYear={2028}
					/>
				</tbody>
			</table>,
		);

		expect(screen.getAllByText("71 tuổi (Mốc 70)").length).toBeGreaterThanOrEqual(1);
	});

	it("preserves profile data and correctly toggles back and forth across multiple calculation years", () => {
		const sampleProfile: TableProfile = {
			id: "ct-4",
			village_id: "v-1",
			name: "Hoàng Văn E",
			dob: "1957-06-15",
			gender: "Nam",
			cccd: "064057001234",
			ethnicity: "Xơ Đăng",
			residence: "Thường trú",
			currentAddress: "Thường trú",
			received: false,
		};

		const { rerender } = render(
			<table>
				<tbody>
					<ProfileRow
						{...defaultProps}
						profile={sampleProfile}
						activeTab="chuctho"
						calculationYear={2026}
					/>
				</tbody>
			</table>,
		);

		expect(screen.getAllByText("69 tuổi (Mốc 65)").length).toBeGreaterThanOrEqual(1);

		rerender(
			<table>
				<tbody>
					<ProfileRow
						{...defaultProps}
						profile={sampleProfile}
						activeTab="chuctho"
						calculationYear={2027}
					/>
				</tbody>
			</table>,
		);
		expect(screen.getAllByText("Tròn 70 tuổi").length).toBeGreaterThanOrEqual(1);

		rerender(
			<table>
				<tbody>
					<ProfileRow
						{...defaultProps}
						profile={sampleProfile}
						activeTab="chuctho"
						calculationYear={2026}
					/>
				</tbody>
			</table>,
		);
		expect(screen.getAllByText("69 tuổi (Mốc 65)").length).toBeGreaterThanOrEqual(1);

		rerender(
			<table>
				<tbody>
					<ProfileRow
						{...defaultProps}
						profile={sampleProfile}
						activeTab="chuctho"
						calculationYear={2028}
					/>
				</tbody>
			</table>,
		);
		expect(screen.getAllByText("71 tuổi (Mốc 70)").length).toBeGreaterThanOrEqual(1);
	});

	it("correctly handles ISO YYYY-MM-DD birth dates across projected years", () => {
		const sampleProfile: TableProfile = {
			id: "ct-iso-1",
			village_id: "v-1",
			name: "Nguyễn Thị Mai",
			dob: "1950-05-15",
			gender: "Nữ",
			cccd: "064150001234",
			ethnicity: "Kinh",
			residence: "Thường trú",
			currentAddress: "Thôn 1",
			received: false,
		};

		const { rerender } = render(
			<table>
				<tbody>
					<ProfileRow
						{...defaultProps}
						profile={sampleProfile}
						activeTab="chuctho"
						calculationYear={2026}
					/>
				</tbody>
			</table>,
		);

		expect(screen.getAllByText("76 tuổi (Mốc 75)").length).toBeGreaterThanOrEqual(1);

		rerender(
			<table>
				<tbody>
					<ProfileRow
						{...defaultProps}
						profile={sampleProfile}
						activeTab="chuctho"
						calculationYear={2030}
					/>
				</tbody>
			</table>,
		);

		expect(screen.getAllByText("Tròn 80 tuổi").length).toBeGreaterThanOrEqual(1);
	});

	it("renders emerald pill badge for exact round milestone ages and centenarians", () => {
		const roundProfile: TableProfile = {
			id: "ct-round-1",
			village_id: "v-1",
			name: "Võ Thị H",
			dob: "1927-01-01",
			gender: "Nữ",
			cccd: "064127001234",
			ethnicity: "Kinh",
			residence: "Thường trú",
			currentAddress: "Thôn 1",
			received: false,
		};

		const { rerender } = render(
			<table>
				<tbody>
					<ProfileRow
						{...defaultProps}
						profile={roundProfile}
						activeTab="chuctho"
						calculationYear={2027}
					/>
				</tbody>
			</table>,
		);

		const roundBadges = screen.getAllByText("Tròn 100 tuổi");
		expect(roundBadges.length).toBeGreaterThanOrEqual(1);
		const emeraldBadge = roundBadges.find((b) => b.className.includes("bg-emerald-50"));
		expect(emeraldBadge).toBeTruthy();

		rerender(
			<table>
				<tbody>
					<ProfileRow
						{...defaultProps}
						profile={roundProfile}
						activeTab="chuctho"
						calculationYear={2028}
					/>
				</tbody>
			</table>,
		);

		expect(screen.getAllByText("Trên 100 tuổi (101 tuổi)").length).toBeGreaterThanOrEqual(1);
	});

	it("calculates age accurately according to Day, Month, and Year referenceDate", () => {
		const testProfile: TableProfile = {
			id: "ct-ref-1",
			village_id: "v-1",
			name: "Hoàng Văn D",
			dob: "20/05/1966",
			gender: "Nam",
			cccd: "064066001234",
			ethnicity: "Kinh",
			residence: "Thường trú",
			currentAddress: "Thôn 1",
			received: false,
		};

		const { rerender } = render(
			<table>
				<tbody>
					<ProfileRow
						{...defaultProps}
						profile={testProfile}
						activeTab="chuctho"
						calculationYear={2026}
						referenceDate={new Date(2026, 4, 15)}
					/>
				</tbody>
			</table>,
		);

		expect(screen.queryByText("Tròn 60 tuổi")).toBeNull();

		rerender(
			<table>
				<tbody>
					<ProfileRow
						{...defaultProps}
						profile={testProfile}
						activeTab="chuctho"
						calculationYear={2026}
						referenceDate={new Date(2026, 4, 25)}
					/>
				</tbody>
			</table>,
		);

		expect(screen.getAllByText("Tròn 60 tuổi").length).toBeGreaterThanOrEqual(1);

		rerender(
			<table>
				<tbody>
					<ProfileRow
						{...defaultProps}
						profile={testProfile}
						activeTab="chuctho"
						calculationYear={2026}
						referenceDate={new Date(2026, 4, 0)}
					/>
				</tbody>
			</table>,
		);

		expect(screen.queryByText("Tròn 60 tuổi")).toBeNull();

		rerender(
			<table>
				<tbody>
					<ProfileRow
						{...defaultProps}
						profile={testProfile}
						activeTab="chuctho"
						calculationYear={2026}
						referenceDate={new Date(2026, 5, 0)}
					/>
				</tbody>
			</table>,
		);

		expect(screen.getAllByText("Tròn 60 tuổi").length).toBeGreaterThanOrEqual(1);

		rerender(
			<table>
				<tbody>
					<ProfileRow
						{...defaultProps}
						profile={testProfile}
						activeTab="chuctho"
						calculationYear={2026}
						referenceDate={new Date(2026, 11, 31)}
					/>
				</tbody>
			</table>,
		);

		expect(screen.getAllByText("Tròn 60 tuổi").length).toBeGreaterThanOrEqual(1);
	});
});
