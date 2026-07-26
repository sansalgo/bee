import { z } from "zod"

// Movies has no category-specific settings beyond the universal ones
// (turn limit, duplicate policy, end condition) in v1 — the categoryKey
// literal alone is enough to select this branch of the discriminated
// union. Future categories can add their own fields here without
// affecting this one.
export const moviesConfigSchema = z.object({
  categoryKey: z.literal("movies"),
})
export type MoviesConfig = z.infer<typeof moviesConfigSchema>

export const defaultMoviesConfig = (): MoviesConfig => ({
  categoryKey: "movies",
})
