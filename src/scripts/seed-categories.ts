import "dotenv/config";
import { connectDatabase } from "../config/database.js";
import { Category } from "../models/Category.js";

const STARTER_CATEGORIES = [
  { name: "Product Updates", allowedFormats: ["article", "video"] },
  { name: "Company News", allowedFormats: ["article", "video"] },
  { name: "Events", allowedFormats: ["article", "webinar"] },
  { name: "Customer Stories", allowedFormats: ["article", "video"] },
  { name: "Media Coverage", allowedFormats: ["article", "video"] },
  { name: "Blog", allowedFormats: ["article"] },
  { name: "Videos", allowedFormats: ["video"] },
] as const;

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

async function run() {
  await connectDatabase();
  for (const [index, item] of STARTER_CATEGORIES.entries()) {
    await Category.findOneAndUpdate(
      { slug: slugify(item.name) },
      { $set: { name: item.name, allowedFormats: item.allowedFormats, sortOrder: index } },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );
  }
  console.log("Starter categories seeded.");
  await import("mongoose").then(({ default: mongoose }) => mongoose.disconnect());
}

run().catch((error) => { console.error(error); process.exit(1); });
