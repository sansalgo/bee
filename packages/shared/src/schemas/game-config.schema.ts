import { z } from "zod"

import {
  DEFAULT_GAME_DURATION_SEC,
  DEFAULT_ROUND_COUNT,
  DEFAULT_TURN_TIME_LIMIT_SEC,
  MAX_GAME_DURATION_SEC,
  MAX_ROUND_COUNT,
  MAX_TURN_TIME_LIMIT_SEC,
  MIN_GAME_DURATION_SEC,
  MIN_ROUND_COUNT,
  MIN_TURN_TIME_LIMIT_SEC,
} from "../constants/game.constants"
import { DuplicatePolicy } from "../enums/duplicate-policy.enum"
import { EndCondition } from "../enums/end-condition.enum"
import { categoryConfigSchema } from "./category/category-config.schema"

// duplicatePolicy is a universal rule about re-finding the same resolved
// record, not something specific to movies — it lives on the base config
// (not inside a per-category schema) so `ICategoryPlugin.isAlreadyFound`
// can rely on it existing for every category without narrowing on
// `categoryKey` first.
const baseGameConfigSchema = z.object({
  turnTimeLimitSec: z
    .number()
    .int()
    .min(MIN_TURN_TIME_LIMIT_SEC)
    .max(MAX_TURN_TIME_LIMIT_SEC)
    .default(DEFAULT_TURN_TIME_LIMIT_SEC),
  hostPlaysToo: z.boolean().default(false),
  duplicatePolicy: z.enum(DuplicatePolicy).default(DuplicatePolicy.ONCE_PER_RECORD),
})

/**
 * Host-configurable game end condition, one of three mutually exclusive
 * modes confirmed with the user: a fixed number of rounds, a fixed overall
 * duration, or a manual host-triggered end.
 */
const endConditionSchema = z.discriminatedUnion("endCondition", [
  z.object({
    endCondition: z.literal(EndCondition.FIXED_ROUNDS),
    roundCount: z.number().int().min(MIN_ROUND_COUNT).max(MAX_ROUND_COUNT).default(DEFAULT_ROUND_COUNT),
  }),
  z.object({
    endCondition: z.literal(EndCondition.FIXED_DURATION),
    durationSec: z.number().int().min(MIN_GAME_DURATION_SEC).max(MAX_GAME_DURATION_SEC).default(DEFAULT_GAME_DURATION_SEC),
  }),
  z.object({
    endCondition: z.literal(EndCondition.MANUAL),
  }),
])

/**
 * The full validated config snapshot stored on `Game.config` at creation
 * time. Combines shared turn/host settings, the chosen end condition, and
 * the active category's own config (discriminated by `categoryKey`).
 */
export const gameConfigSchema = baseGameConfigSchema.and(endConditionSchema).and(categoryConfigSchema)
export type GameConfig = z.infer<typeof gameConfigSchema>
