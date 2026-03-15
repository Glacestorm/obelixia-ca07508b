/**
 * RegulatoryIntelligencePanel - Transversal regulatory intelligence view
 * Integrates into the Supervisor global dashboard
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Newspaper, Globe, FileText, AlertTriangle, CheckCircle, Clock,
  ExternalLink, RefreshCw, Shield, Activity, Eye, BookOpen,
  Scale, Users, Building2
} from 'lucide-react';
import { useRegulatoryIntelligence, type RegulatoryDocument } from '@/hooks/admin/useRegulatoryIntelligence';
import { RegistryAgentCard } from './RegistryAgentCard';
import { RegistryAgentConfigSheet } from './RegistryAgentConfigSheet';
import { useSupervisorDomainData, type RegistryAgent } from '@/hooks/admin/agents/useSupervisorDomainData';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const IMPACT_CONFIG: Record<string, { label: string; color: string; icon: typeof AlertTriangle }> = {
  critical: { label: 'Crítico', color: 'bg-destructive/15 text-destructive border-destructive/30', icon: AlertTriangle },
  high: { label: 'Alto', color: 'bg-amber-500/15 text-amber-700 border-amber-500/30', icon: AlertTriangle },
  medium: { label: 'Medio', color: 'bg-blue-500/15 text-blue-700 border-blue-500/30', icon: Activity },
  low: { label: 'Bajo', color: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30', icon: CheckCircle },
};

const JURISDICTION_FLAGS: Record<string, string> = {
  ES: '🇪🇸', EU: '🇪🇺', AD: '🇦🇩', UK: '🇬🇧', INT: '🌍',
};

const DOMAIN_LABELS: Record<string, { label: string; icon: typeof Users }> = {
  hr: { label: 'RRHH', icon: Users },
  legal: { label: 'Jurídico', icon: Scale },
  compliance: { label: 'Compliance', icon: Shield },
  fiscal: { label: 'Fiscal', icon: Building2 },
};

function DocumentCard({ doc }: { doc: RegulatoryDocument }) {
  const impact = IMPACT_CONFIG[doc.impact_level] || IMPACT_CONFIG.medium;

  return (
    <Card className={cn("transition-all hover:shadow-md",
      doc.impact_level === 'critical' && "border-l-4 border-l-destructive")}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Badge variant="outline" className="text-[10px]">
                {JURISDICTION_FLAGS[doc.jurisdiction_code] || '🏳️'} {doc.jurisdiction_code}
              </Badge>
              <Badge variant="outline" className={cn("text-[10px]", impact.color)}>
                {impact.label}
              </Badge>
              {doc.reference_code && (
                <Badge variant="secondary" className="text-[10px]">{doc.reference_code}</Badge>
              )}
              {doc.data_source === 'seed' && (
                <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 border-blue-500/30">Seed</Badge>
              )}
              {doc.origin_verified && (
                <CheckCircle className="h-3 w-3 text-emerald-500 shrink-0" />
              )}
            </div>
            <h4 className="text-sm font-semibold leading-tight">{doc.document_title}</h4>
          </div>
          {doc.source_url && (
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0"
              onClick={() => window.open(doc.source_url!, '_blank')}>
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {doc.summary && (
          <p className="text-xs text-muted-foreground line-clamp-2">{doc.summary}</p>
        )}

        {doc.impact_summary && (
          <div className="p-2 rounded-md bg-muted/60 border">
            <p className="text-[11px] font-medium mb-0.5 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-amber-500" /> Impacto detectado
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

export function RegulatoryIntelligencePanel() {
  const { sources, documents, loading, stats, refresh } = useRegulatoryIntelligence();
  const domainData = useSupervisorDomainData();
  const [activeTab, setActiveTab] = useState('documents');
  const [configAgent, setConfigAgent] = useState<RegistryAgent | null>(null);
  const [configOpen, setConfigOpen] = useState(false);

  const regulatoryAgent = domainData.agents.find(a => a.code === 'regulatory-intelligence');
  const agentInvocations = domainData.invocations.filter(i => i.agent_code === 'regulatory-intelligence');

  const domainFilter = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {/* Header + Agent Card */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg">
            <Newspaper className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Inteligencia Normativa</h3>
            <p className="text-xs text-muted-foreground">
              {stats.totalSources} fuentes · {stats.totalDocuments} documentos · {stats.highImpact} alto impacto
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-violet-500/10 text-violet-700 border-violet-500/30 text-[10px]">Live</Badge>
          <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
            <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", loading && "animate-spin")} /> Actualizar
          </Button>
        </div>
      </div>

      {/* Quick KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Fuentes activas', value: stats.enabledSources, icon: Globe, color: 'text-blue-500' },
          { label: 'Impacto HR', value: stats.byDomain.hr, icon: Users, color: 'text-blue-600' },
          { label: 'Impacto Legal', value: stats.byDomain.legal, icon: Scale, color: 'text-amber-600' },
          { label: 'Impacto Compliance', value: stats.byDomain.compliance, icon: Shield, color: 'text-violet-600' },
          { label: 'Rev. humana', value: stats.pendingReview, icon: Eye, color: 'text-rose-500' },
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

      {/* Agent card if registered */}
      {regulatoryAgent && (
        <RegistryAgentCard
          agent={regulatoryAgent}
          invocationCount={agentInvocations.length}
          lastInvocation={agentInvocations[0]?.created_at}
          onConfigure={(a) => { setConfigAgent(a); setConfigOpen(true); }}
        />
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="documents" className="text-xs gap-1">
            <FileText className="h-3.5 w-3.5" /> Documentos ({documents.length})
          </TabsTrigger>
          <TabsTrigger value="sources" className="text-xs gap-1">
            <Globe className="h-3.5 w-3.5" /> Fuentes ({sources.length})
          </TabsTrigger>
          <TabsTrigger value="activity" className="text-xs gap-1">
            <Activity className="h-3.5 w-3.5" /> Actividad
          </TabsTrigger>
        </TabsList>

        <TabsContent value="documents" className="mt-3">
          <ScrollArea className="h-[500px]">
            <div className="space-y-3">
              {documents.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">Sin documentos normativos</p>
                    <p className="text-xs mt-1">Los documentos aparecerán cuando el agente procese fuentes</p>
                  </CardContent>
                </Card>
              ) : documents.map(doc => (
                <DocumentCard key={doc.id} doc={doc} />
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="sources" className="mt-3">
          <ScrollArea className="h-[500px]">
            <div className="space-y-2">
              {sources.map(src => (
                <Card key={src.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn("p-1.5 rounded-lg",
                          src.is_enabled ? "bg-emerald-500/10" : "bg-muted")}>
                          <Globe className={cn("h-4 w-4",
                            src.is_enabled ? "text-emerald-600" : "text-muted-foreground")} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{src.name}</span>
                            <Badge variant="outline" className="text-[9px]">
                              {JURISDICTION_FLAGS[src.jurisdiction_code] || '🏳️'} {src.jurisdiction_code}
                            </Badge>
                            <Badge variant={src.is_enabled ? "default" : "secondary"} className="text-[9px]">
                              {src.is_enabled ? 'Activa' : 'Inactiva'}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                            <span>{src.issuing_body}</span>
                            <span>·</span>
                            <span>Refresco: {src.refresh_frequency}</span>
                            {src.last_checked_at && (
                              <>
                                <span>·</span>
                                <span>Últ.: {formatDistanceToNow(new Date(src.last_checked_at), { locale: es, addSuffix: true })}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      {src.url && (
                        <Button variant="ghost" size="icon" className="h-7 w-7"
                          onClick={() => window.open(src.url!, '_blank')}>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

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
                      {(inv.metadata as any)?.source === 'seed' && (
                        <Badge variant="outline" className="text-[10px] py-0 bg-blue-500/10 text-blue-600 border-blue-500/30">Seed</Badge>
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
