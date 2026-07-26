import type { PlayerSummary } from "@workspace/shared"

import type { FoundEntry } from "@/stores/game.store"

export function FoundTitlesPanel({ finds, players }: { finds: FoundEntry[]; players: PlayerSummary[] }) {
  return (
    <div className="flex flex-col gap-2">
      {finds.length === 0 && <p className="text-xs text-muted-foreground">No titles found yet.</p>}
      {[...finds].reverse().map((find) => {
        const player = players.find((candidate) => candidate.id === find.playerId)
        return (
          <div key={find.id} className="flex items-center justify-between border border-border px-2.5 py-1.5 text-xs">
            <span>
              {find.matchedText}
              <span className="ml-1.5 text-muted-foreground">— {player?.nickname ?? "?"}</span>
            </span>
            <span className="font-medium">{find.pointsAwarded}</span>
          </div>
        )
      })}
    </div>
  )
}
