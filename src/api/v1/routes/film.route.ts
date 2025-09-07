import { Router} from "express";
const router: Router = Router();

import * as filmController from "../controllers/film.controller";
import { authMiddleware } from "../../../middlewares/auth.middleware";
import { UserRole } from "../../../types/user.type";

// router.get("/", filmController.index);

//[POST] CREATE: /api/v1/films
router.post("/create", authMiddleware(UserRole.ADMIN), filmController.create);

//[PATCH] EDIT: /api/v1/films/:id
router.patch("/edit/:id", authMiddleware(UserRole.ADMIN), filmController.edit);

//[DELETE] DELETE: /api/v1/films/:id
router.delete("/delete/:id", authMiddleware(UserRole.ADMIN), filmController.remove);

export default router;