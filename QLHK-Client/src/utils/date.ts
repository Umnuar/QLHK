export interface DobValidationResult {
	isValid: boolean;
	error?: string;
	warning?: string;
	birthYear?: number;
	formatted?: string;
	type?: "full" | "month_year" | "year_only";
}

const CURRENT_YEAR = new Date().getFullYear();

/**
 * Phân tích và kiểm tra tính hợp lệ của ngày tháng năm sinh linh hoạt:
 * - Hỗ trợ DD/MM/YYYY (ví dụ: 15/08/1990)
 * - Hỗ trợ MM/YYYY (ví dụ: 05/1985)
 * - Hỗ trợ YYYY (ví dụ: 1960)
 *
 * Bắt các lỗi điển hình:
 * - Năm thiếu số (ví dụ: 11/01/976)
 * - Tháng sai (ví dụ: 15/17/1989 có tháng 17)
 * - Ngày sai (ví dụ: 32/01/2000, 31/04/1995)
 */
export function parseAndValidateDob(
	rawInput: string | number | null | undefined,
): DobValidationResult {
	if (
		rawInput === null ||
		rawInput === undefined ||
		String(rawInput).trim() === ""
	) {
		return { isValid: false, error: "Ngày tháng năm sinh không được để trống" };
	}

	const str = String(rawInput).trim().replace(/[-.]/g, "/");
	const parts = str.split("/");

	// Trường hợp 1: Chỉ có năm sinh (YYYY)
	if (parts.length === 1) {
		const yearStr = parts[0].trim();
		if (!/^\d+$/.test(yearStr)) {
			return { isValid: false, error: `Năm sinh không hợp lệ: "${str}"` };
		}
		if (yearStr.length !== 4) {
			return {
				isValid: false,
				error: `Năm sinh phải gồm đúng 4 chữ số (nhận được: ${yearStr})`,
			};
		}
		const year = parseInt(yearStr, 10);
		if (year < 1900 || year > CURRENT_YEAR) {
			return {
				isValid: false,
				error: `Năm sinh phải từ 1900 đến ${CURRENT_YEAR} (nhận được: ${year})`,
			};
		}
		return {
			isValid: true,
			birthYear: year,
			formatted: `${year}`,
			type: "year_only",
		};
	}

	// Trường hợp 2: Tháng và Năm (MM/YYYY)
	if (parts.length === 2) {
		const monthStr = parts[0].trim();
		const yearStr = parts[1].trim();

		if (!/^\d+$/.test(monthStr) || !/^\d+$/.test(yearStr)) {
			return {
				isValid: false,
				error: `Định dạng tháng/năm không hợp lệ: "${str}"`,
			};
		}
		if (yearStr.length !== 4) {
			return {
				isValid: false,
				error: `Năm sinh phải đủ 4 chữ số (nhận được: ${yearStr})`,
			};
		}
		const month = parseInt(monthStr, 10);
		const year = parseInt(yearStr, 10);

		if (month < 1 || month > 12) {
			return {
				isValid: false,
				error: `Tháng không hợp lệ: tháng ${month} (phải từ 1 đến 12)`,
			};
		}
		if (year < 1900 || year > CURRENT_YEAR) {
			return {
				isValid: false,
				error: `Năm sinh phải từ 1900 đến ${CURRENT_YEAR} (nhận được: ${year})`,
			};
		}

		const paddedMonth = month < 10 ? `0${month}` : `${month}`;
		return {
			isValid: true,
			birthYear: year,
			formatted: `${paddedMonth}/${year}`,
			type: "month_year",
		};
	}

	// Trường hợp 3: Đầy đủ Ngày Tháng Năm (DD/MM/YYYY)
	if (parts.length === 3) {
		const dayStr = parts[0].trim();
		const monthStr = parts[1].trim();
		const yearStr = parts[2].trim();

		if (
			!/^\d+$/.test(dayStr) ||
			!/^\d+$/.test(monthStr) ||
			!/^\d+$/.test(yearStr)
		) {
			return {
				isValid: false,
				error: `Định dạng ngày/tháng/năm không hợp lệ: "${str}"`,
			};
		}
		if (yearStr.length !== 4) {
			return {
				isValid: false,
				error: `Năm sinh phải đủ 4 chữ số (nhận được: ${yearStr} trong "${str}")`,
			};
		}

		const day = parseInt(dayStr, 10);
		const month = parseInt(monthStr, 10);
		const year = parseInt(yearStr, 10);

		if (month < 1 || month > 12) {
			return {
				isValid: false,
				error: `Tháng ${month} không hợp lệ (phải từ 1 đến 12)`,
			};
		}
		if (year < 1900 || year > CURRENT_YEAR) {
			return {
				isValid: false,
				error: `Năm sinh phải từ 1900 đến ${CURRENT_YEAR} (nhận được: ${year})`,
			};
		}

		// Kiểm tra số ngày tối đa trong tháng
		const daysInMonth = new Date(year, month, 0).getDate();
		if (day < 1 || day > daysInMonth) {
			return {
				isValid: false,
				error: `Ngày ${day} không hợp lệ cho tháng ${month}/${year} (tháng này chỉ có ${daysInMonth} ngày)`,
			};
		}

		const paddedDay = day < 10 ? `0${day}` : `${day}`;
		const paddedMonth = month < 10 ? `0${month}` : `${month}`;
		return {
			isValid: true,
			birthYear: year,
			formatted: `${paddedDay}/${paddedMonth}/${year}`,
			type: "full",
		};
	}

	return {
		isValid: false,
		error: `Định dạng ngày tháng không nhận diện được: "${str}"`,
	};
}

/**
 * Tính tuổi dựa trên ngày sinh hoặc năm sinh tới năm hiện tại (mặc định 2026)
 */
export function calculateAge(
	dobInput: string | number | null | undefined,
	currentYear = CURRENT_YEAR,
): number {
	if (
		typeof dobInput === "number" &&
		dobInput >= 1900 &&
		dobInput <= currentYear
	) {
		return currentYear - dobInput;
	}
	const res = parseAndValidateDob(dobInput);
	if (res.isValid && res.birthYear) {
		return currentYear - res.birthYear;
	}
	return 0;
}

/**
 * Chuẩn hóa chuỗi hiển thị
 */
export function formatDobDisplay(
	dobInput: string | number | null | undefined,
): string {
	const res = parseAndValidateDob(dobInput);
	if (res.isValid && res.formatted) {
		return res.formatted;
	}
	return String(dobInput || "");
}
