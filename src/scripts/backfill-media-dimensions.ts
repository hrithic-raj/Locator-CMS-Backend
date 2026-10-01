import "dotenv/config";
import path from "node:path";
import { connectDatabase } from "../config/database.js";
import { MediaAsset } from "../models/MediaAsset.js";
import { UPLOAD_ROOT } from "../config/upload.js";
import { getImageDimensions } from "../utils/imageDimensions.js";
import mongoose from "mongoose";

async function run() {
  await connectDatabase();
  const assets = await MediaAsset.find({ $or: [{ width: { $exists: false } }, { height: { $exists: false } }] });
  let updated = 0;
  for (const asset of assets) {
    try {
      const dimensions = await getImageDimensions(path.join(UPLOAD_ROOT, asset.filename), asset.mimeType);
      await MediaAsset.updateOne({ _id: asset._id }, { $set: dimensions });
      updated++;
    } catch (error) {
      console.warn(`Could not read dimensions for ${asset.filename}:`, error instanceof Error ? error.message : error);
    }
  }
  console.log(`Updated ${updated}/${assets.length} media assets.`);
  await mongoose.disconnect();
}
run().catch((error) => { console.error(error); process.exit(1); });
