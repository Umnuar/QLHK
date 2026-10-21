import type { SystemField } from './policyExcelTypes';
import { BASE_SYSTEM_FIELDS } from './policyExcelBaseFields';
import { POLICY_SYSTEM_FIELDS } from './policyExcelCategoryFields';

export const SYSTEM_FIELDS: SystemField[] = [
	...BASE_SYSTEM_FIELDS,
	...POLICY_SYSTEM_FIELDS,
];
