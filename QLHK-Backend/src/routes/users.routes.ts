import { Router } from "express";
import {
	createUser,
	deleteUser,
	getUsers,
	updatePassword,
	updateUser,
} from "../controllers/users.controller";
import {
	authenticateToken,
	requireAdmin,
} from "../middlewares/auth.middleware";

const router = Router();

router.use(authenticateToken);

router.get("/", requireAdmin, getUsers);
router.post("/", requireAdmin, createUser);
router.put("/:id", requireAdmin, updateUser);
router.put("/:id/password", updatePassword);
router.delete("/:id", requireAdmin, deleteUser);

export default router;
