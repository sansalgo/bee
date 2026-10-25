"use client"

import { useEffect, useState } from "react"
import { useDroppable } from "@dnd-kit/core"
import type { BoardTile } from "@workspace/shared"
import { Button } from "@workspace/ui/components/button"

import { cn } from "@workspace/ui/lib/utils"

import { shouldIgnoreShortcut } from "@/lib/keyboard"

export const BOARD_DROPPABLE_ID = "board-drop-area"

export function Board({
  tiles,
  submitDisabled,
  onSubmit,
  heldCharacter,
  onPlaceAt,
  onCancelHold,
}: {
  tiles: BoardTile[]
  submitDisabled: boolean
  onSubmit: (tileIds: string[]) => void
  /** Letter stuck to the cursor; while set, a click on the board places it there. */
  heldCharacter: string | null
  onPlaceAt: (clientX: number, clientY: number, boardRect: DOMRect) => void
  onCancelHold: () => void
}) {
  const [selected, setSelected] = useState<string[]>([])
  const { setNodeRef, isOver } = useDroppable({ id: BOARD_DROPPABLE_ID })
  const available = tiles.filter((tile) => !tile.consumed)
  const tilesById = new Map(tiles.map((tile) => [tile.id, tile]))
  const selectedTiles = selected.map((id) => tilesById.get(id)).filter((tile) => tile !== undefined)

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  function handleSubmit() {
    if (selected.length === 0) return
    onSubmit(selected)
    setSelected([])
  }

  // Enter submits the built title, Backspace drops the last selected tile.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (shouldIgnoreShortcut(event)) return
      if (event.key === "Enter" && !submitDisabled && selected.length > 0) {
        // Also stops Enter from "clicking" whichever tile button has focus.
        event.preventDefault()
        onSubmit(selected)
        setSelected([])
      } else if (event.key === "Backspace" && selected.length > 0) {
        event.preventDefault()
        setSelected((prev) => prev.slice(0, -1))
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [selected, submitDisabled, onSubmit])

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div
        ref={setNodeRef}
        onClick={(event) => {
          if (heldCharacter) onPlaceAt(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect())
        }}
        onContextMenu={(event) => {
          if (!heldCharacter) return
          event.preventDefault()
          onCancelHold()
        }}
        className={cn(
          "relative min-h-40 flex-1 border border-border p-2 transition-colors",
          isOver && "border-primary bg-primary/5",
          heldCharacter && "cursor-crosshair border-primary/60",
        )}
      >
        {available.length === 0 && (
          <p className="text-xs text-muted-foreground">
            {heldCharacter ? "Click to place the letter here." : "Drag or click letters to build the board."}
          </p>
        )}
        {available.map((tile) => {
          const order = selected.indexOf(tile.id)
          const isSelected = order !== -1
          return (
            <button
              key={tile.id}
              type="button"
              onClick={() => toggle(tile.id)}
              style={{ position: "absolute", left: tile.x, top: tile.y }}
              className={cn(
                "flex size-9 items-center justify-center border border-border bg-background text-sm font-medium shadow-sm transition-colors hover:bg-muted",
                isSelected && "border-primary bg-primary text-primary-foreground",
                // Let clicks fall through to the board so a held letter can be placed anywhere.
                heldCharacter && "pointer-events-none",
              )}
            >
              {tile.character}
              {isSelected && (
                <span className="absolute -top-1.5 -right-1.5 flex size-3.5 items-center justify-center rounded-full bg-foreground text-[9px] text-background">
                  {order + 1}
                </span>
              )}
            </button>
          )
        })}
      </div>
      <div className="flex min-h-11 flex-wrap items-center gap-1 border border-dashed border-border p-2">
        {selectedTiles.length === 0 ? (
          <p className="text-xs text-muted-foreground">Select tiles to build a title...</p>
        ) : (
          selectedTiles.map((tile) => (
            <button
              key={tile.id}
              type="button"
              onClick={() => toggle(tile.id)}
              title="Remove from selection"
              className="flex size-8 items-center justify-center border border-primary bg-primary text-sm font-medium text-primary-foreground"
            >
              {tile.character}
            </button>
          ))
        )}
      </div>
      <div className="flex gap-2">
        <Button variant="outline" disabled={selected.length === 0} onClick={() => setSelected([])}>
          Clear
        </Button>
        <Button className="flex-1" disabled={submitDisabled || selected.length === 0} onClick={handleSubmit}>
          Submit Title ({selected.length})
        </Button>
      </div>
    </div>
  )
}
