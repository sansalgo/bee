"use client"

import { useCallback, useEffect, useState } from "react"
import type { FormEvent } from "react"
import { toast } from "sonner"

import type { AdminMovie, MovieSource } from "@workspace/shared"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"

import { apiClient } from "@/lib/api-client"

const TOKEN_STORAGE_KEY = "bee:admin-token"
const SOURCE_FILTERS: { label: string; value: MovieSource | undefined }[] = [
  { label: "Added from TMDB", value: "TMDB" },
  { label: "Seeded", value: "SEED" },
  { label: "All", value: undefined },
]

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Request failed"
}

function readStoredToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_STORAGE_KEY)
  } catch {
    return null
  }
}

function TokenForm({ onSubmit }: { onSubmit: (token: string) => void }) {
  const [value, setValue] = useState("")
  return (
    <Card className="mx-auto w-full max-w-sm">
      <CardHeader>
        <CardTitle>Admin token</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            if (value.trim()) onSubmit(value.trim())
          }}
        >
          <Label htmlFor="admin-token">ADMIN_TOKEN from the API environment</Label>
          <Input id="admin-token" type="password" value={value} onChange={(event) => setValue(event.target.value)} />
          <Button type="submit" disabled={!value.trim()}>
            Continue
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function MovieRow({
  movie,
  onDelete,
  onDeleteAlias,
  onAddAlias,
}: {
  movie: AdminMovie
  onDelete: () => void
  onDeleteAlias: (aliasId: string) => void
  onAddAlias: (alias: string) => Promise<boolean>
}) {
  const [alias, setAlias] = useState("")

  async function handleAddAlias(event: FormEvent) {
    event.preventDefault()
    if (alias.trim() && (await onAddAlias(alias.trim()))) setAlias("")
  }

  return (
    <li className="flex flex-col gap-2 border-b border-border py-3 last:border-b-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{movie.title}</span>
        <span className="text-xs text-muted-foreground">{movie.releaseYear}</span>
        <Badge variant={movie.source === "TMDB" ? "secondary" : "outline"}>{movie.source}</Badge>
        {movie.tmdbId !== null && (
          <a
            href={`https://www.themoviedb.org/movie/${movie.tmdbId}`}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-muted-foreground underline underline-offset-2"
          >
            TMDB #{movie.tmdbId}
          </a>
        )}
        <Button size="sm" variant="destructive" className="ml-auto" onClick={onDelete}>
          Delete movie
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {movie.aliases.length === 0 && <span className="text-xs text-muted-foreground">No aliases</span>}
        {movie.aliases.map((entry) => (
          <Badge key={entry.id} variant="outline" className="gap-1">
            {entry.alias}
            <button
              type="button"
              aria-label={`Remove alias ${entry.alias}`}
              className="text-muted-foreground hover:text-destructive"
              onClick={() => onDeleteAlias(entry.id)}
            >
              &times;
            </button>
          </Badge>
        ))}
        <form className="flex items-center gap-1" onSubmit={handleAddAlias}>
          <Input
            value={alias}
            onChange={(event) => setAlias(event.target.value)}
            placeholder="Add alias"
            className="h-7 w-40 text-xs"
          />
          <Button type="submit" size="sm" variant="outline" disabled={!alias.trim()}>
            Add
          </Button>
        </form>
      </div>
    </li>
  )
}

export function MoviesAdminClient() {
  // undefined = sessionStorage not read yet (avoids flashing the token form).
  const [token, setToken] = useState<string | null | undefined>(undefined)
  const [source, setSource] = useState<MovieSource | undefined>("TMDB")
  const [search, setSearch] = useState("")
  const [movies, setMovies] = useState<AdminMovie[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)

  useEffect(() => {
    // sessionStorage is browser-only, so it can't be read during render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setToken(readStoredToken())
  }, [])

  const saveToken = useCallback((value: string | null) => {
    try {
      if (value) sessionStorage.setItem(TOKEN_STORAGE_KEY, value)
      else sessionStorage.removeItem(TOKEN_STORAGE_KEY)
    } catch {
      // Storage unavailable (e.g. blocked): the token just won't persist.
    }
    setToken(value)
  }, [])

  const load = useCallback(
    async (cursor?: string) => {
      if (!token) return
      // Only "Load more" shows progress; filter changes just swap the list.
      if (cursor) setLoadingMore(true)
      try {
        const page = await apiClient.admin.listMovies(token, { source, q: search.trim() || undefined, cursor })
        setMovies((prev) => (cursor ? [...prev, ...page.movies] : page.movies))
        setNextCursor(page.nextCursor)
      } catch (error) {
        toast.error(errorMessage(error))
        // A rejected token is the common failure here: ask for it again.
        saveToken(null)
      } finally {
        setLoadingMore(false)
      }
    },
    [token, source, search, saveToken],
  )

  // Reload when the token or source filter changes; search reloads on submit.
  useEffect(() => {
    // Fetching on filter change; load() only sets state synchronously for "Load more".
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, source])

  if (token === undefined) return null
  if (!token) {
    return (
      <div className="flex min-h-svh items-center p-4">
        <TokenForm onSubmit={saveToken} />
      </div>
    )
  }
  const adminToken = token

  async function deleteMovie(movie: AdminMovie) {
    if (!window.confirm(`Delete "${movie.title}" (${movie.releaseYear}) and its aliases?`)) return
    try {
      await apiClient.admin.deleteMovie(adminToken, movie.id)
      setMovies((prev) => prev.filter((entry) => entry.id !== movie.id))
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  async function deleteAlias(movieId: string, aliasId: string) {
    try {
      await apiClient.admin.deleteAlias(adminToken, aliasId)
      setMovies((prev) =>
        prev.map((entry) =>
          entry.id === movieId ? { ...entry, aliases: entry.aliases.filter((alias) => alias.id !== aliasId) } : entry,
        ),
      )
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  async function addAlias(movieId: string, alias: string): Promise<boolean> {
    try {
      const updated = await apiClient.admin.addAlias(adminToken, movieId, alias)
      setMovies((prev) => prev.map((entry) => (entry.id === movieId ? updated : entry)))
      return true
    } catch (error) {
      toast.error(errorMessage(error))
      return false
    }
  }

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-4xl flex-col gap-4 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-lg font-semibold">Movie catalog</h1>
        <Button size="sm" variant="ghost" className="ml-auto" onClick={() => saveToken(null)}>
          Sign out
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {SOURCE_FILTERS.map((filter) => (
          <Button
            key={filter.label}
            size="sm"
            variant={source === filter.value ? "default" : "outline"}
            onClick={() => setSource(filter.value)}
          >
            {filter.label}
          </Button>
        ))}
        <form
          className="flex flex-1 items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            void load()
          }}
        >
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search titles and aliases"
            className="min-w-40 flex-1"
          />
          <Button type="submit" size="sm" variant="outline">
            Search
          </Button>
        </form>
      </div>

      {movies.length === 0 ? (
        <p className="text-sm text-muted-foreground">No movies match.</p>
      ) : (
        <ul>
          {movies.map((movie) => (
            <MovieRow
              key={movie.id}
              movie={movie}
              onDelete={() => void deleteMovie(movie)}
              onDeleteAlias={(aliasId) => void deleteAlias(movie.id, aliasId)}
              onAddAlias={(alias) => addAlias(movie.id, alias)}
            />
          ))}
        </ul>
      )}

      {nextCursor && (
        <Button variant="outline" disabled={loadingMore} onClick={() => void load(nextCursor)}>
          Load more
        </Button>
      )}
    </div>
  )
}
