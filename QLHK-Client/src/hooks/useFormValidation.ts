import { useCallback, useState } from "react";

export interface ValidationIssue {
	path: (string | number)[];
	message: string;
}

export interface ValidationSchema<T> {
	safeParse: (data: unknown) => {
		success: boolean;
		data?: T;
		error?: { issues: ValidationIssue[] };
	};
}

export interface ValidationResult {
	errors: Record<string, string>;
	isValid: boolean;
}

export function useFormValidation<T extends Record<string, any>>(
	schema: ValidationSchema<T>,
) {
	const [errors, setErrors] = useState<Record<string, string>>({});

	const validate = useCallback(
		(data: T): ValidationResult => {
			const result = schema.safeParse(data);
			if (result.success) {
				setErrors({});
				return { errors: {}, isValid: true };
			}
			const fieldErrors: Record<string, string> = {};
			const zodError = result.error;
			if (zodError?.issues) {
				for (const issue of zodError.issues) {
					const path = issue.path.join(".");
					if (!fieldErrors[path]) {
						fieldErrors[path] = issue.message;
					}
				}
			}
			setErrors(fieldErrors);
			return { errors: fieldErrors, isValid: false };
		},
		[schema],
	);

	const clearErrors = useCallback(() => setErrors({}), []);

	const getError = useCallback(
		(field: string): string | undefined => {
			return errors[field];
		},
		[errors],
	);

	return { errors, validate, clearErrors, getError };
}
