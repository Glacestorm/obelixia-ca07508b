/**
 * RegulatoryIntelligencePanel - Transversal regulatory intelligence view
 * With live refresh, change detection, feedback, and governance
 */

import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Newspaper, Globe, FileText, AlertTriangle, CheckCircle, Clock,
  ExternalLink, RefreshCw, Shield, Activity, Eye, Scale, Users,
  Building2, Zap, History, XCircle, ArrowUpDown
} from 'lucide-react';
import { useRegulatoryIntelligence, type RegulatoryDocument, type RegulatorySource, type RefreshLog } from '@/hooks/admin/useRegulatoryIntelligence';
import { RegistryAgentCard } from './RegistryAgentCard';
import { RegistryAgentConfigSheet } from './RegistryAgentConfigSheet';
import { useSupervisorDomainData, type RegistryAgent } from '@/hooks/admin/agents/useSupervisorDomainData';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const IMPACT_CONFIG: Record<string, { label: string; color: string }> = {
  critical: { label: 'Crítico', color: 'bg-destructive/15 text-destructive border-destructive/30' },
  high: { label: 'Alto', color: 'bg-amber-500/15 text-amber-700 border-amber-500/30' },
  medium: { label: 'Medio', color: 'bg-blue-500/15 text-blue-700 border-blue-500/30' },
  low: { label: 'Bajo', color: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30' },
};

const JURISDICTION_FLAGS: Record<string, string> = {
  ES: '🇪🇸', EU: '🇪🇺', AD: '🇦🇩', UK: '🇬🇧', INT: '🌍',
};

const CHANGE_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  new: { label: 'Nuevo', color: 'bg-emerald-500/15 text-emerald-700' },
  updated: { label: 'Actualizado', color: 'bg-amber-500/15 text-amber-700' },
  unchanged: { label: 'Sin cambios', color: 'bg-muted text-muted-foreground' },
};

const DOMAIN_LABELS: Record<string, { label: string; icon: typeof Users }> = {
  hr: { label: 'RRHH', icon: Users },
  legal: { label: 'Jurídico', icon: Scale },
  compliance: { label: 'Compliance', icon: Shield },
  fiscal: { label: 'Fiscal', icon: Building2 },
};

const REFRESH_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  idle: { label: 'Listo', color: 'text-muted-foreground' },
  running: { label: 'Refrescando...', color: 'text-blue-600' },
  error: { label: 'Error', color: 'text-destructive' },
};

