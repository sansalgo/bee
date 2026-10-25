import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  NotFoundException,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common"
import type { Prisma } from "@prisma/client"
import { addMovieAliasRequestSchema, adminMovieListQuerySchema } from "@workspace/shared"
import type { AddMovieAliasRequest, AdminMovie, AdminMovieListQuery, AdminMovieListResponse } from "@workspace/shared"

import { AdminTokenGuard } from "../../common/guards/admin-token.guard"
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe"
import { PrismaService } from "../../prisma/prisma.service"
import { normalizeMovieTitle } from "./movies.normalize"
import { addMovieAliases } from "./movies.persist"

const PAGE_SIZE = 50

const withAliases = { aliases: { orderBy: { alias: "asc" } } } satisfies Prisma.MovieInclude
type MovieWithAliases = Prisma.MovieGetPayload<{ include: typeof withAliases }>

function toAdminMovie(movie: MovieWithAliases): AdminMovie {
  return {
    id: movie.id,
    title: movie.title,
    releaseYear: movie.releaseYear,
    tmdbId: movie.tmdbId,
    source: movie.source,
    createdAt: movie.createdAt.toISOString(),
    aliases: movie.aliases.map((alias) => ({ id: alias.id, alias: alias.alias })),
  }
}

/**
 * Review tools for the movie catalog — mainly for movies the TMDB lookup
 * added on its own, so a bad match or alias can be removed. Deleting a movie
 * leaves past Finds intact: they keep their own matchedText.
 */
@Controller("admin/movies")
@UseGuards(AdminTokenGuard)
export class MoviesAdminController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Get()
  async list(@Query(new ZodValidationPipe(adminMovieListQuerySchema)) query: AdminMovieListQuery): Promise<AdminMovieListResponse> {
    const rows = await this.prisma.movie.findMany({
      where: {
        ...(query.source && { source: query.source }),
        ...(query.q && {
          OR: [
            { title: { contains: query.q, mode: "insensitive" } },
            { aliases: { some: { alias: { contains: query.q, mode: "insensitive" } } } },
          ],
        }),
      },
      include: withAliases,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: PAGE_SIZE + 1,
      ...(query.cursor && { cursor: { id: query.cursor }, skip: 1 }),
    })
    const page = rows.slice(0, PAGE_SIZE)
    return {
      movies: page.map(toAdminMovie),
      nextCursor: rows.length > PAGE_SIZE ? page[page.length - 1]!.id : null,
    }
  }

  @Delete("aliases/:aliasId")
  @HttpCode(204)
  async removeAlias(@Param("aliasId") aliasId: string): Promise<void> {
    const { count } = await this.prisma.movieAlias.deleteMany({ where: { id: aliasId } })
    if (count === 0) throw new NotFoundException("Alias not found")
  }

  @Delete(":id")
  @HttpCode(204)
  async remove(@Param("id") id: string): Promise<void> {
    const { count } = await this.prisma.movie.deleteMany({ where: { id } })
    if (count === 0) throw new NotFoundException("Movie not found")
  }

  @Post(":id/aliases")
  async addAlias(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(addMovieAliasRequestSchema)) body: AddMovieAliasRequest,
  ): Promise<AdminMovie> {
    const movie = await this.prisma.movie.findUnique({ where: { id } })
    if (!movie) throw new NotFoundException("Movie not found")
    if (normalizeMovieTitle(body.alias).length === 0) {
      throw new BadRequestException("Alias must contain at least one letter or digit")
    }
    await addMovieAliases(this.prisma, movie, [body.alias])
    return toAdminMovie(await this.prisma.movie.findUniqueOrThrow({ where: { id }, include: withAliases }))
  }
}
