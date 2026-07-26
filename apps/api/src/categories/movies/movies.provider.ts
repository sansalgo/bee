import { Inject, Injectable } from "@nestjs/common"
import type { CategoryMatchResult, ICategoryDataProvider } from "@workspace/shared"

import { PrismaService } from "../../prisma/prisma.service"

@Injectable()
export class MoviesProvider implements ICategoryDataProvider {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findByNormalizedKey(key: string): Promise<CategoryMatchResult[]> {
    const rows = await this.prisma.movie.findMany({ where: { normalizedKey: key } })
    return rows.map((row) => ({
      itemId: row.id,
      matchedText: row.title,
      raw: { title: row.title, releaseYear: row.releaseYear },
    }))
  }

  async countAll(): Promise<number> {
    return this.prisma.movie.count()
  }
}
