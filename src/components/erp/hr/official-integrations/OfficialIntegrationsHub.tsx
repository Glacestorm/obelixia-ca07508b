/**
 * OfficialIntegrationsHub — Panel principal de integraciones oficiales
 * V2-ES.8 T8: + Sandbox real controlado tab + Environment indicator
 * V2-RRHH-P4C: + P4 Artifacts tab + Monthly Package tab
 * V2-RRHH-PINST-B1: + Cadena Institucional tab + Pipeline 190 tab
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useOfficialIntegrationsHub } from '@/hooks/erp/hr/useOfficialIntegrationsHub';
import { IntegrationsHubDashboard } from './IntegrationsHubDashboard';
import { SubmissionsList } from './SubmissionsList';
import { SubmissionForm } from './SubmissionForm';
import { SubmissionDetail } from './SubmissionDetail';
import { AdaptersPanel } from './AdaptersPanel';
import { ReceiptsPanel } from './ReceiptsPanel';
import { ExportHubPanel } from './ExportHubPanel';
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
import { SandboxControlPanel } from './SandboxControlPanel';
import { EnvironmentIndicatorWidget } from './EnvironmentIndicatorWidget';
import { useSandboxEnvironment } from '@/hooks/erp/hr/useSandboxEnvironment';
import { P4ArtifactsPanel } from '@/components/erp/hr/official/P4ArtifactsPanel';
import { MonthlyPackageTab } from '@/components/erp/hr/official/MonthlyPackageTab';
import { InstitutionalSubmissionPanel } from '@/components/erp/hr/official/InstitutionalSubmissionPanel';
import { Modelo190PipelinePanel } from '@/components/erp/hr/official/Modelo190PipelinePanel';
import { useInstitutionalSubmission } from '@/hooks/erp/hr/useInstitutionalSubmission';
import { HRFilingsPanel, HRFileGeneratorPanel } from '@/components/hr/filings';
import { LastMileOperationsDashboard } from './LastMileOperationsDashboard';
import { OrganismReadinessPanel } from './OrganismReadinessPanel';
import { useCredentialOnboarding } from '@/hooks/erp/hr/useCredentialOnboarding';
interface Props { companyId: string; }

export function OfficialIntegrationsHub({ companyId }: Props) {
  const [activeTab, setActiveTab] = useState('readiness');
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [filingsRefreshKey, setFilingsRefreshKey] = useState(0);
  const handleFileGenerated = useCallback(() => setFilingsRefreshKey(k => k + 1), []);

  const hub = useOfficialIntegrationsHub(companyId);
  const { pendingCount, approvals, fetchApprovals } = usePreRealApproval(companyId);
  const sandboxEnv = useSandboxEnvironment({ companyId, adapters: hub.adapters });
  const { submissions: instSubmissions } = useInstitutionalSubmission(companyId);
  const activeInstCount = useMemo(() =>
    instSubmissions.filter(s => !['reconciled', 'cancelled'].includes(s.institutional_status)).length,
    [instSubmissions]
  );

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
      {/* Environment indicator */}
      <div className="flex items-center justify-between">
        <EnvironmentIndicatorWidget
          activeEnvironment={sandboxEnv.activeEnvironment}
          productionBlocked={sandboxEnv.productionBlocked}
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap gap-1 h-auto p-1">
          <TabsTrigger value="readiness" className="text-xs relative">
            Readiness
            {activeAlertCount > 0 && activeTab !== 'readiness' && (
              <Badge variant="destructive" className="absolute -top-1.5 -right-1.5 h-4 min-w-4 text-[8px] px-1 flex items-center justify-center">
                {activeAlertCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="p4-artifacts" className="text-xs">Artefactos P4</TabsTrigger>
          <TabsTrigger value="institutional-chain" className="text-xs relative">
            Cadena Institucional
            {activeInstCount > 0 && (
              <Badge variant="secondary" className="absolute -top-1.5 -right-1.5 h-4 min-w-4 text-[8px] px-1 flex items-center justify-center">
                {activeInstCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="pipeline-190" className="text-xs">Pipeline 190</TabsTrigger>
          <TabsTrigger value="monthly-package" className="text-xs">Paquete Mensual</TabsTrigger>
          <TabsTrigger value="dry-run" className="text-xs">Dry-Run</TabsTrigger>
          <TabsTrigger value="sandbox" className="text-xs">Sandbox</TabsTrigger>
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
          <TabsTrigger value="ficheros-tgss" className="text-xs">Ficheros TGSS</TabsTrigger>
          <TabsTrigger value="ultima-milla" className="text-xs">Última Milla</TabsTrigger>
          <TabsTrigger value="go-live" className="text-xs relative">
            Go-Live
            <Badge variant="outline" className="absolute -top-1.5 -right-1.5 h-4 min-w-4 text-[8px] px-1 flex items-center justify-center">
              0/5
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="export" className="text-xs">Exportación</TabsTrigger>
        </TabsList>

        <TabsContent value="readiness">
          <ReadinessDashboard companyId={companyId} adapters={hub.adapters} />
        </TabsContent>
        <TabsContent value="p4-artifacts">
          <P4ArtifactsPanel companyId={companyId} />
        </TabsContent>
        <TabsContent value="institutional-chain">
          <InstitutionalSubmissionPanel companyId={companyId} />
        </TabsContent>
        <TabsContent value="pipeline-190">
          <Modelo190PipelinePanel companyId={companyId} />
        </TabsContent>
        <TabsContent value="monthly-package">
          <MonthlyPackageTab companyId={companyId} />
        </TabsContent>
        <TabsContent value="dry-run">
          <PreparatoryDryRunPanel companyId={companyId} />
        </TabsContent>
        <TabsContent value="sandbox">
          <SandboxControlPanel companyId={companyId} adapters={hub.adapters} />
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
        <TabsContent value="export">
          <ExportHubPanel companyId={companyId} adapters={hub.adapters} />
        </TabsContent>
        <TabsContent value="ultima-milla">
          <LastMileOperationsDashboard companyId={companyId} />
        </TabsContent>
        <TabsContent value="go-live">
          <OrganismReadinessPanel companyId={companyId} />
        </TabsContent>
        <TabsContent value="ficheros-tgss">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <HRFileGeneratorPanel
              companyId={companyId}
              onGenerated={handleFileGenerated}
              className="xl:col-span-1"
            />
            <HRFilingsPanel
              key={filingsRefreshKey}
              companyId={companyId}
              className="xl:col-span-2"
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
