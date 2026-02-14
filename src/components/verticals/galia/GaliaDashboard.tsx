/**
 * GALIA Dashboard - Main Component (Refactored v2.0)
 * Gestión de Ayudas LEADER con Inteligencia Artificial
 * Navegación moderna con categorías agrupadas
 */

import { useState, lazy, Suspense, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Plus, RefreshCw, Bot } from 'lucide-react';
import { useGaliaAnalytics } from '@/hooks/galia/useGaliaAnalytics';
import { useGaliaExpedientesExtended, GaliaExpedienteExtended } from '@/hooks/galia/useGaliaExpedientesExtended';
import { useGaliaConvocatorias } from '@/hooks/galia/useGaliaConvocatorias';
import { GaliaKPICards } from './shared/GaliaKPICards';
import { 
  GaliaResumenTab,
  GaliaExpedientesTab,
  GaliaConvocatoriasTab,
  GaliaAlertasTab,
  GaliaSidebarPanel,
  GaliaAlertsList, 
  GaliaTecnicosPanel 
} from './dashboard';
import { GaliaCircuitoTramitacion } from './dashboard/GaliaCircuitoTramitacion';
import { GaliaTecnicoToolkit } from './dashboard/GaliaTecnicoToolkit';
import { GaliaFraudDetectionPanel } from './dashboard/GaliaFraudDetectionPanel';
import { GaliaDocClassificationPanel } from './dashboard/GaliaDocClassificationPanel';
import { GaliaNavigation } from './dashboard/GaliaNavigation';
import { cn } from '@/lib/utils';
import { GaliaNuevaConvocatoriaModal } from './GaliaNuevaConvocatoriaModal';

// Import lazy components from centralized file to reduce bundle size
import {
  GaliaPortalCiudadano,
  GaliaModeradorCostes,
  GaliaReportGenerator,
  GaliaDocumentAnalyzer,
  GaliaTransparencyPortal,
  GaliaDocumentGeneratorPanel,
  GaliaGeoIntelligencePanel,
  GaliaConvocatoriaSimulatorPanel,
  GaliaBeneficiario360Panel,
  GaliaBPMNWorkflowsPanel,
  GaliaAdminIntegrationsPanel,
  GaliaKnowledgeExplorer,
  GaliaExportToolbar,
  GaliaComplianceAuditor,
  GaliaProjectStatusDashboard,
  GaliaHybridAIPanel,
  GaliaTrainingCenter,
  GaliaPilotFeedback,
  GaliaNationalFederationDashboard,
  GaliaTerritorialMapPanel,
} from './dashboard/tabs/GaliaMainTabs';

const GaliaAsistenteVirtual = lazy(() => import('./GaliaAsistenteVirtual'));

const TabSkeleton = () => (
  <div className="space-y-4">
    <Skeleton className="h-32 w-full" />
    <Skeleton className="h-48 w-full" />
  </div>
);

