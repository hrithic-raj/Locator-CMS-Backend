import { Router } from "express";

import authRoutes from "./auth.routes.js";

const router = Router();

router.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Locator CMS API is running",
  });
});

router.use("/auth", authRoutes);

export default router;