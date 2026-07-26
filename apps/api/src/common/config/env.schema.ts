import { z } from "zod"

export const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z.string().min(1).default("http://localhost:3000"),
  TURN_TIMER_TICK_MS: z.coerce.number().int().positive().default(1000),
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
