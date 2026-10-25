-- CreateEnum
CREATE TYPE "MovieSource" AS ENUM ('SEED', 'TMDB');

-- AlterTable
ALTER TABLE "Movie" ADD COLUMN     "source" "MovieSource" NOT NULL DEFAULT 'SEED',
ADD COLUMN     "tmdbId" INTEGER;

-- CreateTable
CREATE TABLE "MovieAlias" (
    "id" TEXT NOT NULL,
    "movieId" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "normalizedKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovieAlias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovieLookupMiss" (
    "normalizedKey" TEXT NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovieLookupMiss_pkey" PRIMARY KEY ("normalizedKey")
);

-- CreateIndex
CREATE INDEX "MovieAlias_normalizedKey_idx" ON "MovieAlias"("normalizedKey");

-- CreateIndex
CREATE UNIQUE INDEX "MovieAlias_movieId_normalizedKey_key" ON "MovieAlias"("movieId", "normalizedKey");

-- CreateIndex
CREATE UNIQUE INDEX "Movie_tmdbId_key" ON "Movie"("tmdbId");

-- AddForeignKey
ALTER TABLE "MovieAlias" ADD CONSTRAINT "MovieAlias_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

