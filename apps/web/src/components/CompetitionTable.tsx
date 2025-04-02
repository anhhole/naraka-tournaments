import React from 'react';
import { useGetCompetitionsQuery } from '../store/services/sync';

export const CompetitionTable: React.FC = () => {
  const { data: competitions, isLoading, error } = useGetCompetitionsQuery();

  if (isLoading) {
    return <div className="text-center py-4">Loading competitions...</div>;
  }

  if (error) {
    return <div className="text-red-600 text-center py-4">Error loading competitions</div>;
  }

  if (!competitions?.length) {
    return <div className="text-center py-4">No competitions found</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white rounded-lg shadow">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Date</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End Date</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {competitions.map((competition) => (
            <tr key={competition.id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{competition.name}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{competition.description || '-'}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {new Date(competition.startDate).toLocaleDateString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {new Date(competition.endDate).toLocaleDateString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{competition.type}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}; 