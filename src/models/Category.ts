import mongoose, { Schema, type Document } from "mongoose";

export const ARTICLE_FORMATS = ["article", "video", "webinar"] as const;
export type ArticleFormat = (typeof ARTICLE_FORMATS)[number];

export interface ICategory extends Document {
  name: string;
  slug: string;
  description?: string | null;
  sortOrder: number;
  allowedFormats: ArticleFormat[];
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, trim: true, unique: true },
    slug: { type: String, required: true, trim: true, lowercase: true, unique: true },
    description: { type: String, trim: true, default: null },
    sortOrder: { type: Number, default: 0 },
    allowedFormats: {
      type: [String],
      enum: ARTICLE_FORMATS,
      required: true,
      default: ["article"],
      validate: {
        validator: (value: ArticleFormat[]) => Array.isArray(value) && value.length > 0,
        message: "A category must allow at least one format",
      },
    },
  },
  { timestamps: true, collection: "categories" }
);

categorySchema.index({ sortOrder: 1, name: 1 });

export const Category = mongoose.model<ICategory>("Category", categorySchema);
