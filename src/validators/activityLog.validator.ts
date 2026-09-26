import { z } from "zod";

const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;

export const listActivityLogQuerySchema = z.object({
  action: z.string().trim().optional(),
  resourceType: z.string().trim().optional(),
  actorId: z.string().regex(OBJECT_ID_PATTERN, "Invalid id").optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
});
