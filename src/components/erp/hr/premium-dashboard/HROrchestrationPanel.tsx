/**
 * HROrchestrationPanel — P10.1
 * Inter-Module Orchestration Rules Manager and Monitor.
 */

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  ArrowRightLeft, Plus, Play, Trash2, RefreshCw, Shield, Brain, Users, Scale,
  Layers, FileText, BarChart3, UserCog, Inbox, CheckCircle, XCircle,
  AlertTriangle, Clock, Zap, ArrowRight, Loader2
} from 'lucide-react';
import { useHROrchestration, type ModuleKey, type OrchestrationRule } from '@/hooks/admin/hr/useHROrchestration';
import { useHROrchestrationEmitter } from '@/hooks/admin/hr/useHROrchestrationEmitter';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
  companyId?: string;
  className?: string;
}

const MODULE_ICONS: Record<ModuleKey, React.ReactNode> = {
  security: <Shield className="h-3.5 w-3.5" />,
  ai_governance: <Brain className="h-3.5 w-3.5" />,
  workforce: <Users className="h-3.5 w-3.5" />,
  fairness: <Scale className="h-3.5 w-3.5" />,
  twin: <Layers className="h-3.5 w-3.5" />,
  legal: <FileText className="h-3.5 w-3.5" />,
  cnae: <BarChart3 className="h-3.5 w-3.5" />,
  role_experience: <UserCog className="h-3.5 w-3.5" />,
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  success: <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />,
  failed: <XCircle className="h-3.5 w-3.5 text-destructive" />,
  pending: <Clock className="h-3.5 w-3.5 text-muted-foreground" />,
  skipped: <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />,
};

