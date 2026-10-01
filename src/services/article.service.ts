import { Types } from "mongoose";

import {
  Article,
  type IArticle,
  type ArticleStatus,
  type BlogBlock,
} from "../models/Article.js";

import { Category } from "../models/Category.js";
import { Tag } from "../models/Tag.js";
import { slugify } from "../utils/slugify.js";
import { sanitizeBlogBlocks } from "../utils/sanitizeContent.js";
import { estimateReadTimeMinutes } from "../utils/readTime.js";
import {
  logActivity,
  getActorSnapshot,
} from "./activityLog.service.js";

import type {
  CreateArticleInput,
  UpdateArticleInput,
} from "../validators/article.validator.js";

interface RequestingUser {
  userId: string;
  role: "admin" | "editor" | "contributor";
}

interface ListFilters {
  format?: "article" | "video" | "webinar";
  categorySlug?: string;
  tagSlug?: string;
  q?: string;
  featured?: boolean;
  status?: ArticleStatus;
  page: number;
  limit: number;
}

interface WebinarInput {
  startsAt?: Date | null | undefined;
  endsAt?: Date | null | undefined;
  registrationUrl?: string | null | undefined;
}

interface WebinarData {
  startsAt?: Date | null;
  endsAt?: Date | null;
  registrationUrl?: string | null;
}

const ADMIN_POPULATE = [
  {
    path: "category",
    select: "name slug description sortOrder allowedFormats",
  },
  {
    path: "tags",
    select: "name slug",
  },
  {
    path: "createdBy",
    select: "name email",
  },
  {
    path: "updatedBy",
    select: "name email",
  },
];

