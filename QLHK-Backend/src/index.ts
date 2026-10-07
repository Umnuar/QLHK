import app from "./app";
import { config } from "./config/env";
import { prisma } from "./config/prisma";
import { startDashboard } from "./utils/dashboard";
import { initBackupCron } from "./crons/backup.cron";

const PORT = config.port || 5002;

const server = app.listen(PORT, () => {
	console.log(`===================================================`);
	console.log(`  QLHK-Backend (Quản lý Hộ khẩu - Nhân khẩu Đăk Hà)`);
	console.log(`  Cổng dịch vụ: http://localhost:${PORT}`);
	console.log(`  Health Check: http://localhost:${PORT}/api/health`);
	console.log(`  Môi trường  : ${config.nodeEnv}`);
	console.log(`===================================================`);

	if (process.env.NODE_ENV !== "test") {
		startDashboard();
		initBackupCron();
	}
});

// Giữ kết nối Cloudflare Tunnel luôn ấm (Keep-Alive)
server.keepAliveTimeout = 65000; // 65s (lớn hơn Cloudflare 60s để tránh ngắt kết nối đột ngột)
server.headersTimeout = 66000;

// Xử lý lỗi khởi động và xung đột cổng (EADDRINUSE)
server.on("error", (err: NodeJS.ErrnoException) => {
	if (err.code === "EADDRINUSE") {
		console.error(`\n[LỖI CỔNG] Cổng ${PORT} hiện đang bị chiếm dụng bởi một tiến trình khác.`);
		console.error(`Hướng dẫn xử lý:`);
		console.error(`  1. Chạy lệnh: npm run clean:port`);
		console.error(`  2. Hoặc tắt ứng dụng/tiến trình đang chiếm cổng ${PORT} rồi thử lại.\n`);
		process.exit(1);
	} else {
		console.error(`[LỖI SERVER] Không thể khởi động máy chủ:`, err);
		process.exit(1);
	}
});

// Xử lý đóng máy chủ an toàn (Graceful Shutdown)
const gracefulShutdown = async (signal: string) => {
	console.log(`\n[HỆ THỐNG] Đang nhận tín hiệu ${signal}. Đang đóng server và giải phóng kết nối...`);
	server.close(async () => {
		try {
			await prisma.$disconnect();
			console.log(`[HỆ THỐNG] Đã đóng server và ngắt kết nối CSDL thành công.`);
			process.exit(0);
		} catch (error) {
			console.error(`[HỆ THỐNG] Lỗi khi ngắt kết nối CSDL:`, error);
			process.exit(1);
		}
	});

	// Đảm bảo không bị treo vô hạn nếu socket đóng chậm
	setTimeout(() => {
		console.error(`[HỆ THỐNG] Buộc dừng tiến trình sau 5 giây chờ đóng kết nối.`);
		process.exit(1);
	}, 5000).unref();
};

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

export default server;

