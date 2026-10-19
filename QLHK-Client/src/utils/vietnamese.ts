export function normalizeUnaccented(str: string | null | undefined): string {
	if (!str) return "";
	return str
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[đĐ]/g, (char) => (char === "đ" ? "d" : "D"))
		.toLowerCase()
		.trim();
}

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

export function joinFullName(lastName: string, firstName: string): string {
	const l = (lastName || "").trim();
	const f = (firstName || "").trim();
	if (!l && !f) return "";
	if (!l) return f;
	if (!f) return l;
	return `${l} ${f}`.replace(/\s+/g, " ");
}

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
