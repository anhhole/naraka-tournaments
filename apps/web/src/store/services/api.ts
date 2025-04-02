import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export interface SyncResponse {
  success: boolean;
  failed?: number;
  message: string;
  error?: string;
}

export interface Competition {
  id: string;
  name: string;
  description: string;
  type: number;
  start_time: string | Date;
  end_time: string | Date;
  competition_uuid: string;
  competition_name: string;
  competition_type: string;
  stages?: any[];
  teams?: any[];
}

export interface TeamRanking {
  rank: number;
  team: {
    id: string;
    name: string;
  };
  totalPoints: number;
  totalKills: number;
  matches: number;
}

export const api = createApi({
  reducerPath: "api",
  baseQuery: fetchBaseQuery({
    baseUrl: "/api",
    headers: {
      'Content-Type': 'application/json',
    }
  }),
  endpoints: (builder) => ({
    getCompetitions: builder.query<Competition[], boolean | void>({
      query: (onlyNbpl = false) => `competition/list?only_nbpl=${onlyNbpl}`,
      transformResponse: (response: any) => response.data.list,
    }),
    syncCompetitions: builder.mutation<SyncResponse, void>({
      query: () => ({
        url: 'sync/competitions',
        method: 'POST',
      }),
    }),
    syncSingleCompetition: builder.mutation<SyncResponse, { competitionId: string; competition_name: string }>({
      query: ({ competitionId, competition_name }) => ({
        url: `sync/competitions/${competitionId}`,
        method: 'POST',
        body: { competition_name }
      }),
    }),
    syncStageScores: builder.mutation<SyncResponse, { stageId: string }>({
      query: ({ stageId }) => ({
        url: `sync/stages/${stageId}/scores`,
        method: 'POST'
      }),
    }),
    syncStageStats: builder.mutation<SyncResponse, { stageId: string }>({
      query: ({ stageId }) => ({
        url: `sync/stages/${stageId}/stats`,
        method: 'POST'
      }),
    }),
    getStages: builder.query({
      query: ({ competitionId, type, rankType }) => 
        `competition/stage/list?competition_uuid=${competitionId}&type=${type}&rank_type=${rankType}`,
    }),
    getStageScores: builder.query({
      query: (stageId) => `competition/rank/score?stage_uuid=${stageId}`,
    }),
    getTeamRankings: builder.query<TeamRanking[], { competitionId: string; stageUuid: string }>({
      query: ({ competitionId, stageUuid }) => 
        `competition/rank/team/data?competition_uuid=${competitionId}&stage_uuid=${stageUuid}`,
    }),
    getHeroStats: builder.query({
      query: ({ competitionId, stageId, modelType }) => 
        `competition/rank/hero?competition_uuid=${competitionId}&stage_uuid=${stageId}&model_type=${modelType}`,
    }),
    getWeaponStats: builder.query({
      query: ({ competitionId, stageId, modelType }) => 
        `competition/rank/weapon?competition_uuid=${competitionId}&stage_uuid=${stageId}&model_type=${modelType}`,
    }),
  }),
});

export const {
  useGetCompetitionsQuery,
  useSyncCompetitionsMutation,
  useSyncSingleCompetitionMutation,
  useSyncStageScoresMutation,
  useSyncStageStatsMutation,
  useGetStagesQuery,
  useGetStageScoresQuery,
  useGetTeamRankingsQuery,
  useGetHeroStatsQuery,
  useGetWeaponStatsQuery,
} = api;
