import { Router } from "express";
import multer from "multer";
import { authenticateToken, authorizeVillageScope } from "../middlewares/auth.middleware";
import {
  createChucthoProfile, deleteChucthoProfile, getChucthoProfiles,
  getChucthoStream, markChucthoReceived, updateChucthoProfile,
} from "../controllers/policyChuctho.controller";
import {
  createHtxhProfile, deleteHtxhProfile, getHtxhProfiles,
  getHtxhStream, markHtxhReceived, updateHtxhProfile,
} from "../controllers/policyHtxh.controller";
import { getPolicyAnalytics } from "../controllers/policyAnalytics.controller";
import { exportPolicyExcel, importPolicyExcel } from "../controllers/policyExcel.controller";
import { syncPolicyData } from "../controllers/policySync.controller";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const router = Router();

router.use(authenticateToken);
router.use(authorizeVillageScope);

router.post("/sync", syncPolicyData);

router.get("/chuctho", getChucthoProfiles);
router.get("/chuctho/stream", getChucthoStream);
router.post("/chuctho", createChucthoProfile);
router.put("/chuctho/:id", updateChucthoProfile);
router.patch("/chuctho/:id/received", markChucthoReceived);
router.delete("/chuctho/:id", deleteChucthoProfile);

router.get("/htxh", getHtxhProfiles);
router.get("/htxh/stream", getHtxhStream);
router.post("/htxh", createHtxhProfile);
router.put("/htxh/:id", updateHtxhProfile);
router.patch("/htxh/:id/received", markHtxhReceived);
router.delete("/htxh/:id", deleteHtxhProfile);

router.get("/analytics", getPolicyAnalytics);
router.post("/excel/import", upload.single("file"), importPolicyExcel);
router.get("/excel/export", exportPolicyExcel);

export default router;
