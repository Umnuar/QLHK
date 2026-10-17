import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app";
import { prisma } from "../../src/config/prisma";
import { generateAccessToken } from "../../src/utils/jwt";

describe("Integration: Excel Import Demographics & CCCD Sanitization", () => {
	it("preserves education, military_status, occupation, native_place on import (BUG-001)", async () => {
		let village = await prisma.villages.findFirst();
		if (!village) {
			village = await prisma.villages.create({
				data: { name: "Thôn Test 1", code: "T1" },
			});
		}

		const token = generateAccessToken({
			id: "00000000-0000-0000-0000-000000000001",
			username: "admin",
			role: "admin",
			village_id: null,
		});

		const bookNumber = `HK-DEMO-${Date.now()}`;

		const res = await request(app)
			.post("/api/excel/import")
			.set("Authorization", `Bearer ${token}`)
			.send({
				village_id: village.id,
				households: [
					{
						book_number: bookNumber,
						address: "Thôn 1",
						status: "Thường trú",
						members: [
							{
								stt: 1,
								is_head: true,
								relationship: "Chủ hộ",
								full_name: "Trần Văn Demo",
								dob: "01/01/1990",
								gender: "Nam",
								cccd: "060090001234",
								ethnicity: "Kinh",
								religion: "Không",
								education: "12/12",
								military_status: "Đã hoàn thành NVQS",
								occupation: "Nông nghiệp",
								native_place: "Đăk Hà, Kon Tum",
								notes: "Test ghi chú",
							},
						],
					},
				],
			});

		expect(res.status).toBe(200);

		const savedHh = await prisma.households.findFirst({
			where: { book_number: bookNumber },
			include: { citizens: true },
		});

		expect(savedHh).toBeDefined();
		expect(savedHh?.citizens.length).toBe(1);

		const citizen = savedHh!.citizens[0];
		expect(citizen.education).toBe("12/12");
		expect(citizen.military_status).toBe("Đã hoàn thành NVQS");
		expect(citizen.occupation).toBe("Nông nghiệp");
		expect(citizen.native_place).toBe("Đăk Hà, Kon Tum");
	});

	it("treats placeholder CCCD as null instead of encrypting placeholder text (BUG-002)", async () => {
		let village = await prisma.villages.findFirst();
		if (!village) {
			village = await prisma.villages.create({
				data: { name: "Thôn Test 2", code: "T2" },
			});
		}

		const token = generateAccessToken({
			id: "00000000-0000-0000-0000-000000000001",
			username: "admin",
			role: "admin",
			village_id: null,
		});

		const bookNumber = `HK-CCCD-${Date.now()}`;

		const res = await request(app)
			.post("/api/excel/import")
			.set("Authorization", `Bearer ${token}`)
			.send({
				village_id: village.id,
				households: [
					{
						book_number: bookNumber,
						address: "Thôn 2",
						status: "Thường trú",
						members: [
							{
								stt: 1,
								is_head: true,
								relationship: "Chủ hộ",
								full_name: "Nguyễn Văn Placeholder",
								dob: "01/01/1995",
								gender: "Nam",
								cccd: "Chưa có",
								ethnicity: "Kinh",
								religion: "Không",
							},
						],
					},
				],
			});

		expect(res.status).toBe(200);

		const savedHh = await prisma.households.findFirst({
			where: { book_number: bookNumber },
			include: { citizens: true },
		});

		expect(savedHh).toBeDefined();
		expect(savedHh?.citizens.length).toBe(1);

		const citizen = savedHh!.citizens[0];
		expect(citizen.cccd).toBeNull();
		expect(citizen.cccd_last4).toBeNull();
		expect(citizen.cccd_hash).toBeNull();
	});
});
