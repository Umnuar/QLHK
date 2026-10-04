import { Router } from "express";
import { getByVillage, getOverview } from "../controllers/analytics.controller";
import {
	authenticateToken,
	authorizeVillageScope,
} from "../middlewares/auth.middleware";

const router = Router();

router.use(authenticateToken);
router.use(authorizeVillageScope);

router.get("/overview", getOverview);
router.get("/by-village", getByVillage);

export default router;
