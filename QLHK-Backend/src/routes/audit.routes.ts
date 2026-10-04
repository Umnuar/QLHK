import { Router } from "express";
import { getAuditLogs } from "../controllers/audit.controller";
import {
	authenticateToken,
	requireAdmin,
} from "../middlewares/auth.middleware";

const router = Router();

router.use(authenticateToken);
router.use(requireAdmin);

router.get("/", getAuditLogs);
router.get("/:village_id", getAuditLogs);

export default router;
