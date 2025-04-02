import React, { useState } from 'react';
import { useSyncCompetitionsMutation } from '../store/services/sync';

interface SyncButtonProps {
  onSyncComplete?: () => Promise<void>;
}

export const SyncButton: React.FC<SyncButtonProps> = ({ onSyncComplete }) => {
  const [syncCompetitions, { isLoading, error }] = useSyncCompetitionsMutation();
  const [message, setMessage] = useState<string>('');

  const handleSync = async () => {
    try {
      const result = await syncCompetitions().unwrap();
      setMessage(result.message);
      if (onSyncComplete) {
        await onSyncComplete();
      }
      setTimeout(() => setMessage(''), 5000); // Clear message after 5 seconds
    } catch (err) {
      setMessage(err.data?.error || 'Failed to sync data');
      setTimeout(() => setMessage(''), 5000);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={handleSync}
        disabled={isLoading}
        className={`px-4 py-2 rounded-md font-semibold text-white transition-colors ${
          isLoading
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        {isLoading ? 'Syncing...' : 'Sync Data'}
      </button>
      {message && (
        <p
          className={`text-sm ${
            error ? 'text-red-600' : 'text-green-600'
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}; 