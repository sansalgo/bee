"use client"

import { useState } from "react"
import { useDroppable } from "@dnd-kit/core"
import type { BoardTile } from "@workspace/shared"
import { Button } from "@workspace/ui/components/button"

import { cn } from "@workspace/ui/lib/utils"

export const BOARD_DROPPABLE_ID = "board-drop-area"

export function Board({
  tiles,
  disabled,
  onSubmit,
}: {
  tiles: BoardTile[]
  disabled: boolean
  onSubmit: (tileIds: string[]) => void
}) {
  const [selected, setSelected] = useState<string[]>([])
  const { setNodeRef, isOver } = useDroppable({ id: BOARD_DROPPABLE_ID })
  const available = tiles.filter((tile) => !tile.consumed)
  const tilesById = new Map(tiles.map((tile) => [tile.id, tile]))
  const selectedTiles = selected.map((id) => tilesById.get(id)).filter((tile) => tile !== undefined)

  function toggle(id: string) {
    if (disabled) return
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  function handleSubmit() {
    if (selected.length === 0) return
    onSubmit(selected)
    setSelected([])
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div
        ref={setNodeRef}
        className={cn(
          "relative min-h-40 flex-1 border border-border p-2 transition-colors",
          isOver && "border-primary bg-primary/5",
        )}
      >
        {available.length === 0 && (
          <p className="text-xs text-muted-foreground">Drag letters here to build the board.</p>
        )}
        {available.map((tile) => {
          const order = selected.indexOf(tile.id)
          const isSelected = order !== -1
          return (
            <button
              key={tile.id}
              type="button"
              disabled={disabled}
              onClick={() => toggle(tile.id)}
              style={{ position: "absolute", left: tile.x, top: tile.y }}
              className={cn(
                "flex size-9 items-center justify-center border border-border bg-background text-sm font-medium shadow-sm transition-colors hover:bg-muted",
                isSelected && "border-primary bg-primary text-primary-foreground",
                disabled && "cursor-not-allowed opacity-50",
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
              disabled={disabled}
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
        <Button className="flex-1" disabled={disabled || selected.length === 0} onClick={handleSubmit}>
          Submit Title ({selected.length})
        </Button>
      </div>
    </div>
  )
}
