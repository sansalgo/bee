import type { PlayerSummary } from "@workspace/shared"
import { Badge } from "@workspace/ui/components/badge"

import { cn } from "@workspace/ui/lib/utils"

export function PlayerList({
  players,
  currentTurnPlayerId,
}: {
  players: PlayerSummary[]
  currentTurnPlayerId?: string | null
}) {
  const sorted = [...players].sort((a, b) => b.score - a.score)

  return (
    <ul className="flex flex-col gap-2">
      {sorted.map((player) => (
        <li
          key={player.id}
          className={cn(
            "flex items-center justify-between border border-border px-2.5 py-1.5 text-xs",
            currentTurnPlayerId === player.id && "border-primary",
          )}
        >
          <span className="flex items-center gap-1.5">
            <span
              className={cn("size-1.5 shrink-0 rounded-full", player.isConnected ? "bg-primary" : "bg-muted-foreground")}
              title={player.isConnected ? "Connected" : "Disconnected"}
            />
            {player.nickname}
            {player.isHost && (
              <Badge variant="outline" className="h-4 px-1 text-[10px]">
                Host
              </Badge>
            )}
            {player.isReady && (
              <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                Ready
              </Badge>
            )}
          </span>
          <span className="font-medium">{player.score}</span>
        </li>
      ))}
    </ul>
  )
}
