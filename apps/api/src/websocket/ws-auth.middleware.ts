import { socketAuthSchema } from "@workspace/shared"
import type { Socket } from "socket.io"

import { hashToken } from "../common/utils/token.util"
import type { PrismaService } from "../prisma/prisma.service"

/**
 * Runs once per Socket.IO connection attempt (registered via `server.use`
 * in the gateway's `afterInit`). Resolves the opaque bearer token from
 * `socket.handshake.auth` to a real host or player identity and attaches it
 * to `socket.data` — every gateway handler trusts only `socket.data`, never
 * a client-supplied id in a message payload. Rejects the connection
 * entirely on any mismatch, so a handler is only ever reached by an
 * already-authenticated socket.
 *
 * Clients only ever know a room's public `code` (from the Create/Join
 * responses), never the internal DB id, so auth is keyed by `code` — the
 * resolved internal `game.id` is then stored in `socket.data.gameId` for
 * the rest of the backend (which indexes everything by id) to use.
 */
export function createWsAuthMiddleware(prisma: PrismaService) {
  return async (socket: Socket, next: (err?: Error) => void) => {
    const parsed = socketAuthSchema.safeParse(socket.handshake.auth)
    if (!parsed.success) {
      next(new Error("Invalid authentication payload"))
      return
    }
    const { code, role, token } = parsed.data
    const game = await prisma.game.findUnique({ where: { code } })
    if (!game) {
      next(new Error("Game not found"))
      return
    }
    const tokenHash = hashToken(token)

    if (role === "host") {
      if (game.hostTokenHash !== tokenHash) {
        next(new Error("Invalid host token"))
        return
      }
      socket.data.gameId = game.id
      socket.data.isHost = true
      socket.data.playerId = undefined
      next()
      return
    }

    const player = await prisma.player.findFirst({ where: { gameId: game.id, playerTokenHash: tokenHash } })
    if (!player) {
      next(new Error("Invalid player token"))
      return
    }
    socket.data.gameId = game.id
    socket.data.isHost = player.isHost
    socket.data.playerId = player.id
    next()
  }
}
