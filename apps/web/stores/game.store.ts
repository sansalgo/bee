import type { BoardTile, FindAcceptedPayload, GameStateSyncPayload, PlayerSummary, TurnState } from "@workspace/shared"
import { GameStatus } from "@workspace/shared"
import { create } from "zustand"

export interface FoundEntry extends FindAcceptedPayload {
  id: string
}

interface GameStoreState {
  status: GameStatus | string
  players: PlayerSummary[]
  tiles: BoardTile[]
  currentTurn: TurnState | null
  roundIdx: number
  categoryKey: string
  finds: FoundEntry[]
  lastRejection: string | null
  connected: boolean

  setConnected: (connected: boolean) => void
  setStatus: (status: GameStatus | string) => void
  applySnapshot: (snapshot: GameStateSyncPayload) => void
  setPlayers: (players: PlayerSummary[]) => void
  upsertTiles: (tiles: BoardTile[]) => void
  setTurn: (turn: TurnState | null) => void
  addFind: (find: FindAcceptedPayload) => void
  setFinished: (players: PlayerSummary[]) => void
  setRejection: (reason: string | null) => void
  reset: () => void
}

const initialState = {
  status: GameStatus.LOBBY as GameStatus | string,
  players: [] as PlayerSummary[],
  tiles: [] as BoardTile[],
  currentTurn: null as TurnState | null,
  roundIdx: 0,
  categoryKey: "",
  finds: [] as FoundEntry[],
  lastRejection: null as string | null,
  connected: false,
}

export const useGameStore = create<GameStoreState>((set) => ({
  ...initialState,

  setConnected: (connected) => set({ connected }),

  setStatus: (status) => set({ status }),

  applySnapshot: (snapshot) =>
    set({
      status: snapshot.status,
      players: snapshot.players,
      tiles: snapshot.tiles,
      currentTurn: snapshot.currentTurn,
      roundIdx: snapshot.roundIdx,
      categoryKey: snapshot.categoryKey,
    }),

  setPlayers: (players) => set({ players }),

  // Board events only carry the tiles that changed (newly placed, or newly
  // consumed) — merge by id rather than replacing the whole board.
  upsertTiles: (tiles) =>
    set((state) => {
      const byId = new Map(state.tiles.map((tile) => [tile.id, tile]))
      for (const tile of tiles) {
        byId.set(tile.id, tile)
      }
      return { tiles: [...byId.values()] }
    }),

  setTurn: (turn) => set({ currentTurn: turn }),

  addFind: (find) => set((state) => ({ finds: [...state.finds, { ...find, id: crypto.randomUUID() }] })),

  setFinished: (players) => set({ status: GameStatus.FINISHED, players, currentTurn: null }),

  setRejection: (reason) => set({ lastRejection: reason }),

  reset: () => set(initialState),
}))
