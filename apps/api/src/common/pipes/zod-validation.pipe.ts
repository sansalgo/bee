import { BadRequestException, Injectable, PipeTransform } from "@nestjs/common"
import type { z } from "zod"

/**
 * Validates a REST request param/body against a shared Zod schema. Applied
 * per-parameter (e.g. `@Body(new ZodValidationPipe(schema))`) rather than
 * via a nestjs-zod-style DTO class, since nestjs-zod's `createZodDto` is
 * built against zod v3's generic shape and loses type inference entirely
 * under zod v4 (used everywhere else in this repo) — this hand-rolled pipe
 * has no such dependency and works with any zod version.
 */
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: z.ZodType) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value)
    if (!result.success) {
      throw new BadRequestException(result.error.issues.map((issue) => issue.message).join("; "))
    }
    return result.data
  }
}
