import { GameStatus as PrismaGameStatus } from "@prisma/client"
import { EndCondition } from "@workspace/shared"
import type { GameConfig } from "@workspace/shared"

export interface RuntimePlayer {
  id: string
  nickname: string
  isHost: boolean
  joinOrder: number
  score: number
  isConnected: boolean
  isReady: boolean
}

export interface RuntimeTile {
  id: string
  character: string
  placedByPlayerId: string
  sequenceNo: number
  consumed: boolean
}

export interface RuntimeTurn {
  turnId: string
  playerId: string
  roundIdx: number
  turnIdx: number
  deadline: Date
}

/**
 * The live, authoritative state of one active game. Held in-process (see
 * GameStateStore) and mutated only by GamesService — this is a v1,
 * single-instance design; horizontal scaling would move this into a shared
 * store (e.g. Redis) without changing the shape.
 */
export interface RuntimeGame {
  gameId: string
  code: string
  categoryKey: string
  config: GameConfig
  status: PrismaGameStatus
  players: RuntimePlayer[]
  tiles: RuntimeTile[]
  // Resolved category-item ids already awarded this game, for the
  // duplicate-policy check — category-scoped implicitly since a game only
  // ever plays one category.
  foundItemIds: string[]
  currentTurn: RuntimeTurn | null
  tileSequenceCounter: number
  gameEndsAt: Date | null
}

export function computeTurnDeadline(config: GameConfig): Date {
  return new Date(Date.now() + config.turnTimeLimitSec * 1000)
}

/** Metadata for the turn that would follow the current one, before it's created. */
export function computeNextTurnMeta(game: RuntimeGame): { playerIndex: number; roundIdx: number; turnIdx: number } {
  if (!game.currentTurn) {
    return { playerIndex: 0, roundIdx: 0, turnIdx: 0 }
  }
  const currentIndex = game.players.findIndex((player) => player.id === game.currentTurn?.playerId)
  const nextIndex = (currentIndex + 1) % game.players.length
  const wrapped = nextIndex === 0
  return {
    playerIndex: nextIndex,
    roundIdx: wrapped ? game.currentTurn.roundIdx + 1 : game.currentTurn.roundIdx,
    turnIdx: game.currentTurn.turnIdx + 1,
  }
}

/** Whether the game should finish instead of starting the turn described by `nextRoundIdx`. */
export function shouldEndBeforeNextTurn(game: RuntimeGame, nextRoundIdx: number): boolean {
  switch (game.config.endCondition) {
    case EndCondition.FIXED_ROUNDS:
      return nextRoundIdx >= game.config.roundCount
    case EndCondition.FIXED_DURATION:
      return game.gameEndsAt !== null && Date.now() >= game.gameEndsAt.getTime()
    case EndCondition.MANUAL:
      return false
  }
}
