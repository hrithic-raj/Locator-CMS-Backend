import { AdminUser } from "../models/AdminUser.js";
import { hashPassword } from "../utils/password.js";
import { logoutAllAdminSessions } from "./auth.service.js";
import { logActivity, getActorSnapshot } from "./activityLog.service.js";
import type { CreateUserInput, UpdateUserInput } from "../validators/user.validator.js";

function toPublicUser(user: InstanceType<typeof AdminUser>) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt ?? null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function createUser(
  input: CreateUserInput,
  requestingUserId: string
) {
  const existing = await AdminUser.findOne({ email: input.email });

  if (existing) {
    throw new Error("A user with this email already exists");
  }

  const passwordHash = await hashPassword(input.password);

  const user = await AdminUser.create({
    name: input.name,
    email: input.email,
    passwordHash,
    role: input.role,
  });

  const actor = await getActorSnapshot(requestingUserId);
  if (actor) {
    await logActivity({
      actor,
      action: "user.created",
      resourceType: "AdminUser",
      resourceId: user._id.toString(),
      resourceLabel: user.email,
      metadata: { role: user.role },
    });
  }

  return toPublicUser(user);
}

export async function listUsers() {
  const users = await AdminUser.find().sort({ createdAt: -1 });
  return users.map(toPublicUser);
}

export async function getUserById(id: string) {
  const user = await AdminUser.findById(id);

  if (!user) {
    throw new Error("User not found");
  }

  return toPublicUser(user);
}

export async function updateUser(
  id: string,
  input: UpdateUserInput,
  requestingUserId: string
) {
  const user = await AdminUser.findById(id);

  if (!user) {
    throw new Error("User not found");
  }

  // Prevent an admin from locking themselves out or demoting themselves
  // as the last admin by accident via this endpoint.
  if (id === requestingUserId) {
    if (input.role && input.role !== "admin") {
      throw new Error("You cannot change your own role");
    }
    if (input.isActive === false) {
      throw new Error("You cannot deactivate your own account");
    }
  }

  if (
    (input.role && input.role !== "admin") ||
    input.isActive === false
  ) {
    // If this action would remove admin rights/activity from the target
    // user, make sure at least one other active admin remains.
    if (user.role === "admin") {
      const otherActiveAdmins = await AdminUser.countDocuments({
        _id: { $ne: user._id },
        role: "admin",
        isActive: true,
      });

      if (otherActiveAdmins === 0) {
        throw new Error("At least one active admin must remain");
      }
    }
  }

  if (input.name !== undefined) user.name = input.name;
  if (input.role !== undefined) user.role = input.role;
  if (input.isActive !== undefined) user.isActive = input.isActive;

  await user.save();

  // Deactivating (or demoting away from admin) should take effect
  // everywhere immediately, not just the next time each session
  // happens to refresh.
  if (input.isActive === false) {
    await logoutAllAdminSessions(user._id.toString());
  }

  const actor = await getActorSnapshot(requestingUserId);
  if (actor) {
    const action =
      input.isActive === false
        ? "user.deactivated"
        : input.isActive === true
          ? "user.reactivated"
          : "user.updated";

    await logActivity({
      actor,
      action,
      resourceType: "AdminUser",
      resourceId: user._id.toString(),
      resourceLabel: user.email,
      metadata: { changes: input },
    });
  }

  return toPublicUser(user);
}

export async function deleteUser(id: string, requestingUserId: string) {
  if (id === requestingUserId) {
    throw new Error("You cannot delete your own account");
  }

  const user = await AdminUser.findById(id);

  if (!user) {
    throw new Error("User not found");
  }

  if (user.role === "admin") {
    const otherActiveAdmins = await AdminUser.countDocuments({
      _id: { $ne: user._id },
      role: "admin",
      isActive: true,
    });

    if (otherActiveAdmins === 0) {
      throw new Error("At least one active admin must remain");
    }
  }

  await user.deleteOne();
  await logoutAllAdminSessions(user._id.toString());

  const actor = await getActorSnapshot(requestingUserId);
  if (actor) {
    await logActivity({
      actor,
      action: "user.deleted",
      resourceType: "AdminUser",
      resourceId: user._id.toString(),
      resourceLabel: user.email,
      metadata: { role: user.role },
    });
  }
}
