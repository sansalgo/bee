import { MovieSource, Prisma } from "@prisma/client"
import type { Movie, PrismaClient } from "@prisma/client"

import { deriveAliasTitles, normalizeMovieTitle } from "./movies.normalize"

export interface MovieUpsertInput {
  title: string
  releaseYear: number
  tmdbId?: number
  source?: MovieSource
  isFixture?: boolean
  /** Extra names (e.g. TMDB alternative titles); their derived variants are added too. */
  extraAliases?: string[]
}

/**
 * The single write path for Movie rows, shared by the seed, the importer,
 * the TMDB lookup and the enrich script so they all store movies and their
 * aliases identically. Idempotent: re-running it for the same movie only
 * fills in what's missing.
 *
 * Resolution order: an existing row with the same tmdbId wins (the movie is
 * already known, possibly under another title), then a row with the same
 * (normalizedKey, releaseYear) — which gets linked to the tmdbId — and only
 * then a new row is created.
 */
export async function upsertMovieWithAliases(prisma: PrismaClient, input: MovieUpsertInput): Promise<Movie> {
  const movie = await upsertMovie(prisma, input)
  await addMovieAliases(prisma, movie, [
    // The title itself is a no-op for a new row, but an alias when the movie
    // was already stored under a different title (matched via tmdbId).
    input.title,
    ...deriveAliasTitles(input.title),
    ...(input.extraAliases ?? []).flatMap((alias) => [alias, ...deriveAliasTitles(alias)]),
  ])
  return movie
}

/** Adds aliases to a movie, skipping ones that collide with its title or existing aliases. */
export async function addMovieAliases(prisma: PrismaClient, movie: Movie, aliases: string[]): Promise<void> {
  const seenKeys = new Set([movie.normalizedKey])
  const rows: Prisma.MovieAliasCreateManyInput[] = []
  for (const alias of aliases) {
    const normalizedKey = normalizeMovieTitle(alias)
    if (normalizedKey.length === 0 || seenKeys.has(normalizedKey)) continue
    seenKeys.add(normalizedKey)
    rows.push({ movieId: movie.id, alias: alias.trim(), normalizedKey })
  }
  if (rows.length > 0) {
    await prisma.movieAlias.createMany({ data: rows, skipDuplicates: true })
  }
}

async function upsertMovie(prisma: PrismaClient, input: MovieUpsertInput): Promise<Movie> {
  const normalizedKey = normalizeMovieTitle(input.title)
  const byKey = { normalizedKey_releaseYear: { normalizedKey, releaseYear: input.releaseYear } }

  if (input.tmdbId === undefined) {
    return prisma.movie.upsert({
      where: byKey,
      update: { title: input.title, ...(input.isFixture !== undefined && { isFixture: input.isFixture }) },
      create: {
        title: input.title,
        releaseYear: input.releaseYear,
        normalizedKey,
        isFixture: input.isFixture ?? false,
        source: input.source ?? MovieSource.SEED,
      },
    })
  }

  const linked = await prisma.movie.findUnique({ where: { tmdbId: input.tmdbId } })
  if (linked) return linked

  const sameTitle = await prisma.movie.findUnique({ where: byKey })
  if (sameTitle) {
    return sameTitle.tmdbId === null
      ? prisma.movie.update({ where: { id: sameTitle.id }, data: { tmdbId: input.tmdbId } })
      : sameTitle
  }

  try {
    return await prisma.movie.create({
      data: {
        title: input.title,
        releaseYear: input.releaseYear,
        normalizedKey,
        tmdbId: input.tmdbId,
        isFixture: input.isFixture ?? false,
        source: input.source ?? MovieSource.TMDB,
      },
    })
  } catch (err) {
    // Another instance stored the same movie between our reads and this
    // create — use its row instead of failing the lookup.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const existing =
        (await prisma.movie.findUnique({ where: { tmdbId: input.tmdbId } })) ??
        (await prisma.movie.findUnique({ where: byKey }))
      if (existing) return existing
    }
    throw err
  }
}
