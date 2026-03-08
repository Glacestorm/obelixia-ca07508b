/**
 * Módulo de Recursos Humanos - HRModule
 * Gestión integral: nóminas, vacaciones, contratos, finiquitos, departamentos
 * Base de conocimiento laboral + Agente IA + Noticias RRHH
 * 
 * FASE A: Nueva navegación agrupada en 5 categorías
 * FASE 9: Métricas dinámicas desde Supabase
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Users, 
  Calendar, 
  FileText, 
  DollarSign, 
  AlertTriangle,
  Shield
} from 'lucide-react';
import { HRPayrollEntryDialog } from './HRPayrollEntryDialog';
import { HRVacationRequestDialog } from './HRVacationRequestDialog';
import { useERPContext } from '@/hooks/erp';
import { supabase } from '@/integrations/supabase/client';
import { HRExecutiveDashboard } from './HRExecutiveDashboard';
import { HRPayrollPanel } from './HRPayrollPanel';
import { HRPayrollRecalculationPanel } from './HRPayrollRecalculationPanel';
import { HRVacationsPanel } from './HRVacationsPanel';
import { HRContractsPanel } from './HRContractsPanel';
import { HRDepartmentsPanel } from './HRDepartmentsPanel';
import { HRAIAgentPanel } from './HRAIAgentPanel';
import { HRNewsPanel } from './HRNewsPanel';
import { HRKnowledgeUploader } from './HRKnowledgeUploader';
import { HRTrends2026Panel } from './HRTrends2026Panel';
import { HRSafetyPanel } from './HRSafetyPanel';
import { HRSocialSecurityPanel } from './HRSocialSecurityPanel';
import { HRUnionsPanel } from './HRUnionsPanel';
import { HREmployeeDocumentsPanel } from './HREmployeeDocumentsPanel';
import { HRHelpIndex } from './HRHelpIndex';
import { HREmployeesPanel } from './HREmployeesPanel';
import { HRAlertsPanel } from './HRAlertsPanel';
import { HRSeveranceCalculatorDialog } from './HRSeveranceCalculatorDialog';
import { HRIndemnizationCalculatorDialog } from './HRIndemnizationCalculatorDialog';
import { HRSocialBenefitsPanel } from './HRSocialBenefitsPanel';
import { HRRecruitmentPanel } from './HRRecruitmentPanel';
import { HROnboardingPanel } from './HROnboardingPanel';
import { HROffboardingPanel } from './HROffboardingPanel';
import { HRPerformancePanel } from './HRPerformancePanel';
import { HRTrainingPanel } from './HRTrainingPanel';
import { HRAdvancedAnalyticsPanel } from './HRAdvancedAnalyticsPanel';
import { HRNavigationMenu } from './HRNavigationMenu';
import { HRSettlementsPanel } from './HRSettlementsPanel';
import { HRRegulatoryWatchPanel } from './HRRegulatoryWatchPanel';
import { HRLegalComplianceDashboard } from './compliance';
import { HRIntegrationDashboard } from './integration';
import { HRDemoSeedPanel } from './HRDemoSeedPanel';
import { HRSkillsMatrixPanel } from './talent/HRSkillsMatrixPanel';
import { HRInternalMarketplacePanel } from './talent/HRInternalMarketplacePanel';
import { HRSuccessionPlanningPanel } from './talent/HRSuccessionPlanningPanel';
import { HRAnalyticsIntelligencePanel } from './analytics/HRAnalyticsIntelligencePanel';
import { HRTimeClockPanel } from './HRTimeClockPanel';
import { HREnterpriseDashboard, HRLegalEntitiesPanel, HRWorkCentersPanel, HROrgStructurePanel, HRCalendarsPanel, HRRolesPermissionsPanel, HRAuditTrailPanel, HRWorkflowDesigner, HRApprovalInbox, HRSLADashboard, HRComplianceEnterprisePanel } from './enterprise';
import { HRCompensationSuitePanel } from './compensation';
import { HRTalentIntelligencePanel } from './talent/HRTalentIntelligencePanel';
import { HRWellbeingEnterprisePanel } from './wellbeing/HRWellbeingEnterprisePanel';
import { HRESGSelfServicePanel } from './esg-selfservice/HRESGSelfServicePanel';
import { HRCopilotTwinPanel } from './copilot-twin/HRCopilotTwinPanel';
import { HRSecurityGovernancePanel } from './security-governance/HRSecurityGovernancePanel';
import { HRAIGovernancePanel } from './ai-governance/HRAIGovernancePanel';
import { HRWorkforcePlanningPanel } from './workforce-planning/HRWorkforcePlanningPanel';
import { HRFairnessEnginePanel } from './fairness-engine/HRFairnessEnginePanel';
import { HRDigitalTwinPanel } from './digital-twin/HRDigitalTwinPanel';

export function HRModule() {
  const [activeModule, setActiveModule] = useState('dashboard');
  const { currentCompany } = useERPContext();
  const demoCompanyId = currentCompany?.id || 'demo-company-id';
  
  // Estados para dialogs
  const [showPayrollDialog, setShowPayrollDialog] = useState(false);
  const [showVacationDialog, setShowVacationDialog] = useState(false);
  const [showSeveranceDialog, setShowSeveranceDialog] = useState(false);
  const [showIndemnizationDialog, setShowIndemnizationDialog] = useState(false);

  // Navegación desde HelpIndex
  const handleHelpNavigate = useCallback((section: string) => {
    // Mapear códigos de sección a tabs
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
    const fetchStatsDirectly = async () => {
      try {
        const [empRes, contractRes, vacRes, payRes] = await Promise.all([
          supabase.from('erp_hr_employees').select('id', { count: 'exact', head: true }).eq('company_id', demoCompanyId).eq('status', 'active'),
          supabase.from('erp_hr_contracts').select('id', { count: 'exact', head: true }).eq('company_id', demoCompanyId).eq('is_active', true),
          supabase.from('erp_hr_leave_requests').select('id', { count: 'exact', head: true }).eq('company_id', demoCompanyId).eq('status', 'pending_dept'),
          supabase.from('erp_hr_payrolls').select('id', { count: 'exact', head: true }).eq('company_id', demoCompanyId).eq('status', 'draft'),
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
            context: { companyId: demoCompanyId }
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
  }, [demoCompanyId]);

  return (
    <div className="space-y-4">
      {/* Header con estadísticas rápidas */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
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

        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <div>
                <p className="text-xs text-muted-foreground">Vencimientos</p>
                <p className="text-lg font-bold">{stats.expiringContracts}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-red-500" />
              <div>
                <p className="text-xs text-muted-foreground">Seguridad</p>
                <p className="text-lg font-bold">{stats.safetyAlerts}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Nueva navegación agrupada */}
      <HRNavigationMenu
        activeModule={activeModule}
        onModuleChange={setActiveModule}
        stats={{
          pendingPayrolls: stats.pendingPayrolls,
          pendingVacations: stats.pendingVacations,
          safetyAlerts: stats.safetyAlerts
        }}
      />

      {/* Contenido de los módulos */}
      <div className="mt-4">

        {/* Renderizado condicional de contenido */}
        {activeModule === 'dashboard' && <HRExecutiveDashboard companyId={demoCompanyId} />}
        {activeModule === 'employees' && <HREmployeesPanel companyId={demoCompanyId} />}
        {activeModule === 'recruitment' && <HRRecruitmentPanel companyId={demoCompanyId} />}
        {activeModule === 'onboarding' && <HROnboardingPanel companyId={demoCompanyId} />}
        {activeModule === 'offboarding' && <HROffboardingPanel companyId={demoCompanyId} />}
        {activeModule === 'performance' && <HRPerformancePanel companyId={demoCompanyId} />}
        {activeModule === 'training' && <HRTrainingPanel companyId={demoCompanyId} />}
        {activeModule === 'analytics' && <HRAdvancedAnalyticsPanel companyId={demoCompanyId} />}
        {activeModule === 'alerts' && <HRAlertsPanel companyId={demoCompanyId} />}
        {activeModule === 'payroll' && <HRPayrollPanel companyId={demoCompanyId} />}
        {activeModule === 'payroll-recalc' && <HRPayrollRecalculationPanel companyId={demoCompanyId} />}
        {activeModule === 'settlements' && <HRSettlementsPanel companyId={demoCompanyId} />}
        {activeModule === 'time-clock' && <HRTimeClockPanel companyId={demoCompanyId} />}
        {activeModule === 'ss' && <HRSocialSecurityPanel companyId={demoCompanyId} />}
        {activeModule === 'vacations' && <HRVacationsPanel companyId={demoCompanyId} />}
        {activeModule === 'contracts' && <HRContractsPanel companyId={demoCompanyId} />}
        {activeModule === 'unions' && <HRUnionsPanel companyId={demoCompanyId} />}
        {activeModule === 'documents' && <HREmployeeDocumentsPanel companyId={demoCompanyId} />}
        {activeModule === 'departments' && <HRDepartmentsPanel companyId={demoCompanyId} />}
        {activeModule === 'benefits' && <HRSocialBenefitsPanel companyId={demoCompanyId} />}
        {activeModule === 'safety' && <HRSafetyPanel companyId={demoCompanyId} />}
        {activeModule === 'agent' && <HRAIAgentPanel companyId={demoCompanyId} />}
        {activeModule === 'news' && <HRNewsPanel companyId={demoCompanyId} />}
        {activeModule === 'knowledge' && <HRKnowledgeUploader companyId={demoCompanyId} />}
        {activeModule === 'help' && (
          <HRHelpIndex 
            companyId={demoCompanyId} 
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
        {activeModule === 'regulatory-watch' && <HRRegulatoryWatchPanel companyId={demoCompanyId} />}
        {activeModule === 'legal-compliance' && <HRLegalComplianceDashboard companyId={demoCompanyId} />}
        {activeModule === 'integration' && <HRIntegrationDashboard companyId={demoCompanyId} />}
        {activeModule === 'demo-seed' && <HRDemoSeedPanel companyId={demoCompanyId} />}
        {activeModule === 'skills-matrix' && <HRSkillsMatrixPanel companyId={demoCompanyId} />}
        {activeModule === 'marketplace' && <HRInternalMarketplacePanel companyId={demoCompanyId} />}
        {activeModule === 'succession' && <HRSuccessionPlanningPanel companyId={demoCompanyId} />}
        {activeModule === 'analytics-intelligence' && <HRAnalyticsIntelligencePanel companyId={demoCompanyId} />}
        {activeModule === 'enterprise-dashboard' && <HREnterpriseDashboard companyId={demoCompanyId} />}
        {activeModule === 'legal-entities' && <HRLegalEntitiesPanel companyId={demoCompanyId} />}
        {activeModule === 'work-centers' && <HRWorkCentersPanel companyId={demoCompanyId} />}
        {activeModule === 'org-structure' && <HROrgStructurePanel companyId={demoCompanyId} />}
        {activeModule === 'work-calendars' && <HRCalendarsPanel companyId={demoCompanyId} />}
        {activeModule === 'enterprise-roles' && <HRRolesPermissionsPanel companyId={demoCompanyId} />}
        {activeModule === 'audit-trail' && <HRAuditTrailPanel companyId={demoCompanyId} />}
        {activeModule === 'workflow-designer' && <HRWorkflowDesigner companyId={demoCompanyId} />}
        {activeModule === 'approval-inbox' && <HRApprovalInbox companyId={demoCompanyId} />}
        {activeModule === 'sla-dashboard' && <HRSLADashboard companyId={demoCompanyId} />}
        {activeModule === 'compensation-suite' && <HRCompensationSuitePanel companyId={demoCompanyId} />}
        {activeModule === 'talent-intelligence' && <HRTalentIntelligencePanel companyId={demoCompanyId} />}
        {activeModule === 'compliance-enterprise' && <HRComplianceEnterprisePanel companyId={demoCompanyId} />}
        {activeModule === 'wellbeing-enterprise' && <HRWellbeingEnterprisePanel companyId={demoCompanyId} />}
        {activeModule === 'esg-selfservice' && <HRESGSelfServicePanel companyId={demoCompanyId} />}
        {activeModule === 'copilot-twin' && <HRCopilotTwinPanel companyId={demoCompanyId} />}
        {activeModule === 'security-governance' && <HRSecurityGovernancePanel companyId={demoCompanyId} />}
        {activeModule === 'ai-governance' && <HRAIGovernancePanel companyId={demoCompanyId} />}
        {activeModule === 'workforce-planning' && <HRWorkforcePlanningPanel companyId={demoCompanyId} />}
        {activeModule === 'fairness-engine' && <HRFairnessEnginePanel companyId={demoCompanyId} />}
        {activeModule === 'digital-twin' && <HRDigitalTwinPanel companyId={demoCompanyId} />}
      </div>

      {/* Dialogs globales accesibles desde cualquier lugar */}
      <HRPayrollEntryDialog
        open={showPayrollDialog}
        onOpenChange={setShowPayrollDialog}
        companyId={demoCompanyId}
        month="2026-02"
      />

      <HRVacationRequestDialog
        open={showVacationDialog}
        onOpenChange={setShowVacationDialog}
        companyId={demoCompanyId}
      />

      <HRSeveranceCalculatorDialog
        open={showSeveranceDialog}
        onOpenChange={setShowSeveranceDialog}
        companyId={demoCompanyId}
      />

      <HRIndemnizationCalculatorDialog
        open={showIndemnizationDialog}
        onOpenChange={setShowIndemnizationDialog}
        companyId={demoCompanyId}
      />
    </div>
  );
}

export default HRModule;
