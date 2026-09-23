import type { AdminRole } from "../models/AdminUser.js";

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        role: AdminRole;
      };
    }
  }
}

export {};
