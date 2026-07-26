"use client"

import { useState } from "react"
import type { BoardTile } from "@workspace/shared"
import { Button } from "@workspace/ui/components/button"

import { cn } from "@workspace/ui/lib/utils"

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
  const available = tiles.filter((tile) => !tile.consumed)

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
      <div className="flex min-h-40 flex-1 flex-wrap content-start gap-2 border border-border p-4">
        {available.length === 0 && <p className="text-xs text-muted-foreground">No tiles on the board yet.</p>}
        {available.map((tile) => {
          const order = selected.indexOf(tile.id)
          const isSelected = order !== -1
          return (
            <button
              key={tile.id}
              type="button"
              disabled={disabled}
              onClick={() => toggle(tile.id)}
              className={cn(
                "relative flex size-9 items-center justify-center border border-border text-sm font-medium transition-colors",
                isSelected ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted",
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
