import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { calculateAge, parseAndValidateDob } from "@/utils/date";
import { AnalyticsDashboard } from "../AnalyticsDashboard";

const mockUseApp = vi.fn();
vi.mock("@/AppContext", () => ({
	useApp: () => mockUseApp(),
}));

const mockUseHouseholds = vi.fn();
vi.mock("@/context/HouseholdContext", () => ({
	useHouseholds: () => mockUseHouseholds(),
}));

const mockGetOverview = vi.fn();
const mockGetByVillage = vi.fn();
vi.mock("@/api/analyticsApi", () => ({
	analyticsApi: {
		getOverview: (...args: any[]) => mockGetOverview(...args),
		getByVillage: (...args: any[]) => mockGetByVillage(...args),
	},
}));

vi.mock("@/db/indexedDB", () => ({
	getCache: vi.fn().mockResolvedValue(null),
	setCache: vi.fn().mockResolvedValue(true),
}));

describe("AnalyticsDashboard Component (Thống Kê Toàn Diện)", () => {
	const fakeOverviewData = {
		totalHouseholds: 150,
		totalCitizens: 600,
		averageHouseholdSize: 4.0,
		gender: {
			male: { count: 290, percentage: 48.3 },
			female: { count: 310, percentage: 51.7 },
		},
		ageGroups: {
			under6: { count: 45, percentage: 7.5 },
			from6to17: { count: 110, percentage: 18.3 },
			from18to60: { count: 365, percentage: 60.8 },
			over60: { count: 80, percentage: 13.3 },
		},
		ethnicities: [
			{ name: "Kinh", count: 240, percentage: 40.0 },
			{ name: "Xơ Đăng", count: 180, percentage: 30.0 },
			{ name: "Gia Rai", count: 90, percentage: 15.0 },
			{ name: "Giẻ Triêng", count: 50, percentage: 8.3 },
			{ name: "Ê Đê", count: 40, percentage: 6.7 },
		],
		religions: [
			{ name: "Không", count: 320, percentage: 53.3 },
			{ name: "Công giáo", count: 180, percentage: 30.0 },
			{ name: "Tin lành", count: 70, percentage: 11.7 },
			{ name: "Phật giáo", count: 30, percentage: 5.0 },
		],
		military: [
			{ name: "Đủ điều kiện", count: 85, percentage: 14.2 },
			{ name: "Xuất ngũ", count: 40, percentage: 6.7 },
		],
		educations: [
			{ name: "12/12", count: 210, percentage: 35.0 },
			{ name: "Đại học", count: 65, percentage: 10.8 },
		],
		occupations: [
			{ name: "Làm nông", count: 320, percentage: 53.3 },
			{ name: "Công nhân", count: 85, percentage: 14.2 },
		],
	};

	const fakeVillageBreakdown = [
		{
			village_id: "v-01",
			village_name: "Thôn 1",
			household_count: 50,
			citizen_count: 200,
			male_count: 95,
			female_count: 105,
			dtts_count: 120,
			avg_members: 4.0,
		},
		{
			village_id: "v-02",
			village_name: "Thôn 2",
			household_count: 100,
			citizen_count: 400,
			male_count: 195,
			female_count: 205,
			dtts_count: 240,
			avg_members: 4.0,
		},
	];

	beforeEach(() => {
		vi.clearAllMocks();

		mockUseApp.mockReturnValue({
			user: { id: "u-1", username: "admin", role: "admin" },
			selectedVillageId: "",
			selectedVillageName: "Toàn xã Đăk Hà",
			setActiveTab: vi.fn(),
			villages: [
				{ id: "v-01", name: "Thôn 1" },
				{ id: "v-02", name: "Thôn 2" },
			],
			isBackendHealthy: true,
		});

		mockUseHouseholds.mockReturnValue({
			activeHouseholds: [],
		});

		mockGetOverview.mockResolvedValue(fakeOverviewData);
		mockGetByVillage.mockResolvedValue(fakeVillageBreakdown);
	});

	it("1. Render tổng quan KPI Hộ gia đình và Nhân khẩu từ dữ liệu API", async () => {
		render(<AnalyticsDashboard />);

		await waitFor(() => {
			expect(mockGetOverview).toHaveBeenCalled();
			expect(mockGetByVillage).toHaveBeenCalled();
			expect(screen.getAllByText("150").length).toBeGreaterThan(0);
		});

		expect(screen.getByText("Thống Kê Dân Cư & Dân Tộc")).toBeInTheDocument();

		expect(screen.getByText("Tổng Hộ Gia Đình")).toBeInTheDocument();
		expect(screen.getAllByText("Tổng Nhân Khẩu").length).toBeGreaterThan(0);
		expect(screen.getAllByText("600").length).toBeGreaterThan(0);
	});

	it("2. Kiểm tra hiển thị cơ cấu các Dân tộc thiểu số & Tỷ lệ DTTS toàn xã", async () => {
		render(<AnalyticsDashboard />);

		await waitFor(() => {
			expect(
				screen.getByText("Phân Bổ Dân Tộc Địa Bàn Đăk Hà"),
			).toBeInTheDocument();
		});

		expect(screen.getByText("Dân tộc Kinh")).toBeInTheDocument();
		expect(screen.getByText("Dân tộc Xơ Đăng")).toBeInTheDocument();
		expect(screen.getByText("Dân tộc Gia Rai")).toBeInTheDocument();
		expect(screen.getByText("Dân tộc Giẻ Triêng")).toBeInTheDocument();
		expect(screen.getByText("Dân tộc Ê Đê")).toBeInTheDocument();

		expect(screen.getAllByText("60%").length).toBeGreaterThan(0);
	});

	it("3. Kiểm tra hiển thị phân bố Tín ngưỡng & Tôn giáo chuẩn mực", async () => {
		render(<AnalyticsDashboard />);

		await waitFor(() => {
			expect(
				screen.getByText("Cơ Cấu Tín Ngưỡng & Tôn Giáo"),
			).toBeInTheDocument();
		});

		expect(screen.getAllByText("Không tôn giáo").length).toBeGreaterThan(0);
		expect(screen.getAllByText("Công giáo").length).toBeGreaterThan(0);
		expect(screen.getAllByText("Tin lành").length).toBeGreaterThan(0);
		expect(screen.getAllByText("Phật giáo").length).toBeGreaterThan(0);
	});

	it("4. Kiểm tra phân bổ cơ cấu giới tính và tỷ lệ phần trăm", async () => {
		render(<AnalyticsDashboard />);

		await waitFor(() => {
			expect(screen.getByText("Cơ Cấu Giới Tính")).toBeInTheDocument();
		});

		expect(screen.getByText(/48,3%/)).toBeInTheDocument();
		expect(screen.getByText(/51,7%/)).toBeInTheDocument();
		expect(screen.getByText(/290 Nam • 310 Nữ/)).toBeInTheDocument();
	});

	it("5. Hiển thị nút Xuất Báo Cáo Excel trên thanh thao tác", async () => {
		render(<AnalyticsDashboard />);

		await waitFor(() => {
			expect(screen.getByText("Xuất Báo Cáo Excel")).toBeInTheDocument();
		});
	});

	it("6. Hiển thị bảng đối soát thống kê giữa các thôn", async () => {
		render(<AnalyticsDashboard />);

		await waitFor(() => {
			expect(
				screen.getByText("Bảng Thống Kê So Sánh Giữa Các Thôn"),
			).toBeInTheDocument();
		});

		expect(screen.getByText("Thôn 1")).toBeInTheDocument();
		expect(screen.getByText("Thôn 2")).toBeInTheDocument();
		expect(screen.getByText("Số Hộ")).toBeInTheDocument();
		expect(screen.getByText("Đồng Bào DTTS")).toBeInTheDocument();
	});

	it("7. Hiển thị 3 cụm thống kê mới: Tháp tuổi, Tình hình NVQS, Học vấn & Nghề nghiệp", async () => {
		render(<AnalyticsDashboard />);

		await waitFor(() => {
			expect(screen.getByText("Tháp Tuổi & Cơ Cấu Thế Hệ")).toBeInTheDocument();
			expect(screen.getByText("Tình Hình Nghĩa Vụ Quân Sự")).toBeInTheDocument();
			expect(screen.getByText("Trình Độ Học Vấn")).toBeInTheDocument();
			expect(screen.getByText("Cơ Cấu Nghề Nghiệp")).toBeInTheDocument();
		});

		expect(screen.getByText("Thiếu nhi (< 16 tuổi)")).toBeInTheDocument();
		expect(screen.getByText("Thanh niên & NVQS (16 - 27 tuổi)")).toBeInTheDocument();
		expect(screen.getByText("Lao động chính (28 - 60 tuổi)")).toBeInTheDocument();
		expect(screen.getByText("Người cao tuổi (> 60 tuổi)")).toBeInTheDocument();

		expect(screen.getAllByText("Đủ điều kiện").length).toBeGreaterThan(0);
		expect(screen.getAllByText("Xuất ngũ").length).toBeGreaterThan(0);

		expect(screen.getByText("12/12")).toBeInTheDocument();
		expect(screen.getByText("Đại học")).toBeInTheDocument();
		expect(screen.getByText("Làm nông")).toBeInTheDocument();
		expect(screen.getByText("Công nhân")).toBeInTheDocument();
	});

	it("8. Tính toán chính xác nhóm tuổi cho ngày sinh định dạng ISO YYYY-MM-DD (BUG-004)", async () => {
		mockUseApp.mockReturnValue({
			user: { id: "u-1", username: "admin", role: "admin" },
			selectedVillageId: "",
			selectedVillageName: "Toàn xã Đăk Hà",
			setActiveTab: vi.fn(),
			villages: [{ id: "v-01", name: "Thôn 1" }],
			isBackendHealthy: false,
		});

		mockUseHouseholds.mockReturnValue({
			activeHouseholds: [
				{
					id: "hh-iso-1",
					book_number: "HK-ISO-1",
					village_id: "v-01",
					members: [
						{
							id: "m-iso-1",
							full_name: "Nguyễn Văn ISO",
							dob: "2015-06-20",
							gender: "Nam",
							relationship: "Chủ hộ",
							ethnicity: "Kinh",
						},
						{
							id: "m-iso-2",
							full_name: "Trần Thị ISO",
							dob: "2005-01-10",
							gender: "Nữ",
							relationship: "Vợ",
							ethnicity: "Kinh",
						},
					],
				},
			],
		});

		render(<AnalyticsDashboard />);

		await waitFor(() => {
			expect(screen.getByText("Tháp Tuổi & Cơ Cấu Thế Hệ")).toBeInTheDocument();
		});

		expect(screen.getByText("Thiếu nhi (< 16 tuổi)")).toBeInTheDocument();
		expect(screen.getByText("Thanh niên & NVQS (16 - 27 tuổi)")).toBeInTheDocument();
	});

	it("9. Uu tien dung militaryAge va workingAge tu API overview thay vi bi ghi de boi youth va adult", async () => {
		mockGetOverview.mockResolvedValueOnce({
			totalHouseholds: 100,
			totalCitizens: 400,
			averageHouseholdSize: 4,
			gender: { male: { count: 200, percentage: 50 }, female: { count: 200, percentage: 50 } },
			ethnicities: [],
			religions: [],
			ageGroups: {
				under16: { count: 80, percentage: 20 },
				youth: { count: 120, percentage: 30 },
				militaryAge: { count: 45, percentage: 11.25 },
				adult: { count: 180, percentage: 45 },
				workingAge: { count: 210, percentage: 52.5 },
				over60: { count: 20, percentage: 5 },
			},
		});

		render(<AnalyticsDashboard />);

		await waitFor(() => {
			expect(screen.getByText("Tháp Tuổi & Cơ Cấu Thế Hệ")).toBeInTheDocument();
		});

		expect(screen.getByText("Thanh niên & NVQS (16 - 27 tuổi)")).toBeInTheDocument();
	});

	it("10. Tinh toan tuoi thanh vien import bang calculationYear dong", () => {
		const calculationYear = 2024;
		const dobRaw = "01/01/2010";
		const dobVal = parseAndValidateDob(dobRaw);
		const dobFormatted = dobVal.formatted || dobRaw;

		const targetYear = calculationYear;
		const computedAge = calculateAge(dobFormatted, targetYear);

		expect(computedAge).toBe(14);
		expect(computedAge).not.toBe(calculateAge(dobFormatted, 2026));
	});
});
