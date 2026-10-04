/**
 * Che giấu số CCCD, chỉ hiển thị 4 số cuối
 * Ví dụ: '060098001234' -> '••••••••1234'
 */
export function maskCccd(
	cccd: string | null | undefined,
	showFull = false,
): string {
	if (!cccd || typeof cccd !== "string") return "Chưa có";
	const cleaned = cccd.trim();
	if (!cleaned) return "Chưa có";
	if (showFull) return cleaned;

	if (cleaned.length <= 4) {
		return cleaned;
	}
	const last4 = cleaned.slice(-4);
	const maskedPrefix = "•".repeat(cleaned.length - 4);
	return `${maskedPrefix}${last4}`;
}

/**
 * Kiểm tra tính hợp lệ của số CCCD (12 chữ số) hoặc CMND (9 chữ số)
 */
export function validateCccd(cccd: string | null | undefined): {
	isValid: boolean;
	error?: string;
} {
	if (!cccd || typeof cccd !== "string") {
		return { isValid: false, error: "Số CCCD không được để trống" };
	}
	const cleaned = cccd.trim();
	if (!/^\d+$/.test(cleaned)) {
		return { isValid: false, error: "Số CCCD chỉ được chứa các chữ số" };
	}
	if (cleaned.length !== 12 && cleaned.length !== 9) {
		return {
			isValid: false,
			error: `Số CCCD phải gồm 12 chữ số (CMND cũ 9 số), hiện tại có ${cleaned.length} số`,
		};
	}
	return { isValid: true };
}
