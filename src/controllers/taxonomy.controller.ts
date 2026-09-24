import type { Request, Response } from "express";

import {
  createTaxonomySchema,
  updateTaxonomySchema,
} from "../validators/taxonomy.validator.js";
import type { createTaxonomyService } from "../services/taxonomy.service.js";

type TaxonomyService = ReturnType<typeof createTaxonomyService>;

function isNotFoundError(error: unknown): boolean {
  return error instanceof Error && error.message.endsWith("not found");
}

function isConflictError(error: unknown): boolean {
  return error instanceof Error && error.message.includes("already exists");
}

export function createTaxonomyController(service: TaxonomyService) {
  async function create(req: Request, res: Response): Promise<void> {
    try {
      const validationResult = createTaxonomySchema.safeParse(req.body);

      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: validationResult.error.flatten().fieldErrors,
        });
        return;
      }

      const item = await service.create(validationResult.data);
      res.status(201).json({ success: true, item });
    } catch (error) {
      if (isConflictError(error)) {
        res
          .status(409)
          .json({ success: false, message: (error as Error).message });
        return;
      }

      console.error("Create taxonomy error:", error);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }

  async function list(_req: Request, res: Response): Promise<void> {
    try {
      const items = await service.list();
      res.status(200).json({ success: true, items });
    } catch (error) {
      console.error("List taxonomy error:", error);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }

  async function getOne(req: Request, res: Response): Promise<void> {
    try {
      const item = await service.getById(req.params.id as string);
      res.status(200).json({ success: true, item });
    } catch (error) {
      if (isNotFoundError(error)) {
        res
          .status(404)
          .json({ success: false, message: (error as Error).message });
        return;
      }

      console.error("Get taxonomy error:", error);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }

  async function getBySlug(req: Request, res: Response): Promise<void> {
    try {
      const item = await service.getBySlug(req.params.slug as string);
      res.status(200).json({ success: true, item });
    } catch (error) {
      if (isNotFoundError(error)) {
        res
          .status(404)
          .json({ success: false, message: (error as Error).message });
        return;
      }

      console.error("Get taxonomy by slug error:", error);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }

  async function update(req: Request, res: Response): Promise<void> {
    try {
      const validationResult = updateTaxonomySchema.safeParse(req.body);

      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: validationResult.error.flatten().fieldErrors,
        });
        return;
      }

      const item = await service.update(
        req.params.id as string,
        validationResult.data
      );
      res.status(200).json({ success: true, item });
    } catch (error) {
      if (isNotFoundError(error)) {
        res
          .status(404)
          .json({ success: false, message: (error as Error).message });
        return;
      }

      if (isConflictError(error)) {
        res
          .status(409)
          .json({ success: false, message: (error as Error).message });
        return;
      }

      console.error("Update taxonomy error:", error);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }

  async function remove(req: Request, res: Response): Promise<void> {
    try {
      await service.remove(req.params.id as string);
      res.status(200).json({ success: true, message: "Deleted" });
    } catch (error) {
      if (isNotFoundError(error)) {
        res
          .status(404)
          .json({ success: false, message: (error as Error).message });
        return;
      }

      console.error("Delete taxonomy error:", error);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }

  return { create, list, getOne, getBySlug, update, remove };
}
