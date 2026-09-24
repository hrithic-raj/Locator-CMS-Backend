import jwt from "jsonwebtoken";

import type { AdminRole } from "../models/AdminUser.js";

export interface TokenPayload {
  userId: string;
  role: AdminRole;
  sessionId?: string;
}

interface RefreshTokenPayload extends TokenPayload {
  sessionId: string;
}

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not defined`);
  }

  return value;
}

const ACCESS_TOKEN_SECRET = getRequiredEnv("JWT_ACCESS_SECRET");
const REFRESH_TOKEN_SECRET = getRequiredEnv("JWT_REFRESH_SECRET");

const ACCESS_TOKEN_EXPIRES_IN =
  process.env.JWT_ACCESS_EXPIRES_IN || "15m";

const REFRESH_TOKEN_EXPIRES_IN =
  process.env.JWT_REFRESH_EXPIRES_IN || "7d";

export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, ACCESS_TOKEN_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN as `${number}${"s" | "m" | "h" | "d"}`,
  });
}

export function generateRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, REFRESH_TOKEN_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN as `${number}${"s" | "m" | "h" | "d"}`,
  });
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, REFRESH_TOKEN_SECRET) as RefreshTokenPayload;
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, ACCESS_TOKEN_SECRET) as TokenPayload;
}

/**
 * Returns the expiry encoded in a signed refresh JWT.
 * The token has already been verified before this helper is used.
 */
export function getRefreshTokenExpiry(token: string): Date {
  const decoded = jwt.decode(token) as { exp?: number } | null;

  if (!decoded?.exp) {
    throw new Error("Refresh token does not contain an expiry");
  }

  return new Date(decoded.exp * 1000);
}
