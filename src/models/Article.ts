import mongoose, { Document, Schema, Types } from "mongoose";
import type { ArticleFormat } from "./Category.js";

export type ArticleStatus = "draft" | "published" | "archived";

export interface IArticleImage {
  src: string;
  alt: string;
  width: number;
  height: number;
}

export type BlogInline = string;
export type BlogBlock =
  | { type: "heading"; level: 2 | 3; html: BlogInline }
  | { type: "p"; html: BlogInline }
  | { type: "quote"; html: BlogInline }
  | { type: "ul"; items: BlogInline[] }
  | { type: "ol"; items: BlogInline[] }
  | { type: "image"; image: IArticleImage }
  | { type: "table"; rows: { head: boolean; cells: BlogInline[] }[] }
  | { type: "group"; blocks: BlogBlock[] }
  | { type: "split"; side: "left" | "right"; step?: number; image: IArticleImage; blocks: BlogBlock[] };

export interface IArticle extends Document {
  title: string;
  slug: string;
  format: ArticleFormat;
  excerpt: string;
  content: BlogBlock[];
  coverImage: IArticleImage;
  category: Types.ObjectId;
  tags: Types.ObjectId[];
  status: ArticleStatus;
  isFeatured: boolean;
  publishedAt?: Date | null;
  readTimeMinutes: number;
  seoTitle: string;
  description: string;
  keywords: string[];
  sourceOutlet?: string | null;
  sourceUrl?: string | null;
  legacyUrl?: string | null;
  videoUrl?: string | null;
  webinar?: {
    startsAt?: Date | null;
    endsAt?: Date | null;
    registrationUrl?: string | null;
  } | null;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const imageSchema = new Schema<IArticleImage>(
  {
    src: { type: String, required: true, trim: true },
    alt: { type: String, required: true, default: "", trim: true, maxlength: 200 },
    width: { type: Number, required: true, min: 1 },
    height: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const webinarSchema = new Schema(
  {
    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },
    registrationUrl: { type: String, default: null },
  },
  { _id: false }
);

const articleSchema = new Schema<IArticle>(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    slug: { type: String, required: true, trim: true, lowercase: true, unique: true },
    format: { type: String, enum: ["article", "video", "webinar"], required: true },
    excerpt: { type: String, required: true, trim: true, maxlength: 300 },
    content: { type: [Schema.Types.Mixed] as any, required: true, default: [] },
    coverImage: { type: imageSchema, required: true },
    category: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    tags: { type: [Schema.Types.ObjectId], ref: "Tag", default: [] },
    status: { type: String, enum: ["draft", "published", "archived"], default: "draft", required: true },
    isFeatured: { type: Boolean, default: false },
    publishedAt: { type: Date, default: null },
    readTimeMinutes: { type: Number, default: 1, min: 1 },
    seoTitle: { type: String, required: true, trim: true, maxlength: 70 },
    description: { type: String, required: true, trim: true, maxlength: 200 },
    keywords: { type: [String], default: [] },
    sourceOutlet: { type: String, default: null },
    sourceUrl: { type: String, default: null },
    legacyUrl: { type: String, default: null },
    videoUrl: { type: String, default: null },
    webinar: { type: webinarSchema, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: "AdminUser", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "AdminUser", required: true },
  },
  { timestamps: true, collection: "articles" }
);

articleSchema.index({ status: 1, publishedAt: -1 });
articleSchema.index({ format: 1, status: 1, publishedAt: -1 });
articleSchema.index({ category: 1, status: 1, publishedAt: -1 });
articleSchema.index({ title: "text", excerpt: "text", description: "text" });

export const Article = mongoose.model<IArticle>("Article", articleSchema);
