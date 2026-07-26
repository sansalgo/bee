import type {
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
  return res.json() as Promise<T>
}

export const apiClient = {
  listCategories: () => request<{ key: string; label: string }[]>("/categories"),

  createRoom: (body: CreateRoomRequest) =>
    request<CreateRoomResponse>("/rooms", { method: "POST", body: JSON.stringify(body) }),

  getRoom: (code: string) => request<RoomSummary>(`/rooms/${code}`),

  joinRoom: (code: string, body: JoinRoomRequest) =>
    request<JoinRoomResponse>(`/rooms/${code}/join`, { method: "POST", body: JSON.stringify(body) }),

  getLeaderboard: (code: string) => request<PlayerSummary[]>(`/rooms/${code}/leaderboard`),
}
