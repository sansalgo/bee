import { Inject, Injectable, Logger } from "@nestjs/common"
import { MovieSource } from "@prisma/client"

import { PrismaService } from "../../prisma/prisma.service"
import { normalizeMovieTitle } from "./movies.normalize"
import { upsertMovieWithAliases } from "./movies.persist"
import { getBundledSegmenter } from "./movies.segment"
import { TmdbClient } from "./tmdb.client"
import type { TmdbAlternativeTitle, TmdbMovie } from "./tmdb.client"

/** How long a key that matched nothing on TMDB is trusted to stay unknown. */
const MISS_TTL_MS = 7 * 24 * 60 * 60 * 1000
/** Total time one lookup may spend on TMDB calls — it runs inside a player's turn. */
const LOOKUP_BUDGET_MS = 5000
/** Filters out obscure entries so random letter soup can't turn into a "movie". */
export const MIN_VOTE_COUNT = 20
/** How many top search results get their alternative titles checked. */
const ALT_TITLE_CANDIDATES = 3
/** Alternative titles from these regions are stored as aliases ("" = no region). */
const ALIAS_REGIONS = new Set(["US", "GB", "CA", "AU", "IE", "NZ", ""])

export function releaseYearOf(movie: TmdbMovie): number | null {
  const year = Number(movie.release_date?.slice(0, 4))
  return Number.isInteger(year) && year > 0 ? year : null
}

export function tmdbTitleMatches(movie: TmdbMovie, key: string): boolean {
  return normalizeMovieTitle(movie.title) === key || normalizeMovieTitle(movie.original_title) === key
}

export function englishAliasTitles(titles: TmdbAlternativeTitle[]): string[] {
  return titles.filter((title) => ALIAS_REGIONS.has(title.iso_3166_1)).map((title) => title.title)
}

/**
 * On-demand fallback for tile sequences that match no stored movie: asks
 * TMDB, and if it's a real movie stores it (or, when we already have that
 * movie under another title, just the new alias). Every later submission of
 * the same title is then answered from the database alone.
 */
@Injectable()
export class MoviesLookupService {
  private readonly logger = new Logger(MoviesLookupService.name)
  private readonly inFlight = new Map<string, Promise<boolean>>()

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(TmdbClient) private readonly tmdb: TmdbClient,
  ) {}

  get enabled(): boolean {
    return this.tmdb.enabled
  }

  /**
   * Resolves `key` against TMDB, returning whether a movie or alias was
   * stored for it. Never throws. Concurrent calls for the same key share one
   * lookup, so two players building the same title cost one round of requests.
   */
  resolve(key: string): Promise<boolean> {
    let pending = this.inFlight.get(key)
    if (!pending) {
      pending = this.lookup(key)
        .catch((err: unknown) => {
          this.logger.error(`Lookup for ${key} failed: ${err instanceof Error ? err.message : String(err)}`)
          return false
        })
        .finally(() => this.inFlight.delete(key))
      this.inFlight.set(key, pending)
    }
    return pending
  }

  private async lookup(key: string): Promise<boolean> {
    if (!this.tmdb.enabled || key.length < 2) return false

    const miss = await this.prisma.movieLookupMiss.findUnique({ where: { normalizedKey: key } })
    if (miss && Date.now() - miss.checkedAt.getTime() < MISS_TTL_MS) return false

    const deadline = Date.now() + LOOKUP_BUDGET_MS
    const remaining = () => deadline - Date.now()
    // Set when a request failed, so "no match" may be wrong — not cached as a miss.
    let incomplete = false

    // Tiles carry no spaces, so search with the key split back into words
    // first ("the dark knight"), and the raw key as a fallback.
    const candidates = new Map<number, TmdbMovie>()
    for (const query of new Set([getBundledSegmenter().segment(key), key.toLowerCase()])) {
      const results = await this.tmdb.searchMovies(query, { timeoutMs: remaining() })
      if (results === null) {
        incomplete = true
        continue
      }
      for (const movie of results) {
        if (movie.vote_count >= MIN_VOTE_COUNT && releaseYearOf(movie) !== null) {
          candidates.set(movie.id, movie)
        }
      }
      if ([...candidates.values()].some((movie) => tmdbTitleMatches(movie, key))) break
    }

    let match = [...candidates.values()].find((movie) => tmdbTitleMatches(movie, key))
    let altTitles: TmdbAlternativeTitle[] | null = null
    let matchedAltTitle: string | undefined
    if (!match) {
      const mostPopular = [...candidates.values()]
        .sort((a, b) => b.popularity - a.popularity)
        .slice(0, ALT_TITLE_CANDIDATES)
      for (const movie of mostPopular) {
        const titles = await this.tmdb.alternativeTitles(movie.id, { timeoutMs: remaining() })
        if (titles === null) {
          incomplete = true
          continue
        }
        matchedAltTitle = titles.find((title) => normalizeMovieTitle(title.title) === key)?.title
        if (matchedAltTitle) {
          match = movie
          altTitles = titles
          break
        }
      }
    }

    if (!match) {
      if (!incomplete) {
        await this.prisma.movieLookupMiss.upsert({
          where: { normalizedKey: key },
          update: { checkedAt: new Date() },
          create: { normalizedKey: key },
        })
      }
      return false
    }

    // Best effort: a failure here just means fewer aliases for now.
    altTitles ??= (await this.tmdb.alternativeTitles(match.id, { timeoutMs: remaining() })) ?? []
    const movie = await upsertMovieWithAliases(this.prisma, {
      title: match.title,
      releaseYear: releaseYearOf(match)!,
      tmdbId: match.id,
      source: MovieSource.TMDB,
      extraAliases: [match.original_title, ...(matchedAltTitle ? [matchedAltTitle] : []), ...englishAliasTitles(altTitles)],
    })
    await this.prisma.movieLookupMiss.deleteMany({ where: { normalizedKey: key } })
    this.logger.log(`Stored "${movie.title}" (${movie.releaseYear}) for ${key}`)
    return true
  }
}
