import crypto from "crypto";
import { config } from "../config/env";

let cachedKeyBuffer: Buffer | null = null;

export function getKeyBuffer(): Buffer {
	if (cachedKeyBuffer) {
		return cachedKeyBuffer;
	}
	const hexKey = config.encryptionKey;
	if (/^[0-9a-fA-F]{64}$/.test(hexKey)) {
		cachedKeyBuffer = Buffer.from(hexKey, "hex");
	} else {
		cachedKeyBuffer = crypto.createHash("sha256").update(hexKey).digest();
	}
	return cachedKeyBuffer;
}

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

export function hashCCCD(plainCCCD: string): string {
	const cleaned = plainCCCD.trim();
	const pepper =
		config.cccdHashPepper || "qlhk-dakha-cccd-pepper-secret-2026-v2-production-key";
	return crypto.createHmac("sha256", pepper).update(cleaned).digest("hex");
}

const DIACRITICS_REGEX = /[\u0300-\u036f]/g;
const D_STROKE_REGEX = /đ/g;

export function removeAccents(str: string): string {
	if (!str) return "";
	return str
		.toLowerCase()
		.replace(D_STROKE_REGEX, "d")
		.normalize("NFD")
		.replace(DIACRITICS_REGEX, "")
		.trim();
}
