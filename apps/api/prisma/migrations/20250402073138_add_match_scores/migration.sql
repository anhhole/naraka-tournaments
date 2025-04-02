/*
  Warnings:

  - A unique constraint covering the columns `[stageId,teamId]` on the table `scores` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "scores" DROP CONSTRAINT IF EXISTS "scores_playerId_fkey";

-- AlterTable
ALTER TABLE "scores" 
ADD COLUMN IF NOT EXISTS "matchScores" TEXT NOT NULL DEFAULT '[]',
ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "points" SET DEFAULT 0,
ALTER COLUMN "points" SET DATA TYPE DOUBLE PRECISION;

-- Update existing NULL playerId values
UPDATE "scores" s
SET "playerId" = (
  SELECT p.id 
  FROM "players" p 
  WHERE p."teamId" = s."teamId" 
  LIMIT 1
)
WHERE s."playerId" IS NULL;

-- Set a default player if no matching player found
WITH default_player AS (
  INSERT INTO "players" ("id", "name", "teamId", "competitionId", "createdAt", "updatedAt")
  SELECT 
    'default-player-' || t."id",
    'Default Player',
    t."id",
    t."competitionId",
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  FROM "teams" t
  WHERE NOT EXISTS (
    SELECT 1 
    FROM "players" p 
    WHERE p."teamId" = t."id"
  )
  RETURNING id, "teamId"
)
UPDATE "scores" s
SET "playerId" = dp.id
FROM default_player dp
WHERE s."playerId" IS NULL
AND s."teamId" = dp."teamId";

-- Now make playerId NOT NULL
ALTER TABLE "scores" ALTER COLUMN "playerId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "scores_stageId_teamId_key" ON "scores"("stageId", "teamId");

-- AddForeignKey
ALTER TABLE "scores" ADD CONSTRAINT "scores_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
