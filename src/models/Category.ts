import mongoose from "mongoose";

import { buildTaxonomySchema, type ITaxonomy } from "./taxonomy.schema.js";

export type ICategory = ITaxonomy;

export const Category = mongoose.model<ICategory>(
  "Category",
  buildTaxonomySchema("categories")
);
