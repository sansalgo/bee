import { useDraggable } from "@dnd-kit/core"
import { TILE_ALPHABET } from "@workspace/shared"
import { Button } from "@workspace/ui/components/button"

import { cn } from "@workspace/ui/lib/utils"

function DraggableLetter({
  character,
  disabled,
  held,
  onPick,
}: {
  character: string
  disabled: boolean
  held: boolean
  onPick: (character: string) => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `picker-${character}`,
    data: { character },
    disabled,
  })

  return (
    <Button
      ref={setNodeRef}
      variant={held ? "default" : "outline"}
      size="icon"
      disabled={disabled}
      className={cn("touch-none", isDragging && "opacity-40")}
      // Fires only for a plain click: the PointerSensor's 4px activation
      // distance means a drag never produces one.
      onClick={() => onPick(character)}
      {...listeners}
      {...attributes}
    >
      {character}
    </Button>
  )
}

export function TilePicker({
  disabled,
  heldCharacter,
  onPick,
}: {
  disabled: boolean
  heldCharacter: string | null
  onPick: (character: string) => void
}) {
  return (
    <div className="grid grid-cols-4 gap-1.5">
      {TILE_ALPHABET.map((character) => (
        <DraggableLetter
          key={character}
          character={character}
          disabled={disabled}
          held={heldCharacter === character}
          onPick={onPick}
        />
      ))}
    </div>
  )
}
