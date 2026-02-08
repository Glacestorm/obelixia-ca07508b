/**
 * GALIA Dashboard - Main Component (Refactored)
 * Gestión de Ayudas LEADER con Inteligencia Artificial
 */

import { useState, lazy, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  Plus,
  RefreshCw,
  Bot,
  BarChart3,
  FolderOpen,
  FileText,
  Globe,
  Calculator,
  FileBarChart,
  FileSearch,
  LayoutDashboard,
  AlertTriangle,
  Shield,
  Sparkles,
  MapPin,
  Workflow,
  Building,
  User,
  BookOpen,
} from 'lucide-react';
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
  GaliaKnowledgeExplorer
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

  const handleCambiarEstado = async (nuevoEstado: GaliaExpediente['estado']) => {
    if (selectedExpediente) {
      await updateExpedienteEstado(selectedExpediente.id, nuevoEstado);
      setSelectedExpediente(null);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
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

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Tabs */}
        <div className={cn("lg:col-span-2", showAssistant && "lg:col-span-1")}>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="w-full overflow-x-auto pb-2">
              <TabsList className="inline-flex h-10 items-center justify-start rounded-md bg-muted p-1 text-muted-foreground w-max min-w-full">
                <TabsTrigger value="resumen" className="text-xs whitespace-nowrap">
                  <BarChart3 className="h-4 w-4 mr-1" /> Resumen
                </TabsTrigger>
                <TabsTrigger value="gestion" className="text-xs whitespace-nowrap">
                  <LayoutDashboard className="h-4 w-4 mr-1" /> Gestión
                </TabsTrigger>
                <TabsTrigger value="knowledge" className="text-xs whitespace-nowrap">
                  <BookOpen className="h-4 w-4 mr-1" /> Normativa
                </TabsTrigger>
                <TabsTrigger value="expedientes" className="text-xs whitespace-nowrap">
                  <FolderOpen className="h-4 w-4 mr-1" /> Expedientes
                </TabsTrigger>
                <TabsTrigger value="convocatorias" className="text-xs whitespace-nowrap">
                  <FileText className="h-4 w-4 mr-1" /> Convocatorias
                </TabsTrigger>
                <TabsTrigger value="portal" className="text-xs whitespace-nowrap">
                  <Globe className="h-4 w-4 mr-1" /> Portal
                </TabsTrigger>
                <TabsTrigger value="costes" className="text-xs whitespace-nowrap">
                  <Calculator className="h-4 w-4 mr-1" /> Costes IA
                </TabsTrigger>
                <TabsTrigger value="documentos" className="text-xs whitespace-nowrap">
                  <FileSearch className="h-4 w-4 mr-1" /> OCR IA
                </TabsTrigger>
                <TabsTrigger value="informes" className="text-xs whitespace-nowrap">
                  <FileBarChart className="h-4 w-4 mr-1" /> Informes
                </TabsTrigger>
                <TabsTrigger value="alertas" className="text-xs whitespace-nowrap">
                  <AlertTriangle className="h-4 w-4 mr-1" /> Alertas
                </TabsTrigger>
                <TabsTrigger value="transparencia" className="text-xs whitespace-nowrap">
                  <Shield className="h-4 w-4 mr-1" /> Transparencia
                </TabsTrigger>
                {/* Phase 8 Tabs */}
                <TabsTrigger value="docgen" className="text-xs whitespace-nowrap">
                  <Sparkles className="h-4 w-4 mr-1" /> Doc IA
                </TabsTrigger>
                <TabsTrigger value="geo" className="text-xs whitespace-nowrap">
                  <MapPin className="h-4 w-4 mr-1" /> Geo
                </TabsTrigger>
                <TabsTrigger value="simulator" className="text-xs whitespace-nowrap">
                  <Calculator className="h-4 w-4 mr-1" /> Simulador
                </TabsTrigger>
                <TabsTrigger value="beneficiario360" className="text-xs whitespace-nowrap">
                  <User className="h-4 w-4 mr-1" /> 360°
                </TabsTrigger>
                <TabsTrigger value="bpmn" className="text-xs whitespace-nowrap">
                  <Workflow className="h-4 w-4 mr-1" /> Flujos
                </TabsTrigger>
                <TabsTrigger value="integraciones" className="text-xs whitespace-nowrap">
                  <Building className="h-4 w-4 mr-1" /> AAPP
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="resumen" className="mt-4">
              <GaliaResumenTab
                presupuestoStats={presupuestoStats}
                analyticsData={analyticsData}
                kpis={kpis}
                formatCurrency={formatCurrency}
              />
            </TabsContent>

            <TabsContent value="gestion" className="mt-4">
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
            </TabsContent>

            <TabsContent value="knowledge" className="mt-4 h-[600px]">
              <Suspense fallback={<TabSkeleton />}>
                <GaliaKnowledgeExplorer />
              </Suspense>
            </TabsContent>

            <TabsContent value="expedientes" className="mt-4">
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
            </TabsContent>

            <TabsContent value="convocatorias" className="mt-4">
              <GaliaConvocatoriasTab
                convocatorias={convocatorias}
                formatCurrency={formatCurrency}
              />
            </TabsContent>

            <TabsContent value="portal" className="mt-4">
              <Suspense fallback={<TabSkeleton />}>
                <GaliaPortalCiudadano />
              </Suspense>
            </TabsContent>

            <TabsContent value="costes" className="mt-4">
              <Suspense fallback={<TabSkeleton />}>
                <GaliaModeradorCostes />
              </Suspense>
            </TabsContent>

            <TabsContent value="informes" className="mt-4">
              <Suspense fallback={<TabSkeleton />}>
                <GaliaReportGenerator />
              </Suspense>
            </TabsContent>

            <TabsContent value="documentos" className="mt-4">
              <Suspense fallback={<TabSkeleton />}>
                <GaliaDocumentAnalyzer />
              </Suspense>
            </TabsContent>

            <TabsContent value="alertas" className="mt-4">
              <GaliaAlertasTab expedientesRiesgo={expedientesRiesgo} />
            </TabsContent>

            <TabsContent value="transparencia" className="mt-4">
              <Suspense fallback={<TabSkeleton />}>
                <GaliaTransparencyPortal />
              </Suspense>
            </TabsContent>
            
            <TabsContent value="docgen" className="mt-4">
              <Suspense fallback={<TabSkeleton />}>
                <GaliaDocumentGeneratorPanel />
              </Suspense>
            </TabsContent>

            <TabsContent value="geo" className="mt-4">
              <Suspense fallback={<TabSkeleton />}>
                <GaliaGeoIntelligencePanel />
              </Suspense>
            </TabsContent>

            <TabsContent value="simulator" className="mt-4">
              <Suspense fallback={<TabSkeleton />}>
                <GaliaConvocatoriaSimulatorPanel />
              </Suspense>
            </TabsContent>

            <TabsContent value="beneficiario360" className="mt-4">
              <Suspense fallback={<TabSkeleton />}>
                <GaliaBeneficiario360Panel />
              </Suspense>
            </TabsContent>

            <TabsContent value="bpmn" className="mt-4">
              <Suspense fallback={<TabSkeleton />}>
                <GaliaBPMNWorkflowsPanel />
              </Suspense>
            </TabsContent>

            <TabsContent value="integraciones" className="mt-4">
              <Suspense fallback={<TabSkeleton />}>
                <GaliaAdminIntegrationsPanel />
              </Suspense>
            </TabsContent>
          </Tabs>
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

      {/* Modal Nueva Convocatoria (Refactored to separate component) */}
      <GaliaNuevaConvocatoriaModal
        isOpen={showNuevaConvocatoriaModal}
        onClose={() => setShowNuevaConvocatoriaModal(false)}
        onCreate={createConvocatoria}
      />
    </div>
  );
}

export default GaliaDashboard;
