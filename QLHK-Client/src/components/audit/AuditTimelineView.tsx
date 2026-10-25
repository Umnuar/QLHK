import {
	Activity,
	ArrowRight,
	Calendar,
	ChevronDown,
	ChevronRight,
	Clock,
	FileSpreadsheet,
	Filter,
	Home,
	Layers,
	MapPin,
	Plus,
	RefreshCw,
	RotateCcw,
	Search,
	Trash2,
	UserCheck,
	User as UserIcon,
	X,
} from "lucide-react";
import type React from "react";
import { useMemo, useState } from "react";
import type { AuditAction, AuditLogItem } from "../../api/auditApi";
import { CustomSelect } from "../common/CustomSelect";

export interface AuditTimelineViewProps {
	logs: AuditLogItem[];
	loading: boolean;
	total: number;
	page: number;
	totalPages: number;
	onPageChange: (newPage: number) => void;
	onRefresh: () => void;
	actionFilter: string;
	onActionFilterChange: (action: string) => void;
	villageFilter: string;
	onVillageFilterChange: (villageId: string) => void;
	villages: Array<{ id: string; name: string }>;
	userFilter: string;
	onUserFilterChange: (username: string) => void;
	userList: Array<{ username: string; full_name?: string | null }>;
	isAdmin: boolean;
	userVillageId?: string | null;
}

export type TimeFilterPreset =
	| "all"
	| "today"
	| "7days"
	| "30days"
	| "this_month"
	| "custom";

const FIELD_LABELS: Record<string, string> = {
	book_number: "Mã định danh hộ",
	code: "Mã định danh",
	head_name: "Chủ hộ",
	head_cccd: "Số CCCD chủ hộ",
	address: "Địa chỉ thường trú",
	residence: "Nơi thường trú",
	status: "Trạng thái cư trú",
	notes: "Ghi chú",
	village_name: "Thôn",
	village_id: "Mã thôn",
	full_name: "Họ và tên",
	name: "Họ và tên",
	relationship: "Quan hệ",
	dob: "Ngày sinh",
	dob_formatted: "Ngày sinh",
	gender: "Giới tính",
	cccd: "Số CCCD",
	cccd_last4: "4 số cuối CCCD",
	ethnicity: "Dân tộc",
	religion: "Tôn giáo",
	military_status: "Nghĩa vụ quân sự",
	education: "Học vấn",
	occupation: "Nghề nghiệp",
	members_count: "Số nhân khẩu",
	is_head: "Là chủ hộ",
	received: "Trạng thái nhận quà",
	calculation_year: "Năm tính toán",
	current_address: "Nơi ở hiện nay",
	is_deleted: "Đã xóa",
	deleted_at: "Thời điểm xóa",
	restored_at: "Thời điểm khôi phục",
	reason: "Lý do",
	file_name: "Tên tệp Excel",
	imported_households: "Số hộ đã nhập",
	imported_citizens: "Số nhân khẩu đã nhập",
};

const IGNORED_FIELDS = new Set([
	"id",
	"version",
	"created_at",
	"updated_at",
	"is_deleted",
	"deleted_at",
	"village_id",
	"household_id",
	"name_unaccented",
	"cccd_hash",
	"stt",
	"village",
	"citizens",
	"citizens_count",
	"user_id",
	"ip_address",
	"password_hash",
	"added_members",
	"updated_members",
	"removed_members",
]);

interface FieldDiff {
	key: string;
	label: string;
	from: any;
	to: any;
}

function formatValue(val: any): string {
	if (val === null || val === undefined || val === "") return "(Trống)";
	if (typeof val === "boolean") return val ? "Có" : "Không";
	if (typeof val === "object") {
		if (Array.isArray(val)) return `${val.length} mục`;
		return JSON.stringify(val);
	}
	return String(val);
}

function computeFieldDiffs(oldVals: any, newVals: any): FieldDiff[] {
	if (!oldVals && !newVals) return [];
	const oldObj = typeof oldVals === "object" && oldVals !== null ? oldVals : {};
	const newObj = typeof newVals === "object" && newVals !== null ? newVals : {};

	const allKeys = Array.from(
		new Set([...Object.keys(oldObj), ...Object.keys(newObj)]),
	);
	const diffs: FieldDiff[] = [];

	for (const key of allKeys) {
		if (IGNORED_FIELDS.has(key)) continue;

		const fromVal = oldObj[key];
		const toVal = newObj[key];

		const fromStr = JSON.stringify(fromVal ?? null);
		const toStr = JSON.stringify(toVal ?? null);

		if (fromStr !== toStr) {
			diffs.push({
				key,
				label: FIELD_LABELS[key] || key,
				from: fromVal,
				to: toVal,
			});
		}
	}

	return diffs;
}

