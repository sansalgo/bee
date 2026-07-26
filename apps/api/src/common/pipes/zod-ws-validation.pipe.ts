import { Injectable, PipeTransform } from "@nestjs/common"
import { WsException } from "@nestjs/websockets"
import type { z } from "zod"

@Injectable()
export class ZodWsValidationPipe implements PipeTransform {
  constructor(private readonly schema: z.ZodType) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value)
    if (!result.success) {
      throw new WsException(result.error.issues.map((issue) => issue.message).join("; "))
    }
    return result.data
  }
}
