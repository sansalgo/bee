import { Injectable, OnModuleDestroy } from "@nestjs/common"

/** One in-process timer per active game (v1, single backend instance). */
@Injectable()
export class TurnTimerService implements OnModuleDestroy {
  private readonly timers = new Map<string, NodeJS.Timeout>()

  schedule(gameId: string, deadline: Date, onTimeout: () => void): void {
    this.clear(gameId)
    const delayMs = Math.max(0, deadline.getTime() - Date.now())
    const handle = setTimeout(() => {
      this.timers.delete(gameId)
      onTimeout()
    }, delayMs)
    this.timers.set(gameId, handle)
  }

  clear(gameId: string): void {
    const handle = this.timers.get(gameId)
    if (handle) {
      clearTimeout(handle)
      this.timers.delete(gameId)
    }
  }

  onModuleDestroy() {
    for (const handle of this.timers.values()) {
      clearTimeout(handle)
    }
    this.timers.clear()
  }
}
