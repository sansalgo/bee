/**
 * Canonical Socket.IO event names, shared verbatim between apps/web and apps/api
 * so a typo can never cause a client/server event name mismatch.
 */
export const SocketEvent = {
  // Client -> Server
  RoomLeave: "room:leave",
  PlayerReady: "player:ready",
  GameStart: "game:start",
  TilePlace: "tile:place",
  TitleSubmit: "title:submit",
  GameEnd: "game:end",

  // Server -> Client
  PlayerJoined: "player:joined",
  PlayerLeft: "player:left",
  GameStarted: "game:started",
  TurnStarted: "turn:started",
  TurnEnded: "turn:ended",
  BoardUpdated: "board:updated",
  ScoreUpdated: "score:updated",
  TimerUpdated: "timer:updated",
  PlayerDisconnected: "player:disconnected",
  PlayerReconnected: "player:reconnected",
  GameFinished: "game:finished",
  StateSync: "state:sync",
  FindRejected: "find:rejected",
  FindAccepted: "find:accepted",
} as const

export type SocketEvent = (typeof SocketEvent)[keyof typeof SocketEvent]
