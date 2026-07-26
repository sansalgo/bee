import type { z } from "zod"
import type { DuplicatePolicy } from "../enums/duplicate-policy.enum"

/**
 * The result of resolving a normalized tile sequence to a concrete record
 * inside a specific category (e.g. one row of the Movie table).
 */
export interface CategoryMatchResult {
  itemId: string
  matchedText: string
  raw?: unknown
}

/**
 * Turns raw placed-tile characters into a category's matching key, and
 * (via the paired data provider) resolves that key to real records.
 */
export interface ICategoryValidator {
  normalize(chars: string[]): string
}

/**
 * How a category's records are loaded/queried. Implemented per-category
 * (e.g. backed by the Movie Prisma model) so the game engine never needs
 * to know about any specific category's storage.
 */
export interface ICategoryDataProvider {
  findByNormalizedKey(key: string): Promise<CategoryMatchResult[]>
  countAll(): Promise<number>
}

/**
 * Converts an accepted match into a point value. Categories may define
 * their own formula; the movies v1 default is 1 point per tile consumed.
 */
export interface IScoringStrategy<TConfig = unknown> {
  score(args: {
    tiles: { character: string }[]
    match: CategoryMatchResult
    config: TConfig
  }): number
}

/** A category's own Zod-validated slice of GameConfig. */
export interface ICategoryConfigSchema<TConfig = unknown> {
  schema: z.ZodType<TConfig>
  defaultConfig(): TConfig
}

/**
 * The full contract a category must implement to be playable. The game
 * engine only ever depends on this interface, never on a concrete
 * category's storage or rules directly — adding a new category means
 * implementing this once and registering it, with no engine changes.
 */
export interface ICategoryPlugin<TConfig = unknown> {
  key: string
  label: string
  validator: ICategoryValidator
  dataProvider: ICategoryDataProvider
  scoring: IScoringStrategy<TConfig>
  configSchema: ICategoryConfigSchema<TConfig>
  isAlreadyFound(args: {
    itemId: string
    duplicatePolicy: DuplicatePolicy
    priorFinds: { itemId: string }[]
  }): boolean
}
