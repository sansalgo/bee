import type { SocketAuth } from "@workspace/shared"
import { io, type Socket } from "socket.io-client"

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"

export function createGameSocket(auth: SocketAuth): Socket {
  return io(SOCKET_URL, {
    auth,
    transports: ["websocket"],
  })
}
