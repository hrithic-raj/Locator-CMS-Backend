import { Router } from "express";

import * as articleController from "../controllers/article.controller.js";
import { authenticate, requireRole } from "../middleware/auth.middleware.js";

const router = Router();

// ---- Public (published-only) ----
router.get("/", articleController.listPublic);
router.get("/featured", articleController.featured);

// ---- Admin (any authenticated editorial role; per-action role/ownership
// checks happen in the service layer — see article.service.ts) ----
// Mounted BEFORE the "/:slug" catch-all below, otherwise a request to
// /admin would incorrectly match :slug = "admin".
const admin = Router();
admin.use(authenticate, requireRole("admin", "editor", "contributor"));

admin.get("/", articleController.listAdmin);
admin.get("/:id", articleController.getAdminOne);
admin.post("/", articleController.create);
admin.patch("/:id", articleController.update);
admin.delete("/:id", articleController.remove);

// Publishing/archiving/featuring are admin/editor only — contributors
// can write drafts but never move content live.
admin.patch(
  "/:id/publish",
  requireRole("admin", "editor"),
  articleController.publish
);
admin.patch(
  "/:id/archive",
  requireRole("admin", "editor"),
  articleController.archive
);
admin.patch(
  "/:id/feature",
  requireRole("admin", "editor"),
  articleController.feature
);

router.use("/admin", admin);

// Catch-all — must be LAST so it doesn't swallow /admin or /featured.
router.get("/:slug", articleController.getBySlug);

export default router;
