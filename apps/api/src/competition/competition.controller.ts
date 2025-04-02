import { Controller, Get, Query } from '@nestjs/common';
import { CompetitionService } from './competition.service';
import { ApiTags, ApiQuery } from '@nestjs/swagger';

@ApiTags('competitions')
@Controller('competition')
export class CompetitionController {
  constructor(private readonly competitionService: CompetitionService) {}

  @Get('list')
  @ApiQuery({ name: 'only_nbpl', required: false, type: Boolean })
  async getCompetitions(@Query('only_nbpl') onlyNbpl: string = 'false') {
    // Convert string to boolean
    const isNbpl = onlyNbpl === 'true';
    return this.competitionService.findAll(isNbpl);
  }

  @Get('stage/list')
  @ApiQuery({ name: 'competition_uuid', required: true })
  @ApiQuery({ name: 'type', required: true, type: Number })
  @ApiQuery({ name: 'rank_type', required: true, type: Number })
  async getStages(
    @Query('competition_uuid') competitionId: string,
    @Query('type') type: string,
    @Query('rank_type') rankType: string,
  ) {
    // Convert string parameters to integers
    const typeInt = parseInt(type, 10);
    const rankTypeInt = parseInt(rankType, 10);
    return this.competitionService.findStages(competitionId, typeInt, rankTypeInt);
  }

  @Get('rank/score')
  @ApiQuery({ name: 'stage_uuid', required: true })
  async getStageScores(@Query('stage_uuid') stageId: string) {
    return this.competitionService.getStageScores(stageId);
  }

  @Get('rank/team/data')
  @ApiQuery({ name: 'competition_uuid', required: true })
  @ApiQuery({ name: 'stage_uuid', required: true })
  async getTeamRankings(
    @Query('competition_uuid') competitionId: string,
    @Query('stage_uuid') stageUuid: string,
  ) {
    const stageIds = stageUuid.split(',');
    return this.competitionService.getTeamRankings(competitionId, stageIds);
  }

  @Get('rank/hero')
  @ApiQuery({ name: 'competition_uuid', required: true })
  @ApiQuery({ name: 'stage_uuid', required: true })
  @ApiQuery({ name: 'model_type', required: true, type: Number })
  async getHeroStats(
    @Query('competition_uuid') competitionId: string,
    @Query('stage_uuid') stageId: string,
    @Query('model_type') modelType: number,
  ) {
    return this.competitionService.getHeroStats(competitionId, stageId, modelType);
  }

  @Get('rank/weapon')
  @ApiQuery({ name: 'competition_uuid', required: true })
  @ApiQuery({ name: 'stage_uuid', required: true })
  @ApiQuery({ name: 'model_type', required: true, type: Number })
  async getWeaponStats(
    @Query('competition_uuid') competitionId: string,
    @Query('stage_uuid') stageId: string,
    @Query('model_type') modelType: number,
  ) {
    return this.competitionService.getWeaponStats(competitionId, stageId, modelType);
  }
} 