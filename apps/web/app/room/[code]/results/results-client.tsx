"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

import type { PlayerSummary } from "@workspace/shared"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"

import { apiClient } from "@/lib/api-client"
import { clearRoomIdentity } from "@/lib/room-storage"
import { useGameStore } from "@/stores/game.store"

export function ResultsClient({ code }: { code: string }) {
  const router = useRouter()
  const storePlayers = useGameStore((state) => state.players)
  const reset = useGameStore((state) => state.reset)
  const [players, setPlayers] = useState<PlayerSummary[]>(storePlayers)

  useEffect(() => {
    if (storePlayers.length > 0) {
      setPlayers(storePlayers)
      return
    }
    apiClient
      .getLeaderboard(code)
      .then(setPlayers)
      .catch(() => {})
  }, [code, storePlayers])

  useEffect(() => () => reset(), [reset])

  const sorted = [...players].sort((a, b) => b.score - a.score)

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-base">Final Standings</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ol className="flex flex-col gap-2">
            {sorted.map((player, index) => (
              <li
                key={player.id}
                className="flex items-center justify-between border border-border px-2.5 py-1.5 text-xs"
              >
                <span>
                  #{index + 1} {player.nickname}
                </span>
                <span className="font-medium">{player.score}</span>
              </li>
            ))}
          </ol>
          <Button
            className="w-full"
            onClick={() => {
              clearRoomIdentity(code)
              router.push("/")
            }}
          >
            Back to Home
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
