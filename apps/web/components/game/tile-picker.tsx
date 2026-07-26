import { TILE_ALPHABET } from "@workspace/shared"
import { Button } from "@workspace/ui/components/button"

export function TilePicker({ disabled, onPick }: { disabled: boolean; onPick: (character: string) => void }) {
  return (
    <div className="grid grid-cols-4 gap-1.5">
      {TILE_ALPHABET.map((character) => (
        <Button key={character} variant="outline" size="icon" disabled={disabled} onClick={() => onPick(character)}>
          {character}
        </Button>
      ))}
    </div>
  )
}
