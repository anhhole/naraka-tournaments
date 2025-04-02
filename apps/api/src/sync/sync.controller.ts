import { Controller, Post, Param, Body, Logger, Get } from '@nestjs/common';
import { SyncService } from './sync.service';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { SyncResponse } from './types';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Sync')
@Controller('sync')
export class SyncController {
  private readonly logger = new Logger(SyncController.name);

  constructor(
    private readonly syncService: SyncService,
    private readonly prisma: PrismaService
  ) {}

  @Post('competitions')
  @ApiOperation({ summary: 'Sync all competitions' })
  async syncCompetitions() {
    this.logger.log('Received request to sync all competitions');
    try {
      const result = await this.syncService.syncCompetitions();
      return result;
    } catch (error) {
      this.logger.error('Error syncing competitions:', error);
      return {
        success: false,
        message: 'Failed to sync competitions',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  @Post('competitions/:id')
  @ApiOperation({ summary: 'Sync single competition with all related data' })
  async syncSingleCompetition(
    @Param('id') competitionId: string,
    @Body() body: { competition_name: string }
  ) {
    this.logger.log(`Received request to sync competition ${competitionId} with name ${body.competition_name}`);
    
    try {
      // First sync the competition itself
      const compResult = await this.syncService.syncSingleCompetition({
        competition_uuid: competitionId,
        competition_name: body.competition_name,
        type: 0,
        start_time: new Date(),
        end_time: new Date()
      });

      if (!compResult.success) {
        return compResult;
      }

      // Then sync stages
      const stagesResult = await this.syncService.syncStages(competitionId);
      
      // Sync teams and players
      const teamsResult = await this.syncService.syncTeamsAndPlayers(competitionId);

      // Get all stages to sync their scores and stats
      const stages = await this.syncService.getStagesForCompetition(competitionId);

      // Sync scores and stats for each stage
      for (const stage of stages) {
        await this.syncService.syncScores(stage.id);
        await this.syncService.syncHeroStats(competitionId, stage.id);
        await this.syncService.syncWeaponStats(competitionId, stage.id);
      }

      return {
        success: true,
        message: `Successfully synced competition ${body.competition_name} with all related data`,
        details: {
          competition: compResult,
          stages: stagesResult,
          teams: teamsResult
        }
      };
    } catch (error) {
      this.logger.error(`Error syncing competition ${competitionId}:`, error);
      return {
        success: false,
        message: 'Failed to sync competition',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  @Post('competitions/:competitionId/stages')
  @ApiOperation({ summary: 'Sync stages for a competition' })
  @ApiParam({ name: 'competitionId', required: true })
  async syncStages(@Param('competitionId') competitionId: string) {
    this.logger.log(`Syncing stages for competition ${competitionId}`);
    return this.syncService.syncStages(competitionId);
  }

  @Post('competitions/:competitionId/teams')
  @ApiOperation({ summary: 'Sync teams for a competition' })
  @ApiParam({ name: 'competitionId', required: true })
  async syncTeams(@Param('competitionId') competitionId: string) {
    this.logger.log(`Syncing teams for competition ${competitionId}`);
    return this.syncService.syncTeamsAndPlayers(competitionId);
  }

  @Post('stages/:stageId/scores')
  @ApiOperation({ summary: 'Sync scores for a stage' })
  @ApiParam({ name: 'stageId', required: true })
  async syncStageScores(@Param('stageId') stageId: string) {
    this.logger.log(`Syncing scores for stage ${stageId}`);
    return this.syncService.syncScores(stageId);
  }

  @Post('stages/:id/stats')
  @ApiOperation({ summary: 'Sync hero and weapon stats for a stage' })
  @ApiParam({ name: 'id', description: 'Stage ID' })
  async syncStats(
    @Param('id') stageId: string,
    @Body('competitionId') competitionId: string
  ): Promise<SyncResponse> {
    this.logger.log(`Received request to sync stats for stage ${stageId} in competition ${competitionId}`);
    
    // First sync scores
    const scoresResult = await this.syncService.syncScores(stageId);
    if (!scoresResult.success) {
      this.logger.error('Failed to sync scores, skipping stats sync:', scoresResult.message);
      return scoresResult;
    }

    // Then sync hero stats
    const heroStats = await this.syncService.syncHeroStats(competitionId, stageId);
    if (!heroStats.success) {
      this.logger.error('Failed to sync hero stats, skipping weapon stats:', heroStats.message);
      return heroStats;
    }

    // Finally sync weapon stats
    return this.syncService.syncWeaponStats(competitionId, stageId);
  }

  @Get('competitions')
  @ApiOperation({ summary: 'Get all competitions' })
  async getCompetitions() {
    try {
      const competitions = await this.prisma.competition.findMany({
        orderBy: { startDate: 'desc' }
      });
      return competitions;
    } catch (error) {
      this.logger.error('Error fetching competitions:', error);
      throw error;
    }
  }

  @Get('test-db')
  async testDatabaseConnection() {
    try {
      const competitions = await this.prisma.competition.findMany({
        orderBy: { startDate: 'desc' },
        take: 5
      });

      const stages = await this.prisma.stage.findMany({
        take: 5
      });

      const teams = await this.prisma.team.findMany({
        take: 5
      });

      const scores = await this.prisma.score.findMany({
        take: 5
      });

      return {
        success: true,
        data: {
          competitions: competitions.map(c => ({ id: c.id, name: c.name, startDate: c.startDate })),
          stages: stages.map(s => ({ id: s.id, name: s.name, competitionId: s.competitionId })),
          teams: teams.map(t => ({ id: t.id, name: t.name, competitionId: t.competitionId })),
          scores: scores.map(s => ({ id: s.id, points: s.points, teamId: s.teamId }))
        }
      };
    } catch (error) {
      this.logger.error('Database test failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
} 