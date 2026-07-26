import { z } from "zod"

import { MAX_NICKNAME_LENGTH, MIN_NICKNAME_LENGTH, ROOM_CODE_LENGTH } from "../constants/game.constants"
import { gameConfigSchema } from "./game-config.schema"

export const nicknameSchema = z.string().trim().min(MIN_NICKNAME_LENGTH).max(MAX_NICKNAME_LENGTH)

export const roomCodeSchema = z.string().length(ROOM_CODE_LENGTH)

export const createRoomRequestSchema = z
  .object({
    categoryKey: z.string(),
    config: gameConfigSchema,
    // Required only when config.hostPlaysToo is true; enforced with .refine
    // rather than making the field itself conditional, since Zod object
    // schemas can't easily branch required-ness on a sibling field.
    hostNickname: nicknameSchema.optional(),
  })
  .refine((data) => !data.config.hostPlaysToo || !!data.hostNickname, {
    message: "hostNickname is required when config.hostPlaysToo is true",
    path: ["hostNickname"],
  })
export type CreateRoomRequest = z.infer<typeof createRoomRequestSchema>

export const createRoomResponseSchema = z.object({
  gameId: z.string(),
  code: roomCodeSchema,
  hostToken: z.string(),
  playerId: z.string().optional(),
  playerToken: z.string().optional(),
})
export type CreateRoomResponse = z.infer<typeof createRoomResponseSchema>

export const joinRoomRequestSchema = z.object({
  nickname: nicknameSchema,
})
export type JoinRoomRequest = z.infer<typeof joinRoomRequestSchema>

export const joinRoomResponseSchema = z.object({
  playerId: z.string(),
  playerToken: z.string(),
})
export type JoinRoomResponse = z.infer<typeof joinRoomResponseSchema>

export const roomSummarySchema = z.object({
  code: roomCodeSchema,
  status: z.string(),
  categoryKey: z.string(),
})
export type RoomSummary = z.infer<typeof roomSummarySchema>
