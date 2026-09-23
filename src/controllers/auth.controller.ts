
import type { Request, Response } from "express";

import { loginSchema } from "../validators/auth.validator.js";
import {
  loginAdmin,
  logoutAdmin,
  refreshAdmin,
  getCurrentUser,
} from "../services/auth.service.js";

const isProduction = process.env.NODE_ENV === "production";

export async function login(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const validationResult = loginSchema.safeParse(req.body);

    if (!validationResult.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationResult.error.flatten().fieldErrors,
      });

      return;
    }

    const result = await loginAdmin(validationResult.data);

    res
      .cookie("accessToken", result.accessToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "none" : "lax",
        maxAge: 15 * 60 * 1000,
      })
      .cookie("refreshToken", result.refreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "none" : "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })
      .status(200)
      .json({
        success: true,
        message: "Login successful",
        user: result.user,
      });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Invalid email or password"
    ) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });

      return;
    }

    if (
      error instanceof Error &&
      error.message === "This account has been deactivated"
    ) {
      res.status(403).json({
        success: false,
        message: "This account has been deactivated",
      });

      return;
    }

    console.error("Login error:", error);

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

export async function refresh(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      res.status(401).json({
        success: false,
        message: "Refresh token is required",
      });

      return;
    }

    const result = await refreshAdmin(refreshToken);

    res
      .cookie("accessToken", result.accessToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "none" : "lax",
        maxAge: 15 * 60 * 1000,
      })
      .cookie("refreshToken", result.refreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "none" : "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })
      .status(200)
      .json({
        success: true,
        message: "Token refreshed successfully",
      });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Invalid or expired refresh token"
    ) {
      res.status(401).json({
        success: false,
        message: "Invalid or expired refresh token",
      });

      return;
    }

    if (
      error instanceof Error &&
      error.message === "This account has been deactivated"
    ) {
      res
        .clearCookie("accessToken", {
          httpOnly: true,
          secure: isProduction,
          sameSite: isProduction ? "none" : "lax",
        })
        .clearCookie("refreshToken", {
          httpOnly: true,
          secure: isProduction,
          sameSite: isProduction ? "none" : "lax",
        })
        .status(403)
        .json({
          success: false,
          message: "This account has been deactivated",
        });

      return;
    }

    console.error("Refresh token error:", error);

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

export async function logout(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
      await logoutAdmin(refreshToken);
    }

    res
      .clearCookie("accessToken", {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "none" : "lax",
      })
      .clearCookie("refreshToken", {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "none" : "lax",
      })
      .status(200)
      .json({
        success: true,
        message: "Logout successful",
      });
  } catch (error) {
    console.error("Logout error:", error);

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}

export async function me(req: Request, res: Response): Promise<void> {
  try {
    // req.user is guaranteed by the `authenticate` middleware
    const user = await getCurrentUser(req.user!.userId);

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "User not found") {
      res.status(401).json({
        success: false,
        message: "User not found or inactive",
      });

      return;
    }

    console.error("Me error:", error);

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
}