import { Inject, Injectable, NotFoundException } from "@nestjs/common"
import type { PlayerSummary } from "@workspace/shared"

import { toPlayerSummary } from "../common/utils/player-summary.util"
import { PrismaService } from "../prisma/prisma.service"

@Injectable()
export class LeaderboardService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getStandings(code: string): Promise<PlayerSummary[]> {
    const game = await this.prisma.game.findUnique({ where: { code } })
    if (!game) {
      throw new NotFoundException("Game not found")
    }
    const players = await this.prisma.player.findMany({
      where: { gameId: game.id },
      orderBy: [{ score: "desc" }, { joinOrder: "asc" }],
    })
    return players.map(toPlayerSummary)
  }
}
