import { z } from "zod";

/**
 * Zod boundary for workspace inputs (§64).
 */

export const WorkspaceRoleSchema = z.enum(["owner", "admin", "member"]);
export type WorkspaceRole = z.infer<typeof WorkspaceRoleSchema>;

export const WorkspaceCreateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: "Workspace name is required" })
    .max(120, { message: "Workspace name must be at most 120 characters" }),
});

export type WorkspaceCreateInput = z.infer<typeof WorkspaceCreateSchema>;
