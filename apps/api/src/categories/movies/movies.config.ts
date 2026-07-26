import { Injectable } from "@nestjs/common"
import { defaultMoviesConfig, moviesConfigSchema } from "@workspace/shared"
import type { ICategoryConfigSchema, MoviesConfig } from "@workspace/shared"

@Injectable()
export class MoviesConfigSchema implements ICategoryConfigSchema<MoviesConfig> {
  schema = moviesConfigSchema

  defaultConfig(): MoviesConfig {
    return defaultMoviesConfig()
  }
}
