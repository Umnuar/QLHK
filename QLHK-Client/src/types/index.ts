export type Gender = "Nam" | "Nữ";

export type RelationshipType =
	| "Chủ hộ"
	| "Thành viên"
	| "Vợ"
	| "Chồng"
	| "Con đẻ"
	| "Con dâu"
	| "Con rể"
	| "Cháu"
	| "Bố"
	| "Mẹ"
	| "Ông"
	| "Bà"
	| "Anh"
	| "Chị"
	| "Em"
	| "Khác";

export interface Person {
	id: string;
	household_id: string;
	stt: number;
	full_name: string;
	last_name: string;
	first_name: string;
	name_unaccented: string;
	relationship: RelationshipType;
	is_head: boolean; // true = Chủ hộ (CH)
	gender: Gender;
	dob?: string; // Ngày sinh
	dob_raw: string; // Ngày sinh thô: '24/07/1988' hoặc '05/1985' hoặc '1960'
	dob_formatted: string; // Chuẩn hóa
	birth_year: number; // Năm sinh
	age: number; // Tuổi
	cccd: string; // CCCD 12 số
	cccd_last4?: string; // 4 số cuối
	cccd_masked: string; // ••••••••1234
	ethnicity: string; // 1 trong 14 dân tộc
	is_minority: boolean; // Dân tộc thiểu số (khác Kinh)
	religion: string; // Công giáo, Tin lành, Phật giáo, Không...
	occupation?: string; // Nghề nghiệp
	address?: string;
	phone?: string;
	notes?: string;
}

export interface Household {
	id: string;
	code: string; // Mã hộ (ví dụ: HK-TH1-001)
	book_number?: string; // Số sổ hộ khẩu (ví dụ: SHK-01024)
	village_id: string;
	village_name: string;
	head_name: string;
	head_cccd?: string;
	address: string;
	status?: string; // Trạng thái ('Thường trú' | 'Tạm trú' | 'Chuyển đi')
	version?: number; // Optimistic Concurrency Control
	members_count: number;
	members: Person[];
	is_deleted: boolean;
	deleted_at?: string | null;
	created_at: string;
	updated_at: string;
	notes?: string;
}

export interface User {
	id: string;
	username: string;
	role: "admin" | "user";
	village_id: string | null;
	full_name?: string;
	created_at?: string;
	is_online?: boolean;
}

export interface Village {
	id: string;
	name: string;
	short_code: string;
}

export interface KpiStats {
	totalHouseholds: number;
	totalMembers: number;
	maleCount: number;
	femaleCount: number;
	malePercentage: number;
	femalePercentage: number;
	minorityCount: number;
	minorityPercentage: number;
}

export interface EthnicDistribution {
	name: string;
	count: number;
	percentage: number;
	isMinority: boolean;
}

export interface VillageStatRow {
	village_id: string;
	village_name: string;
	households_count: number;
	members_count: number;
	male_count: number;
	female_count: number;
	minority_count: number;
	minority_percentage: number;
}

export interface ExcelImportRow {
	rowIndex: number;
	stt?: number | string;
	code?: string;
	village_name?: string;
	full_name: string;
	relationship: string;
	dob_raw: string;
	gender: string;
	ethnicity: string;
	religion: string;
	cccd: string;
	address: string;
	notes?: string;
	// Validation status
	isValid: boolean;
	errors: string[];
	warnings: string[];
}
