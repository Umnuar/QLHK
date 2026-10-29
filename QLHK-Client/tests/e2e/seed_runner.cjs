const path = require("node:path");
const crypto = require("node:crypto");
const backendModules = path.resolve(__dirname, "../../..", "QLHK-Backend", "node_modules");
const { PrismaClient } = require(path.join(backendModules, "@prisma/client"));
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

function removeAccents(str) {
	if (!str) return "";
	return str
		.toLowerCase()
		.replace(/đ/g, "d")
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.trim();
}

async function run() {
	const villageDefs = [
		{ name: "Thôn 1", code: "THON_1" },
		{ name: "Thôn 2", code: "THON_2" },
		{ name: "Thôn 3", code: "THON_3" },
	];
	const villages = [];
	for (const vDef of villageDefs) {
		let v = await prisma.villages.findFirst({ where: { name: vDef.name } });
		if (!v) {
			v = await prisma.villages.create({
				data: {
					name: vDef.name,
					code: vDef.code,
				},
			});
		}
		villages.push(v);
	}
	const [thon1, thon2, thon3] = villages;

	const adminHash = bcrypt.hashSync("admin123", 10);
	let adminUser = await prisma.users.findFirst({ where: { username: "admin" } });
	if (adminUser) {
		adminUser = await prisma.users.update({
			where: { id: adminUser.id },
			data: {
				password_hash: adminHash,
				full_name: "Quản Trị Viên Hệ Thống",
				role: "admin",
				module_access: "all",
				village_id: null,
			},
		});
	} else {
		adminUser = await prisma.users.create({
			data: {
				username: "admin",
				password_hash: adminHash,
				full_name: "Quản Trị Viên Hệ Thống",
				role: "admin",
				module_access: "all",
				village_id: null,
			},
		});
	}

	const canboHash = bcrypt.hashSync("canbo123", 10);
	let canboUser = await prisma.users.findFirst({ where: { username: "canbo_thon1" } });
	if (canboUser) {
		canboUser = await prisma.users.update({
			where: { id: canboUser.id },
			data: {
				password_hash: canboHash,
				full_name: "Cán Bộ Thôn 1",
				role: "officer",
				module_access: "all",
				village_id: thon1.id,
			},
		});
	} else {
		canboUser = await prisma.users.create({
			data: {
				username: "canbo_thon1",
				password_hash: canboHash,
				full_name: "Cán Bộ Thôn 1",
				role: "officer",
				module_access: "all",
				village_id: thon1.id,
			},
		});
	}

	const householdsData = [
		{
			book_number: "HK-E2E-001",
			village_id: thon1.id,
			address: "Số 12 Đường Thôn 1, Xã Đăk Hà",
			status: "active",
			citizens: [
				{
					stt: 1,
					is_head: true,
					relationship: "Chủ hộ",
					full_name: "Nguyễn Văn An",
					dob: "15/06/1980",
					gender: "Nam",
					cccdRaw: "064080001001",
					ethnicity: "Kinh",
					religion: "Không",
					occupation: "Giáo viên",
					age75plus: "",
				},
				{
					stt: 2,
					is_head: false,
					relationship: "Vợ",
					full_name: "Trần Thị Bình",
					dob: "20/09/1982",
					gender: "Nữ",
					cccdRaw: "064182001002",
					ethnicity: "Kinh",
					religion: "Không",
					occupation: "Bác sĩ",
					age75plus: "",
				},
				{
					stt: 3,
					is_head: false,
					relationship: "Con",
					full_name: "Nguyễn Văn Cường",
					dob: "10/02/2008",
					gender: "Nam",
					cccdRaw: "064008001003",
					ethnicity: "Kinh",
					religion: "Không",
					occupation: "Học sinh",
					age75plus: "",
				},
				{
					stt: 4,
					is_head: false,
					relationship: "Con",
					full_name: "Nguyễn Thị Dung",
					dob: "05/11/2012",
					gender: "Nữ",
					cccdRaw: "064112001004",
					ethnicity: "Kinh",
					religion: "Không",
					occupation: "Học sinh",
					age75plus: "",
				},
				{
					stt: 5,
					is_head: false,
					relationship: "Mẹ",
					full_name: "Cụ Bảy Mươi",
					dob: "15/05/1956",
					gender: "Nữ",
					cccdRaw: "064056000070",
					ethnicity: "Kinh",
					religion: "Không",
					occupation: "Hưu trí",
					age75plus: "",
				},
			],
		},
		{
			book_number: "HK-E2E-002",
			village_id: thon1.id,
			address: "Số 34 Đường Thôn 1, Xã Đăk Hà",
			status: "active",
			citizens: [
				{
					stt: 1,
					is_head: true,
					relationship: "Chủ hộ",
					full_name: "Lê Văn Hùng",
					dob: "12/03/1978",
					gender: "Nam",
					cccdRaw: "064078002001",
					ethnicity: "Kinh",
					religion: "Không",
					occupation: "Kỹ sư",
					age75plus: "",
				},
				{
					stt: 2,
					is_head: false,
					relationship: "Vợ",
					full_name: "Phạm Thị Hương",
					dob: "18/07/1981",
					gender: "Nữ",
					cccdRaw: "064181002002",
					ethnicity: "Kinh",
					religion: "Không",
					occupation: "Kinh doanh",
					age75plus: "",
				},
				{
					stt: 3,
					is_head: false,
					relationship: "Con",
					full_name: "Lê Văn Hải",
					dob: "22/04/2006",
					gender: "Nam",
					cccdRaw: "064006002003",
					ethnicity: "Kinh",
					religion: "Không",
					occupation: "Sinh viên",
					age75plus: "",
				},
				{
					stt: 4,
					is_head: false,
					relationship: "Bố",
					full_name: "Cụ Bảy Lăm",
					dob: "10/08/1951",
					gender: "Nam",
					cccdRaw: "064051000075",
					ethnicity: "Kinh",
					religion: "Không",
					occupation: "Hưu trí",
					age75plus: "x",
				},
				{
					stt: 5,
					is_head: false,
					relationship: "Mẹ",
					full_name: "Cụ Tám Mươi",
					dob: "01/01/1946",
					gender: "Nữ",
					cccdRaw: "064046000080",
					ethnicity: "Kinh",
					religion: "Không",
					occupation: "Hưu trí",
					age75plus: "x",
				},
			],
		},
		{
			book_number: "HK-E2E-003",
			village_id: thon2.id,
			address: "Số 56 Đường Thôn 2, Xã Đăk Hà",
			status: "active",
			citizens: [
				{
					stt: 1,
					is_head: true,
					relationship: "Chủ hộ",
					full_name: "Trần Đình Trọng",
					dob: "08/11/1975",
					gender: "Nam",
					cccdRaw: "064075003001",
					ethnicity: "Kinh",
					religion: "Không",
					occupation: "Làm nông",
					age75plus: "",
				},
				{
					stt: 2,
					is_head: false,
					relationship: "Vợ",
					full_name: "Hoàng Thị Mai",
					dob: "14/01/1979",
					gender: "Nữ",
					cccdRaw: "064179003002",
					ethnicity: "Kinh",
					religion: "Không",
					occupation: "Làm nông",
					age75plus: "",
				},
				{
					stt: 3,
					is_head: false,
					relationship: "Con",
					full_name: "Trần Mai Lan",
					dob: "19/08/2005",
					gender: "Nữ",
					cccdRaw: "064105003003",
					ethnicity: "Kinh",
					religion: "Không",
					occupation: "Sinh viên",
					age75plus: "",
				},
				{
					stt: 4,
					is_head: false,
					relationship: "Mẹ",
					full_name: "Cụ Tám Lăm",
					dob: "20/09/1941",
					gender: "Nữ",
					cccdRaw: "064041000085",
					ethnicity: "Kinh",
					religion: "Không",
					occupation: "Người cao tuổi",
					age75plus: "x",
				},
			],
		},
		{
			book_number: "HK-E2E-004",
			village_id: thon2.id,
			address: "Số 78 Đường Thôn 2, Xã Đăk Hà",
			status: "active",
			citizens: [
				{
					stt: 1,
					is_head: true,
					relationship: "Chủ hộ",
					full_name: "Phạm Quốc Huy",
					dob: "03/05/1972",
					gender: "Nam",
					cccdRaw: "064072004001",
					ethnicity: "Kinh",
					religion: "Không",
					occupation: "Cán bộ",
					age75plus: "",
				},
				{
					stt: 2,
					is_head: false,
					relationship: "Vợ",
					full_name: "Đỗ Thị Thu",
					dob: "28/10/1976",
					gender: "Nữ",
					cccdRaw: "064176004002",
					ethnicity: "Kinh",
					religion: "Không",
					occupation: "Kế toán",
					age75plus: "",
				},
				{
					stt: 3,
					is_head: false,
					relationship: "Con",
					full_name: "Phạm Quốc Việt",
					dob: "16/12/2002",
					gender: "Nam",
					cccdRaw: "064002004003",
					ethnicity: "Kinh",
					religion: "Không",
					occupation: "Lập trình viên",
					age75plus: "",
				},
				{
					stt: 4,
					is_head: false,
					relationship: "Bố",
					full_name: "Cụ Chín Mươi",
					dob: "05/03/1936",
					gender: "Nam",
					cccdRaw: "064036000090",
					ethnicity: "Kinh",
					religion: "Không",
					occupation: "Người cao tuổi",
					age75plus: "x",
				},
				{
					stt: 5,
					is_head: false,
					relationship: "Mẹ",
					full_name: "Cụ Chín Lăm",
					dob: "12/04/1931",
					gender: "Nữ",
					cccdRaw: "064031000095",
					ethnicity: "Kinh",
					religion: "Không",
					occupation: "Người cao tuổi",
					age75plus: "x",
				},
			],
		},
		{
			book_number: "HK-E2E-005",
			village_id: thon3.id,
			address: "Số 90 Đường Thôn 3, Xã Đăk Hà",
			status: "active",
			citizens: [
				{
					stt: 1,
					is_head: true,
					relationship: "Chủ hộ",
					full_name: "Vũ Văn Thành",
					dob: "25/08/1968",
					gender: "Nam",
					cccdRaw: "064068005001",
					ethnicity: "Kinh",
					religion: "Không",
					occupation: "Kinh doanh",
					age75plus: "",
				},
				{
					stt: 2,
					is_head: false,
					relationship: "Vợ",
					full_name: "Bùi Thị Loan",
					dob: "30/12/1970",
					gender: "Nữ",
					cccdRaw: "064170005002",
					ethnicity: "Kinh",
					religion: "Không",
					occupation: "Kinh doanh",
					age75plus: "",
				},
				{
					stt: 3,
					is_head: false,
					relationship: "Con",
					full_name: "Vũ Minh Khang",
					dob: "14/09/1998",
					gender: "Nam",
					cccdRaw: "064098005003",
					ethnicity: "Kinh",
					religion: "Không",
					occupation: "Kỹ sư",
					age75plus: "",
				},
				{
					stt: 4,
					is_head: false,
					relationship: "Bà",
					full_name: "Cụ Một Trăm",
					dob: "01/01/1926",
					gender: "Nữ",
					cccdRaw: "064026000100",
					ethnicity: "Kinh",
					religion: "Không",
					occupation: "Đại thọ",
					age75plus: "x",
				},
				{
					stt: 5,
					is_head: false,
					relationship: "Cụ",
					full_name: "Cụ Đại Thọ",
					dob: "01/01/1924",
					gender: "Nam",
					cccdRaw: "064024000102",
					ethnicity: "Kinh",
					religion: "Không",
					occupation: "Đại thọ",
					age75plus: "x",
				},
			],
		},
	];

	for (const hd of householdsData) {
		let h = await prisma.households.findFirst({ where: { book_number: hd.book_number } });
		if (!h) {
			h = await prisma.households.create({
				data: {
					village_id: hd.village_id,
					book_number: hd.book_number,
					address: hd.address,
					status: hd.status,
					is_deleted: false,
					deleted_at: null,
				},
			});
		} else {
			h = await prisma.households.update({
				where: { id: h.id },
				data: {
					village_id: hd.village_id,
					address: hd.address,
					status: hd.status,
					is_deleted: false,
					deleted_at: null,
				},
			});
		}

		await prisma.citizens.deleteMany({ where: { household_id: h.id } });
		for (const c of hd.citizens) {
			const enc = encryptCCCD(c.cccdRaw);
			await prisma.citizens.create({
				data: {
					household_id: h.id,
					stt: c.stt,
					is_head: c.is_head,
					relationship: c.relationship,
					full_name: c.full_name,
					name_unaccented: removeAccents(c.full_name),
					dob: c.dob,
					gender: c.gender,
					cccd: enc.encrypted,
					cccd_hash: enc.hash,
					cccd_last4: enc.last4,
					ethnicity: c.ethnicity,
					religion: c.religion,
					occupation: c.occupation,
					age75plus: c.age75plus,
					is_deleted: false,
					deleted_at: null,
				},
			});
		}
	}

	const chucthoMilestones = [
		{ name: "Cụ Bảy Mươi", dob: "15/05/1956", ageField: "age70", cccdNum: "064056000070", gender: "Nữ", village_id: thon1.id },
		{ name: "Cụ Bảy Lăm", dob: "10/08/1951", ageField: "age75", cccdNum: "064051000075", gender: "Nam", village_id: thon1.id },
		{ name: "Cụ Tám Mươi", dob: "01/01/1946", ageField: "age80", cccdNum: "064046000080", gender: "Nữ", village_id: thon1.id },
		{ name: "Cụ Tám Lăm", dob: "20/09/1941", ageField: "age85", cccdNum: "064041000085", gender: "Nữ", village_id: thon2.id },
		{ name: "Cụ Chín Mươi", dob: "05/03/1936", ageField: "age90", cccdNum: "064036000090", gender: "Nam", village_id: thon2.id },
		{ name: "Cụ Chín Lăm", dob: "12/04/1931", ageField: "age95", cccdNum: "064031000095", gender: "Nữ", village_id: thon2.id },
		{ name: "Cụ Một Trăm", dob: "01/01/1926", ageField: "age100", cccdNum: "064026000100", gender: "Nữ", village_id: thon3.id },
		{ name: "Cụ Đại Thọ", dob: "01/01/1924", ageField: "age_over_100", cccdNum: "064024000102", gender: "Nam", village_id: thon3.id },
	];

	for (let i = 0; i < chucthoMilestones.length; i++) {
		const item = chucthoMilestones[i];
		const enc = encryptCCCD(item.cccdNum);
		const existing = await prisma.chuctho_profiles.findFirst({ where: { name: item.name } });
		const profileData = {
			stt: i + 1,
			name: item.name,
			name_unaccented: removeAccents(item.name),
			dob: item.dob,
			gender: item.gender,
			cccd: enc.encrypted,
			cccd_hash: enc.hash,
			cccd_last4: enc.last4,
			ethnicity: "Kinh",
			residence: "Thường trú",
			current_address: "Xã Đăk Hà",
			village_id: item.village_id,
			calculation_year: 2026,
			received: false,
			is_deleted: false,
			deleted_at: null,
			age60: "",
			age65: "",
			age70: item.ageField === "age70" ? "x" : "",
			age75: item.ageField === "age75" ? "x" : "",
			age80: item.ageField === "age80" ? "x" : "",
			age85: item.ageField === "age85" ? "x" : "",
			age90: item.ageField === "age90" ? "x" : "",
			age95: item.ageField === "age95" ? "x" : "",
			age100: item.ageField === "age100" ? "x" : "",
			age_over_100: item.ageField === "age_over_100" ? "x" : "",
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

	const trashHouseholdsData = [
		{
			book_number: "HK-TRASH-001",
			village_id: thon1.id,
			address: "Số 45 Đường Trần Phú, Thôn 1, Xã Đăk Hà",
			status: "Chuyển đi",
			citizens: [
				{
					stt: 1,
					is_head: true,
					relationship: "Chủ hộ",
					full_name: "Hoàng Văn Thắng",
					dob: "12/05/1985",
					gender: "Nam",
					cccdRaw: "060085009999",
					ethnicity: "Kinh",
					religion: "Không",
					occupation: "Tự do",
				},
				{
					stt: 2,
					is_head: false,
					relationship: "Vợ",
					full_name: "Vũ Thị Hạnh",
					dob: "15/07/1987",
					gender: "Nữ",
					cccdRaw: "060187008888",
					ethnicity: "Kinh",
					religion: "Không",
					occupation: "Kế toán",
				},
			],
		},
		{
			book_number: "HK-TRASH-002",
			village_id: thon2.id,
			address: "Khu Đất Mới, Thôn 2, Xã Đăk Hà",
			status: "Đã tách khẩu",
			citizens: [
				{
					stt: 1,
					is_head: true,
					relationship: "Chủ hộ",
					full_name: "A Nhôm",
					dob: "10/10/1965",
					gender: "Nam",
					cccdRaw: "060065008877",
					ethnicity: "Xơ Đăng",
					religion: "Công giáo",
					occupation: "Làm nông",
				},
			],
		},
	];

	for (const th of trashHouseholdsData) {
		let h = await prisma.households.findFirst({ where: { book_number: th.book_number } });
		if (!h) {
			h = await prisma.households.create({
				data: {
					village_id: th.village_id,
					book_number: th.book_number,
					address: th.address,
					status: th.status,
					is_deleted: true,
					deleted_at: new Date(),
				},
			});
		} else {
			h = await prisma.households.update({
				where: { id: h.id },
				data: {
					village_id: th.village_id,
					address: th.address,
					status: th.status,
					is_deleted: true,
					deleted_at: h.deleted_at || new Date(),
				},
			});
		}

		await prisma.citizens.deleteMany({ where: { household_id: h.id } });
		for (const tc of th.citizens) {
			const enc = encryptCCCD(tc.cccdRaw);
			await prisma.citizens.create({
				data: {
					household_id: h.id,
					stt: tc.stt,
					is_head: tc.is_head,
					relationship: tc.relationship,
					full_name: tc.full_name,
					name_unaccented: removeAccents(tc.full_name),
					dob: tc.dob,
					gender: tc.gender,
					cccd: enc.encrypted,
					cccd_hash: enc.hash,
					cccd_last4: enc.last4,
					ethnicity: tc.ethnicity,
					religion: tc.religion,
					occupation: tc.occupation,
					is_deleted: true,
					deleted_at: new Date(),
				},
			});
		}
	}

	const auditSeedIds = [
		"AUDIT-SEED-001",
		"AUDIT-SEED-002",
		"AUDIT-SEED-003",
		"AUDIT-SEED-004",
		"AUDIT-SEED-005",
	];

	await prisma.audit_logs.deleteMany({
		where: { entity_id: { in: auditSeedIds } },
	});

	const sampleAuditLogs = [
		{
			entity_id: "AUDIT-SEED-001",
			action: "CREATE",
			entity_type: "household",
			village_id: thon1.id,
			user_id: adminUser.id,
			new_values: JSON.stringify({
				book_number: "HK-E2E-001",
				head_name: "Nguyễn Văn An",
				address: "Số 12 Đường Thôn 1, Xã Đăk Hà",
				status: "Thường trú",
			}),
			old_values: null,
			ip_address: "127.0.0.1",
			created_at: new Date(Date.now() - 18000000),
		},
		{
			entity_id: "AUDIT-SEED-002",
			action: "UPDATE",
			entity_type: "citizen",
			village_id: thon1.id,
			user_id: canboUser.id,
			new_values: JSON.stringify({
				full_name: "Nguyễn Văn Cường",
				occupation: "Sinh viên",
			}),
			old_values: JSON.stringify({
				full_name: "Nguyễn Văn Cường",
				occupation: "Học sinh",
			}),
			ip_address: "127.0.0.1",
			created_at: new Date(Date.now() - 14400000),
		},
		{
			entity_id: "AUDIT-SEED-003",
			action: "DELETE",
			entity_type: "household",
			village_id: thon2.id,
			user_id: adminUser.id,
			new_values: null,
			old_values: JSON.stringify({
				book_number: "HK-TRASH-002",
				address: "Khu Đất Mới, Thôn 2, Xã Đăk Hà",
				reason: "Tách sang sổ hộ khẩu mới",
			}),
			ip_address: "127.0.0.1",
			created_at: new Date(Date.now() - 10800000),
		},
		{
			entity_id: "AUDIT-SEED-004",
			action: "RESTORE",
			entity_type: "household",
			village_id: thon1.id,
			user_id: canboUser.id,
			new_values: JSON.stringify({
				is_deleted: false,
				book_number: "HK-E2E-002",
			}),
			old_values: JSON.stringify({
				is_deleted: true,
				book_number: "HK-E2E-002",
			}),
			ip_address: "127.0.0.1",
			created_at: new Date(Date.now() - 7200000),
		},
		{
			entity_id: "AUDIT-SEED-005",
			action: "IMPORT",
			entity_type: "excel_import",
			village_id: thon3.id,
			user_id: adminUser.id,
			new_values: JSON.stringify({
				file_name: "DanhSachHoKhau_Thon3.xlsx",
				total_rows: 45,
				success_count: 45,
			}),
			old_values: null,
			ip_address: "127.0.0.1",
			created_at: new Date(Date.now() - 3600000),
		},
	];

	for (const logItem of sampleAuditLogs) {
		await prisma.audit_logs.create({
			data: logItem,
		});
	}

	await prisma.citizens.deleteMany({
		where: {
			OR: [
				{ full_name: { contains: "[TEST-CRAWLER]" } },
				{ full_name: { contains: "Test Crawler" } },
			],
		},
	});
	await prisma.households.deleteMany({
		where: {
			OR: [
				{ address: { contains: "[TEST]" } },
				{ address: { contains: "[TEST-CRAWLER]" } },
				{ address: { contains: "TestCrawler" } },
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
