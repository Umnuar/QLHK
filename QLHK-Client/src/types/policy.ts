export interface PolicyProfile {
	id: string;
	stt?: number;
	village_id?: string | null;
	name: string;
	dob?: string;
	gender?: string;
	cccd?: string;
	ethnicity?: string;
	residence?: string;
	currentAddress?: string;
	received: boolean;
	notes?: string;
	calculation_year?: number;
	[key: string]: any;
}

export interface PolicyQueryParams {
	search?: string;
	villageId?: string;
	milestone?: string;
	category?: string;
	received?: boolean | string;
	calculationYear?: number;
	page?: number;
	limit?: number;
}

export interface PolicyPaginationResponse<T = PolicyProfile> {
	data: T[];
	total: number;
	page?: number;
	limit?: number;
	totalPages?: number;
}

export interface PolicyAnalyticsSummary {
	chuctho: {
		total: number;
		received: number;
		unreceived: number;
		completionRate: number;
		milestones?: Record<string, number>;
	};
	htxh: {
		total: number;
		received: number;
		unreceived: number;
		completionRate: number;
		categories?: Record<string, number>;
	};
	villageBreakdown?: Array<{
		village_id: string;
		village_name: string;
		chuctho_total: number;
		chuctho_received: number;
		htxh_total: number;
		htxh_received: number;
	}>;
}
