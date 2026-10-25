import { z } from "zod"

// Blank values (e.g. `TMDB_API_TOKEN=""` copied from .env.example) mean "unset".
const optionalSecret = (minLength: number) =>
  z.preprocess((value) => (value === "" ? undefined : value), z.string().min(minLength).optional())

export const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z.string().min(1).default("http://localhost:3000"),
  TURN_TIMER_TICK_MS: z.coerce.number().int().positive().default(1000),
  // TMDB v4 read access token (or v3 API key). Unset disables on-demand
  // movie lookups; matching then only uses movies already in the database.
  TMDB_API_TOKEN: optionalSecret(1),
  // Shared secret for the /admin/movies review endpoints. Unset disables them.
  ADMIN_TOKEN: optionalSecret(16),
})
export type Env = z.infer<typeof envSchema>

/**
 * Fails fast at boot with a clear message if required env vars (e.g.
 * DATABASE_URL) are missing or malformed, instead of surfacing a cryptic
 * Prisma connection error later.
 */
export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config)
  if (!result.success) {
    throw new Error(`Invalid environment configuration:\n${z.prettifyError(result.error)}`)
  }
  return result.data
}
