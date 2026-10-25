import { ADMIN_TOKEN_HEADER } from "@workspace/shared"
import type {
  AdminMovie,
  AdminMovieListQuery,
  AdminMovieListResponse,
  CreateRoomRequest,
  CreateRoomResponse,
  JoinRoomRequest,
  JoinRoomResponse,
  PlayerSummary,
  RoomSummary,
} from "@workspace/shared"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"

interface ApiErrorBody {
  message?: string | string[]
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  })
  if (!res.ok) {
    const body: ApiErrorBody = await res.json().catch(() => ({}))
    const message = Array.isArray(body.message) ? body.message.join(", ") : body.message
    throw new Error(message ?? `Request failed with status ${res.status}`)
  }
  if (res.status === 204) {
    return undefined as T
  }
  return res.json() as Promise<T>
}

function adminRequest<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  return request<T>(path, { ...init, headers: { [ADMIN_TOKEN_HEADER]: token, ...init?.headers } })
}

export const apiClient = {
  listCategories: () => request<{ key: string; label: string }[]>("/categories"),

  createRoom: (body: CreateRoomRequest) =>
    request<CreateRoomResponse>("/rooms", { method: "POST", body: JSON.stringify(body) }),

  getRoom: (code: string) => request<RoomSummary>(`/rooms/${code}`),

  joinRoom: (code: string, body: JoinRoomRequest) =>
    request<JoinRoomResponse>(`/rooms/${code}/join`, { method: "POST", body: JSON.stringify(body) }),

  getLeaderboard: (code: string) => request<PlayerSummary[]>(`/rooms/${code}/leaderboard`),

  admin: {
    listMovies: (token: string, query: AdminMovieListQuery) => {
      const params = new URLSearchParams()
      for (const [key, value] of Object.entries(query)) {
        if (value) params.set(key, value)
      }
      return adminRequest<AdminMovieListResponse>(token, `/admin/movies?${params}`)
    },

    deleteMovie: (token: string, movieId: string) =>
      adminRequest<void>(token, `/admin/movies/${movieId}`, { method: "DELETE" }),

    deleteAlias: (token: string, aliasId: string) =>
      adminRequest<void>(token, `/admin/movies/aliases/${aliasId}`, { method: "DELETE" }),

    addAlias: (token: string, movieId: string, alias: string) =>
      adminRequest<AdminMovie>(token, `/admin/movies/${movieId}/aliases`, {
        method: "POST",
        body: JSON.stringify({ alias }),
      }),
  },
}
