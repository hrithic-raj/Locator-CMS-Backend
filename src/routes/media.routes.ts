import { Router } from "express";

import * as mediaController from "../controllers/media.controller.js";
import { authenticate, requireRole } from "../middleware/auth.middleware.js";

const router = Router();

// Uploading/browsing is available to every authenticated role, including
// contributors (they need to upload images into their own draft articles).
router.use(authenticate, requireRole("admin", "editor", "contributor"));

router.post("/upload", mediaController.uploadImage);
router.get("/", mediaController.list);

// Deleting is restricted to admin/editor — a contributor shouldn't be
// able to remove an image a published article (theirs or someone else's)
// still depends on.
router.delete("/:id", requireRole("admin", "editor"), mediaController.remove);

export default router;
