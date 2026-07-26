import { z } from "zod"

import { TILE_CHARACTER_REGEX } from "../constants/game.constants"

export const tileCharacterSchema = z
  .string()
  .regex(TILE_CHARACTER_REGEX, "Must be a single letter A-Z or digit 0-9")

export const boardTileSchema = z.object({
  id: z.string(),
  character: tileCharacterSchema,
  placedByPlayerId: z.string(),
  sequenceNo: z.number().int().nonnegative(),
  consumed: z.boolean(),
})
export type BoardTile = z.infer<typeof boardTileSchema>
