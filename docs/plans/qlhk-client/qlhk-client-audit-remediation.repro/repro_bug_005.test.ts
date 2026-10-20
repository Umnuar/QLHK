import { describe, expect, it } from "vitest";
import type { AnalyticsOverviewData } from "../../src/api/analyticsApi";

describe("repro_bug_005: AnalyticsDashboard copies youth into militaryAge and adult into workingAge", () => {
	it("demonstrates militaryAge being overwritten by youth due to precedence order in ageStats", () => {
		const apiOverview: AnalyticsOverviewData = {
			totalHouseholds: 100,
			totalCitizens: 400,
			averageHouseholdSize: 4,
			gender: {
				male: { count: 200, percentage: 50 },
				female: { count: 200, percentage: 50 },
			},
			ethnicities: [],
			religions: [],
			ageGroups: {
				under16: { count: 80, percentage: 20 },
				youth: { count: 120, percentage: 30 },
				militaryAge: { count: 45, percentage: 11.25 },
				adult: { count: 180, percentage: 45 },
				workingAge: { count: 210, percentage: 52.5 },
				over60: { count: 20, percentage: 5 },
			},
		};

		const localCalculatedFallback = {
			stats: {
				ageStats: {
					militaryAge: { count: 0, percentage: 0 },
					workingAge: { count: 0, percentage: 0 },
				},
			},
		};

		const actualMilitaryAgeAssigned =
			apiOverview.ageGroups?.youth ||
			apiOverview.ageGroups?.militaryAge ||
			localCalculatedFallback.stats.ageStats.militaryAge;

		const actualWorkingAgeAssigned =
			apiOverview.ageGroups?.adult ||
			apiOverview.ageGroups?.workingAge ||
			localCalculatedFallback.stats.ageStats.workingAge;

		expect(actualMilitaryAgeAssigned.count).toBe(apiOverview.ageGroups!.militaryAge.count);
		expect(actualWorkingAgeAssigned.count).toBe(apiOverview.ageGroups!.workingAge.count);
	});
});
