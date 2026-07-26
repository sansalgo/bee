import { Inject, Module, OnModuleInit } from "@nestjs/common"

import { CategoriesModule } from "../categories.module"
import { CategoriesService } from "../categories.service"
import { MoviesConfigSchema } from "./movies.config"
import { MoviesPlugin } from "./movies.plugin"
import { MoviesProvider } from "./movies.provider"
import { MoviesScoring } from "./movies.scoring"
import { MoviesValidator } from "./movies.validator"

@Module({
  imports: [CategoriesModule],
  providers: [MoviesProvider, MoviesValidator, MoviesScoring, MoviesConfigSchema, MoviesPlugin],
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
