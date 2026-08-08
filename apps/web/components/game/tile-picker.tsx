import { useDraggable } from "@dnd-kit/core"
import { TILE_ALPHABET } from "@workspace/shared"
import { Button } from "@workspace/ui/components/button"

import { cn } from "@workspace/ui/lib/utils"

function DraggableLetter({ character, disabled }: { character: string; disabled: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `picker-${character}`,
    data: { character },
    disabled,
  })

  return (
    <Button
      ref={setNodeRef}
      variant="outline"
      size="icon"
      disabled={disabled}
      className={cn("touch-none", isDragging && "opacity-40")}
      {...listeners}
      {...attributes}
    >
      {character}
    </Button>
  )
}

export function TilePicker({ disabled }: { disabled: boolean }) {
  return (
    <div className="grid grid-cols-4 gap-1.5">
      {TILE_ALPHABET.map((character) => (
        <DraggableLetter key={character} character={character} disabled={disabled} />
      ))}
    </div>
  )
}