export function GaliaDashboard() {
  const [activeTab, setActiveTab] = useState('resumen');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAssistant, setShowAssistant] = useState(false);
  const [selectedExpediente, setSelectedExpediente] = useState<GaliaExpedienteExtended | null>(null);
  const [workflowEstadoFilter, setWorkflowEstadoFilter] = useState<string | undefined>(undefined);
  const [showNuevaConvocatoriaModal, setShowNuevaConvocatoriaModal] = useState(false);

  const { kpis, analyticsData, isLoading: loadingAnalytics, refresh } = useGaliaAnalytics();
  const { 
    expedientes, 
    updateExpedienteEstado,
    getExpedientesConRiesgo 
  } = useGaliaExpedientesExtended({ estado: workflowEstadoFilter as any });
  const { 
    convocatorias, 
    getPresupuestoStats,
    createConvocatoria 
  } = useGaliaConvocatorias();

  const presupuestoStats = getPresupuestoStats();
  const expedientesRiesgo = getExpedientesConRiesgo(70);

  // Listen for tab change events from sidebar
  useEffect(() => {
    const handleTabChange = (event: CustomEvent<string>) => {
      setActiveTab(event.detail);
    };
    window.addEventListener('galia-tab-change', handleTabChange as EventListener);
    return () => window.removeEventListener('galia-tab-change', handleTabChange as EventListener);
  }, []);

  const handleCambiarEstado = useCallback(async (nuevoEstado: string) => {
    if (selectedExpediente) {
      await updateExpedienteEstado(selectedExpediente.id, nuevoEstado);
    }
  }, [selectedExpediente, updateExpedienteEstado]);

  const formatCurrency = useCallback((value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }, []);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'resumen':
        return (
          <GaliaResumenTab
            presupuestoStats={presupuestoStats}
            analyticsData={analyticsData}
            kpis={kpis}
            formatCurrency={formatCurrency}
          />
        );

      case 'circuito':
        return (
          <GaliaCircuitoTramitacion 
            estadoActual={selectedExpediente?.estado || 'incorporacion_solicitud'}
            historial={selectedExpediente?.historial_transiciones || []}
            onTransicion={handleCambiarEstado}
            readOnly={!selectedExpediente}
          />
        );
      
      case 'gestion':
        return (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <GaliaCircuitoTramitacion 
                estadoActual={selectedExpediente?.estado || 'incorporacion_solicitud'}
                historial={selectedExpediente?.historial_transiciones || []}
                onTransicion={handleCambiarEstado}
                readOnly={!selectedExpediente}
              />
              <GaliaTecnicosPanel 
                expedienteSeleccionado={selectedExpediente?.numero_expediente}
                onAsignarExpediente={(tecnicoId) => {
                  console.log('Asignar expediente a técnico:', tecnicoId);
                  toast.info(`Expediente asignado al técnico ${tecnicoId}`);
                }}
              />
            </div>
            <div className="mt-4">
              <GaliaAlertsList 
                onSelectExpediente={(expId) => {
                  const exp = expedientes.find(e => e.numero_expediente === expId);
                  if (exp) {
                    setSelectedExpediente(exp);
                    toast.info(`Expediente ${expId} seleccionado`);
                  }
                }}
              />
            </div>
          </>
        );
      
      case 'toolkit-panel':
        return <GaliaTecnicoToolkit onNavigate={setActiveTab} />;
      
      case 'alertas':
        return <GaliaAlertasTab expedientesRiesgo={expedientesRiesgo} />;
      
      case 'expedientes':
        return (
          <GaliaExpedientesTab
            expedientes={expedientes as any}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            selectedExpediente={selectedExpediente as any}
            onSelectExpediente={(exp) => setSelectedExpediente(exp as GaliaExpedienteExtended)}
            onCambiarEstado={handleCambiarEstado as any}
            workflowEstadoFilter={workflowEstadoFilter}
            formatCurrency={formatCurrency}
          />
        );
      
      case 'convocatorias':
        return <GaliaConvocatoriasTab convocatorias={convocatorias} formatCurrency={formatCurrency} />;
      
      case 'beneficiario360':
        return <Suspense fallback={<TabSkeleton />}><GaliaBeneficiario360Panel /></Suspense>;
      
      case 'costes':
        return <Suspense fallback={<TabSkeleton />}><GaliaModeradorCostes /></Suspense>;
      
      case 'documentos':
        return <Suspense fallback={<TabSkeleton />}><GaliaDocumentAnalyzer /></Suspense>;
      
      case 'docgen':
        return <Suspense fallback={<TabSkeleton />}><GaliaDocumentGeneratorPanel /></Suspense>;
      
      case 'hybrid-ai':
        return <Suspense fallback={<TabSkeleton />}><GaliaHybridAIPanel /></Suspense>;
      
      case 'knowledge':
        return <Suspense fallback={<TabSkeleton />}><GaliaKnowledgeExplorer /></Suspense>;
      
      case 'simulator':
        return <Suspense fallback={<TabSkeleton />}><GaliaConvocatoriaSimulatorPanel /></Suspense>;
      
      case 'geo':
        return <Suspense fallback={<TabSkeleton />}><GaliaGeoIntelligencePanel /></Suspense>;
      
      case 'informes':
        return <Suspense fallback={<TabSkeleton />}><GaliaReportGenerator /></Suspense>;
      
      case 'export':
        return <Suspense fallback={<TabSkeleton />}><GaliaExportToolbar expedienteId={selectedExpediente?.id} /></Suspense>;
      
      case 'bpmn':
        return <Suspense fallback={<TabSkeleton />}><GaliaBPMNWorkflowsPanel /></Suspense>;
      
      case 'integraciones':
        return <Suspense fallback={<TabSkeleton />}><GaliaAdminIntegrationsPanel /></Suspense>;
      
      case 'portal':
        return <Suspense fallback={<TabSkeleton />}><GaliaPortalCiudadano /></Suspense>;
      
      case 'transparencia':
        return <Suspense fallback={<TabSkeleton />}><GaliaTransparencyPortal /></Suspense>;
      
      case 'compliance':
        return <Suspense fallback={<TabSkeleton />}><GaliaComplianceAuditor /></Suspense>;
      
      case 'fraud-detection':
        return <GaliaFraudDetectionPanel />;
      
      case 'doc-classification':
        return <GaliaDocClassificationPanel />;
      
      case 'project-status':
        return <Suspense fallback={<TabSkeleton />}><GaliaProjectStatusDashboard /></Suspense>;
      
      case 'federation':
        return <Suspense fallback={<TabSkeleton />}><GaliaNationalFederationDashboard /></Suspense>;
      
      case 'territorial-map':
        return <Suspense fallback={<TabSkeleton />}><GaliaTerritorialMapPanel /></Suspense>;
      
      case 'training':
        return <Suspense fallback={<TabSkeleton />}><GaliaTrainingCenter /></Suspense>;
      
      case 'pilot-feedback':
        return <Suspense fallback={<TabSkeleton />}><GaliaPilotFeedback /></Suspense>;
      
      default:
        return (
          <div className="text-center py-12 text-muted-foreground">
            <p>Selecciona una opción del menú</p>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            LEADER - Gestión de Ayudas
          </h1>
          <p className="text-muted-foreground">
            Sistema inteligente de gestión de subvenciones públicas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refresh()}>
            <RefreshCw className={cn("h-4 w-4 mr-2", loadingAnalytics && "animate-spin")} />
            Actualizar
          </Button>
          <Button 
            variant={showAssistant ? "default" : "outline"} 
            size="sm"
            onClick={() => setShowAssistant(!showAssistant)}
          >
            <Bot className="h-4 w-4 mr-2" />
            Asistente IA
          </Button>
          <Button size="sm" onClick={() => setShowNuevaConvocatoriaModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Convocatoria
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <GaliaKPICards kpis={kpis} isLoading={loadingAnalytics} />

      {/* Navigation */}
      <GaliaNavigation activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={cn("lg:col-span-2", showAssistant && "lg:col-span-1")}>
          <div className="bg-card rounded-xl border border-border/50 p-4 min-h-[400px]">
            {renderTabContent()}
          </div>
        </div>

        {showAssistant ? (
          <div className="lg:col-span-1">
            <Suspense fallback={<TabSkeleton />}>
              <GaliaAsistenteVirtual modo="tecnico" />
            </Suspense>
          </div>
        ) : (
          <GaliaSidebarPanel expedientes={expedientes as any} />
        )}
      </div>

      <GaliaNuevaConvocatoriaModal
        isOpen={showNuevaConvocatoriaModal}
        onClose={() => setShowNuevaConvocatoriaModal(false)}
        onCreate={createConvocatoria}
      />
    </div>
  );
}

export default GaliaDashboard;
