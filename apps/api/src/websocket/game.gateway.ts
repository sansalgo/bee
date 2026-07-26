import { Inject, UseFilters, UseGuards } from "@nestjs/common"
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from "@nestjs/websockets"
import { findTitlePayloadSchema, placeTilePayloadSchema, playerReadyPayloadSchema, SocketEvent, TurnOutcome } from "@workspace/shared"
import type {
  FindAcceptedPayload,
  FindRejectedPayload,
  FindTitlePayload,
  GameFinishedPayload,
  GameStateSyncPayload,
  PlaceTilePayload,
  PlayerReadyPayload,
  ScoreUpdatedPayload,
  TurnEnded,
  TurnState,
} from "@workspace/shared"
import type { Server, Socket } from "socket.io"

import { WsExceptionFilter } from "../common/filters/ws-exception.filter"
import { HostWsGuard } from "../common/guards/host-ws.guard"
import { ZodWsValidationPipe } from "../common/pipes/zod-ws-validation.pipe"
import { toPlayerSummary } from "../common/utils/player-summary.util"
import type { RuntimeTurn } from "../games/engine/game-engine"
import { GameEventsBus } from "../games/game-events.bus"
import type { AdvanceResult } from "../games/games.service"
import { GamesService } from "../games/games.service"
import { PrismaService } from "../prisma/prisma.service"
import type { SocketData } from "./socket-data.type"
import { createWsAuthMiddleware } from "./ws-auth.middleware"

// The event-map generics are left permissive (`any`) since payloads are
// validated at the boundary via shared Zod schemas rather than Socket.IO's
// own typed-events map.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GameSocket = Socket<any, any, any, SocketData>

