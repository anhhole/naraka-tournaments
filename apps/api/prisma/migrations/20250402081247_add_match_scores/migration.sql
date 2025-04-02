/*
  Warnings:

  - You are about to alter the column `points` on the `scores` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.

*/
-- DropIndex
DROP INDEX "scores_stageId_teamId_key";

-- AlterTable
ALTER TABLE "scores" ALTER COLUMN "points" SET DEFAULT 0,
ALTER COLUMN "points" SET DATA TYPE INTEGER,
ALTER COLUMN "matchScores" DROP NOT NULL,
ALTER COLUMN "matchScores" DROP DEFAULT;
