import { z } from "zod"

import { TurnOutcome } from "../enums/turn-outcome.enum"

export const turnStateSchema = z.object({
  turnId: z.string(),
  playerId: z.string(),
  roundIdx: z.number().int().nonnegative(),
  turnIdx: z.number().int().nonnegative(),
  deadline: z.string().datetime(),
})
export type TurnState = z.infer<typeof turnStateSchema>

export const turnEndedSchema = z.object({
  turnId: z.string(),
  playerId: z.string(),
  outcome: z.enum(TurnOutcome),
})
export type TurnEnded = z.infer<typeof turnEndedSchema>
