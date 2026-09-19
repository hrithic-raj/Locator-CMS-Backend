import jwt from "jsonwebtoken";

interface TokenPayload {
  userId: string;
  role: "admin" | "editor";
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

export function generateRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, REFRESH_TOKEN_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN as `${number}${"s" | "m" | "h" | "d"}`,
  });
}