import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app";
import { prisma } from "../../src/config/prisma";
import { generateAccessToken } from "../../src/utils/jwt";
import { encryptCCCD, removeAccents } from "../../src/utils/crypto";

describe("Integration: Citizen Search by Full CCCD", () => {
	it("finds citizen when searching by full 12-digit CCCD in ?search parameter (BUG-003)", async () => {
		let village = await prisma.villages.findFirst();
		if (!village) {
			village = await prisma.villages.create({
				data: { name: "Thôn Test 3", code: "T3" },
			});
		}

		const cccd12 = "060099887766";
		const enc = encryptCCCD(cccd12);

		await prisma.households.create({
			data: {
				village_id: village.id,
				book_number: `HK-SEARCH-${Date.now()}`,
				status: "active",
				is_deleted: false,
				citizens: {
					create: {
						full_name: "Phạm Thị CCCD Search",
						name_unaccented: removeAccents("Phạm Thị CCCD Search"),
						cccd: enc.encrypted,
						cccd_hash: enc.hash,
						cccd_last4: enc.last4,
						is_deleted: false,
					},
				},
			},
		});

		const token = generateAccessToken({
			id: "00000000-0000-0000-0000-000000000001",
			username: "admin",
			role: "admin",
			village_id: null,
		});

		const res = await request(app)
			.get(`/api/citizens?search=${cccd12}`)
			.set("Authorization", `Bearer ${token}`);

		expect(res.status).toBe(200);
		expect(res.body.data.length).toBeGreaterThanOrEqual(1);
		expect(
			res.body.data.some(
				(c: any) => c.full_name === "Phạm Thị CCCD Search",
			),
		).toBe(true);
	});

	it("finds citizen when searching by full 9-digit CMND in ?search parameter", async () => {
		let village = await prisma.villages.findFirst();
		if (!village) {
			village = await prisma.villages.create({
				data: { name: "Thôn Test 3B", code: "T3B" },
			});
		}

		const cccd9 = "241234567";
		const enc = encryptCCCD(cccd9);

		await prisma.households.create({
			data: {
				village_id: village.id,
				book_number: `HK-SEARCH9-${Date.now()}`,
				status: "active",
				is_deleted: false,
				citizens: {
					create: {
						full_name: "Lê Văn CMND Search",
						name_unaccented: removeAccents("Lê Văn CMND Search"),
						cccd: enc.encrypted,
						cccd_hash: enc.hash,
						cccd_last4: enc.last4,
						is_deleted: false,
					},
				},
			},
		});

		const token = generateAccessToken({
			id: "00000000-0000-0000-0000-000000000001",
			username: "admin",
			role: "admin",
			village_id: null,
		});

		const res = await request(app)
			.get(`/api/citizens?search=${cccd9}`)
			.set("Authorization", `Bearer ${token}`);

		expect(res.status).toBe(200);
		expect(res.body.data.length).toBeGreaterThanOrEqual(1);
		expect(
			res.body.data.some((c: any) => c.full_name === "Lê Văn CMND Search"),
		).toBe(true);
	});
});
