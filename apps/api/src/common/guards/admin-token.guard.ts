import { timingSafeEqual } from "node:crypto"

import { CanActivate, ExecutionContext, Inject, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"
import { ADMIN_TOKEN_HEADER } from "@workspace/shared"

import type { Env } from "../config/env.schema"
import { hashToken } from "../utils/token.util"

/**
 * Gates /admin/* REST routes behind the shared ADMIN_TOKEN secret. When the
 * env var is unset the routes don't exist as far as callers can tell (404),
 * so a deployment without it exposes nothing.
 */
@Injectable()
export class AdminTokenGuard implements CanActivate {
  constructor(@Inject(ConfigService) private readonly config: ConfigService<Env, true>) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.config.get("ADMIN_TOKEN", { infer: true })
    if (!expected) {
      throw new NotFoundException()
    }
    const request = context.switchToHttp().getRequest<{ headers: Record<string, string | string[] | undefined> }>()
    const provided = request.headers[ADMIN_TOKEN_HEADER]
    // Compare fixed-length hashes so timingSafeEqual never sees mismatched lengths.
    if (
      typeof provided !== "string" ||
      !timingSafeEqual(Buffer.from(hashToken(provided)), Buffer.from(hashToken(expected)))
    ) {
      throw new UnauthorizedException("Invalid admin token")
    }
    return true
  }
}
