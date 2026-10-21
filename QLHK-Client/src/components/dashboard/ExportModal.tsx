import { ExportSettingsModal } from "../excel/ExportSettingsModal";

export interface ExportModalProps {
	isExportModalOpen: boolean;
	setIsExportModalOpen: (b: boolean) => void;
	isDarkMode?: boolean;
	panelClass?: string;
	softTextClass?: string;
	totalFiltered?: number;
	isGlobal?: boolean;
	executeExport: (modalOptions?: any) => void;
	isExporting: boolean;
	villages?: { id: string | number; name: string }[];
	selectedIds: Set<any>;
	activeTab?: string;
	filters?: any;
	villageName?: string;
}

export function ExportModal({
	isExportModalOpen,
	setIsExportModalOpen,
	executeExport,
	isExporting,
	selectedIds,
	activeTab,
	villageName,
}: ExportModalProps) {
	const handleExport = (config: any) => {
		executeExport({
			exportSelectedOnly: config === "selected" || config?.scope === "selected",
			selectedIds,
			config,
		});
	};

	return (
		<ExportSettingsModal
			isOpen={isExportModalOpen}
			onClose={() => setIsExportModalOpen(false)}
			onExport={handleExport}
			exporting={isExporting}
			selectedCount={selectedIds?.size ?? 0}
			villageName={villageName}
		/>
	);
}
