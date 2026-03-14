/**
 * OfficialIntegrationsHub — Panel principal de integraciones oficiales
 * V2-ES.8 T5+T6: + Aprobaciones pre-real tab + Proactive alerts visibility
 */
import { useState, useEffect, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useOfficialIntegrationsHub } from '@/hooks/erp/hr/useOfficialIntegrationsHub';
import { IntegrationsHubDashboard } from './IntegrationsHubDashboard';
import { SubmissionsList } from './SubmissionsList';
import { SubmissionForm } from './SubmissionForm';
import { SubmissionDetail } from './SubmissionDetail';
import { AdaptersPanel } from './AdaptersPanel';
import { ReceiptsPanel } from './ReceiptsPanel';
import { ReadinessDashboard } from './ReadinessDashboard';
import { PreparatoryDryRunPanel } from './PreparatoryDryRunPanel';
import { PreRealApprovalPanel } from './PreRealApprovalPanel';
import { usePreRealApproval } from '@/hooks/erp/hr/usePreRealApproval';
import { useProactiveAlertSignals, mapReadinessSignals } from '@/hooks/erp/hr/useProactiveAlertSignals';
import { useOfficialReadiness } from '@/hooks/erp/hr/useOfficialReadiness';
import { useRegulatoryCalendar } from '@/hooks/erp/hr/useRegulatoryCalendar';
import { useHRDomainCertificates } from '@/hooks/erp/hr/useHRDomainCertificates';
import { usePreparatorySubmissions } from '@/hooks/erp/hr/usePreparatorySubmissions';
import { ProactiveAlertsSummaryWidget } from './ProactiveAlertsSummaryWidget';

interface Props { companyId: string; }

export function OfficialIntegrationsHub({ companyId }: Props) {
  const [activeTab, setActiveTab] = useState('readiness');
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const hub = useOfficialIntegrationsHub(companyId);
  const { pendingCount, approvals, fetchApprovals } = usePreRealApproval(companyId);

  // Data sources for proactive alerts at hub level
  const { summary: readinessSummary } = useOfficialReadiness(companyId);
  const { calendar } = useRegulatoryCalendar(companyId);
  const { certificates } = useHRDomainCertificates(companyId);
  const { submissions } = usePreparatorySubmissions(companyId);

  const proactiveAlerts = useProactiveAlertSignals({
    readinessSummary,
    calendar,
    certificates,
    submissions,
    approvals,
    enabled: activeTab !== 'readiness', // ReadinessDashboard runs its own
  });

  // Active alert count for tab badge
  const activeAlertCount = useMemo(() => {
    if (!proactiveAlerts.summary) return 0;
    return proactiveAlerts.summary.alerts.filter(
      a => a.status === 'active' && (a.severity === 'critical' || a.severity === 'high')
    ).length;
  }, [proactiveAlerts.summary]);

  useEffect(() => { hub.loadAll(); fetchApprovals(); }, []);

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
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="readiness" className="text-xs relative">
            Readiness
            {activeAlertCount > 0 && activeTab !== 'readiness' && (
              <Badge variant="destructive" className="absolute -top-1.5 -right-1.5 h-4 min-w-4 text-[8px] px-1 flex items-center justify-center">
                {activeAlertCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="dry-run" className="text-xs">Dry-Run</TabsTrigger>
          <TabsTrigger value="approvals" className="text-xs relative">
            Aprobaciones
            {pendingCount > 0 && (
              <Badge variant="destructive" className="absolute -top-1.5 -right-1.5 h-4 min-w-4 text-[8px] px-1 flex items-center justify-center">
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="text-xs">Dashboard</TabsTrigger>
          <TabsTrigger value="submissions" className="text-xs">Envíos</TabsTrigger>
          <TabsTrigger value="adapters" className="text-xs">Conectores</TabsTrigger>
          <TabsTrigger value="receipts" className="text-xs">Acuses</TabsTrigger>
        </TabsList>

        <TabsContent value="readiness">
          <ReadinessDashboard companyId={companyId} adapters={hub.adapters} />
        </TabsContent>
        <TabsContent value="dry-run">
          <PreparatoryDryRunPanel companyId={companyId} />
        </TabsContent>
        <TabsContent value="approvals">
          <PreRealApprovalPanel companyId={companyId} />
        </TabsContent>
        <TabsContent value="dashboard">
          {/* Show compact alerts in Dashboard tab */}
          <div className="space-y-4">
            <ProactiveAlertsSummaryWidget
              summary={proactiveAlerts.summary}
              isEvaluating={proactiveAlerts.isEvaluating}
              lastEvaluatedAt={proactiveAlerts.lastEvaluatedAt}
              onAcknowledge={proactiveAlerts.acknowledge}
              onDismiss={proactiveAlerts.dismiss}
            />
            <IntegrationsHubDashboard stats={hub.stats} submissions={hub.submissions} adapters={hub.adapters} onRefresh={hub.loadAll} isLoading={hub.isLoading} />
          </div>
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
