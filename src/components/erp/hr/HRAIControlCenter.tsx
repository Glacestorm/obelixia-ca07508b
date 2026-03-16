/**
 * HRAIControlCenter - Mini-centro de control IA embebido en RRHH
 * Reutiliza RegistryAgentCard + RegistryAgentConfigSheet del Supervisor global
 */

import { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Bot, Brain, Shield, Scale, Activity, RefreshCw,
  CheckCircle, AlertTriangle, ArrowUpRight, Clock,
  Send, Eye, ExternalLink, Sparkles, UserCheck, Newspaper
} from 'lucide-react';
import { useRegulatoryIntelligence } from '@/hooks/admin/useRegulatoryIntelligence';
import { useRegulatoryFeedback } from '@/hooks/admin/useRegulatoryFeedback';
import { RegulatoryQualityDashboard } from '@/components/admin/agents/RegulatoryQualityDashboard';
import { useSupervisorDomainData, type RegistryAgent, type InvocationRecord } from '@/hooks/admin/agents/useSupervisorDomainData';
import { useMultiAgentSupervisor } from '@/hooks/erp/hr/useMultiAgentSupervisor';
import { RegistryAgentCard } from '@/components/admin/agents/RegistryAgentCard';
import { RegistryAgentConfigSheet } from '@/components/admin/agents/RegistryAgentConfigSheet';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface HRAIControlCenterProps {
  companyId: string;
}

const OUTCOME_CONFIG: Record<string, { label: string; color: string }> = {
  success: { label: 'Éxito', color: 'bg-emerald-500/15 text-emerald-700' },
  failed: { label: 'Fallido', color: 'bg-destructive/15 text-destructive' },
  escalated: { label: 'Escalado', color: 'bg-amber-500/15 text-amber-700' },
  human_review: { label: 'Revisión', color: 'bg-violet-500/15 text-violet-700' },
};

