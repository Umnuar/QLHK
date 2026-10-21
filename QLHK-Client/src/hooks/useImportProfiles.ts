import { useCallback, useEffect, useRef, useState } from "react";
import { excelApi } from "../api/excelApi";
import { useModal } from "./useModal";
import {
	type ExcelHeaderExtractionResult,
	extractExcelHeaders,
	parseExcelWithMapping,
	suggestColumnMapping,
} from "../utils/excelParser";
import type { TabType } from "../types";
import type {
	ExcelMappingData,
	ImportPreviewData,
	ImportResultData,
	ImportStep,
} from "./useImportExportTypes";

export function useImportProfiles(
	villageId: string | undefined,
	activeTab: TabType,
	loadProfiles: () => Promise<void>,
	globalCalculationYear?: number,
) {
	const [isImportModalOpen, setIsImportModalOpen] = useState(false);
	const [isImporting, setIsImporting] = useState(false);
	const [importProgress, setImportProgress] = useState(0);
	const [importStep, setImportStep] = useState<ImportStep>("upload");
	const [mappingData, setMappingData] = useState<ExcelMappingData | null>(null);
	const [customMapping, setCustomMapping] = useState<Record<string, string>>({});
	const [previewData, setPreviewData] = useState<ImportPreviewData | null>(null);
	const [importResult, setImportResult] = useState<ImportResultData | null>(null);

	const fileInputRef = useRef<HTMLInputElement>(null);
	const { showAlert } = useModal();
	const isMounted = useRef(true);

	useEffect(() => {
		isMounted.current = true;
		return () => {
			isMounted.current = false;
		};
	}, []);

	const handleFileUpload = useCallback(
		async (e: React.ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0];
			if (!file) return;

			setIsImporting(true);
			setImportProgress(20);
			setImportResult(null);

			try {
				const extracted: ExcelHeaderExtractionResult = await extractExcelHeaders(file);
				if (!isMounted.current) return;

				if (extracted.headers.length === 0 || extracted.rawRows.length === 0) {
					showAlert({
						title: "File Excel rỗng",
						message: "File Excel không chứa bất kỳ tiêu đề hoặc dòng dữ liệu nào. Vui lòng kiểm tra lại cấu trúc file.",
						type: "warning",
					});
					setIsImporting(false);
					setImportProgress(0);
					return;
				}

				setImportProgress(50);
				const targetType = extracted.detectedType || activeTab;
				const suggested = suggestColumnMapping(extracted.headers, targetType);

				const mappingPayload: ExcelMappingData = {
					headers: extracted.headers,
					rawRows: extracted.rawRows,
					sampleRows: extracted.sampleRows,
					suggestedMapping: suggested,
					fileName: file.name,
					detectedType: targetType,
				};

				setMappingData(mappingPayload);
				setCustomMapping(suggested);

				const hasName = Boolean(suggested.name);
				const hasDob = Boolean(suggested.dob);
				const hasGender = Boolean(suggested.gender || (suggested.genderNam && suggested.genderNu));
				const targetYear = globalCalculationYear || new Date().getFullYear();

				if (hasName && hasDob && hasGender) {
					const parseResult = parseExcelWithMapping(
						extracted.rawRows,
						suggested,
						activeTab,
						targetYear,
					);

					setPreviewData({
						profiles: parseResult.profiles,
						warnings: parseResult.warnings,
						stats: parseResult.stats,
						activeTab,
						fileName: file.name,
					});

					setImportStep("preview");
				} else {
					setPreviewData(null);
					setImportStep("mapping");
				}

				setImportProgress(100);
			} catch (err: any) {
				console.error("Excel parse error:", err);
				if (isMounted.current) {
					showAlert({
						title: "Lỗi đọc file Excel",
						message: err?.message || "Không thể phân tích dữ liệu file Excel.",
						type: "error",
					});
					setMappingData(null);
					setPreviewData(null);
					setImportStep("upload");
				}
			} finally {
				if (isMounted.current) {
					setIsImporting(false);
					if (fileInputRef.current) fileInputRef.current.value = "";
				}
			}
		},
		[activeTab, globalCalculationYear, showAlert],
	);

	const applyMapping = useCallback(
		(newMapping: Record<string, string>) => {
			if (!mappingData) return;

			if (!newMapping.name) {
				showAlert({
					title: "Chưa khớp cột Họ và tên",
					message: "Trường 'Họ và tên' là bắt buộc. Vui lòng chọn cột tương ứng.",
					type: "warning",
				});
				return;
			}

			if (!newMapping.dob) {
				showAlert({
					title: "Chưa khớp cột Ngày / Năm sinh",
					message: "Trường 'Ngày / Năm sinh' là bắt buộc. Vui lòng chọn cột tương ứng.",
					type: "warning",
				});
				return;
			}

			const targetYear = globalCalculationYear || new Date().getFullYear();
			const parseResult = parseExcelWithMapping(
				mappingData.rawRows,
				newMapping,
				activeTab,
				targetYear,
			);

			if (parseResult.profiles.length === 0) {
				showAlert({
					title: "Không có dữ liệu hợp lệ",
					message: "Không tìm thấy dòng hồ sơ nào sau khi áp dụng ánh xạ cột này. Vui lòng kiểm tra lại cấu hình cột.",
					type: "warning",
				});
				return;
			}

			setCustomMapping(newMapping);
			setPreviewData({
				profiles: parseResult.profiles,
				warnings: parseResult.warnings,
				stats: parseResult.stats,
				activeTab,
				fileName: mappingData.fileName,
			});

			setImportStep("preview");
		},
		[activeTab, globalCalculationYear, mappingData, showAlert],
	);

	const goToMappingStep = useCallback(() => {
		if (mappingData) setImportStep("mapping");
	}, [mappingData]);

	const goToUploadStep = useCallback(() => {
		setMappingData(null);
		setCustomMapping({});
		setPreviewData(null);
		setImportResult(null);
		setImportStep("upload");
		setIsImporting(false);
		setImportProgress(0);
		if (fileInputRef.current) fileInputRef.current.value = "";
	}, []);

	const confirmImport = useCallback(
		async (customConfig?: { selectedVillageId?: string; calculationYear?: number }) => {
			if (!previewData || previewData.profiles.length === 0) {
				setIsImporting(false);
				setPreviewData(null);
				return;
			}

			setIsImporting(true);
			setImportProgress(25);

			try {
				const targetVillage = customConfig?.selectedVillageId || villageId || undefined;
				const targetYear = customConfig?.calculationYear || globalCalculationYear || new Date().getFullYear();

				setImportProgress(50);
				const res = await excelApi.importProfiles({
					type: activeTab,
					villageId: targetVillage,
					calculationYear: targetYear,
					profiles: previewData.profiles,
					fileName: previewData.fileName,
				});

				setImportProgress(90);
				const allErrors: string[] = [];
				if (Array.isArray(res.errorDetails) && res.errorDetails.length > 0) {
					res.errorDetails.forEach((errItem: any) => {
						if (typeof errItem === "string") {
							allErrors.push(errItem);
						} else {
							allErrors.push(`Dòng ${errItem.row || "?"} (${errItem.name || "Không rõ"}): ${errItem.error || "Lỗi không xác định"}`);
						}
					});
				}

				if (isMounted.current) {
					setImportResult({
						created: res.inserted || 0,
						updated: res.updated || 0,
						failed: res.failed || allErrors.length,
						errors: allErrors,
						total: previewData.profiles.length,
					});

					setImportStep("result");
					await loadProfiles();
				}
			} catch (err: any) {
				console.error("Import API error:", err);
				if (isMounted.current) {
					showAlert({
						title: "Lỗi nạp dữ liệu",
						message: err?.response?.data?.error || err?.message || "Có lỗi xảy ra khi lưu dữ liệu vào hệ thống.",
						type: "error",
					});
				}
			} finally {
				if (isMounted.current) {
					setIsImporting(false);
					setImportProgress(100);
				}
			}
		},
		[activeTab, globalCalculationYear, loadProfiles, previewData, showAlert, villageId],
	);

	const cancelImport = useCallback(() => {
		setMappingData(null);
		setCustomMapping({});
		setPreviewData(null);
		setImportResult(null);
		setImportStep("upload");
		setIsImporting(false);
		setImportProgress(0);
		if (fileInputRef.current) fileInputRef.current.value = "";
	}, []);

	return {
		isImportModalOpen,
		setIsImportModalOpen,
		isImporting,
		setIsImporting,
		importProgress,
		setImportProgress,
		importStep,
		setImportStep,
		mappingData,
		setMappingData,
		customMapping,
		setCustomMapping,
		previewData,
		setPreviewData,
		importResult,
		setImportResult,
		fileInputRef,
		handleFileUpload,
		applyMapping,
		goToMappingStep,
		goToUploadStep,
		confirmImport,
		cancelImport,
	};
}
