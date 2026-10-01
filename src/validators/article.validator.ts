import { z } from "zod";
import { SLUG_PATTERN } from "../utils/slugify.js";
import { articleFormatEnum } from "./taxonomy.validator.js";

const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;
const objectId = z.string().regex(OBJECT_ID_PATTERN, "Invalid id");

const imageSchema = z.object({
  src: z.string().trim().min(1, "Image src is required"),
  alt: z.string().trim().max(200).default(""),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

const inline = z.string().max(10000);

const blogBlockSchema: z.ZodTypeAny = z.lazy(() =>
  z.discriminatedUnion("type", [
    z.object({ type: z.literal("heading"), level: z.union([z.literal(2), z.literal(3)]), html: inline }),
    z.object({ type: z.literal("p"), html: inline }),
    z.object({ type: z.literal("quote"), html: inline }),
    z.object({ type: z.literal("ul"), items: z.array(inline).min(1) }),
    z.object({ type: z.literal("ol"), items: z.array(inline).min(1) }),
    z.object({ type: z.literal("image"), image: imageSchema }),
    z.object({
      type: z.literal("table"),
      rows: z.array(z.object({ head: z.boolean(), cells: z.array(inline).min(1) })).min(1),
    }),
    z.object({ type: z.literal("group"), blocks: z.array(blogBlockSchema) }),
    z.object({
      type: z.literal("split"),
      side: z.enum(["left", "right"]),
      step: z.number().int().positive().optional(),
      image: imageSchema,
      blocks: z.array(blogBlockSchema).min(1),
    }),
  ])
);

export const blogBlockArraySchema = z.array(blogBlockSchema);

const baseArticleSchema = z.object({
  title: z.string().trim().min(1).max(200),
  slug: z.string().trim().toLowerCase().regex(SLUG_PATTERN).optional(),
  format: articleFormatEnum,
  excerpt: z.string().trim().min(1).max(300),
  content: blogBlockArraySchema,
  coverImage: imageSchema,
  category: objectId,
  tags: z.array(objectId).max(20).optional(),
  seoTitle: z.string().trim().min(1).max(70),
  description: z.string().trim().min(1).max(200),
  keywords: z.array(z.string().trim().min(1)).max(20).optional(),
  sourceOutlet: z.string().trim().max(150).optional(),
  sourceUrl: z.string().trim().url("Must be a valid URL").optional(),
  legacyUrl: z.string().trim().url("Must be a valid URL").optional(),
  videoUrl: z.string().trim().url("Must be a valid URL").optional(),
  webinar: z.object({
    startsAt: z.coerce.date().optional(),
    endsAt: z.coerce.date().optional(),
    registrationUrl: z.string().trim().url().optional(),
  }).optional(),
});

export const createArticleSchema = baseArticleSchema.superRefine((data, ctx) => {
  if (data.format === "article" && data.content.length === 0) {
    ctx.addIssue({ code: "custom", path: ["content"], message: "Article format requires content blocks" });
  }
  if (data.format === "video" && !data.videoUrl) {
    ctx.addIssue({ code: "custom", path: ["videoUrl"], message: "Video format requires videoUrl" });
  }
  if (data.format === "webinar" && !data.webinar) {
    ctx.addIssue({ code: "custom", path: ["webinar"], message: "Webinar format requires webinar details" });
  }
});
export type CreateArticleInput = z.infer<typeof createArticleSchema>;

export const updateArticleSchema = baseArticleSchema.partial().superRefine((data, ctx) => {
  if (data.format === "video" && data.videoUrl === undefined) return;
  if (data.format === "video" && !data.videoUrl) {
    ctx.addIssue({ code: "custom", path: ["videoUrl"], message: "Video format requires videoUrl" });
  }
}).refine((data) => Object.keys(data).length > 0, { message: "At least one field must be provided" });
export type UpdateArticleInput = z.infer<typeof updateArticleSchema>;

export const featureArticleSchema = z.object({ isFeatured: z.boolean() });

const listBase = z.object({
  format: articleFormatEnum.optional(),
  category: z.string().trim().optional(),
  tag: z.string().trim().optional(),
  q: z.string().trim().optional(),
  featured: z.enum(["true", "false"]).optional().transform((v) => v === undefined ? undefined : v === "true"),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(12),
});

export const listArticlesQuerySchema = listBase;
export const listAdminArticlesQuerySchema = listBase.extend({ status: z.enum(["draft", "published", "archived"]).optional() });
