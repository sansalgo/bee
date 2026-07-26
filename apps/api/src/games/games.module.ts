import { Module } from "@nestjs/common"

import { CategoriesModule } from "../categories/categories.module"
import { GameStateStore } from "./engine/game-state.store"
import { TurnTimerService } from "./engine/turn-timer.service"
import { GameEventsBus } from "./game-events.bus"
import { GamesService } from "./games.service"

@Module({
  imports: [CategoriesModule],
  providers: [GamesService, GameStateStore, TurnTimerService, GameEventsBus],
  exports: [GamesService, GameEventsBus],
})
export class GamesModule {}
