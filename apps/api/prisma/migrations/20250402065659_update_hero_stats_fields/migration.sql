/*
  Warnings:

  - You are about to drop the column `pickRate` on the `hero_stats` table. All the data in the column will be lost.
  - You are about to drop the column `winRate` on the `hero_stats` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "hero_stats" DROP COLUMN "pickRate",
DROP COLUMN "winRate",
ADD COLUMN     "assistAvg" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "battleAmount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "cureAvg" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "damageAvg" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "deathAvg" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "heroImage" TEXT,
ADD COLUMN     "killTimesAvg" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "rank" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "rescueTimesAvg" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "scoreTop1BattleAmount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "scoreTop1Rate" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "totalLiveTimeAvg" DOUBLE PRECISION NOT NULL DEFAULT 0;
