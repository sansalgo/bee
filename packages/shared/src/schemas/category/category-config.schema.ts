import { z } from "zod"

import { moviesConfigSchema } from "./movies-config.schema"

/**
 * Discriminated union of every category's config shape, keyed by
 * `categoryKey`. Adding a new category means adding one member here —
 * nothing else in the shared config plumbing changes.
 */
export const categoryConfigSchema = z.discriminatedUnion("categoryKey", [moviesConfigSchema])
export type CategoryConfig = z.infer<typeof categoryConfigSchema>
