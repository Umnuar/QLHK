/**
 * tableStyles.ts
 * Quy ước phong cách và định dạng bảng dùng chung cho hệ sinh thái dữ liệu Đăk Hà.
 * Tuân thủ:
 * - Thẻ bo góc + bóng mềm
 * - Header chữ hoa nhỏ, nền rất nhạt, không viền dọc, chỉ kẻ ngang mảnh
 * - Chiều cao dòng ~52px, nền trắng, hover xám rất nhạt
 * - Định dạng số Việt Nam (1.200.000 / 3,6), font mono
 * - Badge thôn chuẩn: nền xanh lá rất nhạt, viền xanh lá (đồng bộ mọi màn)
 * - Nút thao tác kích thước 32px
 */

/**
 * Định dạng số theo chuẩn Việt Nam:
 * - Dấu chấm '.' ngăn cách hàng nghìn (1.200.000)
 * - Dấu phẩy ',' ngăn cách phần thập phân (3,6)
 */
export function formatVietnameseNumber(
	value: number | string | undefined | null,
): string {
	if (value === undefined || value === null || value === "") return "0";
	const num = typeof value === "number" ? value : Number(value);
	if (isNaN(num)) return String(value);

	const parts = num.toString().split(".");
	parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
	return parts.join(",");
}

/**
 * Kiểu Badge thôn duy nhất cho mọi màn hình:
 * Nền xanh lá rất nhạt, viền xanh lá
 */
export const VILLAGE_BADGE_CLASS =
	"inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-200 dark:border-emerald-800";

/**
 * Chuẩn hóa trạng thái cư trú hộ gia đình
 */
export function formatHouseholdStatus(status?: string): string {
	if (!status) return "Thường trú";
	const s = status.toLowerCase().trim();
	if (s === "active") return "Thường trú";
	if (s === "temporary") return "Tạm trú";
	if (s === "absent") return "Tạm vắng";
	if (s === "moved") return "Chuyển đi";
	return status;
}

/**
 * Thông tin hiển thị Badge trạng thái có kích thước đồng nhất và chấm màu trợ năng (Rule 2)
 */
export function getHouseholdStatusBadge(status?: string): {
	label: string;
	className: string;
	dotColor: string;
} {
	const formatted = formatHouseholdStatus(status);
	switch (formatted) {
		case "Thường trú":
			return {
				label: "Thường trú",
				className:
					"border-emerald-200/80 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300",
				dotColor: "bg-emerald-500",
			};
		case "Tạm trú":
			return {
				label: "Tạm trú",
				className:
					"border-sky-200/80 bg-sky-50 text-sky-800 dark:bg-sky-950/40 dark:border-sky-800 dark:text-sky-300",
				dotColor: "bg-sky-500",
			};
		case "Tạm vắng":
			return {
				label: "Tạm vắng",
				className:
					"border-amber-200/80 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-300",
				dotColor: "bg-amber-500",
			};
		case "Chuyển đi":
			return {
				label: "Chuyển đi",
				className:
					"border-slate-200/80 bg-slate-50 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300",
				dotColor: "bg-slate-400",
			};
		default:
			return {
				label: formatted,
				className:
					"border-emerald-200/80 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300",
				dotColor: "bg-emerald-500",
			};
	}
}

/**
 * Trả về class styling của badge trạng thái (tương thích ngược)
 */
export function getHouseholdStatusBadgeClass(status?: string): string {
	return getHouseholdStatusBadge(status).className;
}

/**
 * Chuẩn Header bảng từ màn Kinh tế (QLNN) làm chuẩn duy nhất cho cả 3 màn hình
 * Nền đặc tách rõ khỏi data rows ở cả Light và Dark mode, sticky top-0 với bóng nhẹ khi cuộn.
 */
