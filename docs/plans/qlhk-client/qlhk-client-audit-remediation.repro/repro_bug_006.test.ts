import { beforeEach, describe, expect, it } from "vitest";
import {
	SESSION_USER_STORE_KEY,
	USERS_CACHE_STORE_KEY,
	getStoredSessionUser,
	saveStoredSessionUser,
} from "../../src/api/authApi";
import { secureStorage } from "../../src/utils/secureStorage";

describe("repro_bug_006: secureStorage.clear() leaks SESSION_USER_STORE_KEY in web mode", () => {
	beforeEach(async () => {
		localStorage.clear();
	});

	it("leaves SESSION_USER_STORE_KEY intact in localStorage after secureStorage.clear()", async () => {
		await saveStoredSessionUser({
			user: {
				id: "u-victim",
				username: "canbo_thon1",
				role: "user",
				village_id: "vil-01",
			},
			accessToken: "secret-victim-token",
			refreshToken: "secret-victim-refresh",
			savedAt: new Date().toISOString(),
		});

		expect(await getStoredSessionUser()).not.toBeNull();

		await secureStorage.clear();

		const sessionAfterClear = await getStoredSessionUser();
		const rawInLocalStorage = localStorage.getItem(SESSION_USER_STORE_KEY);

		expect(sessionAfterClear).toBeNull();
		expect(rawInLocalStorage).toBeNull();
	});
});
