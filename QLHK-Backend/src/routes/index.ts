import { Router } from "express";
import analyticsRoutes from "./analytics.routes";
import auditRoutes from "./audit.routes";
import authRoutes from "./auth.routes";
import citizensRoutes from "./citizens.routes";
import excelRoutes from "./excel.routes";
import householdsRoutes from "./households.routes";
import usersRoutes from "./users.routes";
import villagesRoutes from "./villages.routes";
import backupRoutes from "./backup.routes";
import updatesRoutes from "./updates.routes";
import settingsRoutes from "./settings.routes";
import policyRoutes from "./policy.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/households", householdsRoutes);
router.use("/citizens", citizensRoutes);
router.use("/excel", excelRoutes);
router.use("/analytics", analyticsRoutes);
router.use("/villages", villagesRoutes);
router.use("/users", usersRoutes);
router.use("/audit-logs", auditRoutes);
router.use("/audit", auditRoutes);
router.use("/backup", backupRoutes);
router.use("/updates", updatesRoutes);
router.use("/settings", settingsRoutes);
router.use("/policies", policyRoutes);

export default router;
