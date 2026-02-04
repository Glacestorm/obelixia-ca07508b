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
    const fetchStats = async () => {
      try {
        // Use edge function for safe type-independent queries
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
          // Fallback to demo data
          setStats({
            totalEmployees: 47,
            activeContracts: 45,
            pendingVacations: 8,
            pendingPayrolls: 3,
            expiringContracts: 2,
            safetyAlerts: 1
          });
        }
      } catch (error) {
        console.error('Error fetching HR stats:', error);
        // Fallback to demo data on error
        setStats({
          totalEmployees: 47,
          activeContracts: 45,
          pendingVacations: 8,
          pendingPayrolls: 3,
          expiringContracts: 2,
          safetyAlerts: 1
        });
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
