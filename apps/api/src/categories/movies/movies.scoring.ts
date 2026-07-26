import { Injectable } from "@nestjs/common"
import type { CategoryMatchResult, IScoringStrategy, MoviesConfig } from "@workspace/shared"

/** v1 default: 1 point per tile consumed (IRON MAN = 7 tiles = 7 points). */
@Injectable()
export class MoviesScoring implements IScoringStrategy<MoviesConfig> {
  score(args: { tiles: { character: string }[]; match: CategoryMatchResult; config: MoviesConfig }): number {
    return args.tiles.length
  }
}
