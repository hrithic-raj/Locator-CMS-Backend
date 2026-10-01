import { Router } from "express";
import * as controller from "../controllers/category.controller.js";
import { authenticate, requireRole } from "../middleware/auth.middleware.js";

const router = Router();

// Public reads let the frontend populate category filters and forms.
router.get("/", controller.list);
router.get("/slug/:slug", controller.getBySlug);
router.get("/:id", controller.getOne);

// Category management is intentionally ADMIN ONLY.
router.use(authenticate, requireRole("admin"));
router.post("/", controller.create);
router.patch("/:id", controller.update);
router.delete("/:id", controller.remove);

export default router;
