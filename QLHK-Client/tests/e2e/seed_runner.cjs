const path = require("node:path");
const backendModules = path.resolve(__dirname, "../../..", "QLHK-Backend", "node_modules");
const { PrismaClient } = require(path.join(backendModules, "@prisma/client"));
const crypto = require("node:crypto");
const bcrypt = require(path.join(backendModules, "bcryptjs"));

const prisma = new PrismaClient();

const ENCRYPTION_KEY_HEX = "9e0ec6d63e2a75256378ea59833c454c63681150dd0a02bc6a608c195a66ff57";
const PEPPER = "qlhk-dakha-cccd-pepper-secret-2026-v2-production-key";

function encryptCCCD(plain) {
	const key = Buffer.from(ENCRYPTION_KEY_HEX, "hex");
	const iv = crypto.randomBytes(12);
	const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
	let enc = cipher.update(plain, "utf8", "hex");
	enc += cipher.final("hex");
	const tag = cipher.getAuthTag().toString("hex");
	const encrypted = `${iv.toString("hex")}:${tag}:${enc}`;
	const hash = crypto.createHmac("sha256", PEPPER).update(plain).digest("hex");
	const last4 = plain.slice(-4);
	return { encrypted, hash, last4 };
}

async function run() {
	const existingAdmin = await prisma.users.findFirst({ where: { username: "admin" } });
	const adminHash = bcrypt.hashSync("admin123", 10);
	if (!existingAdmin) {
		await prisma.users.create({
			data: {
				username: "admin",
				password_hash: adminHash,
				full_name: "Quản Trị Viên Hệ Thống",
				role: "admin",
				module_access: "all",
			},
		});
	}

	const villageNames = ["Thôn 1", "Thôn 2", "Thôn 3"];
	const villages = [];
	for (const vName of villageNames) {
		let v = await prisma.villages.findFirst({ where: { name: vName } });
		if (!v) {
			v = await prisma.villages.create({
				data: {
					name: vName,
					code: vName.replace(/\s+/g, "").toUpperCase(),
				},
			});
		}
		villages.push(v);
	}

	const thon1 = villages[0];

	const milestones = [
		{ name: "Cụ Bảy Mươi", dob: "15/05/1956", ageField: "age70", cccdNum: "064056000070" },
		{ name: "Cụ Bảy Lăm", dob: "10/08/1951", ageField: "age75", cccdNum: "064051000075" },
		{ name: "Cụ Tám Mươi", dob: "01/01/1946", ageField: "age80", cccdNum: "064046000080" },
		{ name: "Cụ Tám Lăm", dob: "20/09/1941", ageField: "age85", cccdNum: "064041000085" },
		{ name: "Cụ Chín Mươi", dob: "05/03/1936", ageField: "age90", cccdNum: "064036000090" },
	];

	for (let i = 0; i < milestones.length; i++) {
		const item = milestones[i];
		const enc = encryptCCCD(item.cccdNum);
		const existing = await prisma.chuctho_profiles.findFirst({ where: { name: item.name } });
		const profileData = {
			stt: i + 1,
			name: item.name,
			name_unaccented: item.name
				.toLowerCase()
				.normalize("NFD")
				.replace(/[\u0300-\u036f]/g, "")
				.replace(/đ/g, "d")
				.trim(),
			dob: item.dob,
			gender: i % 2 === 0 ? "Nam" : "Nữ",
			cccd: enc.encrypted,
			cccd_hash: enc.hash,
			cccd_last4: enc.last4,
			ethnicity: "Kinh",
			residence: "Thường trú",
			current_address: `${thon1.name}, Xã Đăk Hà`,
			village_id: thon1.id,
			calculation_year: 2026,
			received: false,
			is_deleted: false,
			age60: "",
			age65: "",
			age70: item.ageField === "age70" ? "x" : "",
			age75: item.ageField === "age75" ? "x" : "",
			age80: item.ageField === "age80" ? "x" : "",
			age85: item.ageField === "age85" ? "x" : "",
			age90: item.ageField === "age90" ? "x" : "",
			age95: "",
			age100: "",
			age_over_100: "",
		};

		if (existing) {
			await prisma.chuctho_profiles.update({
				where: { id: existing.id },
				data: profileData,
			});
		} else {
			await prisma.chuctho_profiles.create({
				data: profileData,
			});
		}
	}

	const existingDeletedHousehold = await prisma.households.findFirst({
		where: { is_deleted: true },
		include: { citizens: true },
	});

	if (!existingDeletedHousehold) {
		const encDeleted = encryptCCCD("064085009999");
		const newDeleted = await prisma.households.create({
			data: {
				village_id: thon1.id,
				book_number: "HK-TRASH-SAMPLE",
				address: "Thôn 1, Xã Đăk Hà",
				status: "Thường trú",
				is_deleted: true,
				deleted_at: new Date(),
			},
		});

		await prisma.citizens.create({
			data: {
				household_id: newDeleted.id,
				stt: 1,
				is_head: true,
				relationship: "Chủ hộ",
				full_name: "Nguyễn Văn Đã Xóa",
				name_unaccented: "nguyen van da xoa",
				dob: "01/01/1985",
				gender: "Nam",
				cccd: encDeleted.encrypted,
				cccd_hash: encDeleted.hash,
				cccd_last4: encDeleted.last4,
				is_deleted: true,
				deleted_at: new Date(),
			},
		});
	}

	await prisma.citizens.deleteMany({
		where: { full_name: { contains: "[TEST-CRAWLER]" } },
	});
	await prisma.households.deleteMany({
		where: {
			OR: [
				{ address: { contains: "[TEST]" } },
				{ address: { contains: "[TEST-CRAWLER]" } },
			],
		},
	});
}

run()
	.then(() => {
		console.log("[E2E Seed] CSDL đã được kiểm tra và chuẩn bị sẵn sàng!");
		process.exit(0);
	})
	.catch((err) => {
		console.error("[E2E Seed Error]", err);
		process.exit(1);
	});
