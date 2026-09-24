import mongoose, { Document, Schema } from "mongoose";

export interface IAdminSession extends Document {
  userId: mongoose.Types.ObjectId;
  refreshTokenHash: string;
  expiresAt: Date;
  revokedAt?: Date | null;
  userAgent?: string | null;
  ipAddress?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const adminSessionSchema = new Schema<IAdminSession>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "AdminUser",
      required: true,
      index: true,
    },

    refreshTokenHash: {
      type: String,
      required: true,
      select: false,
    },

    expiresAt: {
      type: Date,
      required: true,
      // TTL index: MongoDB auto-deletes the doc once expiresAt passes,
      // so rotated-out/expired sessions don't accumulate forever.
      index: { expireAfterSeconds: 0 },
    },

    revokedAt: {
      type: Date,
      default: null,
      index: true,
    },

    userAgent: {
      type: String,
      default: null,
    },

    ipAddress: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "admin_sessions",
  }
);

adminSessionSchema.index({ userId: 1, revokedAt: 1, expiresAt: 1 });

export const AdminSession = mongoose.model<IAdminSession>(
  "AdminSession",
  adminSessionSchema
);
