import { Router } from "express";
import {
	createCitizen,
	deleteCitizen,
	getCitizenById,
	getCitizens,
	revealCitizenCCCD,
	updateCitizen,
} from "../controllers/citizens.controller";
import {
	authenticateToken,
	authorizeVillageScope,
} from "../middlewares/auth.middleware";

const router = Router();

router.use(authenticateToken);
router.use(authorizeVillageScope);

router.get("/", getCitizens);
router.get("/:id", getCitizenById);
router.get("/:id/reveal-cccd", revealCitizenCCCD);
router.post("/", createCitizen);
router.put("/:id", updateCitizen);
router.patch("/:id", updateCitizen);
router.delete("/:id", deleteCitizen);

export default router;
