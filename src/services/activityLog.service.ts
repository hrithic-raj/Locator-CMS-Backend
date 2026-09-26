import { ActivityLog } from "../models/ActivityLog.js";
import { AdminUser, type AdminRole } from "../models/AdminUser.js";

interface ActorInfo {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
}

/**
 * Convenience for services that only have a requesting userId (not the
 * full acting user's name/email in hand already) — used wherever a write
 * action needs to log who performed it.
 */
export async function getActorSnapshot(
  userId: string
): Promise<ActorInfo | null> {
  const user = await AdminUser.findById(userId);
  if (!user) return null;

  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

interface LogActivityInput {
  actor: ActorInfo;
  action: string;
  resourceType: string;
  resourceId?: string | undefined;
  resourceLabel?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
  ipAddress?: string | null | undefined;
  userAgent?: string | null | undefined;
}

/**
 * Fire-and-forget by design: a bug here should never be able to block or
 * fail the real action being logged (publishing an article, deleting a
 * user, etc). Errors are swallowed and only surfaced to the console.
 */
export async function logActivity(input: LogActivityInput): Promise<void> {
  try {
    await ActivityLog.create({
      actor: input.actor,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId ?? null,
      resourceLabel: input.resourceLabel ?? null,
      metadata: input.metadata ?? {},
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    });
  } catch (error) {
    console.error("Failed to write activity log:", error);
  }
}

interface ListFilters {
  action?: string | undefined;
  resourceType?: string | undefined;
  actorId?: string | undefined;
  page: number;
  limit: number;
}

function toPublic(doc: InstanceType<typeof ActivityLog>) {
  return {
    id: doc._id.toString(),
    actor: doc.actor,
    action: doc.action,
    resourceType: doc.resourceType,
    resourceId: doc.resourceId,
    resourceLabel: doc.resourceLabel,
    metadata: doc.metadata,
    ipAddress: doc.ipAddress,
    createdAt: doc.createdAt,
  };
}

export async function listActivityLog(filters: ListFilters) {
  const query: Record<string, any> = {};

  if (filters.action) query.action = filters.action;
  if (filters.resourceType) query.resourceType = filters.resourceType;
  if (filters.actorId) query["actor.id"] = filters.actorId;

  const skip = (filters.page - 1) * filters.limit;

  const [items, total] = await Promise.all([
    ActivityLog.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(filters.limit),
    ActivityLog.countDocuments(query),
  ]);

  return {
    items: items.map(toPublic),
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total,
      pages: Math.ceil(total / filters.limit),
    },
  };
}
