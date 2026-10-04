import React, { Suspense, lazy } from "react";
import { useApp } from "./AppContext";
import { LoginView } from "./components/auth/LoginView";
import { AppLayout } from "./components/layout/AppLayout";
import { HouseholdsPage } from "./pages/HouseholdsPage";
import { VillagesPage } from "./pages/VillagesPage";

// Code-splitting via React.lazy() for sub-pages
const AnalyticsPage = lazy(() =>
	import("./pages/AnalyticsPage").then((m) => ({ default: m.AnalyticsPage }))
);
const RecycleBinPage = lazy(() =>
	import("./pages/RecycleBinPage").then((m) => ({ default: m.RecycleBinPage }))
);
const SettingsPage = lazy(() =>
	import("./pages/SettingsPage").then((m) => ({ default: m.SettingsPage }))
);
const AuditLogView = lazy(() =>
	import("./components/audit/AuditLogView").then((m) => ({ default: m.AuditLogView }))
);

const PageLoadingSpinner: React.FC = () => (
	<div className="flex flex-col items-center justify-center py-20 min-h-[300px]">
		<div className="w-8 h-8 border-3 border-emerald-500/20 border-t-emerald-600 rounded-full animate-spin mb-3" />
		<span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
			Đang tải dữ liệu phân hệ...
		</span>
	</div>
);

export const App: React.FC = () => {
	const { user, isInitializing, activeTab } = useApp();

	if (isInitializing) {
		return (
			<div className="min-h-screen w-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center text-slate-900 dark:text-white">
				<div className="w-10 h-10 border-3 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mb-4" />
				<div className="text-sm font-semibold text-slate-600 dark:text-slate-300">
					Đang khởi tạo phiên làm việc Quản lý Hộ khẩu...
				</div>
			</div>
		);
	}

	if (!user) {
		return <LoginView />;
	}

	return (
		<AppLayout>
			<Suspense fallback={<PageLoadingSpinner />}>
				{activeTab === "villages" && <VillagesPage />}
				{activeTab === "households" && <HouseholdsPage />}
				{activeTab === "analytics" && <AnalyticsPage />}
				{activeTab === "recycle-bin" && <RecycleBinPage />}
				{activeTab === "audit" &&
					(user?.role === "admin" ? <AuditLogView /> : <HouseholdsPage />)}
				{activeTab === "settings" && <SettingsPage />}
			</Suspense>
		</AppLayout>
	);
};

export default App;