@UseFilters(WsExceptionFilter)
@WebSocketGateway({
  cors: { origin: process.env.CORS_ORIGIN ?? "http://localhost:3000", credentials: true },
})
export class GameGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server

  // Tracks which (gameId, playerId) pairs have connected at least once this
  // process's lifetime, purely to pick PlayerJoined vs PlayerReconnected —
  // reset on restart, which is an accepted v1 limitation (single instance).
  private readonly everConnected = new Set<string>()

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(GamesService) private readonly gamesService: GamesService,
    @Inject(GameEventsBus) private readonly events: GameEventsBus,
  ) {
    this.events.onTurnAutoSkipped((event) => {
      this.server.to(event.gameId).emit(SocketEvent.TurnEnded, {
        turnId: event.resolvedTurnId,
        playerId: event.skippedPlayerId,
        outcome: TurnOutcome.SKIPPED_TIMEOUT,
      } satisfies TurnEnded)
      if (event.finished) {
        this.server.to(event.gameId).emit(SocketEvent.GameFinished, {
          players: event.players.map(toPlayerSummary),
        } satisfies GameFinishedPayload)
      } else if (event.nextTurn) {
        this.broadcastTurnStarted(event.gameId, event.nextTurn)
      }
    })
  }

  afterInit(server: Server) {
    server.use(createWsAuthMiddleware(this.prisma) as Parameters<typeof server.use>[0])
  }

  async handleConnection(socket: GameSocket) {
    const { gameId, playerId } = socket.data
    await socket.join(gameId)

    if (playerId) {
      await this.gamesService.markPlayerConnection(gameId, playerId, true)
      const key = `${gameId}:${playerId}`
      const eventName = this.everConnected.has(key) ? SocketEvent.PlayerReconnected : SocketEvent.PlayerJoined
      this.everConnected.add(key)
      const players = await this.prisma.player.findMany({ where: { gameId }, orderBy: { joinOrder: "asc" } })
      this.server.to(gameId).emit(eventName, { playerId })
      this.server.to(gameId).emit(SocketEvent.ScoreUpdated, {
        players: players.map(toPlayerSummary),
      } satisfies ScoreUpdatedPayload)
    }

    await this.sendStateSync(socket, gameId)
  }

  async handleDisconnect(socket: GameSocket) {
    const { gameId, playerId } = socket.data ?? {}
    if (!gameId || !playerId) {
      return
    }
    await this.gamesService.markPlayerConnection(gameId, playerId, false)
    this.server.to(gameId).emit(SocketEvent.PlayerDisconnected, { playerId })
  }

  @SubscribeMessage(SocketEvent.RoomLeave)
  async handleRoomLeave(@ConnectedSocket() socket: GameSocket) {
    const { gameId, playerId } = socket.data
    await socket.leave(gameId)
    if (playerId) {
      this.server.to(gameId).emit(SocketEvent.PlayerLeft, { playerId })
    }
  }

  @SubscribeMessage(SocketEvent.PlayerReady)
  async handlePlayerReady(
    @ConnectedSocket() socket: GameSocket,
    @MessageBody(new ZodWsValidationPipe(playerReadyPayloadSchema)) body: PlayerReadyPayload,
  ) {
    const { gameId, playerId } = socket.data
    if (!playerId) {
      throw new WsException("Only seated players can toggle ready")
    }
    const players = await this.gamesService.setPlayerReady(gameId, playerId, body.ready)
    this.server.to(gameId).emit(SocketEvent.PlayerReady, { players } satisfies ScoreUpdatedPayload)
  }

  @UseGuards(HostWsGuard)
  @SubscribeMessage(SocketEvent.GameStart)
  async handleGameStart(@ConnectedSocket() socket: GameSocket) {
    const { gameId } = socket.data
    const runtime = await this.gamesService.startGame(gameId)
    this.server.to(gameId).emit(SocketEvent.GameStarted, {})
    if (runtime.currentTurn) {
      this.broadcastTurnStarted(gameId, runtime.currentTurn)
    }
  }

  @UseGuards(HostWsGuard)
  @SubscribeMessage(SocketEvent.GameEnd)
  async handleGameEnd(@ConnectedSocket() socket: GameSocket) {
    const { gameId } = socket.data
    const players = await this.gamesService.endGameManually(gameId)
    this.server.to(gameId).emit(SocketEvent.GameFinished, {
      players: players.map(toPlayerSummary),
    } satisfies GameFinishedPayload)
  }

  @SubscribeMessage(SocketEvent.TilePlace)
  async handleTilePlace(
    @ConnectedSocket() socket: GameSocket,
    @MessageBody(new ZodWsValidationPipe(placeTilePayloadSchema)) body: PlaceTilePayload,
  ) {
    const { gameId, playerId } = socket.data
    if (!playerId) {
      throw new WsException("Only seated players can place tiles")
    }
    const result = await this.gamesService.placeTile(gameId, playerId, body.character)
    this.server.to(gameId).emit(SocketEvent.BoardUpdated, {
      tiles: [
        {
          id: result.tile.id,
          character: result.tile.character,
          placedByPlayerId: result.tile.placedByPlayerId,
          sequenceNo: result.tile.sequenceNo,
          consumed: result.tile.consumed,
        },
      ],
    })
    this.broadcastTurnResolution(gameId, playerId, result.resolvedTurnId, TurnOutcome.PLACE, result.advance)
  }

  @SubscribeMessage(SocketEvent.TitleSubmit)
  async handleTitleSubmit(
    @ConnectedSocket() socket: GameSocket,
    @MessageBody(new ZodWsValidationPipe(findTitlePayloadSchema)) body: FindTitlePayload,
  ) {
    const { gameId, playerId } = socket.data
    if (!playerId) {
      throw new WsException("Only seated players can submit a title")
    }
    const result = await this.gamesService.findTitle(gameId, playerId, body.tileIds)
    if (!result.matched) {
      // Private to the guesser only — never broadcast, never ends the turn.
      socket.emit(SocketEvent.FindRejected, { reason: result.reason } satisfies FindRejectedPayload)
      return
    }
    this.server.to(gameId).emit(SocketEvent.BoardUpdated, {
      tiles: result.consumedTiles.map((tile) => ({
        id: tile.id,
        character: tile.character,
        placedByPlayerId: tile.placedByPlayerId,
        sequenceNo: tile.sequenceNo,
        consumed: true,
      })),
    })
    this.server.to(gameId).emit(SocketEvent.ScoreUpdated, {
      players: result.players.map(toPlayerSummary),
    } satisfies ScoreUpdatedPayload)
    this.server.to(gameId).emit(SocketEvent.FindAccepted, {
      playerId,
      matchedText: result.matchedText,
      pointsAwarded: result.pointsAwarded,
      consumedTileIds: result.consumedTiles.map((tile) => tile.id),
    } satisfies FindAcceptedPayload)
    this.broadcastTurnResolution(gameId, playerId, result.resolvedTurnId, TurnOutcome.FIND, result.advance)
  }

  private broadcastTurnResolution(
    gameId: string,
    playerId: string,
    turnId: string,
    outcome: TurnOutcome.PLACE | TurnOutcome.FIND,
    advance: AdvanceResult,
  ) {
    this.server.to(gameId).emit(SocketEvent.TurnEnded, { turnId, playerId, outcome } satisfies TurnEnded)
    if (advance.finished) {
      this.server.to(gameId).emit(SocketEvent.GameFinished, {
        players: advance.players.map(toPlayerSummary),
      } satisfies GameFinishedPayload)
    } else {
      this.broadcastTurnStarted(gameId, advance.nextTurn)
    }
  }

  private broadcastTurnStarted(gameId: string, turn: RuntimeTurn) {
    this.server.to(gameId).emit(SocketEvent.TurnStarted, {
      turnId: turn.turnId,
      playerId: turn.playerId,
      roundIdx: turn.roundIdx,
      turnIdx: turn.turnIdx,
      deadline: turn.deadline.toISOString(),
    } satisfies TurnState)
  }

  private async sendStateSync(socket: GameSocket, gameId: string) {
    const runtime = this.gamesService.getRuntimeSnapshot(gameId)
    if (runtime) {
      socket.emit(SocketEvent.StateSync, {
        status: runtime.status,
        players: runtime.players.map(toPlayerSummary),
        tiles: runtime.tiles.map((tile) => ({
          id: tile.id,
          character: tile.character,
          placedByPlayerId: tile.placedByPlayerId,
          sequenceNo: tile.sequenceNo,
          consumed: tile.consumed,
        })),
        currentTurn: runtime.currentTurn
          ? {
              turnId: runtime.currentTurn.turnId,
              playerId: runtime.currentTurn.playerId,
              roundIdx: runtime.currentTurn.roundIdx,
              turnIdx: runtime.currentTurn.turnIdx,
              deadline: runtime.currentTurn.deadline.toISOString(),
            }
          : null,
        roundIdx: runtime.currentTurn?.roundIdx ?? 0,
        categoryKey: runtime.categoryKey,
        config: runtime.config,
      } satisfies GameStateSyncPayload)
      return
    }

    // Game hasn't started yet (lobby) or already finished and was evicted
    // from memory — fall back to a Postgres-backed lobby-shaped snapshot.
    const game = await this.prisma.game.findUnique({ where: { id: gameId }, include: { players: true } })
    if (!game) {
      return
    }
    socket.emit(SocketEvent.StateSync, {
      status: game.status,
      players: game.players.map(toPlayerSummary),
      tiles: [],
      currentTurn: null,
      roundIdx: game.currentRoundIdx,
      categoryKey: game.categoryKey,
      config: game.config,
    } satisfies GameStateSyncPayload)
  }
}
