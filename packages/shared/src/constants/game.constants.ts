export const TILE_ALPHABET = [
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M",
  "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z",
  "0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
] as const

export type TileCharacter = (typeof TILE_ALPHABET)[number]

export const TILE_CHARACTER_REGEX = /^[A-Z0-9]$/

// Excludes visually ambiguous characters (0/O, 1/I) from room codes.
export const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
export const ROOM_CODE_LENGTH = 6

export const MIN_NICKNAME_LENGTH = 1
export const MAX_NICKNAME_LENGTH = 20

export const MIN_PLAYERS = 2
export const MAX_PLAYERS = 12

export const DEFAULT_TURN_TIME_LIMIT_SEC = 20
export const MIN_TURN_TIME_LIMIT_SEC = 5
export const MAX_TURN_TIME_LIMIT_SEC = 120

export const DEFAULT_ROUND_COUNT = 10
export const MIN_ROUND_COUNT = 1
export const MAX_ROUND_COUNT = 50

export const DEFAULT_GAME_DURATION_SEC = 600
export const MIN_GAME_DURATION_SEC = 60
export const MAX_GAME_DURATION_SEC = 3600

export const TIMER_TICK_INTERVAL_MS = 1000
