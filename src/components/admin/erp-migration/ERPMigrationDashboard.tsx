/**
 * ERPMigrationDashboard - Dashboard principal del módulo de migración ERP
 * Panel de control con KPIs, sesiones activas y acceso a herramientas
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  ArrowRightLeft,
  Upload,
  CheckCircle,
  AlertTriangle,
  Clock,
  TrendingUp,
  Database,
  FileSpreadsheet,
  Sparkles,
  Play,
  Pause,
  RotateCcw,
  Settings,
  Download,
  RefreshCw,
  Building2,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { useERPMigration, ERPMigrationSession, ERPConnector } from '@/hooks/admin/integrations/useERPMigration';
import { useERPContext } from '@/hooks/erp';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { ERPMigrationPanel } from './ERPMigrationPanel';
import { ERPValidationPanel } from './ERPValidationPanel';
import { ERPMonitoringPanel } from './ERPMonitoringPanel';
import { ERPDataMappingPanel } from './ERPDataMappingPanel';
import { ERPCompliancePanel } from './ERPCompliancePanel';
import { ERPConnectorLogo } from './ERPConnectorLogo';
import { ERPRollbackPanel } from './ERPRollbackPanel';
import { ERPReportsPanel } from './ERPReportsPanel';
import { ERPAIAssistantPanel } from './ERPAIAssistantPanel';
import { ERPAdvancedToolsPanel } from './ERPAdvancedToolsPanel';
import { ERPFiscalReconciliationPanel } from './ERPFiscalReconciliationPanel';
import { ERPTrends2026Panel } from './ERPTrends2026Panel';
import { ERPKnowledgeUploader } from './ERPKnowledgeUploader';
import { ERPNewsPanel } from './ERPNewsPanel';

interface ERPMigrationDashboardProps {
  companyId?: string;
}

export function ERPMigrationDashboard({ companyId }: ERPMigrationDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [showNewMigration, setShowNewMigration] = useState(false);

  const { currentCompany } = useERPContext();
  const effectiveCompanyId = companyId || currentCompany?.id;

  const {
    connectors,
    sessions,
    activeSession,
    isLoading,
    isRunning,
    progress,
    fetchConnectors,
    fetchSessions,
    setActiveSession
  } = useERPMigration();

  // Fetch data on mount
  useEffect(() => {
    fetchConnectors();
    if (effectiveCompanyId) {
      fetchSessions(effectiveCompanyId);
    }
  }, [fetchConnectors, fetchSessions, effectiveCompanyId]);

  // Stats
  const completedSessions = sessions.filter(s => s.status === 'completed').length;
  const runningSessions = sessions.filter(s => s.status === 'running').length;
  const failedSessions = sessions.filter(s => s.status === 'failed').length;
  const totalRecordsMigrated = sessions.reduce((sum, s) => sum + (s.migrated_records || 0), 0);

  // Get status badge
  const getStatusBadge = (status: ERPMigrationSession['status']) => {
    const config = {
      draft: { label: 'Borrador', variant: 'secondary' as const, icon: FileSpreadsheet },
      analyzing: { label: 'Analizando', variant: 'secondary' as const, icon: Sparkles },
      mapping: { label: 'Mapeando', variant: 'secondary' as const, icon: ArrowRightLeft },
      validating: { label: 'Validando', variant: 'secondary' as const, icon: CheckCircle },
      ready: { label: 'Listo', variant: 'default' as const, icon: Play },
      running: { label: 'Ejecutando', variant: 'default' as const, icon: Loader2 },
      paused: { label: 'Pausado', variant: 'secondary' as const, icon: Pause },
      completed: { label: 'Completado', variant: 'default' as const, icon: CheckCircle },
      failed: { label: 'Fallido', variant: 'destructive' as const, icon: AlertTriangle },
      rolled_back: { label: 'Revertido', variant: 'secondary' as const, icon: RotateCcw }
    };

    const cfg = config[status] || config.draft;
    const Icon = cfg.icon;

    return (
      <Badge variant={cfg.variant} className="gap-1">
        <Icon className={cn("h-3 w-3", status === 'running' && 'animate-spin')} />
        {cfg.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <ArrowRightLeft className="h-6 w-6 text-primary" />
            Migración ERP/Contable
          </h2>
          <p className="text-muted-foreground">
            Migra datos desde cualquier sistema contable a ObelixIA
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchSessions(effectiveCompanyId)}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && 'animate-spin')} />
            Actualizar
          </Button>
          <Button onClick={() => setShowNewMigration(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Nueva Migración
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Migraciones Completadas</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedSessions}</div>
            <p className="text-xs text-muted-foreground">
              de {sessions.length} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Ejecución</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{runningSessions}</div>
            <p className="text-xs text-muted-foreground">
              sesiones activas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Registros Migrados</CardTitle>
            <Database className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRecordsMigrated.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              total histórico
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conectores</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{connectors.length}</div>
            <p className="text-xs text-muted-foreground">
              sistemas soportados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex flex-wrap gap-1 h-auto p-1">
          <TabsTrigger value="overview" className="text-xs">Resumen</TabsTrigger>
          <TabsTrigger value="migration" className="text-xs">Migración</TabsTrigger>
          <TabsTrigger value="mapping" className="text-xs">Mapeo</TabsTrigger>
          <TabsTrigger value="validation" className="text-xs">Validación</TabsTrigger>
          <TabsTrigger value="monitoring" className="text-xs">Monitoreo</TabsTrigger>
          <TabsTrigger value="compliance" className="text-xs">Cumplimiento</TabsTrigger>
          <TabsTrigger value="fiscal" className="text-xs">Fiscal</TabsTrigger>
          <TabsTrigger value="rollback" className="text-xs">Rollback</TabsTrigger>
          <TabsTrigger value="reports" className="text-xs">Reportes</TabsTrigger>
          <TabsTrigger value="tools" className="text-xs">Herramientas</TabsTrigger>
          <TabsTrigger value="ai-assistant" className="text-xs">IA</TabsTrigger>
          <TabsTrigger value="knowledge" className="text-xs">Conocimiento</TabsTrigger>
          <TabsTrigger value="news" className="text-xs">Noticias</TabsTrigger>
          <TabsTrigger value="trends" className="text-xs">2026+</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Recent Sessions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Sesiones Recientes</CardTitle>
                <CardDescription>Últimas migraciones realizadas</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  {sessions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <ArrowRightLeft className="h-12 w-12 text-muted-foreground/30 mb-4" />
                      <p className="text-muted-foreground">
                        No hay migraciones todavía
                      </p>
                      <Button 
                        variant="link" 
                        className="mt-2"
                        onClick={() => {
                          setShowNewMigration(true);
                          setActiveTab('migration');
                        }}
                      >
                        Crear primera migración
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {sessions.slice(0, 5).map((session) => (
                        <div
                          key={session.id}
                          className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => {
                            setActiveSession(session);
                            setActiveTab('migration');
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10">
                              <Database className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">{session.session_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {session.total_records.toLocaleString()} registros
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(session.status)}
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Connectors */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Conectores Disponibles</CardTitle>
                <CardDescription>Sistemas ERP/contables soportados</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="grid grid-cols-2 gap-2">
                    {connectors.slice(0, 12).map((connector) => (
                      <div
                        key={connector.id}
                        className="flex items-center gap-2 p-2 rounded-lg border hover:bg-muted/50 transition-colors"
                      >
                        <ERPConnectorLogo 
                          logoUrl={connector.logo_url}
                          label={connector.label}
                          vendor={connector.vendor}
                          size="sm"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{connector.label}</p>
                          <p className="text-xs text-muted-foreground truncate">{connector.vendor}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {connectors.length > 12 && (
                    <Button 
                      variant="link" 
                      className="w-full mt-2"
                      onClick={() => setActiveTab('migration')}
                    >
                      Ver todos los {connectors.length} conectores
                    </Button>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Active Migration Progress */}
          {activeSession && activeSession.status === 'running' && (
            <Card className="border-primary/50 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  Migración en Progreso
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{activeSession.session_name}</span>
                    <span className="text-sm text-muted-foreground">
                      {activeSession.migrated_records.toLocaleString()} / {activeSession.total_records.toLocaleString()} registros
                    </span>
                  </div>
                  <Progress value={progress} className="h-2" />
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm">
                      <Pause className="h-4 w-4 mr-2" />
                      Pausar
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setActiveTab('monitoring')}>
                      Ver Detalles
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="migration">
          <ERPMigrationPanel 
            companyId={effectiveCompanyId}
            showNewDialog={showNewMigration}
            onCloseDialog={() => setShowNewMigration(false)}
          />
        </TabsContent>

        <TabsContent value="mapping">
          <ERPDataMappingPanel sessionId={activeSession?.id} />
        </TabsContent>

        <TabsContent value="validation">
          <ERPValidationPanel sessionId={activeSession?.id} />
        </TabsContent>

        <TabsContent value="monitoring">
          <ERPMonitoringPanel sessionId={activeSession?.id} />
        </TabsContent>

        <TabsContent value="compliance">
          <ERPCompliancePanel sessionId={activeSession?.id} />
        </TabsContent>

        <TabsContent value="fiscal">
          <ERPFiscalReconciliationPanel sessionId={activeSession?.id} />
        </TabsContent>

        <TabsContent value="rollback">
          <ERPRollbackPanel sessionId={activeSession?.id} />
        </TabsContent>

        <TabsContent value="reports">
          <ERPReportsPanel sessionId={activeSession?.id} />
        </TabsContent>

        <TabsContent value="tools">
          <ERPAdvancedToolsPanel sessionId={activeSession?.id} />
        </TabsContent>

        <TabsContent value="ai-assistant">
          <ERPAIAssistantPanel sessionId={activeSession?.id} />
        </TabsContent>

        <TabsContent value="knowledge">
          <ERPKnowledgeUploader sessionId={activeSession?.id} />
        </TabsContent>

        <TabsContent value="news">
          <ERPNewsPanel sessionId={activeSession?.id} />
        </TabsContent>

        <TabsContent value="trends">
          <ERPTrends2026Panel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ERPMigrationDashboard;
