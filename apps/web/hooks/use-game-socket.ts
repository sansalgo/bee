"use client"

import { useEffect, useRef } from "react"
import type {
  BoardUpdatedPayload,
  FindAcceptedPayload,
  FindRejectedPayload,
  GameFinishedPayload,
  GameStateSyncPayload,
  ScoreUpdatedPayload,
  TurnState,
} from "@workspace/shared"
import { GameStatus, SocketEvent } from "@workspace/shared"
import { toast } from "sonner"
import type { Socket } from "socket.io-client"

import { createGameSocket } from "@/lib/socket-client"
import type { RoomIdentity } from "@/lib/room-storage"
import { useGameStore } from "@/stores/game.store"

export function useGameSocket(identity: RoomIdentity | null) {
  const socketRef = useRef<Socket | null>(null)
  const applySnapshot = useGameStore((state) => state.applySnapshot)
  const setPlayers = useGameStore((state) => state.setPlayers)
  const upsertTiles = useGameStore((state) => state.upsertTiles)
  const setTurn = useGameStore((state) => state.setTurn)
  const addFind = useGameStore((state) => state.addFind)
  const setFinished = useGameStore((state) => state.setFinished)
  const setRejection = useGameStore((state) => state.setRejection)
  const setConnected = useGameStore((state) => state.setConnected)
  const setStatus = useGameStore((state) => state.setStatus)

  useEffect(() => {
    if (!identity) {
      return
    }

    const socket = createGameSocket({ code: identity.code, role: identity.role, token: identity.token })
    socketRef.current = socket

    socket.on("connect", () => setConnected(true))
    socket.on("disconnect", () => setConnected(false))
    socket.on("ws:error", (payload: { message: string }) => toast.error(payload.message))

    socket.on(SocketEvent.StateSync, (payload: GameStateSyncPayload) => applySnapshot(payload))
    socket.on(SocketEvent.GameStarted, () => setStatus(GameStatus.IN_PROGRESS))
    socket.on(SocketEvent.ScoreUpdated, (payload: ScoreUpdatedPayload) => setPlayers(payload.players))
    socket.on(SocketEvent.PlayerReady, (payload: ScoreUpdatedPayload) => setPlayers(payload.players))
    socket.on(SocketEvent.BoardUpdated, (payload: BoardUpdatedPayload) => upsertTiles(payload.tiles))
    socket.on(SocketEvent.TurnStarted, (payload: TurnState) => setTurn(payload))
    socket.on(SocketEvent.FindAccepted, (payload: FindAcceptedPayload) => addFind(payload))
    socket.on(SocketEvent.GameFinished, (payload: GameFinishedPayload) => setFinished(payload.players))
    socket.on(SocketEvent.FindRejected, (payload: FindRejectedPayload) => setRejection(payload.reason))

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identity?.code, identity?.token, identity?.role])

  return {
    emitReady: (ready: boolean) => socketRef.current?.emit(SocketEvent.PlayerReady, { ready }),
    emitStart: () => socketRef.current?.emit(SocketEvent.GameStart),
    emitEnd: () => socketRef.current?.emit(SocketEvent.GameEnd),
    emitPlaceTile: (character: string, x: number, y: number) =>
      socketRef.current?.emit(SocketEvent.TilePlace, { character, x, y }),
    emitSubmitTitle: (tileIds: string[]) => socketRef.current?.emit(SocketEvent.TitleSubmit, { tileIds }),
    emitLeave: () => socketRef.current?.emit(SocketEvent.RoomLeave),
  }
}
