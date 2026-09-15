import { z } from "zod";

/**
 * Zod boundary for authentication inputs (§64).
 * Requests are parsed before any auth call is made.
 */

export const RegisterSchema = z.object({
  email: z.email({ message: "Enter a valid email address" }),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters" })
    .max(128, { message: "Password must be at most 128 characters" }),
  displayName: z
    .string()
    .trim()
    .min(1, { message: "Display name is required" })
    .max(80, { message: "Display name must be at most 80 characters" }),
});

export const LoginSchema = z.object({
  email: z.email({ message: "Enter a valid email address" }),
  password: z.string().min(1, { message: "Password is required" }),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
