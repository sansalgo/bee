import { Injectable, NotFoundException } from "@nestjs/common"

import type { RuntimeGame } from "./game-engine"

@Injectable()
export class GameStateStore {
  private readonly games = new Map<string, RuntimeGame>()

  set(game: RuntimeGame): void {
    this.games.set(game.gameId, game)
  }

  get(gameId: string): RuntimeGame {
    const game = this.games.get(gameId)
    if (!game) {
      throw new NotFoundException(`Game ${gameId} is not currently active`)
    }
    return game
  }

  has(gameId: string): boolean {
    return this.games.has(gameId)
  }

  delete(gameId: string): void {
    this.games.delete(gameId)
  }
}
