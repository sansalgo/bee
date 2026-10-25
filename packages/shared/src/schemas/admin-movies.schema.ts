import { z } from "zod"

/** Header carrying ADMIN_TOKEN on /admin/* requests. */
export const ADMIN_TOKEN_HEADER = "x-admin-token"

export const movieSourceSchema = z.enum(["SEED", "TMDB"])
export type MovieSource = z.infer<typeof movieSourceSchema>

export const adminMovieListQuerySchema = z.object({
  source: movieSourceSchema.optional(),
  q: z.string().trim().max(200).optional(),
  cursor: z.string().optional(),
})
export type AdminMovieListQuery = z.infer<typeof adminMovieListQuerySchema>

export const adminMovieAliasSchema = z.object({
  id: z.string(),
  alias: z.string(),
})
export type AdminMovieAlias = z.infer<typeof adminMovieAliasSchema>

export const adminMovieSchema = z.object({
  id: z.string(),
  title: z.string(),
  releaseYear: z.number().int(),
  tmdbId: z.number().int().nullable(),
  source: movieSourceSchema,
  createdAt: z.string(),
  aliases: z.array(adminMovieAliasSchema),
})
export type AdminMovie = z.infer<typeof adminMovieSchema>

export const adminMovieListResponseSchema = z.object({
  movies: z.array(adminMovieSchema),
  nextCursor: z.string().nullable(),
})
export type AdminMovieListResponse = z.infer<typeof adminMovieListResponseSchema>

export const addMovieAliasRequestSchema = z.object({
  alias: z.string().trim().min(1).max(200),
})
export type AddMovieAliasRequest = z.infer<typeof addMovieAliasRequestSchema>
