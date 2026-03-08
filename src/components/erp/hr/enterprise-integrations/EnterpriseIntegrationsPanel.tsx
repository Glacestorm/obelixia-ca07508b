/**
 * EnterpriseIntegrationsPanel - Wave 1: BI Export, DMS, E-Sign
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  RefreshCw, BarChart3, FolderArchive, PenTool,
  Activity, CheckCircle, AlertTriangle, XCircle,
  ExternalLink, Download, Upload, Clock, Shield,
  Wifi, WifiOff, Server, FileText, Send
} from 'lucide-react';
import { useHREnterpriseIntegrations } from '@/hooks/admin/hr/useHREnterpriseIntegrations';
import type { EnterpriseConnector, BIDataset, DMSArchive, ESignEnvelope, IntegrationLogEntry } from '@/hooks/admin/hr/useHREnterpriseIntegrations';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
  companyId: string;
}

const STATUS_COLORS: Record<string, string> = {
  healthy: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
  degraded: 'bg-amber-500/15 text-amber-700 border-amber-500/30',
  down: 'bg-destructive/15 text-destructive border-destructive/30',
  unknown: 'bg-muted text-muted-foreground border-muted',
};

const ARCHIVE_STATUS_COLORS: Record<string, string> = {
  archived: 'bg-emerald-500/15 text-emerald-700',
  pending: 'bg-amber-500/15 text-amber-700',
  uploading: 'bg-blue-500/15 text-blue-700',
  failed: 'bg-destructive/15 text-destructive',
};

const ENVELOPE_STATUS_COLORS: Record<string, string> = {
  completed: 'bg-emerald-500/15 text-emerald-700',
  signed: 'bg-emerald-500/15 text-emerald-700',
  sent: 'bg-blue-500/15 text-blue-700',
  delivered: 'bg-blue-500/15 text-blue-700',
  draft: 'bg-muted text-muted-foreground',
  declined: 'bg-destructive/15 text-destructive',
  voided: 'bg-muted text-muted-foreground',
  expired: 'bg-amber-500/15 text-amber-700',
};

function HealthIcon({ status }: { status: string }) {
  if (status === 'healthy') return <Wifi className="h-4 w-4 text-emerald-600" />;
  if (status === 'degraded') return <Activity className="h-4 w-4 text-amber-600" />;
  if (status === 'down') return <WifiOff className="h-4 w-4 text-destructive" />;
  return <Server className="h-4 w-4 text-muted-foreground" />;
}

function LogStatusIcon({ status }: { status: string }) {
  if (status === 'success') return <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />;
  if (status === 'error') return <XCircle className="h-3.5 w-3.5 text-destructive" />;
  if (status === 'warning') return <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />;
  return <Activity className="h-3.5 w-3.5 text-muted-foreground" />;
}

// ========== CONNECTORS TAB ==========
function ConnectorsTab({ connectors, onHealthCheck, isLoading }: {
  connectors: EnterpriseConnector[];
  onHealthCheck: () => void;
  isLoading: boolean;
}) {
  const byType = {
    bi_export: connectors.filter(c => c.connector_type === 'bi_export'),
    dms: connectors.filter(c => c.connector_type === 'dms'),
    esign: connectors.filter(c => c.connector_type === 'esign'),
  };

  const typeLabels: Record<string, { label: string; icon: React.ReactNode }> = {
    bi_export: { label: 'BI / Analytics', icon: <BarChart3 className="h-4 w-4" /> },
    dms: { label: 'DMS / Documental', icon: <FolderArchive className="h-4 w-4" /> },
    esign: { label: 'Firma Electrónica', icon: <PenTool className="h-4 w-4" /> },
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Conectores enterprise configurados para integraciones externas.</p>
        <Button variant="outline" size="sm" onClick={onHealthCheck} disabled={isLoading} className="gap-1.5">
          <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} /> Health Check
        </Button>
      </div>

      {Object.entries(byType).map(([type, items]) => (
        <div key={type}>
          <div className="flex items-center gap-2 mb-2">
            {typeLabels[type]?.icon}
            <h4 className="text-sm font-semibold">{typeLabels[type]?.label}</h4>
            <Badge variant="secondary" className="text-[10px]">{items.length}</Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {items.map(c => (
              <Card key={c.id} className="border">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <HealthIcon status={c.health_status} />
                        <span className="font-medium text-sm">{c.name}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{c.provider} · {c.auth_type}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant="outline" className={cn("text-[10px]", STATUS_COLORS[c.health_status])}>
                        {c.health_status}
                      </Badge>
                      {c.is_active ? (
                        <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700">activo</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">inactivo</Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {items.length === 0 && (
              <p className="text-xs text-muted-foreground col-span-2 py-2">No hay conectores de tipo {typeLabels[type]?.label}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ========== BI EXPORT TAB ==========
function BIExportTab({ datasets, onExport }: { datasets: BIDataset[]; onExport: (id: string) => void }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Datasets preparados para consumo en Power BI, Tableau u otras herramientas BI.</p>
      <div className="space-y-2">
        {datasets.map(ds => (
          <Card key={ds.id} className="border">
            <CardContent className="p-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    <span className="font-medium text-sm">{ds.name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><FileText className="h-3 w-3" />{ds.dataset_type}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{ds.refresh_frequency}</span>
                    <span>{ds.export_format.toUpperCase()}</span>
                    <span>{ds.row_count.toLocaleString()} filas</span>
                  </div>
                  {ds.schema_definition?.fields && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {ds.schema_definition.fields.slice(0, 5).map((f, i) => (
                        <Badge key={i} variant="secondary" className="text-[9px]">{f.name}</Badge>
                      ))}
                      {(ds.schema_definition.fields.length > 5) && (
                        <Badge variant="secondary" className="text-[9px]">+{ds.schema_definition.fields.length - 5}</Badge>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <Button variant="outline" size="sm" className="gap-1 h-7 text-xs" onClick={() => onExport(ds.id)}>
                    <Download className="h-3 w-3" /> Exportar
                  </Button>
                  {ds.last_exported_at && (
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(ds.last_exported_at), { locale: es, addSuffix: true })}
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {datasets.length === 0 && (
          <Card className="border-dashed"><CardContent className="py-8 text-center text-muted-foreground text-sm">No hay datasets configurados</CardContent></Card>
        )}
      </div>
    </div>
  );
}

// ========== DMS TAB ==========
function DMSTab({ archives, onArchive }: { archives: DMSArchive[]; onArchive: () => void }) {
  const formatBytes = (bytes: number | null) => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Archivado automático de reportes, evidencias y documentos en el DMS corporativo.</p>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={onArchive}>
          <Upload className="h-3.5 w-3.5" /> Archivar nuevo
        </Button>
      </div>
      <div className="space-y-2">
        {archives.map(a => (
          <Card key={a.id} className="border">
            <CardContent className="p-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <FolderArchive className="h-4 w-4 text-primary" />
                    <span className="font-medium text-sm">{a.source_name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{a.source_type}</span>
                    <span>{formatBytes(a.file_size_bytes)}</span>
                    {a.remote_path && <span className="truncate max-w-[200px]" title={a.remote_path}>{a.remote_path}</span>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge variant="outline" className={cn("text-[10px]", ARCHIVE_STATUS_COLORS[a.archive_status])}>
                    {a.archive_status}
                  </Badge>
                  {a.archived_at && (
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(a.archived_at), { locale: es, addSuffix: true })}
                    </span>
                  )}
                  {a.retry_count > 0 && (
                    <span className="text-[10px] text-amber-600">{a.retry_count} reintentos</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {archives.length === 0 && (
          <Card className="border-dashed"><CardContent className="py-8 text-center text-muted-foreground text-sm">No hay archivos registrados</CardContent></Card>
        )}
      </div>
    </div>
  );
}

// ========== E-SIGN TAB ==========
function ESignTab({ envelopes, onCreate }: { envelopes: ESignEnvelope[]; onCreate: () => void }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Flujos de firma electrónica para contratos, reportes regulatorios y documentos críticos.</p>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={onCreate}>
          <Send className="h-3.5 w-3.5" /> Nuevo envelope
        </Button>
      </div>
      <div className="space-y-2">
        {envelopes.map(e => (
          <Card key={e.id} className="border">
            <CardContent className="p-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <PenTool className="h-4 w-4 text-primary" />
                    <span className="font-medium text-sm">{e.document_name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{e.document_type}</span>
                    {e.expiration_date && <span>· Expira: {new Date(e.expiration_date).toLocaleDateString('es-ES')}</span>}
                  </div>
                  {/* Signers */}
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {e.signers.map((s, i) => (
                      <Badge key={i} variant="outline" className={cn("text-[10px] gap-1",
                        s.status === 'signed' ? 'bg-emerald-500/10 text-emerald-700' :
                        s.status === 'declined' ? 'bg-destructive/10 text-destructive' :
                        'bg-muted'
                      )}>
                        {s.status === 'signed' ? <CheckCircle className="h-2.5 w-2.5" /> :
                         s.status === 'declined' ? <XCircle className="h-2.5 w-2.5" /> :
                         <Clock className="h-2.5 w-2.5" />}
                        {s.name} ({s.role})
                      </Badge>
                    ))}
                  </div>
                </div>
                <Badge variant="outline" className={cn("text-[10px] shrink-0", ENVELOPE_STATUS_COLORS[e.envelope_status])}>
                  {e.envelope_status}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
        {envelopes.length === 0 && (
          <Card className="border-dashed"><CardContent className="py-8 text-center text-muted-foreground text-sm">No hay envelopes de firma</CardContent></Card>
        )}
      </div>
    </div>
  );
}

