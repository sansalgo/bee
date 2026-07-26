import { ArgumentsHost, Catch, ExceptionFilter } from "@nestjs/common"
import { WsException } from "@nestjs/websockets"
import type { Socket } from "socket.io"

/**
 * Turns a protocol-level failure (malformed payload, unauthorized action)
 * into a message sent only to the socket that caused it — never broadcast
 * to the rest of the room. Business-logic rejections that aren't really
 * "errors" (e.g. a wrong title guess) are handled by emitting a dedicated
 * event directly from the gateway handler instead of throwing here.
 */
@Catch(WsException, Error)
export class WsExceptionFilter implements ExceptionFilter {
  catch(exception: WsException | Error, host: ArgumentsHost) {
    const client = host.switchToWs().getClient<Socket>()
    const message = exception instanceof WsException ? exception.getError() : exception.message
    client.emit("ws:error", { message })
  }
}
