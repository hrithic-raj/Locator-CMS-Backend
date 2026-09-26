import mongoose, { Document, Schema, Types } from "mongoose";

import type { AdminRole } from "./AdminUser.js";

export interface IActorSnapshot {
  id: Types.ObjectId;
  name: string;
  email: string;
  role: AdminRole;
}

export interface IActivityLog extends Document {
  actor: IActorSnapshot;
  action: string;
  resourceType: string;
  resourceId?: Types.ObjectId | null;
  resourceLabel?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: Date;
}

const actorSchema = new Schema<IActorSnapshot>(
  {
    id: { type: Schema.Types.ObjectId, ref: "AdminUser", required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    role: { type: String, required: true },
  },
  { _id: false }
);

const activityLogSchema = new Schema<IActivityLog>(
  {
    actor: { type: actorSchema, required: true },
    action: { type: String, required: true },
    resourceType: { type: String, required: true },
    resourceId: { type: Schema.Types.ObjectId, default: null },
    resourceLabel: { type: String, default: null },
    metadata: { type: Schema.Types.Mixed, default: {} },
    ipAddress: { type: String, default: null },
    userAgent: { type: String, default: null },
  },
  {
    // Logs are write-once — no updatedAt needed.
    timestamps: { createdAt: true, updatedAt: false },
    collection: "activity_logs",
  }
);

activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ "actor.id": 1, createdAt: -1 });
activityLogSchema.index({ resourceType: 1, resourceId: 1, createdAt: -1 });
activityLogSchema.index({ action: 1, createdAt: -1 });

export const ActivityLog = mongoose.model<IActivityLog>(
  "ActivityLog",
  activityLogSchema
);
