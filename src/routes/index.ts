import { Router } from "express";
import userRoutes from "./user.routes.js"
import authRoutes from "./auth.routes.js";
import categoryRoutes from "./category.routes.js";
import tagRoutes from "./tag.routes.js";
import mediaRoutes from "./media.routes.js";
import articleRoutes from "./article.routes.js";

const router = Router();

router.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Locator CMS API is running",
  });
});

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/categories", categoryRoutes);
router.use("/tags", tagRoutes);
router.use("/media", mediaRoutes);
router.use("/articles", articleRoutes);

export default router;