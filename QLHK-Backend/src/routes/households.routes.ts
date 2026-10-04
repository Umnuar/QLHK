import { Router } from "express";
import {
	batchDeleteHouseholds,
	createHousehold,
	deleteHousehold,
	getHouseholdById,
	getHouseholds,
	getRecycleBin,
	hardDeleteHousehold,
	restoreHousehold,
	updateHousehold,
} from "../controllers/households.controller";
import {
	authenticateToken,
	authorizeVillageScope,
} from "../middlewares/auth.middleware";

const router = Router();

router.use(authenticateToken);
router.use(authorizeVillageScope);

router.get("/", getHouseholds);
router.get("/recycle-bin", getRecycleBin);
router.post("/batch-delete", batchDeleteHouseholds);
router.post("/:id/restore", restoreHousehold);
router.delete("/:id/hard", hardDeleteHousehold);
router.get("/:id", getHouseholdById);
router.post("/", createHousehold);
router.put("/:id", updateHousehold);
router.patch("/:id", updateHousehold);
router.delete("/:id", deleteHousehold);

export default router;
