import { Injectable } from "@nestjs/common"
import type { ICategoryValidator } from "@workspace/shared"

import { normalizeMovieTitle } from "./movies.normalize"

@Injectable()
export class MoviesValidator implements ICategoryValidator {
  normalize(chars: string[]): string {
    return normalizeMovieTitle(chars.join(""))
  }
}