function getActionMeta(action: AuditAction) {
	switch (action) {
		case "CREATE":
			return {
				label: "Thêm mới",
				badgeClass:
					"bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
				dotClass: "bg-emerald-500 ring-emerald-500/20",
				icon: Plus,
			};
		case "UPDATE":
			return {
				label: "Cập nhật",
				badgeClass:
					"bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30",
				dotClass: "bg-blue-500 ring-blue-500/20",
				icon: RefreshCw,
			};
		case "DELETE":
			return {
				label: "Xóa",
				badgeClass:
					"bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
				dotClass: "bg-rose-500 ring-rose-500/20",
				icon: Trash2,
			};
		case "RESTORE":
			return {
				label: "Khôi phục",
				badgeClass:
					"bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30",
				dotClass: "bg-purple-500 ring-purple-500/20",
				icon: RotateCcw,
			};
		case "IMPORT":
			return {
				label: "Nhập Excel",
				badgeClass:
					"bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
				dotClass: "bg-amber-500 ring-amber-500/20",
				icon: FileSpreadsheet,
			};
		default:
			return {
				label: String(action),
				badgeClass:
					"bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30",
				dotClass: "bg-slate-500 ring-slate-500/20",
				icon: Activity,
			};
	}
}

function getEntitySummary(item: AuditLogItem): {
	name: string;
	sub: string;
	icon: React.ComponentType<{ className?: string }>;
} {
	if (item.entity_type === "household") {
		const oldV = item.old_values || {};
		const newV = item.new_values || {};
		const headName = newV.head_name || oldV.head_name;
		const bookNum = newV.book_number || oldV.book_number;
		return {
			name: headName ? `Hộ ${headName}` : `Hộ gia đình #${item.entity_id || ""}`,
			sub: bookNum ? `Mã: ${bookNum}` : item.entity_id ? `ID: ${item.entity_id}` : "",
			icon: Home,
		};
	}

	if (item.entity_type === "citizen") {
		const oldV = item.old_values || {};
		const newV = item.new_values || {};
		const name = newV.full_name || oldV.full_name;
		const rel = newV.relationship || oldV.relationship;
		const cccdLast4 = newV.cccd_last4 || oldV.cccd_last4;
		return {
			name: name ? `Nhân khẩu ${name}` : `Nhân khẩu #${item.entity_id || ""}`,
			sub: rel ? `${rel}${cccdLast4 ? ` • •••• ${cccdLast4}` : ""}` : "",
			icon: UserIcon,
		};
	}

	if (item.entity_type === "excel_import") {
		const newV = item.new_values || {};
		return {
			name: newV.file_name ? `Tệp: ${newV.file_name}` : "Tệp Excel Dân số",
			sub: `${newV.imported_households || 0} hộ • ${newV.imported_citizens || 0} nhân khẩu`,
			icon: FileSpreadsheet,
		};
	}

	return {
		name: item.description || `Đối tượng ${item.entity_type}`,
		sub: item.entity_id ? `ID: ${item.entity_id}` : "",
		icon: Layers,
	};
}

