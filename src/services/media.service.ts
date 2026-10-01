import { unlink } from "node:fs/promises";
import path from "node:path";
import { MediaAsset } from "../models/MediaAsset.js";
import { toAbsoluteFileUrl } from "../utils/fileUrl.js";
import { UPLOAD_ROOT } from "../config/upload.js";
import { getImageDimensions } from "../utils/imageDimensions.js";

function toPublic(asset: InstanceType<typeof MediaAsset>) {
  return {
    id: asset._id.toString(),
    url: toAbsoluteFileUrl(asset.path),
    src: toAbsoluteFileUrl(asset.path),
    originalName: asset.originalName,
    mimeType: asset.mimeType,
    size: asset.size,
    width: asset.width,
    height: asset.height,
    uploadedBy: asset.uploadedBy.toString(),
    createdAt: asset.createdAt,
  };
}

export async function recordUpload(file: Express.Multer.File, uploadedBy: string) {
  const dimensions = await getImageDimensions(file.path, file.mimetype);
  const relativePath = `/uploads/images/${file.filename}`;
  const asset = await MediaAsset.create({
    filename: file.filename,
    originalName: file.originalname,
    path: relativePath,
    mimeType: file.mimetype,
    size: file.size,
    width: dimensions.width,
    height: dimensions.height,
    uploadedBy,
  });
  return toPublic(asset);
}

export async function listMedia(page: number, limit: number) {
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    MediaAsset.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
    MediaAsset.countDocuments(),
  ]);
  return { items: items.map(toPublic), pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
}

export async function deleteMedia(id: string) {
  const asset = await MediaAsset.findById(id);
  if (!asset) throw new Error("Media asset not found");
  try { await unlink(path.join(UPLOAD_ROOT, asset.filename)); } catch {}
  await asset.deleteOne();
}
