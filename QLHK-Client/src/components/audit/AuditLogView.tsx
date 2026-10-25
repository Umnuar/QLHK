import {
	Activity,
	ArrowDownCircle,
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
	Shield,
	ShieldCheck,
	Trash2,
	UserCheck,
	User as UserIcon,
	X,
} from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useApp } from "../../AppContext";
import {
	type AuditAction,
	type AuditLogItem,
	auditApi,
} from "../../api/auditApi";
import { authApi } from "../../api/authApi";
import type { User } from "../../types";
import { CustomSelect } from "../common/CustomSelect";

export type TimeFilterPreset =
	| "all"
	| "today"
	| "yesterday"
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
	age60: "Tròn 60 tuổi",
	age65: "Tròn 65 tuổi",
	age70: "Tròn 70 tuổi",
	age75: "Tròn 75 tuổi",
	age80: "Tròn 80 tuổi",
	age85: "Tròn 85 tuổi",
	age90: "Tròn 90 tuổi",
	age95: "Tròn 95 tuổi",
	age100: "Tròn 100 tuổi",
	age_over_100: "Trên 100 tuổi",
	age75plus: "Đủ 75 tuổi trở lên",
	age70to74poor: "70-74 tuổi hộ nghèo/cận nghèo",
	bao_tro: "Bảo trợ xã hội",
	huu_tri: "Hưu trí",
	huu_tuat_bao_hiem: "Hưu tuất BHXH",
	nguoi_co_cong: "Người có công",
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

