import type { Request, Response } from "express";

import {
  createArticleSchema,
  updateArticleSchema,
  featureArticleSchema,
  listArticlesQuerySchema,
  listAdminArticlesQuerySchema,
} from "../validators/article.validator.js";
import * as articleService from "../services/article.service.js";

const ERROR_STATUS: Record<string, number> = {
  "Article not found": 404,
  "Category not found": 400,
  "One or more tags were not found": 400,
  "Could not derive a slug from the title": 400,
  "An article with this slug already exists": 409,
  "You can only modify your own articles": 403,
  "This article has already been published/archived and can no longer be edited by a contributor": 403,
};

type ArticleListFilters = Parameters<
  typeof articleService.listAdminArticles
>[0];

type BuildListFiltersInput = {
  format?: "article" | "video" | "webinar" | undefined;
  q?: string | undefined;
  featured?: boolean | undefined;
  status?: "archived" | "draft" | "published" | undefined;
  page: number;
  limit: number;
  category?: string | undefined;
  tag?: string | undefined;
};

function handleKnownError(error: unknown, res: Response): boolean {
  if (!(error instanceof Error)) return false;

  if (ERROR_STATUS[error.message]) {
    res.status(ERROR_STATUS[error.message]!).json({
      success: false,
      message: error.message,
    });
    return true;
  }

  if (
    error.message.startsWith("Format '") ||
    error.message.startsWith("Video format") ||
    error.message.startsWith("Webinar format") ||
    error.message.startsWith("Article format")
  ) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
    return true;
  }

  return false;
}

function currentUser(req: Request) {
  // req.user is guaranteed by the `authenticate` middleware
  return req.user!;
}

function buildListFilters(
  input: BuildListFiltersInput
): ArticleListFilters {
  const filters: ArticleListFilters = {
    page: input.page,
    limit: input.limit,
  };

  if (input.format !== undefined) {
    filters.format = input.format;
  }

  if (input.q !== undefined) {
    filters.q = input.q;
  }

  if (input.featured !== undefined) {
    filters.featured = input.featured;
  }

  if (input.status !== undefined) {
    filters.status = input.status;
  }

  if (input.category !== undefined) {
    filters.categorySlug = input.category;
  }

  if (input.tag !== undefined) {
    filters.tagSlug = input.tag;
  }

  return filters;
}

export async function create(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const validationResult = createArticleSchema.safeParse(req.body);

    if (!validationResult.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationResult.error.flatten().fieldErrors,
      });
      return;
    }

    const article = await articleService.createArticle(
      validationResult.data,
      currentUser(req)
    );

    res.status(201).json({
      success: true,
      article,
    });
  } catch (error) {
    if (handleKnownError(error, res)) return;

    console.error("Create article error:", error);

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

export async function update(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const validationResult = updateArticleSchema.safeParse(req.body);

    if (!validationResult.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationResult.error.flatten().fieldErrors,
      });
      return;
    }

    const article = await articleService.updateArticle(
      req.params.id as string,
      validationResult.data,
      currentUser(req)
    );

    res.status(200).json({
      success: true,
      article,
    });
  } catch (error) {
    if (handleKnownError(error, res)) return;

    console.error("Update article error:", error);

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

export async function remove(
  req: Request,
  res: Response
): Promise<void> {
  try {
    await articleService.deleteArticle(
      req.params.id as string,
      currentUser(req)
    );

    res.status(200).json({
      success: true,
      message: "Deleted",
    });
  } catch (error) {
    if (handleKnownError(error, res)) return;

    console.error("Delete article error:", error);

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

export async function publish(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const article = await articleService.publishArticle(
      req.params.id as string,
      currentUser(req)
    );

    res.status(200).json({
      success: true,
      article,
    });
  } catch (error) {
    if (handleKnownError(error, res)) return;

    console.error("Publish article error:", error);

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

export async function archive(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const article = await articleService.archiveArticle(
      req.params.id as string,
      currentUser(req)
    );

    res.status(200).json({
      success: true,
      article,
    });
  } catch (error) {
    if (handleKnownError(error, res)) return;

    console.error("Archive article error:", error);

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

export async function feature(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const validationResult = featureArticleSchema.safeParse(req.body);

    if (!validationResult.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationResult.error.flatten().fieldErrors,
      });
      return;
    }

    const article = await articleService.setFeatured(
      req.params.id as string,
      validationResult.data.isFeatured,
      currentUser(req)
    );

    res.status(200).json({
      success: true,
      article,
    });
  } catch (error) {
    if (handleKnownError(error, res)) return;

    console.error("Feature article error:", error);

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

export async function getAdminOne(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const article = await articleService.getAdminArticleById(
      req.params.id as string,
      currentUser(req)
    );

    res.status(200).json({
      success: true,
      article,
    });
  } catch (error) {
    if (handleKnownError(error, res)) return;

    console.error("Get article error:", error);

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

export async function listAdmin(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const validationResult =
      listAdminArticlesQuerySchema.safeParse(req.query);

    if (!validationResult.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationResult.error.flatten().fieldErrors,
      });
      return;
    }

    const filters = buildListFilters(validationResult.data);

    const result = await articleService.listAdminArticles(
      filters,
      currentUser(req)
    );

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("List admin articles error:", error);

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

export async function listPublic(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const validationResult =
      listArticlesQuerySchema.safeParse(req.query);

    if (!validationResult.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationResult.error.flatten().fieldErrors,
      });
      return;
    }

    const filters = buildListFilters(validationResult.data);

    const result =
      await articleService.listPublishedArticles(filters);

    res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("List public articles error:", error);

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

export async function featured(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const result =
      await articleService.listPublishedArticles({
        featured: true,
        page: 1,
        limit: Number(req.query.limit) || 6,
      });

    res.status(200).json({
      success: true,
      items: result.items,
    });
  } catch (error) {
    console.error("Featured articles error:", error);

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

export async function getBySlug(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const article =
      await articleService.getPublishedArticleBySlug(
        req.params.slug as string
      );

    res.status(200).json({
      success: true,
      article,
    });
  } catch (error) {
    if (handleKnownError(error, res)) return;

    console.error("Get article by slug error:", error);

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}