import { describe, it, expect } from 'vitest';
import { encryptCCCD, decryptCCCD, hashCCCD, removeAccents } from '../src/utils/crypto';

describe('Bảo mật dữ liệu CCCD & Mã hóa (Crypto Utility)', () => {
  const sampleCCCD = '064098001234';

  it('phải mã hóa đối xứng AES-256-GCM với định dạng iv:authTag:encryptedHex', () => {
    const result = encryptCCCD(sampleCCCD);

    expect(result.encrypted).toBeDefined();
    const parts = result.encrypted.split(':');
    expect(parts.length).toBe(3); // [ivHex, authTagHex, encryptedHex]

    // IV 12 bytes = 24 hex characters
    expect(parts[0].length).toBe(24);
    // AuthTag 16 bytes = 32 hex characters
    expect(parts[1].length).toBe(32);
    // Encrypted text hex
    expect(parts[2].length).toBeGreaterThan(0);
  });

  it('phải giải mã chính xác chuỗi đã mã hóa về số CCCD gốc', () => {
    const enc = encryptCCCD(sampleCCCD);
    const decrypted = decryptCCCD(enc.encrypted);
    expect(decrypted).toBe(sampleCCCD);
  });

  it('phải sinh hash SHA-256 cố định phục vụ tra cứu chính xác', () => {
    const hash1 = hashCCCD(sampleCCCD);
    const hash2 = hashCCCD(sampleCCCD);
    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64); // SHA-256 hex string length
  });

  it('phải băm HMAC-SHA256 với pepper hệ thống, khác với SHA-256 thô', async () => {
    const nodeCrypto = await import('crypto');
    const rawSha256 = nodeCrypto.createHash('sha256').update(sampleCCCD).digest('hex');
    const pepperedHash = hashCCCD(sampleCCCD);
    expect(pepperedHash).not.toBe(rawSha256);
    expect(pepperedHash.length).toBe(64);
  });

  it('phải cắt đúng 4 số cuối cccd_last4 để hiển thị nhanh', () => {
    const enc = encryptCCCD(sampleCCCD);
    expect(enc.last4).toBe('1234');
  });

  it('phải xóa dấu tiếng Việt chuẩn xác phục vụ tìm kiếm không dấu', () => {
    expect(removeAccents('Nguyễn Văn A')).toBe('nguyen van a');
    expect(removeAccents('ĐINH THANH HIỂU')).toBe('dinh thanh hieu');
    expect(removeAccents('Làng Kon Hnông Bách')).toBe('lang kon hnong bach');
    expect(removeAccents('Thôn Kon Đao Yôp')).toBe('thon kon dao yop');
  });

  describe('An ninh biến môi trường (Environment Security Hardening - CWE-798)', () => {
    it('phải ném ngoại lệ Fail-fast ở production nếu thiếu biến môi trường hoặc dùng fallback mặc định', async () => {
      const { validateEnvironmentSecurity } = await import('../src/config/env');

      // Test 1: Production thiếu biến
      expect(() => {
        validateEnvironmentSecurity({
          NODE_ENV: 'production',
        });
      }).toThrow(/\[Security Hardening Failure\]/);

      // Test 2: Production dùng khóa fallback không an toàn
      expect(() => {
        validateEnvironmentSecurity({
          NODE_ENV: 'production',
          JWT_SECRET: 'qlhk-dakha-jwt-access-secret-32-chars-min',
          JWT_REFRESH_SECRET: 'qlhk-dakha-jwt-refresh-secret-32-chars-min',
          ENCRYPTION_KEY: '9e0ec6d63e2a75256378ea59833c454c63681150dd0a02bc6a608c195a66ff57',
          CCCD_HASH_PEPPER: 'qlhk-dakha-cccd-pepper-secret-2026-v2-production-key',
        });
      }).toThrow(/cannot use default dev values/);

      // Test 3: Production với khóa mạnh hợp lệ độc lập phải vượt qua an toàn
      expect(() => {
        validateEnvironmentSecurity({
          NODE_ENV: 'production',
          JWT_SECRET: 'super-secure-production-jwt-access-key-random-2026-strong',
          JWT_REFRESH_SECRET: 'super-secure-production-jwt-refresh-key-random-2026-strong',
          ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
          CCCD_HASH_PEPPER: 'super-secure-production-cccd-pepper-random-2026-strong-key',
        });
      }).not.toThrow();

      // Test 4: Development / Test không ném ngoại lệ
      expect(() => {
        validateEnvironmentSecurity({
          NODE_ENV: 'development',
        });
      }).not.toThrow();
    });
  });
});

