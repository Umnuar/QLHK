
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

export function calculatePercentagesWithLargestRemainder<T extends { count: number }>(
	items: T[],
	totalOverride?: number,
): (T & { percentage: number })[] {
	const total =
		totalOverride !== undefined
			? totalOverride
			: items.reduce((sum, item) => sum + item.count, 0);

	if (total <= 0 || items.length === 0) {
		return items.map((item) => ({ ...item, percentage: 0 }));
	}

	const TARGET_SUM = 1000;
	let currentSum = 0;

	const calculations = items.map((item, idx) => {
		if (item.count <= 0) {
			return { idx, floorTenths: 0, remainder: 0, original: item };
		}
		const rawTenths = (item.count / total) * TARGET_SUM;
		const floorTenths = Math.floor(rawTenths);
		const remainder = rawTenths - floorTenths;
		currentSum += floorTenths;
		return { idx, floorTenths, remainder, original: item };
	});

	const diff = TARGET_SUM - currentSum;
	if (diff > 0 && diff < items.length) {
		const eligible = calculations
			.filter((c) => c.original.count > 0)
			.sort((a, b) => b.remainder - a.remainder);

		for (let i = 0; i < diff && i < eligible.length; i++) {
			eligible[i].floorTenths += 1;
		}
	}

	calculations.sort((a, b) => a.idx - b.idx);
	return calculations.map((c) => ({
		...c.original,
		percentage: Number((c.floorTenths / 10).toFixed(1)),
	}));
}

export const VILLAGE_BADGE_CLASS =
	"inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-200 dark:border-emerald-800";

export function formatHouseholdStatus(status?: string): string {
	if (!status) return "Thường trú";
	const s = status.toLowerCase().trim();
	if (s === "active") return "Thường trú";
	if (s === "temporary") return "Tạm trú";
	if (s === "absent") return "Tạm vắng";
	if (s === "moved") return "Chuyển đi";
	return status;
}

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

export function getHouseholdStatusBadgeClass(status?: string): string {
	return getHouseholdStatusBadge(status).className;
}

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

export const TABLE_STYLES = {
	card: "bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col transition-colors duration-150",
	headerBar:
		"p-3.5 bg-slate-50 dark:bg-slate-950 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap text-xs",
	cardHeader:
		"p-3.5 bg-slate-50 dark:bg-slate-950 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap text-xs",
	headerTitle: "text-slate-800 dark:text-slate-200 font-bold text-sm",
	headerTip:
		"text-xs text-slate-500 dark:text-slate-400 font-medium px-2 flex items-center gap-1.5",
	scrollArea:
		"overflow-x-auto overflow-y-auto flex-1 max-h-[620px] relative custom-scrollbar",
	scrollContainer:
		"overflow-x-auto overflow-y-auto flex-1 max-h-[620px] relative custom-scrollbar",
	table: "w-full text-left border-collapse text-xs table-fixed min-w-[1200px]",
	thead:
		"sticky top-0 z-20 select-none shadow-[0_1px_3px_0_rgba(0,0,0,0.05)] dark:shadow-[0_1px_3px_0_rgba(0,0,0,0.3)]",
	headerRow:
		"bg-slate-50 dark:bg-slate-800 border-b border-slate-200/90 dark:border-slate-700/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 select-none",
	th: "py-3.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 border-b border-slate-200/90 dark:border-slate-700/80 select-none whitespace-nowrap",
	thCenter:
		"py-3.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 border-b border-slate-200/90 dark:border-slate-700/80 text-center select-none whitespace-nowrap",
	thRight:
		"py-3.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 border-b border-slate-200/90 dark:border-slate-700/80 text-right select-none whitespace-nowrap",
	thStickyLeft:
		"py-3.5 px-2 text-center w-12 min-w-[48px] max-w-[48px] sticky left-0 z-30 bg-slate-50 dark:bg-slate-800 border-b border-slate-200/90 dark:border-slate-700/80 select-none whitespace-nowrap",
	thStickyLeftStt:
		"py-3.5 px-2 text-center w-14 min-w-[56px] max-w-[56px] sticky left-12 z-30 bg-slate-50 dark:bg-slate-800 border-b border-slate-200/90 dark:border-slate-700/80 tabular-nums select-none whitespace-nowrap",
	thStickyLeftName:
		"py-3.5 px-3 text-left sticky left-[104px] z-30 bg-slate-50 dark:bg-slate-800 border-b border-slate-200/90 dark:border-slate-700/80 shadow-[3px_0_6px_-2px_rgba(0,0,0,0.08)] dark:shadow-[3px_0_6px_-2px_rgba(0,0,0,0.3)] select-none whitespace-nowrap",
	thStickyRight:
		"py-3.5 px-2 text-center w-24 min-w-[96px] max-w-[96px] sticky right-0 z-30 bg-slate-50 dark:bg-slate-800 border-b border-slate-200/90 dark:border-slate-700/80 shadow-[-6px_0_12px_-2px_rgba(0,0,0,0.08)] dark:shadow-[-6px_0_12px_-2px_rgba(0,0,0,0.3)] text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 select-none whitespace-nowrap",
	thSortable:
		"cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/80 transition-colors group",
};
