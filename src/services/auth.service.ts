import { AdminUser } from "../models/AdminUser.js";
import { comparePassword } from "../utils/password.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt.js";

interface LoginInput {
  email: string;
  password: string;
}

interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: "admin" | "editor";
  };
}

interface RefreshResult {
  accessToken: string;
  refreshToken: string;
}

export async function loginAdmin(
  input: LoginInput
): Promise<LoginResult> {
  const { email, password } = input;

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

  const tokenPayload = {
    userId: user._id.toString(),
    role: user.role,
  };

  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);

  user.refreshToken = refreshToken;
  user.lastLoginAt = new Date();

  await user.save();

  return {
    accessToken,
    refreshToken,
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
}

export async function refreshAdmin(
  refreshToken: string
): Promise<RefreshResult> {
  let payload;

  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new Error("Invalid or expired refresh token");
  }

  const user = await AdminUser.findById(payload.userId);

  if (!user) {
    throw new Error("Invalid or expired refresh token");
  }

  if (!user.refreshToken) {
    throw new Error("Invalid or expired refresh token");
  }

  if (user.refreshToken !== refreshToken) {
    throw new Error("Invalid or expired refresh token");
  }

  const tokenPayload = {
    userId: user._id.toString(),
    role: user.role,
  };

  const newAccessToken = generateAccessToken(tokenPayload);
  const newRefreshToken = generateRefreshToken(tokenPayload);

  user.refreshToken = newRefreshToken;

  await user.save();

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
}