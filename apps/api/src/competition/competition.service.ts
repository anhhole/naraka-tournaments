import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Competition, Stage, Team, Player, Score } from '@prisma/client';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

interface TeamScore {
  team: Team;
  totalPoints: number;
  totalKills: number;
  matches: number;
}

@Injectable()
export class CompetitionService {
  private readonly logger = new Logger(CompetitionService.name);

  constructor(private prisma: PrismaService) {}

  private formatToUTC7(date: Date): string {
    const bangkokTimeZone = 'Asia/Bangkok';
    const zonedDate = toZonedTime(date, bangkokTimeZone);
    return format(zonedDate, 'yyyy-MM-dd HH:mm:ss');
  }

  async findAll(onlyNbpl: boolean = false): Promise<any> {
    this.logger.log(`Finding all competitions. onlyNbpl: ${onlyNbpl}`);
    
    try {
      // Test database connection
      try {
        await this.prisma.$queryRaw`SELECT 1`;
        this.logger.log('Database connection test successful');
      } catch (dbError) {
        this.logger.error('Database connection test failed:', dbError);
        throw new Error('Database connection failed');
      }

      const whereClause = onlyNbpl ? { type: 0 } : undefined;

      // Log the query we're about to execute
      this.logger.log('Executing Prisma query with params:', {
        where: whereClause,
        orderBy: { startDate: 'desc' }
      });

      const competitions = await this.prisma.competition.findMany({
        where: whereClause,
        orderBy: {
          startDate: 'desc'
        },
        include: {
          stages: true,
          teams: true,
        },
      });

      this.logger.log(`Found ${competitions.length} competitions in database`);
      if (competitions.length === 0) {
        // Try a simpler query to verify table access
        const count = await this.prisma.competition.count();
        this.logger.warn(`No competitions found. Total count in table: ${count}`);
      } else {
        this.logger.log('First competition:', JSON.stringify(competitions[0], null, 2));
      }

      const formattedResponse = {
        data: {
          list: competitions.map(competition => ({
            ...competition,
            startDate: this.formatToUTC7(competition.startDate),
            endDate: this.formatToUTC7(competition.endDate),
            stages: competition.stages.map(stage => ({
              ...stage,
              startDate: this.formatToUTC7(stage.startDate),
              endDate: this.formatToUTC7(stage.endDate),
            })),
          })),
        }
      };

      this.logger.log(`Returning ${formattedResponse.data.list.length} formatted competitions`);
      return formattedResponse;
    } catch (error) {
      this.logger.error('Error finding competitions:', error);
      throw error;
    }
  }

  async findStages(competitionId: string, type: number, rankType: number): Promise<Stage[]> {
    return this.prisma.stage.findMany({
      where: {
        competitionId,
        type,
        rankType,
      },
      include: {
        scores: true,
        heroStats: true,
        weaponStats: true,
      },
    });
  }

  async getStageScores(stageId: string) {
    return this.prisma.score.findMany({
      where: { stageId },
      include: {
        team: true,
        player: true,
      },
    });
  }

  async getTeamRankings(competitionId: string, stageIds: string[]) {
    const scores = await this.prisma.score.findMany({
      where: {
        stageId: { in: stageIds },
      },
      include: {
        team: true,
      },
    });

    // Aggregate team scores
    const teamScores = scores.reduce<Record<string, TeamScore>>((acc, score) => {
      if (!acc[score.teamId]) {
        acc[score.teamId] = {
          team: score.team,
          totalPoints: 0,
          totalKills: 0,
          matches: 0,
        };
      }
      acc[score.teamId].totalPoints += score.points;
      acc[score.teamId].totalKills += score.kills;
      acc[score.teamId].matches += 1;
      return acc;
    }, {});

    // Convert to array and sort by points
    return Object.values(teamScores)
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .map((stats, index) => ({
        ...stats,
        rank: index + 1,
      }));
  }

  async getHeroStats(competitionId: string, stageId: string, modelType: number) {
    return this.prisma.heroStat.findMany({
      where: {
        stage: {
          id: stageId,
          competitionId,
        },
      },
      orderBy: {
        battleAmount: 'desc',
      },
    });
  }

  async getWeaponStats(competitionId: string, stageId: string, modelType: number) {
    return this.prisma.weaponStat.findMany({
      where: {
        stage: {
          id: stageId,
          competitionId,
        },
      },
      orderBy: {
        pickRate: 'desc',
      },
    });
  }
} 