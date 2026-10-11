import axios, { type AxiosAdapter } from "axios";
import { isTauri } from "@tauri-apps/api/core";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";

export const getTauriAxiosAdapter = (): AxiosAdapter | undefined => {
	if (!isTauri()) {
		return undefined;
	}

	return async (config) => {
		const fullUrl = axios.getUri(config);
		const headers = new Headers();
		if (config.headers) {
			Object.entries(config.headers).forEach(([k, v]) => {
				if (v !== undefined && v !== null && typeof v !== "object") {
					headers.set(k, String(v));
				}
			});
		}

		let body: any = undefined;
		if (config.data !== undefined && config.data !== null) {
			body =
				typeof config.data === "string"
					? config.data
					: JSON.stringify(config.data);
		}

		try {
			const response = await tauriFetch(fullUrl, {
				method: (config.method || "GET").toUpperCase(),
				headers,
				body,
				connectTimeout: config.timeout || 10000,
			});

			const responseText = await response.text();
			let responseData: any = responseText;
			try {
				responseData = JSON.parse(responseText);
			} catch {
				// keep string
			}

			const responseHeaders: Record<string, string> = {};
			response.headers.forEach((value, key) => {
				responseHeaders[key] = value;
			});

			const axiosResponse = {
				data: responseData,
				status: response.status,
				statusText: response.statusText,
				headers: responseHeaders,
				config,
				request: {},
			};

			if (response.status >= 200 && response.status < 300) {
				return axiosResponse;
			}

			const error: any = new Error(
				`Request failed with status code ${response.status}`,
			);
			error.response = axiosResponse;
			error.config = config;
			error.status = response.status;
			error.isAxiosError = true;
			return Promise.reject(error);
		} catch (fetchErr: any) {
			if (fetchErr?.isAxiosError) {
				return Promise.reject(fetchErr);
			}
			const networkError: any = new Error(fetchErr?.message || "Network Error");
			networkError.config = config;
			networkError.isAxiosError = true;
			networkError.code = "ERR_NETWORK";
			return Promise.reject(networkError);
		}
	};
};
