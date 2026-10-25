"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from "@dnd-kit/core"
import type { DragEndEvent, DragStartEvent, DropAnimation } from "@dnd-kit/core"

import { GameStatus, TILE_CHARACTER_REGEX, TILE_SIZE_PX } from "@workspace/shared"
import { Alert, AlertDescription } from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"

import { Board, BOARD_DROPPABLE_ID } from "@/components/game/board"
import { FoundTitlesPanel } from "@/components/game/found-titles-panel"
import { PlayerList } from "@/components/game/player-list"
import { TilePicker } from "@/components/game/tile-picker"
import { TurnBanner } from "@/components/game/turn-banner"
import { useGameSocket } from "@/hooks/use-game-socket"
import { useRoomIdentity } from "@/hooks/use-room-identity"
import { shouldIgnoreShortcut } from "@/lib/keyboard"
import { clearRoomIdentity } from "@/lib/room-storage"
import { useGameStore } from "@/stores/game.store"

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max))
}

type BoardRect = { left: number; top: number; width: number; height: number }

function ghostTransform(point: { x: number; y: number }) {
  return `translate(${point.x - TILE_SIZE_PX / 2}px, ${point.y - TILE_SIZE_PX / 2}px)`
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

  const isMyTurn = identity !== null && currentTurn?.playerId === identity.playerId
  // A letter "stuck" to the cursor (picked by click or keyboard). Tied to the
  // turn it was picked in, so it drops automatically once that turn ends.
  const [held, setHeld] = useState<{ character: string; turnId: string } | null>(null)
  const heldCharacter =
    held && isMyTurn && held.turnId === currentTurn?.turnId ? held.character : null
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null)
  const ghostRef = useRef<HTMLDivElement | null>(null)

  function pickLetter(character: string) {
    if (!isMyTurn || !currentTurn) return
    setHeld(heldCharacter === character ? null : { character, turnId: currentTurn.turnId })
  }

  function placeTile(character: string, left: number, top: number, boardRect: BoardRect) {
    const x = clamp(left - boardRect.left, 0, boardRect.width - TILE_SIZE_PX)
    const y = clamp(top - boardRect.top, 0, boardRect.height - TILE_SIZE_PX)
    emitPlaceTile(character, x, y)
  }

  function placeHeldAt(clientX: number, clientY: number, boardRect: BoardRect) {
    if (!heldCharacter) return
    placeTile(heldCharacter, clientX - TILE_SIZE_PX / 2, clientY - TILE_SIZE_PX / 2, boardRect)
    setHeld(null)
  }

  // The ghost tile follows the pointer by writing its transform directly, so
  // moving the mouse never re-renders the board.
  useEffect(() => {
    function handlePointerMove(event: PointerEvent) {
      lastPointerRef.current = { x: event.clientX, y: event.clientY }
      if (ghostRef.current) {
        ghostRef.current.style.transform = ghostTransform(lastPointerRef.current)
        ghostRef.current.style.visibility = "visible"
      }
    }
    window.addEventListener("pointermove", handlePointerMove)
    return () => window.removeEventListener("pointermove", handlePointerMove)
  }, [])

  // Typing a letter picks it up (or swaps the held one); Esc drops it.
  const currentTurnId = currentTurn?.turnId
  useEffect(() => {
    if (!isMyTurn || !currentTurnId) return
    function handleKeyDown(event: KeyboardEvent) {
      if (shouldIgnoreShortcut(event)) return
      if (event.key === "Escape") {
        setHeld(null)
        return
      }
      const character = event.key.toUpperCase()
      if (character.length === 1 && TILE_CHARACTER_REGEX.test(character)) {
        event.preventDefault()
        setHeld({ character, turnId: currentTurnId! })
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isMyTurn, currentTurnId])

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

    placeTile(character!, activeRect!.left, activeRect!.top, over!.rect)
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

  return (
    <div className="flex min-h-svh flex-col gap-4 p-4">
      <TurnBanner turn={currentTurn} players={players} selfPlayerId={identity.playerId} />

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-[200px_1fr_240px]">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium">Drag a letter onto the board, or click/type it to pick it up</p>
            <TilePicker disabled={!isMyTurn} heldCharacter={heldCharacter} onPick={pickLetter} />
            {heldCharacter && (
              <p className="text-xs text-muted-foreground">
                Holding {heldCharacter} — click the board to place it, Esc to cancel.
              </p>
            )}
          </div>

          <Board
            tiles={tiles}
            submitDisabled={!isMyTurn}
            onSubmit={(tileIds) => emitSubmitTitle(tileIds)}
            heldCharacter={heldCharacter}
            onPlaceAt={placeHeldAt}
            onCancelHold={() => setHeld(null)}
          />

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

      {heldCharacter && (
        <div
          ref={(node) => {
            ghostRef.current = node
            // Start at the last known pointer position; until the pointer has
            // moved at least once there's nowhere sensible to show it.
            if (node && lastPointerRef.current) {
              node.style.transform = ghostTransform(lastPointerRef.current)
              node.style.visibility = "visible"
            }
          }}
          aria-hidden
          className="pointer-events-none invisible fixed top-0 left-0 z-50 flex size-9 items-center justify-center border border-primary bg-primary text-sm font-medium text-primary-foreground opacity-90 shadow-lg pointer-coarse:hidden"
        >
          {heldCharacter}
        </div>
      )}

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
