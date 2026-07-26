import type { INestApplicationContext } from "@nestjs/common"
import { IoAdapter } from "@nestjs/platform-socket.io"
import type { ServerOptions } from "socket.io"

/**
 * Scaffolded for future horizontal scaling (multiple backend instances
 * sharing Socket.IO room/broadcast state via Redis pub/sub) — intentionally
 * NOT wired up in v1, which targets a single backend instance and an
 * in-process GameStateStore/TurnTimerService.
 *
 * To activate later: add `@socket.io/redis-adapter` + a redis client,
 * connect pub/sub clients here, call `server.adapter(createAdapter(pub, sub))`
 * inside `createIOServer`, and switch `main.ts` to
 * `app.useWebSocketAdapter(new RedisIoAdapter(app))` before `app.listen(...)`.
 */
export class RedisIoAdapter extends IoAdapter {
  constructor(app: INestApplicationContext) {
    super(app)
  }

  createIOServer(port: number, options?: ServerOptions) {
    return super.createIOServer(port, options)
  }
}