export function HRAIControlCenter({ companyId }: HRAIControlCenterProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [query, setQuery] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{ role: 'user' | 'supervisor'; content: string; metadata?: any }>>([]);
  const [configAgent, setConfigAgent] = useState<RegistryAgent | null>(null);
  const [configOpen, setConfigOpen] = useState(false);

  const { agents, hrAgents, hrInvocations, escalatedInvocations, humanReviewInvocations, invocations, stats, loading, refresh } = useSupervisorDomainData(companyId);
  const { isLoading, routeQuery, registry } = useMultiAgentSupervisor(companyId);
  const regulatory = useRegulatoryIntelligence();

  const regulatoryFeedback = useRegulatoryFeedback();

  // Filter feedback stats for HR domain only
  const hrFeedbackStats = useMemo(() => {
    const hrStats = { ...regulatoryFeedback.stats };
    // Show only HR domain quality if available
    if (hrStats.byDomain.hr) {
      const hr = hrStats.byDomain.hr;
      hrStats.acceptanceRate = hr.total > 0 ? hr.accepted / hr.total : 0;
    }
    return hrStats;
  }, [regulatoryFeedback.stats]);

  const hrRegulatoryDocs = useMemo(() =>
    regulatory.documents.filter(d => d.impact_domains?.includes('hr')).slice(0, 5),
    [regulatory.documents]
  );

  const hrEscalated = useMemo(() => escalatedInvocations.filter(i =>
    i.supervisor_code === 'hr-supervisor' || i.escalated_to === 'legal-supervisor'
  ), [escalatedInvocations]);

  const hrHumanReview = useMemo(() => humanReviewInvocations.filter(i =>
    i.supervisor_code === 'hr-supervisor'
  ), [humanReviewInvocations]);

  // Compute per-agent invocation stats
  const agentInvocationStats = useMemo(() => {
    const map = new Map<string, { count: number; last?: string }>();
    for (const inv of hrInvocations) {
      const existing = map.get(inv.agent_code);
      if (!existing) {
        map.set(inv.agent_code, { count: 1, last: inv.created_at });
      } else {
        existing.count++;
        if (inv.created_at > (existing.last || '')) existing.last = inv.created_at;
      }
    }
    return map;
  }, [hrInvocations]);

  const handleSendQuery = useCallback(async () => {
    if (!query.trim() || isLoading) return;
    const q = query.trim();
    setQuery('');
    setChatHistory(prev => [...prev, { role: 'user', content: q }]);

    const result = await routeQuery(q);
    if (result) {
      const agentName = registry.find(a => a.code === result.routing.agent_code)?.name || result.routing.agent_code;
      let responseText = '';
      if (result.response?.data?.response) {
        responseText = typeof result.response.data.response === 'string'
          ? result.response.data.response
          : JSON.stringify(result.response.data.response, null, 2);
      } else if (result.response?.data) {
        responseText = typeof result.response.data === 'string'
          ? result.response.data
          : JSON.stringify(result.response.data, null, 2);
      } else {
        responseText = 'Respuesta procesada correctamente.';
      }

      setChatHistory(prev => [...prev, {
        role: 'supervisor',
        content: responseText,
        metadata: {
          agent: agentName,
          domain: result.routing.domain,
          confidence: result.routing.confidence,
          reasoning: result.routing.reasoning,
          escalated: !!result.routing.escalated_to,
          executionTime: result.execution_time_ms,
          outcome: result.outcome_status,
        }
      }]);
      refresh();
    }
  }, [query, isLoading, routeQuery, registry, refresh]);

  const handleConfigure = useCallback((agent: RegistryAgent) => {
    setConfigAgent(agent);
    setConfigOpen(true);
  }, []);

  const handleViewLogs = useCallback((agent: RegistryAgent) => {
    setActiveTab('log');
  }, []);

  const handleInteract = useCallback((agent: RegistryAgent) => {
    setActiveTab('chat');
    setQuery(`[${agent.name}] `);
  }, []);

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 via-background to-violet-500/5">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-violet-600 shadow-lg">
                <Brain className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">Control IA · RRHH</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {hrAgents.length} agentes HR · {hrEscalated.length} escalados · {hrHumanReview.length} rev. humana
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-500/30">
                <Activity className="h-3 w-3 mr-1" /> Activo
              </Badge>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={refresh} disabled={loading}>
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" />
              <div>
                <p className="text-lg font-bold">{hrAgents.length}</p>
                <p className="text-[10px] text-muted-foreground">Agentes HR</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              <div>
                <p className="text-lg font-bold">{hrInvocations.filter(i => i.outcome_status === 'success').length}</p>
                <p className="text-[10px] text-muted-foreground">Éxitos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4 text-amber-500" />
              <div>
                <p className="text-lg font-bold">{hrEscalated.length}</p>
                <p className="text-[10px] text-muted-foreground">Escalados Legal</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-violet-500" />
              <div>
                <p className="text-lg font-bold">{hrHumanReview.length}</p>
                <p className="text-[10px] text-muted-foreground">Rev. humana</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="text-xs gap-1"><Bot className="h-3.5 w-3.5" /> Agentes</TabsTrigger>
          <TabsTrigger value="chat" className="text-xs gap-1"><Send className="h-3.5 w-3.5" /> Consultar</TabsTrigger>
          <TabsTrigger value="normativa" className="text-xs gap-1">
            <Newspaper className="h-3.5 w-3.5" /> Normativa
            {hrRegulatoryDocs.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-4 px-1 text-[9px]">{hrRegulatoryDocs.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="escalations" className="text-xs gap-1">
            <Scale className="h-3.5 w-3.5" /> Escalados
            {hrEscalated.length > 0 && (
              <Badge variant="destructive" className="ml-1 h-4 px-1 text-[9px]">{hrEscalated.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="log" className="text-xs gap-1"><Activity className="h-3.5 w-3.5" /> Actividad</TabsTrigger>
        </TabsList>

        {/* Agents Overview - NOW USES RegistryAgentCard */}
        <TabsContent value="overview" className="mt-3 space-y-3">
          {hrAgents.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center text-muted-foreground">
                <Bot className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Sin agentes HR registrados</p>
                <p className="text-xs mt-1">Los agentes aparecerán aquí al registrarse en el catálogo</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Supervisors first */}
              {hrAgents.filter(a => a.agent_type === 'supervisor').map(agent => {
                const s = agentInvocationStats.get(agent.code);
                return (
                  <RegistryAgentCard
                    key={agent.id}
                    agent={agent}
                    invocationCount={s?.count || 0}
                    lastInvocation={s?.last}
                    onInteract={handleInteract}
                    onConfigure={handleConfigure}
                    onViewLogs={handleViewLogs}
                  />
                );
              })}
              {/* Then specialized agents */}
              {hrAgents.filter(a => a.agent_type !== 'supervisor').map(agent => {
                const s = agentInvocationStats.get(agent.code);
                return (
                  <RegistryAgentCard
                    key={agent.id}
                    agent={agent}
                    invocationCount={s?.count || 0}
                    lastInvocation={s?.last}
                    onInteract={handleInteract}
                    onConfigure={handleConfigure}
                    onViewLogs={handleViewLogs}
                  />
                );
              })}
            </div>
          )}

          {/* Link to global supervisor */}
          <Card className="border-dashed bg-muted/30">
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground">
                <ExternalLink className="h-3 w-3 inline mr-1" />
                Para supervisión global ERP/CRM → <strong>Centro de Control de Agentes IA</strong> en Admin
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Chat with HR Supervisor */}
        <TabsContent value="chat" className="mt-3">
          <Card>
            <CardContent className="p-4 space-y-4">
              <ScrollArea className="h-[350px] pr-2">
                <div className="space-y-3">
                  {chatHistory.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <Sparkles className="h-10 w-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm font-medium">HR Supervisor</p>
                      <p className="text-xs mt-1">Clasifica tu consulta → Ops / Compliance / Legal</p>
                    </div>
                  )}
                  {chatHistory.map((msg, i) => (
                    <div key={i} className={cn("flex", msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                      <div className={cn("max-w-[85%] rounded-xl px-4 py-2.5 text-sm",
                        msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted border')}>
                        <p className="whitespace-pre-wrap">{msg.content.substring(0, 2000)}</p>
                        {msg.metadata && (
                          <div className="mt-2 pt-2 border-t border-border/30 space-y-1">
                            <div className="flex flex-wrap gap-1.5">
                              <Badge variant="outline" className="text-[10px] py-0">{msg.metadata.agent}</Badge>
                              <Badge variant="outline" className="text-[10px] py-0">
                                {Math.round(msg.metadata.confidence * 100)}%
                              </Badge>
                              {msg.metadata.escalated && (
                                <Badge variant="outline" className="text-[10px] py-0 bg-amber-500/15 text-amber-700">
                                  <ArrowUpRight className="h-2.5 w-2.5 mr-0.5" /> Legal
                                </Badge>
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground">{msg.metadata.reasoning} · {msg.metadata.executionTime}ms</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-muted border rounded-xl px-4 py-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Clasificando...
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
              <div className="flex gap-2">
                <Textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendQuery(); } }}
                  placeholder="Consulta RRHH... (nóminas, compliance, despidos...)"
                  className="min-h-[50px] resize-none text-sm"
                  disabled={isLoading}
                />
                <Button onClick={handleSendQuery} disabled={isLoading || !query.trim()} size="icon" className="h-[50px] w-12">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Normativa HR Feed */}
        <TabsContent value="normativa" className="mt-3">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Newspaper className="h-4 w-4 text-indigo-600" />
                  Novedades Normativas con Impacto RRHH
                  <Badge variant="outline" className="text-[9px] bg-violet-500/10 text-violet-700 border-violet-500/30">Live</Badge>
                </CardTitle>
                <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={() => regulatory.triggerRefreshAll()} disabled={regulatory.refreshing}>
                  <RefreshCw className={cn("h-3 w-3 mr-1", regulatory.refreshing && "animate-spin")} />
                  {regulatory.refreshing ? 'Refrescando...' : 'Refrescar'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Recent changes summary */}
              {regulatory.stats.newDocuments > 0 && (
                <div className="mb-3 p-2 rounded-md border bg-emerald-500/5 border-emerald-500/20">
                  <p className="text-[11px] text-emerald-700 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    {regulatory.stats.newDocuments} nuevos documentos · {regulatory.stats.liveDocuments} ingesta live · {regulatory.stats.pendingReview} pendientes de revisión
                  </p>
                </div>
              )}
              {/* Compact quality metrics for HR */}
              {regulatoryFeedback.stats.total > 0 && (
                <div className="mb-3">
                  <RegulatoryQualityDashboard stats={hrFeedbackStats} compact />
                </div>
              )}
              <ScrollArea className="h-[340px]">
                <div className="space-y-3">
                  {hrRegulatoryDocs.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Newspaper className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Sin novedades normativas para RRHH</p>
                      <p className="text-xs mt-1">Los documentos con impacto HR aparecerán aquí</p>
                    </div>
                  ) : hrRegulatoryDocs.map(doc => (
                    <div key={doc.id} className={cn("p-3 rounded-lg border",
                      doc.impact_level === 'critical' ? 'border-l-4 border-l-destructive bg-destructive/5' :
                      doc.impact_level === 'high' ? 'border-l-4 border-l-amber-500 bg-amber-500/5' : 'bg-card')}>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Badge variant="outline" className="text-[10px]">
                          {doc.jurisdiction_code === 'EU' ? '🇪🇺' : '🇪🇸'} {doc.jurisdiction_code}
                        </Badge>
                        <Badge variant="outline" className={cn("text-[10px]",
                          doc.impact_level === 'critical' ? 'bg-destructive/15 text-destructive' :
                          doc.impact_level === 'high' ? 'bg-amber-500/15 text-amber-700' :
                          'bg-blue-500/15 text-blue-700')}>
                          {doc.impact_level === 'critical' ? 'Crítico' : doc.impact_level === 'high' ? 'Alto' : 'Medio'}
                        </Badge>
                        {doc.change_type === 'updated' && (
                          <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/30">Actualizado</Badge>
                        )}
                        {doc.data_source === 'seed' ? (
                          <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 border-blue-500/30">Seed</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">Live</Badge>
                        )}
                        {doc.requires_human_review && (
                          <Badge variant="outline" className="text-[10px] bg-violet-500/10 text-violet-600">Rev. humana</Badge>
                        )}
                      </div>
                      <h4 className="text-sm font-medium mt-1">{doc.document_title}</h4>
                      {doc.impact_summary && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{doc.impact_summary}</p>
                      )}
                      {doc.source_url && (
                        <Button variant="ghost" size="sm" className="h-6 text-[10px] mt-1 p-0" onClick={() => window.open(doc.source_url!, '_blank')}>
                          <ExternalLink className="h-3 w-3 mr-1" /> Ver fuente
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <div className="mt-3 text-center">
                <Button variant="outline" size="sm" className="text-xs" onClick={() => { /* navigate to supervisor normativa */ }}>
                  <ExternalLink className="h-3 w-3 mr-1" /> Ver todas en Supervisor → Normativa
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Legal Escalations */}
        <TabsContent value="escalations" className="mt-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Scale className="h-4 w-4 text-amber-600" />
                Escalados RRHH → Jurídico
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[350px]">
                <div className="space-y-2">
                  {hrEscalated.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Shield className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Sin escalados a Jurídico</p>
                      <p className="text-xs mt-1">Los casos de alto riesgo legal aparecerán aquí</p>
                    </div>
                  ) : hrEscalated.map(inv => (
                    <div key={inv.id} className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <code className="text-xs font-medium bg-muted px-1.5 py-0.5 rounded">{inv.agent_code}</code>
                        <ArrowUpRight className="h-3 w-3 text-amber-600" />
                        <code className="text-xs font-medium bg-muted px-1.5 py-0.5 rounded">{inv.escalated_to}</code>
                        <Badge variant="outline" className={cn("text-[10px] py-0", OUTCOME_CONFIG[inv.outcome_status]?.color)}>
                          {OUTCOME_CONFIG[inv.outcome_status]?.label}
                        </Badge>
                        {(inv.metadata as any)?.source === 'seed' && (
                          <Badge variant="outline" className="text-[10px] py-0 bg-blue-500/10 text-blue-600 border-blue-500/30">Seed</Badge>
                        )}
                        <span className="text-[10px] text-muted-foreground ml-auto">
                          {formatDistanceToNow(new Date(inv.created_at), { locale: es, addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-xs line-clamp-2">{inv.input_summary}</p>
                      {inv.escalation_reason && (
                        <p className="text-[10px] text-amber-700 mt-1">Motivo: {inv.escalation_reason}</p>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Log */}
        <TabsContent value="log" className="mt-3">
          <Card>
            <CardContent className="p-4">
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {hrInvocations.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Clock className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Sin actividad HR</p>
                      <p className="text-xs mt-1">Las invocaciones a agentes RRHH aparecerán aquí</p>
                    </div>
                  ) : hrInvocations.slice(0, 30).map(inv => (
                    <div key={inv.id} className="flex items-start gap-3 p-2.5 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
                      <div className="shrink-0 mt-0.5">
                        {inv.escalated_to ? <ArrowUpRight className="h-4 w-4 text-amber-600" /> :
                         inv.outcome_status === 'success' ? <CheckCircle className="h-4 w-4 text-emerald-600" /> :
                         inv.outcome_status === 'human_review' ? <UserCheck className="h-4 w-4 text-violet-600" /> :
                         <AlertTriangle className="h-4 w-4 text-destructive" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <code className="text-xs font-medium bg-muted px-1.5 py-0.5 rounded">{inv.agent_code}</code>
                          <Badge variant="outline" className={cn("text-[10px] py-0", OUTCOME_CONFIG[inv.outcome_status]?.color)}>
                            {OUTCOME_CONFIG[inv.outcome_status]?.label}
                          </Badge>
                          {(inv.metadata as any)?.source === 'seed' && (
                            <Badge variant="outline" className="text-[10px] py-0 bg-blue-500/10 text-blue-600 border-blue-500/30">Seed</Badge>
                          )}
                          <span className="text-[10px] text-muted-foreground ml-auto">
                            {inv.execution_time_ms}ms · {formatDistanceToNow(new Date(inv.created_at), { locale: es, addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{inv.input_summary}</p>
                        {inv.routing_reason && (
                          <p className="text-[10px] text-muted-foreground/70 mt-0.5 line-clamp-1">{inv.routing_reason}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Config Sheet - reused from global supervisor */}
      <RegistryAgentConfigSheet
        open={configOpen}
        onOpenChange={setConfigOpen}
        agent={configAgent}
        onSaved={refresh}
      />
    </div>
  );
}

export default HRAIControlCenter;
