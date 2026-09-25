import { z } from "zod";

import { SLUG_PATTERN } from "../utils/slugify.js";

const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;
const objectId = z.string().regex(OBJECT_ID_PATTERN, "Invalid id");

const imageSchema = z.object({
  url: z.string().trim().min(1, "Image URL is required"),
  alt: z.string().trim().max(200).default(""),
});

const seoSchema = z.object({
  metaTitle: z.string().trim().max(70).optional(),
  metaDescription: z.string().trim().max(200).optional(),
  keywords: z.array(z.string().trim()).max(20).optional(),
});

export const articleTypeEnum = z.enum([
  "blog",
  "company_news",
  "customer_story",
  "media_coverage",
]);

// Status/isFeatured/publishedAt are deliberately NOT part of create/update —
// every article starts as a draft; publishing/archiving/featuring go
// through their own dedicated, admin/editor-only endpoints.
export const createArticleSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),

  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(SLUG_PATTERN, "Slug must be lowercase, hyphen-separated")
    .optional(),

  type: articleTypeEnum,

  excerpt: z.string().trim().min(1, "Excerpt is required").max(300),

  content: z.string().trim().min(20, "Content is too short"),

  coverImage: imageSchema,

  gallery: z.array(imageSchema).max(20).optional(),

  category: objectId.optional(),

  tags: z.array(objectId).max(20).optional(),

  seo: seoSchema.optional(),

  sourceOutlet: z.string().trim().max(150).optional(),

  sourceUrl: z.string().trim().url("Must be a valid URL").optional(),
});

export type CreateArticleInput = z.infer<typeof createArticleSchema>;

export const updateArticleSchema = createArticleSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export type UpdateArticleInput = z.infer<typeof updateArticleSchema>;

export const featureArticleSchema = z.object({
  isFeatured: z.boolean(),
});

export const listArticlesQuerySchema = z.object({
  type: articleTypeEnum.optional(),
  category: z.string().trim().optional(), // category slug
  tag: z.string().trim().optional(), // tag slug
  q: z.string().trim().optional(),
  featured: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(12),
});

export const listAdminArticlesQuerySchema = listArticlesQuerySchema.extend({
  status: z.enum(["draft", "published", "archived"]).optional(),
});