export const TABLE_HEADER_CLASSES = {
	thead:
		"sticky top-0 z-20 select-none shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.3)]",
	row:
		"bg-slate-50 dark:bg-slate-800 border-b border-slate-200/90 dark:border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 select-none",
	th:
		"py-3.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 border-b border-slate-200/90 dark:border-slate-800 select-none whitespace-nowrap",
	thCenter:
		"py-3.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 border-b border-slate-200/90 dark:border-slate-800 text-center select-none whitespace-nowrap",
	thRight:
		"py-3.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 border-b border-slate-200/90 dark:border-slate-800 text-right select-none whitespace-nowrap",
	stickyLeftCheckbox:
		"py-3.5 px-2 text-center w-10 sticky left-0 z-30 bg-slate-50 dark:bg-slate-800 border-b border-slate-200/90 dark:border-slate-800 shadow-[2px_0_8px_-2px_rgba(0,0,0,0.06)] dark:shadow-[2px_0_8px_-2px_rgba(0,0,0,0.25)] select-none whitespace-nowrap",
	stickyRightAction:
		"py-3.5 px-3 text-center min-w-[96px] sticky right-0 z-30 bg-slate-50 dark:bg-slate-800 border-b border-slate-200/90 dark:border-slate-800 shadow-[-6px_0_12px_-2px_rgba(0,0,0,0.08)] dark:shadow-[-6px_0_12px_-2px_rgba(0,0,0,0.3)] text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 select-none whitespace-nowrap",
};

/**
 * Trả về class màu nền đồng bộ 100% giữa hàng tr và các ô sticky td
 * Đảm bảo không bao giờ bị lệch tông hay lộ khối màu riêng biệt ở mọi trạng thái (bình thường, hover, đang chọn).
 * Tuân thủ quy tắc mới: CCCD không bắt buộc -> không dòng nào bị nhấn mạnh vì thiếu CCCD.
 */
export function getTableRowBackground(
	isSelected: boolean,
): {
	rowClass: string;
	stickyCellClass: string;
} {
	if (isSelected) {
		return {
			rowClass:
				"bg-emerald-50 dark:bg-emerald-950 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/60",
			stickyCellClass:
				"bg-emerald-50 dark:bg-emerald-950 group-hover:bg-emerald-100/70 dark:group-hover:bg-emerald-900/60",
		};
	}
	return {
		rowClass:
			"bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80",
		stickyCellClass:
			"bg-white dark:bg-slate-900 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/80",
	};
}

/**
 * Bộ class Tailwind chuẩn quy ước bảng
 */
export const TABLE_CLASSES = {
	container:
		"bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col transition-colors duration-150",
	titleBar:
		"p-3 bg-slate-50/80 dark:bg-slate-950/60 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap text-xs",
	scrollArea:
		"max-h-[620px] overflow-x-auto overflow-y-auto relative custom-scrollbar",
	thead: TABLE_HEADER_CLASSES.thead,
	headerRow: TABLE_HEADER_CLASSES.row,
	th: TABLE_HEADER_CLASSES.th,
	thCenter: TABLE_HEADER_CLASSES.thCenter,
	thRight: TABLE_HEADER_CLASSES.thRight,
	stickyLeftCheckbox: TABLE_HEADER_CLASSES.stickyLeftCheckbox,
	stickyRightAction: TABLE_HEADER_CLASSES.stickyRightAction,
	bodyRow:
		"h-[52px] bg-white dark:bg-slate-900 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800/60 transition-colors cursor-pointer text-[14px]",
	cell: "py-3.5 px-3 text-[14px] text-slate-900 dark:text-slate-100 align-middle",
	cellSecondary: "text-[12px] text-slate-400 dark:text-slate-500 font-normal",
	cellNumber: "tabular-nums font-medium text-[14px]",
	actionBtnEdit:
		"w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 dark:hover:text-emerald-400 transition-colors cursor-pointer",
	actionBtnDelete:
		"w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 dark:text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 dark:hover:text-rose-400 transition-colors cursor-pointer",
};

