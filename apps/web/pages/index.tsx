import { useState } from 'react';
import {
  useGetCompetitionsQuery,
  useGetStagesQuery,
  useGetTeamRankingsQuery,
  useGetHeroStatsQuery,
  useGetWeaponStatsQuery,
} from '../src/store/services/api';

export default function CompetitionPage() {
  const [selectedCompetition, setSelectedCompetition] = useState<string>('');
  const [selectedStage, setSelectedStage] = useState<string>('');
  
  const { data: competitions } = useGetCompetitionsQuery(false);
  const { data: stages } = useGetStagesQuery(
    { competitionId: selectedCompetition, type: 1, rankType: 0 },
    { skip: !selectedCompetition }
  );
  const { data: teamRankings } = useGetTeamRankingsQuery(
    { competitionId: selectedCompetition, stageUuid: selectedStage },
    { skip: !selectedCompetition || !selectedStage }
  );
  const { data: heroStats } = useGetHeroStatsQuery(
    { competitionId: selectedCompetition, stageId: selectedStage, modelType: 1 },
    { skip: !selectedCompetition || !selectedStage }
  );
  const { data: weaponStats } = useGetWeaponStatsQuery(
    { competitionId: selectedCompetition, stageId: selectedStage, modelType: 1 },
    { skip: !selectedCompetition || !selectedStage }
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Naraka Tournaments</h1>
      
      {/* Competition Selector */}
      <div className="mb-8">
        <label className="block text-sm font-medium mb-2">Select Competition</label>
        <select
          className="w-full p-2 border rounded"
          value={selectedCompetition}
          onChange={(e) => setSelectedCompetition(e.target.value)}
        >
          <option value="">Select a competition</option>
          {competitions?.map((comp) => (
            <option key={comp.id} value={comp.id}>
              {comp.name}
            </option>
          ))}
        </select>
      </div>

      {/* Stage Selector */}
      {selectedCompetition && (
        <div className="mb-8">
          <label className="block text-sm font-medium mb-2">Select Stage</label>
          <select
            className="w-full p-2 border rounded"
            value={selectedStage}
            onChange={(e) => setSelectedStage(e.target.value)}
          >
            <option value="">Select a stage</option>
            {stages?.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Team Rankings */}
      {teamRankings && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Team Rankings</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-4 text-left">Rank</th>
                  <th className="p-4 text-left">Team</th>
                  <th className="p-4 text-left">Points</th>
                  <th className="p-4 text-left">Kills</th>
                  <th className="p-4 text-left">Matches</th>
                </tr>
              </thead>
              <tbody>
                {teamRankings.map((team) => (
                  <tr key={team.team.id} className="border-t">
                    <td className="p-4">{team.rank}</td>
                    <td className="p-4">{team.team.name}</td>
                    <td className="p-4">{team.totalPoints}</td>
                    <td className="p-4">{team.totalKills}</td>
                    <td className="p-4">{team.matches}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Hero Stats */}
      {heroStats && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Hero Statistics</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-4 text-left">Hero</th>
                  <th className="p-4 text-left">Pick Rate</th>
                  <th className="p-4 text-left">Win Rate</th>
                </tr>
              </thead>
              <tbody>
                {heroStats.map((hero) => (
                  <tr key={hero.id} className="border-t">
                    <td className="p-4">{hero.heroName}</td>
                    <td className="p-4">{(hero.pickRate * 100).toFixed(1)}%</td>
                    <td className="p-4">{(hero.winRate * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Weapon Stats */}
      {weaponStats && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Weapon Statistics</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-4 text-left">Weapon</th>
                  <th className="p-4 text-left">Pick Rate</th>
                  <th className="p-4 text-left">Kill Rate</th>
                </tr>
              </thead>
              <tbody>
                {weaponStats.map((weapon) => (
                  <tr key={weapon.id} className="border-t">
                    <td className="p-4">{weapon.weaponName}</td>
                    <td className="p-4">{(weapon.pickRate * 100).toFixed(1)}%</td>
                    <td className="p-4">{(weapon.killRate * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
