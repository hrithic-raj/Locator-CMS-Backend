import mongoose, { Document, Schema } from "mongoose";

export type AdminRole = "admin" | "editor";

export interface IAdminUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: AdminRole;
  refreshToken?: string | null;
  lastLoginAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const adminUserSchema = new Schema<IAdminUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    passwordHash: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: ["admin", "editor"],
      default: "editor",
      required: true,
    },

    refreshToken: {
      type: String,
      default: null,
    },

    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "admin_users",
  }
);

export const AdminUser = mongoose.model<IAdminUser>(
  "AdminUser",
  adminUserSchema
);