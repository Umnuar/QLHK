import { useCallback, useEffect, useMemo, useState } from "react";
import {
	type FluctuationResult,
	clearFluctuationSnapshot,
	loadFluctuationSnapshot,
	processFluctuations,
	saveFluctuationSnapshot,
} from "../utils/fluctuationTracker";

export interface UseAnalyticsFluctuationReturn {
	trends: Record<string, FluctuationResult>;
	getTrend: (key: string) => FluctuationResult;
	clearTrends: () => void;
}

export function useAnalyticsFluctuation(
	villageId: string | undefined | null,
	year: number,
	metrics: Record<string, number> | null,
	isLoaded: boolean = true,
): UseAnalyticsFluctuationReturn {
	const [trends, setTrends] = useState<Record<string, FluctuationResult>>({});

	const metricsSerialized = useMemo(() => {
		if (!metrics || !isLoaded) return "";
		return JSON.stringify(metrics);
	}, [metrics, isLoaded]);

	useEffect(() => {
		if (!metrics || !isLoaded) {
			return;
		}

		const savedSnapshot = loadFluctuationSnapshot(villageId, year);
		const { updatedSnapshot, trends: calculatedTrends } = processFluctuations(
			metrics,
			savedSnapshot,
			new Date(),
		);

		saveFluctuationSnapshot(villageId, year, updatedSnapshot);
		setTrends(calculatedTrends);
	}, [villageId, year, metricsSerialized, isLoaded]);

	const clearTrends = useCallback(() => {
		clearFluctuationSnapshot(villageId, year);
		if (metrics) {
			const { updatedSnapshot, trends: initialTrends } = processFluctuations(
				metrics,
				null,
				new Date(),
			);
			saveFluctuationSnapshot(villageId, year, updatedSnapshot);
			setTrends(initialTrends);
		} else {
			setTrends({});
		}
	}, [villageId, year, metrics]);

	const getTrend = useCallback(
		(key: string): FluctuationResult => {
			return trends[key] || { diff: 0, timestamp: null };
		},
		[trends],
	);

	return {
		trends,
		getTrend,
		clearTrends,
	};
}
