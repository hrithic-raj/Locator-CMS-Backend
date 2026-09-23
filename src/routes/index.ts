import { Router } from "express";
import userRoutes from "./user.routes.js"
import authRoutes from "./auth.routes.js";

const router = Router();

router.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Locator CMS API is running",
  });
});

router.use("/auth", authRoutes);
router.use("/users", userRoutes);

export default router;