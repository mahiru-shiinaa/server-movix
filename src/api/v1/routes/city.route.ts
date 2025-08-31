import { Router} from "express";
const router: Router = Router();

import * as cityController from "../controllers/city.controller";

router.get("/", cityController.index);

export default router;