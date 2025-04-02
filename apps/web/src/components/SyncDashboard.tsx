import React, { useState } from 'react';
import { Select, Button, Table, Card, Typography, Space, Tag, Tabs, message } from 'antd';
import { SyncOutlined, ReloadOutlined, TeamOutlined } from '@ant-design/icons';
import { 
  useGetCompetitionsQuery, 
  useSyncCompetitionsMutation, 
  useSyncSingleCompetitionMutation,
  useGetStagesQuery,
  useGetTeamRankingsQuery,
  useSyncStageScoresMutation,
  useSyncStageStatsMutation
} from '../store/services/api';

const { Title } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

interface SyncOperation {
  operation: string;
  status: 'SUCCESS' | 'ERROR';
  message: string;
  timestamp: string;
}

export const SyncDashboard: React.FC = () => {
  const [selectedCompetition, setSelectedCompetition] = useState<string>('');
  const [selectedStage, setSelectedStage] = useState<string>('');
  const [operations, setOperations] = useState<SyncOperation[]>([]);
  const [activeTab, setActiveTab] = useState<string>('operations');
  
  const { data: competitions } = useGetCompetitionsQuery(false);
  const { data: stages } = useGetStagesQuery(
    { competitionId: selectedCompetition, type: 1, rankType: 0 },
    { skip: !selectedCompetition }
  );
  const { data: teamRankings } = useGetTeamRankingsQuery(
    { competitionId: selectedCompetition, stageUuid: selectedStage },
    { skip: !selectedCompetition || !selectedStage }
  );
  const [syncAll] = useSyncCompetitionsMutation();
  const [syncSingle] = useSyncSingleCompetitionMutation();
  const [syncStageScores] = useSyncStageScoresMutation();
  const [syncStageStats] = useSyncStageStatsMutation();

  const handleSyncAll = async () => {
    try {
      const result = await syncAll().unwrap();
      addOperation({
        operation: 'Sync All Competitions',
        status: 'SUCCESS',
        message: `Competition sync completed. Success: ${result.success}, Failed: ${result.failed}`,
        timestamp: new Date().toLocaleTimeString()
      });
    } catch (error) {
      addOperation({
        operation: 'Sync All Competitions',
        status: 'ERROR',
        message: error.message || 'Failed to sync competitions',
        timestamp: new Date().toLocaleTimeString()
      });
    }
  };

  const handleSyncSelected = async () => {
    if (!selectedCompetition) return;
    
    const competition = competitions?.find(c => c.id === selectedCompetition);
    if (!competition) return;

    try {
      const result = await syncSingle({
        competitionId: competition.competition_uuid || competition.id,
        competition_name: competition.competition_name || competition.name
      }).unwrap();
      
      addOperation({
        operation: 'Sync Single Competition',
        status: 'SUCCESS',
        message: `Successfully synced ${competition.name}`,
        timestamp: new Date().toLocaleTimeString()
      });
      
      // Switch to stages tab after successful sync
      setActiveTab('stages');
    } catch (error) {
      addOperation({
        operation: 'Sync Single Competition',
        status: 'ERROR',
        message: error.message || 'Failed to sync competition',
        timestamp: new Date().toLocaleTimeString()
      });
    }
  };

  const handleSyncStage = async (stageId: string, stageName: string) => {
    try {
      // Sync scores
      const scoreResult = await syncStageScores({
        stageId
      }).unwrap();
      addOperation({
        operation: `Sync Stage Scores: ${stageName}`,
        status: scoreResult.success ? 'SUCCESS' : 'ERROR',
        message: scoreResult.message || 'Successfully synced scores',
        timestamp: new Date().toLocaleTimeString()
      });

      // Sync stats
      const statsResult = await syncStageStats({
        stageId
      }).unwrap();
      addOperation({
        operation: `Sync Stage Stats: ${stageName}`,
        status: statsResult.success ? 'SUCCESS' : 'ERROR',
        message: statsResult.message || 'Successfully synced stats',
        timestamp: new Date().toLocaleTimeString()
      });

      if (scoreResult.success && statsResult.success) {
        message.success(`Successfully synced all data for stage: ${stageName}`);
      } else {
        message.warning(`Some operations failed for stage: ${stageName}`);
      }
    } catch (error) {
      addOperation({
        operation: `Sync Stage: ${stageName}`,
        status: 'ERROR',
        message: error.message || 'Failed to sync stage data',
        timestamp: new Date().toLocaleTimeString()
      });
      message.error(`Failed to sync stage: ${stageName}`);
    }
  };

  const addOperation = (operation: SyncOperation) => {
    setOperations(prev => [operation, ...prev]);
  };

  const operationsColumns = [
    {
      title: 'Operation',
      dataIndex: 'operation',
      key: 'operation',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'SUCCESS' ? 'green' : 'red'}>
          {status}
        </Tag>
      ),
    },
    {
      title: 'Message',
      dataIndex: 'message',
      key: 'message',
    },
    {
      title: 'Timestamp',
      dataIndex: 'timestamp',
      key: 'timestamp',
    },
  ];

  const stagesColumns = [
    {
      title: 'Stage Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Start Time',
      dataIndex: 'start_time',
      key: 'start_time',
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: 'End Time',
      dataIndex: 'end_time',
      key: 'end_time',
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, record: any) => (
        <Space>
          <Button 
            type="link"
            icon={<TeamOutlined />}
            onClick={() => {
              setSelectedStage(record.id);
              setActiveTab('teams');
            }}
          >
            View Teams
          </Button>
          <Button
            type="primary"
            icon={<SyncOutlined />}
            onClick={() => handleSyncStage(record.id, record.name)}
            size="small"
          >
            Sync Stage
          </Button>
        </Space>
      ),
    },
  ];

  const teamColumns = [
    {
      title: 'Rank',
      dataIndex: 'rank',
      key: 'rank',
    },
    {
      title: 'Team',
      dataIndex: ['team', 'name'],
      key: 'teamName',
    },
    {
      title: 'Points',
      dataIndex: 'totalPoints',
      key: 'points',
    },
    {
      title: 'Kills',
      dataIndex: 'totalKills',
      key: 'kills',
    },
    {
      title: 'Matches',
      dataIndex: 'matches',
      key: 'matches',
    },
  ];

  return (
    <Card className="shadow-lg">
      <Title level={2}>Data Synchronization</Title>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-lg">
          <Select
            style={{ width: 300 }}
            placeholder="Select Competition"
            value={selectedCompetition}
            onChange={setSelectedCompetition}
          >
            {competitions?.map((comp) => (
              <Option key={comp.id} value={comp.id}>{comp.name}</Option>
            ))}
          </Select>
          <Button 
            type="primary"
            size="large"
            icon={<SyncOutlined />}
            onClick={handleSyncSelected}
            disabled={!selectedCompetition}
            style={{ marginLeft: '8px', backgroundColor: '#1890ff' }}
          >
            Sync Selected
          </Button>
          <Button 
            size="large"
            icon={<ReloadOutlined />}
            onClick={handleSyncAll}
            style={{ marginLeft: '8px' }}
            type="default"
          >
            Sync All
          </Button>
        </div>

        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab="Operations" key="operations">
            <Table
              columns={operationsColumns}
              dataSource={operations}
              rowKey={(record) => `${record.operation}-${record.timestamp}`}
              pagination={{ pageSize: 10 }}
            />
          </TabPane>
          <TabPane tab="Stages" key="stages">
            <Table
              columns={stagesColumns}
              dataSource={stages}
              rowKey="id"
              pagination={{ pageSize: 10 }}
            />
          </TabPane>
          <TabPane tab="Teams" key="teams">
            <Table
              columns={teamColumns}
              dataSource={teamRankings}
              rowKey={(record) => record.team.id}
              pagination={{ pageSize: 10 }}
            />
          </TabPane>
        </Tabs>
      </Space>
    </Card>
  );
}; 