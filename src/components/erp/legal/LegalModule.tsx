/**
 * Módulo Jurídico ERP - LegalModule
 * Gestión integral: asesoría legal IA, compliance multi-jurisdiccional, 
 * documentos legales, base de conocimiento, análisis de contratos
 * 
 * Jurisdicciones: Andorra (AD), España (ES), Europa (EU), Internacional (INT)
 * Agentes IA especializados: Laboral, Mercantil, Fiscal, Protección de Datos, Bancario
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Scale, 
  FileText, 
  Shield, 
  BookOpen, 
  AlertTriangle,
  TrendingUp
} from 'lucide-react';
import { useERPContext } from '@/hooks/erp';
import { supabase } from '@/integrations/supabase/client';
import { LegalNavigationMenu } from './LegalNavigationMenu';
import { LegalExecutiveDashboard } from './LegalExecutiveDashboard';
import { LegalAdvisorPanel } from './LegalAdvisorPanel';
import { LegalCompliancePanel } from './LegalCompliancePanel';
import { LegalDocumentsPanel } from './LegalDocumentsPanel';
import { LegalKnowledgePanel } from './LegalKnowledgePanel';
import { LegalAgentActivityPanel } from './LegalAgentActivityPanel';
import { LegalContractAnalysisPanel } from './LegalContractAnalysisPanel';
import { LegalRiskAssessmentPanel } from './LegalRiskAssessmentPanel';
import { LegalNewsPanel } from './LegalNewsPanel';
import { LegalTrends2026Panel } from './LegalTrends2026Panel';
import { LegalDueDiligencePanel } from './LegalDueDiligencePanel';
import { LegalAuditTrailPanel } from './LegalAuditTrailPanel';
import { LegalComplianceReportPanel } from './LegalComplianceReportPanel';
import { LegalRiskReportPanel } from './LegalRiskReportPanel';
import { LegalRegulationImpactPanel } from './LegalRegulationImpactPanel';
// Fase 10: Gateway de Validación Legal
import { LegalValidationGatewayPanel } from './LegalValidationGatewayPanel';
import { LegalAgentSupervisorPanel } from './LegalAgentSupervisorPanel';
import { LegalComplianceAPIPanel } from './LegalComplianceAPIPanel';

export function LegalModule() {
  const [activeModule, setActiveModule] = useState('dashboard');
  const { currentCompany } = useERPContext();
  const companyId = currentCompany?.id;

  // Stats dinámicas
  const [usingFallback, setUsingFallback] = useState(false);
  const [stats, setStats] = useState({
    complianceScore: 0,
    pendingReviews: 0,
    activeContracts: 0,
    riskAlerts: 0,
    knowledgeItems: 0,
    agentQueries: 0
  });

  useEffect(() => {
    if (!companyId) return;
    const fetchStats = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('legal-ai-advisor', {
          body: {
            action: 'get_dashboard_stats',
            context: { companyId }
          }
        });

        if (error) throw error;

        if (data?.success && data?.data) {
          setStats({
            complianceScore: data.data.complianceScore || 0,
            pendingReviews: data.data.pendingReviews || 0,
            activeContracts: data.data.activeContracts || 0,
            riskAlerts: data.data.riskAlerts || 0,
            knowledgeItems: data.data.knowledgeItems || 0,
            agentQueries: data.data.agentQueries || 0
          });
      } else {
          // Fallback demo data
          setStats({
            complianceScore: 87,
            pendingReviews: 5,
            activeContracts: 23,
            riskAlerts: 2,
            knowledgeItems: 156,
            agentQueries: 42
          });
          setUsingFallback(true);
        }
      } catch (error) {
        console.error('Error fetching legal stats:', error);
        // Fallback demo data
        setStats({
          complianceScore: 87,
          pendingReviews: 5,
          activeContracts: 23,
          riskAlerts: 2,
          knowledgeItems: 156,
          agentQueries: 42
        });
        setUsingFallback(true);
      }
    };

    fetchStats();
  }, [companyId]);

  if (!companyId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <Scale className="h-12 w-12 mx-auto text-muted-foreground/40" />
          <h3 className="text-lg font-semibold text-foreground">Selecciona una empresa</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Para acceder al módulo Jurídico, selecciona una empresa desde el selector superior.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header con estadísticas rápidas */}
      {usingFallback && (
        <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
          <AlertTriangle className="h-3 w-3" />
          <span>Estadísticas de ejemplo — no se pudo conectar al servicio de IA</span>
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Card className="bg-gradient-to-br from-indigo-500/10 to-indigo-600/5 border-indigo-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-indigo-500" />
              <div>
                <p className="text-xs text-muted-foreground">Compliance</p>
                <p className="text-lg font-bold">{stats.complianceScore}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-amber-500" />
              <div>
                <p className="text-xs text-muted-foreground">Revisiones</p>
                <p className="text-lg font-bold">{stats.pendingReviews}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-xs text-muted-foreground">Contratos</p>
                <p className="text-lg font-bold">{stats.activeContracts}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <div>
                <p className="text-xs text-muted-foreground">Alertas</p>
                <p className="text-lg font-bold">{stats.riskAlerts}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-xs text-muted-foreground">Conocimiento</p>
                <p className="text-lg font-bold">{stats.knowledgeItems}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border-cyan-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-cyan-500" />
              <div>
                <p className="text-xs text-muted-foreground">Consultas IA</p>
                <p className="text-lg font-bold">{stats.agentQueries}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navegación agrupada */}
      <LegalNavigationMenu
        activeModule={activeModule}
        onModuleChange={setActiveModule}
        stats={{
          pendingReviews: stats.pendingReviews,
          riskAlerts: stats.riskAlerts
        }}
      />

      {/* Contenido de los módulos */}
      <div className="mt-4">
        {activeModule === 'dashboard' && <LegalExecutiveDashboard companyId={companyId} />}
        {activeModule === 'advisor' && <LegalAdvisorPanel companyId={companyId} />}
        {activeModule === 'compliance' && <LegalCompliancePanel companyId={companyId} />}
        {activeModule === 'documents' && <LegalDocumentsPanel companyId={companyId} />}
        {activeModule === 'contracts' && <LegalContractAnalysisPanel companyId={companyId} />}
        {activeModule === 'knowledge' && <LegalKnowledgePanel companyId={companyId} />}
        {activeModule === 'risk' && <LegalRiskAssessmentPanel companyId={companyId} />}
        {activeModule === 'activity' && <LegalAgentActivityPanel companyId={companyId} />}
        {activeModule === 'news' && <LegalNewsPanel companyId={companyId} />}
        {activeModule === 'trends' && <LegalTrends2026Panel />}
        {/* Fase 9: Reportes y Auditoría */}
        {activeModule === 'due-diligence' && <LegalDueDiligencePanel companyId={companyId} />}
        {activeModule === 'compliance-report' && <LegalComplianceReportPanel companyId={companyId} />}
        {activeModule === 'risk-report' && <LegalRiskReportPanel companyId={companyId} />}
        {activeModule === 'audit-trail' && <LegalAuditTrailPanel companyId={companyId} />}
        {activeModule === 'regulation-impact' && <LegalRegulationImpactPanel companyId={companyId} />}
        {/* Fase 10: Gateway de Validación Legal Cross-Module */}
        {activeModule === 'validation-gateway' && <LegalValidationGatewayPanel companyId={companyId} />}
        {activeModule === 'agent-supervisor' && <LegalAgentSupervisorPanel companyId={companyId} />}
        {activeModule === 'compliance-api' && <LegalComplianceAPIPanel companyId={companyId} />}
      </div>
    </div>
  );
}

export default LegalModule;
