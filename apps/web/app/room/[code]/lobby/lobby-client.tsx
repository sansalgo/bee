"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

import { GameStatus } from "@workspace/shared"
import { Button } from "@workspace/ui/components/button"
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"

import { PlayerList } from "@/components/game/player-list"
import { ShareDialog } from "@/components/game/share-dialog"
import { useGameSocket } from "@/hooks/use-game-socket"
import { useRoomIdentity } from "@/hooks/use-room-identity"
import { clearRoomIdentity } from "@/lib/room-storage"
import { useGameStore } from "@/stores/game.store"

export function LobbyClient({ code }: { code: string }) {
  const router = useRouter()
  const { identity, loaded } = useRoomIdentity(code)
  const { emitReady, emitStart, emitLeave } = useGameSocket(identity)

  const status = useGameStore((state) => state.status)
  const players = useGameStore((state) => state.players)
  const connected = useGameStore((state) => state.connected)
  const reset = useGameStore((state) => state.reset)

  useEffect(() => {
    if (loaded && !identity) {
      router.replace(`/join?code=${code}`)
    }
  }, [loaded, identity, code, router])

  useEffect(() => {
    if (status === GameStatus.IN_PROGRESS) {
      router.push(`/room/${code}/play`)
    }
  }, [status, code, router])

  useEffect(() => () => reset(), [reset])

  if (!loaded || !identity) {
    return null
  }

  const self = players.find((player) => player.id === identity.playerId)
  const isHost = identity.role === "host" || self?.isHost === true

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-base">
            Room {code}
            {!connected && <span className="ml-2 text-muted-foreground">(connecting...)</span>}
          </CardTitle>
          <CardAction>
            <ShareDialog code={code} />
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <PlayerList players={players} />
          <div className="flex gap-2">
            {identity.role === "player" && (
              <Button variant="outline" className="flex-1" onClick={() => emitReady(!self?.isReady)}>
                {self?.isReady ? "Not Ready" : "Ready"}
              </Button>
            )}
            {isHost && (
              <Button className="flex-1" onClick={() => emitStart()}>
                Start Game
              </Button>
            )}
          </div>
          <Button
            variant="ghost"
            onClick={() => {
              emitLeave()
              clearRoomIdentity(code)
              router.push("/")
            }}
          >
            Leave Room
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
