import { Module } from "@nestjs/common"

import { GamesModule } from "../games/games.module"
import { GameGateway } from "./game.gateway"

@Module({
  imports: [GamesModule],
  providers: [GameGateway],
})
export class WebsocketModule {}
