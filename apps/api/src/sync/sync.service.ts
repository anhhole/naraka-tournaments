import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios, { AxiosInstance } from 'axios';
import { SyncResponse } from './types';
import { v4 as uuidv4 } from 'uuid';
import { Stage, Score, Prisma } from '@prisma/client';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);
  private readonly baseUrl = 'https://api.yjwujian.cn/yjwj/competition-center-server';
  private readonly apiClient: AxiosInstance;

  constructor(private readonly prisma: PrismaService) {
    this.apiClient = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Accept': '*/*',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Host': 'api.yjwujian.cn',
        'User-Agent': 'PostmanRuntime/7.36.0',
        'Cache-Control': 'no-cache',
        'Postman-Token': Date.now().toString()
      }
    });

    // Add request interceptor for logging
    this.apiClient.interceptors.request.use(
      (config) => {
        this.logger.log('API Request:', {
          method: config.method?.toUpperCase(),
          url: config.url,
          baseURL: config.baseURL,
          params: config.params,
          headers: config.headers,
          data: config.data
        });
        return config;
      },
      (error) => {
        this.logger.error('API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for logging
    this.apiClient.interceptors.response.use(
      (response) => {
        this.logger.log('API Response:', {
          url: response.config.url,
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          data: response.data
        });
        return response;
      },
      (error) => {
        this.logger.error('API Error:', {
          url: error.config?.url,
          status: error.response?.status,
          statusText: error.response?.statusText,
          headers: error.response?.headers,
          data: error.response?.data,
          message: error.message
        });
        return Promise.reject(error);
      }
    );
  }

  async syncSingleCompetition(comp: any): Promise<SyncResponse> {
    try {
      this.logger.log('Attempting to sync competition:', comp);

      // Validate required fields
      if (!comp.competition_uuid || !comp.competition_name) {
        const error = `Missing required fields: ${!comp.competition_uuid ? 'competition_uuid ' : ''}${!comp.competition_name ? 'competition_name' : ''}`;
        this.logger.warn(`Skipping invalid competition data: ${error}`, comp);
        return { 
          success: false, 
          message: 'Invalid competition data', 
          error 
        };
      }

      // Validate dates
      const startDate = comp.start_time ? new Date(comp.start_time) : new Date();
      const endDate = comp.end_time ? new Date(comp.end_time) : new Date();
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        const error = 'Invalid date format';
        this.logger.warn(`Invalid dates in competition data:`, { start_time: comp.start_time, end_time: comp.end_time });
        return {
          success: false,
          message: 'Invalid competition data',
          error
        };
      }

      // Create or update competition
      const competition = await this.prisma.competition.upsert({
        where: { id: comp.competition_uuid },
        update: {
          name: comp.competition_name,
          description: comp.competition_type || '',
          startDate,
          endDate,
          type: typeof comp.type === 'number' ? comp.type : 0,
          nbpl: comp.type === 1
        },
        create: {
          id: comp.competition_uuid,
          name: comp.competition_name,
          description: comp.competition_type || '',
          startDate,
          endDate,
          type: typeof comp.type === 'number' ? comp.type : 0,
          nbpl: comp.type === 1
        },
      });

      this.logger.log(`Successfully synced competition:`, {
        id: competition.id,
        name: competition.name,
        type: competition.type,
        nbpl: competition.nbpl,
        startDate: competition.startDate,
        endDate: competition.endDate
      });
      
      return { 
        success: true, 
        message: `Successfully synced competition: ${competition.name}` 
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Error processing competition ${comp?.competition_uuid}:`, error);
      return { 
        success: false, 
        message: 'Failed to sync competition', 
        error: errorMessage 
      };
    }
  }

  async syncCompetitions(): Promise<SyncResponse> {
    try {
      this.logger.log('Starting competition sync...');
      const response = await this.apiClient.get('/nbpl/competition/list', {
        params: {
          only_nbpl: 0,
          type: 1,
          model_type: 1
        }
      });
      
      this.logger.log('Raw API response:', JSON.stringify(response.data, null, 2));
      this.logger.log('Response headers:', response.headers);
      this.logger.log('Response status:', response.status);
      
      // Check if we're getting the expected data structure
      if (!response.data) {
        this.logger.error('No data in response');
        throw new Error('No data in response');
      }

      let competitions = [];
      if (response.data?.data?.list && Array.isArray(response.data.data.list)) {
        competitions = response.data.data.list;
        this.logger.log('Found competitions in data.data.list:', competitions.length);
        this.logger.log('First competition:', JSON.stringify(competitions[0], null, 2));
      } else if (response.data?.list && Array.isArray(response.data.list)) {
        competitions = response.data.list;
        this.logger.log('Found competitions in data.list:', competitions.length);
        this.logger.log('First competition:', JSON.stringify(competitions[0], null, 2));
      } else {
        this.logger.error('Unexpected API response structure:', response.data);
        throw new Error('Invalid API response format');
      }

      this.logger.log(`Found ${competitions.length} competitions to sync`);

      let successCount = 0;
      let failureCount = 0;

      // Process each competition separately without syncing related data
      for (const comp of competitions) {
        this.logger.log('Processing competition:', {
          uuid: comp.competition_uuid,
          name: comp.competition_name,
          type: comp.type,
          fields: Object.keys(comp)
        });
        
        const success = await this.syncSingleCompetition(comp);
        if (success.success) {
          successCount++;
          this.logger.log(`Successfully synced competition ${comp.competition_name}`);
        } else {
          failureCount++;
          this.logger.error(`Failed to sync competition ${comp.competition_name}:`, success.error);
        }
      }

      const message = `Competition sync completed. Success: ${successCount}, Failed: ${failureCount}`;
      this.logger.log(message);
      return { 
        success: true, 
        message,
        error: failureCount > 0 ? `${failureCount} competitions failed to sync` : undefined
      };
    } catch (error) {
      this.logger.error('Error syncing competitions:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return { success: false, message: 'Competition sync failed', error: errorMessage };
    }
  }

  private async syncSingleTeam(teamData: any, competitionId: string): Promise<boolean> {
    try {
      if (!teamData.team_uuid || !teamData.team_name) {
        this.logger.warn(`Skipping invalid team data: ${JSON.stringify(teamData)}`);
        return false;
      }

      // Create or update team
      const team = await this.prisma.team.upsert({
        where: { id: teamData.team_uuid },
        update: {
          name: teamData.team_name,
          logo: teamData.team_logo_url || null,
          points: teamData.points || 0,
          rank: teamData.rank || null,
          competitionId,
        },
        create: {
          id: teamData.team_uuid,
          name: teamData.team_name,
          logo: teamData.team_logo_url || null,
          points: teamData.points || 0,
          rank: teamData.rank || null,
          competitionId,
        },
      });

      this.logger.log(`Synced team: ${team.name} (${team.id})`);

      // Process players if available
      if (teamData.players && Array.isArray(teamData.players)) {
        let playerSuccessCount = 0;
        for (const playerData of teamData.players) {
          const success = await this.syncSinglePlayer(playerData, team.id, competitionId);
          if (success) playerSuccessCount++;
        }
        this.logger.log(`Synced ${playerSuccessCount} players for team ${team.name}`);
      }

      return true;
    } catch (error) {
      this.logger.error(`Error processing team ${teamData.team_uuid}:`, error);
      return false;
    }
  }

  private async syncSinglePlayer(playerData: any, teamId: string, competitionId: string): Promise<boolean> {
    try {
      if (!playerData.uuid || !playerData.name) {
        this.logger.warn(`Skipping invalid player data: ${JSON.stringify(playerData)}`);
        return false;
      }

      const player = await this.prisma.player.upsert({
        where: { id: playerData.uuid },
        create: {
          id: playerData.uuid,
          name: playerData.name,
          avatar: playerData.avatar || null,
          teamId: teamId,
          competitionId: competitionId
        },
        update: {
          name: playerData.name,
          avatar: playerData.avatar || null,
          teamId: teamId,
          competitionId: competitionId
        }
      });

      this.logger.log(`Synced player: ${player.name} (${player.id})`);
      return true;
    } catch (error) {
      this.logger.error(`Error processing player ${playerData.uuid}:`, error);
      return false;
    }
  }

  async syncTeamsAndPlayers(competitionId: string): Promise<SyncResponse> {
    try {
      // First verify the competition exists
      const competition = await this.prisma.competition.findUnique({
        where: { id: competitionId }
      });

      if (!competition) {
        this.logger.error(`Competition not found with ID: ${competitionId}`);
        return { success: false, message: `Competition not found with ID: ${competitionId}` };
      }

      this.logger.log(`Syncing teams for competition: ${competition.name} (${competitionId})`);

      // Fetch teams from API
      const teamsResponse = await this.apiClient.get(`/nbpl/competition/team/list`, {
        params: {
          competition_id: competitionId
        }
      });

      this.logger.log('Teams API Response:', {
        status: teamsResponse.status,
        data: teamsResponse.data
      });

      // Extract teams from response
      let teams = [];
      if (teamsResponse.data?.data?.list) {
        teams = teamsResponse.data.data.list;
      } else if (teamsResponse.data?.list) {
        teams = teamsResponse.data.list;
      } else if (teamsResponse.data?.data) {
        teams = teamsResponse.data.data;
      } else {
        this.logger.error('Invalid teams response structure:', teamsResponse.data);
        return { success: false, message: 'Invalid teams response structure' };
      }

      if (!Array.isArray(teams) || teams.length === 0) {
        this.logger.error('No teams found in response');
        return { success: false, message: 'No teams found in response' };
      }

      this.logger.log(`Found ${teams.length} teams to sync`);

      let successCount = 0;
      let failureCount = 0;

      // Process each team
      for (const team of teams) {
        try {
          if (!team.uuid || !team.name) {
            this.logger.error('Invalid team data:', team);
            failureCount++;
            continue;
          }

          this.logger.log(`Processing team: ${team.name} (${team.uuid})`);

          // Create or update team
          await this.prisma.team.upsert({
            where: { id: team.uuid },
            create: {
              id: team.uuid,
              name: team.name,
              competitionId: competitionId
            },
            update: {
              name: team.name,
              competitionId: competitionId
            }
          });

          // Fetch and sync players for this team
          const playersResponse = await this.apiClient.get(`/nbpl/competition/team/player/list`, {
            params: {
              competition_id: competitionId,
              team_id: team.uuid
            }
          });

          this.logger.log('Players API Response:', {
            teamId: team.uuid,
            status: playersResponse.status,
            data: playersResponse.data
          });

          // Extract players from response
          let players = [];
          if (playersResponse.data?.data?.list) {
            players = playersResponse.data.data.list;
          } else if (playersResponse.data?.list) {
            players = playersResponse.data.list;
          } else if (playersResponse.data?.data) {
            players = playersResponse.data.data;
          }

          if (!Array.isArray(players)) {
            this.logger.error(`Invalid players response for team ${team.uuid}`);
            continue;
          }

          // Process each player
          for (const player of players) {
            if (!player.uuid || !player.name) {
              this.logger.error('Invalid player data:', player);
              continue;
            }

            await this.prisma.player.upsert({
              where: { id: player.uuid },
              create: {
                id: player.uuid,
                name: player.name,
                teamId: team.uuid,
                competitionId: competitionId
              },
              update: {
                name: player.name,
                teamId: team.uuid,
                competitionId: competitionId
              }
            });
          }

          successCount++;
        } catch (error) {
          this.logger.error(`Error processing team ${team?.uuid}:`, error);
          failureCount++;
        }
      }

      const message = `Teams sync completed. Success: ${successCount}, Failures: ${failureCount}`;
      this.logger.log(message);
      return { success: successCount > 0, message };

    } catch (error) {
      this.logger.error('Teams and players sync failed:', error);
      return { success: false, message: `Teams and players sync failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  async syncStages(competitionId: string): Promise<SyncResponse> {
    try {
      this.logger.log(`Syncing stages for competition ${competitionId}...`);
      const types = [1, 2];
      const rankTypes = [0, 1, 2, 3];

      for (const type of types) {
        for (const rankType of rankTypes) {
          try {
            const response = await this.apiClient.get('/nbpl/competition/stage/list', {
              params: {
                competition_uuid: competitionId,
                type: type,
                rank_type: rankType,
                model_type: 1,
                is_all: 1
              }
            });

            this.logger.log('Stages API response:', JSON.stringify(response.data, null, 2));

            let stages = [];
            if (response.data?.list && Array.isArray(response.data.list)) {
              stages = response.data.list;
            } else if (response.data?.data?.list && Array.isArray(response.data.data.list)) {
              stages = response.data.data.list;
            } else {
              this.logger.warn(`No stages found for type ${type} and rankType ${rankType}`);
              continue;
            }

            this.logger.log(`Found ${stages.length} stages to sync for type ${type} and rankType ${rankType}`);

            for (const stage of stages) {
              try {
                if (!stage.stage_uuid || !stage.stage_name) {
                  this.logger.warn(`Skipping invalid stage data: ${JSON.stringify(stage)}`);
                  continue;
                }

                // Create or update stage
                const createdStage = await this.prisma.stage.upsert({
                  where: { id: stage.stage_uuid },
                  update: {
                    name: stage.stage_name,
                    type: stage.type,
                    rankType: stage.rank_type,
                    startDate: new Date(stage.start_time || Date.now()),
                    endDate: new Date(stage.end_time || Date.now()),
                    competitionId,
                  },
                  create: {
                    id: stage.stage_uuid,
                    name: stage.stage_name,
                    type: stage.type,
                    rankType: stage.rank_type,
                    startDate: new Date(stage.start_time || Date.now()),
                    endDate: new Date(stage.end_time || Date.now()),
                    competitionId,
                  },
                });

                this.logger.log(`Synced stage: ${createdStage.name}`);

                // Fetch and sync scores
                await this.syncScores(createdStage.id, stage);
                // Fetch and sync hero stats
                await this.syncHeroStats(competitionId, createdStage.id);
                // Fetch and sync weapon stats
                await this.syncWeaponStats(competitionId, createdStage.id);
              } catch (error) {
                this.logger.error(`Error processing stage ${stage.stage_uuid}:`, error);
                continue;
              }
            }
          } catch (error) {
            this.logger.error(`Error fetching stages for type ${type} and rankType ${rankType}:`, error);
            continue;
          }
        }
      }

      return { success: true, message: `Stages sync completed for competition ${competitionId}` };
    } catch (error) {
      this.logger.error(`Error syncing stages for competition ${competitionId}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return { success: false, message: 'Stages sync failed', error: errorMessage };
    }
  }

  async syncScores(stageId: string, teamData?: any): Promise<SyncResponse> {
    try {
      this.logger.log(`Syncing scores for stage ${stageId}...`);

      if (!teamData) {
        // Get the stage first
        const stage = await this.prisma.stage.findUnique({
          where: { id: stageId },
          include: { competition: true }
        });

        if (!stage) {
          return { success: false, message: 'Stage not found', error: 'Stage not found' };
        }

        // Fetch team data from API
        const response = await this.apiClient.get('/nbpl/rank/score', {
          params: {
            stage_uuid: stageId,
            competition_uuid: stage.competitionId,
            type: stage.type || 1,
            rank_type: stage.rankType || 0,
            model_type: 1,
            is_all: 1
          }
        });

        this.logger.log('Score API Response:', {
          status: response.status,
          data: response.data,
          url: response.config.url,
          params: response.config.params
        });

        let teams = [];
        if (response.data?.data?.rank_list) {
          teams = response.data.data.rank_list;
        } else if (response.data?.rank_list) {
          teams = response.data.rank_list;
        } else if (Array.isArray(response.data?.data)) {
          teams = response.data.data;
        }

        if (!Array.isArray(teams)) {
          this.logger.error('Invalid team data response format:', response.data);
          return { success: false, message: 'Invalid API response format' };
        }

        if (teams.length === 0) {
          this.logger.warn('No teams found in response');
          return { success: true, message: 'No teams found to sync' };
        }

        this.logger.log(`Found ${teams.length} teams to sync scores for`);

        for (const team of teams) {
          await this.syncTeamScore(stage, team);
        }

        return { success: true, message: `Scores synced successfully for stage ${stageId}` };
      } else {
        // Get the stage
        const stage = await this.prisma.stage.findUnique({
          where: { id: stageId }
        });

        if (!stage) {
          return { success: false, message: 'Stage not found', error: 'Stage not found' };
        }

        await this.syncTeamScore(stage, teamData);
        return { success: true, message: `Score synced successfully for team ${teamData.team_id} in stage ${stageId}` };
      }
    } catch (error) {
      this.logger.error(`Error syncing scores for stage ${stageId}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return { success: false, message: 'Scores sync failed', error: errorMessage };
    }
  }

  private async syncTeamScore(stage: Stage, teamData: any) {
    try {
      if (!teamData.team_uuid) {
        this.logger.error('Missing team_uuid in team data:', teamData);
        throw new Error('Missing team_uuid in team data');
      }

      // First check if team exists, if not create it
      let team = await this.prisma.team.findUnique({
        where: { id: teamData.team_uuid }
      });

      if (!team) {
        this.logger.log(`Team ${teamData.team_uuid} not found, creating new team record`);
        team = await this.prisma.team.create({
          data: {
            id: teamData.team_uuid,
            name: teamData.team_name || 'Unknown Team',
            competitionId: stage.competitionId,
            points: parseFloat(teamData.score) || 0,
            rank: parseInt(teamData.rank) || null
          }
        });
        this.logger.log(`Created new team: ${team.name} (${team.id})`);
      }

      this.logger.log(`Starting to sync score for team ${teamData.team_uuid} in stage ${stage.id}`);
      
      // Validate and transform match scores
      let matchScores = [];
      if (teamData.match_score_list_v2 && Array.isArray(teamData.match_score_list_v2)) {
        matchScores = teamData.match_score_list_v2.map((match: any) => ({
          gameNumber: match.game_number || 0,
          score: match.score || 0,
          rank: match.rank || 0,
          isWin: Boolean(match.is_win),
          isSaidian: Boolean(match.is_saidian),
        }));
        this.logger.log(`Processed ${matchScores.length} match scores for team ${teamData.team_uuid}`);
      } else {
        this.logger.warn(`No match scores found for team ${teamData.team_uuid}`);
      }

      // Get or create player ID
      const playerId = teamData.player_uuid || await this.getDefaultPlayerId(teamData.team_uuid);
      this.logger.log(`Using player ID: ${playerId} for team ${teamData.team_uuid}`);

      // Generate score ID
      const scoreId = `${stage.id}-${teamData.team_uuid}`;
      this.logger.log(`Generated score ID: ${scoreId}`);

      // Prepare score data
      const scoreData = {
        points: parseFloat(teamData.score) || 0,
        kills: parseInt(teamData.kill_times) || 0,
        deaths: parseInt(teamData.death_times) || 0,
        assists: parseInt(teamData.assist_times) || 0,
      };

      this.logger.log(`Score data prepared:`, scoreData);

      // Create or update the score record
      const score = await this.prisma.score.upsert({
        where: { id: scoreId },
        create: {
          id: scoreId,
          ...scoreData,
          matchScores: JSON.stringify(matchScores),
          stage: { connect: { id: stage.id } },
          team: { connect: { id: teamData.team_uuid } },
          player: { connect: { id: playerId } },
        },
        update: {
          ...scoreData,
          matchScores: JSON.stringify(matchScores),
          stage: { connect: { id: stage.id } },
          team: { connect: { id: teamData.team_uuid } },
          player: { connect: { id: playerId } },
        },
      });

      this.logger.log(`Successfully synced score for team ${teamData.team_uuid}:`, {
        id: score.id,
        points: score.points,
        kills: score.kills,
        deaths: score.deaths,
        assists: score.assists,
        matchScores: score.matchScores
      });

      return score;
    } catch (error) {
      this.logger.error(`Error syncing score for team ${teamData?.team_uuid} in stage ${stage.id}:`, error);
      throw error;
    }
  }

  private async getDefaultPlayerId(teamId: string): Promise<string> {
    const player = await this.prisma.player.findFirst({
      where: { teamId },
    });

    if (!player) {
      const team = await this.prisma.team.findUnique({
        where: { id: teamId },
      });

      if (!team) {
        this.logger.error(`Team not found: ${teamId}`);
        throw new Error(`Team ${teamId} not found`);
      }

      const newPlayer = await this.prisma.player.create({
        data: {
          id: `default-player-${teamId}`,
          name: 'Default Player',
          teamId,
          competitionId: team.competitionId,
        },
      });

      return newPlayer.id;
    }

    return player.id;
  }

  async syncHeroStats(competitionId: string, stageId: string): Promise<SyncResponse> {
    try {
      this.logger.log(`Syncing hero stats for stage ${stageId}...`);
      
      // First get the stage to get the competition ID
      const stage = await this.prisma.stage.findUnique({
        where: { id: stageId },
        include: {
          competition: true
        }
      });

      if (!stage) {
        return { success: false, message: 'Stage not found', error: 'Stage not found' };
      }

      const response = await this.apiClient.get('/nbpl/rank/hero', {
        params: {
          competition_uuid: stage.competitionId,
          stage_uuid: stageId,
          model_type: 1
        }
      });

      if (response.data.code !== 0) {
        const errorMessage = this.translateErrorMessage(response.data.code, response.data.message);
        this.logger.error(`API Error: ${errorMessage}`);
        return { success: false, message: errorMessage };
      }

      this.logger.log('Hero stats API response:', JSON.stringify(response.data, null, 2));

      let stats = [];
      if (response.data?.data?.list && Array.isArray(response.data.data.list)) {
        stats = response.data.data.list.map(stat => ({
          ...stat,
          hero_name: this.translateHeroName(stat.hero_name),
        }));
      } else {
        this.logger.error('Invalid hero stats response format:', response.data);
        return { success: false, message: 'Invalid API response format' };
      }

      for (const stat of stats) {
        try {
          await this.prisma.heroStat.upsert({
            where: {
              id: `${stageId}-${stat.hero_name}`,
            },
            update: {
              heroName: stat.hero_name,
              heroImage: stat.hero_img,
              battleAmount: stat.battle_amount || 0,
              killTimesAvg: stat.kill_times_avg || 0,
              assistAvg: stat.assist_avg || 0,
              cureAvg: stat.cure_avg || 0,
              damageAvg: stat.damage_avg || 0,
              deathAvg: stat.death_avg || 0,
              totalLiveTimeAvg: stat.total_live_time_avg || 0,
              scoreTop1BattleAmount: stat.score_top1_battle_amount || 0,
              rescueTimesAvg: stat.rescue_times_avg || 0,
              scoreTop1Rate: stat.score_top1_rate || 0,
              rank: stat.rank || 0
            },
            create: {
              id: `${stageId}-${stat.hero_name}`,
              heroName: stat.hero_name,
              heroImage: stat.hero_img,
              battleAmount: stat.battle_amount || 0,
              killTimesAvg: stat.kill_times_avg || 0,
              assistAvg: stat.assist_avg || 0,
              cureAvg: stat.cure_avg || 0,
              damageAvg: stat.damage_avg || 0,
              deathAvg: stat.death_avg || 0,
              totalLiveTimeAvg: stat.total_live_time_avg || 0,
              scoreTop1BattleAmount: stat.score_top1_battle_amount || 0,
              rescueTimesAvg: stat.rescue_times_avg || 0,
              scoreTop1Rate: stat.score_top1_rate || 0,
              rank: stat.rank || 0,
              stageId
            },
          });
        } catch (error) {
          this.logger.error(`Error processing hero stat for ${stat.hero_name}:`, error);
          continue;
        }
      }

      return { success: true, message: `Hero stats sync completed for stage ${stageId}` };
    } catch (error) {
      this.logger.error(`Error syncing hero stats for stage ${stageId}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return { success: false, message: 'Hero stats sync failed', error: errorMessage };
    }
  }

  private translateHeroName(name: string): string {
    const heroNameMap: Record<string, string> = {
      '魏轻': 'Wei Qing',
      '刘炼': 'Liu Lian',
      '蓝梦': 'Lan Meng',
      '顾清寒': 'Gu Qinghan',
      '特木尔': 'Temur',
      '席拉': 'Xila',
      '胡为': 'Hu Wei',
      '张起灵': 'Zhang Qiling',
      '玉玲珑': 'Yu Linglong',
      '殷紫萍': 'Yin Ziping',
      '迦南': 'Canaan',
      '崔三娘': 'Cui Sanniang'
    };

    return heroNameMap[name] || name;
  }

  async syncWeaponStats(competitionId: string, stageId: string): Promise<SyncResponse> {
    try {
      this.logger.log(`Syncing weapon stats for stage ${stageId}...`);

      // First get the stage to get the competition ID
      const stage = await this.prisma.stage.findUnique({
        where: { id: stageId },
        include: {
          competition: true
        }
      });

      if (!stage) {
        return { success: false, message: 'Stage not found', error: 'Stage not found' };
      }

      const response = await this.apiClient.get('/nbpl/rank/weapon', {
        params: {
          competition_uuid: stage.competitionId,
          stage_uuid: stageId,
          model_type: 1
        }
      });

      if (response.data.code !== 0) {
        const errorMessage = this.translateErrorMessage(response.data.code, response.data.message);
        this.logger.error(`API Error: ${errorMessage}`);
        return { success: false, message: errorMessage };
      }

      this.logger.log('Weapon stats API response:', JSON.stringify(response.data, null, 2));

      let stats = [];
      if (response.data?.data?.list && Array.isArray(response.data.data.list)) {
        stats = response.data.data.list.map(stat => ({
          ...stat,
          weapon_name: this.translateWeaponName(stat.weapon_name),
        }));
      } else {
        this.logger.error('Invalid weapon stats response format:', response.data);
        return { success: false, message: 'Invalid API response format' };
      }

      for (const stat of stats) {
        try {
          await this.prisma.weaponStat.upsert({
            where: {
              id: `${stageId}-${stat.weapon_name}`,
            },
            update: {
              weaponName: stat.weapon_name,
              pickRate: stat.pick_rate || 0,
              killRate: stat.kill_rate || 0,
              stageId
            },
            create: {
              id: `${stageId}-${stat.weapon_name}`,
              weaponName: stat.weapon_name,
              pickRate: stat.pick_rate || 0,
              killRate: stat.kill_rate || 0,
              stageId
            },
          });
        } catch (error) {
          this.logger.error(`Error processing weapon stat for ${stat.weapon_name}:`, error);
          continue;
        }
      }

      return { success: true, message: `Weapon stats sync completed for stage ${stageId}` };
    } catch (error) {
      this.logger.error(`Error syncing weapon stats for stage ${stageId}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return { success: false, message: 'Weapon stats sync failed', error: errorMessage };
    }
  }

  private translateWeaponName(name: string): string {
    const weaponNameMap: Record<string, string> = {
      '太刀': 'Katana',
      '匕首': 'Dagger',
      '长枪': 'Spear',
      '大刀': 'Greatsword',
      '长剑': 'Longsword',
      '双刀': 'Dual Blades',
      '弓': 'Bow',
      '铁扇': 'Iron Fan',
      '长鞭': 'Whip',
      '短刀': 'Short Sword'
    };

    return weaponNameMap[name] || name;
  }

  async syncStagesForCompetition(competitionId: string): Promise<SyncResponse> {
    this.logger.log(`Starting stage sync for competition ${competitionId}`);
    try {
      const response = await this.apiClient.get('/nbpl/competition/stage/list', {
        params: {
          competition_uuid: competitionId,
          type: 0,
          rank_type: 0
        }
      });

      if (!response.data?.data?.list) {
        throw new Error('Invalid API response format for stages');
      }

      const stages = response.data.data.list;
      this.logger.log(`Found ${stages.length} stages to sync`);

      for (const stage of stages) {
        await this.prisma.stage.upsert({
          where: { id: stage.stage_uuid },
          create: {
            id: stage.stage_uuid,
            name: stage.stage_name,
            type: stage.type,
            rankType: 0,
            startDate: new Date(stage.start_time || Date.now()),
            endDate: new Date(stage.end_time || Date.now()),
            competitionId: competitionId
          },
          update: {
            name: stage.stage_name,
            type: stage.type,
            startDate: new Date(stage.start_time || Date.now()),
            endDate: new Date(stage.end_time || Date.now())
          }
        });
      }
      this.logger.log('Stages sync completed successfully');
      return { success: true, message: 'Stages synced successfully' };
    } catch (error) {
      this.logger.error(`Error syncing stages for competition ${competitionId}:`, error);
      throw error;
    }
  }

  async syncCompetitionTeams(competitionId: string): Promise<SyncResponse> {
    this.logger.log(`Starting team sync for competition ${competitionId}`);
    try {
      const response = await this.apiClient.get('/nbpl/competition/team/list', {
        params: { competition_uuid: competitionId }
      });

      if (!response.data?.data?.list) {
        throw new Error('Invalid API response format for teams');
      }

      const teams = response.data.data.list;
      this.logger.log(`Found ${teams.length} teams to sync`);

      for (const team of teams) {
        await this.prisma.team.upsert({
          where: { id: team.team_uuid },
          create: {
            id: team.team_uuid,
            name: team.team_name,
            competitionId: competitionId,
            points: 0
          },
          update: {
            name: team.team_name
          }
        });
      }
      this.logger.log('Teams sync completed successfully');
      return { success: true, message: 'Teams synced successfully' };
    } catch (error) {
      this.logger.error(`Error syncing teams for competition ${competitionId}:`, error);
      throw error;
    }
  }

  async syncTeamPlayers(teamId: string, competitionId: string): Promise<SyncResponse> {
    this.logger.log(`Starting player sync for team ${teamId}`);
    try {
      const response = await this.apiClient.get('/nbpl/competition/player/list', {
        params: { 
          team_uuid: teamId,
          competition_uuid: competitionId,
          type: 1,
          model_type: 1,
          is_all: 1
        }
      });

      if (!response.data?.data?.list) {
        throw new Error('Invalid API response format for players');
      }

      const players = response.data.data.list;
      this.logger.log(`Found ${players.length} players to sync`);

      let successCount = 0;
      let failureCount = 0;

      for (const player of players) {
        const success = await this.syncSinglePlayer(player, teamId, competitionId);
        if (success) {
          successCount++;
        } else {
          failureCount++;
        }
      }

      const message = `Players sync completed for team ${teamId}. Success: ${successCount}, Failed: ${failureCount}`;
      return {
        success: true,
        message,
        error: failureCount > 0 ? `${failureCount} players failed to sync` : undefined
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Error syncing players for team ${teamId}:`, error);
      return { success: false, message: 'Players sync failed', error: errorMessage };
    }
  }

  async syncStageStats(stageId: string): Promise<SyncResponse> {
    this.logger.log(`Starting stats sync for stage ${stageId}`);
    try {
      // Sync hero stats
      const heroResponse = await this.apiClient.get('/nbpl/rank/hero', {
        params: {
          stage_uuid: stageId,
          model_type: 0
        }
      });

      if (!heroResponse.data?.data?.list) {
        throw new Error('Invalid API response format for hero stats');
      }

      const heroStats = heroResponse.data.data.list;
      this.logger.log(`Found ${heroStats.length} hero stats to sync`);

      for (const stat of heroStats) {
        const heroStatId = `${stageId}-${stat.hero_id}`;
        await this.prisma.heroStat.upsert({
          where: { id: heroStatId },
          create: {
            id: heroStatId,
            stageId: stageId,
            heroName: stat.hero_name,
            heroImage: stat.hero_img,
            battleAmount: stat.battle_amount || 0,
            killTimesAvg: stat.kill_times_avg || 0,
            assistAvg: stat.assist_avg || 0,
            cureAvg: stat.cure_avg || 0,
            damageAvg: stat.damage_avg || 0,
            deathAvg: stat.death_avg || 0,
            totalLiveTimeAvg: stat.total_live_time_avg || 0,
            scoreTop1BattleAmount: stat.score_top1_battle_amount || 0,
            rescueTimesAvg: stat.rescue_times_avg || 0,
            scoreTop1Rate: stat.score_top1_rate || 0,
            rank: stat.rank || 0
          },
          update: {
            heroName: stat.hero_name,
            heroImage: stat.hero_img,
            battleAmount: stat.battle_amount || 0,
            killTimesAvg: stat.kill_times_avg || 0,
            assistAvg: stat.assist_avg || 0,
            cureAvg: stat.cure_avg || 0,
            damageAvg: stat.damage_avg || 0,
            deathAvg: stat.death_avg || 0,
            totalLiveTimeAvg: stat.total_live_time_avg || 0,
            scoreTop1BattleAmount: stat.score_top1_battle_amount || 0,
            rescueTimesAvg: stat.rescue_times_avg || 0,
            scoreTop1Rate: stat.score_top1_rate || 0,
            rank: stat.rank || 0
          }
        });
      }

      // Sync weapon stats
      const weaponResponse = await this.apiClient.get('/nbpl/rank/weapon', {
        params: {
          stage_uuid: stageId,
          model_type: 0
        }
      });

      if (!weaponResponse.data?.data?.list) {
        throw new Error('Invalid API response format for weapon stats');
      }

      const weaponStats = weaponResponse.data.data.list;
      this.logger.log(`Found ${weaponStats.length} weapon stats to sync`);

      for (const stat of weaponStats) {
        const weaponStatId = `${stageId}-${stat.weapon_id}`;
        await this.prisma.weaponStat.upsert({
          where: { id: weaponStatId },
          create: {
            id: weaponStatId,
            stageId: stageId,
            weaponName: stat.weapon_name,
            pickRate: stat.pick_rate,
            killRate: stat.win_rate
          },
          update: {
            weaponName: stat.weapon_name,
            pickRate: stat.pick_rate,
            killRate: stat.win_rate
          }
        });
      }

      this.logger.log('Stats sync completed successfully');
      return { success: true, message: 'Stats synced successfully' };
    } catch (error) {
      this.logger.error(`Error syncing stats for stage ${stageId}:`, error);
      throw error;
    }
  }

  // Main sync method that orchestrates all sync operations
  async syncAll() {
    this.logger.log('Starting full sync process');
    try {
      // 1. Sync competitions
      this.logger.log('Step 1: Syncing competitions...');
      const competitions = await this.syncCompetitions();
      this.logger.log('Competitions sync result:', competitions);
      
      // Get all competitions from database
      this.logger.log('Fetching competitions from database...');
      const dbCompetitions = await this.prisma.competition.findMany();
      this.logger.log(`Found ${dbCompetitions.length} competitions in database`);
      
      // 2. For each competition, sync stages and teams
      for (const competition of dbCompetitions) {
        this.logger.log(`Processing competition: ${competition.name} (${competition.id})`);
        
        // Sync stages
        this.logger.log(`Syncing stages for competition ${competition.id}...`);
        const stagesResult = await this.syncStages(competition.id);
        this.logger.log('Stages sync result:', stagesResult);
        
        // Sync teams and players
        this.logger.log(`Syncing teams and players for competition ${competition.id}...`);
        const teamsResult = await this.syncTeamsAndPlayers(competition.id);
        this.logger.log('Teams and players sync result:', teamsResult);
        
        // Get stages for this competition
        this.logger.log(`Fetching stages for competition ${competition.id}...`);
        const stages = await this.prisma.stage.findMany({
          where: { competitionId: competition.id }
        });
        this.logger.log(`Found ${stages.length} stages for competition ${competition.id}`);
        
        // 3. For each stage, sync scores and stats
        for (const stage of stages) {
          this.logger.log(`Processing stage: ${stage.name} (${stage.id})`);
          
          // Sync scores
          this.logger.log(`Syncing scores for stage ${stage.id}...`);
          const scoresResult = await this.syncScores(stage.id);
          this.logger.log('Scores sync result:', scoresResult);
          
          // Sync stats
          this.logger.log(`Syncing stats for stage ${stage.id}...`);
          const statsResult = await this.syncStageStats(stage.id);
          this.logger.log('Stats sync result:', statsResult);
        }
      }
      
      this.logger.log('Full sync completed successfully');
      return { success: true, message: 'Full sync completed successfully' };
    } catch (error) {
      this.logger.error('Error during full sync:', error);
      throw error;
    }
  }

  async getStagesForCompetition(competitionId: string) {
    return this.prisma.stage.findMany({
      where: { competitionId }
    });
  }

  // Add error message translation
  private translateErrorMessage(code: number, message: string): string {
    const errorMessages: Record<number, string> = {
      20002: 'Invalid parameters',
      20001: 'Request failed',
      20000: 'Server error',
    };
    
    const messageTranslations: Record<string, string> = {
      '参数非法': 'Invalid parameters',
      '成功': 'Success',
      '失败': 'Failed',
    };

    if (code && errorMessages[code]) {
      return errorMessages[code];
    }

    return messageTranslations[message] || message;
  }

  private translateTeamData(teamData: any) {
    return {
      ...teamData,
      team_name: teamData.team_name,
      team_from: teamData.team_from || 'Unknown',
      is_champion: teamData.is_champion ? 1 : 0,
      match_score_list_v2: teamData.match_score_list_v2?.map((match: any) => ({
        ...match,
        is_win: match.is_win,
        is_saidian: match.is_saidian || 0,
      }))
    };
  }
} 