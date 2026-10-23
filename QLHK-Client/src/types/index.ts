export type Gender = "Nam" | "Nữ";

export type RelationshipType = string;

export interface Person {
	id: string;
	household_id: string;
	stt: number;
	full_name: string;
	last_name: string;
	first_name: string;
	name_unaccented: string;
	relationship: RelationshipType;
	is_head: boolean;
	gender: Gender;
	dob?: string;
	dob_raw: string;
	dob_formatted: string;
	birth_year: number;
	age: number;
	cccd: string;
	cccd_last4?: string;
	cccd_masked: string;
	ethnicity: string;
	is_minority: boolean;
	religion: string;
	education?: string;
	military_status?: string;
	occupation?: string;
	native_place?: string;
	address?: string;
	phone?: string;
	notes?: string;
}

export interface Household {
	id: string;
	code: string;
	book_number?: string;
	village_id: string;
	village_name: string;
	head_name: string;
	head_cccd?: string;
	address: string;
	status?: string;
	version?: number;
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
	module_access?: "all" | "qlhk" | "qlcs";
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
	isValid: boolean;
	errors: string[];
	warnings: string[];
}

export type TabType = "chuctho" | "htxh";

export interface Profile {
	id: string | number;
	stt?: number;
	village_id?: string | null;
	villageId?: string | number | null;
	name: string;
	dob: string;
	gender: string;
	cccd: string;
	ethnicity: string;
	residence: string;
	currentAddress: string;
	age60?: string;
	age65?: string;
	age70?: string;
	age75?: string;
	age80?: string;
	age85?: string;
	age90?: string;
	age95?: string;
	age100?: string;
	ageOver100?: string;
	received: boolean | number;
	notes?: string;
	_displayStatus?: string;
	version?: number;
}

export interface HtxhProfile {
	id: string | number;
	stt?: number;
	village_id?: string | null;
	villageId?: string | number | null;
	name: string;
	dob: string;
	gender: string;
	cccd: string;
	ethnicity: string;
	residence: string;
	currentAddress: string;
	age75plus?: string;
	age70to74poor?: string;
	baoTro?: string;
	huuTri?: string;
	huuTuatBaoHiem?: string;
	nguoiCoCong?: string;
	received: boolean | number;
	notes?: string;
	_displayStatus?: string;
	version?: number;
}

export type IPCResponse = {
	success: boolean;
	data?: any;
	error?: string;
	message?: string;
};

export type AuditLog = {
	id: string | number;
	action: string;
	changed_fields?: string;
	old_values?: string;
	new_values?: string;
	note?: string;
	created_at: string;
	username?: string;
};

export type SortKey =
	| "name"
	| "milestone"
	| "dob"
	| "stt"
	| "gender"
	| "cccd"
	| "residence"
	| "currentAddress"
	| "current_address"
	| "received"
	| null;

export type SortDirection = "asc" | "desc" | null;

