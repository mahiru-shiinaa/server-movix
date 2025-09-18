import { Router} from "express";
const router: Router = Router();

import * as userController from "../controllers/user.controller";
import { authMiddleware, optionalAuthMiddleware } from "../../../middlewares/auth.middleware";
import { UserRole } from "../../../types/user.type";
import { validateChangePassword, validateUpdateProfile } from "../validators/user.validator";

// --- USER ---
//[GET] DETAIL: /api/v1/users/me
router.get("/me", authMiddleware(UserRole.USER), userController.me);
//[PATCH] EDIT: /api/v1/users/me
router.patch("/me", authMiddleware(UserRole.USER), validateUpdateProfile, userController.edit);
//[PATCH] CHANGE PASSWORD: /api/v1/users/me/change-password
router.patch("/me/change-password", authMiddleware(UserRole.USER), validateChangePassword, userController.changePassword);



// --- ADMIN ---
//[GET] LIST: /api/v1/users
router.get("/", authMiddleware(UserRole.ADMIN), userController.index);
//[GET] DETAIL: /api/v1/users/:id
router.get("/:id", authMiddleware(UserRole.ADMIN), userController.detail);


export default router;