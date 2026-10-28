import { z } from "zod";
import { ROLES } from "@/types/roles";

export const loginSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(1).max(200),
});

export const setupSuperAdminSchema = z.object({
  setupSecret: z.string().min(1),
  email: z.string().trim().email().max(255),
  fullName: z.string().trim().min(2).max(120),
  password: z
    .string()
    .min(12, "Password must be at least 12 characters")
    .max(200)
    .regex(/[A-Za-z]/, "Password must include a letter")
    .regex(/[0-9]/, "Password must include a number"),
});

export const createUserSchema = z.object({
  email: z.string().trim().email().max(255),
  fullName: z.string().trim().min(2).max(120),
  role: z.enum(ROLES),
  temporaryPassword: z
    .string()
    .min(12, "Temporary password must be at least 12 characters")
    .max(200),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SetupSuperAdminInput = z.infer<typeof setupSuperAdminSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
