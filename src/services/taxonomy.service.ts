import type { Model } from "mongoose";

import type { ITaxonomy } from "../models/taxonomy.schema.js";
import { slugify } from "../utils/slugify.js";
import type {
  CreateTaxonomyInput,
  UpdateTaxonomyInput,
} from "../validators/taxonomy.validator.js";

function toPublic(doc: ITaxonomy) {
  return {
    id: doc._id.toString(),
    name: doc.name,
    slug: doc.slug,
    description: doc.description ?? null,
    sortOrder: doc.sortOrder,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

/**
 * Category and Tag have identical CRUD behaviour, just different
 * collections. This factory is instantiated once per model rather than
 * duplicating the same six functions twice.
 */
export function createTaxonomyService(Model: Model<ITaxonomy>, label: string) {
  async function assertUnique(
    name: string,
    slug: string,
    excludeId?: string
  ): Promise<void> {
    const conflict = await Model.findOne({
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
      $or: [{ name }, { slug }],
    });

    if (conflict) {
      throw new Error(
        conflict.slug === slug
          ? `A ${label} with this slug already exists`
          : `A ${label} with this name already exists`
      );
    }
  }

  return {
    async create(input: CreateTaxonomyInput) {
      const slug = input.slug || slugify(input.name);

      if (!slug) {
        throw new Error(`Could not derive a slug from the ${label} name`);
      }

      await assertUnique(input.name, slug);

      const doc = await Model.create({
        name: input.name,
        slug,
        description: input.description ?? null,
        sortOrder: input.sortOrder ?? 0,
      });

      return toPublic(doc);
    },

    async list() {
      const docs = await Model.find().sort({ sortOrder: 1, name: 1 });
      return docs.map(toPublic);
    },

    async getById(id: string) {
      const doc = await Model.findById(id);

      if (!doc) {
        throw new Error(`${label} not found`);
      }

      return toPublic(doc);
    },

    async getBySlug(slug: string) {
      const doc = await Model.findOne({ slug });

      if (!doc) {
        throw new Error(`${label} not found`);
      }

      return toPublic(doc);
    },

    async update(id: string, input: UpdateTaxonomyInput) {
      const doc = await Model.findById(id);

      if (!doc) {
        throw new Error(`${label} not found`);
      }

      const nextName = input.name ?? doc.name;
      const nextSlug = input.slug ?? doc.slug;

      if (input.name || input.slug) {
        await assertUnique(nextName, nextSlug, id);
      }

      if (input.name !== undefined) doc.name = input.name;
      if (input.slug !== undefined) doc.slug = input.slug;
      if (input.description !== undefined) doc.description = input.description;
      if (input.sortOrder !== undefined) doc.sortOrder = input.sortOrder;

      await doc.save();

      return toPublic(doc);
    },

    async remove(id: string) {
      const doc = await Model.findById(id);

      if (!doc) {
        throw new Error(`${label} not found`);
      }

      // NOTE: once Articles exist, this should check whether any article
      // still references this category/tag before deleting (or reassign
      // them) — flagged here so it's not forgotten once M2 Articles lands.
      await doc.deleteOne();
    },
  };
}
