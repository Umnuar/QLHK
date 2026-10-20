import { beforeEach, describe, expect, it } from "vitest";
import { authApi, saveStoredSessionUser } from "../../src/api/authApi";
import { apiClient } from "../../src/api/client";

describe("repro_bug_007: offline login bypasses password verification", () => {
	beforeEach(async () => {
		localStorage.clear();
	});

	it("should reject login when incorrect password is provided in offline mode (INV-01 / BC-01)", async () => {
		await saveStoredSessionUser({
			user: {
				id: "user-victim-id",
				username: "canbo_dakha",
				role: "user",
				village_id: "vil-01",
			},
			accessToken: "valid-offline-token",
			refreshToken: "valid-offline-refresh",
			savedAt: new Date().toISOString(),
		});

		const originalPost = apiClient.post;
		apiClient.post = (async () => {
			const err: any = new Error("Network Error");
			err.code = "ERR_NETWORK";
			throw err;
		}) as any;

		try {
			await expect(
				authApi.login({
					username: "canbo_dakha",
					password: "INCORRECT_PASSWORD_ATTACK",
				}),
			).rejects.toThrow("Mật khẩu không chính xác");
		} finally {
			apiClient.post = originalPost;
		}
	});
});
