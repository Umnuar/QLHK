import { describe, expect, it, vi } from "vitest";
import ExcelJS from "exceljs";
import { exportHouseholdExcel } from "../../src/controllers/householdExcel.controller";
import { prisma } from "../../src/config/prisma";

vi.mock("../../src/config/prisma", () => ({
	prisma: {
		households: {
			findMany: vi.fn(),
		},
		villages: {
			findUnique: vi.fn(),
		},
	},
}));

describe("Household Excel Export Controller", () => {
	it("exports households and citizens formatted strictly according to template", async () => {
		(prisma.households.findMany as any).mockResolvedValue([
			{
				id: "hh-1",
				village_id: "v-1",
				book_number: "HK-001",
				address: "Thôn 1",
				village: { id: "v-1", name: "Thôn 1" },
				citizens: [
					{
						id: "c-1",
						full_name: "Nguyễn Văn A",
						dob: "1980",
						gender: "Nam",
						is_head: true,
						stt: 1,
						ethnicity: "Kinh",
						religion: "Không",
						notes: "Chủ hộ",
					},
					{
						id: "c-2",
						full_name: "Trần Thị B",
						dob: "1985",
						gender: "Nữ",
						is_head: false,
						stt: 2,
						ethnicity: "Cor",
						religion: "Công giáo",
						notes: "",
					},
				],
			},
		]);
		(prisma.villages.findUnique as any).mockResolvedValue({ id: "v-1", name: "Thôn 1" });

		const req: any = {
			query: { village_id: "v-1" },
			user: { role: "admin" },
		};

		const writtenChunks: Buffer[] = [];
		const res: any = {
			setHeader: vi.fn(),
			write: vi.fn((chunk: Buffer) => {
				writtenChunks.push(chunk);
			}),
			end: vi.fn(),
			headersSent: false,
		};

		await exportHouseholdExcel(req, res);

		expect(res.setHeader).toHaveBeenCalledWith(
			"Content-Type",
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		);
		expect(res.setHeader).toHaveBeenCalledWith(
			"Content-Disposition",
			'attachment; filename="NhanHoKhau_DakHa.xlsx"',
		);
		expect(res.end).toHaveBeenCalled();
	});
});
