import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const VILLAGES = [
	{ name: "Thôn 1", code: "THON_1" },
	{ name: "Thôn 2", code: "THON_2" },
	{ name: "Thôn 3", code: "THON_3" },
	{ name: "Thôn 4", code: "THON_4" },
	{ name: "Thôn 5", code: "THON_5" },
	{ name: "Thôn Kon Đao Yôp", code: "THON_KON_DAO_YOP" },
	{ name: "Làng Kon Hnông Bách", code: "LANG_KON_HNONG_BACH" },
];

async function main() {
	console.log("Đang khởi tạo danh mục 7 Thôn...");
	for (const v of VILLAGES) {
		await prisma.villages.upsert({
			where: { name: v.name },
			update: { code: v.code },
			create: { name: v.name, code: v.code },
		});
	}

	console.log("Đang tạo DUY NHẤT tài khoản Quản trị viên (admin)...");
	const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || "admin123";
	const adminPasswordHash = await bcrypt.hash(adminPassword, 10);

	await prisma.users.upsert({
		where: { username: "admin" },
		update: {
			password_hash: adminPasswordHash,
			role: "admin",
			village_id: null,
			full_name: "Quản trị viên Xã Đăk Hà",
		},
		create: {
			username: "admin",
			password_hash: adminPasswordHash,
			role: "admin",
			village_id: null,
			full_name: "Quản trị viên Xã Đăk Hà",
		},
	});

	console.log("Đang khởi tạo cấu hình hệ thống...");
	const initialSettings = [
		{ key: "commune_name", value: "Xã Đăk Hà", description: "Tên đơn vị hành chính xã" },
		{ key: "app_name", value: "Hệ thống Quản lý Hộ khẩu - Nhân khẩu Xã Đăk Hà", description: "Tên hệ thống" },
		{ key: "system_version", value: "1.0.0", description: "Phiên bản hệ thống" },
	];

	for (const s of initialSettings) {
		await prisma.settings.upsert({
			where: { key: s.key },
			update: { value: s.value, description: s.description },
			create: { key: s.key, value: s.value, description: s.description },
		});
	}

	console.log("=== KHỞI TẠO HOÀN TẤT ===");
	console.log(`Tài khoản Admin: admin`);
	console.log(`Mật khẩu Admin : ${adminPassword}`);
	console.log("LƯU Ý: Không có tài khoản cán bộ phụ nào được tạo.");
}

main()
	.catch((e) => {
		console.error("Lỗi khi seed admin:", e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
