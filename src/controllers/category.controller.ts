import type { Request, Response } from "express";
import { createCategorySchema, updateCategorySchema } from "../validators/taxonomy.validator.js";
import * as categoryService from "../services/category.service.js";

function statusFor(error: unknown) {
  if (!(error instanceof Error)) return 500;
  if (error.message === "Category not found") return 404;
  if (error.message.includes("already exists")) return 409;
  if (error.message.startsWith("Cannot delete category") || error.message.startsWith("Category format '")) return 409;
  return 500;
}

export async function list(_req: Request, res: Response) {
  try { res.json({ success: true, items: await categoryService.listCategories() }); }
  catch (error) { console.error(error); res.status(500).json({ success: false, message: "Internal server error" }); }
}

export async function getOne(req: Request, res: Response) {
  try { res.json({ success: true, item: await categoryService.getCategoryById(req.params.id as string) }); }
  catch (error) { res.status(statusFor(error)).json({ success: false, message: error instanceof Error ? error.message : "Internal server error" }); }
}

export async function getBySlug(req: Request, res: Response) {
  try { res.json({ success: true, item: await categoryService.getCategoryBySlug(req.params.slug as string) }); }
  catch (error) { res.status(statusFor(error)).json({ success: false, message: error instanceof Error ? error.message : "Internal server error" }); }
}

export async function create(req: Request, res: Response) {
  const parsed = createCategorySchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ success: false, message: "Validation failed", errors: parsed.error.flatten().fieldErrors }); return; }
  try { res.status(201).json({ success: true, item: await categoryService.createCategory(parsed.data) }); }
  catch (error) { res.status(statusFor(error)).json({ success: false, message: error instanceof Error ? error.message : "Internal server error" }); }
}

export async function update(req: Request, res: Response) {
  const parsed = updateCategorySchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ success: false, message: "Validation failed", errors: parsed.error.flatten().fieldErrors }); return; }
  try { res.json({ success: true, item: await categoryService.updateCategory(req.params.id as string, parsed.data) }); }
  catch (error) { res.status(statusFor(error)).json({ success: false, message: error instanceof Error ? error.message : "Internal server error" }); }
}

export async function remove(req: Request, res: Response) {
  try { await categoryService.deleteCategory(req.params.id as string); res.json({ success: true, message: "Deleted" }); }
  catch (error) { res.status(statusFor(error)).json({ success: false, message: error instanceof Error ? error.message : "Internal server error" }); }
}
