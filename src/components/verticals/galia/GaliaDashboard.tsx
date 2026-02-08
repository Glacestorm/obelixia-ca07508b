/**
 * GALIA Dashboard - Main Component
 * Gestión de Ayudas LEADER con Inteligencia Artificial
 */

import { useState, lazy, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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

// Lazy load heavy components
const GaliaAsistenteVirtual = lazy(() => import('./GaliaAsistenteVirtual'));
const GaliaPortalCiudadano = lazy(() => import('./GaliaPortalCiudadano'));
const GaliaModeradorCostes = lazy(() => import('./GaliaModeradorCostes'));
const GaliaReportGenerator = lazy(() => import('./GaliaReportGenerator'));
const GaliaDocumentAnalyzer = lazy(() => import('./GaliaDocumentAnalyzer'));
const GaliaTransparencyPortal = lazy(() => import('./transparency/GaliaTransparencyPortal'));

// Phase 8 - Productividad Avanzada (Lazy loaded)
const GaliaDocumentGeneratorPanel = lazy(() => import('@/components/galia/phase8/GaliaDocumentGeneratorPanel').then(m => ({ default: m.GaliaDocumentGeneratorPanel })));
const GaliaGeoIntelligencePanel = lazy(() => import('@/components/galia/phase8/GaliaGeoIntelligencePanel').then(m => ({ default: m.GaliaGeoIntelligencePanel })));
const GaliaConvocatoriaSimulatorPanel = lazy(() => import('@/components/galia/phase8/GaliaConvocatoriaSimulatorPanel').then(m => ({ default: m.GaliaConvocatoriaSimulatorPanel })));
const GaliaBeneficiario360Panel = lazy(() => import('@/components/galia/phase8/GaliaBeneficiario360Panel').then(m => ({ default: m.GaliaBeneficiario360Panel })));
const GaliaBPMNWorkflowsPanel = lazy(() => import('@/components/galia/phase8/GaliaBPMNWorkflowsPanel').then(m => ({ default: m.GaliaBPMNWorkflowsPanel })));
const GaliaAdminIntegrationsPanel = lazy(() => import('@/components/galia/phase8/GaliaAdminIntegrationsPanel').then(m => ({ default: m.GaliaAdminIntegrationsPanel })));

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
  
  // Modal Nueva Convocatoria
  const [showNuevaConvocatoriaModal, setShowNuevaConvocatoriaModal] = useState(false);
  const [nuevaConvocatoriaForm, setNuevaConvocatoriaForm] = useState({
    codigo: '',
    nombre: '',
    descripcion: '',
    presupuesto_total: 0,
    fecha_inicio: '',
    fecha_fin: '',
    porcentaje_ayuda_max: 80
  });
  const [creatingConvocatoria, setCreatingConvocatoria] = useState(false);

  const { kpis, analyticsData, isLoading: loadingAnalytics, refresh } = useGaliaAnalytics();
  const { 
    expedientes, 
    isLoading: loadingExpedientes, 
    getExpedientesConRiesgo,
    updateExpedienteEstado 
  } = useGaliaExpedientes({ estado: workflowEstadoFilter as GaliaExpediente['estado'] | undefined });
  const { 
    convocatorias, 
    isLoading: loadingConvocatorias, 
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

  const handleCrearConvocatoria = async () => {
    if (!nuevaConvocatoriaForm.codigo || !nuevaConvocatoriaForm.nombre || !nuevaConvocatoriaForm.fecha_inicio || !nuevaConvocatoriaForm.fecha_fin) {
      toast.error('Por favor, completa todos los campos obligatorios');
      return;
    }

    setCreatingConvocatoria(true);
    try {
      const result = await createConvocatoria({
        ...nuevaConvocatoriaForm,
        estado: 'borrador',
        presupuesto_comprometido: 0,
        presupuesto_ejecutado: 0,
        requisitos: [],
        criterios_valoracion: [],
        documentacion_requerida: []
      });
      
      if (result) {
        toast.success('Convocatoria creada correctamente');
        setShowNuevaConvocatoriaModal(false);
        setNuevaConvocatoriaForm({
          codigo: '',
          nombre: '',
          descripcion: '',
          presupuesto_total: 0,
          fecha_inicio: '',
          fecha_fin: '',
          porcentaje_ayuda_max: 80
        });
        setActiveTab('convocatorias');
      }
    } catch (error) {
      console.error('Error creating convocatoria:', error);
      toast.error('Error al crear la convocatoria');
    } finally {
      setCreatingConvocatoria(false);
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
                  <BarChart3 className="h-4 w-4 mr-1" />
                  Resumen
                </TabsTrigger>
                <TabsTrigger value="gestion" className="text-xs whitespace-nowrap">
                  <LayoutDashboard className="h-4 w-4 mr-1" />
                  Gestión
                </TabsTrigger>
                <TabsTrigger value="expedientes" className="text-xs whitespace-nowrap">
                  <FolderOpen className="h-4 w-4 mr-1" />
                  Expedientes
                </TabsTrigger>
                <TabsTrigger value="convocatorias" className="text-xs whitespace-nowrap">
                  <FileText className="h-4 w-4 mr-1" />
                  Convocatorias
                </TabsTrigger>
                <TabsTrigger value="portal" className="text-xs whitespace-nowrap">
                  <Globe className="h-4 w-4 mr-1" />
                  Portal
                </TabsTrigger>
                <TabsTrigger value="costes" className="text-xs whitespace-nowrap">
                  <Calculator className="h-4 w-4 mr-1" />
                  Costes IA
                </TabsTrigger>
                <TabsTrigger value="documentos" className="text-xs whitespace-nowrap">
                  <FileSearch className="h-4 w-4 mr-1" />
                  OCR IA
                </TabsTrigger>
                <TabsTrigger value="informes" className="text-xs whitespace-nowrap">
                  <FileBarChart className="h-4 w-4 mr-1" />
                  Informes
                </TabsTrigger>
                <TabsTrigger value="alertas" className="text-xs whitespace-nowrap">
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  Alertas
                </TabsTrigger>
                <TabsTrigger value="transparencia" className="text-xs whitespace-nowrap">
                  <Shield className="h-4 w-4 mr-1" />
                  Transparencia
                </TabsTrigger>
                {/* Phase 8 Tabs */}
                <TabsTrigger value="docgen" className="text-xs whitespace-nowrap">
                  <Sparkles className="h-4 w-4 mr-1" />
                  Doc IA
                </TabsTrigger>
                <TabsTrigger value="geo" className="text-xs whitespace-nowrap">
                  <MapPin className="h-4 w-4 mr-1" />
                  Geo
                </TabsTrigger>
                <TabsTrigger value="simulator" className="text-xs whitespace-nowrap">
                  <Calculator className="h-4 w-4 mr-1" />
                  Simulador
                </TabsTrigger>
                <TabsTrigger value="beneficiario360" className="text-xs whitespace-nowrap">
                  <User className="h-4 w-4 mr-1" />
                  360°
                </TabsTrigger>
                <TabsTrigger value="bpmn" className="text-xs whitespace-nowrap">
                  <Workflow className="h-4 w-4 mr-1" />
                  Flujos
                </TabsTrigger>
                <TabsTrigger value="integraciones" className="text-xs whitespace-nowrap">
                  <Building className="h-4 w-4 mr-1" />
                  AAPP
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

            {/* Panel de Gestión Técnica */}
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

            {/* Portal Ciudadano Tab */}
            <TabsContent value="portal" className="mt-4">
              <Suspense fallback={<TabSkeleton />}>
                <GaliaPortalCiudadano />
              </Suspense>
            </TabsContent>

            {/* Moderador de Costes Tab */}
            <TabsContent value="costes" className="mt-4">
              <Suspense fallback={<TabSkeleton />}>
                <GaliaModeradorCostes />
              </Suspense>
            </TabsContent>

            {/* Generador de Informes Tab */}
            <TabsContent value="informes" className="mt-4">
              <Suspense fallback={<TabSkeleton />}>
                <GaliaReportGenerator />
              </Suspense>
            </TabsContent>

            {/* Analizador de Documentos OCR Tab */}
            <TabsContent value="documentos" className="mt-4">
              <Suspense fallback={<TabSkeleton />}>
                <GaliaDocumentAnalyzer />
              </Suspense>
            </TabsContent>

            <TabsContent value="alertas" className="mt-4">
              <GaliaAlertasTab expedientesRiesgo={expedientesRiesgo} />
            </TabsContent>

            {/* Portal de Transparencia Tab */}
            <TabsContent value="transparencia" className="mt-4">
              <Suspense fallback={<TabSkeleton />}>
                <GaliaTransparencyPortal />
              </Suspense>
            </TabsContent>

            {/* === PHASE 8 TABS === */}
            
            {/* 8A - Generador de Documentos IA */}
            <TabsContent value="docgen" className="mt-4">
              <Suspense fallback={<TabSkeleton />}>
                <GaliaDocumentGeneratorPanel />
              </Suspense>
            </TabsContent>

            {/* 8B - Geointeligencia Territorial */}
            <TabsContent value="geo" className="mt-4">
              <Suspense fallback={<TabSkeleton />}>
                <GaliaGeoIntelligencePanel />
              </Suspense>
            </TabsContent>

            {/* 8C - Simulador de Convocatorias */}
            <TabsContent value="simulator" className="mt-4">
              <Suspense fallback={<TabSkeleton />}>
                <GaliaConvocatoriaSimulatorPanel />
              </Suspense>
            </TabsContent>

            {/* 8D - Beneficiario 360° */}
            <TabsContent value="beneficiario360" className="mt-4">
              <Suspense fallback={<TabSkeleton />}>
                <GaliaBeneficiario360Panel />
              </Suspense>
            </TabsContent>

            {/* 8E - Flujos BPMN No-Code */}
            <TabsContent value="bpmn" className="mt-4">
              <Suspense fallback={<TabSkeleton />}>
                <GaliaBPMNWorkflowsPanel />
              </Suspense>
            </TabsContent>

            {/* 8F - Integraciones Administrativas */}
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

      {/* Modal Nueva Convocatoria */}
      <Dialog open={showNuevaConvocatoriaModal} onOpenChange={setShowNuevaConvocatoriaModal}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Nueva Convocatoria
            </DialogTitle>
            <DialogDescription>
              Crea una nueva convocatoria de ayudas LEADER. Los campos marcados con * son obligatorios.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="codigo">Código *</Label>
                <Input
                  id="codigo"
                  placeholder="LEADER-2024-001"
                  value={nuevaConvocatoriaForm.codigo}
                  onChange={(e) => setNuevaConvocatoriaForm(prev => ({ ...prev, codigo: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="presupuesto">Presupuesto Total (€)</Label>
                <Input
                  id="presupuesto"
                  type="number"
                  placeholder="500000"
                  value={nuevaConvocatoriaForm.presupuesto_total || ''}
                  onChange={(e) => setNuevaConvocatoriaForm(prev => ({ ...prev, presupuesto_total: parseFloat(e.target.value) || 0 }))}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre de la Convocatoria *</Label>
              <Input
                id="nombre"
                placeholder="Ayudas para la modernización de explotaciones agrarias"
                value={nuevaConvocatoriaForm.nombre}
                onChange={(e) => setNuevaConvocatoriaForm(prev => ({ ...prev, nombre: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción</Label>
              <Textarea
                id="descripcion"
                placeholder="Descripción detallada de la convocatoria..."
                rows={3}
                value={nuevaConvocatoriaForm.descripcion}
                onChange={(e) => setNuevaConvocatoriaForm(prev => ({ ...prev, descripcion: e.target.value }))}
              />
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fecha_inicio">Fecha Inicio *</Label>
                <Input
                  id="fecha_inicio"
                  type="date"
                  value={nuevaConvocatoriaForm.fecha_inicio}
                  onChange={(e) => setNuevaConvocatoriaForm(prev => ({ ...prev, fecha_inicio: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fecha_fin">Fecha Fin *</Label>
                <Input
                  id="fecha_fin"
                  type="date"
                  value={nuevaConvocatoriaForm.fecha_fin}
                  onChange={(e) => setNuevaConvocatoriaForm(prev => ({ ...prev, fecha_fin: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="porcentaje">% Ayuda Máx.</Label>
                <Input
                  id="porcentaje"
                  type="number"
                  min="0"
                  max="100"
                  value={nuevaConvocatoriaForm.porcentaje_ayuda_max}
                  onChange={(e) => setNuevaConvocatoriaForm(prev => ({ ...prev, porcentaje_ayuda_max: parseInt(e.target.value) || 80 }))}
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNuevaConvocatoriaModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCrearConvocatoria} disabled={creatingConvocatoria}>
              {creatingConvocatoria ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Convocatoria
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default GaliaDashboard;
