import cron from "node-cron";
import { runAutoBackup } from "../controllers/backup.controller";
import { logCron } from "../utils/logger";

/**
 * Tác vụ Cron sao lưu tự động 7 bảng CSDL PostgreSQL lúc 02:00 AM hàng ngày.
 * Lưu trữ xoay vòng 7 ngày tương tự QLCS/QLNN.
 */
export const initBackupCron = (): void => {
	cron.schedule("0 2 * * *", async () => {
		logCron("BackupDatabase", "STARTED");
		try {
			const result = await runAutoBackup();
			if (result) {
				logCron("BackupDatabase", "COMPLETED");
			} else {
				logCron("BackupDatabase", "FAILED");
			}
		} catch (err: any) {
			logCron("BackupDatabase", `FAILED: ${err?.message || "Unknown error"}`);
		}
	});
	logCron("BackupDatabase", "REGISTERED (02:00 AM daily)");
};
