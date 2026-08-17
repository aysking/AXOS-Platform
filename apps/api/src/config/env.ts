import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

/*
 * ------------------------------------------------------------
 * LOAD ROOT ENVIRONMENT FILE
 * ------------------------------------------------------------
 *
 * This file lives at:
 *
 * apps/api/src/config/env.ts
 *
 * AXOS keeps the development .env at the repository root.
 * Resolve it explicitly so the API behaves consistently
 * regardless of the directory from which npm starts it.
 */

const currentFile = fileURLToPath(
  import.meta.url,
);

const currentDirectory = path.dirname(
  currentFile,
);

const rootEnvPath = path.resolve(
  currentDirectory,
  "../../../../.env",
);

dotenv.config({
  path: rootEnvPath,
});

/*
 * ------------------------------------------------------------
 * ENVIRONMENT VALIDATION
 * ------------------------------------------------------------
 */

const envSchema = z.object({
  NODE_ENV: z
    .enum([
      "development",
      "test",
      "production",
    ])
    .default("development"),

  API_PORT: z.coerce
    .number()
    .int()
    .min(1)
    .max(65535)
    .default(3000),

  DATABASE_URL: z
    .string()
    .min(
      1,
      "DATABASE_URL is required",
    ),

  DB_MAX_CONNECTIONS: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(10),
});

const result = envSchema.safeParse(
  process.env,
);

if (!result.success) {
  console.error(
    "Invalid environment configuration:",
  );

  console.error(
    result.error.flatten().fieldErrors,
  );

  throw new Error(
    "Environment configuration is invalid",
  );
}

export const env = result.data;