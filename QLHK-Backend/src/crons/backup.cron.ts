import cron from "node-cron";
import { runAutoBackup } from "../controllers/backup.controller";
import { logCron } from "../utils/logger";

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
