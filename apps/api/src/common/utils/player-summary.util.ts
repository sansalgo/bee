import type { PlayerSummary } from "@workspace/shared"

export function toPlayerSummary(player: {
  id: string
  nickname: string
  score: number
  isHost: boolean
  isConnected: boolean
  isReady: boolean
  hasLeft: boolean
  joinOrder: number
}): PlayerSummary {
  return {
    id: player.id,
    nickname: player.nickname,
    score: player.score,
    isHost: player.isHost,
    isConnected: player.isConnected,
    isReady: player.isReady,
    hasLeft: player.hasLeft,
    joinOrder: player.joinOrder,
  }
}