function dateLabel(date: Date | null | undefined) {
  if (!date) return "";

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function categoryName(category: any) {
  return category?.name ?? "";
}

function toPublic(doc: IArticle) {
  const category: any = doc.category;

  return {
    id: doc._id.toString(),
    slug: doc.slug,
    title: doc.title,
    seoTitle: doc.seoTitle,
    description: doc.description,
    keywords: doc.keywords,
    excerpt: doc.excerpt,
    tag: categoryName(category),
    date: doc.publishedAt
      ? doc.publishedAt.toISOString().slice(0, 10)
      : doc.createdAt.toISOString().slice(0, 10),
    dateLabel: dateLabel(doc.publishedAt ?? doc.createdAt),
    readingMinutes: doc.readTimeMinutes,
    hero: doc.coverImage,
    legacyUrl: doc.legacyUrl ?? "",
    format: doc.format,
    category: category ?? doc.category,
    tags: doc.tags,
    content: doc.content,
    status: doc.status,
    isFeatured: doc.isFeatured,
    publishedAt: doc.publishedAt ?? null,
    sourceOutlet: doc.sourceOutlet ?? null,
    sourceUrl: doc.sourceUrl ?? null,
    videoUrl: doc.videoUrl ?? null,
    webinar: doc.webinar ?? null,
    createdBy: doc.createdBy,
    updatedBy: doc.updatedBy,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

async function validateReferences(
  categoryId: string,
  tagIds?: string[]
) {
  const category = await Category.findById(categoryId);

  if (!category) {
    throw new Error("Category not found");
  }

  if (tagIds?.length) {
    const uniqueTags = [...new Set(tagIds)];

    const count = await Tag.countDocuments({
      _id: { $in: uniqueTags },
    });

    if (count !== uniqueTags.length) {
      throw new Error("One or more tags were not found");
    }
  }

  return category;
}

function assertFormatAllowed(
  category: { allowedFormats: string[] },
  format: string
) {
  if (!category.allowedFormats.includes(format)) {
    throw new Error(
      `Format '${format}' is not enabled for this category`
    );
  }
}

function normalizeWebinar(
  webinar: WebinarInput | null | undefined
): WebinarData | null {
  if (!webinar) {
    return null;
  }

  const result: WebinarData = {};

  if (webinar.startsAt !== undefined) {
    result.startsAt = webinar.startsAt;
  }

  if (webinar.endsAt !== undefined) {
    result.endsAt = webinar.endsAt;
  }

  if (webinar.registrationUrl !== undefined) {
    result.registrationUrl = webinar.registrationUrl;
  }

  return result;
}

function assertFormatFields(input: {
  format: "article" | "video" | "webinar";
  videoUrl?: string | null | undefined;
  webinar?: WebinarData | null | undefined;
  content?: BlogBlock[] | null | undefined;
}) {
  if (
    input.format === "article" &&
    (!input.content || input.content.length === 0)
  ) {
    throw new Error(
      "Article format requires content blocks"
    );
  }

  if (
    input.format === "video" &&
    !input.videoUrl
  ) {
    throw new Error(
      "Video format requires videoUrl"
    );
  }

  if (
    input.format === "webinar" &&
    !input.webinar
  ) {
    throw new Error(
      "Webinar format requires webinar details"
    );
  }
}

async function logArticleActivity(
  user: RequestingUser,
  action: string,
  article: {
    _id: unknown;
    title: string;
  },
  metadata?: Record<string, unknown>
) {
  const actor = await getActorSnapshot(
    user.userId
  );

  if (!actor) {
    return;
  }

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
  const slug =
    input.slug || slugify(input.title);

  if (!slug) {
    throw new Error(
      "Could not derive a slug from the title"
    );
  }

  if (await Article.exists({ slug })) {
    throw new Error(
      "An article with this slug already exists"
    );
  }

  const category = await validateReferences(
    input.category,
    input.tags
  );

  assertFormatAllowed(
    category,
    input.format
  );

  const normalizedWebinar =
    normalizeWebinar(input.webinar);

  assertFormatFields({
    format: input.format,
    videoUrl: input.videoUrl,
    webinar: normalizedWebinar,
    content: input.content as BlogBlock[] | undefined,
  });

  const content =
    input.content !== undefined
      ? sanitizeBlogBlocks(
          input.content as BlogBlock[]
        )
      : [];

  const article = await Article.create({
    title: input.title,
    slug,
    format: input.format,
    excerpt: input.excerpt,
    content,
    coverImage: input.coverImage,
    category: new Types.ObjectId(input.category),
    tags: input.tags ?? [],
    seoTitle: input.seoTitle,
    description: input.description,
    keywords: input.keywords ?? [],
    sourceOutlet: input.sourceOutlet ?? null,
    sourceUrl: input.sourceUrl ?? null,
    legacyUrl: input.legacyUrl ?? null,
    videoUrl: input.videoUrl ?? null,
    webinar: normalizedWebinar,
    readTimeMinutes: estimateReadTimeMinutes(content),
    status: "draft",
    isFeatured: false,
    publishedAt: null,
    createdBy: new Types.ObjectId(user.userId),
    updatedBy: new Types.ObjectId(user.userId),
  });

  await logArticleActivity(
    user,
    "article.created",
    article,
    {
      format: article.format,
      category: category.slug,
    }
  );

  return toPublic(article);
}

async function findEditableOrThrow(
  id: string,
  user: RequestingUser
) {
  const article =
    await Article.findById(id);

  if (!article) {
    throw new Error("Article not found");
  }

  if (
    user.role === "contributor" &&
    (
      article.createdBy.toString() !== user.userId ||
      article.status !== "draft"
    )
  ) {
    throw new Error(
      article.createdBy.toString() !== user.userId
        ? "You can only modify your own articles"
        : "This article has already been published/archived and can no longer be edited by a contributor"
    );
  }

  return article;
}

export async function updateArticle(
  id: string,
  input: UpdateArticleInput,
  user: RequestingUser
) {
  const article =
    await findEditableOrThrow(id, user);

  const categoryId =
    input.category ??
    article.category.toString();

  const format =
    input.format ??
    article.format;

  const category =
    await validateReferences(
      categoryId,
      input.tags
    );

  assertFormatAllowed(
    category,
    format
  );

  const videoUrl =
    input.videoUrl !== undefined
      ? input.videoUrl
      : article.videoUrl;

  const webinar =
    input.webinar !== undefined
      ? normalizeWebinar(input.webinar)
      : normalizeWebinar(article.webinar);

  const content =
    input.content !== undefined
      ? (input.content as BlogBlock[])
      : (article.content as BlogBlock[]);

  assertFormatFields({
    format,
    videoUrl,
    webinar,
    content,
  });

  if (
    input.slug &&
    input.slug !== article.slug &&
    await Article.exists({
      slug: input.slug,
      _id: { $ne: id },
    })
  ) {
    throw new Error(
      "An article with this slug already exists"
    );
  }

  if (input.title !== undefined) {
    article.title = input.title;
  }

  if (input.slug !== undefined) {
    article.slug = input.slug;
  }

  if (input.format !== undefined) {
    article.format = input.format;
  }

  if (input.excerpt !== undefined) {
    article.excerpt = input.excerpt;
  }

  if (input.coverImage !== undefined) {
    article.coverImage = input.coverImage;
  }

  if (input.category !== undefined) {
    article.category =
      new Types.ObjectId(input.category);
  }

  if (input.tags !== undefined) {
    article.tags =
      input.tags.map(
        (tag) => new Types.ObjectId(tag)
      );
  }

  if (input.seoTitle !== undefined) {
    article.seoTitle = input.seoTitle;
  }

  if (input.description !== undefined) {
    article.description =
      input.description;
  }

  if (input.keywords !== undefined) {
    article.keywords =
      input.keywords;
  }

  if (input.sourceOutlet !== undefined) {
    article.sourceOutlet =
      input.sourceOutlet;
  }

  if (input.sourceUrl !== undefined) {
    article.sourceUrl =
      input.sourceUrl;
  }

  if (input.legacyUrl !== undefined) {
    article.legacyUrl =
      input.legacyUrl;
  }

  if (input.videoUrl !== undefined) {
    article.videoUrl =
      input.videoUrl;
  }

  if (input.webinar !== undefined) {
    article.webinar =
      normalizeWebinar(input.webinar);
  }

  if (input.content !== undefined) {
    article.content =
      sanitizeBlogBlocks(
        input.content as BlogBlock[]
      );

    article.readTimeMinutes =
      estimateReadTimeMinutes(
        article.content
      );
  }

  article.updatedBy =
    new Types.ObjectId(
      user.userId
    );

  await article.save();

  return toPublic(article);
}

export async function deleteArticle(
  id: string,
  user: RequestingUser
) {
  const article =
    await findEditableOrThrow(id, user);

  const snapshot = {
    _id: article._id,
    title: article.title,
  };

  await article.deleteOne();

  await logArticleActivity(
    user,
    "article.deleted",
    snapshot
  );
}

export async function publishArticle(
  id: string,
  user: RequestingUser
) {
  const article =
    await Article.findById(id);

  if (!article) {
    throw new Error("Article not found");
  }

  const category =
    await Category.findById(
      article.category
    );

  if (!category) {
    throw new Error("Category not found");
  }

  assertFormatAllowed(
    category,
    article.format
  );

  const webinar =
    normalizeWebinar(article.webinar);

  const videoUrl =
    article.videoUrl;

  const content =
    article.content as BlogBlock[];

  assertFormatFields({
    format: article.format,
    videoUrl,
    webinar,
    content,
  });

  const previousStatus =
    article.status;

  article.publishedAt =
    article.publishedAt ??
    new Date();

  article.status = "published";

  article.updatedBy =
    new Types.ObjectId(
      user.userId
    );

  await article.save();

  await logArticleActivity(
    user,
    "article.published",
    article,
    {
      from: previousStatus,
    }
  );

  return toPublic(article);
}

export async function archiveArticle(
  id: string,
  user: RequestingUser
) {
  const article =
    await Article.findById(id);

  if (!article) {
    throw new Error("Article not found");
  }

  const previousStatus =
    article.status;

  article.status = "archived";

  article.updatedBy =
    new Types.ObjectId(
      user.userId
    );

  await article.save();

  await logArticleActivity(
    user,
    "article.archived",
    article,
    {
      from: previousStatus,
    }
  );

  return toPublic(article);
}

export async function setFeatured(
  id: string,
  isFeatured: boolean,
  user: RequestingUser
) {
  const article =
    await Article.findById(id);

  if (!article) {
    throw new Error("Article not found");
  }

  article.isFeatured =
    isFeatured;

  article.updatedBy =
    new Types.ObjectId(
      user.userId
    );

  await article.save();

  await logArticleActivity(
    user,
    isFeatured
      ? "article.featured"
      : "article.unfeatured",
    article
  );

  return toPublic(article);
}

export async function getAdminArticleById(
  id: string,
  user: RequestingUser
) {
  const article =
    await Article.findById(id)
      .populate(ADMIN_POPULATE);

  if (!article) {
    throw new Error("Article not found");
  }

  if (
    user.role === "contributor" &&
    article.createdBy.toString() !==
      user.userId
  ) {
    throw new Error("Article not found");
  }

  return toPublic(article);
}

function buildQuery(
  filters: ListFilters
) {
  const query: Record<string, any> = {};

  if (filters.format) {
    query.format = filters.format;
  }

  if (filters.status) {
    query.status = filters.status;
  }

  if (filters.featured !== undefined) {
    query.isFeatured =
      filters.featured;
  }

  if (filters.q) {
    query.$text = {
      $search: filters.q,
    };
  }

  return query;
}

async function applyTaxonomyFilters(
  query: Record<string, any>,
  filters: ListFilters
) {
  if (filters.categorySlug) {
    const category =
      await Category.findOne({
        slug: filters.categorySlug,
      });

    query.category =
      category?._id ?? null;
  }

  if (filters.tagSlug) {
    const tag =
      await Tag.findOne({
        slug: filters.tagSlug,
      });

    query.tags =
      tag?._id ?? null;
  }
}

export async function listAdminArticles(
  filters: ListFilters,
  user: RequestingUser
) {
  const query =
    buildQuery(filters);

  if (
    user.role === "contributor"
  ) {
    query.createdBy =
      user.userId;
  }

  await applyTaxonomyFilters(
    query,
    filters
  );

  const skip =
    (filters.page - 1) *
    filters.limit;

  const [items, total] =
    await Promise.all([
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
      pages: Math.ceil(
        total / filters.limit
      ),
    },
  };
}

export async function listPublishedArticles(
  filters: ListFilters
) {
  const query = {
    ...buildQuery(filters),

    status: "published",

    publishedAt: {
      $lte: new Date(),
    },
  } as Record<string, any>;

  await applyTaxonomyFilters(
    query,
    filters
  );

  const skip =
    (filters.page - 1) *
    filters.limit;

  const [items, total] =
    await Promise.all([
      Article.find(query)
        .populate([
          {
            path: "category",
            select:
              "name slug description sortOrder allowedFormats",
          },
          {
            path: "tags",
            select: "name slug",
          },
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
      pages: Math.ceil(
        total / filters.limit
      ),
    },
  };
}

export async function getPublishedArticleBySlug(
  slug: string
) {
  const article =
    await Article.findOne({
      slug,
      status: "published",
      publishedAt: {
        $lte: new Date(),
      },
    }).populate([
      {
        path: "category",
        select:
          "name slug description sortOrder allowedFormats",
      },
      {
        path: "tags",
        select: "name slug",
      },
    ]);

  if (!article) {
    throw new Error("Article not found");
  }

  return toPublic(article);
}