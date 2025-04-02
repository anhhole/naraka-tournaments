import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export interface SyncResponse {
  success: boolean;
  message: string;
  error?: string;
}

export interface Competition {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  type: number;
}

interface ApiResponse<T> {
  data: T;
  success?: boolean;
  message?: string;
}

export const syncApi = createApi({
  reducerPath: 'syncApi',
  baseQuery: fetchBaseQuery({ 
    baseUrl: '/api',
    headers: {
      'Content-Type': 'application/json',
    }
  }),
  tagTypes: ['Competitions'],
  endpoints: (builder) => ({
    getCompetitions: builder.query<Competition[], void>({
      query: () => ({
        url: 'competition/list',
        method: 'GET',
        params: {
          only_nbpl: '0'
        }
      }),
      transformResponse: (response: ApiResponse<Competition[]>) => {
        if (!response || !response.data) {
          console.error('Invalid API response:', response);
          return [];
        }
        return response.data;
      },
    }),
    syncCompetitions: builder.mutation<SyncResponse, void>({
      query: () => ({
        url: 'sync/competitions',
        method: 'POST',
      }),
      invalidatesTags: ['Competitions'],
    }),
    syncSingleCompetition: builder.mutation<SyncResponse, { competitionId: string }>({
      query: ({ competitionId }) => ({
        url: 'sync/competition',
        method: 'POST',
        body: { competitionId }
      }),
      invalidatesTags: ['Competitions'],
    }),
    syncTeamsAndPlayers: builder.mutation<SyncResponse, string>({
      query: (competitionId) => ({
        url: `sync/competitions/${competitionId}/teams`,
        method: 'POST',
      }),
    }),
    syncStages: builder.mutation<SyncResponse, string>({
      query: (competitionId) => ({
        url: `sync/competitions/${competitionId}/stages`,
        method: 'POST',
      }),
    }),
    syncScores: builder.mutation<SyncResponse, string>({
      query: (stageId) => ({
        url: `sync/stages/${stageId}/scores`,
        method: 'POST',
      }),
    }),
    syncStats: builder.mutation<SyncResponse, { stageId: string; competitionId: string }>({
      query: ({ stageId, competitionId }) => ({
        url: `sync/stages/${stageId}/stats`,
        method: 'POST',
      }),
    }),
  }),
});

export const {
  useGetCompetitionsQuery,
  useSyncCompetitionsMutation,
  useSyncSingleCompetitionMutation,
  useSyncTeamsAndPlayersMutation,
  useSyncStagesMutation,
  useSyncScoresMutation,
  useSyncStatsMutation,
} = syncApi; 