import {
	Award,
	BarChart2,
	BarChart3,
	Database,
	HeartHandshake,
	History,
	Map,
	PanelLeftClose,
	PanelLeftOpen,
	Settings as SettingsIcon,
	ShieldCheck,
	Trash2,
	Users,
} from "lucide-react";
import type React from "react";
import { useMemo } from "react";
import { useApp } from "../../AppContext";

interface NavItem {
	id: string;
	label: string;
	icon: React.ComponentType<{ className?: string }>;
	badge?: string;
}

export const Sidebar: React.FC = () => {
	const {
		activeTab,
		setActiveTab,
		user,
		isSidebarCollapsed,
		toggleSidebar,
		setSidebarCollapsed,
		setSelectedVillageId,
		selectedVillageId,
	} = useApp();

	const isQlcsOnly = user?.module_access === "qlcs";
	const isQlhkOnly = user?.module_access === "qlhk";

	const showPolicyItems =
		!isQlhkOnly &&
		(isQlcsOnly ||
			Boolean(selectedVillageId) ||
			activeTab === "analytics" ||
			activeTab === "chuctho" ||
			activeTab === "htxh" ||
			activeTab === "policy-analytics");

	const showHouseholdItems =
		!isQlcsOnly &&
		(user?.role !== "admin" ||
			Boolean(selectedVillageId) ||
			activeTab === "analytics");

	const navItems = useMemo<NavItem[]>(() => {
		if (user?.role === "admin") {
			return [
				...(!isQlcsOnly
					? [
							{
								id: "villages",
								label: "Quản Lý Thôn",
								icon: Map,
							},
						]
					: []),
				...(showHouseholdItems
					? [
							{
								id: "analytics",
								label: "Thống Kê",
								icon: BarChart3,
								badge: "Chính",
							},
							{
								id: "households",
								label: "Hộ Gia Đình",
								icon: Users,
							},
						]
					: []),
				...(showPolicyItems
					? [
							{
								id: "chuctho",
								label: "Chúc Thọ",
								icon: Award,
							},
							{
								id: "htxh",
								label: "Hỗ Trợ Xã Hội",
								icon: HeartHandshake,
							},
							{
								id: "policy-analytics",
								label: "TK Chính Sách",
								icon: BarChart2,
							},
						]
					: []),
				...(!isQlcsOnly
					? [
							{
								id: "recycle-bin",
								label: "Thùng Rác",
								icon: Trash2,
							},
						]
					: []),
				{
					id: "audit",
					label: "Nhật Ký Hoạt Động",
					icon: History,
				},
				{
					id: "settings",
					label: "Cài Đặt Hệ Thống",
					icon: SettingsIcon,
				},
			];
		}

		return [
			...(showHouseholdItems
				? [
						{
							id: "households",
							label: "Hộ Gia Đình",
							icon: Users,
						},
						{
							id: "analytics",
							label: "Thống Kê",
							icon: BarChart3,
							badge: "Chính",
						},
					]
				: []),
			...(showPolicyItems
				? [
						{
							id: "chuctho",
							label: "Chúc Thọ",
							icon: Award,
						},
						{
							id: "htxh",
							label: "Hỗ Trợ Xã Hội",
							icon: HeartHandshake,
						},
						{
							id: "policy-analytics",
							label: "TK Chính Sách",
							icon: BarChart2,
						},
					]
				: []),
			...(!isQlcsOnly
				? [
						{
							id: "recycle-bin",
							label: "Thùng Rác",
							icon: Trash2,
						},
					]
				: []),
		];
	}, [user?.role, isQlcsOnly, showHouseholdItems, showPolicyItems]);

	return (
		<>
			<div
				className={`fixed inset-0 bg-slate-950/50 backdrop-blur-xs z-30 md:hidden transition-opacity duration-200 ease-out ${
					isSidebarCollapsed
						? "opacity-0 pointer-events-none"
						: "opacity-100 pointer-events-auto"
				}`}
				onClick={toggleSidebar}
				aria-hidden="true"
			/>
			<aside
				className={`bg-slate-950 text-slate-300 flex flex-col shrink-0 border-r border-slate-800/80 select-none transition-all duration-200 ease-out overflow-hidden ${
					isSidebarCollapsed
						? "w-14 sm:w-16"
						: "w-64 max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-40 max-md:shadow-2xl"
				}`}
			>
				<div className="p-3 flex items-center justify-between border-b border-slate-900 h-14 min-h-[56px] overflow-hidden">
					<div
						className={`flex items-center text-xs font-black text-slate-400 uppercase tracking-widest whitespace-nowrap overflow-hidden transition-all duration-200 ease-in-out ${
							isSidebarCollapsed
								? "max-w-0 opacity-0 pointer-events-none"
								: "max-w-[160px] opacity-100 px-2 gap-2"
						}`}
					>
						<Database className="w-4 h-4 text-emerald-400 shrink-0" />
						<span className="truncate">DANH MỤC</span>
					</div>
					<button
						type="button"
						onClick={toggleSidebar}
						aria-label={
							isSidebarCollapsed
								? "Mở rộng thanh điều hướng"
								: "Thu gọn thanh điều hướng"
						}
						title={
							isSidebarCollapsed
								? "Mở rộng thanh điều hướng"
								: "Thu gọn thanh điều hướng"
						}
						className={`p-2 text-slate-400 hover:text-white hover:bg-slate-900 rounded-xl transition-all cursor-pointer shrink-0 ${
							isSidebarCollapsed ? "w-full flex items-center justify-center" : ""
						}`}
					>
						{isSidebarCollapsed ? (
							<PanelLeftOpen className="w-4 h-4" />
						) : (
							<PanelLeftClose className="w-4 h-4" />
						)}
					</button>
				</div>

				<div className="p-2 sm:p-2.5 flex-1 overflow-y-auto overflow-x-hidden">
					<nav className="flex flex-col gap-1.5 sm:gap-2">
						{navItems.map((item) => {
							const Icon = item.icon;
							const isActive = activeTab === item.id;

							return (
								<div
									key={item.id}
									className="relative group flex justify-center w-full"
								>
									<button
										type="button"
										onClick={() => {
											if (item.id === "villages") {
												setSelectedVillageId("");
											}
											setActiveTab(item.id);
											if (typeof window !== "undefined" && window.innerWidth < 768) {
												setSidebarCollapsed(true);
											}
										}}
										aria-label={item.label}
										className={`flex items-center rounded-2xl transition-all duration-200 relative cursor-pointer overflow-hidden h-11 ${
											isSidebarCollapsed
												? "w-10 sm:w-11 justify-center px-0 mx-auto"
												: "w-full px-3"
										} ${
											isActive
												? "bg-emerald-600 text-white shadow-md shadow-emerald-950/30"
												: "text-slate-400 hover:text-emerald-400 hover:bg-slate-800/50"
										}`}
									>
										<Icon
											className={`w-5 h-5 shrink-0 ${isActive ? "text-white" : ""}`}
										/>

										<div
											className={`flex items-center justify-between min-w-0 overflow-hidden whitespace-nowrap transition-all duration-200 ease-in-out ${
												isSidebarCollapsed
													? "max-w-0 opacity-0 pointer-events-none -ml-0"
													: "max-w-[180px] opacity-100 flex-1 ml-3"
											}`}
										>
											<span className="text-[13.5px] tracking-tight font-bold truncate">
												{item.label}
											</span>
											{item.badge && (
												<span
													className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider ml-1.5 shrink-0 ${
														isActive
															? "bg-emerald-800/90 text-emerald-100"
															: "bg-slate-800 text-slate-300"
													}`}
												>
													{item.badge}
												</span>
											)}
										</div>
									</button>

									{isSidebarCollapsed && (
										<div className="hidden sm:block absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50 px-3.5 py-2 bg-slate-900 text-white text-xs font-bold rounded-2xl shadow-2xl border border-slate-700/90 whitespace-nowrap pointer-events-none opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150">
											<div className="flex items-center gap-1.5">
												<span className="text-sm">{item.label}</span>
												{item.badge && (
													<span className="text-[9px] font-bold px-1 py-0.5 rounded bg-emerald-700 text-white uppercase">
														{item.badge}
													</span>
												)}
											</div>
										</div>
									)}
								</div>
							);
						})}
					</nav>
				</div>

				<div className="p-3.5 border-t border-slate-900 bg-slate-950 text-xs text-slate-400 overflow-hidden h-14 min-h-[56px] flex items-center">
					<div
						className={`flex items-center whitespace-nowrap overflow-hidden transition-all duration-200 ease-in-out w-full ${
							isSidebarCollapsed ? "justify-center" : "justify-start px-1"
						}`}
					>
						<ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
						<div
							className={`overflow-hidden whitespace-nowrap transition-all duration-200 ease-in-out text-slate-200 font-bold text-xs ${
								isSidebarCollapsed
									? "max-w-0 opacity-0 pointer-events-none -ml-0"
									: "max-w-[160px] opacity-100 ml-2"
							}`}
						>
							QLHK v1.5.0
						</div>
					</div>
				</div>
			</aside>
		</>
	);
};
