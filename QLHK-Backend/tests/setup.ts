/**
 * Test Environment Setup for QLHK-Backend
 * Khởi tạo biến môi trường test chuẩn trước khi chạy bất kỳ test suite nào.
 */
process.env.NODE_ENV = 'test';
process.env.PORT = '5002';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'qlhk-dakha-jwt-access-secret-32-chars-min';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'qlhk-dakha-jwt-refresh-secret-32-chars-min';
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '9e0ec6d63e2a75256378ea59833c454c63681150dd0a02bc6a608c195a66ff57';
process.env.CCCD_HASH_PEPPER = process.env.CCCD_HASH_PEPPER || 'qlhk-dakha-cccd-pepper-secret-2026-v2-production-key';
