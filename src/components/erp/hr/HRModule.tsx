/**
 * Módulo de Recursos Humanos - HRModule
 * Gestión integral: nóminas, vacaciones, contratos, finiquitos, departamentos
 * Base de conocimiento laboral + Agente IA + Noticias RRHH
 * 
 * FASE A: Nueva navegación agrupada en 5 categorías
 * FASE 9: Métricas dinámicas desde Supabase
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
// Sprint 4: Expanded domain barrel adoption (10 barrels active)
// D1 People
import { HREmployeesPanel, HRDepartmentsPanel, HREmployeeExpedient } from './domains/people';
// D2 Contracts
import { HRContractsPanel, HRSeveranceCalculatorDialog, HRIndemnizationCalculatorDialog } from './domains/contracts';
// D3 Payroll
import { HRPayrollPanel, HRPayrollRecalculationPanel, HRSocialBenefitsPanel, HRSettlementsPanel, HRPayrollEntryDialog } from './domains/payroll';
// D4 Social-Fiscal
import { HRSocialSecurityPanel, HRCNAEIntelligencePanel } from './domains/social-fiscal';
// D5 Compliance
import { HRSafetyPanel, HRRegulatoryWatchPanel, HRLegalComplianceDashboard, HRLegalEnginePanel, ComplianceReportingPanel, HRUnionsPanel } from './domains/compliance';
// D6 Documents
import { DocumentExpedientModule, HREmployeeDocumentsPanel } from './domains/documents';
// D7 Portal
import { HRHelpIndex } from './domains/portal';
// D8 Workflows
import { HRVacationsPanel, HRTimeClockPanel, HRAlertsPanel, HRVacationRequestDialog, HRIncidentFormDialog } from './domains/workflows';
// D10 Talent
import { HRRecruitmentPanel, HROnboardingPanel, HROffboardingPanel, HRPerformancePanel, HRTrainingPanel, HRSkillsMatrixPanel, HRInternalMarketplacePanel, HRSuccessionPlanningPanel, HRTalentIntelligencePanel, HRRoleExperiencePanel } from './domains/talent';
// D11 Analytics
import { HRExecutiveDashboard, HRAdvancedAnalyticsPanel, PeopleAnalyticsModule, HRAnalyticsIntelligencePanel, HRAnalyticsBIPremiumPanel, HRReportingEnginePanel, HRBoardPackPanel } from './domains/analytics';
// D12 AI Tower
import { HRAIControlCenter, HRAIAgentPanel, MultiAgentSupervisorPanel, HRKnowledgeUploader, HRDemoSeedPanel, HRCopilotTwinPanel, HRDigitalTwinPanel, HRAIGovernancePanel } from './domains/ai-tower';

// Direct imports (cross-cutting, enterprise, premium — not yet in domain barrels)
import { useERPContext } from '@/hooks/erp';
import { supabase } from '@/integrations/supabase/client';
import { HRNewsPanel } from './HRNewsPanel';
import { HRTrends2026Panel } from './HRTrends2026Panel';
import { HRNavigationMenu } from './HRNavigationMenu';
import { HRIntegrationDashboard } from './integration';
import { HREnterpriseDashboard, HRLegalEntitiesPanel, HRWorkCentersPanel, HROrgStructurePanel, HRCalendarsPanel, HRRolesPermissionsPanel, HRAuditTrailPanel, HRWorkflowDesigner, HRApprovalInbox, HRSLADashboard, HRComplianceEnterprisePanel } from './enterprise';
import { AdvisoryDashboardPanel } from './advisory';
import { ControlTowerPanel } from './control-tower';
import { HRLaborCopilotPanel } from './copilot';
import { HRLaborDigitalTwinPanel } from './digital-twin-labor';
import { HRCompensationSuitePanel } from './compensation';
import { HRWellbeingEnterprisePanel } from './wellbeing/HRWellbeingEnterprisePanel';
import { HRESGSelfServicePanel } from './esg-selfservice/HRESGSelfServicePanel';
import { HRSecurityGovernancePanel } from './security-governance/HRSecurityGovernancePanel';
import { HRWorkforcePlanningPanel } from './workforce-planning/HRWorkforcePlanningPanel';
import { HRFairnessEnginePanel } from './fairness-engine/HRFairnessEnginePanel';
import { HRPremiumExecutiveDashboard, HRPremiumAlertsPanel, HRPremiumActivityFeed, HRPremiumSettingsPanel, HRPremiumHealthCheckPanel, HRPremiumExportPanel, HRPremiumHelpCenter, HROrchestrationPanel, HRComplianceAutomationPanel } from './premium-dashboard';
import { PremiumAPIWebhooksPanel } from './premium-api';
import { EnterpriseIntegrationsPanel } from './enterprise-integrations';
import { HRCountryRegistryPanel, HRLeaveIncidentsPanel, HRPayrollPeriodsPanel, HRComplianceEvidencePanel } from './global';
import { HRTasksModule } from './tasks';
import { OfficialIntegrationsHub } from './official-integrations';
import { GlobalMobilityModule } from './mobility';
import { HRPayrollEngine } from './payroll-engine';
import { ESLocalizationPlugin } from './localization/es';
import { HRAdminPortal } from './admin-portal';
import { HRCommandPalette } from './shared/HRCommandPalette';
import { HREnvironmentBanner } from './shared/HREnvironmentBanner';
import { HRDemoJourneyPanel } from './shared/HRDemoJourneyPanel';
import { HRPilotOnboardingPanel } from './shared/HRPilotOnboardingPanel';
import { HRPayrollReconciliationPanel } from './shared/HRPayrollReconciliationPanel';
import { HREnvironmentProvider, useHREnvironment } from '@/contexts/HREnvironmentContext';
import { useHRPremiumReseed, type SeedPhase } from '@/hooks/admin/hr/useHRPremiumReseed';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Loader2 as Spin, AlertCircle as AlertC, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UnifiedAuditGenerator } from '@/components/reports/UnifiedAuditGenerator';
import { AIUnifiedDashboard } from '@/components/admin/ai-hybrid';
import { HRUtilitiesNavigation, type UtilitySection } from './premium-dashboard/HRUtilitiesNavigation';

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
        <Button onClick={() => companyId && runReseed(companyId)} disabled={isRunning || !companyId} className="gap-2">
          {isRunning ? <Spin className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {isRunning ? 'Ejecutando...' : 'Ejecutar Re-Seed Premium'}
        </Button>
        {!isRunning && phases.some(p => p.status !== 'pending') && (
          <Button variant="outline" size="sm" onClick={reset}>Reset</Button>
        )}
      </div>
      {(isRunning || phases.some(p => p.status !== 'pending')) && (
        <>
          <Progress value={progress} className="h-2" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {phases.map(phase => (
              <div key={phase.id} className="flex items-center gap-2 p-2 rounded-lg border bg-card text-sm">
                {statusIcon(phase.status)}
                <span className={phase.status === 'error' ? 'text-destructive' : ''}>{phase.label}</span>
                {phase.error && <span className="text-xs text-destructive truncate ml-auto max-w-[150px]" title={phase.error}>{phase.error}</span>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function HRModuleInner() {
  const [activeModule, setActiveModule] = useState('dashboard');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const { currentCompany } = useERPContext();
  const { isAdmin } = useAuth();
  const companyId = currentCompany?.id;
  
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

      {/* Command Palette (Cmd+K) */}
      <HRCommandPalette
        onNavigate={(moduleId) => setActiveModule(moduleId)}
        onAction={(actionId) => {
          if (actionId === 'new-payroll') setShowPayrollDialog(true);
          if (actionId === 'request-vacation') setShowVacationDialog(true);
        }}
      />

      {/* Header con estadísticas rápidas — MVP: 4 cards + Cmd+K hint */}
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

      {/* Contenido de los módulos */}
      <div className="mt-4">

        {/* Renderizado condicional de contenido */}
        {activeModule === 'dashboard' && <HRExecutiveDashboard companyId={companyId} />}
        {activeModule === 'employees' && <HREmployeesPanel companyId={companyId} onOpenExpedient={(id) => { setSelectedEmployeeId(id); setActiveModule('employee-expedient'); }} />}
        {activeModule === 'recruitment' && <HRRecruitmentPanel companyId={companyId} />}
        {activeModule === 'onboarding' && <HROnboardingPanel companyId={companyId} />}
        {activeModule === 'offboarding' && <HROffboardingPanel companyId={companyId} />}
        {activeModule === 'performance' && <HRPerformancePanel companyId={companyId} />}
        {activeModule === 'training' && <HRTrainingPanel companyId={companyId} />}
        {activeModule === 'analytics' && <HRAdvancedAnalyticsPanel companyId={companyId} />}
        {activeModule === 'alerts' && <HRAlertsPanel companyId={companyId} />}
        {activeModule === 'payroll' && <HRPayrollPanel companyId={companyId} />}
        {activeModule === 'payroll-recalc' && <HRPayrollRecalculationPanel companyId={companyId} />}
        {activeModule === 'settlements' && <HRSettlementsPanel companyId={companyId} />}
        {activeModule === 'time-clock' && <HRTimeClockPanel companyId={companyId} />}
        {activeModule === 'ss' && <HRSocialSecurityPanel companyId={companyId} />}
        {activeModule === 'vacations' && <HRVacationsPanel companyId={companyId} />}
        {activeModule === 'contracts' && <HRContractsPanel companyId={companyId} />}
        {activeModule === 'unions' && <HRUnionsPanel companyId={companyId} />}
        {activeModule === 'documents' && <HREmployeeDocumentsPanel companyId={companyId} />}
        {activeModule === 'departments' && <HRDepartmentsPanel companyId={companyId} />}
        {activeModule === 'benefits' && <HRSocialBenefitsPanel companyId={companyId} />}
        {activeModule === 'safety' && <HRSafetyPanel companyId={companyId} />}
        {activeModule === 'agent' && <HRAIAgentPanel companyId={companyId} />}
        {activeModule === 'news' && <HRNewsPanel companyId={companyId} />}
        {activeModule === 'knowledge' && <HRKnowledgeUploader companyId={companyId} />}
        {activeModule === 'help' && (
          <HRHelpIndex 
            companyId={companyId} 
            onNavigate={handleHelpNavigate}
            onOpenPayrollDialog={() => setShowPayrollDialog(true)}
            onOpenVacationDialog={() => setShowVacationDialog(true)}
            onOpenSeveranceDialog={() => setShowSeveranceDialog(true)}
            onOpenIndemnizationDialog={() => setShowIndemnizationDialog(true)}
            onAskAgent={(question) => {
              setActiveModule('agent');
            }}
          />
        )}
        {activeModule === 'trends' && <HRTrends2026Panel />}
        {activeModule === 'regulatory-watch' && <HRRegulatoryWatchPanel companyId={companyId} />}
        {activeModule === 'legal-compliance' && <HRLegalComplianceDashboard companyId={companyId} />}
        {activeModule === 'integration' && <HRIntegrationDashboard companyId={companyId} />}
        {activeModule === 'demo-seed' && <HRDemoSeedPanel companyId={companyId} />}
        {activeModule === 'skills-matrix' && <HRSkillsMatrixPanel companyId={companyId} />}
        {activeModule === 'marketplace' && <HRInternalMarketplacePanel companyId={companyId} />}
        {activeModule === 'succession' && <HRSuccessionPlanningPanel companyId={companyId} />}
        {activeModule === 'analytics-intelligence' && <HRAnalyticsIntelligencePanel companyId={companyId} />}
        {activeModule === 'enterprise-dashboard' && <HREnterpriseDashboard companyId={companyId} />}
        {activeModule === 'advisory-portfolio' && (
          <AdvisoryDashboardPanel
            onSelectCompany={(id) => {
              // Switch company context via ERPCompanySelector
              console.log('[Advisory] Switch to company:', id);
            }}
          />
        )}
        {activeModule === 'control-tower' && (
          <ControlTowerPanel
            onNavigateToCompany={(id) => console.log('[ControlTower] Navigate to company:', id)}
            onNavigateToModule={(moduleId) => setActiveModule(moduleId)}
          />
        )}
        {activeModule === 'legal-entities' && <HRLegalEntitiesPanel companyId={companyId} />}
        {activeModule === 'work-centers' && <HRWorkCentersPanel companyId={companyId} />}
        {activeModule === 'org-structure' && <HROrgStructurePanel companyId={companyId} />}
        {activeModule === 'work-calendars' && <HRCalendarsPanel companyId={companyId} />}
        {activeModule === 'enterprise-roles' && <HRRolesPermissionsPanel companyId={companyId} />}
        {activeModule === 'audit-trail' && <HRAuditTrailPanel companyId={companyId} />}
        {activeModule === 'workflow-designer' && <HRWorkflowDesigner companyId={companyId} />}
        {activeModule === 'approval-inbox' && <HRApprovalInbox companyId={companyId} />}
        {activeModule === 'sla-dashboard' && <HRSLADashboard companyId={companyId} />}
        {activeModule === 'compensation-suite' && <HRCompensationSuitePanel companyId={companyId} />}
        {activeModule === 'talent-intelligence' && <HRTalentIntelligencePanel companyId={companyId} />}
        {activeModule === 'compliance-enterprise' && <HRComplianceEnterprisePanel companyId={companyId} />}
        {activeModule === 'wellbeing-enterprise' && <HRWellbeingEnterprisePanel companyId={companyId} />}
        {activeModule === 'esg-selfservice' && <HRESGSelfServicePanel companyId={companyId} />}
        {activeModule === 'copilot-twin' && <HRCopilotTwinPanel companyId={companyId} />}
        {activeModule === 'labor-copilot' && <HRLaborCopilotPanel />}
        {activeModule === 'security-governance' && <HRSecurityGovernancePanel companyId={companyId} />}
        {activeModule === 'ai-governance' && <HRAIGovernancePanel companyId={companyId} />}
        {activeModule === 'workforce-planning' && <HRWorkforcePlanningPanel companyId={companyId} />}
        {activeModule === 'fairness-engine' && <HRFairnessEnginePanel companyId={companyId} />}
        {activeModule === 'digital-twin' && <HRDigitalTwinPanel companyId={companyId} />}
        {activeModule === 'labor-digital-twin' && <HRLaborDigitalTwinPanel />}
        {activeModule === 'legal-engine' && <HRLegalEnginePanel companyId={companyId} />}
        {activeModule === 'cnae-intelligence' && <HRCNAEIntelligencePanel companyId={companyId} />}
        {activeModule === 'role-experience' && <HRRoleExperiencePanel companyId={companyId} />}

        {/* Global HR Platform - Fase G1 */}
        {activeModule === 'country-registry' && <HRCountryRegistryPanel companyId={companyId} />}

        {/* New Global Panels — N1-N5 */}
        {activeModule === 'leave-incidents' && <HRLeaveIncidentsPanel companyId={companyId} />}
        {activeModule === 'admin-requests' && <HRAdminPortal companyId={companyId} />}
        {activeModule === 'hr-tasks' && <HRTasksModule companyId={companyId} />}
        {activeModule === 'official-submissions' && <OfficialIntegrationsHub companyId={companyId} />}
        {activeModule === 'mobility-assignments' && <GlobalMobilityModule companyId={companyId} />}
        {activeModule === 'mobility-dashboard' && <GlobalMobilityModule companyId={companyId} />}
        {activeModule === 'mobility-international' && <GlobalMobilityModule companyId={companyId} />}
        {activeModule === 'payroll-periods' && <HRPayrollPeriodsPanel companyId={companyId} />}
        {activeModule === 'payroll-engine' && <HRPayrollEngine companyId={companyId} />}
        {activeModule === 'compliance-evidence' && <HRComplianceEvidencePanel companyId={companyId} />}
        {activeModule === 'document-expedient' && <DocumentExpedientModule companyId={companyId} />}
        {activeModule === 'es-localization' && <ESLocalizationPlugin companyId={companyId} />}
        {activeModule === 'people-analytics' && <PeopleAnalyticsModule companyId={companyId} />}

        {/* Employee Expedient — transversal view */}
        {activeModule === 'employee-expedient' && selectedEmployeeId && (
          <HREmployeeExpedient
            companyId={companyId}
            employeeId={selectedEmployeeId}
            mvpMode={true}
            onBack={() => {
              setSelectedEmployeeId(null);
              setActiveModule('employees');
            }}
            onNavigate={(module) => setActiveModule(module)}
          />
        )}
        {activeModule === 'util-grid' && (
          <HRUtilitiesNavigation
            activeSection={null}
            onSectionChange={(section) => {
              if (section) setActiveModule(section);
            }}
          />
        )}

        {/* Utilidades Premium — con breadcrumbs */}
        {activeModule.startsWith('util-') && activeModule !== 'util-grid' && (
          <HRUtilitiesNavigation
            activeSection={activeModule as UtilitySection}
            onSectionChange={(section) => {
              setActiveModule(section ? section : 'util-grid');
            }}
          />
        )}

        {activeModule === 'util-premium-dash' && <HRPremiumExecutiveDashboard companyId={companyId} />}
        {activeModule === 'util-orchestration' && <HROrchestrationPanel companyId={companyId} />}
        {activeModule === 'util-alerts' && <HRPremiumAlertsPanel companyId={companyId} />}
        {activeModule === 'util-feed' && <HRPremiumActivityFeed companyId={companyId} />}
        {activeModule === 'util-settings' && <HRPremiumSettingsPanel companyId={companyId} />}
        {activeModule === 'util-audit' && (
          <div className="space-y-4">
            <p className="text-muted-foreground">
              Generador unificado de informes de auditoría para ERP, CRM o Suite Integral.
            </p>
            <UnifiedAuditGenerator defaultScope="erp" />
          </div>
        )}
        {activeModule === 'util-ai-hybrid' && <AIUnifiedDashboard />}
        {activeModule === 'util-health' && <HRPremiumHealthCheckPanel companyId={companyId} />}
        {activeModule === 'util-export' && <HRPremiumExportPanel companyId={companyId} />}
        {activeModule === 'util-seed' && <HRDemoSeedPanel companyId={companyId} />}
        {activeModule === 'util-demo-journey' && <HRDemoJourneyPanel companyId={companyId} onNavigate={(moduleId) => setActiveModule(moduleId)} />}
        {activeModule === 'util-pilot-checklist' && <HRPilotOnboardingPanel companyId={companyId} />}
        {activeModule === 'util-payroll-reconciliation' && <HRPayrollReconciliationPanel companyId={companyId} />}
        {activeModule === 'util-help' && <HRPremiumHelpCenter />}
        {activeModule === 'util-compliance' && <HRComplianceAutomationPanel companyId={companyId} />}
        {activeModule === 'util-analytics-bi' && <HRAnalyticsBIPremiumPanel companyId={companyId} />}
        {activeModule === 'util-reporting' && <HRReportingEnginePanel companyId={companyId} />}
        {activeModule === 'util-regulatory' && <ComplianceReportingPanel companyId={companyId} />}
        {activeModule === 'util-api-webhooks' && <PremiumAPIWebhooksPanel companyId={companyId} />}
        {activeModule === 'util-integrations' && <EnterpriseIntegrationsPanel companyId={companyId} />}
        {activeModule === 'util-board-pack' && <HRBoardPackPanel companyId={companyId} />}
        {activeModule === 'util-multiagent-supervisor' && <MultiAgentSupervisorPanel companyId={companyId} />}
        {activeModule === 'util-ai-control-center' && <HRAIControlCenter companyId={companyId} />}
      </div>

      {/* Dialogs globales accesibles desde cualquier lugar */}
      <HRPayrollEntryDialog
        open={showPayrollDialog}
        onOpenChange={setShowPayrollDialog}
        companyId={companyId}
        month="2026-02"
      />

      <HRVacationRequestDialog
        open={showVacationDialog}
        onOpenChange={setShowVacationDialog}
        companyId={companyId}
      />

      <HRSeveranceCalculatorDialog
        open={showSeveranceDialog}
        onOpenChange={setShowSeveranceDialog}
        companyId={companyId}
      />

      <HRIndemnizationCalculatorDialog
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
