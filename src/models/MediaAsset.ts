import mongoose, { Document, Schema, Types } from "mongoose";

export interface IMediaAsset extends Document {
  filename: string;
  originalName: string;
  path: string; // relative, e.g. "/uploads/images/xxx.webp"
  mimeType: string;
  size: number;
  uploadedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const mediaAssetSchema = new Schema<IMediaAsset>(
  {
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    path: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: "AdminUser",
      required: true,
    },
  },
  {
    timestamps: true,
    collection: "media_library",
  }
);

export const MediaAsset = mongoose.model<IMediaAsset>(
  "MediaAsset",
  mediaAssetSchema
);
