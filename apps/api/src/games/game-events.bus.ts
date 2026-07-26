import { Injectable } from "@nestjs/common"
import { EventEmitter } from "node:events"

import type { RuntimePlayer, RuntimeTurn } from "./engine/game-engine"

export interface TurnAutoSkippedEvent {
  gameId: string
  skippedPlayerId: string
  resolvedTurnId: string
  players: RuntimePlayer[]
  finished: boolean
  nextTurn: RuntimeTurn | null
}

/**
 * Plain Node EventEmitter (no extra dependency) used to notify the
 * WebSocket gateway about state changes that originate outside of a
 * gateway-handled request — currently just a turn timing out. Gateway-
 * initiated actions (place/find/start/end) return their result directly to
 * the calling handler and don't need this; only the timer callback, which
 * runs on its own outside any request, does.
 *
 * Composes an EventEmitter rather than extending it — extending a built-in
 * Node class here confused Bun's decorator-metadata emission for consumers
 * that inject this class (constructor param resolved to `undefined`).
 */
@Injectable()
export class GameEventsBus {
  private readonly emitter = new EventEmitter()

  emitTurnAutoSkipped(event: TurnAutoSkippedEvent): void {
    this.emitter.emit("turn:auto-skipped", event)
  }

  onTurnAutoSkipped(listener: (event: TurnAutoSkippedEvent) => void): void {
    this.emitter.on("turn:auto-skipped", listener)
  }
}
