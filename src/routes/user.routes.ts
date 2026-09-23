import { Router } from "express";

import * as userController from "../controllers/user.controller.js";
import { authenticate, requireRole } from "../middleware/auth.middleware.js";

const router = Router();

// Every route here requires a logged-in admin. Editors/contributors never
// reach these — creating accounts and changing roles is admin-only.
router.use(authenticate, requireRole("admin"));

router.post("/", userController.create);
router.get("/", userController.list);
router.get("/:id", userController.getOne);
router.patch("/:id", userController.update);
router.delete("/:id", userController.remove);

export default router;
