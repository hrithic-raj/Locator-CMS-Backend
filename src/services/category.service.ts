import { Article } from "../models/Article.js";
import { Category, type ArticleFormat } from "../models/Category.js";
import { slugify } from "../utils/slugify.js";
import type { CreateCategoryInput, UpdateCategoryInput } from "../validators/taxonomy.validator.js";

function toPublic(category: InstanceType<typeof Category>) {
  return {
    id: category._id.toString(),
    name: category.name,
    slug: category.slug,
    description: category.description ?? null,
    sortOrder: category.sortOrder,
    allowedFormats: category.allowedFormats,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  };
}

async function assertUnique(name: string, slug: string, excludeId?: string) {
  const conflict = await Category.findOne({
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    $or: [{ name }, { slug }],
  });
  if (conflict) {
    throw new Error(conflict.slug === slug ? "A category with this slug already exists" : "A category with this name already exists");
  }
}

export async function listCategories() {
  const categories = await Category.find().sort({ sortOrder: 1, name: 1 });
  return categories.map(toPublic);
}

export async function getCategoryById(id: string) {
  const category = await Category.findById(id);
  if (!category) throw new Error("Category not found");
  return toPublic(category);
}

export async function getCategoryBySlug(slug: string) {
  const category = await Category.findOne({ slug });
  if (!category) throw new Error("Category not found");
  return toPublic(category);
}

export async function createCategory(input: CreateCategoryInput) {
  const slug = input.slug || slugify(input.name);
  if (!slug) throw new Error("Could not derive a slug from the category name");
  await assertUnique(input.name, slug);

  const category = await Category.create({
    name: input.name,
    slug,
    description: input.description ?? null,
    sortOrder: input.sortOrder ?? 0,
    allowedFormats: [...new Set(input.allowedFormats)] as ArticleFormat[],
  });
  return toPublic(category);
}

export async function updateCategory(id: string, input: UpdateCategoryInput) {
  const category = await Category.findById(id);
  if (!category) throw new Error("Category not found");

  const nextName = input.name ?? category.name;
  const nextSlug = input.slug ?? category.slug;
  const nextFormats = (input.allowedFormats ?? category.allowedFormats) as ArticleFormat[];

  if (input.name !== undefined || input.slug !== undefined) await assertUnique(nextName, nextSlug, id);

  const formatsRemoved = category.allowedFormats.filter((format) => !nextFormats.includes(format));
  if (formatsRemoved.length > 0) {
    const blockingArticle = await Article.findOne({ category: category._id, format: { $in: formatsRemoved } }).select("_id title format");
    if (blockingArticle) {
      throw new Error(`Category format '${blockingArticle.format}' is used by article '${blockingArticle.title}'. Update that article before removing the format.`);
    }
  }

  if (input.name !== undefined) category.name = input.name;
  if (input.slug !== undefined) category.slug = input.slug;
  if (input.description !== undefined) category.description = input.description;
  if (input.sortOrder !== undefined) category.sortOrder = input.sortOrder;
  if (input.allowedFormats !== undefined) category.allowedFormats = [...new Set(input.allowedFormats)] as ArticleFormat[];

  await category.save();
  return toPublic(category);
}

export async function deleteCategory(id: string) {
  const category = await Category.findById(id);
  if (!category) throw new Error("Category not found");

  const articleCount = await Article.countDocuments({ category: category._id });
  if (articleCount > 0) {
    throw new Error(`Cannot delete category while ${articleCount} article(s) use it`);
  }

  await category.deleteOne();
}
