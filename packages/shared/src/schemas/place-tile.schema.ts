import { z } from "zod"

import { tileCharacterSchema } from "./tile.schema"

export const placeTilePayloadSchema = z.object({
  character: tileCharacterSchema,
})
export type PlaceTilePayload = z.infer<typeof placeTilePayloadSchema>
