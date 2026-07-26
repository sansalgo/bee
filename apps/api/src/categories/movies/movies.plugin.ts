import { Inject, Injectable } from "@nestjs/common"
import { DuplicatePolicy } from "@workspace/shared"
import type { ICategoryPlugin, MoviesConfig } from "@workspace/shared"

import { MoviesConfigSchema } from "./movies.config"
import { MoviesProvider } from "./movies.provider"
import { MoviesScoring } from "./movies.scoring"
import { MoviesValidator } from "./movies.validator"

@Injectable()
export class MoviesPlugin implements ICategoryPlugin<MoviesConfig> {
  readonly key = "movies"
  readonly label = "Movies"

  constructor(
    @Inject(MoviesValidator) readonly validator: MoviesValidator,
    @Inject(MoviesProvider) readonly dataProvider: MoviesProvider,
    @Inject(MoviesScoring) readonly scoring: MoviesScoring,
    @Inject(MoviesConfigSchema) readonly configSchema: MoviesConfigSchema,
  ) {}

  isAlreadyFound(args: {
    itemId: string
    duplicatePolicy: DuplicatePolicy
    priorFinds: { itemId: string }[]
  }): boolean {
    if (args.duplicatePolicy === DuplicatePolicy.UNLIMITED) {
      return false
    }
    return args.priorFinds.some((find) => find.itemId === args.itemId)
  }
}
