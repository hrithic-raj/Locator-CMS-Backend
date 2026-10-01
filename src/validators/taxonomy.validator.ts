import { z } from "zod";
import { ARTICLE_FORMATS } from "../models/Category.js";
import { SLUG_PATTERN } from "../utils/slugify.js";

export const articleFormatEnum = z.enum(ARTICLE_FORMATS);

export const createCategorySchema = z.object({
  name: z.string().trim().min(1).max(100),
  slug: z.string().trim().toLowerCase().regex(SLUG_PATTERN).optional(),
  description: z.string().trim().max(500).optional(),
  sortOrder: z.number().int().optional(),
  allowedFormats: z.array(articleFormatEnum).min(1).max(3),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  slug: z.string().trim().toLowerCase().regex(SLUG_PATTERN).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  sortOrder: z.number().int().optional(),
  allowedFormats: z.array(articleFormatEnum).min(1).max(3).optional(),
}).refine((data) => Object.keys(data).length > 0, { message: "At least one field must be provided" });

export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

export const createTagSchema = z.object({
  name: z.string().trim().min(1).max(100),
  slug: z.string().trim().toLowerCase().regex(SLUG_PATTERN).optional(),
  description: z.string().trim().max(500).optional(),
  sortOrder: z.number().int().optional(),
});
export type CreateTagInput = z.infer<typeof createTagSchema>;

export const updateTagSchema = createTagSchema.partial().refine((data) => Object.keys(data).length > 0, { message: "At least one field must be provided" });
export type UpdateTagInput = z.infer<typeof updateTagSchema>;

// Backwards-compatible schemas used by the existing Tag CRUD.
export const createTaxonomySchema = createTagSchema;
export type CreateTaxonomyInput = CreateTagInput;
export const updateTaxonomySchema = updateTagSchema;
export type UpdateTaxonomyInput = UpdateTagInput;
