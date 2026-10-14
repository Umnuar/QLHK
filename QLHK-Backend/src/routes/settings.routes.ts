import { Router, type Request, type Response } from "express";
import { getSystemTime, syncSystemTime } from "../services/systemTime.service";

const router = Router();

/**
 * GET /api/settings/time
 * Trả về thông tin thời gian chuẩn hệ thống và nguồn cấp
 */
router.get("/time", (_req: Request, res: Response) => {
	res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
	const timeInfo = getSystemTime();
	return res.json(timeInfo);
});

/**
 * POST /api/settings/time/sync
 * Kích hoạt đồng bộ lại tức thì qua chuỗi fallback 3 cấp
 */
router.post("/time/sync", async (_req: Request, res: Response) => {
	res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
	try {
		const timeInfo = await syncSystemTime();
		return res.json(timeInfo);
	} catch (error: any) {
		const fallbackInfo = getSystemTime();
		return res.json(fallbackInfo);
	}
});

export default router;
