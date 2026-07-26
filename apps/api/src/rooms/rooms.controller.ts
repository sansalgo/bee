import { Body, Controller, Get, HttpCode, Inject, Param, Post } from "@nestjs/common"
import { createRoomRequestSchema, joinRoomRequestSchema } from "@workspace/shared"
import type { CreateRoomRequest, CreateRoomResponse, JoinRoomRequest, JoinRoomResponse, RoomSummary } from "@workspace/shared"

import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe"
import { RoomsService } from "./rooms.service"

@Controller("rooms")
export class RoomsController {
  constructor(@Inject(RoomsService) private readonly roomsService: RoomsService) {}

  @Post()
  create(@Body(new ZodValidationPipe(createRoomRequestSchema)) body: CreateRoomRequest): Promise<CreateRoomResponse> {
    return this.roomsService.createRoom(body)
  }

  @Get(":code")
  getByCode(@Param("code") code: string): Promise<RoomSummary> {
    return this.roomsService.getRoomByCode(code)
  }

  @Post(":code/join")
  @HttpCode(200)
  join(
    @Param("code") code: string,
    @Body(new ZodValidationPipe(joinRoomRequestSchema)) body: JoinRoomRequest,
  ): Promise<JoinRoomResponse> {
    return this.roomsService.joinRoom(code, body)
  }
}
