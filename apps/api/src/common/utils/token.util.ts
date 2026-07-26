import { createHash, randomBytes } from "node:crypto"

/** Opaque bearer token minted for a host or player; returned to the client once. */
export function generateToken(): string {
  return randomBytes(32).toString("base64url")
}

/** Only the hash is ever persisted — the raw token lives solely client-side. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}