export function HROrchestrationPanel({ companyId, className }: Props) {
  const {
    rules, logs, stats, isLoading, fetchRules,
    toggleRule, deleteRule, simulateExecution, installTemplate,
    moduleLabels, templates,
  } = useHROrchestration(companyId);

  const { getChainStatus, isEmitting } = useHROrchestrationEmitter(companyId || null);
  const [activeTab, setActiveTab] = useState('rules');
  const [chainStatus, setChainStatus] = useState<any>(null);
  const [chainLoading, setChainLoading] = useState(false);

  const loadChainStatus = useCallback(async () => {
    setChainLoading(true);
    const status = await getChainStatus();
    setChainStatus(status);
    setChainLoading(false);
  }, [getChainStatus]);

  if (!companyId) {
    return (
      <Card className={cn("border-dashed opacity-60", className)}>
        <CardContent className="py-12 text-center">
          <Inbox className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">Selecciona una empresa para gestionar la orquestación</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-primary" />
            Orquestación Inter-Módulo
          </h2>
          <p className="text-sm text-muted-foreground">
            {stats.activeRules} reglas activas · {stats.totalExecutions} ejecuciones totales
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchRules} disabled={isLoading} className="gap-2">
          <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          Actualizar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 px-4 text-center">
            <div className="text-2xl font-bold">{stats.totalRules}</div>
            <p className="text-xs text-muted-foreground">Total Reglas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4 text-center">
            <div className="text-2xl font-bold text-primary">{stats.activeRules}</div>
            <p className="text-xs text-muted-foreground">Activas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4 text-center">
            <div className="text-2xl font-bold">{stats.totalExecutions}</div>
            <p className="text-xs text-muted-foreground">Ejecuciones</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4 text-center">
            <div className="text-2xl font-bold">{stats.successRate}%</div>
            <p className="text-xs text-muted-foreground">Tasa Éxito</p>
            <Progress value={stats.successRate} className="mt-1 h-1" />
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-lg grid-cols-4">
          <TabsTrigger value="rules" className="gap-1.5">
            <Zap className="h-3.5 w-3.5" />
            Reglas ({rules.length})
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Plantillas
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            Log ({logs.length})
          </TabsTrigger>
          <TabsTrigger value="chain" className="gap-1.5" onClick={loadChainStatus}>
            <Activity className="h-3.5 w-3.5" />
            Cadena
          </TabsTrigger>
        </TabsList>

        {/* Rules Tab */}
        <TabsContent value="rules">
          <Card>
            <CardContent className="pt-4">
              <ScrollArea className="h-[400px]">
                {rules.length === 0 ? (
                  <div className="py-12 text-center">
                    <ArrowRightLeft className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground mb-3">Sin reglas de orquestación</p>
                    <Button variant="outline" size="sm" onClick={() => setActiveTab('templates')}>
                      <Plus className="h-4 w-4 mr-1" /> Instalar plantillas
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {rules.map(rule => (
                      <div key={rule.id} className={cn(
                        "p-3 rounded-lg border transition-colors",
                        rule.is_active ? "bg-card" : "bg-muted/30 opacity-60"
                      )}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm">{rule.name}</span>
                              <Badge variant="outline" className="text-[10px] gap-1">
                                {MODULE_ICONS[rule.trigger_module as ModuleKey]}
                                {moduleLabels[rule.trigger_module as ModuleKey]}
                              </Badge>
                              <ArrowRight className="h-3 w-3 text-muted-foreground" />
                              <Badge variant="outline" className="text-[10px] gap-1">
                                {MODULE_ICONS[rule.action_module as ModuleKey]}
                                {moduleLabels[rule.action_module as ModuleKey]}
                              </Badge>
                            </div>
                            {rule.description && (
                              <p className="text-xs text-muted-foreground mt-1">{rule.description}</p>
                            )}
                            <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                              <span>Evento: {rule.trigger_event}</span>
                              <span>·</span>
                              <span>Acción: {rule.action_type}</span>
                              <span>·</span>
                              <span>Ejecuciones: {rule.execution_count}</span>
                              {rule.last_executed_at && (
                                <>
                                  <span>·</span>
                                  <span>Última: {formatDistanceToNow(new Date(rule.last_executed_at), { locale: es, addSuffix: true })}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => simulateExecution(rule.id)} title="Simular ejecución">
                              <Play className="h-3.5 w-3.5" />
                            </Button>
                            <Switch checked={rule.is_active} onCheckedChange={(v) => toggleRule(rule.id, v)} />
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteRule(rule.id)} title="Eliminar">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Plantillas Predefinidas</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[380px]">
                <div className="space-y-3">
                  {templates.map((tpl, idx) => (
                    <div key={idx} className="p-3 rounded-lg border hover:border-primary/30 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">{tpl.name}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{tpl.description}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="secondary" className="text-[10px] gap-1">
                              {MODULE_ICONS[tpl.trigger_module as ModuleKey]}
                              {moduleLabels[tpl.trigger_module as ModuleKey]}
                            </Badge>
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                            <Badge variant="secondary" className="text-[10px] gap-1">
                              {MODULE_ICONS[tpl.action_module as ModuleKey]}
                              {moduleLabels[tpl.action_module as ModuleKey]}
                            </Badge>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => installTemplate(idx)} className="gap-1 shrink-0">
                          <Plus className="h-3.5 w-3.5" />
                          Instalar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs">
          <Card>
            <CardContent className="pt-4">
              <ScrollArea className="h-[400px]">
                {logs.length === 0 ? (
                  <div className="py-12 text-center">
                    <Clock className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">Sin ejecuciones registradas</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {logs.map(log => (
                      <div key={log.id} className="flex items-center gap-3 p-2.5 rounded-lg border hover:bg-muted/50 transition-colors">
                        {STATUS_ICONS[log.status] || STATUS_ICONS.pending}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-sm">
                            <Badge variant="outline" className="text-[10px] gap-1">
                              {MODULE_ICONS[log.trigger_module as ModuleKey]}
                              {log.trigger_event}
                            </Badge>
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                            <Badge variant="outline" className="text-[10px] gap-1">
                              {MODULE_ICONS[log.action_module as ModuleKey]}
                              {log.action_type}
                            </Badge>
                          </div>
                          {log.error_message && (
                            <p className="text-[10px] text-destructive mt-0.5">{log.error_message}</p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          {log.execution_time_ms != null && (
                            <span className="text-[10px] text-muted-foreground">{log.execution_time_ms}ms</span>
                          )}
                          <div className="text-[10px] text-muted-foreground">
                            {formatDistanceToNow(new Date(log.created_at), { locale: es, addSuffix: true })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default HROrchestrationPanel;
