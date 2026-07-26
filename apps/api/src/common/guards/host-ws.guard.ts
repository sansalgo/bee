import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common"
import { WsException } from "@nestjs/websockets"
import type { Socket } from "socket.io"

/**
 * Restricts a gateway handler (e.g. game:start, game:end) to the socket
 * that authenticated as the room's host. Regular player identity doesn't
 * need its own guard beyond this: `ws-auth.middleware.ts` already refuses
 * the connection entirely for an invalid/missing token, so any socket that
 * reaches a handler is already a known host or player — per-action "is it
 * this player's turn" checks belong to the game engine, not a static guard.
 */
@Injectable()
export class HostWsGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const client = context.switchToWs().getClient<Socket>()
    if (!client.data?.isHost) {
      throw new WsException("Only the host may perform this action")
    }
    return true
  }
}
