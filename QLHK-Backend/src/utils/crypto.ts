import crypto from "crypto";
import { config } from "../config/env";

function getKeyBuffer(): Buffer {
	const hexKey = config.encryptionKey;
	if (/^[0-9a-fA-F]{64}$/.test(hexKey)) {
		return Buffer.from(hexKey, "hex");
	}
	return crypto.createHash("sha256").update(hexKey).digest();
}

/**
 * Mã hóa AES-256-GCM theo chuẩn Hệ sinh thái Đăk Hà:
 * Lưu trữ dạng "ivHex:authTagHex:encryptedHex"
 */
export function encryptCCCD(plainCCCD: string): {
	encrypted: string;
	hash: string;
	last4: string;
} {
	const cleaned = plainCCCD.trim();
	if (!cleaned) {
		return { encrypted: "", hash: "", last4: "" };
	}

	const iv = crypto.randomBytes(12);
	const cipher = crypto.createCipheriv("aes-256-gcm", getKeyBuffer(), iv);

	let encrypted = cipher.update(cleaned, "utf8", "hex");
	encrypted += cipher.final("hex");
	const authTag = cipher.getAuthTag().toString("hex");

	const encryptedString = `${iv.toString("hex")}:${authTag}:${encrypted}`;
	const hash = hashCCCD(cleaned);
	const last4 = cleaned.length >= 4 ? cleaned.slice(-4) : cleaned;

	return {
		encrypted: encryptedString,
		hash,
		last4,
	};
}

/**
 * Giải mã chuỗi CCCD từ định dạng "ivHex:authTagHex:encryptedHex"
 */
export function decryptCCCD(encryptedString: string): string {
	if (!encryptedString || !encryptedString.includes(":")) {
		return encryptedString || "";
	}

	const parts = encryptedString.split(":");
	if (parts.length !== 3) {
		throw new Error(
			"Định dạng chuỗi mã hóa không hợp lệ (cần iv:authTag:encryptedHex)",
		);
	}

	const [ivHex, authTagHex, encHex] = parts;
	const iv = Buffer.from(ivHex, "hex");
	const authTag = Buffer.from(authTagHex, "hex");

	const decipher = crypto.createDecipheriv("aes-256-gcm", getKeyBuffer(), iv);
	decipher.setAuthTag(authTag);

	let decrypted = decipher.update(encHex, "hex", "utf8");
	decrypted += decipher.final("utf8");

	return decrypted;
}

/**
 * Sinh HMAC-SHA256 hash của CCCD kèm PEPPER bí mật hệ thống chống Rainbow Table
 */
export function hashCCCD(plainCCCD: string): string {
	const cleaned = plainCCCD.trim();
	const pepper =
		config.cccdHashPepper || "qlhk-dakha-cccd-pepper-secret-2026-v2-production-key";
	return crypto.createHmac("sha256", pepper).update(cleaned).digest("hex");
}

/**
 * Xóa dấu tiếng Việt phục vụ tìm kiếm không dấu
 */
export function removeAccents(str: string): string {
	if (!str) return "";
	return str
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[đĐ]/g, (m) => (m === "đ" ? "d" : "D"))
		.toLowerCase()
		.trim();
}
