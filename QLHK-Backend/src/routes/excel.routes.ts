import { Router } from "express";
import multer from "multer";
import { importExcel, previewExcel } from "../controllers/excel.controller";
import { exportHouseholdExcel } from "../controllers/householdExcel.controller";
import {
	authenticateToken,
	authorizeVillageScope,
} from "../middlewares/auth.middleware";

const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 10 * 1024 * 1024 },
});

const router = Router();

router.use(authenticateToken);
router.use(authorizeVillageScope);

router.post("/preview", upload.single("file"), previewExcel);
router.post("/import", upload.single("file"), importExcel);
router.get("/export", exportHouseholdExcel);
router.post("/export", exportHouseholdExcel);

export default router;
