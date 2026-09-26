import type { Request, Response } from "express";

import { listActivityLogQuerySchema } from "../validators/activityLog.validator.js";
import { listActivityLog } from "../services/activityLog.service.js";

export async function list(req: Request, res: Response): Promise<void> {
  try {
    const validationResult = listActivityLogQuerySchema.safeParse(req.query);

    if (!validationResult.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationResult.error.flatten().fieldErrors,
      });
      return;
    }

    const result = await listActivityLog(validationResult.data);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    console.error("List activity log error:", error);
    res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
}