function getQuickInlineSummary(item: AuditLogItem, diffs: FieldDiff[]): string {
	if (item.action === "UPDATE") {
		if (diffs.length > 0) {
			const names = diffs.slice(0, 3).map((d) => d.label);
			const moreCount = diffs.length - 3;
			return `Đổi ${diffs.length} trường: ${names.join(", ")}${moreCount > 0 ? ` +${moreCount}` : ""}`;
		}
		const newV = item.new_values || {};
		if (Array.isArray(newV.added_members) && newV.added_members.length > 0) {
			return `Thêm ${newV.added_members.length} nhân khẩu vào hộ`;
		}
		if (Array.isArray(newV.removed_members) && newV.removed_members.length > 0) {
			return `Tách/gỡ ${newV.removed_members.length} nhân khẩu khỏi hộ`;
		}
		return "Cập nhật thông tin bản ghi";
	}

	if (item.action === "CREATE") {
		const newV = item.new_values || {};
		if (item.entity_type === "household") {
			return `Tạo mới sổ hộ khẩu${newV.members_count ? ` (${newV.members_count} nhân khẩu)` : ""}`;
		}
		return `Đăng ký nhân khẩu mới${newV.relationship ? ` (${newV.relationship})` : ""}`;
	}

	if (item.action === "DELETE") {
		const newV = item.new_values || {};
		return newV.reason ? `Xóa: ${newV.reason}` : "Chuyển bản ghi vào Thùng rác";
	}

	if (item.action === "RESTORE") {
		const newV = item.new_values || {};
		return newV.notes ? `Khôi phục: ${newV.notes}` : "Khôi phục dữ liệu từ Thùng rác";
	}

	if (item.action === "IMPORT") {
		const newV = item.new_values || {};
		return `Nhập ${newV.imported_households || 0} hộ, ${newV.imported_citizens || 0} nhân khẩu`;
	}

	return item.description || "Thao tác nghiệp vụ";
}

function formatDayGroupTitle(dateStr: string): { title: string; isToday: boolean; isYesterday: boolean } {
	const itemDate = new Date(dateStr);
	if (isNaN(itemDate.getTime())) {
		return { title: dateStr, isToday: false, isYesterday: false };
	}

	const today = new Date();
	const itemDayKey = `${itemDate.getFullYear()}-${itemDate.getMonth()}-${itemDate.getDate()}`;
	const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;

	const yesterday = new Date();
	yesterday.setDate(today.getDate() - 1);
	const yesterdayKey = `${yesterday.getFullYear()}-${yesterday.getMonth()}-${yesterday.getDate()}`;

	const formattedDate = itemDate.toLocaleDateString("vi-VN", {
		weekday: "long",
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	});

	if (itemDayKey === todayKey) {
		return {
			title: `Hôm nay • ${itemDate.toLocaleDateString("vi-VN")}`,
			isToday: true,
			isYesterday: false,
		};
	}

	if (itemDayKey === yesterdayKey) {
		return {
			title: `Hôm qua • ${itemDate.toLocaleDateString("vi-VN")}`,
			isToday: false,
			isYesterday: true,
		};
	}

	return {
		title: formattedDate,
		isToday: false,
		isYesterday: false,
	};
}

