import { Inject, Injectable } from "@nestjs/common"
import { GameStatus as PrismaGameStatus } from "@prisma/client"
import { WsException } from "@nestjs/websockets"
import { EndCondition, MIN_PLAYERS } from "@workspace/shared"
import type { GameConfig, PlayerSummary } from "@workspace/shared"

import { CategoriesService } from "../categories/categories.service"
import { toPlayerSummary } from "../common/utils/player-summary.util"
import { PrismaService } from "../prisma/prisma.service"
import { applyFindTitle } from "./engine/actions/find-title.action"
import { applyPlaceTile } from "./engine/actions/place-tile.action"
import { computeNextTurnMeta, computeTurnDeadline, shouldEndBeforeNextTurn } from "./engine/game-engine"
import type { RuntimeGame, RuntimePlayer, RuntimeTile, RuntimeTurn } from "./engine/game-engine"
import { GameStateStore } from "./engine/game-state.store"
import { TurnTimerService } from "./engine/turn-timer.service"
import { GameEventsBus } from "./game-events.bus"

export type AdvanceResult = { finished: true; players: RuntimePlayer[] } | { finished: false; nextTurn: RuntimeTurn }

export interface PlaceTileResult {
  tile: RuntimeTile
  resolvedTurnId: string
  advance: AdvanceResult
}

export type FindTitleResult =
  | { matched: false; reason: string }
  | {
      matched: true
      itemId: string
      matchedText: string
      pointsAwarded: number
      consumedTiles: RuntimeTile[]
      players: RuntimePlayer[]
      resolvedTurnId: string
      advance: AdvanceResult
    }

