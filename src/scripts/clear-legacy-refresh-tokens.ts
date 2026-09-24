import "dotenv/config";

import mongoose from "mongoose";

async function clearLegacyRefreshTokens(): Promise<void> {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error("MONGODB_URI is not defined");
  }

  await mongoose.connect(mongoUri);

  const result = await mongoose.connection
    .collection("admin_users")
    .updateMany(
      { refreshToken: { $exists: true } },
      { $unset: { refreshToken: "" } }
    );

  console.log(`Removed legacy refreshToken fields from ${result.modifiedCount} admin user(s).`);
  console.log("Existing refresh-token sessions are invalidated by this migration.");

  await mongoose.disconnect();
}

clearLegacyRefreshTokens().catch(async (error) => {
  console.error("Legacy refresh-token migration failed:", error);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
