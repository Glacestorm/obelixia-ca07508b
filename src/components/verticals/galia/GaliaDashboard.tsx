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
import { useGaliaExpedientes, GaliaExpediente } from '@/hooks/galia/useGaliaExpedientes';
import { useGaliaConvocatorias } from '@/hooks/galia/useGaliaConvocatorias';
import { GaliaKPICards } from './shared/GaliaKPICards';
import { 
  GaliaResumenTab,
  GaliaExpedientesTab,
  GaliaConvocatoriasTab,
  GaliaAlertasTab,
  GaliaSidebarPanel,
  GaliaWorkflowManager, 
  GaliaAlertsList, 
  GaliaTecnicosPanel 
} from './dashboard';
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
  GaliaNationalFederationDashboard,
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
  const [selectedExpediente, setSelectedExpediente] = useState<GaliaExpediente | null>(null);
  const [workflowEstadoFilter, setWorkflowEstadoFilter] = useState<string | undefined>(undefined);
  const [showNuevaConvocatoriaModal, setShowNuevaConvocatoriaModal] = useState(false);

  const { kpis, analyticsData, isLoading: loadingAnalytics, refresh } = useGaliaAnalytics();
  const { 
    expedientes, 
    updateExpedienteEstado,
    getExpedientesConRiesgo 
  } = useGaliaExpedientes({ estado: workflowEstadoFilter as GaliaExpediente['estado'] | undefined });
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

  const handleCambiarEstado = useCallback(async (nuevoEstado: GaliaExpediente['estado']) => {
    if (selectedExpediente) {
      await updateExpedienteEstado(selectedExpediente.id, nuevoEstado);
      setSelectedExpediente(null);
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

  // Render tab content based on activeTab
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
      
      case 'gestion':
        return (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <GaliaWorkflowManager 
                selectedEstado={workflowEstadoFilter}
                onSelectEstado={(estado) => setWorkflowEstadoFilter(
                  estado === workflowEstadoFilter ? undefined : estado
                )}
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
      
      case 'alertas':
        return <GaliaAlertasTab expedientesRiesgo={expedientesRiesgo} />;
      
      case 'expedientes':
        return (
          <GaliaExpedientesTab
            expedientes={expedientes}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            selectedExpediente={selectedExpediente}
            onSelectExpediente={setSelectedExpediente}
            onCambiarEstado={handleCambiarEstado}
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
      
      case 'project-status':
        return <Suspense fallback={<TabSkeleton />}><GaliaProjectStatusDashboard /></Suspense>;
      
      case 'federation':
        return <Suspense fallback={<TabSkeleton />}><GaliaNationalFederationDashboard /></Suspense>;
      
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
            GALIA - Gestión de Ayudas LEADER
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
        {/* Left Column - Main Content */}
        <div className={cn("lg:col-span-2", showAssistant && "lg:col-span-1")}>
          <div className="bg-card rounded-xl border border-border/50 p-4 min-h-[400px]">
            {renderTabContent()}
          </div>
        </div>

        {/* Right Column - Assistant or Sidebar */}
        {showAssistant ? (
          <div className="lg:col-span-1">
            <Suspense fallback={<TabSkeleton />}>
              <GaliaAsistenteVirtual modo="tecnico" />
            </Suspense>
          </div>
        ) : (
          <GaliaSidebarPanel expedientes={expedientes} />
        )}
      </div>

      {/* Modal Nueva Convocatoria */}
      <GaliaNuevaConvocatoriaModal
        isOpen={showNuevaConvocatoriaModal}
        onClose={() => setShowNuevaConvocatoriaModal(false)}
        onCreate={createConvocatoria}
      />
    </div>
  );
}

export default GaliaDashboard;
