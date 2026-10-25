/**
 * Links stored movies to TMDB and pulls in their alternative titles as
 * aliases, so most alternative names are known before anyone plays (the
 * in-game lookup only ever handles titles that match nothing at all).
 * Only touches movies with no tmdbId yet, so it's safe to re-run or resume.
 *
 * Usage (requires TMDB_API_TOKEN):
 *   bun run movies:enrich
 *   bun run movies:enrich -- --limit 200
 */
import { PrismaClient } from "@prisma/client"

import { englishAliasTitles, MIN_VOTE_COUNT, releaseYearOf, tmdbTitleMatches } from "./movies.lookup"
import { addMovieAliases } from "./movies.persist"
import { TmdbClient } from "./tmdb.client"

// TMDB allows roughly 40 requests/s; stay well under it.
const REQUEST_GAP_MS = 50

function parseLimit(): number | undefined {
  const flagIdx = process.argv.indexOf("--limit")
  const limit = flagIdx !== -1 ? Number(process.argv[flagIdx + 1]) : undefined
  return limit !== undefined && Number.isInteger(limit) && limit > 0 ? limit : undefined
}

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function main() {
  const token = process.env.TMDB_API_TOKEN || undefined
  if (!token) {
    console.error("TMDB_API_TOKEN is not set")
    process.exit(1)
  }
  const tmdb = new TmdbClient(token)
  const prisma = new PrismaClient()

  const movies = await prisma.movie.findMany({ where: { tmdbId: null }, orderBy: { title: "asc" }, take: parseLimit() })
  let linked = 0
  let unmatched = 0
  let failed = 0

  for (const movie of movies) {
    const results = await tmdb.searchMovies(movie.title, { year: movie.releaseYear })
    await pause(REQUEST_GAP_MS)
    if (results === null) {
      failed++
      continue
    }
    // Same title within a year either way: release years differ by region.
    const match = results.find((result) => {
      const year = releaseYearOf(result)
      return (
        tmdbTitleMatches(result, movie.normalizedKey) &&
        year !== null &&
        Math.abs(year - movie.releaseYear) <= 1 &&
        result.vote_count >= MIN_VOTE_COUNT
      )
    })
    if (!match) {
      unmatched++
      continue
    }

    const owner = await prisma.movie.findUnique({ where: { tmdbId: match.id } })
    if (owner) {
      // Another row is already this movie (a duplicate in the dataset);
      // keep this title findable as an alias of that row instead.
      await addMovieAliases(prisma, owner, [movie.title])
      console.warn(`"${movie.title}" (${movie.releaseYear}) duplicates "${owner.title}" — added as its alias`)
      continue
    }

    const updated = await prisma.movie.update({ where: { id: movie.id }, data: { tmdbId: match.id } })
    const altTitles = (await tmdb.alternativeTitles(match.id)) ?? []
    await pause(REQUEST_GAP_MS)
    await addMovieAliases(prisma, updated, [match.title, match.original_title, ...englishAliasTitles(altTitles)])
    linked++
    if (linked % 100 === 0) console.log(`…linked ${linked} so far`)
  }

  await prisma.$disconnect()
  console.log(`Checked ${movies.length} movies: ${linked} linked, ${unmatched} not found on TMDB, ${failed} request failures.`)
}

void main()
