import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import fs from "fs";

function resolveExcelSamplePath(): string {
	if (process.env.EXCEL_SAMPLE_PATH && fs.existsSync(process.env.EXCEL_SAMPLE_PATH)) {
		return process.env.EXCEL_SAMPLE_PATH;
	}
	const candidates = [
		path.resolve(process.cwd(), "../Nhân hộ khẩu.xls"),
		path.resolve(process.cwd(), "../../Nhân hộ khẩu.xls"),
		"C:\\Projects\\Nhân hộ khẩu.xls",
		"C:\\Users\\umnuar\\Documents\\Projects\\Nhân hộ khẩu.xls",
		"C:\\Users\\umnuar\\Downloads\\Nhân hộ khẩu.xls",
	];
	for (const candidate of candidates) {
		if (fs.existsSync(candidate)) {
			return candidate;
		}
	}
	return candidates[0];
}

export const config = {
	port: parseInt(process.env.PORT || "5002", 10),
	nodeEnv: process.env.NODE_ENV || "development",
	jwtSecret:
		process.env.JWT_SECRET || "qlhk-dakha-jwt-access-secret-32-chars-min",
	jwtRefreshSecret:
		process.env.JWT_REFRESH_SECRET ||
		"qlhk-dakha-jwt-refresh-secret-32-chars-min",
	encryptionKey:
		process.env.ENCRYPTION_KEY ||
		"9e0ec6d63e2a75256378ea59833c454c63681150dd0a02bc6a608c195a66ff57",
	cccdHashPepper:
		process.env.CCCD_HASH_PEPPER ||
		"qlhk-dakha-cccd-pepper-secret-2026-v2-production-key",
	excelSamplePath: resolveExcelSamplePath(),
	corsOrigin:
		process.env.CORS_ORIGIN ||
		"http://localhost:5175,https://qlhk.dulieudakha.vn,https://dulieudakha.vn",
};

export const INSECURE_DEFAULT_SECRETS = new Set([
	"qlhk-dakha-jwt-access-secret-32-chars-min",
	"qlhk-dakha-jwt-refresh-secret-32-chars-min",
	"9e0ec6d63e2a75256378ea59833c454c63681150dd0a02bc6a608c195a66ff57",
	"qlhk-dakha-cccd-pepper-secret-2026-v2-production-key",
	"dev-secret-key",
	"dev-refresh-secret",
]);

/**
 * Thẩm định tính an toàn của cấu hình biến môi trường theo chuẩn ASVS V14 & CWE-798.
 * Trong môi trường production: Bắt buộc fail-fast nếu thiếu hoặc dùng secret mặc định.
 */
export function validateEnvironmentSecurity(env: NodeJS.ProcessEnv = process.env): void {
	const nodeEnv = env.NODE_ENV || "development";
	if (nodeEnv === "production") {
		const errors: string[] = [];

		if (!env.JWT_SECRET || INSECURE_DEFAULT_SECRETS.has(env.JWT_SECRET) || env.JWT_SECRET.length < 32) {
			errors.push("JWT_SECRET must be explicitly configured with at least 32 characters and cannot use default dev values.");
		}
		if (!env.JWT_REFRESH_SECRET || INSECURE_DEFAULT_SECRETS.has(env.JWT_REFRESH_SECRET) || env.JWT_REFRESH_SECRET.length < 32) {
			errors.push("JWT_REFRESH_SECRET must be explicitly configured with at least 32 characters and cannot use default dev values.");
		}
		if (!env.ENCRYPTION_KEY || INSECURE_DEFAULT_SECRETS.has(env.ENCRYPTION_KEY) || !/^[0-9a-fA-F]{64}$/.test(env.ENCRYPTION_KEY)) {
			errors.push("ENCRYPTION_KEY must be a 64-character hex string (32 bytes AES-256) and cannot use default dev values.");
		}
		if (!env.CCCD_HASH_PEPPER || INSECURE_DEFAULT_SECRETS.has(env.CCCD_HASH_PEPPER) || env.CCCD_HASH_PEPPER.length < 32) {
			errors.push("CCCD_HASH_PEPPER must be explicitly configured with at least 32 characters and cannot use default dev values.");
		}

		if (errors.length > 0) {
			throw new Error(`[Security Hardening Failure] Production environment configuration errors:\n- ${errors.join("\n- ")}`);
		}
	} else if (nodeEnv !== "test") {
		if (
			!env.JWT_SECRET ||
			INSECURE_DEFAULT_SECRETS.has(env.JWT_SECRET) ||
			!env.ENCRYPTION_KEY ||
			INSECURE_DEFAULT_SECRETS.has(env.ENCRYPTION_KEY)
		) {
			// Thông báo bảo mật cho môi trường dev/local
			console.warn("[Security Notice] Backend running in non-production mode with default development keys. Never use these in production!");
		}
	}
}

validateEnvironmentSecurity(process.env);