function DocumentCard({ doc }: { doc: RegulatoryDocument }) {
  const impact = IMPACT_CONFIG[doc.impact_level] || IMPACT_CONFIG.medium;
  const changeType = CHANGE_TYPE_CONFIG[doc.change_type] || CHANGE_TYPE_CONFIG.new;

  return (
    <Card className={cn("transition-all hover:shadow-md",
      doc.impact_level === 'critical' && "border-l-4 border-l-destructive")}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap mb-1">
              <Badge variant="outline" className="text-[10px]">
                {JURISDICTION_FLAGS[doc.jurisdiction_code] || '🏳️'} {doc.jurisdiction_code}
              </Badge>
              <Badge variant="outline" className={cn("text-[10px]", impact.color)}>
                {impact.label}
              </Badge>
              <Badge variant="outline" className={cn("text-[10px]", changeType.color)}>
                {changeType.label}
              </Badge>
              {doc.data_source === 'seed' ? (
                <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 border-blue-500/30">Seed</Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">Live</Badge>
              )}
              {doc.version > 1 && (
                <Badge variant="secondary" className="text-[9px]">v{doc.version}</Badge>
              )}
              {doc.origin_verified && <CheckCircle className="h-3 w-3 text-emerald-500 shrink-0" />}
            </div>
            <h4 className="text-sm font-semibold leading-tight">{doc.document_title}</h4>
            {doc.reference_code && (
              <p className="text-[10px] text-muted-foreground mt-0.5">{doc.reference_code}</p>
            )}
          </div>
          {doc.source_url && (
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0"
              onClick={() => window.open(doc.source_url!, '_blank')}>
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {doc.summary && <p className="text-xs text-muted-foreground line-clamp-2">{doc.summary}</p>}

        {doc.impact_summary && (
          <div className="p-2 rounded-md bg-muted/60 border">
            <p className="text-[11px] font-medium mb-0.5 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-amber-500" /> Impacto
            </p>
            <p className="text-[11px] text-muted-foreground line-clamp-2">{doc.impact_summary}</p>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex flex-wrap gap-1">
            {doc.impact_domains?.map(d => {
              const cfg = DOMAIN_LABELS[d];
              return cfg ? (
                <Badge key={d} variant="outline" className="text-[9px] py-0 gap-0.5">
                  <cfg.icon className="h-2.5 w-2.5" /> {cfg.label}
                </Badge>
              ) : null;
            })}
          </div>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground shrink-0">
            {doc.source_code && <span>{doc.source_code}</span>}
            {doc.publication_date && (
              <span className="flex items-center gap-0.5">
                <Clock className="h-2.5 w-2.5" />
                {new Date(doc.publication_date).toLocaleDateString('es')}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SourceCard({ source, onRefresh }: { source: RegulatorySource; onRefresh: (id: string) => void }) {
  const refreshStatus = REFRESH_STATUS_CONFIG[source.refresh_status] || REFRESH_STATUS_CONFIG.idle;

  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <div className={cn("p-1.5 rounded-lg",
              source.is_enabled ? "bg-emerald-500/10" : "bg-muted")}>
              <Globe className={cn("h-4 w-4",
                source.is_enabled ? "text-emerald-600" : "text-muted-foreground")} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium">{source.name}</span>
                <Badge variant="outline" className="text-[9px]">
                  {JURISDICTION_FLAGS[source.jurisdiction_code] || '🏳️'} {source.jurisdiction_code}
                </Badge>
                <Badge variant={source.is_enabled ? "default" : "secondary"} className="text-[9px]">
                  {source.is_enabled ? 'Activa' : 'Inactiva'}
                </Badge>
                <Badge variant="outline" className="text-[9px]">
                  {source.ingestion_method === 'auto' ? '⚡ Auto' : '📝 Manual'}
                </Badge>
                {source.refresh_status === 'error' && (
                  <Badge variant="destructive" className="text-[9px]">Error</Badge>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground flex-wrap">
                <span>{source.issuing_body}</span>
                <span>·</span>
                <span>Refresco: {source.refresh_frequency}</span>
                <span>·</span>
                <span className={refreshStatus.color}>{refreshStatus.label}</span>
                {source.last_success_at && (
                  <>
                    <span>·</span>
                    <span>Éxito: {formatDistanceToNow(new Date(source.last_success_at), { locale: es, addSuffix: true })}</span>
                  </>
                )}
                {source.last_error_message && (
                  <span className="text-destructive truncate max-w-[200px]" title={source.last_error_message}>
                    ⚠ {source.last_error_message}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="h-7 w-7"
              onClick={() => onRefresh(source.id)}
              disabled={source.refresh_status === 'running'}>
              <RefreshCw className={cn("h-3.5 w-3.5", source.refresh_status === 'running' && "animate-spin")} />
            </Button>
            {source.url && (
              <Button variant="ghost" size="icon" className="h-7 w-7"
                onClick={() => window.open(source.url!, '_blank')}>
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RefreshLogEntry({ log, sourceName }: { log: RefreshLog; sourceName?: string }) {
  return (
    <div className="flex items-start gap-3 p-2.5 rounded-lg border bg-card">
      <div className="shrink-0 mt-0.5">
        {log.status === 'completed' ? <CheckCircle className="h-4 w-4 text-emerald-600" /> :
         log.status === 'failed' ? <XCircle className="h-4 w-4 text-destructive" /> :
         <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {sourceName && <span className="text-xs font-medium">{sourceName}</span>}
          <Badge variant="outline" className={cn("text-[10px] py-0",
            log.status === 'completed' ? 'bg-emerald-500/15 text-emerald-700' :
            log.status === 'failed' ? 'bg-destructive/15 text-destructive' : 'bg-blue-500/15 text-blue-700')}>
            {log.status === 'completed' ? 'Completado' : log.status === 'failed' ? 'Error' : 'En curso'}
          </Badge>
          <Badge variant="outline" className={cn("text-[9px] py-0",
            log.trigger_type === 'scheduled' ? 'bg-violet-500/10 text-violet-600 border-violet-500/30' :
            log.trigger_type === 'seed' ? 'bg-blue-500/10 text-blue-600 border-blue-500/30' :
            'bg-muted text-muted-foreground')}>
            {log.trigger_type === 'scheduled' ? '⏰ Programado' : log.trigger_type === 'seed' ? '🌱 Seed' : '👤 Manual'}
          </Badge>
          {log.documents_new > 0 && (
            <Badge variant="outline" className="text-[9px] py-0 bg-emerald-500/10 text-emerald-600">
              +{log.documents_new} nuevos
            </Badge>
          )}
          {log.documents_updated > 0 && (
            <Badge variant="outline" className="text-[9px] py-0 bg-amber-500/10 text-amber-600">
              {log.documents_updated} actualizados
            </Badge>
          )}
          <span className="text-[10px] text-muted-foreground ml-auto">
            {formatDistanceToNow(new Date(log.started_at), { locale: es, addSuffix: true })}
          </span>
        </div>
        {log.error_message && (
          <p className="text-[10px] text-destructive mt-1">{log.error_message}</p>
        )}
      </div>
    </div>
  );
}

export function RegulatoryIntelligencePanel() {
  const {
    sources, documents, refreshLogs, loading, refreshing, stats,
    refresh, triggerRefreshAll, triggerRefreshSource,
  } = useRegulatoryIntelligence();
  const domainData = useSupervisorDomainData();
  const [activeTab, setActiveTab] = useState('documents');
  const [configAgent, setConfigAgent] = useState<RegistryAgent | null>(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [dataSourceFilter, setDataSourceFilter] = useState<string | null>(null);

  const regulatoryAgent = domainData.agents.find(a => a.code === 'regulatory-intelligence');
  const agentInvocations = domainData.invocations.filter(i => i.agent_code === 'regulatory-intelligence');

  const filteredDocs = useMemo(() => {
    if (!dataSourceFilter) return documents;
    return documents.filter(d => d.data_source === dataSourceFilter);
  }, [documents, dataSourceFilter]);

  const handleRefreshSource = useCallback((sourceId: string) => {
    triggerRefreshSource(sourceId);
  }, [triggerRefreshSource]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg">
            <Newspaper className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Inteligencia Normativa</h3>
            <p className="text-xs text-muted-foreground">
              {stats.enabledSources} fuentes · {stats.totalDocuments} docs ({stats.liveDocuments} live, {stats.seedDocuments} seed) · {stats.highImpact} alto impacto
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {stats.sourcesWithErrors > 0 && (
            <Badge variant="destructive" className="text-[10px]">
              {stats.sourcesWithErrors} errores
            </Badge>
          )}
          {stats.sourcesRefreshing > 0 && (
            <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 border-blue-500/30">
              <RefreshCw className="h-2.5 w-2.5 mr-1 animate-spin" /> Refrescando
            </Badge>
          )}
          <Badge variant="outline" className="bg-violet-500/10 text-violet-700 border-violet-500/30 text-[10px]">Live</Badge>
          <Button variant="outline" size="sm" onClick={triggerRefreshAll} disabled={refreshing}>
            <Zap className={cn("h-3.5 w-3.5 mr-1.5", refreshing && "animate-pulse")} />
            {refreshing ? 'Refrescando...' : 'Refrescar todo'}
          </Button>
          <Button variant="ghost" size="sm" onClick={refresh} disabled={loading}>
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          { label: 'Fuentes', value: stats.enabledSources, icon: Globe, color: 'text-blue-500' },
          { label: 'HR', value: stats.byDomain.hr, icon: Users, color: 'text-blue-600' },
          { label: 'Legal', value: stats.byDomain.legal, icon: Scale, color: 'text-amber-600' },
          { label: 'Compliance', value: stats.byDomain.compliance, icon: Shield, color: 'text-violet-600' },
          { label: 'Rev. humana', value: stats.pendingReview, icon: Eye, color: 'text-rose-500' },
          { label: 'Nuevos', value: stats.newDocuments, icon: Zap, color: 'text-emerald-500' },
        ].map(k => (
          <Card key={k.label} className="p-3">
            <div className="flex items-center gap-2">
              <k.icon className={cn("h-4 w-4", k.color)} />
              <div>
                <p className="text-lg font-bold">{k.value}</p>
                <p className="text-[10px] text-muted-foreground">{k.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Agent card */}
      {regulatoryAgent && (
        <RegistryAgentCard
          agent={regulatoryAgent}
          invocationCount={agentInvocations.length}
          lastInvocation={agentInvocations[0]?.created_at}
          onConfigure={(a) => { setConfigAgent(a); setConfigOpen(true); }}
        />
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="documents" className="text-xs gap-1">
            <FileText className="h-3.5 w-3.5" /> Documentos ({documents.length})
          </TabsTrigger>
          <TabsTrigger value="sources" className="text-xs gap-1">
            <Globe className="h-3.5 w-3.5" /> Fuentes ({sources.length})
          </TabsTrigger>
          <TabsTrigger value="refresh" className="text-xs gap-1">
            <History className="h-3.5 w-3.5" /> Refrescos
            {refreshLogs.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-4 px-1 text-[9px]">{refreshLogs.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="activity" className="text-xs gap-1">
            <Activity className="h-3.5 w-3.5" /> Actividad
          </TabsTrigger>
        </TabsList>

        {/* Documents */}
        <TabsContent value="documents" className="mt-3 space-y-3">
          {/* Filters */}
          <div className="flex items-center gap-2">
            <Button variant={dataSourceFilter === null ? "default" : "outline"} size="sm" className="text-[10px] h-7"
              onClick={() => setDataSourceFilter(null)}>Todos</Button>
            <Button variant={dataSourceFilter === 'live' ? "default" : "outline"} size="sm" className="text-[10px] h-7"
              onClick={() => setDataSourceFilter('live')}>Live</Button>
            <Button variant={dataSourceFilter === 'seed' ? "default" : "outline"} size="sm" className="text-[10px] h-7"
              onClick={() => setDataSourceFilter('seed')}>Seed</Button>
          </div>
          <ScrollArea className="h-[500px]">
            <div className="space-y-3">
              {filteredDocs.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Sin documentos normativos</p>
                    <p className="text-xs mt-1">Pulsa "Refrescar todo" para ingestar de fuentes oficiales</p>
                  </CardContent>
                </Card>
              ) : filteredDocs.map(doc => (
                <DocumentCard key={doc.id} doc={doc} />
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Sources */}
        <TabsContent value="sources" className="mt-3">
          <ScrollArea className="h-[500px]">
            <div className="space-y-2">
              {sources.map(src => (
                <SourceCard key={src.id} source={src} onRefresh={handleRefreshSource} />
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Refresh logs */}
        <TabsContent value="refresh" className="mt-3">
          <ScrollArea className="h-[500px]">
            <div className="space-y-2">
              {refreshLogs.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <History className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Sin historial de refresco</p>
                    <p className="text-xs mt-1">Los refrescos aparecerán aquí tras ejecutarse</p>
                  </CardContent>
                </Card>
              ) : refreshLogs.map(log => {
                const src = sources.find(s => s.id === log.source_id);
                return <RefreshLogEntry key={log.id} log={log} sourceName={src?.name} />;
              })}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Activity */}
        <TabsContent value="activity" className="mt-3">
          <ScrollArea className="h-[500px]">
            <div className="space-y-2">
              {agentInvocations.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <Activity className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Sin actividad registrada</p>
                  </CardContent>
                </Card>
              ) : agentInvocations.map(inv => (
                <Card key={inv.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge variant="outline" className={cn("text-[10px] py-0",
                        inv.outcome_status === 'success' ? 'bg-emerald-500/15 text-emerald-700' :
                        inv.outcome_status === 'human_review' ? 'bg-violet-500/15 text-violet-700' :
                        'bg-muted')}>
                        {inv.outcome_status === 'success' ? 'Éxito' : inv.outcome_status === 'human_review' ? 'Rev. humana' : inv.outcome_status}
                      </Badge>
                      {(inv.metadata as any)?.source === 'seed' ? (
                        <Badge variant="outline" className="text-[10px] py-0 bg-blue-500/10 text-blue-600 border-blue-500/30">Seed</Badge>
                      ) : (inv.metadata as any)?.source === 'live' ? (
                        <Badge variant="outline" className="text-[10px] py-0 bg-emerald-500/10 text-emerald-600 border-emerald-500/30">Live</Badge>
                      ) : null}
                      {(inv.metadata as any)?.action === 'refresh' && (
                        <Badge variant="outline" className="text-[10px] py-0 bg-indigo-500/10 text-indigo-600">Refresco</Badge>
                      )}
                      <span className="text-[10px] text-muted-foreground ml-auto">
                        {formatDistanceToNow(new Date(inv.created_at), { locale: es, addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-xs">{inv.input_summary}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{inv.response_summary}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      <RegistryAgentConfigSheet
        open={configOpen}
        onOpenChange={setConfigOpen}
        agent={configAgent}
        onSaved={() => domainData.refresh()}
      />
    </div>
  );
}

export default RegulatoryIntelligencePanel;
