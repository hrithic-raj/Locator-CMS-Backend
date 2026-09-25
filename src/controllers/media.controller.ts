import type { Request, Response } from "express";

import { imageUpload } from "../config/upload.js";
import * as mediaService from "../services/media.service.js";

export function uploadImage(req: Request, res: Response): void {
  imageUpload.single("file")(req, res, async (err: unknown) => {
    if (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      res.status(400).json({ success: false, message });
      return;
    }

    if (!req.file) {
      res
        .status(400)
        .json({ success: false, message: "No file was uploaded" });
      return;
    }

    try {
      // req.user is guaranteed by the `authenticate` middleware
      const asset = await mediaService.recordUpload(
        req.file,
        req.user!.userId
      );

      res.status(201).json({ success: true, asset });
    } catch (error) {
      console.error("Record upload error:", error);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  });
}

export async function list(req: Request, res: Response): Promise<void> {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 24));

    const result = await mediaService.listMedia(page, limit);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    console.error("List media error:", error);
    res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
}

export async function remove(req: Request, res: Response): Promise<void> {
  try {
    await mediaService.deleteMedia(req.params.id as string);
    res.status(200).json({ success: true, message: "Deleted" });
  } catch (error) {
    if (error instanceof Error && error.message === "Media asset not found") {
      res.status(404).json({ success: false, message: error.message });
      return;
    }

    console.error("Delete media error:", error);
    res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
}
