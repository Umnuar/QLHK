import app from "./app";
import { config } from "./config/env";
import { prisma } from "./config/prisma";
import { initBackupCron } from "./crons/backup.cron";
import { getDbTargetInfo, logDb, logError, logStart } from "./utils/logger";

const PORT = config.port || 5002;

const server = app.listen(PORT, () => {
	const dbInfo = getDbTargetInfo();
	logDb(dbInfo.host, dbInfo.port, dbInfo.database);
	logStart(PORT, config.nodeEnv);

	if (process.env.NODE_ENV !== "test") {
		initBackupCron();
	}
});

// Giữ kết nối Cloudflare Tunnel luôn ấm (Keep-Alive)
server.keepAliveTimeout = 65000; // 65s (lớn hơn Cloudflare 60s để tránh ngắt kết nối đột ngột)
server.headersTimeout = 66000;

// Xử lý lỗi khởi động và xung đột cổng (EADDRINUSE)
server.on("error", (err: NodeJS.ErrnoException) => {
	logError(err.code || "SERVER_ERROR", err.message || "Không thể khởi động máy chủ");
	process.exit(1);
});

// Xử lý đóng máy chủ an toàn (Graceful Shutdown)
const gracefulShutdown = async (_signal: string) => {
	server.close(async () => {
		try {
			await prisma.$disconnect();
			process.exit(0);
		} catch (error: any) {
			logError("DB_DISCONNECT", error?.message || "Lỗi khi ngắt kết nối CSDL");
			process.exit(1);
		}
	});

	// Đảm bảo không bị treo vô hạn nếu socket đóng chậm
	setTimeout(() => {
		logError("TIMEOUT", "Buộc dừng tiến trình sau 5 giây chờ đóng kết nối.");
		process.exit(1);
	}, 5000).unref();
};

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

export default server;
