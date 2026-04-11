/**
 * Módulo de Recursos Humanos - HRModule
 * Gestión integral: nóminas, vacaciones, contratos, finiquitos, departamentos
 * @updated 2026-04-05
 * REFACTOR: All domain panels lazy-loaded to prevent 503 chunk failures
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Users, 
  Calendar, 
  FileText, 
  DollarSign, 
  AlertTriangle,
  Shield
} from 'lucide-react';
import { useERPContext } from '@/hooks/erp';
import { supabase } from '@/integrations/supabase/client';
import { HRNavigationMenu } from './HRNavigationMenu';
import { HRCockpitHeader } from './HRCockpitHeader';
import { HREnvironmentProvider, useHREnvironment } from '@/contexts/HREnvironmentContext';
import { HREnvironmentBanner } from './shared/HREnvironmentBanner';
import { HRCommandPalette } from './shared/HRCommandPalette';
import { useHRPremiumReseed, type SeedPhase } from '@/hooks/admin/hr/useHRPremiumReseed';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Loader2 as Spin, AlertCircle as AlertC, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { UtilitySection } from './premium-dashboard/HRUtilitiesNavigation';

// ─── ALL panels lazy-loaded ──────────────────────────────────
import {
  LazyHREmployeesPanel,
  LazyHRDepartmentsPanel,
  LazyHREmployeeExpedient,
  LazyHRContractsPanel,
  LazyHRSeveranceCalculatorDialog,
  LazyHRIndemnizationCalculatorDialog,
  LazyHRPayrollPanel,
  LazyHRPayrollRecalculationPanel,
  LazyHRSocialBenefitsPanel,
  LazyHRSettlementsPanel,
  LazyHRPayrollEntryDialog,
  LazyHRSocialSecurityPanel,
  LazyHRCNAEIntelligencePanel,
  LazyHRSafetyPanel,
  LazyHRRegulatoryWatchPanel,
  LazyHRLegalComplianceDashboard,
  LazyHRLegalEnginePanel,
  LazyComplianceReportingPanel,
  LazyHRUnionsPanel,
  LazyDocumentExpedientModule,
  LazyHREmployeeDocumentsPanel,
  LazyHRHelpIndex,
  LazyHRVacationsPanel,
  LazyHRTimeClockPanel,
  LazyHRAlertsPanel,
  LazyHRVacationRequestDialog,
  LazyHRRecruitmentPanel,
  LazyHROnboardingPanel,
  LazyHROffboardingPanel,
  LazyHRPerformancePanel,
  LazyHRTrainingPanel,
  LazyHRSkillsMatrixPanel,
  LazyHRInternalMarketplacePanel,
  LazyHRSuccessionPlanningPanel,
  LazyHRTalentIntelligencePanel,
  LazyHRRoleExperiencePanel,
  LazyHRExecutiveDashboard,
  LazyHRAdvancedAnalyticsPanel,
  LazyPeopleAnalyticsModule,
  LazyHRAnalyticsIntelligencePanel,
  LazyHRAnalyticsBIPremiumPanel,
  LazyHRReportingEnginePanel,
  LazyHRBoardPackPanel,
  LazyHRAIControlCenter,
  LazyHRAIAgentPanel,
  LazyMultiAgentSupervisorPanel,
  LazyHRKnowledgeUploader,
  LazyHRDemoSeedPanel,
  LazyHRContractExpiryWidget,
  LazyHRContractExpiryReport,
  LazyHRCopilotTwinPanel,
  LazyHRDigitalTwinPanel,
  LazyHRAIGovernancePanel,
  LazyHRNewsPanel,
  LazyHRTrends2026Panel,
  LazyHRIntegrationDashboard,
  LazyHREnterpriseDashboard,
  LazyHRLegalEntitiesPanel,
  LazyHRWorkCentersPanel,
  LazyHROrgStructurePanel,
  LazyHRCalendarsPanel,
  LazyHRRolesPermissionsPanel,
  LazyHRAuditTrailPanel,
  LazyHRWorkflowDesigner,
  LazyHRApprovalInbox,
  LazyHRSLADashboard,
  LazyHRComplianceEnterprisePanel,
  LazyAdvisoryDashboardPanel,
  LazyControlTowerPanel,
  LazyHRLaborCopilotPanel,
  LazyHRLaborDigitalTwinPanel,
  LazyHRCompensationSuitePanel,
  LazyHRWellbeingEnterprisePanel,
  LazyHRESGSelfServicePanel,
  LazyHRSecurityGovernancePanel,
  LazyHRWorkforcePlanningPanel,
  LazyHRFairnessEnginePanel,
  LazyHRPremiumExecutiveDashboard,
  LazyHRPremiumAlertsPanel,
  LazyHRPremiumActivityFeed,
  LazyHRPremiumSettingsPanel,
  LazyHRPremiumHealthCheckPanel,
  LazyHRPremiumExportPanel,
  LazyHRPremiumHelpCenter,
  LazyHROrchestrationPanel,
  LazyHRComplianceAutomationPanel,
  LazyHRUtilitiesNavigation,
  LazyPremiumAPIWebhooksPanel,
  LazyEnterpriseIntegrationsPanel,
  LazyHRCountryRegistryPanel,
  LazyHRLeaveIncidentsPanel,
  LazyHRPayrollPeriodsPanel,
  LazyHRComplianceEvidencePanel,
  LazyHRTasksModule,
  LazyOfficialIntegrationsHub,
  LazyGlobalMobilityModule,
  LazyHRPayrollEngine,
  LazyESLocalizationPlugin,
  LazyHRAdminPortal,
  LazyHRDemoJourneyPanel,
  LazyHRPilotOnboardingPanel,
  LazyHRPayrollReconciliationPanel,
  LazyUnifiedAuditGenerator,
  LazyAIUnifiedDashboard,
  LazySymbolicValuesPanel,
  LazyIRPFMotorPanel,
  LazyBankAccountsPanel,
  LazyGovernanceCockpit,
  LazyPredictiveAuditPanel,
  LazyGarnishmentSimulator,
  LazyPayrollPreflightCockpit,
} from './HRModuleLazy';

function PremiumReseedPanel({ companyId }: { companyId?: string }) {
  const { phases, isRunning, progress, runReseed, reset } = useHRPremiumReseed();
  const statusIcon = (s: SeedPhase['status']) => {
    if (s === 'done') return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    if (s === 'running') return <Spin className="h-4 w-4 animate-spin text-primary" />;
    if (s === 'error') return <AlertC className="h-4 w-4 text-destructive" />;
    return <div className="h-4 w-4 rounded-full border border-muted-foreground/30" />;
  };
  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        Regenera los datos demo de las 8 fases Premium HR con company_id UUID correcto.
      </p>
      <div className="flex items-center gap-3">
        <Button onClick={() => runReseed(companyId)} disabled={isRunning} size="sm">
          <Play className="h-4 w-4 mr-1" /> {isRunning ? 'Ejecutando…' : 'Ejecutar Reseed'}
        </Button>
        {progress > 0 && <Progress value={progress} className="flex-1 h-2" />}
        {!isRunning && progress === 100 && (
          <Button variant="ghost" size="sm" onClick={reset}>Reiniciar</Button>
        )}
      </div>
      <div className="grid gap-1.5 text-sm">
        {phases.map(p => (
          <div key={p.id} className="flex items-center gap-2">
            {statusIcon(p.status)}
            <span className={p.status === 'done' ? 'text-muted-foreground line-through' : ''}>{p.label}</span>
            {p.status === 'error' && p.error && (
              <span className="text-destructive text-xs ml-auto">{p.error}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function HRModuleInner() {
  const [activeModule, setActiveModule] = useState('dashboard');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [navigationContext, setNavigationContext] = useState<Record<string, any> | null>(null);

  const handleNavigateWithContext = useCallback((module: string, context?: Record<string, any>) => {
    setNavigationContext(context || null);
    setActiveModule(module);
  }, []);
  const { currentCompany } = useERPContext();
  const { isAdmin } = useAuth();
  const companyId = currentCompany?.id;
  const [companyCNAE, setCompanyCNAE] = useState<string | undefined>();

  // Fetch primary CNAE for the company
  useEffect(() => {
    if (!companyId) return;
    supabase
      .from('erp_hr_cnae_sector_profiles')
      .select('cnae_code')
      .eq('company_id', companyId)
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.cnae_code) {
          setCompanyCNAE(data.cnae_code);
        }
      });
  }, [companyId]);
  
  // Estados para dialogs
  const [showPayrollDialog, setShowPayrollDialog] = useState(false);
  const [showVacationDialog, setShowVacationDialog] = useState(false);
  const [showSeveranceDialog, setShowSeveranceDialog] = useState(false);
  const [showIndemnizationDialog, setShowIndemnizationDialog] = useState(false);

  // Navegación desde HelpIndex
  const handleHelpNavigate = useCallback((section: string) => {
    const tabMapping: Record<string, string> = {
      'dashboard': 'dashboard',
      'nominas': 'payroll',
      'nominas.conceptos': 'payroll',
      'nominas.calculo': 'payroll',
      'seguridad_social': 'ss',
      'seguridad_social.cotizaciones': 'ss',
      'seguridad_social.red': 'ss',
      'vacaciones': 'vacations',
      'vacaciones.solicitud': 'vacations',
      'contratos': 'contracts',
      'sindicatos': 'unions',
      'documentos': 'documents',
      'organizacion': 'departments',
      'prl': 'safety',
      'agente_ia': 'agent',
      'normativa': 'knowledge',
      'reclutamiento': 'recruitment',
      'reclutamiento.ofertas': 'recruitment',
      'reclutamiento.candidatos': 'recruitment',
      'onboarding': 'onboarding',
    };

    const targetTab = tabMapping[section] || section;
    if (targetTab) {
      setActiveModule(targetTab);
    }
  }, []);

  // Stats dinámicas desde Supabase
  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeContracts: 0,
    pendingVacations: 0,
    pendingPayrolls: 0,
    expiringContracts: 0,
    safetyAlerts: 0
  });

  useEffect(() => {
    if (!companyId) return;

    const fetchStatsDirectly = async () => {
      try {
        const [empRes, contractRes, vacRes, payRes] = await Promise.all([
          supabase.from('erp_hr_employees').select('id', { count: 'exact', head: true }).eq('company_id', companyId).eq('status', 'active'),
          supabase.from('erp_hr_contracts').select('id', { count: 'exact', head: true }).eq('company_id', companyId).eq('is_active', true),
          supabase.from('erp_hr_leave_requests').select('id', { count: 'exact', head: true }).eq('company_id', companyId).eq('status', 'pending_dept'),
          supabase.from('erp_hr_payrolls').select('id', { count: 'exact', head: true }).eq('company_id', companyId).eq('status', 'draft'),
        ]);
        setStats({
          totalEmployees: empRes.count || 0,
          activeContracts: contractRes.count || 0,
          pendingVacations: vacRes.count || 0,
          pendingPayrolls: payRes.count || 0,
          expiringContracts: 0,
          safetyAlerts: 0
        });
      } catch {
        // Keep zeros on error
      }
    };

    const fetchStats = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('erp-hr-ai-agent', {
          body: {
            action: 'get_dashboard_stats',
            companyId,
            context: { companyId }
          }
        });

        if (error) throw error;

        if (data?.success && data?.data) {
          setStats({
            totalEmployees: data.data.totalEmployees || 0,
            activeContracts: data.data.activeContracts || 0,
            pendingVacations: data.data.pendingVacations || 0,
            pendingPayrolls: data.data.pendingPayrolls || 0,
            expiringContracts: data.data.expiringContracts || 0,
            safetyAlerts: data.data.safetyAlerts || 0
          });
        } else {
          await fetchStatsDirectly();
        }
      } catch (error) {
        console.error('Error fetching HR stats:', error);
        await fetchStatsDirectly();
      }
    };

    fetchStats();
  }, [companyId]);

  // Guard: no company selected (after all hooks)
  if (!companyId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <Users className="h-12 w-12 mx-auto text-muted-foreground/40" />
          <h3 className="text-lg font-semibold text-foreground">Selecciona una empresa</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Para acceder al módulo de RRHH, selecciona una empresa desde el selector superior.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Environment Banner */}
      <HREnvironmentBanner />

      {/* Cockpit Header — ERP-style contextual bar */}
      <HRCockpitHeader
        companyName={currentCompany?.name}
        companyId={companyId}
        onSearch={() => {
          // Trigger command palette via Cmd+K simulation
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
        }}
        onClear={() => {
          setSelectedEmployeeId(null);
          setActiveModule('dashboard');
        }}
        onRefresh={() => window.location.reload()}
        onHelp={() => setActiveModule('help')}
        onViewHistory={() => setActiveModule('audit-trail')}
      />

      {/* Command Palette (Cmd+K) */}
      <HRCommandPalette
        onNavigate={(moduleId) => setActiveModule(moduleId)}
        onAction={(actionId) => {
          if (actionId === 'new-payroll') setShowPayrollDialog(true);
          if (actionId === 'request-vacation') setShowVacationDialog(true);
        }}
      />

      {/* Header con estadísticas rápidas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">Empleados</p>
                <p className="text-lg font-bold">{stats.totalEmployees}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-xs text-muted-foreground">Contratos</p>
                <p className="text-lg font-bold">{stats.activeContracts}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-amber-500" />
              <div>
                <p className="text-xs text-muted-foreground">Vacaciones</p>
                <p className="text-lg font-bold">{stats.pendingVacations}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-xs text-muted-foreground">Nóminas</p>
                <p className="text-lg font-bold">{stats.pendingPayrolls}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Nueva navegación agrupada */}
      <HRNavigationMenu
        activeModule={activeModule}
        onModuleChange={setActiveModule}
        isAdmin={isAdmin}
        stats={{
          pendingPayrolls: stats.pendingPayrolls,
          pendingVacations: stats.pendingVacations,
          safetyAlerts: stats.safetyAlerts
        }}
      />

      {/* Contenido de los módulos — ALL LAZY LOADED */}
      <div className="mt-4">
        {activeModule === 'dashboard' && <LazyHRExecutiveDashboard companyId={companyId} />}
        {activeModule === 'employees' && <LazyHREmployeesPanel companyId={companyId} onOpenExpedient={(id: string) => { setSelectedEmployeeId(id); setActiveModule('employee-expedient'); }} />}
        {activeModule === 'recruitment' && <LazyHRRecruitmentPanel companyId={companyId} />}
        {activeModule === 'onboarding' && <LazyHROnboardingPanel companyId={companyId} />}
        {activeModule === 'offboarding' && <LazyHROffboardingPanel companyId={companyId} />}
        {activeModule === 'performance' && <LazyHRPerformancePanel companyId={companyId} />}
        {activeModule === 'training' && <LazyHRTrainingPanel companyId={companyId} />}
        {activeModule === 'analytics' && <LazyHRAdvancedAnalyticsPanel companyId={companyId} />}
        {activeModule === 'alerts' && <LazyHRAlertsPanel companyId={companyId} />}
        {activeModule === 'payroll' && <LazyHRPayrollPanel companyId={companyId} />}
        {activeModule === 'payroll-recalc' && <LazyHRPayrollRecalculationPanel companyId={companyId} />}
        {activeModule === 'settlements' && <LazyHRSettlementsPanel companyId={companyId} />}
        {activeModule === 'time-clock' && <LazyHRTimeClockPanel companyId={companyId} />}
        {activeModule === 'ss' && <LazyHRSocialSecurityPanel companyId={companyId} />}
        {activeModule === 'vacations' && <LazyHRVacationsPanel companyId={companyId} />}
        {activeModule === 'contracts' && <LazyHRContractsPanel companyId={companyId} companyCNAE={companyCNAE} />}
        {activeModule === 'unions' && <LazyHRUnionsPanel companyId={companyId} />}
        {activeModule === 'documents' && <LazyHREmployeeDocumentsPanel companyId={companyId} />}
        {activeModule === 'departments' && <LazyHRDepartmentsPanel companyId={companyId} />}
        {activeModule === 'benefits' && <LazyHRSocialBenefitsPanel companyId={companyId} />}
        {activeModule === 'safety' && <LazyHRSafetyPanel companyId={companyId} />}
        {activeModule === 'agent' && <LazyHRAIAgentPanel companyId={companyId} />}
        {activeModule === 'news' && <LazyHRNewsPanel companyId={companyId} />}
        {activeModule === 'knowledge' && <LazyHRKnowledgeUploader companyId={companyId} />}
        {activeModule === 'help' && (
          <LazyHRHelpIndex 
            companyId={companyId} 
            onNavigate={handleHelpNavigate}
            onOpenPayrollDialog={() => setShowPayrollDialog(true)}
            onOpenVacationDialog={() => setShowVacationDialog(true)}
            onOpenSeveranceDialog={() => setShowSeveranceDialog(true)}
            onOpenIndemnizationDialog={() => setShowIndemnizationDialog(true)}
            onAskAgent={(question: string) => {
              setActiveModule('agent');
            }}
          />
        )}
        {activeModule === 'trends' && <LazyHRTrends2026Panel />}
        {activeModule === 'regulatory-watch' && <LazyHRRegulatoryWatchPanel companyId={companyId} />}
        {activeModule === 'legal-compliance' && <LazyHRLegalComplianceDashboard companyId={companyId} />}
        {activeModule === 'integration' && <LazyHRIntegrationDashboard companyId={companyId} />}
        {activeModule === 'demo-seed' && <LazyHRDemoSeedPanel companyId={companyId} />}
        {activeModule === 'skills-matrix' && <LazyHRSkillsMatrixPanel companyId={companyId} />}
        {activeModule === 'marketplace' && <LazyHRInternalMarketplacePanel companyId={companyId} />}
        {activeModule === 'succession' && <LazyHRSuccessionPlanningPanel companyId={companyId} />}
        {activeModule === 'analytics-intelligence' && <LazyHRAnalyticsIntelligencePanel companyId={companyId} />}
        {activeModule === 'enterprise-dashboard' && <LazyHREnterpriseDashboard companyId={companyId} />}
        {activeModule === 'advisory-portfolio' && (
          <LazyAdvisoryDashboardPanel
            onSelectCompany={(id: string) => {
              console.log('[Advisory] Switch to company:', id);
            }}
          />
        )}
        {activeModule === 'control-tower' && (
          <LazyControlTowerPanel
            onNavigateToCompany={(id: string) => console.log('[ControlTower] Navigate to company:', id)}
            onNavigateToModule={(moduleId: string) => setActiveModule(moduleId)}
          />
        )}
        {activeModule === 'legal-entities' && <LazyHRLegalEntitiesPanel companyId={companyId} />}
        {activeModule === 'work-centers' && <LazyHRWorkCentersPanel companyId={companyId} />}
        {activeModule === 'org-structure' && <LazyHROrgStructurePanel companyId={companyId} />}
        {activeModule === 'work-calendars' && <LazyHRCalendarsPanel companyId={companyId} />}
        {activeModule === 'enterprise-roles' && <LazyHRRolesPermissionsPanel companyId={companyId} />}
        {activeModule === 'audit-trail' && <LazyHRAuditTrailPanel companyId={companyId} />}
        {activeModule === 'workflow-designer' && <LazyHRWorkflowDesigner companyId={companyId} />}
        {activeModule === 'approval-inbox' && <LazyHRApprovalInbox companyId={companyId} />}
        {activeModule === 'sla-dashboard' && <LazyHRSLADashboard companyId={companyId} />}
        {activeModule === 'compensation-suite' && <LazyHRCompensationSuitePanel companyId={companyId} />}
        {activeModule === 'talent-intelligence' && <LazyHRTalentIntelligencePanel companyId={companyId} />}
        {activeModule === 'compliance-enterprise' && <LazyHRComplianceEnterprisePanel companyId={companyId} />}
        {activeModule === 'wellbeing-enterprise' && <LazyHRWellbeingEnterprisePanel companyId={companyId} />}
        {activeModule === 'esg-selfservice' && <LazyHRESGSelfServicePanel companyId={companyId} />}
        {activeModule === 'copilot-twin' && <LazyHRCopilotTwinPanel companyId={companyId} />}
        {activeModule === 'labor-copilot' && <LazyHRLaborCopilotPanel />}
        {activeModule === 'security-governance' && <LazyHRSecurityGovernancePanel companyId={companyId} />}
        {activeModule === 'ai-governance' && <LazyHRAIGovernancePanel companyId={companyId} />}
        {activeModule === 'workforce-planning' && <LazyHRWorkforcePlanningPanel companyId={companyId} />}
        {activeModule === 'fairness-engine' && <LazyHRFairnessEnginePanel companyId={companyId} />}
        {activeModule === 'digital-twin' && <LazyHRDigitalTwinPanel companyId={companyId} />}
        {activeModule === 'labor-digital-twin' && <LazyHRLaborDigitalTwinPanel />}
        {activeModule === 'legal-engine' && <LazyHRLegalEnginePanel companyId={companyId} />}
        {activeModule === 'cnae-intelligence' && <LazyHRCNAEIntelligencePanel companyId={companyId} />}
        {activeModule === 'role-experience' && <LazyHRRoleExperiencePanel companyId={companyId} />}

        {/* Global HR Platform */}
        {activeModule === 'country-registry' && <LazyHRCountryRegistryPanel companyId={companyId} />}
        {activeModule === 'leave-incidents' && <LazyHRLeaveIncidentsPanel companyId={companyId} />}
        {activeModule === 'admin-requests' && <LazyHRAdminPortal companyId={companyId} />}
        {activeModule === 'hr-tasks' && <LazyHRTasksModule companyId={companyId} />}
        {activeModule === 'official-submissions' && <LazyOfficialIntegrationsHub companyId={companyId} />}
        {activeModule === 'mobility-assignments' && <LazyGlobalMobilityModule companyId={companyId} />}
        {activeModule === 'mobility-dashboard' && <LazyGlobalMobilityModule companyId={companyId} />}
        {activeModule === 'mobility-international' && <LazyGlobalMobilityModule companyId={companyId} />}
        {activeModule === 'payroll-periods' && <LazyHRPayrollPeriodsPanel companyId={companyId} />}
        {activeModule === 'payroll-engine' && <LazyHRPayrollEngine companyId={companyId} />}
        {activeModule === 'compliance-evidence' && <LazyHRComplianceEvidencePanel companyId={companyId} />}
        {activeModule === 'document-expedient' && <LazyDocumentExpedientModule companyId={companyId} />}
        {activeModule === 'es-localization' && <LazyESLocalizationPlugin companyId={companyId} />}
        {activeModule === 'people-analytics' && <LazyPeopleAnalyticsModule companyId={companyId} />}
        {activeModule === 'contract-expiry-report' && <LazyHRContractExpiryReport companyId={companyId} />}

        {/* S8.5 Absorbed panels */}
        {activeModule === 'symbolic-values' && <LazySymbolicValuesPanel companyId={companyId} />}
        {activeModule === 'irpf-motor' && <LazyIRPFMotorPanel companyId={companyId} />}
        {activeModule === 'bank-accounts' && <LazyBankAccountsPanel companyId={companyId} />}
        {activeModule === 'governance-cockpit' && <LazyGovernanceCockpit companyId={companyId} />}
        {activeModule === 'predictive-audit' && <LazyPredictiveAuditPanel companyId={companyId} />}
        {activeModule === 'garnishment-simulator' && <LazyGarnishmentSimulator />}
        {activeModule === 'preflight' && <LazyPayrollPreflightCockpit companyId={companyId} onNavigateToModule={handleNavigateWithContext} />}

        {/* Employee Expedient */}
        {activeModule === 'employee-expedient' && selectedEmployeeId && (
          <LazyHREmployeeExpedient
            companyId={companyId}
            employeeId={selectedEmployeeId}
            mvpMode={true}
            onBack={() => {
              setSelectedEmployeeId(null);
              setActiveModule('employees');
            }}
            onNavigate={(module: string) => setActiveModule(module)}
          />
        )}
        {activeModule === 'util-grid' && (
          <LazyHRUtilitiesNavigation
            activeSection={null}
            onSectionChange={(section: UtilitySection | null) => {
              if (section) setActiveModule(section);
            }}
          />
        )}

        {/* Utilidades Premium */}
        {activeModule.startsWith('util-') && activeModule !== 'util-grid' && (
          <LazyHRUtilitiesNavigation
            activeSection={activeModule as UtilitySection}
            onSectionChange={(section: UtilitySection | null) => {
              setActiveModule(section ? section : 'util-grid');
            }}
          />
        )}

        {activeModule === 'util-premium-dash' && <LazyHRPremiumExecutiveDashboard companyId={companyId} />}
        {activeModule === 'util-orchestration' && <LazyHROrchestrationPanel companyId={companyId} />}
        {activeModule === 'util-alerts' && <LazyHRPremiumAlertsPanel companyId={companyId} />}
        {activeModule === 'util-feed' && <LazyHRPremiumActivityFeed companyId={companyId} />}
        {activeModule === 'util-settings' && <LazyHRPremiumSettingsPanel companyId={companyId} />}
        {activeModule === 'util-audit' && (
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Generador unificado de informes de auditoría para ERP, CRM o Suite Integral.
            </p>
            <LazyUnifiedAuditGenerator defaultScope="erp" />
          </div>
        )}
        {activeModule === 'util-ai-hybrid' && <LazyAIUnifiedDashboard />}
        {activeModule === 'util-health' && <LazyHRPremiumHealthCheckPanel companyId={companyId} />}
        {activeModule === 'util-export' && <LazyHRPremiumExportPanel companyId={companyId} />}
        {activeModule === 'util-seed' && <LazyHRDemoSeedPanel companyId={companyId} />}
        {activeModule === 'util-demo-journey' && <LazyHRDemoJourneyPanel companyId={companyId} onNavigate={(moduleId: string) => setActiveModule(moduleId)} />}
        {activeModule === 'util-pilot-checklist' && <LazyHRPilotOnboardingPanel companyId={companyId} />}
        {activeModule === 'util-payroll-reconciliation' && <LazyHRPayrollReconciliationPanel companyId={companyId} />}
        {activeModule === 'util-help' && <LazyHRPremiumHelpCenter />}
        {activeModule === 'util-compliance' && <LazyHRComplianceAutomationPanel companyId={companyId} />}
        {activeModule === 'util-analytics-bi' && <LazyHRAnalyticsBIPremiumPanel companyId={companyId} />}
        {activeModule === 'util-reporting' && <LazyHRReportingEnginePanel companyId={companyId} />}
        {activeModule === 'util-regulatory' && <LazyComplianceReportingPanel companyId={companyId} />}
        {activeModule === 'util-api-webhooks' && <LazyPremiumAPIWebhooksPanel companyId={companyId} />}
        {activeModule === 'util-integrations' && <LazyEnterpriseIntegrationsPanel companyId={companyId} />}
        {activeModule === 'util-board-pack' && <LazyHRBoardPackPanel companyId={companyId} />}
        {activeModule === 'util-multiagent-supervisor' && <LazyMultiAgentSupervisorPanel companyId={companyId} />}
        {activeModule === 'util-ai-control-center' && <LazyHRAIControlCenter companyId={companyId} />}
      </div>

      {/* Dialogs globales */}
      <LazyHRPayrollEntryDialog
        open={showPayrollDialog}
        onOpenChange={setShowPayrollDialog}
        companyId={companyId}
        month="2026-02"
      />

      <LazyHRVacationRequestDialog
        open={showVacationDialog}
        onOpenChange={setShowVacationDialog}
        companyId={companyId}
      />

      <LazyHRSeveranceCalculatorDialog
        open={showSeveranceDialog}
        onOpenChange={setShowSeveranceDialog}
        companyId={companyId}
      />

      <LazyHRIndemnizationCalculatorDialog
        open={showIndemnizationDialog}
        onOpenChange={setShowIndemnizationDialog}
        companyId={companyId}
      />
    </div>
  );
}

export function HRModule() {
  return (
    <HREnvironmentProvider>
      <HRModuleInner />
    </HREnvironmentProvider>
  );
}

export default HRModule;
