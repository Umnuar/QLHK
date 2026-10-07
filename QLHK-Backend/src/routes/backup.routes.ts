import { type NextFunction, type Response, Router } from "express";
import {
	exportDatabase,
	restoreDatabase,
} from "../controllers/backup.controller";
import {
	type AuthRequest,
	authenticateToken,
} from "../middlewares/auth.middleware";

const router = Router();

const authorizeAdmin = (
	req: AuthRequest,
	res: Response,
	next: NextFunction,
): void => {
	if (req.user?.role !== "admin") {
		res
			.status(403)
			.json({ error: "Chỉ có quyền Quản trị viên mới được thao tác sao lưu cơ sở dữ liệu." });
		return;
	}
	next();
};

router.get("/export", authenticateToken, authorizeAdmin, exportDatabase);
router.post("/restore", authenticateToken, authorizeAdmin, restoreDatabase);

export default router;
