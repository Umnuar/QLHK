import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const VILLAGES = [
  { name: 'Thôn 1', code: 'THON_1' },
  { name: 'Thôn 2', code: 'THON_2' },
  { name: 'Thôn 3', code: 'THON_3' },
  { name: 'Thôn 4', code: 'THON_4' },
  { name: 'Thôn 5', code: 'THON_5' },
  { name: 'Thôn Kon Đao Yôp', code: 'THON_KON_DAO_YOP' },
  { name: 'Làng Kon Hnông Bách', code: 'LANG_KON_HNONG_BACH' },
];

export async function seedDatabase(client: PrismaClient = prisma) {
  console.log('Seeding villages...');
  const villageMap = new Map<string, string>();

  for (const v of VILLAGES) {
    const village = await client.villages.upsert({
      where: { name: v.name },
      update: { code: v.code },
      create: { name: v.name, code: v.code },
    });
    villageMap.set(v.name, village.id);
  }

  console.log('Seeding admin user...');
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  await client.users.upsert({
    where: { username: 'admin' },
    update: {
      password_hash: adminPasswordHash,
      role: 'admin',
      village_id: null,
      full_name: 'Quản trị viên Xã Đăk Hà',
    },
    create: {
      username: 'admin',
      password_hash: adminPasswordHash,
      role: 'admin',
      village_id: null,
      full_name: 'Quản trị viên Xã Đăk Hà',
    },
  });

  console.log('Seeding village users (Trưởng thôn)...');
  const villageUsers = [
    { username: 'thon1', pass: 'thon123', village: 'Thôn 1', name: 'Trưởng Thôn 1' },
    { username: 'thon2', pass: 'thon123', village: 'Thôn 2', name: 'Trưởng Thôn 2' },
    { username: 'thon3', pass: 'thon123', village: 'Thôn 3', name: 'Trưởng Thôn 3' },
    { username: 'thon4', pass: 'thon123', village: 'Thôn 4', name: 'Trưởng Thôn 4' },
    { username: 'thon5', pass: 'thon123', village: 'Thôn 5', name: 'Trưởng Thôn 5' },
    { username: 'thonkdy', pass: 'thon123', village: 'Thôn Kon Đao Yôp', name: 'Trưởng Thôn Kon Đao Yôp' },
    { username: 'langkhb', pass: 'thon123', village: 'Làng Kon Hnông Bách', name: 'Trưởng Làng Kon Hnông Bách' },
    { username: 'truongthon1', pass: 'thon123', village: 'Thôn 1', name: 'Trưởng Thôn 1' },
  ];

  for (const vu of villageUsers) {
    const villageId = villageMap.get(vu.village);
    if (!villageId) continue;
    const passHash = await bcrypt.hash(vu.pass, 10);
    await client.users.upsert({
      where: { username: vu.username },
      update: {
        password_hash: passHash,
        role: 'user',
        village_id: villageId,
        full_name: vu.name,
      },
      create: {
        username: vu.username,
        password_hash: passHash,
        role: 'user',
        village_id: villageId,
        full_name: vu.name,
      },
    });
  }

  console.log('Seeding settings...');
  const initialSettings = [
    { key: 'commune_name', value: 'Xã Đăk Hà', description: 'Tên đơn vị hành chính xã' },
    { key: 'app_name', value: 'Hệ thống Quản lý Hộ khẩu - Nhân khẩu Xã Đăk Hà', description: 'Tên hệ thống' },
    { key: 'system_version', value: '1.0.0', description: 'Phiên bản hệ thống' },
  ];

  for (const s of initialSettings) {
    await client.settings.upsert({
      where: { key: s.key },
      update: { value: s.value, description: s.description },
      create: { key: s.key, value: s.value, description: s.description },
    });
  }

  console.log('Seed completed successfully.');
}

if (require.main === module || process.env.RUN_SEED === 'true') {
  seedDatabase()
    .then(async () => {
      await prisma.$disconnect();
    })
    .catch(async (e) => {
      console.error(e);
      await prisma.$disconnect();
      process.exit(1);
    });
}
