import type { RuntimeGame, RuntimeTile } from "../game-engine"

/** Applies an already-persisted tile to the in-memory board pool. */
export function applyPlaceTile(game: RuntimeGame, tile: RuntimeTile): void {
  game.tiles.push(tile)
}
