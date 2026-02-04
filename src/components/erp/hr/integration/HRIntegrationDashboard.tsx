/**
 * HRIntegrationDashboard - Dashboard Unificado de Integración
 * Panel central para monitorizar sincronización RRHH ↔ Tesorería ↔ Contabilidad ↔ SS
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRightLeft,
  Building2,
  Wallet,
  FileText,
  Shield,
  Clock,
  TrendingUp,
  Activity,
  Zap,
  ChevronRight,
  Calendar,
  Users,
  Euro,
  BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

import { HRAccountingBridge } from './HRAccountingBridge';
import { HRTreasurySync } from './HRTreasurySync';
import { HRSocialSecurityBridge } from './HRSocialSecurityBridge';

interface IntegrationStatus {
  id: string;
  name: string;
  module: 'accounting' | 'treasury' | 'social_security';
  status: 'synced' | 'pending' | 'error' | 'partial';
  lastSync: string | null;
  pendingItems: number;
  syncedItems: number;
  errorCount: number;
  healthScore: number;
}

interface IntegrationEvent {
  id: string;
  type: 'sync' | 'error' | 'warning' | 'info';
  module: string;
  message: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

interface DashboardMetrics {
  totalPayrolls: number;
  syncedToAccounting: number;
  syncedToTreasury: number;
  syncedToSS: number;
  pendingSync: number;
  errorCount: number;
  lastFullSync: string | null;
  syncHealthScore: number;
}

export function HRIntegrationDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([]);
  const [events, setEvents] = useState<IntegrationEvent[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);

  // Cargar datos de integración
  const loadIntegrationData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Simular carga de datos (en producción vendría de edge function)
      await new Promise(resolve => setTimeout(resolve, 800));

      // Mock data - en producción se obtendría de erp_hr_integration_log
      const mockIntegrations: IntegrationStatus[] = [
        {
          id: 'acc-int',
          name: 'Contabilidad (PGC 2007)',
          module: 'accounting',
          status: 'synced',
          lastSync: new Date().toISOString(),
          pendingItems: 0,
          syncedItems: 45,
          errorCount: 0,
          healthScore: 100
        },
        {
          id: 'tres-int',
          name: 'Tesorería (Vencimientos)',
          module: 'treasury',
          status: 'pending',
          lastSync: subDays(new Date(), 1).toISOString(),
          pendingItems: 3,
          syncedItems: 42,
          errorCount: 0,
          healthScore: 93
        },
        {
          id: 'ss-int',
          name: 'Seguridad Social (TGSS)',
          module: 'social_security',
          status: 'synced',
          lastSync: new Date().toISOString(),
          pendingItems: 0,
          syncedItems: 12,
          errorCount: 0,
          healthScore: 100
        }
      ];

      const mockEvents: IntegrationEvent[] = [
        {
          id: 'evt-1',
          type: 'sync',
          module: 'Contabilidad',
          message: 'Asiento nóminas Enero 2026 contabilizado correctamente',
          timestamp: new Date().toISOString()
        },
        {
          id: 'evt-2',
          type: 'sync',
          module: 'Seguridad Social',
          message: 'Cuotas TC1 Enero sincronizadas con Tesorería',
          timestamp: subDays(new Date(), 0.5).toISOString()
        },
        {
          id: 'evt-3',
          type: 'info',
          module: 'Tesorería',
          message: '3 vencimientos de nómina pendientes de confirmar',
          timestamp: subDays(new Date(), 1).toISOString()
        },
        {
          id: 'evt-4',
          type: 'sync',
          module: 'Contabilidad',
          message: 'Finiquito contabilizado - Empleado #1042',
          timestamp: subDays(new Date(), 2).toISOString()
        },
        {
          id: 'evt-5',
          type: 'warning',
          module: 'Seguridad Social',
          message: 'Diferencia de 0.02€ en cuadre de bases - ajustado automáticamente',
          timestamp: subDays(new Date(), 3).toISOString()
        }
      ];

      const mockMetrics: DashboardMetrics = {
        totalPayrolls: 45,
        syncedToAccounting: 45,
        syncedToTreasury: 42,
        syncedToSS: 12,
        pendingSync: 3,
        errorCount: 0,
        lastFullSync: new Date().toISOString(),
        syncHealthScore: 98
      };

      setIntegrations(mockIntegrations);
      setEvents(mockEvents);
      setMetrics(mockMetrics);
    } catch (error) {
      console.error('[HRIntegrationDashboard] Error loading data:', error);
      toast.error('Error al cargar datos de integración');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadIntegrationData();
  }, [loadIntegrationData]);

  // Sincronización completa
  const handleFullSync = async () => {
    setIsLoading(true);
    toast.info('Iniciando sincronización completa...');
    
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await loadIntegrationData();
      toast.success('Sincronización completa finalizada');
    } catch (error) {
      toast.error('Error en sincronización');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: IntegrationStatus['status']) => {
    switch (status) {
      case 'synced':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-amber-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-destructive" />;
      case 'partial':
        return <AlertTriangle className="h-5 w-5 text-orange-500" />;
    }
  };

  const getStatusBadge = (status: IntegrationStatus['status']) => {
    const variants: Record<string, string> = {
      synced: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
      error: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      partial: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
    };
    const labels: Record<string, string> = {
      synced: 'Sincronizado',
      pending: 'Pendiente',
      error: 'Error',
      partial: 'Parcial'
    };
    return <Badge className={variants[status]}>{labels[status]}</Badge>;
  };

  const getEventIcon = (type: IntegrationEvent['type']) => {
    switch (type) {
      case 'sync':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'info':
        return <Activity className="h-4 w-4 text-blue-500" />;
    }
  };

  const getModuleIcon = (module: string) => {
    switch (module) {
      case 'accounting':
        return <FileText className="h-5 w-5" />;
      case 'treasury':
        return <Wallet className="h-5 w-5" />;
      case 'social_security':
        return <Shield className="h-5 w-5" />;
      default:
        return <Building2 className="h-5 w-5" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <ArrowRightLeft className="h-6 w-6 text-primary" />
            Centro de Integración RRHH
          </h2>
          <p className="text-muted-foreground mt-1">
            Sincronización automática con Contabilidad, Tesorería y Seguridad Social
          </p>
        </div>
        <Button
          onClick={handleFullSync}
          disabled={isLoading}
          className="gap-2"
        >
          <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          Sincronizar Todo
        </Button>
      </div>

      {/* Métricas Principales */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/20 dark:to-blue-900/10 border-blue-200 dark:border-blue-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Users className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                <span className="text-2xl font-bold">{metrics.totalPayrolls}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Nóminas Totales</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/20 dark:to-green-900/10 border-green-200 dark:border-green-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <FileText className="h-8 w-8 text-green-600 dark:text-green-400" />
                <span className="text-2xl font-bold">{metrics.syncedToAccounting}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Contabilizadas</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/20 dark:to-purple-900/10 border-purple-200 dark:border-purple-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Wallet className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                <span className="text-2xl font-bold">{metrics.syncedToTreasury}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">En Tesorería</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 dark:from-indigo-950/20 dark:to-indigo-900/10 border-indigo-200 dark:border-indigo-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Shield className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                <span className="text-2xl font-bold">{metrics.syncedToSS}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Cuotas SS</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/20 dark:to-amber-900/10 border-amber-200 dark:border-amber-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <Clock className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                <span className="text-2xl font-bold">{metrics.pendingSync}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Pendientes</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/20 dark:to-emerald-900/10 border-emerald-200 dark:border-emerald-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <TrendingUp className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                <span className="text-2xl font-bold">{metrics.syncHealthScore}%</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Salud Sync</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs de Integración */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="overview" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Resumen</span>
          </TabsTrigger>
          <TabsTrigger value="accounting" className="gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Contabilidad</span>
          </TabsTrigger>
          <TabsTrigger value="treasury" className="gap-2">
            <Wallet className="h-4 w-4" />
            <span className="hidden sm:inline">Tesorería</span>
          </TabsTrigger>
          <TabsTrigger value="social_security" className="gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Seg. Social</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab: Resumen */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Estado de Integraciones */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  Estado de Integraciones
                </CardTitle>
                <CardDescription>
                  Conexiones activas entre módulos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {integrations.map((integration) => (
                  <div
                    key={integration.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => setActiveTab(integration.module)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-background">
                        {getModuleIcon(integration.module)}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{integration.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {integration.syncedItems} sincronizados
                          {integration.pendingItems > 0 && (
                            <span className="text-amber-600 ml-1">
                              · {integration.pendingItems} pendientes
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(integration.status)}
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Actividad Reciente */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Actividad Reciente
                </CardTitle>
                <CardDescription>
                  Últimas sincronizaciones y eventos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[280px] pr-4">
                  <div className="space-y-3">
                    {events.map((event) => (
                      <div
                        key={event.id}
                        className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors"
                      >
                        <div className="mt-0.5">
                          {getEventIcon(event.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm">{event.message}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {event.module}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(event.timestamp), {
                                addSuffix: true,
                                locale: es
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Barra de Salud General */}
          {metrics && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Salud de Sincronización</CardTitle>
                  <span className="text-2xl font-bold text-primary">
                    {metrics.syncHealthScore}%
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <Progress value={metrics.syncHealthScore} className="h-3" />
                <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                  <span>
                    Última sincronización completa:{' '}
                    {metrics.lastFullSync
                      ? format(new Date(metrics.lastFullSync), "dd/MM/yyyy HH:mm", { locale: es })
                      : 'Nunca'}
                  </span>
                  <span>
                    {metrics.errorCount === 0 ? (
                      <span className="text-green-600 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Sin errores
                      </span>
                    ) : (
                      <span className="text-destructive flex items-center gap-1">
                        <XCircle className="h-3 w-3" /> {metrics.errorCount} errores
                      </span>
                    )}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab: Contabilidad */}
        <TabsContent value="accounting">
          <HRAccountingBridge 
            companyId="current" 
            period={format(new Date(), 'yyyy-MM')}
          />
        </TabsContent>

        {/* Tab: Tesorería */}
        <TabsContent value="treasury">
          <HRTreasurySync />
        </TabsContent>

        {/* Tab: Seguridad Social */}
        <TabsContent value="social_security">
          <HRSocialSecurityBridge companyId="current" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default HRIntegrationDashboard;
