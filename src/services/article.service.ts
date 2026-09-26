import { Types } from "mongoose";

import { Article, type IArticle, type ArticleType, type ArticleStatus } from "../models/Article.js";
import { Category } from "../models/Category.js";
import { Tag } from "../models/Tag.js";
import { slugify } from "../utils/slugify.js";
import { sanitizeArticleContent } from "../utils/sanitizeContent.js";
import { estimateReadTimeMinutes } from "../utils/readTime.js";
import { logActivity, getActorSnapshot } from "./activityLog.service.js";
import type {
  CreateArticleInput,
  UpdateArticleInput,
} from "../validators/article.validator.js";

interface RequestingUser {
  userId: string;
  role: "admin" | "editor" | "contributor";
}

interface ListFilters {
  type?: ArticleType | undefined;
  categorySlug?: string | undefined;
  tagSlug?: string | undefined;
  q?: string | undefined;
  featured?: boolean | undefined;
  status?: ArticleStatus | undefined;
  page: number;
  limit: number;
}

function toPublic(doc: IArticle) {
  return {
    id: doc._id.toString(),
    title: doc.title,
    slug: doc.slug,
    type: doc.type,
    excerpt: doc.excerpt,
    content: doc.content,
    coverImage: doc.coverImage,
    gallery: doc.gallery,
    category: doc.category,
    tags: doc.tags,
    status: doc.status,
    isFeatured: doc.isFeatured,
    publishedAt: doc.publishedAt ?? null,
    readTimeMinutes: doc.readTimeMinutes,
    seo: doc.seo ?? {},
    sourceOutlet: doc.sourceOutlet ?? null,
    sourceUrl: doc.sourceUrl ?? null,
    createdBy: doc.createdBy,
    updatedBy: doc.updatedBy,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

async function validateReferences(
  categoryId: string | undefined,
  tagIds: string[] | undefined
): Promise<void> {
  if (categoryId) {
    const category = await Category.findById(categoryId);
    if (!category) {
      throw new Error("Category not found");
    }
  }

  if (tagIds && tagIds.length > 0) {
    const count = await Tag.countDocuments({ _id: { $in: tagIds } });
    if (count !== tagIds.length) {
      throw new Error("One or more tags were not found");
    }
  }
}

function assertMediaCoverageHasSource(
  type: string,
  sourceUrl: string | null | undefined
): void {
  if (type === "media_coverage" && !sourceUrl) {
    throw new Error("sourceUrl is required for media_coverage articles");
  }
}

// zod's per-field .optional() produces `string | undefined` for each key,
// but the Mongoose-side ISeo type uses `string | null`. Under
// exactOptionalPropertyTypes these aren't interchangeable, so normalize
// here rather than fighting the type system at every call site.
function normalizeSeo(
  seo?: CreateArticleInput["seo"]
): { metaTitle: string | null; metaDescription: string | null; keywords: string[] } {
  return {
    metaTitle: seo?.metaTitle ?? null,
    metaDescription: seo?.metaDescription ?? null,
    keywords: seo?.keywords ?? [],
  };
}

const ADMIN_POPULATE = [
  { path: "category", select: "name slug" },
  { path: "tags", select: "name slug" },
  { path: "createdBy", select: "name email" },
  { path: "updatedBy", select: "name email" },
];

async function logArticleActivity(
  user: RequestingUser,
  action: string,
  article: { _id: unknown; title: string },
  metadata?: Record<string, unknown>
): Promise<void> {
  const actor = await getActorSnapshot(user.userId);
  if (!actor) return;

  await logActivity({
    actor,
    action,
    resourceType: "Article",
    resourceId: String(article._id),
    resourceLabel: article.title,
    metadata,
  });
}

export async function createArticle(
  input: CreateArticleInput,
  user: RequestingUser
) {
  const slug = input.slug || slugify(input.title);

  if (!slug) {
    throw new Error("Could not derive a slug from the title");
  }

  const existingSlug = await Article.findOne({ slug });
  if (existingSlug) {
    throw new Error("An article with this slug already exists");
  }

  await validateReferences(input.category, input.tags);
  assertMediaCoverageHasSource(input.type, input.sourceUrl);

  const content = sanitizeArticleContent(input.content);

  const article = await Article.create({
    title: input.title,
    slug,
    type: input.type,
    excerpt: input.excerpt,
    content,
    coverImage: input.coverImage,
    gallery: input.gallery ?? [],
    category: input.category ?? null,
    tags: input.tags ?? [],
    seo: normalizeSeo(input.seo),
    sourceOutlet: input.sourceOutlet ?? null,
    sourceUrl: input.sourceUrl ?? null,
    readTimeMinutes: estimateReadTimeMinutes(content),
    status: "draft",
    isFeatured: false,
    publishedAt: null,
    createdBy: user.userId,
    updatedBy: user.userId,
  });

  await logArticleActivity(user, "article.created", article, {
    type: article.type,
  });

  return toPublic(article);
}

async function findEditableOrThrow(
  id: string,
  user: RequestingUser
): Promise<InstanceType<typeof Article>> {
  const article = await Article.findById(id);

  if (!article) {
    throw new Error("Article not found");
  }

  if (user.role === "contributor") {
    if (article.createdBy.toString() !== user.userId) {
      throw new Error("You can only modify your own articles");
    }
    if (article.status !== "draft") {
      throw new Error(
        "This article has already been published/archived and can no longer be edited by a contributor"
      );
    }
  }

  return article;
}

export async function updateArticle(
  id: string,
  input: UpdateArticleInput,
  user: RequestingUser
) {
  const article = await findEditableOrThrow(id, user);

  if (input.category !== undefined || input.tags !== undefined) {
    await validateReferences(input.category, input.tags);
  }

  const nextType = input.type ?? article.type;
  const nextSourceUrl =
    input.sourceUrl !== undefined ? input.sourceUrl : article.sourceUrl;
  assertMediaCoverageHasSource(nextType, nextSourceUrl);

  if (input.slug && input.slug !== article.slug) {
    const conflict = await Article.findOne({
      slug: input.slug,
      _id: { $ne: id },
    });
    if (conflict) {
      throw new Error("An article with this slug already exists");
    }
    article.slug = input.slug;
  }

  if (input.title !== undefined) article.title = input.title;
  if (input.type !== undefined) article.type = input.type;
  if (input.excerpt !== undefined) article.excerpt = input.excerpt;
  if (input.coverImage !== undefined) article.coverImage = input.coverImage;
  if (input.gallery !== undefined) article.gallery = input.gallery;
  if (input.category !== undefined) {
    article.category = input.category ? new Types.ObjectId(input.category) : null;
  }
  if (input.tags !== undefined) {
    article.tags = input.tags.map((t) => new Types.ObjectId(t));
  }
  if (input.seo !== undefined) article.seo = normalizeSeo(input.seo);
  if (input.sourceOutlet !== undefined) article.sourceOutlet = input.sourceOutlet;
  if (input.sourceUrl !== undefined) article.sourceUrl = input.sourceUrl;

  if (input.content !== undefined) {
    const content = sanitizeArticleContent(input.content);
    article.content = content;
    article.readTimeMinutes = estimateReadTimeMinutes(content);
  }

  article.updatedBy = new Types.ObjectId(user.userId);

  await article.save();

  return toPublic(article);
}

export async function deleteArticle(
  id: string,
  user: RequestingUser
): Promise<void> {
  const article = await findEditableOrThrow(id, user);
  const snapshot = { _id: article._id, title: article.title };
  await article.deleteOne();
  await logArticleActivity(user, "article.deleted", snapshot);
}

export async function publishArticle(id: string, user: RequestingUser) {
  const article = await Article.findById(id);
  if (!article) throw new Error("Article not found");

  assertMediaCoverageHasSource(article.type, article.sourceUrl);

  if (article.status !== "published") {
    article.publishedAt = article.publishedAt ?? new Date();
  }
  const previousStatus = article.status;
  article.status = "published";
  article.updatedBy = new Types.ObjectId(user.userId);
  await article.save();

  await logArticleActivity(user, "article.published", article, {
    from: previousStatus,
  });

  return toPublic(article);
}

export async function archiveArticle(id: string, user: RequestingUser) {
  const article = await Article.findById(id);
  if (!article) throw new Error("Article not found");

  const previousStatus = article.status;
  article.status = "archived";
  article.updatedBy = new Types.ObjectId(user.userId);
  await article.save();

  await logArticleActivity(user, "article.archived", article, {
    from: previousStatus,
  });

  return toPublic(article);
}

export async function setFeatured(
  id: string,
  isFeatured: boolean,
  user: RequestingUser
) {
  const article = await Article.findById(id);
  if (!article) throw new Error("Article not found");

  article.isFeatured = isFeatured;
  article.updatedBy = new Types.ObjectId(user.userId);
  await article.save();

  await logArticleActivity(
    user,
    isFeatured ? "article.featured" : "article.unfeatured",
    article
  );

  return toPublic(article);
}

export async function getAdminArticleById(id: string, user: RequestingUser) {
  const article = await Article.findById(id).populate(ADMIN_POPULATE);

  if (!article) {
    throw new Error("Article not found");
  }

  if (
    user.role === "contributor" &&
    article.createdBy.toString() !== user.userId
  ) {
    throw new Error("Article not found");
  }

  return toPublic(article);
}

export async function listAdminArticles(
  filters: ListFilters,
  user: RequestingUser
) {
  const query: Record<string, any> = {};

  if (user.role === "contributor") {
    query.createdBy = user.userId;
  }

  if (filters.type) query.type = filters.type;
  if (filters.status) query.status = filters.status;
  if (filters.q) query.$text = { $search: filters.q };

  if (filters.categorySlug) {
    const category = await Category.findOne({ slug: filters.categorySlug });
    query.category = category ? category._id : null;
  }

  if (filters.tagSlug) {
    const tag = await Tag.findOne({ slug: filters.tagSlug });
    query.tags = tag ? tag._id : null;
  }

  const skip = (filters.page - 1) * filters.limit;

  const [items, total] = await Promise.all([
    Article.find(query)
      .populate(ADMIN_POPULATE)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(filters.limit),
    Article.countDocuments(query),
  ]);

  return {
    items: items.map(toPublic),
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total,
      pages: Math.ceil(total / filters.limit),
    },
  };
}

// ---- Public (published-only) reads ----

export async function listPublishedArticles(filters: ListFilters) {
  const query: Record<string, any> = {
    status: "published",
    publishedAt: { $lte: new Date() },
  };

  if (filters.type) query.type = filters.type;
  if (filters.featured !== undefined) query.isFeatured = filters.featured;
  if (filters.q) query.$text = { $search: filters.q };

  if (filters.categorySlug) {
    const category = await Category.findOne({ slug: filters.categorySlug });
    query.category = category ? category._id : null;
  }

  if (filters.tagSlug) {
    const tag = await Tag.findOne({ slug: filters.tagSlug });
    query.tags = tag ? tag._id : null;
  }

  const skip = (filters.page - 1) * filters.limit;

  const [items, total] = await Promise.all([
    Article.find(query)
      .populate([
        { path: "category", select: "name slug" },
        { path: "tags", select: "name slug" },
      ])
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(filters.limit),
    Article.countDocuments(query),
  ]);

  return {
    items: items.map(toPublic),
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total,
      pages: Math.ceil(total / filters.limit),
    },
  };
}

export async function getPublishedArticleBySlug(slug: string) {
  const article = await Article.findOne({
    slug,
    status: "published",
    publishedAt: { $lte: new Date() },
  }).populate([
    { path: "category", select: "name slug" },
    { path: "tags", select: "name slug" },
  ]);

  if (!article) {
    throw new Error("Article not found");
  }

  return toPublic(article);
}
