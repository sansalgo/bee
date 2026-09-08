"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from "@dnd-kit/core"
import type { DragEndEvent, DragStartEvent, DropAnimation } from "@dnd-kit/core"

import { GameStatus, TILE_SIZE_PX } from "@workspace/shared"
import { Alert, AlertDescription } from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"

import { Board, BOARD_DROPPABLE_ID } from "@/components/game/board"
import { FoundTitlesPanel } from "@/components/game/found-titles-panel"
import { PlayerList } from "@/components/game/player-list"
import { TilePicker } from "@/components/game/tile-picker"
import { TurnBanner } from "@/components/game/turn-banner"
import { useGameSocket } from "@/hooks/use-game-socket"
import { useRoomIdentity } from "@/hooks/use-room-identity"
import { clearRoomIdentity } from "@/lib/room-storage"
import { useGameStore } from "@/stores/game.store"

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max))
}

export function PlayClient({ code }: { code: string }) {
  const router = useRouter()
  const { identity, loaded } = useRoomIdentity(code)
  const { emitPlaceTile, emitSubmitTitle, emitEnd, emitLeave } = useGameSocket(identity)

  const status = useGameStore((state) => state.status)
  const players = useGameStore((state) => state.players)
  const tiles = useGameStore((state) => state.tiles)
  const currentTurn = useGameStore((state) => state.currentTurn)
  const finds = useGameStore((state) => state.finds)
  const lastRejection = useGameStore((state) => state.lastRejection)
  const setRejection = useGameStore((state) => state.setRejection)

  const [activeCharacter, setActiveCharacter] = useState<string | null>(null)
  // null skips the drop animation entirely (tile lands on the board with no
  // snap-back); undefined falls through to dnd-kit's default snap-back,
  // which we keep for drops that don't land on the board.
  const [dropAnimation, setDropAnimation] = useState<DropAnimation | null | undefined>(undefined)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  function handleDragStart(event: DragStartEvent) {
    setActiveCharacter((event.active.data.current?.character as string | undefined) ?? null)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveCharacter(null)
    const { active, over } = event
    const character = active.data.current?.character as string | undefined
    const activeRect = active.rect.current.translated
    const placedOnBoard = Boolean(over && over.id === BOARD_DROPPABLE_ID && character && activeRect)
    setDropAnimation(placedOnBoard ? null : undefined)
    if (!placedOnBoard) return

    const boardRect = over!.rect
    const x = clamp(activeRect!.left - boardRect.left, 0, boardRect.width - TILE_SIZE_PX)
    const y = clamp(activeRect!.top - boardRect.top, 0, boardRect.height - TILE_SIZE_PX)
    emitPlaceTile(character!, x, y)
  }

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

  function handleLeave() {
    emitLeave()
    clearRoomIdentity(code)
    router.push("/")
  }

  const self = players.find((player) => player.id === identity.playerId)
  const isHost = identity.role === "host" || self?.isHost === true
  const isMyTurn = currentTurn?.playerId === identity.playerId

  return (
    <div className="flex min-h-svh flex-col gap-4 p-4">
      <TurnBanner turn={currentTurn} players={players} selfPlayerId={identity.playerId} />

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-[200px_1fr_240px]">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium">Drag a letter onto the board</p>
            <TilePicker disabled={!isMyTurn} />
          </div>

          <Board tiles={tiles} submitDisabled={!isMyTurn} onSubmit={(tileIds) => emitSubmitTitle(tileIds)} />

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
            <Button variant="outline" onClick={handleLeave}>
              Leave Game
            </Button>
          </div>
        </div>

        <DragOverlay dropAnimation={dropAnimation}>
          {activeCharacter && (
            <div className="flex size-9 items-center justify-center border border-primary bg-primary text-sm font-medium text-primary-foreground shadow-lg">
              {activeCharacter}
            </div>
          )}
        </DragOverlay>
      </DndContext>

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
