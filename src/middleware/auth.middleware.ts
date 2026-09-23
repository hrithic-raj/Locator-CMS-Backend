import type { Request, Response, NextFunction } from "express";

import { verifyAccessToken } from "../utils/jwt.js";
import type { AdminRole } from "../models/AdminUser.js";

/**
 * Verifies the access token cookie and attaches { userId, role } to req.user.
 * Does NOT hit the database — it trusts the JWT. This keeps auth cheap on
 * every request. Anything that needs fresh user data (e.g. checking isActive)
 * should do so explicitly, like /auth/me does.
 */
export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const accessToken = req.cookies?.accessToken;

  if (!accessToken) {
    res.status(401).json({
      success: false,
      message: "Authentication required",
    });
    return;
  }

  try {
    const payload = verifyAccessToken(accessToken);

    req.user = {
      userId: payload.userId,
      role: payload.role,
    };

    next();
  } catch {
    res.status(401).json({
      success: false,
      message: "Invalid or expired access token",
    });
  }
}

/**
 * Authorization middleware. Must run after `authenticate`.
 * Usage: router.post("/articles", authenticate, requireRole("admin", "editor"), createArticle)
 */
export function requireRole(...allowedRoles: AdminRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: "You do not have permission to perform this action",
      });
      return;
    }

    next();
  };
}
