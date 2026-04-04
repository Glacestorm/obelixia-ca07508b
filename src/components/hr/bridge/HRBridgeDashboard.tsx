/**
 * HRBridgeDashboard — Fase H
 * Displays sync status, approvals, traceability, and errors
 */
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  RefreshCw, ArrowRightLeft, CheckCircle, XCircle, Clock,
  AlertTriangle, Shield, Landmark, Scale
} from 'lucide-react';
import { useHRBridge } from '@/hooks/hr/useHRBridge';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const STATUS_MAP: Record<string, { label: string; icon: typeof Clock; className: string }> = {
  pending: { label: 'Pendiente', icon: Clock, className: 'bg-muted text-muted-foreground' },
  processing: { label: 'Procesando', icon: RefreshCw, className: 'bg-primary/10 text-primary' },
  synced: { label: 'Sincronizado', icon: CheckCircle, className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  failed: { label: 'Error', icon: XCircle, className: 'bg-destructive/10 text-destructive' },
  rejected: { label: 'Rechazado', icon: XCircle, className: 'bg-destructive/10 text-destructive' },
};

const BRIDGE_TYPE_LABELS: Record<string, { label: string; icon: typeof Landmark }> = {
  accounting: { label: 'Contabilidad', icon: Landmark },
  treasury: { label: 'Tesorería', icon: Landmark },
  legal: { label: 'Legal', icon: Scale },
  sepa: { label: 'SEPA', icon: ArrowRightLeft },
};

interface HRBridgeDashboardProps {
  companyId?: string;
  className?: string;
}

export function HRBridgeDashboard({ companyId, className }: HRBridgeDashboardProps) {
  const { logs, approvals, isLoading, fetchLogs, fetchApprovals, approveItem } = useHRBridge(companyId);
  const [activeTab, setActiveTab] = useState('status');

  useEffect(() => {
    fetchLogs();
    fetchApprovals();
  }, [fetchLogs, fetchApprovals]);

  const handleRefresh = useCallback(() => {
    fetchLogs();
    fetchApprovals();
  }, [fetchLogs, fetchApprovals]);

  // Summary stats
  const synced = logs.filter(l => l.status === 'synced').length;
  const pending = logs.filter(l => l.status === 'pending' || l.status === 'processing').length;
  const failed = logs.filter(l => l.status === 'failed').length;

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <ArrowRightLeft className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Bridge Contabilidad / Tesorería</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Sincronización cross-module · PGC 2007
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={isLoading} className="h-8 w-8">
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </Button>
        </div>

        {/* Summary KPIs */}
        <div className="grid grid-cols-3 gap-2 mt-3">
          <div className="p-2 rounded-lg bg-green-50 dark:bg-green-900/10 text-center">
            <div className="text-lg font-bold text-green-700 dark:text-green-400">{synced}</div>
            <div className="text-[10px] text-muted-foreground">Sincronizados</div>
          </div>
          <div className="p-2 rounded-lg bg-primary/5 text-center">
            <div className="text-lg font-bold text-primary">{pending}</div>
            <div className="text-[10px] text-muted-foreground">Pendientes</div>
          </div>
          <div className="p-2 rounded-lg bg-destructive/5 text-center">
            <div className="text-lg font-bold text-destructive">{failed}</div>
            <div className="text-[10px] text-muted-foreground">Errores</div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-3">
            <TabsTrigger value="status" className="text-xs">Estado</TabsTrigger>
            <TabsTrigger value="approvals" className="text-xs">
              Aprobaciones
              {approvals.length > 0 && (
                <Badge variant="destructive" className="ml-1 text-[9px] px-1 py-0">{approvals.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="trace" className="text-xs">Trazabilidad</TabsTrigger>
          </TabsList>

          <TabsContent value="status" className="mt-0">
            <ScrollArea className="h-[300px]">
              {logs.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  Sin registros de sincronización
                </div>
              ) : (
                <div className="space-y-2">
                  {logs.slice(0, 20).map((log) => {
                    const statusCfg = STATUS_MAP[log.status] || STATUS_MAP.pending;
                    const typeCfg = BRIDGE_TYPE_LABELS[log.bridge_type] || BRIDGE_TYPE_LABELS.accounting;
                    const StatusIcon = statusCfg.icon;
                    return (
                      <div key={log.id} className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <typeCfg.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div className="min-w-0">
                              <span className="text-sm font-medium">{typeCfg.label}</span>
                              <span className="text-xs text-muted-foreground ml-2">
                                {log.source_module} → {log.target_module}
                              </span>
                            </div>
                          </div>
                          <Badge className={cn('text-[10px] shrink-0', statusCfg.className)}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusCfg.label}
                          </Badge>
                        </div>
                        {log.error_message && (
                          <p className="text-xs text-destructive mt-1">{log.error_message}</p>
                        )}
                        <p className="text-[11px] text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(log.created_at), { locale: es, addSuffix: true })}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="approvals" className="mt-0">
            <ScrollArea className="h-[300px]">
              {approvals.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  <Shield className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                  Sin aprobaciones pendientes
                </div>
              ) : (
                <div className="space-y-2">
                  {approvals.map((appr) => (
                    <div key={appr.id} className="p-3 rounded-lg border bg-card">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-medium">{appr.approval_type}</span>
                          <p className="text-[11px] text-muted-foreground">
                            {formatDistanceToNow(new Date(appr.created_at), { locale: es, addSuffix: true })}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => approveItem(appr.id, false)}>
                            <XCircle className="h-3 w-3 mr-1" /> Rechazar
                          </Button>
                          <Button size="sm" className="h-7 text-xs" onClick={() => approveItem(appr.id, true)}>
                            <CheckCircle className="h-3 w-3 mr-1" /> Aprobar
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="trace" className="mt-0">
            <ScrollArea className="h-[300px]">
              <div className="space-y-1">
                {logs.filter(l => l.status === 'synced').slice(0, 15).map((log) => (
                  <div key={log.id} className="p-2 rounded border-l-2 border-green-500 bg-muted/30">
                    <div className="flex items-center gap-2 text-xs">
                      <CheckCircle className="h-3 w-3 text-green-600 shrink-0" />
                      <span className="font-medium">{log.bridge_type}</span>
                      <span className="text-muted-foreground">→</span>
                      <span>{log.target_module}</span>
                      {log.source_record_id && (
                        <Badge variant="outline" className="text-[9px] ml-auto">{log.source_record_id}</Badge>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {log.processed_at
                        ? formatDistanceToNow(new Date(log.processed_at), { locale: es, addSuffix: true })
                        : 'Sin timestamp'
                      }
                    </p>
                  </div>
                ))}
                {logs.filter(l => l.status === 'synced').length === 0 && (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    Sin registros trazables aún
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Disclaimer */}
        <div className="flex items-start gap-2 p-2 rounded-lg bg-muted/50 mt-3">
          <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-[10px] text-muted-foreground">
            Bridge preparatorio — los asientos contables generados requieren validación antes de contabilización definitiva.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default HRBridgeDashboard;
