"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

import { GameStatus } from "@workspace/shared"
import { Alert, AlertDescription } from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"

import { Board } from "@/components/game/board"
import { FoundTitlesPanel } from "@/components/game/found-titles-panel"
import { PlayerList } from "@/components/game/player-list"
import { TilePicker } from "@/components/game/tile-picker"
import { TurnBanner } from "@/components/game/turn-banner"
import { useGameSocket } from "@/hooks/use-game-socket"
import { useRoomIdentity } from "@/hooks/use-room-identity"
import { useGameStore } from "@/stores/game.store"

export function PlayClient({ code }: { code: string }) {
  const router = useRouter()
  const { identity, loaded } = useRoomIdentity(code)
  const { emitPlaceTile, emitSubmitTitle, emitEnd } = useGameSocket(identity)

  const status = useGameStore((state) => state.status)
  const players = useGameStore((state) => state.players)
  const tiles = useGameStore((state) => state.tiles)
  const currentTurn = useGameStore((state) => state.currentTurn)
  const finds = useGameStore((state) => state.finds)
  const lastRejection = useGameStore((state) => state.lastRejection)
  const setRejection = useGameStore((state) => state.setRejection)

  useEffect(() => {
    if (loaded && !identity) {
      router.replace(`/join?code=${code}`)
    }
  }, [loaded, identity, code, router])

  useEffect(() => {
    if (status === GameStatus.FINISHED) {
      router.push(`/room/${code}/results`)
    }
  }, [status, code, router])

  if (!loaded || !identity) {
    return null
  }

  const self = players.find((player) => player.id === identity.playerId)
  const isHost = identity.role === "host" || self?.isHost === true
  const isMyTurn = currentTurn?.playerId === identity.playerId

  return (
    <div className="flex min-h-svh flex-col gap-4 p-4">
      <TurnBanner turn={currentTurn} players={players} selfPlayerId={identity.playerId} />

      <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-[200px_1fr_240px]">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium">Place a tile</p>
          <TilePicker disabled={!isMyTurn} onPick={(character) => emitPlaceTile(character)} />
        </div>

        <Board tiles={tiles} disabled={!isMyTurn} onSubmit={(tileIds) => emitSubmitTitle(tileIds)} />

        <div className="flex flex-col gap-4">
          <div>
            <p className="mb-2 text-xs font-medium">Players</p>
            <PlayerList players={players} currentTurnPlayerId={currentTurn?.playerId} />
          </div>
          <div>
            <p className="mb-2 text-xs font-medium">Found Titles</p>
            <FoundTitlesPanel finds={finds} players={players} />
          </div>
          {isHost && (
            <Button variant="destructive" onClick={() => emitEnd()}>
              End Game
            </Button>
          )}
        </div>
      </div>

      {lastRejection && (
        <Alert variant="destructive" className="flex items-center justify-between">
          <AlertDescription>{lastRejection}</AlertDescription>
          <Button size="sm" variant="ghost" onClick={() => setRejection(null)}>
            Dismiss
          </Button>
        </Alert>
      )}
    </div>
  )
}