// ========== LOGS TAB ==========
function LogsTab({ logs, summary, onRefresh }: {
  logs: IntegrationLogEntry[];
  summary: { total: number; success: number; errors: number; warnings: number };
  onRefresh: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-xs">{summary.total} total</Badge>
          <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-700">{summary.success} ok</Badge>
          <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive">{summary.errors} errores</Badge>
          <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-700">{summary.warnings} avisos</Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={onRefresh} className="gap-1">
          <RefreshCw className="h-3.5 w-3.5" /> Actualizar
        </Button>
      </div>
      <ScrollArea className="h-[400px]">
        <div className="space-y-1">
          {logs.map(log => (
            <div key={log.id} className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors">
              <LogStatusIcon status={log.status} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{log.action}</span>
                  <Badge variant="secondary" className="text-[9px]">{log.integration_type}</Badge>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  {log.resource_type && <span>{log.resource_type}</span>}
                  {log.duration_ms && <span>{log.duration_ms}ms</span>}
                  <span>{formatDistanceToNow(new Date(log.created_at), { locale: es, addSuffix: true })}</span>
                </div>
                {log.error_message && <p className="text-[11px] text-destructive mt-0.5">{log.error_message}</p>}
              </div>
            </div>
          ))}
          {logs.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">Sin registros de actividad</p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// ========== MAIN PANEL ==========
export function EnterpriseIntegrationsPanel({ companyId }: Props) {
  const [activeTab, setActiveTab] = useState('connectors');
  const {
    connectors, biDatasets, dmsArchives, esignEnvelopes,
    logs, logSummary, isLoading,
    fetchConnectors, healthCheck,
    fetchBIDatasets, exportBIDataset,
    fetchDMSArchives, archiveDocument,
    fetchESignEnvelopes, createESignEnvelope,
    fetchLogs, loadAll, startAutoRefresh, stopAutoRefresh,
  } = useHREnterpriseIntegrations(companyId);

  useEffect(() => {
    loadAll();
    startAutoRefresh(120000);
    return () => stopAutoRefresh();
  }, [companyId]);

  const handleExport = useCallback((datasetId: string) => {
    exportBIDataset(datasetId);
  }, [exportBIDataset]);

  const handleArchive = useCallback(() => {
    archiveDocument('executive_report', crypto.randomUUID(), 'Reporte Ejecutivo Q1 2026');
  }, [archiveDocument]);

  const handleCreateEnvelope = useCallback(() => {
    createESignEnvelope('premium_contract', crypto.randomUUID(), 'Contrato Premium Demo', [
      { name: 'Director RRHH', email: 'hr@empresa.com', role: 'signer' },
      { name: 'CEO', email: 'ceo@empresa.com', role: 'approver' },
    ]);
  }, [createESignEnvelope]);

  const stats = {
    totalConnectors: connectors.length,
    healthyConnectors: connectors.filter(c => c.health_status === 'healthy').length,
    totalDatasets: biDatasets.length,
    totalArchives: dmsArchives.length,
    archivedCount: dmsArchives.filter(a => a.archive_status === 'archived').length,
    totalEnvelopes: esignEnvelopes.length,
    completedEnvelopes: esignEnvelopes.filter(e => e.envelope_status === 'completed' || e.envelope_status === 'signed').length,
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20">
            <ExternalLink className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Integraciones Enterprise — Wave 1</h2>
            <p className="text-xs text-muted-foreground">BI Export · DMS Documental · Firma Electrónica</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={loadAll} disabled={isLoading} className="gap-1.5">
          <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
          Actualizar
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border">
          <CardContent className="p-3 flex items-center gap-3">
            <Server className="h-8 w-8 text-primary/70" />
            <div>
              <p className="text-xl font-bold">{stats.healthyConnectors}/{stats.totalConnectors}</p>
              <p className="text-[11px] text-muted-foreground">Conectores OK</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border">
          <CardContent className="p-3 flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-blue-500/70" />
            <div>
              <p className="text-xl font-bold">{stats.totalDatasets}</p>
              <p className="text-[11px] text-muted-foreground">Datasets BI</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border">
          <CardContent className="p-3 flex items-center gap-3">
            <FolderArchive className="h-8 w-8 text-emerald-500/70" />
            <div>
              <p className="text-xl font-bold">{stats.archivedCount}/{stats.totalArchives}</p>
              <p className="text-[11px] text-muted-foreground">Archivados</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border">
          <CardContent className="p-3 flex items-center gap-3">
            <PenTool className="h-8 w-8 text-violet-500/70" />
            <div>
              <p className="text-xl font-bold">{stats.completedEnvelopes}/{stats.totalEnvelopes}</p>
              <p className="text-[11px] text-muted-foreground">Firmas completadas</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="connectors" className="text-xs gap-1"><Server className="h-3.5 w-3.5" /> Conectores</TabsTrigger>
          <TabsTrigger value="bi" className="text-xs gap-1"><BarChart3 className="h-3.5 w-3.5" /> BI Export</TabsTrigger>
          <TabsTrigger value="dms" className="text-xs gap-1"><FolderArchive className="h-3.5 w-3.5" /> DMS</TabsTrigger>
          <TabsTrigger value="esign" className="text-xs gap-1"><PenTool className="h-3.5 w-3.5" /> E-Sign</TabsTrigger>
          <TabsTrigger value="logs" className="text-xs gap-1"><Activity className="h-3.5 w-3.5" /> Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="connectors" className="mt-3">
          <ConnectorsTab connectors={connectors} onHealthCheck={healthCheck} isLoading={isLoading} />
        </TabsContent>
        <TabsContent value="bi" className="mt-3">
          <BIExportTab datasets={biDatasets} onExport={handleExport} />
        </TabsContent>
        <TabsContent value="dms" className="mt-3">
          <DMSTab archives={dmsArchives} onArchive={handleArchive} />
        </TabsContent>
        <TabsContent value="esign" className="mt-3">
          <ESignTab envelopes={esignEnvelopes} onCreate={handleCreateEnvelope} />
        </TabsContent>
        <TabsContent value="logs" className="mt-3">
          <LogsTab logs={logs} summary={logSummary} onRefresh={fetchLogs} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default EnterpriseIntegrationsPanel;
