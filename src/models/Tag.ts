import mongoose from "mongoose";

import { buildTaxonomySchema, type ITaxonomy } from "./taxonomy.schema.js";

export type ITag = ITaxonomy;

export const Tag = mongoose.model<ITag>("Tag", buildTaxonomySchema("tags"));
