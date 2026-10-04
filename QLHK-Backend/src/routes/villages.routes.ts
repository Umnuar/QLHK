import { Router } from "express";
import {
	createVillage,
	deleteVillage,
	getVillages,
	updateVillage,
} from "../controllers/villages.controller";
import {
	authenticateToken,
	requireAdmin,
} from "../middlewares/auth.middleware";

const router = Router();

router.get("/", authenticateToken, getVillages);
router.post("/", authenticateToken, requireAdmin, createVillage);
router.put("/:id", authenticateToken, requireAdmin, updateVillage);
router.delete("/:id", authenticateToken, requireAdmin, deleteVillage);

export default router;
