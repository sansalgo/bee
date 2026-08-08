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
  hasLeft: boolean
}

export interface RuntimeTile {
  id: string
  character: string
  placedByPlayerId: string
  sequenceNo: number
  consumed: boolean
  x: number
  y: number
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

/**
 * Metadata for the turn that would follow the current one, before it's
 * created. Rotation always walks the full, stably-ordered `game.players`
 * array (never reordered or pruned on leave) so a departed player's old
 * slot is skipped rather than shifting everyone else's position.
 */
export function computeNextTurnMeta(game: RuntimeGame): { playerId: string; roundIdx: number; turnIdx: number } {
  if (!game.currentTurn) {
    const first = game.players.find((player) => !player.hasLeft)
    if (!first) {
      throw new Error(`No active players remain in game ${game.gameId}`)
    }
    return { playerId: first.id, roundIdx: 0, turnIdx: 0 }
  }

  const currentIndex = game.players.findIndex((player) => player.id === game.currentTurn?.playerId)
  const total = game.players.length
  let wrapped = false
  let nextIndex = currentIndex

  for (let step = 1; step <= total; step++) {
    const candidateIndex = (currentIndex + step) % total
    if (candidateIndex <= currentIndex) {
      wrapped = true
    }
    if (!game.players[candidateIndex]?.hasLeft) {
      nextIndex = candidateIndex
      break
    }
  }

  const nextPlayer = game.players[nextIndex]
  if (!nextPlayer) {
    throw new Error(`No active players remain in game ${game.gameId}`)
  }

  return {
    playerId: nextPlayer.id,
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
