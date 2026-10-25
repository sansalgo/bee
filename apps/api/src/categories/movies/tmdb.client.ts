import { Logger } from "@nestjs/common"

const TMDB_API_BASE = "https://api.themoviedb.org/3"
const REQUEST_TIMEOUT_MS = 3000

export interface TmdbMovie {
  id: number
  title: string
  original_title: string
  release_date?: string
  popularity: number
  vote_count: number
}

export interface TmdbAlternativeTitle {
  iso_3166_1: string
  title: string
}

/**
 * Minimal TMDB API client. A plain class (not a Nest provider by itself) so
 * the enrich script can use it outside the Nest container; MoviesModule
 * provides it via a factory.
 *
 * Every method resolves to `null` on any failure (network error, timeout,
 * non-2xx) instead of throwing: callers run inside a player's turn and must
 * treat "TMDB unavailable" as "unknown", never as an error.
 */
export class TmdbClient {
  private readonly logger = new Logger(TmdbClient.name)

  constructor(private readonly token: string | undefined) {}

  get enabled(): boolean {
    return this.token !== undefined
  }

  async searchMovies(query: string, opts: { year?: number; timeoutMs?: number } = {}): Promise<TmdbMovie[] | null> {
    const params: Record<string, string> = { query, include_adult: "false" }
    if (opts.year !== undefined) params.year = String(opts.year)
    const body = await this.get<{ results: TmdbMovie[] }>("/search/movie", params, opts.timeoutMs)
    return body?.results ?? null
  }

  async alternativeTitles(tmdbId: number, opts: { timeoutMs?: number } = {}): Promise<TmdbAlternativeTitle[] | null> {
    const body = await this.get<{ titles: TmdbAlternativeTitle[] }>(`/movie/${tmdbId}/alternative_titles`, {}, opts.timeoutMs)
    return body?.titles ?? null
  }

  private async get<T>(path: string, params: Record<string, string>, timeoutMs = REQUEST_TIMEOUT_MS): Promise<T | null> {
    if (!this.token || timeoutMs <= 0) return null
    const url = new URL(TMDB_API_BASE + path)
    const headers: Record<string, string> = { accept: "application/json" }
    // v4 read access tokens are JWTs and go in the Authorization header;
    // anything else is treated as a v3 API key query param.
    if (this.token.startsWith("eyJ")) {
      headers.authorization = `Bearer ${this.token}`
    } else {
      url.searchParams.set("api_key", this.token)
    }
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value)
    }

    try {
      this.logger.debug(`GET ${path} ${params.query ?? ""}`)
      const res = await fetch(url, { headers, signal: AbortSignal.timeout(Math.min(timeoutMs, REQUEST_TIMEOUT_MS)) })
      if (!res.ok) {
        this.logger.warn(`${path} responded ${res.status}`)
        return null
      }
      return (await res.json()) as T
    } catch (err) {
      this.logger.warn(`${path} failed: ${err instanceof Error ? err.message : String(err)}`)
      return null
    }
  }
}
