import {
	BarChart3,
	Database,
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
import { useApp } from "../../AppContext";

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

	let navItems: any[] = [];

	if (user?.role === "admin") {
		navItems = [
			{
				id: "villages",
				label: "Quản Lý Thôn",
				icon: Map,
			},
			...(selectedVillageId
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
			{
				id: "recycle-bin",
				label: "Thùng Rác",
				icon: Trash2,
			},
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
	} else {
		navItems = [
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
			{
				id: "recycle-bin",
				label: "Thùng Rác",
				icon: Trash2,
			},
		];
	}

	return (
		<>
			{!isSidebarCollapsed && (
				<div
					className="fixed inset-0 bg-slate-950/45 dark:bg-black/60 z-30 md:hidden animate-in fade-in duration-200"
					onClick={toggleSidebar}
				/>
			)}
			<aside
				className={`bg-slate-950 text-slate-300 flex flex-col shrink-0 border-r border-slate-800/80 select-none transition-all duration-200 ease-out overflow-hidden ${
					isSidebarCollapsed
						? "w-14 sm:w-16"
						: "max-md:fixed max-md:inset-y-0 max-md:left-0 max-md:z-40 max-md:shadow-2xl w-64"
				}`}
			>
				<div className="p-3 flex items-center justify-between border-b border-slate-900 min-h-[56px] overflow-hidden">
					{!isSidebarCollapsed ? (
						<>
							<div className="text-xs font-black text-slate-400 uppercase tracking-widest px-2 flex items-center gap-2 whitespace-nowrap overflow-hidden">
								<Database className="w-4 h-4 text-emerald-400 shrink-0" />
								<span>DANH MỤC</span>
							</div>
							<button
								type="button"
								onClick={toggleSidebar}
								className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-900 rounded-xl transition-all cursor-pointer shrink-0"
							>
								<PanelLeftClose className="w-4 h-4" />
							</button>
						</>
					) : (
						<button
							type="button"
							onClick={toggleSidebar}
							className="w-full flex items-center justify-center p-2 text-slate-400 hover:text-white hover:bg-slate-900 rounded-xl transition-all cursor-pointer"
						>
							<PanelLeftOpen className="w-4 h-4" />
						</button>
					)}
				</div>

				<div className="p-2.5 flex-1 overflow-y-auto overflow-x-hidden">
					<nav className="flex flex-col gap-2">
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
									className={`flex items-center gap-3 rounded-2xl transition-all duration-150 relative cursor-pointer overflow-hidden ${
										isSidebarCollapsed
											? "w-12 h-12 justify-center shrink-0 mx-auto"
											: "w-full py-2.5 px-3 min-h-[44px]"
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
										className={`overflow-hidden whitespace-nowrap transition-all duration-200 ease-out text-left ${
											isSidebarCollapsed
												? "max-w-0 opacity-0 pointer-events-none hidden"
												: "max-w-[180px] opacity-100 flex-1 flex items-center justify-between"
										}`}
									>
										<span className="text-[13.5px] tracking-tight font-bold">
											{item.label}
										</span>
										{item.badge && (
											<span
												className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider ml-1.5 ${
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
									<div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50 px-3.5 py-2 bg-slate-900 text-white text-xs font-bold rounded-2xl shadow-2xl border border-slate-700/90 whitespace-nowrap pointer-events-none opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150">
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

			<div className="p-3.5 border-t border-slate-900 bg-slate-950 text-xs text-slate-400 overflow-hidden">
				{!isSidebarCollapsed ? (
					<div className="space-y-1 whitespace-nowrap overflow-hidden">
						<div className="flex items-center gap-2 text-slate-200 font-bold text-xs">
							<ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
							<span>QLHK v1.0.0</span>
						</div>
					</div>
				) : (
					<div className="flex justify-center">
						<ShieldCheck className="w-4 h-4 text-emerald-400" />
					</div>
				)}
			</div>
		</aside>
	</>
	);
};
