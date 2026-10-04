import { describe, expect, it } from "vitest";
import { normalizeHousehold } from "../householdApi";

describe("householdApi - Chuẩn hóa dữ liệu Household", () => {
	it("chuẩn hóa dữ liệu từ backend Prisma sang frontend Household", () => {
		const backendData = {
			id: "hh-prisma-123",
			book_number: "SHK-DAKHA-01",
			village_id: "vil-01",
			village: { id: "vil-01", name: "Thôn 1", code: "TH1" },
			address: "Thôn 1, Xã Đăk Hà",
			status: "active",
			is_deleted: false,
			citizens: [
				{
					id: "cit-01",
					stt: 1,
					is_head: true,
					relationship: "Chủ hộ",
					full_name: "A Đôi",
					gender: "Nam",
					dob: "15/04/1975",
					cccd_last4: "4567",
					ethnicity: "Xơ Đăng",
					religion: "Không",
				},
				{
					id: "cit-02",
					stt: 2,
					is_head: false,
					relationship: "Vợ",
					full_name: "Y Ble",
					gender: "Nữ",
					dob: "20/08/1978",
					cccd_last4: "8899",
					ethnicity: "Xơ Đăng",
					religion: "Không",
				},
			],
		};

		const normalized = normalizeHousehold(backendData);

		expect(normalized.id).toBe("hh-prisma-123");
		expect(normalized.book_number).toBe("SHK-DAKHA-01");
		expect(normalized.head_name).toBe("A Đôi");
		expect(normalized.village_name).toBe("Thôn 1");
		expect(normalized.members_count).toBe(2);
		expect(normalized.members[0].is_head).toBe(true);
		expect(normalized.members[0].cccd_masked).toBe("••••••••4567");
		expect(normalized.members[0].is_minority).toBe(true);
		expect(normalized.members[1].relationship).toBe("Vợ");
		expect(normalized.status).toBe("Thường trú");
	});

	it("xử lý an toàn hộ không có thành viên nhân khẩu", () => {
		const rawHh = {
			id: "hh-empty",
			book_number: "SHK-EMPTY",
			village_id: "vil-02",
			address: "Thôn 2",
		};

		const normalized = normalizeHousehold(rawHh);
		expect(normalized.head_name).toBe("Chưa xác định");
		expect(normalized.members_count).toBe(0);
		expect(normalized.members).toEqual([]);
	});
});
