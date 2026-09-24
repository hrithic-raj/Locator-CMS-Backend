import mongoose from "mongoose";

import { AdminUser, type AdminRole } from "../models/AdminUser.js";
import { AdminSession } from "../models/AdminSession.js";
import { comparePassword } from "../utils/password.js";
import {
  generateAccessToken,
  generateRefreshToken,
  getRefreshTokenExpiry,
  verifyRefreshToken,
} from "../utils/jwt.js";
import { hashToken } from "../utils/token.js";

interface LoginInput {
  email: string;
  password: string;
  userAgent?: string | null;
  ipAddress?: string | null;
}

interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  isActive: boolean;
}

interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: PublicUser;
}

interface RefreshResult {
  accessToken: string;
  refreshToken: string;
}

function getPublicUser(user: {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  role: AdminRole;
  isActive: boolean;
}): PublicUser {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
  };
}

async function createSession(
  userId: mongoose.Types.ObjectId,
  role: AdminRole,
  userAgent?: string | null,
  ipAddress?: string | null
): Promise<{ accessToken: string; refreshToken: string }> {
  // Create the session id first so the refresh JWT can carry it.
  const sessionId = new mongoose.Types.ObjectId();

  const refreshToken = generateRefreshToken({
    userId: userId.toString(),
    role,
    sessionId: sessionId.toString(),
  });

  const session = new AdminSession({
    _id: sessionId,
    userId,
    refreshTokenHash: hashToken(refreshToken),
    expiresAt: getRefreshTokenExpiry(refreshToken),
    userAgent: userAgent ?? null,
    ipAddress: ipAddress ?? null,
  });

  await session.save();

  const accessToken = generateAccessToken({
    userId: userId.toString(),
    role,
  });

  return {
    accessToken,
    refreshToken,
  };
}

export async function loginAdmin(
  input: LoginInput
): Promise<LoginResult> {
  const { email, password, userAgent, ipAddress } = input;

  const user = await AdminUser.findOne({ email });

  if (!user) {
    throw new Error("Invalid email or password");
  }

  const passwordMatches = await comparePassword(
    password,
    user.passwordHash
  );

  if (!passwordMatches) {
    throw new Error("Invalid email or password");
  }

  if (!user.isActive) {
    throw new Error("This account has been deactivated");
  }

  const { accessToken, refreshToken } = await createSession(
    user._id,
    user.role,
    userAgent,
    ipAddress
  );

  user.lastLoginAt = new Date();
  await user.save();

  return {
    accessToken,
    refreshToken,
    user: getPublicUser(user),
  };
}

export async function refreshAdmin(
  refreshToken: string,
  userAgent?: string | null,
  ipAddress?: string | null
): Promise<RefreshResult> {
  let payload;

  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new Error("Invalid or expired refresh token");
  }

  if (!mongoose.isValidObjectId(payload.sessionId)) {
    throw new Error("Invalid or expired refresh token");
  }

  const user = await AdminUser.findById(payload.userId);

  if (!user) {
    throw new Error("Invalid or expired refresh token");
  }

  if (!user.isActive) {
    await AdminSession.updateOne(
      {
        _id: payload.sessionId,
        userId: user._id,
        revokedAt: null,
      },
      {
        $set: { revokedAt: new Date() },
      }
    );

    throw new Error("This account has been deactivated");
  }

  const tokenHash = hashToken(refreshToken);
  const now = new Date();

  /*
   * Atomically consume the old session.
   *
   * This prevents two concurrent refresh requests from both rotating
   * the same refresh token successfully.
   */
  const oldSession = await AdminSession.findOneAndUpdate(
    {
      _id: payload.sessionId,
      userId: user._id,
      refreshTokenHash: tokenHash,
      revokedAt: null,
      expiresAt: { $gt: now },
    },
    {
      $set: { revokedAt: now },
    },
    { returnDocument: "after" }
  );

  if (!oldSession) {
    throw new Error("Invalid or expired refresh token");
  }

  const { accessToken, refreshToken: newRefreshToken } =
    await createSession(
      user._id,
      user.role,
      userAgent ?? oldSession.userAgent,
      ipAddress ?? oldSession.ipAddress
    );

  return {
    accessToken,
    refreshToken: newRefreshToken,
  };
}

export async function getCurrentUser(userId: string): Promise<PublicUser> {
  const user = await AdminUser.findById(userId);

  if (!user || !user.isActive) {
    throw new Error("User not found");
  }

  return getPublicUser(user);
}

export async function logoutAdmin(refreshToken: string): Promise<void> {
  let payload;

  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    // Logout should be idempotent. Even an invalid/expired token should
    // still allow the client cookies to be cleared.
    return;
  }

  if (!mongoose.isValidObjectId(payload.sessionId)) {
    return;
  }

  await AdminSession.updateOne(
    {
      _id: payload.sessionId,
      userId: payload.userId,
      revokedAt: null,
    },
    {
      $set: { revokedAt: new Date() },
    }
  );
}

export async function logoutAllAdminSessions(
  userId: string
): Promise<void> {
  await AdminSession.updateMany(
    {
      userId,
      revokedAt: null,
    },
    {
      $set: { revokedAt: new Date() },
    }
  );
}
