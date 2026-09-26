import type { Request, Response } from "express";

import {
  createUserSchema,
  updateUserSchema,
} from "../validators/user.validator.js";
import * as userService from "../services/user.service.js";

function handleKnownError(error: unknown, res: Response): boolean {
  const knownMessages = [
    "A user with this email already exists",
    "User not found",
    "You cannot change your own role",
    "You cannot deactivate your own account",
    "You cannot delete your own account",
    "At least one active admin must remain",
  ];

  if (error instanceof Error && knownMessages.includes(error.message)) {
    const status = error.message === "User not found" ? 404 : 400;

    res.status(status).json({
      success: false,
      message: error.message,
    });

    return true;
  }

  return false;
}

export async function create(req: Request, res: Response): Promise<void> {
  try {
    const validationResult = createUserSchema.safeParse(req.body);

    if (!validationResult.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationResult.error.flatten().fieldErrors,
      });
      return;
    }

    const user = await userService.createUser(
      validationResult.data,
      req.user!.userId
    );

    res.status(201).json({ success: true, user });
  } catch (error) {
    if (handleKnownError(error, res)) return;

    console.error("Create user error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}

export async function list(_req: Request, res: Response): Promise<void> {
  try {
    const users = await userService.listUsers();
    res.status(200).json({ success: true, users });
  } catch (error) {
    console.error("List users error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}

export async function getOne(req: Request, res: Response): Promise<void> {
  try {
    const user = await userService.getUserById(req.params.id as string);
    res.status(200).json({ success: true, user });
  } catch (error) {
    if (handleKnownError(error, res)) return;

    console.error("Get user error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}

export async function update(req: Request, res: Response): Promise<void> {
  try {
    const validationResult = updateUserSchema.safeParse(req.body);

    if (!validationResult.success) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationResult.error.flatten().fieldErrors,
      });
      return;
    }

    const user = await userService.updateUser(
      req.params.id as string,
      validationResult.data,
      req.user!.userId
    );

    res.status(200).json({ success: true, user });
  } catch (error) {
    if (handleKnownError(error, res)) return;

    console.error("Update user error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}

export async function remove(req: Request, res: Response): Promise<void> {
  try {
    await userService.deleteUser(req.params.id as string, req.user!.userId);
    res.status(200).json({ success: true, message: "User deleted" });
  } catch (error) {
    if (handleKnownError(error, res)) return;

    console.error("Delete user error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}
