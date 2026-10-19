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

	it("bảo toàn đầy đủ các trường mới (education, military_status, occupation, native_place, notes)", () => {
		const rawHh = {
			id: "hh-fields-01",
			book_number: "SHK-FIELD-01",
			village_id: "vil-01",
			citizens: [
				{
					id: "cit-fields-01",
					stt: 1,
					is_head: true,
					full_name: "A Trọng",
					education: " 12/12 ",
					military_status: " Xuất ngũ năm 2022 ",
					occupation: " Làm nông ",
					native_place: " Xã Đăk Hà, Huyện Tu Mơ Rông ",
					notes: " Gia đình chính sách ",
				},
				{
					id: "cit-fields-02",
					stt: 2,
					is_head: false,
					full_name: "Y Lan",
					education: null,
					military_status: undefined,
					occupation: "",
					native_place: null,
					notes: undefined,
				},
			],
		};

		const normalized = normalizeHousehold(rawHh);
		expect(normalized.members[0].education).toBe("12/12");
		expect(normalized.members[0].military_status).toBe("Xuất ngũ năm 2022");
		expect(normalized.members[0].occupation).toBe("Làm nông");
		expect(normalized.members[0].native_place).toBe("Xã Đăk Hà, Huyện Tu Mơ Rông");
		expect(normalized.members[0].notes).toBe("Gia đình chính sách");

		expect(normalized.members[1].education).toBe("");
		expect(normalized.members[1].military_status).toBe("");
		expect(normalized.members[1].occupation).toBe("");
		expect(normalized.members[1].native_place).toBe("");
		expect(normalized.members[1].notes).toBe("");
	});

	it("hỗ trợ fallback alias tiếng Việt (hoc_van, nvqs, nghe_nghiep, que_quan, ghi_chu) (BUG-001)", () => {
		const rawHh = {
			id: "hh-alias-01",
			book_number: "SHK-ALIAS-01",
			village_id: "vil-01",
			citizens: [
				{
					id: "cit-alias-01",
					stt: 1,
					is_head: true,
					full_name: "A Thao",
					hoc_van: " 9/12 ",
					nvqs: " Sẵn sàng nhập ngũ ",
					nghe_nghiep: " Thợ mộc ",
					que_quan: " Thôn Đăk Kang Pơ ",
					ghi_chu: " Tạm vắng lao động ",
				},
			],
		};

		const normalized = normalizeHousehold(rawHh);
		expect(normalized.members[0].education).toBe("9/12");
		expect(normalized.members[0].military_status).toBe("Sẵn sàng nhập ngũ");
		expect(normalized.members[0].occupation).toBe("Thợ mộc");
		expect(normalized.members[0].native_place).toBe("Thôn Đăk Kang Pơ");
		expect(normalized.members[0].notes).toBe("Tạm vắng lao động");
	});
});
