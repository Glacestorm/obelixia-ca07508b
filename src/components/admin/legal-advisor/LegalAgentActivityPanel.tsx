/**
 * LegalAgentActivityPanel - Panel de actividad de agentes IA
 * Muestra consultas inter-agente y validaciones en tiempo real
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Activity,
  Bot,
  MessageSquare,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Eye,
  ArrowRight,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLegalAgentIntegration, type AgentQuery, type ValidationLog } from '@/hooks/admin/legal';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export function LegalAgentActivityPanel() {
  const [activeTab, setActiveTab] = useState('queries');

  const {
    isLoading,
    queries,
    validations,
    stats,
    fetchAgentQueries,
    fetchValidationLogs
  } = useLegalAgentIntegration();

  useEffect(() => {
    fetchAgentQueries();
    fetchValidationLogs();
  }, [fetchAgentQueries, fetchValidationLogs]);

  const getStatusIcon = (approved: boolean | null) => {
    if (approved === true) return <CheckCircle className="h-4 w-4 text-emerald-500" />;
    if (approved === false) return <XCircle className="h-4 w-4 text-red-500" />;
    return <Clock className="h-4 w-4 text-amber-500" />;
  };

  const getApprovalBadge = (approved: boolean | null) => {
    if (approved === true) return 'bg-emerald-500/10 text-emerald-500';
    if (approved === false) return 'bg-red-500/10 text-red-500';
    return 'bg-amber-500/10 text-amber-500';
  };

  const getRiskBadge = (level: string | null) => {
    if (!level) return 'bg-muted text-muted-foreground';
    const variants: Record<string, string> = {
      low: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
      medium: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      high: 'bg-red-500/10 text-red-500 border-red-500/20',
      critical: 'bg-red-600/20 text-red-600 border-red-600/30'
    };
    return variants[level] || 'bg-muted text-muted-foreground';
  };

  // Calculate display stats from stats object
  const queriesToday = stats?.total_queries || 0;
  const validationsToday = validations.length;
  const approvalRate = stats?.total_queries 
    ? Math.round((stats.approved_count / stats.total_queries) * 100) 
    : 0;
  const avgResponseTime = stats?.avg_response_time_ms || 0;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Consultas</p>
                <p className="text-2xl font-bold">{queriesToday}</p>
              </div>
              <MessageSquare className="h-5 w-5 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Validaciones</p>
                <p className="text-2xl font-bold">{validationsToday}</p>
              </div>
              <CheckCircle className="h-5 w-5 text-emerald-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tasa Aprobación</p>
                <p className="text-2xl font-bold">{approvalRate}%</p>
              </div>
              <Zap className="h-5 w-5 text-amber-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tiempo Resp.</p>
                <p className="text-2xl font-bold">{avgResponseTime}ms</p>
              </div>
              <Clock className="h-5 w-5 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="queries" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Consultas ({queries.length})
            </TabsTrigger>
            <TabsTrigger value="validations" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Validaciones ({validations.length})
            </TabsTrigger>
          </TabsList>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => { fetchAgentQueries(); fetchValidationLogs(); }}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Actualizar
          </Button>
        </div>

        <TabsContent value="queries" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Consultas Inter-Agente</CardTitle>
              <CardDescription>
                Comunicación entre agentes IA y el asesor legal
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {queries.map((query) => (
                    <div
                      key={query.id}
                      className="p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <Bot className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium">{query.requesting_agent}</span>
                              <ArrowRight className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">Legal Advisor</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {typeof query.query_content === 'object' 
                                ? JSON.stringify(query.query_content).slice(0, 100) + '...'
                                : String(query.query_content)}
                            </p>
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              <Badge className={getApprovalBadge(query.approved)}>
                                {query.approved === true ? 'Aprobado' : 
                                 query.approved === false ? 'Rechazado' : 'Pendiente'}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {query.query_type}
                              </Badge>
                              {query.risk_level && (
                                <Badge className={cn("text-xs", getRiskBadge(query.risk_level))}>
                                  Riesgo: {query.risk_level}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(query.created_at), { addSuffix: true, locale: es })}
                          </span>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {queries.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-30" />
                      <p className="text-sm">No hay consultas recientes</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="validations" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Log de Validaciones</CardTitle>
              <CardDescription>
                Registro de acciones validadas por el asesor legal
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {validations.map((validation) => (
                    <div
                      key={validation.id}
                      className="p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          {getStatusIcon(validation.is_approved)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{validation.action_type}</span>
                              <Badge className={getApprovalBadge(validation.is_approved)}>
                                {validation.is_approved ? 'Aprobado' : 'Rechazado'}
                              </Badge>
                            </div>
                            {validation.action_description && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {validation.action_description}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline" className="text-xs">
                                <Bot className="h-3 w-3 mr-1" />
                                {validation.agent_id}
                              </Badge>
                              {validation.risk_level && (
                                <Badge className={cn("text-xs", getRiskBadge(validation.risk_level))}>
                                  Riesgo: {validation.risk_level}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {formatDistanceToNow(new Date(validation.created_at), { addSuffix: true, locale: es })}
                        </span>
                      </div>
                    </div>
                  ))}

                  {validations.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-30" />
                      <p className="text-sm">No hay validaciones recientes</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default LegalAgentActivityPanel;
