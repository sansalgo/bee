export interface RoomIdentity {
  code: string
  role: "host" | "player"
  token: string
  playerId?: string
  nickname: string
}

const KEY_PREFIX = "bee:room:"

function roomStorageKey(code: string): string {
  return `${KEY_PREFIX}${code.toUpperCase()}`
}

export function saveRoomIdentity(identity: RoomIdentity): void {
  if (typeof window === "undefined") return
  window.localStorage.setItem(roomStorageKey(identity.code), JSON.stringify(identity))
}

export function loadRoomIdentity(code: string): RoomIdentity | null {
  if (typeof window === "undefined") return null
  const raw = window.localStorage.getItem(roomStorageKey(code))
  if (!raw) return null
  try {
    return JSON.parse(raw) as RoomIdentity
  } catch {
    return null
  }
}

export function clearRoomIdentity(code: string): void {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(roomStorageKey(code))
}
