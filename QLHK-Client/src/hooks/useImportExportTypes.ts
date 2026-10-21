import type { ParsedProfile, ParseWarning } from "../utils/policyExcelTypes";
import type { TabType } from "../types";

export type ImportStep = "upload" | "mapping" | "preview" | "result";

export interface ExcelMappingData {
	headers: string[];
	rawRows: Record<string, any>[];
	sampleRows: Record<string, any>[];
	suggestedMapping: Record<string, string>;
	fileName: string;
	detectedType?: "chuctho" | "htxh";
}

export interface ImportPreviewData {
	profiles: ParsedProfile[];
	warnings: ParseWarning[];
	stats: {
		totalRows: number;
		validRows: number;
		warningRows: number;
	};
	activeTab: TabType;
	fileName: string;
}

export interface ImportResultData {
	created: number;
	updated: number;
	failed: number;
	errors: string[];
	total: number;
}

export interface ImportExportFilters {
	search?: string;
	statusFilter?: string;
	ageFilters?: string[];
	villageFilters?: number[];
	genderFilter?: string;
	ethnicityFilter?: string;
	residenceFilter?: string;
	sortKey?: string | null;
	sortDirection?: string | null;
}