export const AuditTimelineView: React.FC<AuditTimelineViewProps> = ({
	logs,
	loading,
	total,
	page,
	totalPages,
	onPageChange,
	onRefresh,
	actionFilter,
	onActionFilterChange,
	villageFilter,
	onVillageFilterChange,
	villages,
	userFilter,
	onUserFilterChange,
	userList,
	isAdmin,
	userVillageId,
}) => {
	const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
	const [timePreset, setTimePreset] = useState<TimeFilterPreset>("all");
	const [customStartDate, setCustomStartDate] = useState("");
	const [customEndDate, setCustomEndDate] = useState("");
	const [searchQuery, setSearchQuery] = useState("");

	const toggleExpand = (id: string) => {
		setExpandedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	};

	const expandAll = () => {
		setExpandedIds(new Set(logs.map((l) => l.id)));
	};

	const collapseAll = () => {
		setExpandedIds(new Set());
	};

	const filteredLogs = useMemo(() => {
		return logs.filter((item) => {
			if (searchQuery.trim()) {
				const query = searchQuery.trim().toLowerCase();
				const target = `${item.description || ""} ${item.username || ""} ${item.full_name || ""} ${item.village_name || ""} ${item.entity_id || ""}`.toLowerCase();
				if (!target.includes(query)) {
					return false;
				}
			}

			if (timePreset === "all") return true;

			const itemDate = new Date(item.created_at);
			if (isNaN(itemDate.getTime())) return true;

			const now = new Date();
			const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

			if (timePreset === "today") {
				return itemDate >= todayMidnight;
			}

			if (timePreset === "7days") {
				const sevenDaysAgo = new Date(todayMidnight.getTime() - 7 * 86400000);
				return itemDate >= sevenDaysAgo;
			}

			if (timePreset === "30days") {
				const thirtyDaysAgo = new Date(todayMidnight.getTime() - 30 * 86400000);
				return itemDate >= thirtyDaysAgo;
			}

			if (timePreset === "this_month") {
				const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
				return itemDate >= firstDayOfMonth;
			}

			if (timePreset === "custom") {
				if (customStartDate) {
					const start = new Date(customStartDate);
					if (itemDate < start) return false;
				}
				if (customEndDate) {
					const end = new Date(`${customEndDate}T23:59:59.999Z`);
					if (itemDate > end) return false;
				}
			}

			return true;
		});
	}, [logs, searchQuery, timePreset, customStartDate, customEndDate]);

	const groupedByDate = useMemo(() => {
		const groups: Array<{
			dateKey: string;
			groupMeta: ReturnType<typeof formatDayGroupTitle>;
			items: AuditLogItem[];
		}> = [];

		const map = new Map<string, AuditLogItem[]>();

		for (const item of filteredLogs) {
			const d = new Date(item.created_at);
			const dateKey = !isNaN(d.getTime())
				? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
				: "unknown";

			const list = map.get(dateKey) || [];
			list.push(item);
			map.set(dateKey, list);
		}

		for (const [dateKey, items] of map.entries()) {
			groups.push({
				dateKey,
				groupMeta: formatDayGroupTitle(items[0]?.created_at || dateKey),
				items,
			});
		}

		return groups;
	}, [filteredLogs]);

	const updateCount = useMemo(
		() => filteredLogs.filter((l) => l.action === "UPDATE").length,
		[filteredLogs],
	);
	const createCount = useMemo(
		() => filteredLogs.filter((l) => l.action === "CREATE").length,
		[filteredLogs],
	);
	const deleteCount = useMemo(
		() => filteredLogs.filter((l) => l.action === "DELETE" || l.action === "RESTORE").length,
		[filteredLogs],
	);
	const importCount = useMemo(
		() => filteredLogs.filter((l) => l.action === "IMPORT").length,
		[filteredLogs],
	);

	return (
		<div className="space-y-5 animate-in fade-in duration-150">
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
				<div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
					<div>
						<div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
							Tổng sự kiện
						</div>
						<div className="text-xl font-black text-slate-900 dark:text-white tabular-nums mt-0.5">
							{filteredLogs.length}
						</div>
					</div>
					<div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
						<Activity className="w-4 h-4" />
					</div>
				</div>

				<div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
					<div>
						<div className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
							Lượt cập nhật
						</div>
						<div className="text-xl font-black text-blue-700 dark:text-blue-300 tabular-nums mt-0.5">
							{updateCount}
						</div>
					</div>
					<div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
						<RefreshCw className="w-4 h-4" />
					</div>
				</div>

				<div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
					<div>
						<div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
							Thêm mới
						</div>
						<div className="text-xl font-black text-emerald-700 dark:text-emerald-300 tabular-nums mt-0.5">
							{createCount}
						</div>
					</div>
					<div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
						<Plus className="w-4 h-4" />
					</div>
				</div>

				<div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
					<div>
						<div className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
							Xóa / Khôi phục
						</div>
						<div className="text-xl font-black text-rose-700 dark:text-rose-300 tabular-nums mt-0.5">
							{deleteCount}
						</div>
					</div>
					<div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
						<Trash2 className="w-4 h-4" />
					</div>
				</div>
			</div>

			<div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3.5">
				<div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-slate-100 dark:border-slate-800">
					<div className="flex items-center gap-1.5 flex-wrap">
						<span className="text-xs font-bold text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-1">
							<Filter className="w-3.5 h-3.5" />
							<span>Hành động:</span>
						</span>
						{[
							{ id: "ALL", label: "Tất cả" },
							{ id: "UPDATE", label: "Cập nhật", color: "text-blue-600" },
							{ id: "CREATE", label: "Thêm mới", color: "text-emerald-600" },
							{ id: "DELETE", label: "Xóa", color: "text-rose-600" },
							{ id: "RESTORE", label: "Khôi phục", color: "text-purple-600" },
							{ id: "IMPORT", label: "Nhập Excel", color: "text-amber-600" },
						].map((act) => {
							const isAct = actionFilter === act.id;
							return (
								<button
									key={act.id}
									type="button"
									onClick={() => onActionFilterChange(act.id)}
									className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
										isAct
											? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
											: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
									}`}
								>
									{act.label}
								</button>
							);
						})}
					</div>

					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={expandAll}
							className="px-2.5 py-1 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer"
						>
							Bung mở tất cả
						</button>
						<span className="text-slate-300 dark:text-slate-700">|</span>
						<button
							type="button"
							onClick={collapseAll}
							className="px-2.5 py-1 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer"
						>
							Thu gọn tất cả
						</button>
					</div>
				</div>

				<div className="flex flex-wrap items-center gap-2.5">
					<div className="flex items-center gap-1.5 flex-wrap">
						<span className="text-xs font-bold text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-1">
							<Calendar className="w-3.5 h-3.5" />
							<span>Thời gian:</span>
						</span>
						{[
							{ id: "all", label: "Tất cả" },
							{ id: "today", label: "Hôm nay" },
							{ id: "7days", label: "7 ngày qua" },
							{ id: "30days", label: "30 ngày qua" },
							{ id: "this_month", label: "Tháng này" },
							{ id: "custom", label: "Tùy chọn..." },
						].map((tp) => {
							const isPres = timePreset === tp.id;
							return (
								<button
									key={tp.id}
									type="button"
									onClick={() => setTimePreset(tp.id as TimeFilterPreset)}
									className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
										isPres
											? "bg-emerald-600 text-white shadow-xs"
											: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
									}`}
								>
									{tp.label}
								</button>
							);
						})}
					</div>

					{timePreset === "custom" && (
						<div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs animate-in zoom-in-95">
							<input
								type="date"
								value={customStartDate}
								onChange={(e) => setCustomStartDate(e.target.value)}
								aria-label="Từ ngày"
								className="px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-xs"
							/>
							<span className="text-slate-400 font-bold">→</span>
							<input
								type="date"
								value={customEndDate}
								onChange={(e) => setCustomEndDate(e.target.value)}
								aria-label="Đến ngày"
								className="px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-xs"
							/>
							{(customStartDate || customEndDate) && (
								<button
									type="button"
									onClick={() => {
										setCustomStartDate("");
										setCustomEndDate("");
									}}
									className="p-1 text-slate-400 hover:text-rose-500 rounded-lg"
									title="Xóa khoảng ngày"
								>
									<X className="w-3.5 h-3.5" />
								</button>
							)}
						</div>
					)}
				</div>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1">
					<div className="relative">
						<Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
						<input
							type="text"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder="Tìm nhanh họ tên, CCCD, mã sổ..."
							className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
						/>
						{searchQuery && (
							<button
								type="button"
								onClick={() => setSearchQuery("")}
								className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
							>
								<X className="w-3.5 h-3.5" />
							</button>
						)}
					</div>

					{isAdmin ? (
						<CustomSelect
							value={villageFilter}
							onChange={(val) => onVillageFilterChange(String(val))}
							options={[
								{ value: "", label: "Toàn xã (Tất cả thôn)" },
								...villages.map((v) => ({ value: v.id, label: v.name })),
							]}
							placeholder="Địa bàn thôn"
							icon={<MapPin className="w-3.5 h-3.5 text-slate-400" />}
							clearable={Boolean(villageFilter)}
							onClear={() => onVillageFilterChange("")}
							className="rounded-xl text-xs font-bold"
						/>
					) : (
						<div className="flex items-center px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
							<MapPin className="w-3.5 h-3.5 text-emerald-500 mr-1.5 shrink-0" />
							<span className="truncate">
								Đơn vị: {villages.find((v) => v.id === userVillageId)?.name || "Thôn phụ trách"}
							</span>
						</div>
					)}

					<CustomSelect
						value={userFilter}
						onChange={(val) => onUserFilterChange(String(val))}
						options={[
							{ value: "", label: "Tất cả cán bộ thực hiện" },
							...userList.map((u) => ({
								value: u.username,
								label: u.full_name ? `${u.full_name} (${u.username})` : u.username,
							})),
						]}
						searchable
						placeholder="Cán bộ thực hiện"
						icon={<UserCheck className="w-3.5 h-3.5 text-slate-400" />}
						clearable={Boolean(userFilter)}
						onClear={() => onUserFilterChange("")}
						className="rounded-xl text-xs font-bold"
					/>
				</div>
			</div>

			<div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-6">
				<div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
					<div className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
						<Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
						<span>Timeline Dòng Thời Gian ({filteredLogs.length} sự kiện)</span>
					</div>
					<div className="flex items-center gap-3">
						<span className="text-xs font-mono text-slate-400">
							Trang {page} / {totalPages || 1}
						</span>
						<button
							type="button"
							onClick={onRefresh}
							className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
							title="Tải lại dữ liệu"
						>
							<RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-emerald-600" : ""}`} />
						</button>
					</div>
				</div>

				{loading && filteredLogs.length === 0 ? (
					<div className="py-16 flex flex-col items-center justify-center text-slate-400 text-xs">
						<RefreshCw className="w-6 h-6 animate-spin text-emerald-600 mb-2" />
						<span>Đang tải dòng thời gian kiểm soát...</span>
					</div>
				) : filteredLogs.length === 0 ? (
					<div className="py-16 text-center text-slate-400 text-xs italic">
						Không có sự kiện biến động nào phù hợp với bộ lọc đã chọn.
					</div>
				) : (
					<div className="space-y-8">
						{groupedByDate.map((group) => (
							<section key={group.dateKey} className="space-y-3">
								<div className="sticky top-16 z-20 flex items-center justify-between bg-slate-50/90 dark:bg-slate-950/80 backdrop-blur-sm px-3.5 py-1.5 rounded-xl border border-slate-200/60 dark:border-slate-800/80">
									<div className="flex items-center gap-2">
										<Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
										<span className="text-xs font-black text-slate-800 dark:text-slate-200">
											{group.groupMeta.title}
										</span>
										{group.groupMeta.isToday && (
											<span className="px-1.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
												Mới nhất
											</span>
										)}
									</div>
									<span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 font-mono">
										{group.items.length} sự kiện
									</span>
								</div>

								<div className="relative border-l-2 border-slate-200 dark:border-slate-800 ml-3.5 sm:ml-5 space-y-2.5">
									{group.items.map((item) => {
										const isExpanded = expandedIds.has(item.id);
										const actionMeta = getActionMeta(item.action);
										const entityMeta = getEntitySummary(item);
										const EntityIcon = entityMeta.icon;
										const diffs = computeFieldDiffs(item.old_values, item.new_values);
										const quickSummary = getQuickInlineSummary(item, diffs);

										const dateObj = new Date(item.created_at);
										const timeStr = !isNaN(dateObj.getTime())
											? dateObj.toLocaleTimeString("vi-VN", {
													hour: "2-digit",
													minute: "2-digit",
													second: "2-digit",
												})
											: item.created_at;

										return (
											<div key={item.id} className="relative pl-5 sm:pl-6 group">
												<div
													className={`absolute -left-1.5 top-3.5 w-3 h-3 rounded-full ${actionMeta.dotClass} ring-4 transition-transform group-hover:scale-125`}
												/>

												<div
													onClick={() => toggleExpand(item.id)}
													className={`p-3 sm:p-3.5 rounded-2xl border transition-all cursor-pointer ${
														isExpanded
															? "bg-slate-50 dark:bg-slate-800/80 border-emerald-500/50 shadow-sm"
															: "bg-white dark:bg-slate-900/90 border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs"
													}`}
												>
													<div className="flex items-center justify-between gap-3 text-xs flex-wrap md:flex-nowrap">
														<div className="flex items-center gap-2.5 min-w-0 flex-1">
															<span className="font-mono text-slate-500 dark:text-slate-400 font-semibold shrink-0 text-[11px]">
																{timeStr}
															</span>

															<span
																className={`px-2 py-0.5 rounded-lg text-[11px] font-black uppercase tracking-wider border shrink-0 ${actionMeta.badgeClass}`}
															>
																{actionMeta.label}
															</span>

															<div className="flex items-center gap-1.5 shrink-0 max-w-[200px] truncate">
																<EntityIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
																<span className="font-bold text-slate-900 dark:text-white truncate">
																	{entityMeta.name}
																</span>
															</div>

															<span className="text-slate-300 dark:text-slate-700 hidden lg:inline">
																•
															</span>

															<span className="text-slate-600 dark:text-slate-300 truncate hidden sm:inline flex-1 text-xs">
																{quickSummary}
															</span>
														</div>

														<div className="flex items-center gap-2.5 shrink-0 text-[11px] text-slate-500 dark:text-slate-400">
															<span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
																<UserIcon className="w-3 h-3 text-emerald-500" />
																<span>{item.full_name || item.username || "Hệ thống"}</span>
															</span>

															{item.village_name && (
																<span className="flex items-center gap-1 hidden md:flex">
																	<MapPin className="w-3 h-3 text-blue-500" />
																	<span className="max-w-[120px] truncate">{item.village_name}</span>
																</span>
															)}

															<div className="w-5 h-5 rounded-lg flex items-center justify-center text-slate-400 group-hover:text-emerald-600 transition-colors">
																{isExpanded ? (
																	<ChevronDown className="w-4 h-4 text-emerald-600" />
																) : (
																	<ChevronRight className="w-4 h-4" />
																)}
															</div>
														</div>
													</div>

													{isExpanded && (
														<div
															onClick={(e) => e.stopPropagation()}
															className="mt-3.5 pt-3.5 border-t border-slate-200/80 dark:border-slate-700/80 space-y-3 cursor-default animate-in fade-in slide-in-from-top-1 duration-150"
														>
															<div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
																<span className="font-semibold text-slate-700 dark:text-slate-200">
																	Chi tiết thay đổi & biến động dữ liệu:
																</span>
																<span className="font-mono text-[11px]">
																	Mã sự kiện: {item.id}
																</span>
															</div>

															{item.action === "UPDATE" && (
																<div className="space-y-3">
																	{diffs.length > 0 ? (
																		<div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden text-xs">
																			<div className="grid grid-cols-12 bg-slate-100 dark:bg-slate-800/90 font-bold text-slate-700 dark:text-slate-300 p-2.5 border-b border-slate-200 dark:border-slate-700">
																				<div className="col-span-4 sm:col-span-3">Trường thông tin</div>
																				<div className="col-span-4 sm:col-span-4 text-rose-600 dark:text-rose-400">
																					Trước khi sửa (Cũ)
																				</div>
																				<div className="col-span-4 sm:col-span-5 text-emerald-600 dark:text-emerald-400">
																					Sau khi sửa (Mới)
																				</div>
																			</div>
																			<div className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
																				{diffs.map((diff) => (
																					<div
																						key={diff.key}
																						className="grid grid-cols-12 p-2.5 items-center hover:bg-slate-50/50 dark:hover:bg-slate-800/40"
																					>
																						<div className="col-span-4 sm:col-span-3 font-semibold text-slate-800 dark:text-slate-200">
																							{diff.label}
																						</div>
																						<div className="col-span-4 sm:col-span-4 pr-2 font-mono text-[11px] text-rose-700 dark:text-rose-300 line-through">
																							{formatValue(diff.from)}
																						</div>
																						<div className="col-span-4 sm:col-span-5 flex items-center gap-1.5 font-mono text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
																							<ArrowRight className="w-3 h-3 text-slate-400 shrink-0 hidden sm:inline" />
																							<span>{formatValue(diff.to)}</span>
																						</div>
																					</div>
																				))}
																			</div>
																		</div>
																	) : (
																		<div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-xs text-slate-500 dark:text-slate-400 italic">
																			Không có trường dữ liệu văn bản thay đổi trực tiếp (thay đổi cấu trúc hoặc danh sách thành viên).
																		</div>
																	)}

																	{item.new_values && (
																		<>
																			{Array.isArray(item.new_values.added_members) &&
																				item.new_values.added_members.length > 0 && (
																					<div className="space-y-1.5">
																						<div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
																							Thêm nhân khẩu mới vào hộ ({item.new_values.added_members.length}):
																						</div>
																						{item.new_values.added_members.map((m: any, idx: number) => (
																							<div
																								key={`add-${idx}`}
																								className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs flex items-center justify-between"
																							>
																								<span className="font-bold text-emerald-950 dark:text-emerald-100">
																									+ {m.full_name} ({m.relationship || "Thành viên"})
																								</span>
																								<span className="font-mono text-[11px] text-slate-500">
																									{m.dob ? `NS: ${m.dob} • ` : ""}
																									CCCD: {m.cccd_last4 ? `•••• ${m.cccd_last4}` : "Chưa có"}
																								</span>
																							</div>
																						))}
																					</div>
																				)}

																			{Array.isArray(item.new_values.removed_members) &&
																				item.new_values.removed_members.length > 0 && (
																					<div className="space-y-1.5">
																						<div className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
																							Tách / Gỡ nhân khẩu khỏi hộ ({item.new_values.removed_members.length}):
																						</div>
																						{item.new_values.removed_members.map((m: any, idx: number) => (
																							<div
																								key={`rem-${idx}`}
																								className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-xs flex items-center justify-between"
																							>
																								<span className="font-bold text-rose-950 dark:text-rose-100 line-through">
																									- {m.full_name} ({m.relationship || "Thành viên"})
																								</span>
																								<span className="font-mono text-[11px] text-slate-500">
																									{m.dob ? `NS: ${m.dob} • ` : ""}
																									CCCD: {m.cccd_last4 ? `•••• ${m.cccd_last4}` : "Chưa có"}
																								</span>
																							</div>
																						))}
																					</div>
																				)}
																		</>
																	)}
																</div>
															)}

															{item.action === "CREATE" && item.new_values && (
																<div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/25 rounded-xl border border-emerald-200/60 dark:border-emerald-800/40 text-xs space-y-2">
																	<div className="font-bold text-emerald-800 dark:text-emerald-300">
																		Dữ liệu tạo mới ban đầu:
																	</div>
																	<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
																		{Object.entries(item.new_values).map(([k, v]) => {
																			if (IGNORED_FIELDS.has(k) || typeof v === "object") return null;
																			return (
																				<div key={k} className="p-1.5 bg-white/70 dark:bg-slate-900/70 rounded-lg">
																					<span className="text-[10px] text-slate-500 block">
																						{FIELD_LABELS[k] || k}
																					</span>
																					<span className="font-bold text-slate-800 dark:text-slate-100 truncate block">
																						{formatValue(v)}
																					</span>
																				</div>
																			);
																		})}
																	</div>
																</div>
															)}

															{item.action === "DELETE" && item.old_values && (
																<div className="p-3 bg-rose-50/70 dark:bg-rose-950/30 rounded-xl border border-rose-200/80 dark:border-rose-800/50 text-xs space-y-1.5 text-rose-900 dark:text-rose-200">
																	<div className="font-bold">Đã chuyển vào Thùng rác:</div>
																	<div>
																		Đối tượng: <strong>{entityMeta.name}</strong> ({entityMeta.sub})
																	</div>
																	{item.new_values?.reason && (
																		<div className="italic text-[11px] text-rose-700 dark:text-rose-300">
																			Lý do xóa: {item.new_values.reason}
																		</div>
																	)}
																</div>
															)}

															{item.action === "RESTORE" && (
																<div className="p-3 bg-purple-50/70 dark:bg-purple-950/30 rounded-xl border border-purple-200/80 dark:border-purple-800/50 text-xs text-purple-900 dark:text-purple-200">
																	Khôi phục thành công bản ghi <strong>{entityMeta.name}</strong> về trạng thái hoạt động chính thức.
																</div>
															)}

															{item.action === "IMPORT" && item.new_values && (
																<div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 rounded-xl border border-amber-200/80 dark:border-amber-800/50 text-xs space-y-1">
																	<div className="font-bold text-amber-900 dark:text-amber-200">
																		Kết quả nhập dữ liệu Excel:
																	</div>
																	<div>Tệp: <strong>{item.new_values.file_name}</strong></div>
																	<div>Số hộ: <strong>{item.new_values.imported_households || 0}</strong> • Số nhân khẩu: <strong>{item.new_values.imported_citizens || 0}</strong></div>
																</div>
															)}

															<div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400 font-mono flex-wrap gap-2">
																<span>IP: {item.ip_address || "127.0.0.1"}</span>
																<span>Entity ID: {item.entity_id || "N/A"}</span>
																<span>Thời gian lưu vết: {item.created_at}</span>
															</div>
														</div>
													)}
												</div>
											</div>
										);
									})}
								</div>
							</section>
						))}
					</div>
				)}

				<div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
					<button
						type="button"
						onClick={() => onPageChange(Math.max(1, page - 1))}
						disabled={page <= 1}
						className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
					>
						← Trang trước
					</button>

					<span className="text-xs font-bold text-slate-500 font-mono">
						Trang {page} / {totalPages || 1}
					</span>

					<button
						type="button"
						onClick={() => onPageChange(page + 1)}
						disabled={page >= totalPages}
						className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
					>
						Trang tiếp theo →
					</button>
				</div>
			</div>
		</div>
	);
};
