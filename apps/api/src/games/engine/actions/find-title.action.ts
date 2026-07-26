import type { ICategoryPlugin } from "@workspace/shared"

import type { RuntimeGame, RuntimeTile } from "../game-engine"

export interface FindTitleAccepted {
  matched: true
  itemId: string
  matchedText: string
  pointsAwarded: number
  consumedTiles: RuntimeTile[]
}
export interface FindTitleRejected {
  matched: false
  reason: string
}
export type FindTitleResult = FindTitleAccepted | FindTitleRejected

/**
 * Resolves a submitted, ordered tile-id sequence against the game's active
 * category plugin. Never mutates `game` — the caller (GamesService) applies
 * the result (consuming tiles, recording the Find) only on success, so a
 * rejected guess leaves the board and turn untouched.
 */
export async function applyFindTitle(game: RuntimeGame, plugin: ICategoryPlugin, tileIds: string[]): Promise<FindTitleResult> {
  const tileMap = new Map(game.tiles.map((tile) => [tile.id, tile]))
  const selected: RuntimeTile[] = []
  for (const id of tileIds) {
    const tile = tileMap.get(id)
    if (!tile || tile.consumed) {
      return { matched: false, reason: "One or more selected tiles are no longer available" }
    }
    selected.push(tile)
  }

  const normalized = plugin.validator.normalize(selected.map((tile) => tile.character))
  const candidates = await plugin.dataProvider.findByNormalizedKey(normalized)
  if (candidates.length === 0) {
    return { matched: false, reason: "Not a valid title" }
  }

  // Deterministic tie-break when multiple still-unclaimed records share the
  // same normalized text but different release years (see game-config
  // duplicatePolicy semantics): oldest release wins.
  const sorted = [...candidates].sort((a, b) => {
    const yearA = (a.raw as { releaseYear?: number } | undefined)?.releaseYear ?? 0
    const yearB = (b.raw as { releaseYear?: number } | undefined)?.releaseYear ?? 0
    return yearA - yearB
  })

  const priorFinds = game.foundItemIds.map((itemId) => ({ itemId }))
  const available = sorted.find(
    (candidate) =>
      !plugin.isAlreadyFound({
        itemId: candidate.itemId,
        duplicatePolicy: game.config.duplicatePolicy,
        priorFinds,
      }),
  )
  if (!available) {
    return { matched: false, reason: "This title has already been found" }
  }

  const pointsAwarded = plugin.scoring.score({
    tiles: selected.map((tile) => ({ character: tile.character })),
    match: available,
    config: game.config,
  })

  return {
    matched: true,
    itemId: available.itemId,
    matchedText: available.matchedText,
    pointsAwarded,
    consumedTiles: selected,
  }
}
