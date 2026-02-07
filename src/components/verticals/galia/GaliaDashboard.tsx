import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import {
  FileText,
  Users,
  Euro,
  AlertTriangle,
  MessageSquare,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  Plus,
  RefreshCw,
  Bot,
  BarChart3,
  FolderOpen,
  FileCheck,
  Settings,
} from 'lucide-react';
import { useGaliaAnalytics } from '@/hooks/galia/useGaliaAnalytics';
import { useGaliaExpedientes } from '@/hooks/galia/useGaliaExpedientes';
import { useGaliaConvocatorias } from '@/hooks/galia/useGaliaConvocatorias';
import { GaliaKPICards } from './shared/GaliaKPICards';
import { GaliaStatusBadge } from './shared/GaliaStatusBadge';
import { GaliaAsistenteVirtual } from './GaliaAsistenteVirtual';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export function GaliaDashboard() {
  const [activeTab, setActiveTab] = useState('resumen');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAssistant, setShowAssistant] = useState(false);

  const { kpis, analyticsData, isLoading: loadingAnalytics, refresh } = useGaliaAnalytics();
  const { expedientes, isLoading: loadingExpedientes, getExpedientesConRiesgo } = useGaliaExpedientes();
  const { convocatorias, isLoading: loadingConvocatorias, getPresupuestoStats } = useGaliaConvocatorias();

  const presupuestoStats = getPresupuestoStats();
  const expedientesRiesgo = getExpedientesConRiesgo(70);

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
          <Button size="sm">
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
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="resumen" className="text-xs">
                <BarChart3 className="h-4 w-4 mr-1" />
                Resumen
              </TabsTrigger>
              <TabsTrigger value="expedientes" className="text-xs">
                <FolderOpen className="h-4 w-4 mr-1" />
                Expedientes
              </TabsTrigger>
              <TabsTrigger value="convocatorias" className="text-xs">
                <FileText className="h-4 w-4 mr-1" />
                Convocatorias
              </TabsTrigger>
              <TabsTrigger value="alertas" className="text-xs">
                <AlertTriangle className="h-4 w-4 mr-1" />
                Alertas
              </TabsTrigger>
            </TabsList>

            <TabsContent value="resumen" className="mt-4 space-y-4">
              {/* Presupuesto Overview */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Euro className="h-5 w-5 text-primary" />
                    Estado del Presupuesto
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground">Total</p>
                      <p className="text-lg font-bold">{formatCurrency(presupuestoStats.total)}</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-amber-500/10">
                      <p className="text-xs text-muted-foreground">Comprometido</p>
                      <p className="text-lg font-bold text-amber-600">
                        {formatCurrency(presupuestoStats.comprometido)}
                      </p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-green-500/10">
                      <p className="text-xs text-muted-foreground">Disponible</p>
                      <p className="text-lg font-bold text-green-600">
                        {formatCurrency(presupuestoStats.disponible)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 h-2 rounded-full bg-muted overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-amber-500 to-green-500"
                      style={{ 
                        width: `${presupuestoStats.total ? (presupuestoStats.comprometido / presupuestoStats.total) * 100 : 0}%` 
                      }}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Expedientes por estado */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FolderOpen className="h-5 w-5 text-primary" />
                    Expedientes por Estado
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {Object.entries(analyticsData?.expedientesPorEstado || {}).map(([estado, count]) => (
                      <div key={estado} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                        <GaliaStatusBadge estado={estado as any} size="sm" />
                        <span className="font-bold">{count}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Métricas de IA */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Bot className="h-5 w-5 text-primary" />
                    Rendimiento IA
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg bg-primary/10">
                      <p className="text-xs text-muted-foreground">Interacciones (30d)</p>
                      <p className="text-2xl font-bold">{kpis?.interaccionesIA || 0}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-green-500/10">
                      <p className="text-xs text-muted-foreground">Tasa Automatización</p>
                      <p className="text-2xl font-bold text-green-600">
                        {analyticsData?.tasaAutomatizacion || 0}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="expedientes" className="mt-4">
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Expedientes Activos</CardTitle>
                    <div className="relative w-64">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar expediente..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8 h-9"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2">
                      {expedientes
                        .filter(e => 
                          !searchTerm || 
                          e.numero_expediente.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          e.solicitud?.titulo_proyecto?.toLowerCase().includes(searchTerm.toLowerCase())
                        )
                        .slice(0, 20)
                        .map((expediente) => (
                          <div 
                            key={expediente.id}
                            className="p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-sm font-medium">
                                    {expediente.numero_expediente}
                                  </span>
                                  <GaliaStatusBadge estado={expediente.estado} size="sm" />
                                </div>
                                <p className="text-sm text-muted-foreground truncate mt-1">
                                  {expediente.solicitud?.titulo_proyecto || 'Sin título'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {expediente.solicitud?.beneficiario?.nombre} · {expediente.solicitud?.beneficiario?.nif}
                                </p>
                              </div>
                              <div className="text-right shrink-0">
                                {expediente.importe_concedido && (
                                  <p className="font-semibold text-green-600">
                                    {formatCurrency(expediente.importe_concedido)}
                                  </p>
                                )}
                                <p className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(expediente.fecha_apertura), { 
                                    addSuffix: true, 
                                    locale: es 
                                  })}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="convocatorias" className="mt-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Convocatorias</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2">
                      {convocatorias.map((conv) => (
                        <div 
                          key={conv.id}
                          className="p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{conv.nombre}</span>
                                <GaliaStatusBadge estado={conv.estado} size="sm" />
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {conv.codigo} · {new Date(conv.fecha_inicio).toLocaleDateString('es-ES')} - {new Date(conv.fecha_fin).toLocaleDateString('es-ES')}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="font-semibold">{formatCurrency(conv.presupuesto_total)}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatCurrency(conv.presupuesto_total - conv.presupuesto_comprometido)} disponible
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="alertas" className="mt-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    Alertas y Expedientes de Riesgo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2">
                      {expedientesRiesgo.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
                          <p>No hay expedientes con riesgo elevado</p>
                        </div>
                      ) : (
                        expedientesRiesgo.map((exp) => (
                          <div 
                            key={exp.id}
                            className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/5"
                          >
                            <div className="flex items-start gap-3">
                              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <p className="font-medium">{exp.numero_expediente}</p>
                                <p className="text-sm text-muted-foreground">
                                  {exp.solicitud?.titulo_proyecto}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="destructive" className="text-xs">
                                    Riesgo: {exp.scoring_riesgo}%
                                  </Badge>
                                  <GaliaStatusBadge estado={exp.estado} size="sm" />
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column - Assistant */}
        {showAssistant && (
          <div className="lg:col-span-1">
            <GaliaAsistenteVirtual modo="tecnico" />
          </div>
        )}

        {/* If assistant not shown, show quick stats */}
        {!showAssistant && (
          <div className="space-y-4">
            {/* Actividad Reciente */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Actividad Reciente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {expedientes.slice(0, 5).map((exp) => (
                      <div key={exp.id} className="flex items-center gap-2 text-sm">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        <span className="text-muted-foreground">
                          {exp.numero_expediente}
                        </span>
                        <GaliaStatusBadge estado={exp.estado} size="sm" />
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Acciones Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <FileText className="h-4 w-4 mr-2" />
                  Revisar solicitudes pendientes
                </Button>
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <FileCheck className="h-4 w-4 mr-2" />
                  Validar justificaciones
                </Button>
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <Users className="h-4 w-4 mr-2" />
                  Ver beneficiarios
                </Button>
                <Button variant="outline" className="w-full justify-start" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Configuración GAL
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

export default GaliaDashboard;
