import { z } from "zod"

import { tileCharacterSchema } from "./tile.schema"

export const placeTilePayloadSchema = z.object({
  character: tileCharacterSchema,
  x: z.number(),
  y: z.number(),
})
export type PlaceTilePayload = z.infer<typeof placeTilePayloadSchema>
