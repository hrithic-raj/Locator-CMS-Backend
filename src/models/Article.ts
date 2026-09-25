import mongoose, { Document, Schema, Types } from "mongoose";

export type ArticleType =
  | "blog"
  | "company_news"
  | "customer_story"
  | "media_coverage";

export type ArticleStatus = "draft" | "published" | "archived";

export interface IArticleImage {
  url: string;
  alt: string;
}

export interface ISeo {
  metaTitle?: string | null;
  metaDescription?: string | null;
  keywords?: string[];
}

export interface IArticle extends Document {
  title: string;
  slug: string;
  type: ArticleType;
  excerpt: string;
  content: string;
  coverImage: IArticleImage;
  gallery: IArticleImage[];
  category?: Types.ObjectId | null;
  tags: Types.ObjectId[];
  status: ArticleStatus;
  isFeatured: boolean;
  publishedAt?: Date | null;
  readTimeMinutes: number;
  seo?: ISeo;
  sourceOutlet?: string | null;
  sourceUrl?: string | null;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const imageSchema = new Schema<IArticleImage>(
  {
    url: { type: String, required: true },
    alt: { type: String, required: true, default: "" },
  },
  { _id: false }
);

const seoSchema = new Schema<ISeo>(
  {
    metaTitle: { type: String, default: null },
    metaDescription: { type: String, default: null },
    keywords: { type: [String], default: [] },
  },
  { _id: false }
);

const articleSchema = new Schema<IArticle>(
  {
    title: { type: String, required: true, trim: true },

    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
    },

    type: {
      type: String,
      enum: ["blog", "company_news", "customer_story", "media_coverage"],
      required: true,
    },

    excerpt: { type: String, required: true, trim: true },

    content: { type: String, required: true },

    coverImage: { type: imageSchema, required: true },

    gallery: { type: [imageSchema], default: [] },

    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },

    tags: [{ type: Schema.Types.ObjectId, ref: "Tag" }],

    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
      required: true,
    },

    isFeatured: { type: Boolean, default: false },

    publishedAt: { type: Date, default: null },

    readTimeMinutes: { type: Number, default: 1 },

    seo: { type: seoSchema, default: () => ({}) },

    sourceOutlet: { type: String, default: null },
    sourceUrl: { type: String, default: null },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "AdminUser",
      required: true,
    },

    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "AdminUser",
      required: true,
    },
  },
  {
    timestamps: true,
    collection: "articles",
  }
);

// Public listing/detail queries filter by these together constantly.
articleSchema.index({ status: 1, publishedAt: -1 });
articleSchema.index({ type: 1, status: 1, publishedAt: -1 });
articleSchema.index({ title: "text", excerpt: "text", content: "text" });

export const Article = mongoose.model<IArticle>("Article", articleSchema);
