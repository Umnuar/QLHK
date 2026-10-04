import { Router } from "express";
import { getMe, login, logout, refresh } from "../controllers/auth.controller";
import { authenticateToken } from "../middlewares/auth.middleware";

const router = Router();

// Ngăn chặn trình duyệt hoặc proxy cache phản hồi 304 trên các endpoint xác thực
router.use((_req, res, next) => {
	res.setHeader(
		"Cache-Control",
		"no-store, no-cache, must-revalidate, proxy-revalidate",
	);
	res.setHeader("Pragma", "no-cache");
	res.setHeader("Expires", "0");
	next();
});

router.post("/login", login);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.get("/me", authenticateToken, getMe);

export default router;
