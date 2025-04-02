import { SyncDashboard } from '../../src/components/SyncDashboard';

export default function SyncPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Data Synchronization</h1>
      <SyncDashboard />
    </div>
  );
} 