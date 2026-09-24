import { z } from "zod";

import { SLUG_PATTERN } from "../utils/slugify.js";

export const createTaxonomySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),

  // Optional — if omitted, the service derives it from `name`.
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(SLUG_PATTERN, "Slug must be lowercase, hyphen-separated")
    .optional(),

  description: z.string().trim().max(500).optional(),

  sortOrder: z.number().int().optional(),
});

export type CreateTaxonomyInput = z.infer<typeof createTaxonomySchema>;

export const updateTaxonomySchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .regex(SLUG_PATTERN, "Slug must be lowercase, hyphen-separated")
      .optional(),
    description: z.string().trim().max(500).nullable().optional(),
    sortOrder: z.number().int().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export type UpdateTaxonomyInput = z.infer<typeof updateTaxonomySchema>;
