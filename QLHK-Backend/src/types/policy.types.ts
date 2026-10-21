export interface ChucthoMilestones {
  age60: string; age65: string; age70: string; age75: string; age80: string;
  age85: string; age90: string; age95: string; age100: string; age_over_100: string;
}

export interface HtxhMilestones {
  age75plus: string; age70to74poor: string; bao_tro: string;
  huu_tri: string; huu_tuat_bao_hiem: string; nguoi_co_cong: string;
}

export interface ChucthoProfileDTO {
  id?: string; stt?: number | null; name: string; name_unaccented?: string | null;
  dob?: string | null; gender?: string | null; cccd?: string | null;
  cccd_hash?: string | null; cccd_last4?: string | null; ethnicity?: string | null;
  residence?: string | null; current_address?: string | null; village_id?: string | null;
  received?: boolean | null; calculation_year?: number | null; notes?: string | null;
  is_deleted?: boolean | null; version?: number | null;
}

export interface HtxhProfileDTO {
  id?: string; stt?: number | null; name: string; name_unaccented?: string | null;
  dob?: string | null; gender?: string | null; cccd?: string | null;
  cccd_hash?: string | null; cccd_last4?: string | null; ethnicity?: string | null;
  residence?: string | null; current_address?: string | null; village_id: string;
  received?: boolean | null; calculation_year?: number | null; notes?: string | null;
  is_deleted?: boolean | null; version?: number | null;
}

export interface PolicyQueryParams {
  page?: number; limit?: number; village_id?: string; search?: string;
  milestone?: string; category?: string; received?: boolean; calculation_year?: number;
}
