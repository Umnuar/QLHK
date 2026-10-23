import { describe, expect, it } from "vitest";
import type { Person } from "../../types";
import {
	type OfflineCitizenItem,
	mapPersonToOfflineCitizen,
	searchCitizensBrowserFallback,
	searchCitizensOffline,
} from "../offlineSearch";

describe("offlineSearch", () => {
	const sampleCitizens: OfflineCitizenItem[] = [
		{
			id: "c1",
			household_id: "h1",
			household_number: "HK-001",
			full_name: "Nguyễn Văn An",
			relationship: "Chủ hộ",
			dob: "1980",
			gender: "Nam",
			cccd: "064080001234",
			phone: "0905123456",
			village_name: "Thôn 1",
			address: "Đăk Hà, Kon Tum",
		},
		{
			id: "c2",
			household_id: "h2",
			household_number: "HK-002",
			full_name: "Trần Thị Bình",
			relationship: "Vợ",
			dob: "1985",
			gender: "Nữ",
			cccd: "064185005678",
			phone: null,
			village_name: "Thôn 2",
			address: "Đường Hùng Vương",
		},
		{
			id: "c3",
			household_id: "h3",
			household_number: "HK-003",
			full_name: "Lê Hoàng Đức",
			relationship: "Con",
			dob: "2005",
			gender: "Nam",
			cccd: "064205009999",
			phone: "0912999888",
			village_name: "Làng Kon Trang Long Loi",
			address: "Khu dân cư mới",
		},
	];

	describe("searchCitizensBrowserFallback", () => {
		it("trả về toàn bộ danh sách khi truy vấn rỗng hoặc chỉ có khoảng trắng", () => {
			expect(searchCitizensBrowserFallback("", sampleCitizens)).toHaveLength(3);
			expect(searchCitizensBrowserFallback("   ", sampleCitizens)).toHaveLength(3);
		});

		it("tìm kiếm đúng theo tên có dấu và không dấu", () => {
			const res1 = searchCitizensBrowserFallback("nguyen van an", sampleCitizens);
			expect(res1).toHaveLength(1);
			expect(res1[0].id).toBe("c1");

			const res2 = searchCitizensBrowserFallback("BINH", sampleCitizens);
			expect(res2).toHaveLength(1);
			expect(res2[0].id).toBe("c2");

			const res3 = searchCitizensBrowserFallback("hoang duc", sampleCitizens);
			expect(res3).toHaveLength(1);
			expect(res3[0].id).toBe("c3");
		});

		it("tìm kiếm đúng theo CCCD", () => {
			const res = searchCitizensBrowserFallback("005678", sampleCitizens);
			expect(res).toHaveLength(1);
			expect(res[0].id).toBe("c2");
		});

		it("tìm kiếm đúng theo số điện thoại", () => {
			const res = searchCitizensBrowserFallback("0912999", sampleCitizens);
			expect(res).toHaveLength(1);
			expect(res[0].id).toBe("c3");
		});

		it("tìm kiếm đúng theo số sổ hộ khẩu", () => {
			const res = searchCitizensBrowserFallback("hk-001", sampleCitizens);
			expect(res).toHaveLength(1);
			expect(res[0].id).toBe("c1");
		});

		it("tìm kiếm đúng theo tên thôn làng", () => {
			const res = searchCitizensBrowserFallback("kon trang", sampleCitizens);
			expect(res).toHaveLength(1);
			expect(res[0].id).toBe("c3");
		});

		it("tìm kiếm đúng theo địa chỉ", () => {
			const res = searchCitizensBrowserFallback("hung vuong", sampleCitizens);
			expect(res).toHaveLength(1);
			expect(res[0].id).toBe("c2");
		});

		it("trả về mảng rỗng khi không có kết quả phù hợp", () => {
			const res = searchCitizensBrowserFallback("TuKhoaKhongTonTai", sampleCitizens);
			expect(res).toHaveLength(0);
		});
	});

	describe("mapPersonToOfflineCitizen", () => {
		it("chuyển đổi đúng đối tượng Person sang OfflineCitizenItem", () => {
			const mockPerson: Person = {
				id: "p100",
				household_id: "h100",
				stt: 1,
				full_name: "Phạm Văn Đồng",
				last_name: "Phạm Văn",
				first_name: "Đồng",
				name_unaccented: "pham van dong",
				relationship: "Chủ hộ",
				is_head: true,
				gender: "Nam",
				dob_raw: "1960",
				dob_formatted: "1960",
				birth_year: 1960,
				age: 66,
				cccd: "064060000001",
				cccd_masked: "064060****01",
				ethnicity: "Kinh",
				is_minority: false,
				religion: "Không",
				phone: "0988777666",
				address: "Số 10 Lê Duẩn",
			};

			const mapped = mapPersonToOfflineCitizen(mockPerson, {
				code: "HK-888",
				village_name: "Thôn 3",
				address: "Thôn 3, Xã Đăk Hà",
			});

			expect(mapped.id).toBe("p100");
			expect(mapped.household_number).toBe("HK-888");
			expect(mapped.full_name).toBe("Phạm Văn Đồng");
			expect(mapped.village_name).toBe("Thôn 3");
			expect(mapped.cccd).toBe("064060000001");
			expect(mapped.phone).toBe("0988777666");
		});
	});

	describe("searchCitizensOffline", () => {
		it("hoạt động mượt mà trong môi trường trình duyệt", async () => {
			const results = await searchCitizensOffline("van an", sampleCitizens);
			expect(results).toHaveLength(1);
			expect(results[0].id).toBe("c1");
		});
	});
});
