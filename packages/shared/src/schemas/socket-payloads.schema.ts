import { z } from "zod"

import { boardTileSchema } from "./tile.schema"
import { turnStateSchema } from "./turn.schema"

// ---------- Client -> Server ----------

// Keyed by the room's public `code`, not the internal DB id — the code is
// the only identifier a client ever sees (from Create/Join room responses).
export const socketAuthSchema = z.object({
  code: z.string(),
  role: z.enum(["host", "player"]),
  token: z.string(),
})
export type SocketAuth = z.infer<typeof socketAuthSchema>

export const playerReadyPayloadSchema = z.object({
  ready: z.boolean(),
})
export type PlayerReadyPayload = z.infer<typeof playerReadyPayloadSchema>

// ---------- Server -> Client ----------

export const playerSummarySchema = z.object({
  id: z.string(),
  nickname: z.string(),
  score: z.number().int(),
  isHost: z.boolean(),
  isConnected: z.boolean(),
  isReady: z.boolean(),
  joinOrder: z.number().int(),
})
export type PlayerSummary = z.infer<typeof playerSummarySchema>

export const boardUpdatedPayloadSchema = z.object({
  tiles: z.array(boardTileSchema),
})
export type BoardUpdatedPayload = z.infer<typeof boardUpdatedPayloadSchema>

export const scoreUpdatedPayloadSchema = z.object({
  players: z.array(playerSummarySchema),
})
export type ScoreUpdatedPayload = z.infer<typeof scoreUpdatedPayloadSchema>

export const timerUpdatedPayloadSchema = z.object({
  deadline: z.string().datetime(),
  serverNow: z.string().datetime(),
})
export type TimerUpdatedPayload = z.infer<typeof timerUpdatedPayloadSchema>

export const gameStateSyncPayloadSchema = z.object({
  status: z.string(),
  players: z.array(playerSummarySchema),
  tiles: z.array(boardTileSchema),
  currentTurn: turnStateSchema.nullable(),
  roundIdx: z.number().int(),
  categoryKey: z.string(),
  config: z.unknown(),
})
export type GameStateSyncPayload = z.infer<typeof gameStateSyncPayloadSchema>

export const findRejectedPayloadSchema = z.object({
  reason: z.string(),
})
export type FindRejectedPayload = z.infer<typeof findRejectedPayloadSchema>

export const findAcceptedPayloadSchema = z.object({
  playerId: z.string(),
  matchedText: z.string(),
  pointsAwarded: z.number().int(),
  consumedTileIds: z.array(z.string()),
})
export type FindAcceptedPayload = z.infer<typeof findAcceptedPayloadSchema>

export const gameFinishedPayloadSchema = z.object({
  players: z.array(playerSummarySchema),
})
export type GameFinishedPayload = z.infer<typeof gameFinishedPayloadSchema>
