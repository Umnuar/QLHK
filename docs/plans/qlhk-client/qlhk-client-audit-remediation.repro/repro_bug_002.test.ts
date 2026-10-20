import { beforeEach, describe, expect, it } from "vitest";
import { apiClient, setCachedAccessToken } from "../../src/api/client";
import { secureStorage } from "../../src/utils/secureStorage";

describe("repro_bug_002: offline token leaked into Authorization header", () => {
	beforeEach(async () => {
		setCachedAccessToken(null);
		await secureStorage.clear();
	});

	it("should not attach offline-token- to outgoing HTTP request Authorization header", async () => {
		const offlineToken = "offline-token-user-12345";
		await secureStorage.setItem("accessToken", offlineToken);

		const requestHandler = (apiClient.interceptors.request as any).handlers[0]?.fulfilled;
		const config = { headers: {} as any };
		const result = await requestHandler(config);

		expect(result.headers.Authorization).toBeUndefined();
	});
});
