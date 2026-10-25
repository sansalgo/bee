import { Inject, Module, OnModuleInit } from "@nestjs/common"
import { ConfigService } from "@nestjs/config"

import type { Env } from "../../common/config/env.schema"
import { CategoriesModule } from "../categories.module"
import { CategoriesService } from "../categories.service"
import { MoviesAdminController } from "./movies-admin.controller"
import { MoviesConfigSchema } from "./movies.config"
import { MoviesLookupService } from "./movies.lookup"
import { MoviesPlugin } from "./movies.plugin"
import { MoviesProvider } from "./movies.provider"
import { MoviesScoring } from "./movies.scoring"
import { MoviesValidator } from "./movies.validator"
import { TmdbClient } from "./tmdb.client"

@Module({
  imports: [CategoriesModule],
  controllers: [MoviesAdminController],
  providers: [
    {
      provide: TmdbClient,
      useFactory: (config: ConfigService<Env, true>) => new TmdbClient(config.get("TMDB_API_TOKEN", { infer: true })),
      inject: [ConfigService],
    },
    MoviesLookupService,
    MoviesProvider,
    MoviesValidator,
    MoviesScoring,
    MoviesConfigSchema,
    MoviesPlugin,
  ],
  exports: [MoviesProvider],
})
export class MoviesModule implements OnModuleInit {
  constructor(
    @Inject(CategoriesService) private readonly categoriesService: CategoriesService,
    @Inject(MoviesPlugin) private readonly moviesPlugin: MoviesPlugin,
  ) {}

  onModuleInit() {
    this.categoriesService.register(this.moviesPlugin)
  }
}
