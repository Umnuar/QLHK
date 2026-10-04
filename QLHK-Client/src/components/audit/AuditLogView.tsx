import {
	Activity,
	ArrowDownCircle,
	ArrowRight,
	ChevronLeft,
	ChevronRight,
	Clock,
	FileSpreadsheet,
	Filter,
	History,
	MapPin,
	Plus,
	RefreshCw,
	RotateCcw,
	Search,
	Shield,
	Trash2,
	UserCheck,
	User as UserIcon,
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

const FIELD_LABELS: Record<string, string> = {
	book_number: "Mã định danh hộ",
	code: "Mã định danh",
	head_name: "Chủ hộ",
	head_cccd: "Số CCCD chủ hộ",
	address: "Địa chỉ cư trú",
	status: "Trạng thái cư trú",
	notes: "Ghi chú",
	village_name: "Thôn",
	village_id: "Mã thôn",
	full_name: "Họ và tên",
	relationship: "Quan hệ với chủ hộ",
	dob: "Ngày sinh",
	dob_formatted: "Ngày sinh",
	gender: "Giới tính",
	cccd: "Số CCCD",
	cccd_last4: "4 số cuối CCCD",
	ethnicity: "Dân tộc",
	religion: "Tôn giáo",
	occupation: "Nghề nghiệp",
	members_count: "Số nhân khẩu",
	is_head: "Là chủ hộ",
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

function formatValue(val: any): string {
	if (val === null || val === undefined || val === "") return "(Trống)";
	if (typeof val === "boolean") return val ? "Có" : "Không";
	if (typeof val === "object") {
		if (Array.isArray(val)) return `${val.length} mục`;
		return JSON.stringify(val);
	}
	return String(val);
}

export const AuditLogView: React.FC = () => {
	const { user, villages, selectedVillageId, setSelectedVillageId } = useApp();
	const isAdmin = user?.role === "admin";

	// Filters
	const [actionFilter, setActionFilter] = useState<string>("ALL");
	const [villageFilter, setVillageFilter] = useState<string>(
		selectedVillageId || "",
	);
	const [userFilter, setUserFilter] = useState<string>("");
	const [search, setSearch] = useState<string>("");

	// Đồng bộ bộ lọc Thôn khi chọn trên header/sidebar
	useEffect(() => {
		setVillageFilter(selectedVillageId || "");
	}, [selectedVillageId]);

	// Data & Pagination
	const [logs, setLogs] = useState<AuditLogItem[]>([]);
	const [total, setTotal] = useState<number>(0);
	const [page, setPage] = useState<number>(1);
	const [limit, setLimit] = useState<number>(10);
	const [totalPages, setTotalPages] = useState<number>(1);
	const [loading, setLoading] = useState<boolean>(false);
	const [userList, setUserList] = useState<User[]>([]);

	// Tải danh sách cán bộ để phục vụ bộ lọc
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

	// Truy vấn Audit Logs từ API
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
					search: search.trim() || undefined,
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
		[actionFilter, villageFilter, userFilter, search, limit],
	);

	useEffect(() => {
		setPage(1);
		fetchLogs(1, false);
	}, [fetchLogs]);

	// Nút Tải thêm dữ liệu
	const handleLoadMore = () => {
		if (page < totalPages && !loading) {
			const nextPage = page + 1;
			setPage(nextPage);
			fetchLogs(nextPage, true);
		}
	};

	// Cấu hình nhãn & màu sắc theo từng loại Action
	const getActionConfig = (action: AuditAction) => {
		switch (action) {
			case "CREATE":
				return {
					label: "Thêm Mới",
					colorBadge:
						"bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
					dotBg: "bg-emerald-500 ring-emerald-100 dark:ring-emerald-950",
					icon: Plus,
				};
			case "UPDATE":
				return {
					label: "Cập Nhật",
					colorBadge:
						"bg-blue-50 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 border-blue-200 dark:border-blue-800",
					dotBg: "bg-blue-500 ring-blue-100 dark:ring-blue-950",
					icon: RefreshCw,
				};
			case "DELETE":
				return {
					label: "Xóa Dữ Liệu",
					colorBadge:
						"bg-rose-50 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 border-rose-200 dark:border-rose-800",
					dotBg: "bg-rose-500 ring-rose-100 dark:ring-rose-950",
					icon: Trash2,
				};
			case "RESTORE":
				return {
					label: "Khôi Phục",
					colorBadge:
						"bg-purple-50 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300 border-purple-200 dark:border-purple-800",
					dotBg: "bg-purple-500 ring-purple-100 dark:ring-purple-950",
					icon: RotateCcw,
				};
			case "IMPORT":
				return {
					label: "Nhập Excel",
					colorBadge:
						"bg-amber-50 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 border-amber-200 dark:border-amber-800",
					dotBg: "bg-amber-500 ring-amber-100 dark:ring-amber-950",
					icon: FileSpreadsheet,
				};
			default:
				return {
					label: action,
					colorBadge:
						"bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700",
					dotBg: "bg-slate-500 ring-slate-100 dark:ring-slate-900",
					icon: History,
				};
		}
	};

	// Helper dịch JSON diff thân thiện
	const renderFriendlyDiff = (item: AuditLogItem) => {
		if (item.action === "UPDATE") {
			const oldVals =
				typeof item.old_values === "object" && item.old_values
					? item.old_values
					: {};
			const newVals =
				typeof item.new_values === "object" && item.new_values
					? item.new_values
					: {};

			// 1. Kiểm tra hành động đặc biệt: Tra cứu CCCD
			if (newVals.action === "REVEAL_CCCD") {
				return (
					<div className="mt-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
						<Shield
							className="w-4 h-4 text-amber-600 shrink-0"
							strokeWidth={1.5}
						/>
						<span>
							Tra cứu & hiển thị số Căn cước công dân (Yêu cầu quyền hạn & đã
							ghi vết kiểm soát)
						</span>
					</div>
				);
			}

			// 2. Biến động thuộc tính Sổ / Nhân khẩu cơ bản (bỏ qua IGNORED_FIELDS và nested objects)
			const basicKeys = Array.from(
				new Set([...Object.keys(oldVals), ...Object.keys(newVals)]),
			).filter(
				(k) =>
					!IGNORED_FIELDS.has(k) &&
					typeof oldVals[k] !== "object" &&
					typeof newVals[k] !== "object",
			);

			const basicChanges = basicKeys
				.filter((k) => {
					const v1 =
						oldVals[k] !== undefined && oldVals[k] !== null
							? String(oldVals[k]).trim()
							: "";
					const v2 =
						newVals[k] !== undefined && newVals[k] !== null
							? String(newVals[k]).trim()
							: "";
					return v1 !== v2;
				})
				.map((k) => ({
					field: k,
					label: FIELD_LABELS[k] || k,
					oldVal: formatValue(oldVals[k]),
					newVal: formatValue(newVals[k]),
				}));

			// 3. Biến động Nhân khẩu (Thêm/Sửa/Xóa thành viên)
			const addedMembers: any[] = Array.isArray(newVals.added_members)
				? newVals.added_members
				: [];
			const updatedMembers: any[] = Array.isArray(newVals.updated_members)
				? newVals.updated_members
				: [];
			const removedMembers: any[] = Array.isArray(newVals.removed_members)
				? newVals.removed_members
				: [];

			const hasMemberChanges =
				addedMembers.length > 0 ||
				updatedMembers.length > 0 ||
				removedMembers.length > 0;

			if (basicChanges.length === 0 && !hasMemberChanges) {
				return (
					<div className="text-xs text-slate-500 dark:text-slate-400 italic">
						Thông tin đã được đồng bộ lại.
					</div>
				);
			}

			return (
				<div className="space-y-3 mt-2">
					{/* Biến động thuộc tính cơ bản */}
					{basicChanges.length > 0 && (
						<div className="space-y-1.5">
							<div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
								Thay đổi thông tin:
							</div>
							<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
								{basicChanges.map((c) => (
									<div
										key={c.field}
										className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 text-xs flex flex-col justify-between"
									>
										<span className="font-bold text-slate-700 dark:text-slate-300">
											{c.label}
										</span>
										<div className="flex items-center gap-2 mt-1 flex-wrap">
											<span className="line-through text-rose-500/90 dark:text-rose-400 font-medium">
												{c.oldVal}
											</span>
											<span className="text-slate-400 font-bold font-mono">
												→
											</span>
											<span className="font-black text-emerald-600 dark:text-emerald-400">
												{c.newVal}
											</span>
										</div>
									</div>
								))}
							</div>
						</div>
					)}

					{/* Biến động thành viên hộ khẩu */}
					{hasMemberChanges && (
						<div className="space-y-2">
							<div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
								Biến động thành viên hộ:
							</div>

							{/* Thêm nhân khẩu */}
							{addedMembers.map((m: any, idx: number) => (
								<div
									key={`add-${idx}`}
									className="p-2.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 text-xs flex items-center justify-between gap-2 flex-wrap"
								>
									<div className="flex items-center gap-2">
										<span className="px-2 py-0.5 rounded-md font-bold text-[11px] bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">
											+ Thêm nhân khẩu
										</span>
										<strong className="text-slate-900 dark:text-white">
											{m.full_name}
										</strong>
										<span className="text-slate-500 dark:text-slate-400">
											({m.relationship || "Thành viên"})
										</span>
									</div>
									<div className="text-slate-600 dark:text-slate-300 text-[11px] font-mono">
										{m.dob && <span>NS: {m.dob} • </span>}
										{m.gender && <span>{m.gender} • </span>}
										<span>
											CCCD: {m.cccd_last4 ? `•••• ${m.cccd_last4}` : "Chưa có"}
										</span>
									</div>
								</div>
							))}

							{/* Cập nhật nhân khẩu */}
							{updatedMembers.map((m: any, idx: number) => (
								<div
									key={`upd-${idx}`}
									className="p-2.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/50 text-xs space-y-1.5"
								>
									<div className="flex items-center gap-2">
										<span className="px-2 py-0.5 rounded-md font-bold text-[11px] bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">
											Cập nhật nhân khẩu
										</span>
										<strong className="text-slate-900 dark:text-white">
											{m.full_name}
										</strong>
										<span className="text-slate-500 dark:text-slate-400">
											({m.relationship || "Thành viên"})
										</span>
									</div>
									{m.changes && Object.keys(m.changes).length > 0 && (
										<div className="pl-4 space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
											{Object.entries(m.changes).map(
												([k, diff]: [string, any]) => (
													<div
														key={k}
														className="flex items-center gap-1.5 flex-wrap"
													>
														<span className="font-semibold text-slate-700 dark:text-slate-200">
															{FIELD_LABELS[k] || k}:
														</span>
														<span className="line-through text-rose-500 font-mono">
															{formatValue(diff.from)}
														</span>
														<span className="text-slate-400 font-bold font-mono">
															→
														</span>
														<span className="text-emerald-600 dark:text-emerald-400 font-bold font-mono">
															{formatValue(diff.to)}
														</span>
													</div>
												),
											)}
										</div>
									)}
								</div>
							))}

							{/* Xóa/Tách nhân khẩu */}
							{removedMembers.map((m: any, idx: number) => (
								<div
									key={`rem-${idx}`}
									className="p-2.5 rounded-xl bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 text-xs flex items-center justify-between gap-2 flex-wrap"
								>
									<div className="flex items-center gap-2">
										<span className="px-2 py-0.5 rounded-md font-bold text-[11px] bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300">
											Gỡ khỏi hộ
										</span>
										<strong className="text-slate-900 dark:text-white line-through">
											{m.full_name}
										</strong>
										<span className="text-slate-500 dark:text-slate-400">
											({m.relationship || "Thành viên"})
										</span>
									</div>
									<div className="text-slate-500 dark:text-slate-400 text-[11px] font-mono">
										{m.dob && <span>NS: {m.dob} • </span>}
										<span>
											CCCD: {m.cccd_last4 ? `•••• ${m.cccd_last4}` : "Chưa có"}
										</span>
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			);
		}

		if (item.action === "CREATE" && item.new_values) {
			const vals = typeof item.new_values === "object" ? item.new_values : {};
			const citizensList: any[] = Array.isArray(vals.citizens)
				? vals.citizens
				: [];

			return (
				<div className="space-y-2 mt-2">
					<div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
						Dữ liệu khởi tạo:
					</div>
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
						{vals.book_number && (
							<div className="p-2 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/40 text-xs flex flex-col">
								<span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
									Mã định danh hộ
								</span>
								<span className="font-bold text-slate-900 dark:text-slate-100 mt-0.5">
									{vals.book_number}
								</span>
							</div>
						)}
						{vals.head_name && (
							<div className="p-2 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/40 text-xs flex flex-col">
								<span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
									Chủ hộ
								</span>
								<span className="font-bold text-slate-900 dark:text-slate-100 mt-0.5">
									{vals.head_name}
								</span>
							</div>
						)}
						{vals.address && (
							<div className="p-2 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/40 text-xs flex flex-col">
								<span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
									Địa chỉ
								</span>
								<span className="font-bold text-slate-900 dark:text-slate-100 mt-0.5">
									{vals.address}
								</span>
							</div>
						)}
						{vals.village_name && (
							<div className="p-2 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/40 text-xs flex flex-col">
								<span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
									Thôn
								</span>
								<span className="font-bold text-slate-900 dark:text-slate-100 mt-0.5">
									{vals.village_name}
								</span>
							</div>
						)}
						{vals.status && (
							<div className="p-2 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/40 text-xs flex flex-col">
								<span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
									Trạng thái cư trú
								</span>
								<span className="font-bold text-slate-900 dark:text-slate-100 mt-0.5">
									{vals.status}
								</span>
							</div>
						)}
						{vals.members_count !== undefined && (
							<div className="p-2 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/40 text-xs flex flex-col">
								<span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
									Số nhân khẩu
								</span>
								<span className="font-bold text-slate-900 dark:text-slate-100 mt-0.5">
									{vals.members_count} người
								</span>
							</div>
						)}
						{item.entity_type === "citizen" && vals.full_name && (
							<div className="p-2 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/40 text-xs flex flex-col">
								<span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
									Họ và tên
								</span>
								<span className="font-bold text-slate-900 dark:text-slate-100 mt-0.5">
									{vals.full_name} ({vals.relationship || "Thành viên"})
								</span>
							</div>
						)}
					</div>

					{/* Danh sách thành viên ban đầu nếu có */}
					{citizensList.length > 0 && (
						<div className="mt-2 space-y-1.5">
							<div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
								Thành viên khởi tạo ({citizensList.length}):
							</div>
							<div className="space-y-1">
								{citizensList.map((c: any, idx: number) => (
									<div
										key={idx}
										className="p-2 rounded-lg bg-emerald-50/30 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 text-xs flex items-center justify-between flex-wrap gap-1"
									>
										<div>
											<strong className="text-slate-800 dark:text-slate-200">
												{c.full_name}
											</strong>
											<span className="text-slate-500 ml-1">
												(
												{c.relationship ||
													(c.is_head ? "Chủ hộ" : "Thành viên")}
												)
											</span>
										</div>
										<div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
											{c.gender && <span>{c.gender} • </span>}
											{c.dob && <span>NS: {c.dob} • </span>}
											<span>
												CCCD:{" "}
												{c.cccd_last4 ? `•••• ${c.cccd_last4}` : "Chưa có"}
											</span>
										</div>
									</div>
								))}
							</div>
						</div>
					)}
				</div>
			);
		}

		if (item.action === "IMPORT" && item.new_values) {
			return (
				<div className="mt-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs space-y-1 text-slate-800 dark:text-slate-200">
					<div className="font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
						<FileSpreadsheet className="w-4 h-4" strokeWidth={1.5} />
						<span>
							Tệp Excel: {item.new_values.file_name || "NhanHoKhau.xlsx"}
						</span>
					</div>
					<div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
						<div>
							Số hộ nhập:{" "}
							<strong className="text-slate-900 dark:text-white">
								{item.new_values.imported_households || 0}
							</strong>
						</div>
						<div>
							Số nhân khẩu:{" "}
							<strong className="text-slate-900 dark:text-white">
								{item.new_values.imported_citizens || 0}
							</strong>
						</div>
					</div>
				</div>
			);
		}

		if (item.action === "DELETE" && item.old_values) {
			const vals = typeof item.old_values === "object" ? item.old_values : {};
			return (
				<div className="mt-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-800 dark:text-rose-200 space-y-1">
					<div className="font-bold">Đã chuyển vào Thùng rác:</div>
					<div>
						{item.entity_type === "household" ? (
							<>
								Hộ ông/bà: <strong>{vals.head_name || "Chưa rõ"}</strong>
								{vals.address && <span> ({vals.address})</span>}
								{vals.members_count !== undefined && (
									<span> — {vals.members_count} nhân khẩu</span>
								)}
							</>
						) : (
							<>
								Nhân khẩu: <strong>{vals.full_name || item.entity_id}</strong>
								{vals.relationship && <span> ({vals.relationship})</span>}
								{vals.cccd_last4 && (
									<span> — CCCD: •••• {vals.cccd_last4}</span>
								)}
							</>
						)}
					</div>
					{item.new_values?.reason && (
						<div className="text-[11px] text-rose-600 dark:text-rose-400 italic">
							Lý do: {item.new_values.reason}
						</div>
					)}
				</div>
			);
		}

		if (item.action === "RESTORE") {
			const vals = typeof item.new_values === "object" ? item.new_values : {};
			return (
				<div className="mt-2 p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 text-xs text-purple-800 dark:text-purple-200">
					<span>
						Khôi phục bản ghi:{" "}
						<strong>
							{vals.book_number || vals.full_name || item.entity_id}
						</strong>
					</span>
					{vals.notes && (
						<div className="text-[11px] mt-1 text-purple-600 dark:text-purple-400">
							{vals.notes}
						</div>
					)}
				</div>
			);
		}

		return null;
	};

	return (
		<div className="space-y-6 animate-in fade-in pb-12">
			{/* Banner Tiêu Đề */}
			<div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors duration-150">
				<div>
					<div className="flex items-center gap-2.5 flex-wrap">
						<span className="px-3 py-1 rounded-xl text-xs font-black bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 uppercase tracking-wider">
							Hệ Thống Kiểm Soát
						</span>
						<h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
							<History
								className="w-6 h-6 text-emerald-600 dark:text-emerald-400"
								strokeWidth={1.5}
							/>
							<span>Nhật Ký Hoạt Động & Biến Động Dữ Liệu</span>
						</h2>
					</div>
					<p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
						Ghi vết tự động toàn bộ biến động nhân hộ khẩu, nhập xuất dữ liệu và
						thao tác nghiệp vụ tại Xã Đăk Hà
					</p>
				</div>

				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={() => fetchLogs(1, false)}
						className="h-10 flex items-center gap-1.5 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl text-xs font-bold transition-all border border-slate-200 dark:border-slate-700 cursor-pointer"
					>
						<RefreshCw
							strokeWidth={1.5}
							className={`w-4 h-4 ${loading ? "animate-spin text-emerald-600" : ""}`}
						/>
						<span>Làm Mới</span>
					</button>
				</div>
			</div>

			{/* Thanh Bộ Lọc Sự Kiện Nhanh */}
			<div className="flex flex-wrap items-center gap-2 p-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-xs">
				<span className="text-xs font-bold text-slate-500 dark:text-slate-400 px-3 flex items-center gap-1.5">
					<Filter className="w-3.5 h-3.5" strokeWidth={1.5} />
					<span>Sự kiện:</span>
				</span>

				{[
					{
						id: "ALL",
						label: "Tất Cả",
						icon: Activity,
						color: "bg-slate-900 text-white dark:bg-white dark:text-slate-900",
					},
					{
						id: "CREATE",
						label: "Thêm Mới",
						icon: Plus,
						color: "bg-emerald-600 text-white",
					},
					{
						id: "UPDATE",
						label: "Cập Nhật",
						icon: RefreshCw,
						color: "bg-blue-600 text-white",
					},
					{
						id: "DELETE",
						label: "Xóa",
						icon: Trash2,
						color: "bg-rose-600 text-white",
					},
					{
						id: "RESTORE",
						label: "Khôi Phục",
						icon: RotateCcw,
						color: "bg-purple-600 text-white",
					},
					{
						id: "IMPORT",
						label: "Nhập Excel",
						icon: FileSpreadsheet,
						color: "bg-amber-600 text-white",
					},
				].map((item) => {
					const isActive = actionFilter === item.id;
					const Icon = item.icon;
					return (
						<button
							key={item.id}
							type="button"
							onClick={() => setActionFilter(item.id)}
							className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
								isActive
									? `${item.color} shadow-xs`
									: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
							}`}
						>
							<Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
							<span>{item.label}</span>
						</button>
					);
				})}
			</div>

			{/* Thanh Tìm Kiếm & Lọc Chi Tiết */}
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
				{/* Tìm kiếm từ khóa */}
				<div className="relative">
					<Search
						className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"
						strokeWidth={1.5}
					/>
					<input
						type="text"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Tìm theo nội dung, tên chủ hộ, tên cán bộ..."
						className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:bg-slate-800/80 dark:border-slate-700/60 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:bg-slate-800 rounded-2xl text-xs font-medium focus:outline-hidden"
					/>
				</div>

				{/* Lọc theo Thôn */}
				{selectedVillageId ? (
					<div className="flex items-center justify-between px-3.5 py-2 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 rounded-2xl text-xs">
						<div className="flex items-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-200 truncate">
							<MapPin
								className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0"
								strokeWidth={1.5}
							/>
							<span className="truncate">
								Đang xem biến động dữ liệu:{" "}
								<strong>
									{villages.find((v) => v.id === selectedVillageId)?.name ||
										"Thôn đã chọn"}
								</strong>
							</span>
						</div>
						<button
							type="button"
							onClick={() => {
								setSelectedVillageId("");
								setVillageFilter("");
							}}
							className="ml-2 px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-slate-700 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 rounded-xl text-[11px] font-bold shadow-xs cursor-pointer transition-all shrink-0"
							title="Chuyển về xem toàn xã"
						>
							Xem Toàn Xã
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
						icon={
							<MapPin
								className="w-3.5 h-3.5 text-slate-400 shrink-0"
								strokeWidth={1.5}
							/>
						}
						clearable={Boolean(villageFilter)}
						onClear={() => setVillageFilter("")}
						className="rounded-2xl text-xs font-bold"
					/>
				) : (
					<div className="flex items-center px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-2xl text-xs font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
						<span>
							Đơn vị:{" "}
							{villages.find((v) => v.id === user?.village_id)?.name ||
								"Thôn phụ trách"}
						</span>
					</div>
				)}

				{/* Lọc theo người thực hiện */}
				<CustomSelect
					value={userFilter}
					onChange={(val) => setUserFilter(String(val))}
					options={[
						{ value: "", label: "Tất cả cán bộ thực hiện" },
						...userList.map((u) => ({
							value: u.username,
							label: u.full_name
								? `${u.full_name} (${u.username})`
								: u.username,
						})),
					]}
					searchable
					placeholder="Cán bộ thực hiện"
					icon={
						<UserCheck
							className="w-3.5 h-3.5 text-slate-400 shrink-0"
							strokeWidth={1.5}
						/>
					}
					clearable={Boolean(userFilter)}
					onClear={() => setUserFilter("")}
					className="rounded-2xl text-xs font-bold"
				/>
			</div>

			{/* Dòng Thời Gian Timeline Chuẩn QLNN */}
			<div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 p-6 shadow-sm">
				<div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
					<div className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-2">
						<Clock className="w-4 h-4 text-emerald-500" strokeWidth={1.5} />
						<span>Dòng thời gian biến động ({total} sự kiện)</span>
					</div>
					<span className="text-xs font-mono text-slate-400">
						Trang {page} / {totalPages}
					</span>
				</div>

				{loading && logs.length === 0 ? (
					<div className="py-12 flex flex-col items-center justify-center text-slate-400 text-xs">
						<RefreshCw
							className="w-6 h-6 animate-spin text-emerald-600 mb-2"
							strokeWidth={1.5}
						/>
						<span>Đang tải nhật ký kiểm soát...</span>
					</div>
				) : logs.length === 0 ? (
					<div className="py-12 text-center text-slate-400 text-xs italic">
						Không tìm thấy sự kiện biến động nào phù hợp với bộ lọc.
					</div>
				) : (
					<div className="relative border-l-2 border-slate-200 dark:border-slate-800 ml-4 space-y-6 pb-2">
						{logs.map((item) => {
							const cfg = getActionConfig(item.action);
							const ActionIcon = cfg.icon;
							const dateObj = new Date(item.created_at);
							const timeStr = !isNaN(dateObj.getTime())
								? `${dateObj.toLocaleTimeString("vi-VN")} • ${dateObj.toLocaleDateString("vi-VN")}`
								: item.created_at;

							return (
								<div key={item.id} className="relative pl-6 group">
									{/* Node chấm tròn Timeline */}
									<div
										className={`absolute -left-2.25 top-1.5 w-4.5 h-4.5 rounded-full ${cfg.dotBg} ring-4 flex items-center justify-center text-white shadow-xs transition-transform group-hover:scale-110`}
									>
										<ActionIcon className="w-2.5 h-2.5 stroke-[3]" />
									</div>

									{/* Thẻ Nội Dung Sự Kiện */}
									<div className="bg-slate-50/60 dark:bg-slate-950/60 p-4.5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs hover:border-emerald-500/40 transition-all space-y-2">
										{/* Header Thẻ: Loại thao tác & Thời gian */}
										<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
											<div className="flex items-center gap-2 flex-wrap">
												<span
													className={`px-2.5 py-0.5 rounded-lg text-xs font-black uppercase tracking-wider border ${cfg.colorBadge}`}
												>
													{cfg.label}
												</span>

												<span className="text-xs font-black text-slate-800 dark:text-slate-100">
													{item.description ||
														`${cfg.label} đối tượng ${item.entity_type}`}
												</span>
											</div>

											<div className="flex items-center gap-1.5 text-xs font-mono text-slate-500 dark:text-slate-400 shrink-0">
												<Clock className="w-3.5 h-3.5" strokeWidth={1.5} />
												<span>{timeStr}</span>
											</div>
										</div>

										{/* Dịch JSON Diff Thân Thiện */}
										{renderFriendlyDiff(item)}

										{/* Footer Thẻ: Người thực hiện, IP, Đơn vị */}
										<div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 flex-wrap gap-2">
											<div className="flex items-center gap-3">
												<span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
													<UserIcon
														className="w-3.5 h-3.5 text-emerald-500"
														strokeWidth={1.5}
													/>
													<span>
														{item.full_name || item.username || "Hệ thống"}
													</span>
												</span>

												{item.village_name && (
													<span className="flex items-center gap-1">
														<MapPin
															className="w-3.5 h-3.5 text-blue-500"
															strokeWidth={1.5}
														/>
														<span>{item.village_name}</span>
													</span>
												)}
											</div>

											{item.ip_address && (
												<span className="font-mono text-slate-400">
													IP: {item.ip_address}
												</span>
											)}
										</div>
									</div>
								</div>
							);
						})}
					</div>
				)}

				{/* Nút Tải thêm dữ liệu & Phân trang */}
				{page < totalPages && (
					<div className="pt-6 flex justify-center border-t border-slate-100 dark:border-slate-800 mt-4">
						<button
							type="button"
							onClick={handleLoadMore}
							disabled={loading}
							className="h-10 px-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
						>
							<ArrowDownCircle className="w-4 h-4" strokeWidth={1.5} />
							<span>{loading ? "Đang tải thêm..." : "Tải Thêm Dữ Liệu"}</span>
						</button>
					</div>
				)}
			</div>
		</div>
	);
};
