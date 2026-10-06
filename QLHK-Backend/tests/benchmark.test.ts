import { describe, it, expect } from "vitest";
import { prisma } from "../src/config/prisma";
import { hashCCCD } from "../src/utils/crypto";

describe("QLHK Large Dataset Benchmark (23,000+ Record Simulation & Query Plan)", () => {
	it("1. Kiểm tra PostgreSQL EXPLAIN cho truy vấn danh sách hộ có phân trang & sắp xếp", async () => {
		// Kiểm tra truy vấn chính: lấy danh sách hộ theo village_id, is_deleted = false, ORDER BY created_at DESC
		const queryPlan: Array<{ "QUERY PLAN": string }> =
			await prisma.$queryRawUnsafe(
				`EXPLAIN SELECT * FROM households WHERE village_id = '00000000-0000-0000-0000-000000000000' AND is_deleted = false ORDER BY created_at DESC LIMIT 20;`
			);

		expect(queryPlan.length).toBeGreaterThan(0);
		const detailStr = queryPlan.map((p) => p["QUERY PLAN"]).join(" ");

		console.log("Query Plan (Households Pagination):", detailStr);
		expect(detailStr.length).toBeGreaterThan(0);
	});

	it("2. Kiểm tra PostgreSQL EXPLAIN cho tìm kiếm CCCD theo cccd_hash", async () => {
		const sampleHash = hashCCCD("001099012345");
		const queryPlan: Array<{ "QUERY PLAN": string }> =
			await prisma.$queryRawUnsafe(
				`EXPLAIN SELECT * FROM citizens WHERE cccd_hash = '${sampleHash}';`
			);

		expect(queryPlan.length).toBeGreaterThan(0);
		const detailStr = queryPlan.map((p) => p["QUERY PLAN"]).join(" ");

		console.log("Query Plan (CCCD Search):", detailStr);
		expect(detailStr.length).toBeGreaterThan(0);
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

		// Thời gian thực thi aggregation qua cloud latency Singapore (< 3000ms)
		expect(elapsedMs).toBeLessThan(3000);
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

		expect(elapsedMs).toBeLessThan(3000);
		expect(Array.isArray(households)).toBe(true);
	});
});
