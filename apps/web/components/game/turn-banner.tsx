"use client"

import { useState } from "react"
import type { PlayerSummary, TurnState } from "@workspace/shared"
import { useInterval } from "usehooks-ts"

export function TurnBanner({
  turn,
  players,
  selfPlayerId,
}: {
  turn: TurnState | null
  players: PlayerSummary[]
  selfPlayerId?: string
}) {
  const [, forceTick] = useState(0)
  useInterval(() => forceTick((tick) => tick + 1), 1000)

  if (!turn) {
    return <div className="border border-border px-3 py-2 text-xs">Waiting for the game to start...</div>
  }

  const player = players.find((candidate) => candidate.id === turn.playerId)
  const remainingSec = Math.max(0, Math.ceil((new Date(turn.deadline).getTime() - Date.now()) / 1000))
  const isYou = turn.playerId === selfPlayerId

  return (
    <div className="flex items-center justify-between border border-border px-3 py-2 text-xs">
      <span className="font-medium">{isYou ? "Your turn" : `${player?.nickname ?? "..."}'s turn`}</span>
      <span className="font-mono">{remainingSec}s</span>
    </div>
  )
}