@Injectable()
export class GamesService {
  // Explicit @Inject() tokens on every constructor param throughout this
  // codebase: Bun's runtime TS transpilation does not emit
  // `design:paramtypes` decorator metadata (verified directly), so Nest's
  // usual implicit type-based constructor injection silently resolves to
  // `undefined` for every param unless each is given an explicit token here.
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(GameStateStore) private readonly store: GameStateStore,
    @Inject(TurnTimerService) private readonly timer: TurnTimerService,
    @Inject(CategoriesService) private readonly categories: CategoriesService,
    @Inject(GameEventsBus) private readonly events: GameEventsBus,
  ) {}

  // ---------- Lobby phase (Prisma-only, no RuntimeGame yet) ----------

  async setPlayerReady(gameId: string, playerId: string, ready: boolean): Promise<PlayerSummary[]> {
    await this.prisma.player.update({ where: { id: playerId }, data: { isReady: ready } })
    const players = await this.prisma.player.findMany({ where: { gameId }, orderBy: { joinOrder: "asc" } })
    return players.map(toPlayerSummary)
  }

  async markPlayerConnection(gameId: string, playerId: string, isConnected: boolean): Promise<void> {
    await this.prisma.player.update({
      where: { id: playerId },
      data: { isConnected, disconnectedAt: isConnected ? null : new Date() },
    })
    if (this.store.has(gameId)) {
      const game = this.store.get(gameId)
      const player = game.players.find((p) => p.id === playerId)
      if (player) {
        player.isConnected = isConnected
      }
    }
  }

  // ---------- Start / manual end (host-only; caller enforces via HostWsGuard) ----------

  async startGame(gameId: string): Promise<RuntimeGame> {
    const game = await this.prisma.game.findUnique({
      where: { id: gameId },
      include: { players: { orderBy: { joinOrder: "asc" } } },
    })
    if (!game) {
      throw new WsException("Game not found")
    }
    if (game.status !== PrismaGameStatus.LOBBY) {
      throw new WsException("Game has already started")
    }
    if (game.players.length < MIN_PLAYERS) {
      throw new WsException(`At least ${MIN_PLAYERS} players are required to start`)
    }

    const config = game.config as unknown as GameConfig
    const gameEndsAt = config.endCondition === EndCondition.FIXED_DURATION ? new Date(Date.now() + config.durationSec * 1000) : null

    const runtime: RuntimeGame = {
      gameId: game.id,
      code: game.code,
      categoryKey: game.categoryKey,
      config,
      status: PrismaGameStatus.IN_PROGRESS,
      players: game.players.map((p) => ({
        id: p.id,
        nickname: p.nickname,
        isHost: p.isHost,
        joinOrder: p.joinOrder,
        score: p.score,
        isConnected: p.isConnected,
        isReady: p.isReady,
      })),
      tiles: [],
      foundItemIds: [],
      currentTurn: null,
      tileSequenceCounter: 0,
      gameEndsAt,
    }
    this.store.set(runtime)

    const firstPlayer = runtime.players[0]
    if (!firstPlayer) {
      throw new WsException("No players to start the game with")
    }
    const deadline = computeTurnDeadline(config)
    const turnRow = await this.prisma.turn.create({
      data: { gameId, playerId: firstPlayer.id, roundIdx: 0, turnIdx: 0, deadline },
    })
    runtime.currentTurn = { turnId: turnRow.id, playerId: firstPlayer.id, roundIdx: 0, turnIdx: 0, deadline }

    await this.prisma.game.update({
      where: { id: gameId },
      data: {
        status: PrismaGameStatus.IN_PROGRESS,
        startedAt: new Date(),
        currentRoundIdx: 0,
        currentTurnPlayerId: firstPlayer.id,
        turnStartedAt: new Date(),
        turnDeadline: deadline,
        gameEndsAt,
      },
    })

    this.timer.schedule(gameId, deadline, () => void this.onTurnTimerExpired(gameId))
    return runtime
  }

  async endGameManually(gameId: string): Promise<RuntimePlayer[]> {
    const game = this.store.get(gameId)
    if (game.config.endCondition !== EndCondition.MANUAL) {
      throw new WsException("Manual end is not enabled for this game")
    }
    this.timer.clear(gameId)
    await this.prisma.game.update({
      where: { id: gameId },
      data: { status: PrismaGameStatus.FINISHED, finishedAt: new Date(), currentTurnPlayerId: null, turnDeadline: null },
    })
    const players = game.players
    this.store.delete(gameId)
    return players
  }

  // ---------- In-turn actions ----------

  async placeTile(gameId: string, playerId: string, character: string): Promise<PlaceTileResult> {
    const game = this.store.get(gameId)
    this.assertCurrentTurn(game, playerId)
    const turnId = game.currentTurn!.turnId

    const row = await this.prisma.boardTile.create({
      data: {
        gameId,
        character,
        placedByPlayerId: playerId,
        placedAtTurnId: turnId,
        sequenceNo: game.tileSequenceCounter,
      },
    })
    const tile: RuntimeTile = {
      id: row.id,
      character: row.character,
      placedByPlayerId: row.placedByPlayerId,
      sequenceNo: row.sequenceNo,
      consumed: false,
    }
    applyPlaceTile(game, tile)
    game.tileSequenceCounter++

    await this.prisma.turn.update({ where: { id: turnId }, data: { outcome: "PLACE", resolvedAt: new Date() } })
    this.timer.clear(gameId)
    const advance = await this.advanceTurn(game)
    return { tile, resolvedTurnId: turnId, advance }
  }

  async findTitle(gameId: string, playerId: string, tileIds: string[]): Promise<FindTitleResult> {
    const game = this.store.get(gameId)
    this.assertCurrentTurn(game, playerId)

    const plugin = this.categories.get(game.categoryKey)
    const result = await applyFindTitle(game, plugin, tileIds)
    if (!result.matched) {
      return { matched: false, reason: result.reason }
    }

    const turnId = game.currentTurn!.turnId
    await this.prisma.find.create({
      data: {
        gameId,
        playerId,
        turnId,
        categoryKey: game.categoryKey,
        itemId: result.itemId,
        matchedText: result.matchedText,
        pointsAwarded: result.pointsAwarded,
        tiles: { connect: result.consumedTiles.map((tile) => ({ id: tile.id })) },
      },
    })
    await this.prisma.player.update({ where: { id: playerId }, data: { score: { increment: result.pointsAwarded } } })
    await this.prisma.turn.update({ where: { id: turnId }, data: { outcome: "FIND", resolvedAt: new Date() } })

    for (const tile of result.consumedTiles) {
      tile.consumed = true
    }
    game.foundItemIds.push(result.itemId)
    const player = game.players.find((p) => p.id === playerId)
    if (player) {
      player.score += result.pointsAwarded
    }

    this.timer.clear(gameId)
    const advance = await this.advanceTurn(game)

    return {
      matched: true,
      itemId: result.itemId,
      matchedText: result.matchedText,
      pointsAwarded: result.pointsAwarded,
      consumedTiles: result.consumedTiles,
      players: game.players,
      resolvedTurnId: turnId,
      advance,
    }
  }

  // ---------- Snapshot for reconnect ----------

  getRuntimeSnapshot(gameId: string): RuntimeGame | null {
    return this.store.has(gameId) ? this.store.get(gameId) : null
  }

  // ---------- Internal ----------

  private assertCurrentTurn(game: RuntimeGame, playerId: string): void {
    if (game.status !== PrismaGameStatus.IN_PROGRESS) {
      throw new WsException("Game is not in progress")
    }
    if (!game.currentTurn || game.currentTurn.playerId !== playerId) {
      throw new WsException("It is not your turn")
    }
  }

  private async onTurnTimerExpired(gameId: string): Promise<void> {
    if (!this.store.has(gameId)) {
      return
    }
    const game = this.store.get(gameId)
    if (!game.currentTurn) {
      return
    }
    const skippedPlayerId = game.currentTurn.playerId
    const resolvedTurnId = game.currentTurn.turnId
    await this.prisma.turn.update({
      where: { id: resolvedTurnId },
      data: { outcome: "SKIPPED_TIMEOUT", resolvedAt: new Date() },
    })
    const advance = await this.advanceTurn(game)
    this.events.emitTurnAutoSkipped({
      gameId,
      skippedPlayerId,
      resolvedTurnId,
      players: game.players,
      finished: advance.finished,
      nextTurn: advance.finished ? null : advance.nextTurn,
    })
  }

  private async advanceTurn(game: RuntimeGame): Promise<AdvanceResult> {
    const meta = computeNextTurnMeta(game)

    if (shouldEndBeforeNextTurn(game, meta.roundIdx)) {
      game.status = PrismaGameStatus.FINISHED
      game.currentTurn = null
      this.timer.clear(game.gameId)
      await this.prisma.game.update({
        where: { id: game.gameId },
        data: {
          status: PrismaGameStatus.FINISHED,
          finishedAt: new Date(),
          currentTurnPlayerId: null,
          turnDeadline: null,
        },
      })
      const players = game.players
      this.store.delete(game.gameId)
      return { finished: true, players }
    }

    const nextPlayer = game.players[meta.playerIndex]
    if (!nextPlayer) {
      throw new Error(`Invalid player index ${meta.playerIndex} for game ${game.gameId}`)
    }
    const deadline = computeTurnDeadline(game.config)
    const turnRow = await this.prisma.turn.create({
      data: { gameId: game.gameId, playerId: nextPlayer.id, roundIdx: meta.roundIdx, turnIdx: meta.turnIdx, deadline },
    })
    const nextTurn: RuntimeTurn = {
      turnId: turnRow.id,
      playerId: nextPlayer.id,
      roundIdx: meta.roundIdx,
      turnIdx: meta.turnIdx,
      deadline,
    }
    game.currentTurn = nextTurn

    await this.prisma.game.update({
      where: { id: game.gameId },
      data: {
        currentRoundIdx: meta.roundIdx,
        currentTurnPlayerId: nextPlayer.id,
        turnStartedAt: new Date(),
        turnDeadline: deadline,
      },
    })

    this.timer.schedule(game.gameId, deadline, () => void this.onTurnTimerExpired(game.gameId))
    return { finished: false, nextTurn }
  }
}
