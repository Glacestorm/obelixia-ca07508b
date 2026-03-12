/**
 * OfficialIntegrationsHub — Panel principal de integraciones oficiales
 */
import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useOfficialIntegrationsHub } from '@/hooks/erp/hr/useOfficialIntegrationsHub';
import { IntegrationsHubDashboard } from './IntegrationsHubDashboard';
import { SubmissionsList } from './SubmissionsList';
import { SubmissionForm } from './SubmissionForm';
import { SubmissionDetail } from './SubmissionDetail';
import { AdaptersPanel } from './AdaptersPanel';
import { ReceiptsPanel } from './ReceiptsPanel';

interface Props { companyId: string; }

export function OfficialIntegrationsHub({ companyId }: Props) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const hub = useOfficialIntegrationsHub(companyId);

  useEffect(() => { hub.loadAll(); }, []);

  const handleViewDetail = (id: string) => {
    setSelectedSubmissionId(id);
    setActiveTab('detail');
  };

  const handleFormClose = () => {
    setShowForm(false);
    hub.fetchSubmissions();
  };

  if (selectedSubmissionId && activeTab === 'detail') {
    return (
      <SubmissionDetail
        submissionId={selectedSubmissionId}
        hub={hub}
        onBack={() => { setSelectedSubmissionId(null); setActiveTab('submissions'); }}
      />
    );
  }

  if (showForm) {
    return (
      <SubmissionForm
        companyId={companyId}
        adapters={hub.adapters}
        hub={hub}
        onClose={handleFormClose}
      />
    );
  }

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard" className="text-xs">Dashboard</TabsTrigger>
          <TabsTrigger value="submissions" className="text-xs">Envíos</TabsTrigger>
          <TabsTrigger value="adapters" className="text-xs">Conectores</TabsTrigger>
          <TabsTrigger value="receipts" className="text-xs">Acuses</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <IntegrationsHubDashboard stats={hub.stats} submissions={hub.submissions} adapters={hub.adapters} onRefresh={hub.loadAll} isLoading={hub.isLoading} />
        </TabsContent>
        <TabsContent value="submissions">
          <SubmissionsList
            submissions={hub.submissions}
            adapters={hub.adapters}
            isLoading={hub.isLoading}
            onView={handleViewDetail}
            onNewSubmission={() => setShowForm(true)}
            onRetry={hub.retrySubmission}
            onCancel={hub.cancelSubmission}
            onRefresh={() => hub.fetchSubmissions()}
          />
        </TabsContent>
        <TabsContent value="adapters">
          <AdaptersPanel adapters={hub.adapters} onToggle={hub.updateAdapterStatus} onRefresh={() => hub.fetchAdapters()} />
        </TabsContent>
        <TabsContent value="receipts">
          <ReceiptsPanel hub={hub} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
