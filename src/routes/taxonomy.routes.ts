import { Router } from "express";

import { authenticate, requireRole } from "../middleware/auth.middleware.js";
import type { createTaxonomyController } from "../controllers/taxonomy.controller.js";

type TaxonomyController = ReturnType<typeof createTaxonomyController>;

/**
 * Reads (list/get) are public — the public newsroom site needs categories
 * and tags for navigation and filtering. Writes require admin or editor;
 * contributors can write article drafts but don't manage taxonomy.
 */
export function createTaxonomyRouter(controller: TaxonomyController): Router {
  const router = Router();

  router.get("/", controller.list);
  router.get("/slug/:slug", controller.getBySlug);
  router.get("/:id", controller.getOne);

  router.use(authenticate, requireRole("admin", "editor"));

  router.post("/", controller.create);
  router.patch("/:id", controller.update);
  router.delete("/:id", controller.remove);

  return router;
}
