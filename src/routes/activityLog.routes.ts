import { Router } from "express";

import * as activityLogController from "../controllers/activityLog.controller.js";
import { authenticate, requireRole } from "../middleware/auth.middleware.js";

const router = Router();

router.use(authenticate, requireRole("admin"));
router.get("/", activityLogController.list);

export default router;
