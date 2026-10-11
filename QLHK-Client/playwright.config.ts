import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Configuration for QLHK-Client
 * Hệ thống Quản Lý Hộ Khẩu & Nhân Khẩu Xã Đăk Hà
 */
export default defineConfig({
	testDir: './tests/e2e',
	timeout: 180_000,
	expect: {
		timeout: 15_000,
	},
	fullyParallel: false,
	workers: 1, // Tuần tự 1 luồng để mô phỏng chính xác hành vi người dùng và bảo toàn dữ liệu
	forbidOnly: !!process.env.CI,
	retries: 0,
	reporter: [
		['list'],
		['html', { open: 'never', outputFolder: 'playwright-report' }],
	],
	use: {
		baseURL: 'http://127.0.0.1:5175',
		trace: 'retain-on-failure',
		screenshot: 'only-on-failure',
		video: 'retain-on-failure',
		actionTimeout: 15_000,
		navigationTimeout: 60_000,
	},
	projects: [
		{
			name: 'chromium',
			use: {
				...devices['Desktop Chrome'],
				viewport: { width: 1366, height: 768 },
			},
		},
	],
	webServer: {
		command: 'npm run dev',
		url: 'http://127.0.0.1:5175',
		reuseExistingServer: true,
		timeout: 120_000,
	},
});
