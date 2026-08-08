import { TILE_GRID_PITCH_PX } from "@workspace/shared"

/**
 * Snaps a desired drop position to the tile grid and, if that cell is
 * already occupied, spirals outward to the nearest free cell — guaranteeing
 * two tiles never render on top of each other regardless of what pixel
 * coordinates a client's drag-and-drop reports.
 */
export function resolveTilePosition(
  occupied: Array<{ x: number; y: number }>,
  desired: { x: number; y: number },
): { x: number; y: number } {
  const toCell = (point: { x: number; y: number }) => ({
    col: Math.round(point.x / TILE_GRID_PITCH_PX),
    row: Math.round(point.y / TILE_GRID_PITCH_PX),
  })
  const cellKey = (cell: { col: number; row: number }) => `${cell.col}:${cell.row}`

  const occupiedCells = new Set(occupied.map((point) => cellKey(toCell(point))))
  const desiredCell = toCell(desired)

  const isFree = (cell: { col: number; row: number }) => cell.col >= 0 && cell.row >= 0 && !occupiedCells.has(cellKey(cell))

  if (isFree(desiredCell)) {
    return { x: desiredCell.col * TILE_GRID_PITCH_PX, y: desiredCell.row * TILE_GRID_PITCH_PX }
  }

  const maxRadius = Math.max(32, Math.ceil(Math.sqrt(occupied.length)) + 8)
  for (let radius = 1; radius <= maxRadius; radius++) {
    for (const cell of ringCells(desiredCell, radius)) {
      if (isFree(cell)) {
        return { x: cell.col * TILE_GRID_PITCH_PX, y: cell.row * TILE_GRID_PITCH_PX }
      }
    }
  }

  // Astronomically unlikely (would require every cell within maxRadius to be
  // occupied) — fall back to placing just past the search ring.
  return { x: (desiredCell.col + maxRadius + 1) * TILE_GRID_PITCH_PX, y: desiredCell.row * TILE_GRID_PITCH_PX }
}

function* ringCells(center: { col: number; row: number }, radius: number): Generator<{ col: number; row: number }> {
  for (let col = center.col - radius; col <= center.col + radius; col++) {
    yield { col, row: center.row - radius }
    yield { col, row: center.row + radius }
  }
  for (let row = center.row - radius + 1; row <= center.row + radius - 1; row++) {
    yield { col: center.col - radius, row }
    yield { col: center.col + radius, row }
  }
}
