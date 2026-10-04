/**
 * Chuẩn hóa chuỗi tiếng Việt: loại bỏ dấu thanh, chuyển chữ thường, thay thế đ/Đ -> d
 */
export function normalizeUnaccented(str: string | null | undefined): string {
	if (!str) return "";
	return str
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[đĐ]/g, (char) => (char === "đ" ? "d" : "D"))
		.toLowerCase()
		.trim();
}

/**
 * Tự động tách Họ và tên đệm vs Tên chính
 * Ví dụ:
 *  - "Nguyễn Văn An" -> lastName: "Nguyễn Văn", firstName: "An"
 *  - "Trần Nam" -> lastName: "Trần", firstName: "Nam"
 *  - "A Tik" -> lastName: "A", firstName: "Tik"
 *  - "An" -> lastName: "", firstName: "An"
 */
export function splitFullName(fullName: string): {
	lastName: string;
	firstName: string;
} {
	if (!fullName) return { lastName: "", firstName: "" };
	const trimmed = fullName.trim().replace(/\s+/g, " ");
	const parts = trimmed.split(" ");
	if (parts.length <= 1) {
		return { lastName: "", firstName: parts[0] || "" };
	}
	const firstName = parts.pop() || "";
	const lastName = parts.join(" ");
	return { lastName, firstName };
}

/**
 * Ghép Họ lót và Tên thành Họ và tên hoàn chỉnh
 */
export function joinFullName(lastName: string, firstName: string): string {
	const l = (lastName || "").trim();
	const f = (firstName || "").trim();
	if (!l && !f) return "";
	if (!l) return f;
	if (!f) return l;
	return `${l} ${f}`.replace(/\s+/g, " ");
}

/**
 * Kiểm tra xem từ khóa tìm kiếm (không phân biệt hoa thường, không phân biệt dấu)
 * có xuất hiện trong bất kỳ mục tiêu nào không.
 */
export function matchesSearch(
	query: string,
	...targets: (string | undefined | null)[]
): boolean {
	if (!query || !query.trim()) return true;
	const normQuery = normalizeUnaccented(query);
	return targets.some((t) => {
		if (!t) return false;
		const normTarget = normalizeUnaccented(t);
		return normTarget.includes(normQuery);
	});
}
