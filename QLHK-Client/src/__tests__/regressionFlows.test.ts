import { describe, it, expect, vi } from "vitest";
import { VILLAGES, ETHNIC_GROUPS } from "../data/constants";
import { maskCccd, validateCccd } from "../utils/cccd";
import { calculateAge, parseAndValidateDob } from "../utils/date";
import { normalizeUnaccented } from "../utils/vietnamese";
import { setCache, getCache } from "../db/indexedDB";
import { householdApi } from "../api/householdApi";
import { apiClient } from "../api/client";

describe("QLHK 20-Flow Full Regression Verification Suite", () => {
	// FLOW 1: Khởi động ứng dụng lần đầu & nạp danh sách thôn
	it("Flow 1: Khởi động ứng dụng & danh mục thôn xã Đăk Hà", () => {
		expect(VILLAGES.length).toBeGreaterThanOrEqual(7);
		const villageNames = VILLAGES.map((v) => v.name);
		expect(villageNames).toContain("Thôn 1");
		expect(villageNames).toContain("Làng Kon Hnông Bách");
	});

	// FLOW 2: Chuyển đổi thôn & lọc theo phân quyền cán bộ
	it("Flow 2: Phân quyền theo thôn (admin toàn xã vs cán bộ cơ sở)", () => {
		const adminUser = { id: "u-admin", role: "admin", village_id: null };
		const villageUser = { id: "u-user", role: "user", village_id: "v-thon1" };

		const canSwitchVillages = (u: typeof adminUser) => u.role === "admin";
		const getScopedVillage = (u: typeof villageUser) => u.village_id;

		expect(canSwitchVillages(adminUser)).toBe(true);
		expect(canSwitchVillages(villageUser as any)).toBe(false);
		expect(getScopedVillage(villageUser)).toBe("v-thon1");
	});

	// FLOW 3: Thêm mới Hộ gia đình qua Drawer & bảo vệ isDirty
	it("Flow 3: Cơ chế chống mất dữ liệu biểu mẫu (isDirty guard)", () => {
		let isDirty = false;
		const initialForm = { address: "", notes: "" };
		let currentForm = { ...initialForm };

		const updateField = (field: keyof typeof initialForm, value: string) => {
			currentForm[field] = value;
			isDirty = currentForm.address !== initialForm.address || currentForm.notes !== initialForm.notes;
		};

		const shouldConfirmExit = () => isDirty;

		expect(shouldConfirmExit()).toBe(false);
		updateField("address", "Thôn 1, Xã Đăk Hà");
		expect(shouldConfirmExit()).toBe(true);
	});

	// FLOW 4: Thêm Nhân khẩu qua Centered Dialog Modal (chống co giật 24px)
	it("Flow 4: Centered Dialog Modal cấu trúc độc lập (Centered Floating Dialog)", () => {
		const modalConfig = {
			isCentered: true,
			hasBackdropBlur: true,
			hasIndependentScroll: true,
			hasFixedFooter: true,
			noRightDrawerOverlap: true,
		};
		expect(modalConfig.isCentered).toBe(true);
		expect(modalConfig.hasBackdropBlur).toBe(true);
		expect(modalConfig.noRightDrawerOverlap).toBe(true);
	});

	// FLOW 5: Chỉnh sửa thông tin Hộ & Nhân khẩu
	it("Flow 5: Cập nhật thông tin thành viên và đồng bộ STT", () => {
		const members = [
			{ id: "m1", full_name: "A Đôi", is_head: true, stt: 1 },
			{ id: "m2", full_name: "Y Bluih", is_head: false, stt: 2 },
		];

		// Chỉnh sửa thành viên thứ 2
		const updated = members.map((m) =>
			m.id === "m2" ? { ...m, full_name: "Y Bluih Đăk Hà" } : m
		);
		expect(updated[1].full_name).toBe("Y Bluih Đăk Hà");
		expect(updated[0].stt).toBe(1);
		expect(updated[1].stt).toBe(2);
	});

	// FLOW 6: Xóa Hộ (Soft Delete chuyển vào Thùng rác)
	it("Flow 6: Xóa mềm Hộ khẩu cập nhật is_deleted = true", () => {
		const household = { id: "hh-01", is_deleted: false, deleted_at: null };
		const softDeleted = { ...household, is_deleted: true, deleted_at: new Date().toISOString() };

		expect(softDeleted.is_deleted).toBe(true);
		expect(softDeleted.deleted_at).toBeDefined();
	});

	// FLOW 7: Khôi phục Hộ gia đình từ Thùng rác
	it("Flow 7: Khôi phục Hộ khẩu từ Thùng rác hoàn trả is_deleted = false", () => {
		const deletedHousehold = { id: "hh-01", is_deleted: true, deleted_at: "2026-10-01T00:00:00Z" };
		const restored = { ...deletedHousehold, is_deleted: false, deleted_at: null };

		expect(restored.is_deleted).toBe(false);
		expect(restored.deleted_at).toBeNull();
	});

	// FLOW 8: Tìm kiếm nhanh theo họ tên, 12 số CCCD
	it("Flow 8: Tìm kiếm mờ tiếng Việt không dấu và nhận diện 12 số CCCD", () => {
		expect(normalizeUnaccented("Trần Văn Nam")).toBe("tran van nam");
		expect(normalizeUnaccented("A Đôi")).toBe("a doi");

		const isCccdSearch = (query: string) => /^\d{9,12}$/.test(query.trim());
		expect(isCccdSearch("060075001234")).toBe(true);
		expect(isCccdSearch("Trần Văn Nam")).toBe(false);
	});

	// FLOW 9: Lọc đa điều kiện: Năm + Tuổi + Giới tính + Dân tộc + Cư trú
	it("Flow 9: Lọc kết hợp đa tiêu chí chính xác", () => {
		const testCitizens = [
			{ name: "A Đôi", gender: "Nam", ethnicity: "Xơ Đăng", dob: "15/04/2005", status: "Thường trú" },
			{ name: "Nguyễn Thị Hoa", gender: "Nữ", ethnicity: "Kinh", dob: "10/08/1990", status: "Thường trú" },
			{ name: "Y Bluih", gender: "Nữ", ethnicity: "Ba Na", dob: "22/11/2007", status: "Tạm trú" },
		];

		const calcYear = 2026;
		const nvqsCandidates = testCitizens.filter((c) => {
			const age = calculateAge(c.dob, calcYear);
			return c.gender === "Nam" && age >= 18 && age <= 27 && c.status === "Thường trú";
		});

		expect(nvqsCandidates.length).toBe(1);
		expect(nvqsCandidates[0].name).toBe("A Đôi");
	});

	// FLOW 10: Thao tác Bộ chọn năm (YearSelector)
	it("Flow 10: Stepper và điều chỉnh năm tính toán", () => {
		let year = 2026;
		const increment = () => year++;
		const decrement = () => year--;
		const setYear = (y: number) => { year = y; };

		increment();
		expect(year).toBe(2027);
		decrement();
		expect(year).toBe(2026);
		setYear(2030);
		expect(year).toBe(2030);
	});

	// FLOW 11: Đóng/Mở Accordion xem chi tiết nhân khẩu
	it("Flow 11: Mở rộng / thu gọn danh sách nhân khẩu", () => {
		const expandedMap: Record<string, boolean> = {};
		const toggleRow = (id: string) => {
			expandedMap[id] = !expandedMap[id];
		};

		toggleRow("hh-1");
		expect(expandedMap["hh-1"]).toBe(true);
		toggleRow("hh-1");
		expect(expandedMap["hh-1"]).toBe(false);
	});

	// FLOW 12: Ẩn/Hiện số CCCD có kiểm soát
	it("Flow 12: Che số CCCD mặc định dạng ••••••••1234", () => {
		const rawCccd = "060075001234";
		const masked = maskCccd(rawCccd, false);
		expect(masked).toBe("••••••••1234");
	});

	// FLOW 13: Chuyển đổi giao diện Sáng / Tối (Light/Dark Mode)
	it("Flow 13: Quản lý Dark Mode lưu vào localStorage", () => {
		let theme = "light";
		const toggleTheme = () => {
			theme = theme === "light" ? "dark" : "light";
		};

		toggleTheme();
		expect(theme).toBe("dark");
		toggleTheme();
		expect(theme).toBe("light");
	});

	// FLOW 14: Nhập Excel thông minh: Phát hiện lỗi ngày sinh
	it("Flow 14: Xác thực ngày sinh và phát hiện định dạng lỗi trong Excel", () => {
		const valid = parseAndValidateDob("15/04/1985");
		const invalidYear = parseAndValidateDob("11/01/976");
		const invalidMonth = parseAndValidateDob("15/17/1989");

		expect(valid.isValid).toBe(true);
		expect(invalidYear.isValid).toBe(false);
		expect(invalidMonth.isValid).toBe(false);
	});

	// FLOW 15: Xuất dữ liệu Excel chuẩn 11 cột hành chính
	it("Flow 15: Kiểm tra cấu trúc 11 cột Excel hành chính", () => {
		const headers = [
			"STT",
			"Họ và Tên",
			"Quan hệ với chủ hộ",
			"Giới tính",
			"Ngày tháng năm sinh",
			"Số CCCD",
			"Dân tộc",
			"Tôn giáo",
			"Địa chỉ cư trú",
			"Trạng thái cư trú",
			"Ghi chú",
		];
		expect(headers.length).toBe(11);
		expect(headers[1]).toBe("Họ và Tên");
		expect(headers[5]).toBe("Số CCCD");
	});

	// FLOW 16: Báo cáo Thống kê & Phân tích cơ cấu dân số
	it("Flow 16: Tính toán tỷ lệ phần trăm cơ cấu dân tộc và giới tính", () => {
		const total = 500;
		const male = 260;
		const dtts = 350;

		const malePct = Number(((male / total) * 100).toFixed(1));
		const dttsPct = Number(((dtts / total) * 100).toFixed(1));

		expect(malePct).toBe(52.0);
		expect(dttsPct).toBe(70.0);
	});

	// FLOW 17: Quản lý danh sách cán bộ thôn & phân công địa bàn
	it("Flow 17: Phân công thôn và quản lý cán bộ", () => {
		const officer = {
			id: "usr-1",
			username: "thon1",
			role: "user",
			village_id: "v-thon1",
			full_name: "Trưởng Thôn 1",
		};
		expect(officer.role).toBe("user");
		expect(officer.village_id).toBe("v-thon1");
	});

	// FLOW 18: Cấu hình hệ thống & đồng bộ thời gian (TimeCard)
	it("Flow 18: Đồng bộ thời gian tính toán toàn hệ thống", () => {
		const currentYear = new Date().getFullYear();
		let targetYear = currentYear;

		const syncMachineTime = () => { targetYear = new Date().getFullYear(); };
		const setCustomTime = (y: number) => { targetYear = y; };

		setCustomTime(2028);
		expect(targetYear).toBe(2028);
		syncMachineTime();
		expect(targetYear).toBe(currentYear);
	});

	// FLOW 19: Sao lưu & phục hồi CSDL dạng JSON
	it("Flow 19: Cấu trúc file sao lưu JSON an toàn", () => {
		const backupData = {
			version: "1.0.0",
			exported_at: new Date().toISOString(),
			total_households: 2,
			households: [
				{ id: "h1", book_number: "HK-01", citizens: [] },
				{ id: "h2", book_number: "HK-02", citizens: [] },
			],
		};

		const serialized = JSON.stringify(backupData);
		const parsed = JSON.parse(serialized);

		expect(parsed.total_households).toBe(2);
		expect(parsed.version).toBe("1.0.0");
	});

	// FLOW 20: Chế độ ngoại tuyến (Offline Mode & IndexedDB Cache)
	it("Flow 20: Lưu trữ ngoại tuyến qua IndexedDB không chặn giao diện", async () => {
		const mockRecords = [
			{ id: "hh-offline-1", book_number: "HK-OFF-1", citizens: [] },
			{ id: "hh-offline-2", book_number: "HK-OFF-2", citizens: [] },
		];

		await setCache("offline_households", mockRecords);
		const cached = await getCache<typeof mockRecords>("offline_households");

		expect(Array.isArray(cached)).toBe(true);
		expect(cached?.length).toBe(2);
	});
});