export const AuditLogView: React.FC = () => {
	const { user, villages, selectedVillageId, setSelectedVillageId } = useApp();
	const isAdmin = user?.role === "admin";

	const [actionFilter, setActionFilter] = useState<string>("ALL");
	const [villageFilter, setVillageFilter] = useState<string>(selectedVillageId || "");
	const [userFilter, setUserFilter] = useState<string>("");
	const [searchQuery, setSearchQuery] = useState<string>("");
	const [timePreset, setTimePreset] = useState<TimeFilterPreset>("all");
	const [customStartDate, setCustomStartDate] = useState<string>("");
	const [customEndDate, setCustomEndDate] = useState<string>("");

	const [logs, setLogs] = useState<AuditLogItem[]>([]);
	const [total, setTotal] = useState<number>(0);
	const [page, setPage] = useState<number>(1);
	const [limit] = useState<number>(50);
	const [totalPages, setTotalPages] = useState<number>(1);
	const [loading, setLoading] = useState<boolean>(false);
	const [userList, setUserList] = useState<User[]>([]);
	const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

	useEffect(() => {
		setVillageFilter(selectedVillageId || "");
	}, [selectedVillageId]);

	useEffect(() => {
		const loadUsers = async () => {
			try {
				const users = await authApi.getUsers();
				setUserList(users);
			} catch (err) {
				console.warn("Lỗi tải danh sách người dùng:", err);
			}
		};
		loadUsers();
	}, []);

	const fetchLogs = useCallback(
		async (currentPage: number, append = false) => {
			setLoading(true);
			try {
				const res = await auditApi.getLogs({
					page: currentPage,
					limit,
					villageId: villageFilter || undefined,
					action: actionFilter !== "ALL" ? actionFilter : undefined,
					userId: userFilter || undefined,
					search: searchQuery.trim() || undefined,
				});

				if (append) {
					setLogs((prev) => [...prev, ...res.data]);
				} else {
					setLogs(res.data);
				}
				setTotal(res.pagination.total);
				setTotalPages(res.pagination.totalPages);
			} catch (err) {
				console.error("Lỗi khi tải nhật ký hoạt động:", err);
			} finally {
				setLoading(false);
			}
		},
		[actionFilter, villageFilter, userFilter, searchQuery, limit],
	);

	useEffect(() => {
		setPage(1);
		fetchLogs(1, false);
	}, [fetchLogs]);

	const handleLoadMore = () => {
		if (page < totalPages && !loading) {
			const nextPage = page + 1;
			setPage(nextPage);
			fetchLogs(nextPage, true);
		}
	};

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
			if (timePreset === "all") return true;

			const itemDate = new Date(item.created_at);
			if (isNaN(itemDate.getTime())) return true;

			const now = new Date();
			const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

			if (timePreset === "today") {
				return itemDate >= todayMidnight;
			}

			if (timePreset === "yesterday") {
				const yesterdayMidnight = new Date(todayMidnight.getTime() - 86400000);
				return itemDate >= yesterdayMidnight && itemDate < todayMidnight;
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
	}, [logs, timePreset, customStartDate, customEndDate]);

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

	return (
		<div className="space-y-6">
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-slate-800">
				<div className="flex items-center gap-3">
					<div className="w-11 h-11 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
						<ShieldCheck className="w-6 h-6" strokeWidth={1.75} />
					</div>
					<div>
						<h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
							<span>Nhật Ký Hoạt Động & Kiểm Soát</span>
						</h1>
						<p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
							Lịch sử biến động dữ liệu hộ khẩu, nhân khẩu và phân tích giám sát hệ thống
						</p>
					</div>
				</div>

				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={() => fetchLogs(1, false)}
						disabled={loading}
						className="px-3.5 py-2 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-200 shadow-xs flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
					>
						<RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-emerald-600" : ""}`} />
						<span>{loading ? "Đang tải..." : "Làm mới"}</span>
					</button>
				</div>
			</div>

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
							{ id: "UPDATE", label: "Cập nhật" },
							{ id: "CREATE", label: "Thêm mới" },
							{ id: "DELETE", label: "Xóa" },
							{ id: "RESTORE", label: "Khôi phục" },
							{ id: "IMPORT", label: "Nhập Excel" },
						].map((act) => {
							const isAct = actionFilter === act.id;
							return (
								<button
									key={act.id}
									type="button"
									onClick={() => setActionFilter(act.id)}
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
							{ id: "yesterday", label: "Hôm qua" },
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
									className="p-1 text-slate-400 hover:text-rose-500 rounded-lg cursor-pointer"
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
						<Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
						<input
							type="text"
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							placeholder="Tìm nhanh họ tên, CCCD, mã sổ..."
							className="w-full h-[42px] min-h-[42px] pl-9.5 pr-8 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all text-slate-900 dark:text-slate-100 placeholder-slate-400"
						/>
						{searchQuery && (
							<button
								type="button"
								onClick={() => setSearchQuery("")}
								className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1"
							>
								<X className="w-3.5 h-3.5" />
							</button>
						)}
					</div>

					{selectedVillageId ? (
						<div className="flex items-center justify-between px-3.5 h-[42px] min-h-[42px] bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs">
							<div className="flex items-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-200 truncate">
								<MapPin className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
								<span className="truncate">
									Thôn: <strong>{villages.find((v) => v.id === selectedVillageId)?.name || "Thôn đã chọn"}</strong>
								</span>
							</div>
							<button
								type="button"
								onClick={() => {
									setSelectedVillageId("");
									setVillageFilter("");
								}}
								className="px-2 py-0.5 bg-white dark:bg-slate-800 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 rounded-lg text-[10px] font-bold cursor-pointer transition-all"
							>
								Toàn Xã
							</button>
						</div>
					) : isAdmin ? (
						<CustomSelect
							value={villageFilter}
							onChange={(val) => setVillageFilter(String(val))}
							options={[
								{ value: "", label: "Toàn xã (Tất cả thôn)" },
								...villages.map((v) => ({ value: v.id, label: v.name })),
							]}
							placeholder="Địa bàn thôn"
							icon={<MapPin className="w-3.5 h-3.5 text-slate-400" />}
							clearable={Boolean(villageFilter)}
							onClear={() => setVillageFilter("")}
							className="rounded-xl text-xs font-bold"
						/>
					) : (
						<div className="flex items-center px-3.5 h-[42px] min-h-[42px] bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
							<MapPin className="w-3.5 h-3.5 text-emerald-500 mr-1.5 shrink-0" />
							<span className="truncate">
								Đơn vị: {villages.find((v) => v.id === user?.village_id)?.name || "Thôn phụ trách"}
							</span>
						</div>
					)}

					<CustomSelect
						value={userFilter}
						onChange={(val) => setUserFilter(String(val))}
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
						onClear={() => setUserFilter("")}
						className="rounded-xl text-xs font-bold"
					/>
				</div>
			</div>

			<div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-6">
				<div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
					<div className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
						<Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
						<span>Dòng Thời Gian Biến Động ({filteredLogs.length} sự kiện)</span>
					</div>
					<div className="flex items-center gap-3">
						<span className="text-xs font-mono text-slate-400">
							Tổng {total} bản ghi • Trang {page} / {totalPages || 1}
						</span>
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
					<div className="relative space-y-8">
						<div className="absolute left-4 sm:left-5 top-2 bottom-2 w-0.5 bg-slate-200 dark:bg-slate-800 pointer-events-none" />

						{groupedByDate.map((group) => (
							<section key={group.dateKey} className="relative space-y-3">
								<div
									style={{ top: "var(--header-height, 0px)" }}
									className="sticky z-20 -mx-5 sm:-mx-6 px-5 sm:px-6 py-3.5 pb-4 sm:py-4 sm:pb-4.5 bg-white dark:bg-slate-900 border-b border-slate-200/90 dark:border-slate-800 shadow-sm dark:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.5)] flex items-center"
								>
									<div className="relative w-full flex items-center">
										<div className="absolute left-4 sm:left-5 -translate-x-1/2 -top-5 -bottom-5 w-0.5 bg-slate-200 dark:bg-slate-800 z-10 pointer-events-none" />

										<div className="absolute left-4 sm:left-5 -translate-x-1/2 w-6 h-6 rounded-full bg-slate-500 dark:bg-slate-600 text-white ring-4 ring-white dark:ring-slate-900 shadow-xs flex items-center justify-center z-20">
											<Calendar className="w-3 h-3 stroke-[2.5]" />
										</div>

										<div className="pl-10 sm:pl-12">
											<div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700/80 text-slate-800 dark:text-slate-100 shadow-xs">
												<span>{group.groupMeta.title}</span>
												<span className="text-slate-300 dark:text-slate-600 font-bold">·</span>
												<span className="font-mono text-slate-500 dark:text-slate-400 font-semibold text-[11px]">
													{group.items.length} sự kiện
												</span>
												{group.groupMeta.isToday && (
													<span className="px-1.5 py-0.2 rounded-md text-[10px] font-extrabold uppercase bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
														Mới nhất
													</span>
												)}
											</div>
										</div>
									</div>
								</div>

								<div className="space-y-2.5 pt-3 sm:pt-4">
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
											<div key={item.id} className="relative pl-10 sm:pl-12 group">
												<div
													className={`absolute left-4 sm:left-5 -translate-x-1/2 top-4 w-3 h-3 rounded-full ${actionMeta.dotClass} ring-4 ring-white dark:ring-slate-900 transition-transform group-hover:scale-125 z-10`}
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
																							Tách / gỡ nhân khẩu khỏi hộ ({item.new_values.removed_members.length}):
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
																									{m.dob ? `NS: ${m.dob}` : ""}
																								</span>
																							</div>
																						))}
																					</div>
																				)}

																			{item.new_values.action === "REVEAL_CCCD" && (
																				<div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
																					<Shield className="w-4 h-4 text-amber-600 shrink-0" />
																					<span>
																						Tra cứu & hiển thị số Căn cước công dân (Yêu cầu quyền hạn & đã ghi vết kiểm soát).
																					</span>
																				</div>
																			)}
																		</>
																	)}
																</div>
															)}

															{item.action === "CREATE" && item.new_values && (
																<div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-xs">
																	{item.new_values.head_name && (
																		<div>
																			<span className="text-slate-400 text-[11px]">Chủ hộ:</span>
																			<p className="font-bold text-slate-800 dark:text-slate-200">{item.new_values.head_name}</p>
																		</div>
																	)}
																	{item.new_values.full_name && (
																		<div>
																			<span className="text-slate-400 text-[11px]">Họ và tên:</span>
																			<p className="font-bold text-slate-800 dark:text-slate-200">{item.new_values.full_name}</p>
																		</div>
																	)}
																	{item.new_values.relationship && (
																		<div>
																			<span className="text-slate-400 text-[11px]">Quan hệ:</span>
																			<p className="font-bold text-slate-800 dark:text-slate-200">{item.new_values.relationship}</p>
																		</div>
																	)}
																	{item.new_values.address && (
																		<div className="col-span-2">
																			<span className="text-slate-400 text-[11px]">Địa chỉ:</span>
																			<p className="font-bold text-slate-800 dark:text-slate-200">{item.new_values.address}</p>
																		</div>
																	)}
																	{item.new_values.status && (
																		<div>
																			<span className="text-slate-400 text-[11px]">Trạng thái:</span>
																			<p className="font-bold text-slate-800 dark:text-slate-200">{item.new_values.status}</p>
																		</div>
																	)}
																	{item.new_values.members_count !== undefined && (
																		<div>
																			<span className="text-slate-400 text-[11px]">Số nhân khẩu:</span>
																			<p className="font-bold text-slate-800 dark:text-slate-200">{item.new_values.members_count}</p>
																		</div>
																	)}
																</div>
															)}

															{item.action === "DELETE" && (
																<div className="p-3 bg-rose-500/10 border border-rose-500/25 rounded-xl text-xs space-y-1">
																	<div className="font-bold text-rose-700 dark:text-rose-300">
																		Bản ghi đã được chuyển vào Thùng rác hệ thống
																	</div>
																	{item.new_values?.reason && (
																		<div className="text-slate-700 dark:text-slate-300">
																			<strong>Lý do:</strong> {item.new_values.reason}
																		</div>
																	)}
																</div>
															)}

															{item.action === "RESTORE" && (
																<div className="p-3 bg-purple-500/10 border border-purple-500/25 rounded-xl text-xs space-y-1">
																	<div className="font-bold text-purple-700 dark:text-purple-300">
																		Dữ liệu đã được khôi phục thành công từ Thùng rác
																	</div>
																	{item.new_values?.notes && (
																		<div className="text-slate-700 dark:text-slate-300">
																			<strong>Ghi chú:</strong> {item.new_values.notes}
																		</div>
																	)}
																</div>
															)}

															{item.action === "IMPORT" && item.new_values && (
																<div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl text-xs space-y-1.5">
																	<div className="font-bold text-amber-800 dark:text-amber-200">
																		Đã nhập khẩu dữ liệu thành công từ tệp Excel
																	</div>
																	<div className="flex items-center gap-4 text-slate-700 dark:text-slate-300 font-mono text-[11px]">
																		<span>Tệp: {item.new_values.file_name || "N/A"}</span>
																		<span>Số hộ: {item.new_values.imported_households || 0}</span>
																		<span>Số nhân khẩu: {item.new_values.imported_citizens || 0}</span>
																	</div>
																</div>
															)}

															<div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400 font-mono flex-wrap gap-2">
																<span>IP: {item.ip_address || "127.0.0.1"}</span>
																<span>Thời điểm: {item.created_at}</span>
																{item.entity_id && <span>Entity ID: {item.entity_id}</span>}
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

				{page < totalPages && (
					<div className="pt-4 flex justify-center border-t border-slate-100 dark:border-slate-800">
						<button
							type="button"
							onClick={handleLoadMore}
							disabled={loading}
							className="h-10 px-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
						>
							<ArrowDownCircle className="w-4 h-4" />
							<span>{loading ? "Đang tải thêm..." : "Tải thêm sự kiện tiếp theo"}</span>
						</button>
					</div>
				)}
			</div>
		</div>
	);
};
