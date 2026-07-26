-- CreateEnum
CREATE TYPE "GameStatus" AS ENUM ('LOBBY', 'IN_PROGRESS', 'FINISHED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "TurnOutcome" AS ENUM ('PLACE', 'FIND', 'SKIPPED_TIMEOUT', 'SKIPPED_DISCONNECTED');

-- CreateTable
CREATE TABLE "Game" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "GameStatus" NOT NULL DEFAULT 'LOBBY',
    "categoryKey" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "hostTokenHash" TEXT NOT NULL,
    "currentRoundIdx" INTEGER NOT NULL DEFAULT 0,
    "currentTurnPlayerId" TEXT,
    "turnStartedAt" TIMESTAMP(3),
    "turnDeadline" TIMESTAMP(3),
    "gameEndsAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "playerTokenHash" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "isHost" BOOLEAN NOT NULL DEFAULT false,
    "joinOrder" INTEGER NOT NULL,
    "isConnected" BOOLEAN NOT NULL DEFAULT true,
    "isReady" BOOLEAN NOT NULL DEFAULT false,
    "disconnectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoardTile" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "character" CHAR(1) NOT NULL,
    "placedByPlayerId" TEXT NOT NULL,
    "placedAtTurnId" TEXT NOT NULL,
    "sequenceNo" INTEGER NOT NULL,
    "consumedByFindId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BoardTile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Turn" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "roundIdx" INTEGER NOT NULL,
    "turnIdx" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deadline" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "outcome" "TurnOutcome",

    CONSTRAINT "Turn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Find" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "turnId" TEXT NOT NULL,
    "categoryKey" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "matchedText" TEXT NOT NULL,
    "pointsAwarded" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Find_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Movie" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "releaseYear" INTEGER NOT NULL,
    "normalizedKey" TEXT NOT NULL,
    "isFixture" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Movie_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Game_code_key" ON "Game"("code");

-- CreateIndex
CREATE INDEX "Game_status_idx" ON "Game"("status");

-- CreateIndex
CREATE INDEX "Player_gameId_idx" ON "Player"("gameId");

-- CreateIndex
CREATE UNIQUE INDEX "Player_gameId_nickname_key" ON "Player"("gameId", "nickname");

-- CreateIndex
CREATE UNIQUE INDEX "BoardTile_consumedByFindId_key" ON "BoardTile"("consumedByFindId");

-- CreateIndex
CREATE INDEX "BoardTile_gameId_consumedByFindId_idx" ON "BoardTile"("gameId", "consumedByFindId");

-- CreateIndex
CREATE INDEX "Turn_gameId_roundIdx_idx" ON "Turn"("gameId", "roundIdx");

-- CreateIndex
CREATE UNIQUE INDEX "Find_turnId_key" ON "Find"("turnId");

-- CreateIndex
CREATE INDEX "Find_gameId_categoryKey_itemId_idx" ON "Find"("gameId", "categoryKey", "itemId");

-- CreateIndex
CREATE INDEX "Movie_normalizedKey_idx" ON "Movie"("normalizedKey");

-- CreateIndex
CREATE UNIQUE INDEX "Movie_normalizedKey_releaseYear_key" ON "Movie"("normalizedKey", "releaseYear");

-- AddForeignKey
ALTER TABLE "Player" ADD CONSTRAINT "Player_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardTile" ADD CONSTRAINT "BoardTile_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardTile" ADD CONSTRAINT "BoardTile_placedByPlayerId_fkey" FOREIGN KEY ("placedByPlayerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardTile" ADD CONSTRAINT "BoardTile_placedAtTurnId_fkey" FOREIGN KEY ("placedAtTurnId") REFERENCES "Turn"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardTile" ADD CONSTRAINT "BoardTile_consumedByFindId_fkey" FOREIGN KEY ("consumedByFindId") REFERENCES "Find"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Turn" ADD CONSTRAINT "Turn_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Turn" ADD CONSTRAINT "Turn_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Find" ADD CONSTRAINT "Find_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Find" ADD CONSTRAINT "Find_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Find" ADD CONSTRAINT "Find_turnId_fkey" FOREIGN KEY ("turnId") REFERENCES "Turn"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
