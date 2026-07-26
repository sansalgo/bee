import type { PlayerSummary } from "@workspace/shared"

export function toPlayerSummary(player: {
  id: string
  nickname: string
  score: number
  isHost: boolean
  isConnected: boolean
  isReady: boolean
  joinOrder: number
}): PlayerSummary {
  return {
    id: player.id,
    nickname: player.nickname,
    score: player.score,
    isHost: player.isHost,
    isConnected: player.isConnected,
    isReady: player.isReady,
    joinOrder: player.joinOrder,
  }
}
