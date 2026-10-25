import { Inject, Injectable } from "@nestjs/common"
import type { CategoryMatchResult, ICategoryDataProvider } from "@workspace/shared"

import { PrismaService } from "../../prisma/prisma.service"
import { MoviesLookupService } from "./movies.lookup"

@Injectable()
export class MoviesProvider implements ICategoryDataProvider {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(MoviesLookupService) private readonly lookup: MoviesLookupService,
  ) {}

  /**
   * Matches a movie's canonical title or any of its aliases, falling back to
   * an on-demand TMDB lookup when nothing is stored yet. matchedText is always
   * the canonical title, so "AVENGERS" is recorded as "The Avengers".
   */
  async findByNormalizedKey(key: string): Promise<CategoryMatchResult[]> {
    const local = await this.findStored(key)
    if (local.length > 0 || !this.lookup.enabled) return local
    return (await this.lookup.resolve(key)) ? this.findStored(key) : []
  }

  async countAll(): Promise<number> {
    return this.prisma.movie.count()
  }

  private async findStored(key: string): Promise<CategoryMatchResult[]> {
    const rows = await this.prisma.movie.findMany({
      where: { OR: [{ normalizedKey: key }, { aliases: { some: { normalizedKey: key } } }] },
    })
    return rows.map((row) => ({
      itemId: row.id,
      matchedText: row.title,
      raw: { title: row.title, releaseYear: row.releaseYear },
    }))
  }
}
