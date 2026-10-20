import { describe, expect, it } from "vitest";
import { calculateAge, parseAndValidateDob } from "../../src/utils/date";

describe("repro_bug_003: hardcoded 2026 calculation year in Excel import handler", () => {
	it("fails when imported member age is hardcoded to 2026 instead of dynamic calculationYear (INV-04)", () => {
		const calculationYear = 2024;
		const dobRaw = "01/01/2010";

		const dobVal = parseAndValidateDob(dobRaw);
		const dobFormatted = dobVal.formatted || dobRaw;

		const simulatedImportedMemberAge = calculateAge(dobFormatted, 2026);

		expect(simulatedImportedMemberAge).toBe(calculateAge(dobFormatted, calculationYear));
	});
});
