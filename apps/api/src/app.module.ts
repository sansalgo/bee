import { Module } from "@nestjs/common"
import { ConfigModule } from "@nestjs/config"

import { CategoriesModule } from "./categories/categories.module"
import { MoviesModule } from "./categories/movies/movies.module"
import { validateEnv } from "./common/config/env.schema"
import { GamesModule } from "./games/games.module"
import { LeaderboardModule } from "./leaderboard/leaderboard.module"
import { PrismaModule } from "./prisma/prisma.module"
import { RoomsModule } from "./rooms/rooms.module"
import { WebsocketModule } from "./websocket/websocket.module"

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    PrismaModule,
    CategoriesModule,
    MoviesModule,
    RoomsModule,
    GamesModule,
    WebsocketModule,
    LeaderboardModule,
  ],
})
export class AppModule {}
