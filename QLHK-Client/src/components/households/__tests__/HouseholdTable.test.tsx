// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import type { Household, Person } from "../../../types";
import { HouseholdTable } from "../HouseholdTable";

describe("HouseholdTable Component", () => {
	const mockHouseholds = [
		{
			id: "hh-01",
			code: "HK-9999",
			book_number: "HK-9999",
			head_name: "A Đôi",
			head_cccd: "123456789012",
			village_id: "vil-01",
			village_name: "Thôn 1",
			address: "Làng Kon Trang",
			status: "active",
			members_count: 2,
			members: [
				{
					id: "mem-01",
					household_id: "hh-01",
					stt: 1,
					full_name: "A Đôi",
					relationship: "Chủ hộ",
					is_head: true,
					gender: "Nam",
					dob: "15/04/1975",
					cccd: "123456789012",
					cccd_last4: "9012",
					ethnicity: "Xơ Đăng",
					religion: "Không",
				},
				{
					id: "mem-02",
					household_id: "hh-01",
					stt: 2,
					full_name: "Y Ble",
					relationship: "Vợ",
					is_head: false,
					gender: "Nữ",
					dob: "20/08/1978",
					cccd: "123456789034",
					cccd_last4: "9034",
					ethnicity: "Xơ Đăng",
					religion: "Không",
				},
			] as unknown as Person[],
		},
		{
			id: "hh-02",
			code: "HK-8888",
			book_number: "HK-8888",
			head_name: "Trần Văn Nam",
			head_cccd: "",
			village_id: "vil-02",
			village_name: "Thôn 2",
			address: "Thôn 2, Xã Đăk Hà",
			status: "active",
			members_count: 1,
			members: [
				{
					id: "mem-03",
					household_id: "hh-02",
					stt: 1,
					full_name: "Trần Văn Nam",
					relationship: "Chủ hộ",
					is_head: true,
					gender: "Nam",
					dob: "01/01/1985",
					cccd: "",
					ethnicity: "Kinh",
					religion: "Không",
				},
			] as unknown as Person[],
		},
	];

	it('1. Hiển thị cột "Hộ Gia Đình", KHÔNG hiển thị cột "Mã Hộ / Số Sổ"', () => {
		render(
			<HouseholdTable
				households={mockHouseholds as unknown as Household[]}
				loading={false}
				total={2}
				page={1}
				limit={10}
				totalPages={1}
				onPageChange={vi.fn()}
				onLimitChange={vi.fn()}
				onEdit={vi.fn()}
				onDelete={vi.fn()}
			/>,
		);

		expect(screen.getByText("Hộ Gia Đình")).toBeDefined();
		expect(screen.queryByText("Mã Hộ / Số Sổ")).toBeNull();
		expect(screen.queryByText("Số Sổ")).toBeNull();
	});

	it('2. Hiển thị trực tiếp tên chủ hộ đậm, bỏ tiền tố "Hộ ông/bà:" và không hiển thị mã sổ HK-... trên bảng', () => {
		render(
			<HouseholdTable
				households={mockHouseholds as unknown as Household[]}
				loading={false}
				total={2}
				page={1}
				limit={10}
				totalPages={1}
				onPageChange={vi.fn()}
				onLimitChange={vi.fn()}
				onEdit={vi.fn()}
				onDelete={vi.fn()}
			/>,
		);

		// Kiểm tra hiển thị tên đậm và không còn tiền tố lặp lại
		expect(screen.getByText("A Đôi")).toBeDefined();
		expect(screen.getByText("Trần Văn Nam")).toBeDefined();
		const tableBody = document.querySelector("tbody");
		expect(tableBody?.textContent).not.toContain("Hộ ông/bà:");

		// Tuyệt đối không hiển thị mã sổ kỹ thuật HK-9999 và HK-8888 trên giao diện bảng
		expect(screen.queryByText("HK-9999")).toBeNull();
		expect(screen.queryByText("HK-8888")).toBeNull();
	});

	it("3. Bung mở danh sách nhân khẩu chi tiết khi bấm vào dòng hộ gia đình", () => {
		render(
			<HouseholdTable
				households={mockHouseholds as unknown as Household[]}
				loading={false}
				total={2}
				page={1}
				limit={10}
				totalPages={1}
				onPageChange={vi.fn()}
				onLimitChange={vi.fn()}
				onEdit={vi.fn()}
				onDelete={vi.fn()}
			/>,
		);

		// Trước khi bấm, chưa hiển thị bảng con nhân khẩu của Y Ble
		expect(screen.queryByText("Y Ble")).toBeNull();

		// Bấm vào dòng hộ A Đôi
		const headCell = screen.getByText("A Đôi");
		fireEvent.click(headCell);

		// Bảng nhân khẩu con được mở ra, hiển thị Y Ble và quan hệ Vợ
		expect(screen.getByText("Y Ble")).toBeDefined();
		expect(screen.getByText("Vợ")).toBeDefined();

		// Không hiển thị mã sổ trong bảng con
		expect(screen.queryByText("HK-9999")).toBeNull();
	});
});
