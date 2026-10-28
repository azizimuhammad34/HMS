import { z } from "zod";

const envSchema = z.object({
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  SESSION_SECRET: z
    .string()
    .min(32, "SESSION_SECRET must be at least 32 characters"),
  SETUP_SECRET: z.string().min(16, "SETUP_SECRET must be at least 16 characters"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

export type AppEnv = z.infer<typeof envSchema>;

let cached: AppEnv | null = null;

/**
 * Validates and returns environment variables.
 * Throws a clear error if required values are missing or invalid.
 * Does not log secret values.
 */
export function getEnv(): AppEnv {
  if (cached) return cached;

  const parsed = envSchema.safeParse({
    MONGODB_URI: process.env.MONGODB_URI,
    SESSION_SECRET: process.env.SESSION_SECRET,
    SETUP_SECRET: process.env.SETUP_SECRET,
    APP_URL: process.env.APP_URL,
    NODE_ENV: process.env.NODE_ENV,
  });

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(`Invalid environment configuration: ${issues}`);
  }

  cached = parsed.data;
  return cached;
}

export function resetEnvCache(): void {
  cached = null;
}

export function isProduction(): boolean {
  return getEnv().NODE_ENV === "production";
}
