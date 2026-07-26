import { PrismaClient } from "@prisma/client"

import { movieFixtures } from "../src/categories/movies/fixtures/movies.fixture"
import { normalizeMovieTitle } from "../src/categories/movies/movies.normalize"

const prisma = new PrismaClient()

async function main() {
  for (const movie of movieFixtures) {
    const normalizedKey = normalizeMovieTitle(movie.title)
    await prisma.movie.upsert({
      where: { normalizedKey_releaseYear: { normalizedKey, releaseYear: movie.releaseYear } },
      update: { title: movie.title, isFixture: true },
      create: { title: movie.title, releaseYear: movie.releaseYear, normalizedKey, isFixture: true },
    })
  }
  console.log(`Seeded ${movieFixtures.length} fixture movies.`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
