import { PrismaClient } from "@prisma/client"

import { movieFixtures } from "../src/categories/movies/fixtures/movies.fixture"
import { upsertMovieWithAliases } from "../src/categories/movies/movies.persist"

const prisma = new PrismaClient()

async function main() {
  for (const movie of movieFixtures) {
    await upsertMovieWithAliases(prisma, { title: movie.title, releaseYear: movie.releaseYear, isFixture: true })
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
