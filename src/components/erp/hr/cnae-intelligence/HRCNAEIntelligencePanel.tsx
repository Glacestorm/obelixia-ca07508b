/**
 * HRCNAEIntelligencePanel - CNAE-Specific HR Intelligence
 * Premium Phase 7: Sector regulations, benchmarks, risks & AI analysis
 */

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  RefreshCw, Sparkles, Building2, Shield, BarChart3, AlertTriangle,
  CheckCircle, XCircle, TrendingUp, TrendingDown, Database, Brain,
  FileText, Scale, Maximize2, Minimize2, ArrowRight
} from 'lucide-react';
import { useHRCNAEIntelligence } from '@/hooks/admin/hr/useHRCNAEIntelligence';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props { companyId: string; }

export function HRCNAEIntelligencePanel({ companyId }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const {
    profiles, rules, benchmarks, risks, stats,
    isLoading, aiAnalysis, isAnalyzing, lastRefresh,
    fetchAll, seedDemoData, runAIAnalysis, runBenchmarkAnalysis,
  } = useHRCNAEIntelligence(companyId);

  const riskColor = (level: string) => {
    switch (level) {
      case 'critical': return 'text-red-500 bg-red-500/10';
      case 'high': return 'text-orange-500 bg-orange-500/10';
      case 'medium': return 'text-yellow-500 bg-yellow-500/10';
      default: return 'text-green-500 bg-green-500/10';
    }
  };

  const severityColor = (s: string) => {
    switch (s) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <Card className={cn(
      "transition-all duration-300 overflow-hidden",
      isExpanded ? "fixed inset-4 z-50 shadow-2xl" : ""
    )}>
      <CardHeader className="pb-2 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-indigo-500/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-base">CNAE HR Intelligence</CardTitle>
              <p className="text-xs text-muted-foreground">
                {lastRefresh
                  ? `Actualizado ${formatDistanceToNow(lastRefresh, { locale: es, addSuffix: true })}`
                  : 'Sincronizando...'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {profiles.length === 0 && (
              <Button variant="outline" size="sm" onClick={seedDemoData} disabled={isLoading}>
                <Database className="h-4 w-4 mr-1" /> Demo
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={fetchAll} disabled={isLoading} className="h-8 w-8">
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setIsExpanded(!isExpanded)} className="h-8 w-8">
              {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className={cn("pt-3", isExpanded ? "h-[calc(100%-80px)]" : "")}>
        {/* KPIs */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-4">
          {[
            { label: 'Perfiles CNAE', value: stats.totalProfiles, icon: Building2, color: 'text-cyan-500' },
            { label: 'Regulaciones', value: stats.totalRules, icon: Shield, color: 'text-blue-500' },
            { label: 'Benchmarks', value: stats.totalBenchmarks, icon: BarChart3, color: 'text-indigo-500' },
            { label: 'Riesgos', value: stats.totalRisks, icon: AlertTriangle, color: 'text-amber-500' },
            { label: 'Alto Riesgo', value: stats.highRiskCount, icon: XCircle, color: 'text-red-500' },
            { label: 'Compliance', value: `${stats.complianceScore}%`, icon: CheckCircle, color: 'text-green-500' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
              <Icon className={cn("h-4 w-4", color)} />
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-sm font-bold">{value}</p>
              </div>
            </div>
          ))}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-5 mb-3">
            <TabsTrigger value="overview" className="text-xs">Perfiles</TabsTrigger>
            <TabsTrigger value="regulations" className="text-xs">Regulaciones</TabsTrigger>
            <TabsTrigger value="benchmarks" className="text-xs">Benchmarks</TabsTrigger>
            <TabsTrigger value="risks" className="text-xs">Riesgos</TabsTrigger>
            <TabsTrigger value="ai" className="text-xs">IA Analysis</TabsTrigger>
          </TabsList>

          {/* TAB: Perfiles CNAE */}
          <TabsContent value="overview" className="flex-1 mt-0">
            <ScrollArea className={isExpanded ? "h-[calc(100vh-340px)]" : "h-[350px]"}>
              <div className="space-y-3">
                {profiles.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Building2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
                    <p className="text-sm">Sin perfiles CNAE. Carga datos demo para comenzar.</p>
                  </div>
                ) : profiles.map(profile => (
                  <Card key={profile.id} className="border bg-card">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-mono">{profile.cnae_code}</Badge>
                            <span className="font-medium text-sm">{profile.cnae_description}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">Sector: {profile.sector_key || 'General'}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 mt-3">
                        <div className="text-center p-2 bg-muted/50 rounded">
                          <p className="text-xs text-muted-foreground">Regulaciones</p>
                          <p className="text-sm font-bold">{(profile.applicable_regulations as any[])?.length || 0}</p>
                        </div>
                        <div className="text-center p-2 bg-muted/50 rounded">
                          <p className="text-xs text-muted-foreground">Convenios</p>
                          <p className="text-sm font-bold">{(profile.collective_agreements as any[])?.length || 0}</p>
                        </div>
                        <div className="text-center p-2 bg-muted/50 rounded">
                          <p className="text-xs text-muted-foreground">Requisitos</p>
                          <p className="text-sm font-bold">{(profile.specific_requirements as any[])?.length || 0}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* TAB: Regulaciones */}
          <TabsContent value="regulations" className="flex-1 mt-0">
            <ScrollArea className={isExpanded ? "h-[calc(100vh-340px)]" : "h-[350px]"}>
              <div className="space-y-2">
                {rules.length === 0 ? (
                  <p className="text-center py-8 text-sm text-muted-foreground">Sin regulaciones sectoriales.</p>
                ) : rules.map(rule => (
                  <div key={rule.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-medium">{rule.rule_name}</span>
                        {rule.is_mandatory && <Badge variant="destructive" className="text-[10px]">Obligatorio</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{rule.description}</p>
                      {rule.legal_basis && (
                        <p className="text-xs text-muted-foreground/70 mt-0.5">Base legal: {rule.legal_basis}</p>
                      )}
                    </div>
                    <Badge variant={severityColor(rule.severity) as any} className="ml-2">{rule.severity}</Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* TAB: Benchmarks */}
          <TabsContent value="benchmarks" className="flex-1 mt-0">
            <ScrollArea className={isExpanded ? "h-[calc(100vh-340px)]" : "h-[350px]"}>
              <div className="space-y-2">
                {benchmarks.length === 0 ? (
                  <p className="text-center py-8 text-sm text-muted-foreground">Sin benchmarks sectoriales.</p>
                ) : benchmarks.map(bm => (
                  <div key={bm.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-indigo-500" />
                        <span className="text-sm font-medium">{bm.metric_name}</span>
                        <Badge variant="outline" className="text-[10px]">{bm.metric_category}</Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs">
                        <span>Sector avg: <strong>{bm.sector_average?.toFixed(1)}</strong></span>
                        <span>Empresa: <strong>{bm.company_value?.toFixed(1)}</strong></span>
                        {bm.deviation_percentage !== null && (
                          <span className={cn("flex items-center gap-1",
                            bm.is_favorable ? "text-green-500" : "text-red-500"
                          )}>
                            {bm.is_favorable ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            {bm.deviation_percentage?.toFixed(1)}%
                          </span>
                        )}
                      </div>
                    </div>
                    {bm.benchmark_source && (
                      <span className="text-[10px] text-muted-foreground">{bm.benchmark_source}</span>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* TAB: Riesgos */}
          <TabsContent value="risks" className="flex-1 mt-0">
            <ScrollArea className={isExpanded ? "h-[calc(100vh-340px)]" : "h-[350px]"}>
              <div className="space-y-2">
                {risks.length === 0 ? (
                  <p className="text-center py-8 text-sm text-muted-foreground">Sin evaluaciones de riesgo.</p>
                ) : risks.map(risk => (
                  <div key={risk.id} className="p-3 rounded-lg border bg-card">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className={cn("h-4 w-4", riskColor(risk.risk_level).split(' ')[0])} />
                        <span className="text-sm font-medium">{risk.risk_category}</span>
                      </div>
                      <Badge className={riskColor(risk.risk_level)}>{risk.risk_level}</Badge>
                    </div>
                    {risk.description && <p className="text-xs text-muted-foreground mb-2">{risk.description}</p>}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Score:</span>
                      <Progress value={risk.risk_score} className="flex-1 h-2" />
                      <span className="text-xs font-medium">{risk.risk_score}/100</span>
                    </div>
                    {(risk.mitigation_actions as any[])?.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {(risk.mitigation_actions as any[]).slice(0, 2).map((action: any, i: number) => (
                          <div key={i} className="flex items-center gap-1 text-xs text-muted-foreground">
                            <ArrowRight className="h-3 w-3" />
                            <span>{typeof action === 'string' ? action : action.action || action.description}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* TAB: IA Analysis */}
          <TabsContent value="ai" className="flex-1 mt-0">
            <ScrollArea className={isExpanded ? "h-[calc(100vh-340px)]" : "h-[350px]"}>
              <div className="space-y-4">
                <Button
                  onClick={() => runAIAnalysis()}
                  disabled={isAnalyzing || profiles.length === 0}
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-600"
                >
                  {isAnalyzing ? (
                    <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Analizando sectores...</>
                  ) : (
                    <><Brain className="h-4 w-4 mr-2" /> Análisis IA Sectorial Completo</>
                  )}
                </Button>

                {aiAnalysis ? (
                  <div className="space-y-4">
                    {aiAnalysis.executive_summary && (
                      <Card className="border-cyan-500/30 bg-cyan-500/5">
                        <CardContent className="p-4">
                          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-cyan-500" /> Resumen Ejecutivo
                          </h4>
                          <p className="text-sm text-muted-foreground">{aiAnalysis.executive_summary}</p>
                        </CardContent>
                      </Card>
                    )}

                    {aiAnalysis.regulation_gaps?.length > 0 && (
                      <Card>
                        <CardContent className="p-4">
                          <h4 className="text-sm font-semibold mb-2">🔍 Gaps Regulatorios</h4>
                          <div className="space-y-2">
                            {aiAnalysis.regulation_gaps.map((gap: any, i: number) => (
                              <div key={i} className="p-2 bg-muted/50 rounded text-sm">
                                <p className="font-medium">{gap.regulation || gap.gap || gap.title}</p>
                                <p className="text-xs text-muted-foreground">{gap.description || gap.impact || gap.detail}</p>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {aiAnalysis.action_plan?.length > 0 && (
                      <Card>
                        <CardContent className="p-4">
                          <h4 className="text-sm font-semibold mb-2">📋 Plan de Acción</h4>
                          <div className="space-y-2">
                            {aiAnalysis.action_plan.map((action: any, i: number) => (
                              <div key={i} className="flex items-start gap-2 p-2 bg-muted/50 rounded">
                                <Badge variant="outline" className="text-[10px] mt-0.5">{i + 1}</Badge>
                                <div>
                                  <p className="text-sm font-medium">{action.action || action.title}</p>
                                  <p className="text-xs text-muted-foreground">{action.deadline || action.timeline || ''}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Brain className="h-10 w-10 mx-auto mb-3 opacity-40" />
                    <p className="text-sm">Ejecuta el análisis IA para obtener insights sectoriales</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default HRCNAEIntelligencePanel;
