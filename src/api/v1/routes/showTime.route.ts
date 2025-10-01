import { Router } from "express";
const router: Router = Router();

import * as showTimeController from "../controllers/showTime.controller";
import { authMiddleware, optionalAuthMiddleware } from "../../../middlewares/auth.middleware";
import { UserRole } from "../../../types/user.type";
import { validateCreateShowTime, validateUpdateShowTime } from "../validators/showTime.validator";

// [GET] LIST: /api/v1/show-times
// Hỗ trợ query params: ?page=2&status=active&filmId=xxx&cinemaId=yyy&startDate=2025-01-01&endDate=2025-01-31
router.get("/", optionalAuthMiddleware, showTimeController.index);

// [GET] DETAIL BY ID: /api/v1/show-times/:id
router.get("/:id", optionalAuthMiddleware, showTimeController.getById);

// [POST] CREATE: /api/v1/show-times
router.post(
  "/",
  authMiddleware(UserRole.ADMIN),
  validateCreateShowTime,
  showTimeController.create
);

// [PATCH] EDIT: /api/v1/show-times/:id
router.patch(
  "/:id",
  authMiddleware(UserRole.ADMIN),
  validateUpdateShowTime,
  showTimeController.edit
);

// [DELETE] DELETE: /api/v1/show-times/:id
router.delete("/:id", authMiddleware(UserRole.ADMIN), showTimeController.remove);

export default router;