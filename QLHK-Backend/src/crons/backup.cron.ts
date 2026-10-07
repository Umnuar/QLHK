import cron from "node-cron";
import { runAutoBackup } from "../controllers/backup.controller";

/**
 * Tác vụ Cron sao lưu tự động 7 bảng CSDL PostgreSQL lúc 02:00 AM hàng ngày.
 * Lưu trữ xoay vòng 7 ngày tương tự QLCS/QLNN.
 */
export const initBackupCron = (): void => {
	cron.schedule("0 2 * * *", async () => {
		console.log(
			"[Cron] Khởi chạy tác vụ tự động sao lưu dữ liệu lúc 02:00 AM...",
		);
		await runAutoBackup();
	});
	console.log(
		"[Cron] Đã đăng ký tác vụ Auto Backup (02:00 AM hàng ngày, xoay vòng 7 ngày)",
	);
};
