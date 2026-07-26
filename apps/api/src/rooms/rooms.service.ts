import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common"
import { GameStatus as PrismaGameStatus, type Prisma } from "@prisma/client"
import { MAX_PLAYERS } from "@workspace/shared"
import type { CreateRoomRequest, CreateRoomResponse, JoinRoomRequest, JoinRoomResponse, RoomSummary } from "@workspace/shared"

import { CategoriesService } from "../categories/categories.service"
import { generateRoomCode } from "../common/utils/room-code.util"
import { generateToken, hashToken } from "../common/utils/token.util"
import { PrismaService } from "../prisma/prisma.service"

@Injectable()
export class RoomsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(CategoriesService) private readonly categoriesService: CategoriesService,
  ) {}

  async createRoom(request: CreateRoomRequest): Promise<CreateRoomResponse> {
    // Throws NotFoundException if categoryKey isn't a registered plugin.
    this.categoriesService.get(request.categoryKey)

    const hostToken = generateToken()
    const code = await this.generateUniqueRoomCode()

    const game = await this.prisma.game.create({
      data: {
        code,
        categoryKey: request.categoryKey,
        config: request.config as unknown as Prisma.InputJsonValue,
        hostTokenHash: hashToken(hostToken),
      },
    })

    let playerId: string | undefined
    let playerToken: string | undefined
    if (request.config.hostPlaysToo && request.hostNickname) {
      playerToken = generateToken()
      const player = await this.prisma.player.create({
        data: {
          gameId: game.id,
          nickname: request.hostNickname,
          playerTokenHash: hashToken(playerToken),
          isHost: true,
          joinOrder: 0,
        },
      })
      playerId = player.id
    }

    return { gameId: game.id, code: game.code, hostToken, playerId, playerToken }
  }

  async getRoomByCode(code: string): Promise<RoomSummary> {
    const game = await this.prisma.game.findUnique({ where: { code } })
    if (!game) {
      throw new NotFoundException("Room not found")
    }
    return { code: game.code, status: game.status, categoryKey: game.categoryKey }
  }

  async joinRoom(code: string, request: JoinRoomRequest): Promise<JoinRoomResponse> {
    const game = await this.prisma.game.findUnique({ where: { code }, include: { players: true } })
    if (!game) {
      throw new NotFoundException("Room not found")
    }
    if (game.status !== PrismaGameStatus.LOBBY) {
      throw new BadRequestException("Game has already started")
    }
    if (game.players.length >= MAX_PLAYERS) {
      throw new BadRequestException("Room is full")
    }
    const nicknameTaken = game.players.some((player) => player.nickname.toLowerCase() === request.nickname.toLowerCase())
    if (nicknameTaken) {
      throw new ConflictException("Nickname already taken in this room")
    }

    const playerToken = generateToken()
    const player = await this.prisma.player.create({
      data: {
        gameId: game.id,
        nickname: request.nickname,
        playerTokenHash: hashToken(playerToken),
        joinOrder: game.players.length,
      },
    })

    return { playerId: player.id, playerToken }
  }

  private async generateUniqueRoomCode(): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt++) {
      const code = generateRoomCode()
      const existing = await this.prisma.game.findUnique({ where: { code } })
      if (!existing) {
        return code
      }
    }
    throw new Error("Failed to generate a unique room code")
  }
}
