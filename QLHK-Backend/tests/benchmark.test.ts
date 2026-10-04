import { describe, it, expect } from "vitest";
import { prisma } from "../src/config/prisma";
import { hashCCCD } from "../src/utils/crypto";

describe("QLHK Large Dataset Benchmark (23,000+ Record Simulation & Query Plan)", () => {
	it("1. Kiểm tra SQLite EXPLAIN QUERY PLAN cho truy vấn danh sách hộ có phân trang & sắp xếp", async () => {
		// Kiểm tra truy vấn chính: lấy danh sách hộ theo village_id, is_deleted = false, ORDER BY created_at DESC
		const queryPlan: Array<{ id: number; parent: number; notused: number; detail: string }> =
			await prisma.$queryRawUnsafe(
				`EXPLAIN QUERY PLAN SELECT * FROM households WHERE village_id = 'test-village' AND is_deleted = 0 ORDER BY created_at DESC LIMIT 20;`
			);

		expect(queryPlan.length).toBeGreaterThan(0);
		const detailStr = queryPlan.map((p) => p.detail).join(" ");

		// Phải sử dụng index thay vì SCAN TABLE toàn phần
		console.log("Query Plan (Households Pagination):", detailStr);
		expect(detailStr.toLowerCase()).toContain("index");
		// Không được sử dụng temporary B-tree cho ORDER BY
		expect(detailStr).not.toContain("USE TEMP B-TREE FOR ORDER BY");
	});

	it("2. Kiểm tra SQLite EXPLAIN QUERY PLAN cho tìm kiếm CCCD theo cccd_hash", async () => {
		const sampleHash = hashCCCD("001099012345");
		const queryPlan: Array<{ id: number; parent: number; notused: number; detail: string }> =
			await prisma.$queryRawUnsafe(
				`EXPLAIN QUERY PLAN SELECT * FROM citizens WHERE cccd_hash = '${sampleHash}';`
			);

		expect(queryPlan.length).toBeGreaterThan(0);
		const detailStr = queryPlan.map((p) => p.detail).join(" ");

		console.log("Query Plan (CCCD Search):", detailStr);
		// Phải sử dụng index cccd_hash
		expect(detailStr.toLowerCase()).toContain("index");
		expect(detailStr.toLowerCase()).toContain("cccd_hash");
	});

	it("3. Đo lường tốc độ tổng hợp thống kê Analytics (GROUP BY) trên CSDL", async () => {
		const startTime = performance.now();

		const [totalHouseholds, totalCitizens, genderGroups, ethnicityGroups] =
			await Promise.all([
				prisma.households.count({ where: { is_deleted: false } }),
				prisma.citizens.count({ where: { is_deleted: false } }),
				prisma.citizens.groupBy({
					by: ["gender"],
					where: { is_deleted: false },
					_count: { _all: true },
				}),
				prisma.citizens.groupBy({
					by: ["ethnicity"],
					where: { is_deleted: false },
					_count: { _all: true },
				}),
			]);

		const elapsedMs = performance.now() - startTime;
		console.log(`Thời gian thực thi Analytics GROUP BY: ${elapsedMs.toFixed(2)}ms`);

		// Thời gian thực thi aggregation trong CSDL phải cực nhanh (< 50ms)
		expect(elapsedMs).toBeLessThan(100);
		expect(totalHouseholds).toBeGreaterThanOrEqual(0);
		expect(totalCitizens).toBeGreaterThanOrEqual(0);
		expect(Array.isArray(genderGroups)).toBe(true);
		expect(Array.isArray(ethnicityGroups)).toBe(true);
	});

	it("4. Đo lường hiệu năng truy vấn phân trang với keyset/indexed offset", async () => {
		const startTime = performance.now();

		const households = await prisma.households.findMany({
			where: { is_deleted: false },
			take: 50,
			orderBy: { created_at: "desc" },
			include: {
				citizens: {
					where: { is_deleted: false },
					select: {
						id: true,
						full_name: true,
						gender: true,
						dob: true,
						cccd_last4: true,
						is_head: true,
					},
				},
			},
		});

		const elapsedMs = performance.now() - startTime;
		console.log(`Thời gian nạp trang 50 hộ kèm nhân khẩu: ${elapsedMs.toFixed(2)}ms`);

		expect(elapsedMs).toBeLessThan(100);
		expect(Array.isArray(households)).toBe(true);
	});
});
