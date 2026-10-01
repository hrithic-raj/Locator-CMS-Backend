import { Schema, type Document } from "mongoose";

export interface ITaxonomy extends Document {
  name: string;
  slug: string;
  description?: string | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export function buildTaxonomySchema(collection: string): Schema<ITaxonomy> {
  return new Schema<ITaxonomy>(
    {
      name: { type: String, required: true, trim: true, unique: true },
      slug: { type: String, required: true, trim: true, lowercase: true, unique: true },
      description: { type: String, trim: true, default: null },
      sortOrder: { type: Number, default: 0 },
    },
    { timestamps: true, collection }
  );
}
