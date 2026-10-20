import { describe, expect, it } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useHouseholdStore } from "../../src/store/householdStore";

describe("repro_bug_004: deleting household head leaves orphaned head_name and 0 head members", () => {
	it("leaves orphaned head_name and no head member when head is deleted via deleteMember", () => {
		const { result } = renderHook(() => useHouseholdStore());

		let createdHousehold: any;
		act(() => {
			createdHousehold = result.current.addHousehold({
				village_id: "vil-01",
				address: "Thôn 1",
				members: [
					{
						id: "head-01",
						full_name: "Nguyễn Văn Chủ Hộ",
						is_head: true,
						relationship: "Chủ hộ",
						gender: "Nam",
						dob_raw: "1980",
						cccd: "060080001111",
					},
					{
						id: "member-02",
						full_name: "Lê Thị Thành Viên",
						is_head: false,
						relationship: "Vợ",
						gender: "Nữ",
						dob_raw: "1982",
						cccd: "060082002222",
					},
				],
			});
		});

		expect(createdHousehold.head_name).toBe("Nguyễn Văn Chủ Hộ");
		expect(createdHousehold.head_cccd).toBe("060080001111");

		act(() => {
			result.current.deleteMember(createdHousehold.id, "head-01");
		});

		const updatedHousehold = result.current.households.find(
			(h) => h.id === createdHousehold.id,
		);

		expect(updatedHousehold).toBeDefined();
		expect(updatedHousehold?.members.length).toBe(1);

		const hasHeadMember = updatedHousehold?.members.some((m) => m.is_head);
		const headMatchesExistingMember = updatedHousehold?.members.some(
			(m) => m.full_name === updatedHousehold.head_name,
		);

		expect(hasHeadMember).toBe(true);
		expect(headMatchesExistingMember).toBe(true);
	});
});
