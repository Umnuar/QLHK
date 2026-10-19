process.env.TZ = "Asia/Ho_Chi_Minh";

import app from "./app";
import { config } from "./config/env";
import { prisma } from "./config/prisma";
import { initBackupCron } from "./crons/backup.cron";
import { startAutoTimeSync, stopAutoTimeSync } from "./services/systemTime.service";
import { getDbTargetInfo, logDb, logError, logStart } from "./utils/logger";

const PORT = config.port || 5002;

const server = app.listen(PORT, () => {
	const dbInfo = getDbTargetInfo();
	logDb(dbInfo.host, dbInfo.port, dbInfo.database);
	logStart(PORT, config.nodeEnv);

	if (process.env.NODE_ENV !== "test") {
		initBackupCron();
		startAutoTimeSync();
	}
});

server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

server.on("error", (err: NodeJS.ErrnoException) => {
	logError(err.code || "SERVER_ERROR", err.message || "Không thể khởi động máy chủ");
	process.exit(1);
});

const gracefulShutdown = async (_signal: string) => {
	stopAutoTimeSync();
	server.close(async () => {
		try {
			await prisma.$disconnect();
			process.exit(0);
		} catch (error: any) {
			logError("DB_DISCONNECT", error?.message || "Lỗi khi ngắt kết nối CSDL");
			process.exit(1);
		}
	});

	setTimeout(() => {
		logError("TIMEOUT", "Buộc dừng tiến trình sau 5 giây chờ đóng kết nối.");
		process.exit(1);
	}, 5000).unref();
};

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

export default server;
